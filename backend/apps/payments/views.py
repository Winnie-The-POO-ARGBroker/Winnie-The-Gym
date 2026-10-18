import datetime
import json
import logging

from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.access.permissions import IsAdminOnly, IsReceptionistOrAdmin, IsSocio
from apps.common.pagination import PageSizePagination
from apps.members.models import Socio
from apps.members.permissions import IsSocioActivo
from apps.memberships.models import PlanMembresia

from .filters import PagoFilter
from .models import Pago
from .serializers import (
    AnularPagoSerializer,
    CobroManualSerializer,
    ConfirmarPagoSerializer,
    CrearPreferenciaResponseSerializer,
    CrearPreferenciaSerializer,
    PagoSerializer,
)
from .services import (
    MercadoPagoUnavailable,
    PagoNotFound,
    anular_pago,
    cobro_manual,
    confirmar_pago,
    crear_preferencia,
    procesar_webhook,
)

User = get_user_model()


logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(tags=['payments'], summary='Listar pagos (recep/admin)'),
    retrieve=extend_schema(tags=['payments'], summary='Detalle de pago (recep/admin)'),
)
class PagoViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Pago.objects.select_related('socio', 'plan', 'cobrado_por', 'anulado_por').all()
    serializer_class = PagoSerializer
    filterset_class = PagoFilter
    # #186: enable full-text search across socio DNI, name, payment IDs
    search_fields = ['socio__dni', 'socio__nombre', 'socio__apellido', 'id', 'mp_payment_id']
    ordering_fields = ['created_at', 'monto', 'estado']
    ordering = ['-created_at']
    # Fix #187: honour ?page_size= (these attributes used to sit on the viewset, where DRF
    # ignores them, so the list was always cut at 10 rows).
    pagination_class = PageSizePagination

    def get_permissions(self):
        if self.action in ('mis_pagos', 'estado', 'confirmar'):
            return [IsSocio()]
        if self.action == 'comprobante':
            # Any authenticated user can attempt — the view enforces ownership for socios
            return [IsAuthenticated()]
        if self.action == 'anular':
            return [IsAdminOnly()]
        return [IsReceptionistOrAdmin()]

    @action(detail=False, methods=['get'], url_path='mis-pagos', url_name='mis-pagos')
    def mis_pagos(self, request):
        """Return the authenticated socio's own payment history, paginated."""
        pagos = Pago.objects.filter(socio__usuario=request.user).order_by('-created_at')
        page = self.paginate_queryset(pagos)
        if page is not None:
            serializer = PagoSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = PagoSerializer(pagos, many=True)
        return Response(serializer.data)

    @extend_schema(
        tags=['payments'],
        summary='Estado de un pago (polling retorno MP)',
        description=(
            'Devuelve el estado actual del pago. Socios solo pueden consultar '
            'sus propios pagos. Admins y recepcionistas pueden consultar cualquiera.'
        ),
        responses={200: OpenApiTypes.OBJECT, 403: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT},
    )
    @action(detail=True, methods=['get'], url_path='estado', url_name='estado',
            permission_classes=[IsAuthenticated])
    def estado(self, request, pk=None):
        """Fix #190: polling endpoint so the frontend can check payment status after MP return."""
        pago = get_object_or_404(Pago, pk=pk)
        # Socios may only inspect their own payments
        if hasattr(request.user, 'socio') and not request.user.is_staff:
            if pago.socio_id != request.user.socio.pk:
                return Response({'detail': 'No tenés permiso para ver este pago.'}, status=status.HTTP_403_FORBIDDEN)
        return Response({
            'id': pago.pk,
            'estado': pago.estado,
            'mp_payment_id': pago.mp_payment_id,
            'paid_at': pago.paid_at,
        })

    @extend_schema(
        tags=['payments'],
        summary='Confirmar pago al volver de MercadoPago (socio)',
        description=(
            'El socio informa el `payment_id` con el que MercadoPago lo devolvió al sitio. '
            'El backend consulta el pago a MercadoPago (fuente de verdad), aplica el mismo '
            'flujo que el webhook (activa la membresía si fue aprobado) y devuelve el estado '
            'actual. Solo funciona sobre pagos del propio socio; es idempotente.'
        ),
        request=ConfirmarPagoSerializer,
        responses={
            200: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT,
            502: OpenApiTypes.OBJECT,
        },
    )
    @action(detail=False, methods=['post'], url_path='confirmar', url_name='confirmar')
    def confirmar(self, request):
        serializer = ConfirmarPagoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            pago = confirmar_pago(request.user.socio, serializer.validated_data['payment_id'])
        except PagoNotFound:
            return Response({'detail': 'No encontramos un pago tuyo para ese identificador.'},
                            status=status.HTTP_404_NOT_FOUND)
        except MercadoPagoUnavailable:
            return Response({'detail': 'No pudimos consultar el pago en MercadoPago. Reintentá en unos segundos.'},
                            status=status.HTTP_502_BAD_GATEWAY)
        return Response({
            'id': pago.pk,
            'estado': pago.estado,
            'mp_payment_id': pago.mp_payment_id,
            'paid_at': pago.paid_at,
        })

    @extend_schema(
        tags=['payments'],
        summary='Totales de pagos respetando filtros activos (recep/admin)',
        description='Retorna montos totales agrupados por estado aplicando los mismos filtros que el listado.',
        responses={200: OpenApiTypes.OBJECT},
    )
    @action(detail=False, methods=['get'], url_path='totales', url_name='totales')
    def totales(self, request):
        """#186: aggregate totals matching whatever filters the caller applied."""
        # Apply filterset and search on top of the base queryset
        qs = self.filter_queryset(self.get_queryset())

        aprobado = qs.filter(estado=Pago.Estado.APROBADO).aggregate(total=Sum('monto'))['total'] or 0
        pendiente = qs.filter(estado=Pago.Estado.PENDIENTE).aggregate(total=Sum('monto'))['total'] or 0
        rechazado = qs.filter(estado=Pago.Estado.RECHAZADO).aggregate(total=Sum('monto'))['total'] or 0
        count = qs.count()

        return Response({
            'total_aprobado': float(aprobado),
            'total_pendiente': float(pendiente),
            'total_rechazado': float(rechazado),
            'count': count,
        })

    @extend_schema(
        tags=['payments'],
        summary='Descargar comprobante PDF de un pago (auth)',
        description=(
            'Genera y descarga el comprobante de pago en formato PDF. '
            'Solo disponible para pagos en estado aprobado. '
            'Socios solo pueden descargar sus propios comprobantes (otros socios reciben 404). '
            'Recepcionistas y administradores pueden descargar cualquiera.'
        ),
        responses={200: OpenApiTypes.BINARY, 404: OpenApiTypes.OBJECT},
    )
    @action(detail=True, methods=['get'], url_path='comprobante', url_name='comprobante',
            permission_classes=[IsAuthenticated])
    def comprobante(self, request, pk=None):
        """#192: Download the PDF receipt for an approved payment."""
        from django.http import HttpResponse
        from .pdf import build_recibo_pdf

        is_privileged = request.user.is_staff or getattr(request.user, 'rol', '') in ('administrador', 'recepcionista')

        if is_privileged:
            pago = get_object_or_404(Pago, pk=pk)
        else:
            # Socios receive 404 for other socios' payments (not 403, per contract)
            socio = getattr(request.user, 'socio', None)
            if socio is None:
                from rest_framework.exceptions import NotFound
                raise NotFound()
            pago = get_object_or_404(Pago, pk=pk, socio=socio)

        if pago.estado != Pago.Estado.APROBADO:
            return Response(
                {'detail': 'El comprobante solo está disponible para pagos aprobados.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        buffer = build_recibo_pdf(pago)
        numero = pago.numero_comprobante or f'pago-{pago.pk}'
        filename = f'recibo-{numero}.pdf'
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @extend_schema(
        tags=['payments'],
        summary='Anular un pago aprobado (admin)',
        description=(
            'Cancela el pago y revierte la membresía activada si la hubiera. '
            'Si ese pago era una renovación, restaura la membresía anterior que seguía vigente '
            '(`membresia_restaurada: {id, fecha_fin}`, o null). '
            'Solo admins pueden anular pagos. El motivo es obligatorio.'
        ),
        request=AnularPagoSerializer,
        responses={200: PagoSerializer, 400: OpenApiTypes.OBJECT},
    )
    @action(detail=True, methods=['post'], url_path='anular', url_name='anular')
    def anular(self, request, pk=None):
        """#191: Cancel an approved payment and revert the activated membership."""
        pago = self.get_object()
        serializer = AnularPagoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            pago = anular_pago(pago, request.user, serializer.validated_data['motivo'])
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        data = PagoSerializer(pago).data
        restaurada = getattr(pago, 'membresia_restaurada', None)
        data['membresia_restaurada'] = (
            {'id': restaurada.pk, 'fecha_fin': restaurada.fecha_fin.isoformat()} if restaurada else None
        )
        return Response(data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        tags=['payments'],
        summary='Crear preferencia MercadoPago (socio)',
        description=(
            'El socio autenticado crea un intento de pago para el plan indicado. '
            'Se registra un Pago en estado `pendiente` y se devuelve la URL de '
            'MercadoPago Checkout Pro para redireccionar el navegador.'
        ),
        request=CrearPreferenciaSerializer,
        responses={201: CrearPreferenciaResponseSerializer},
    ),
)
class CrearPreferenciaView(APIView):
    # #230 — only active socios can create MP preferences
    permission_classes = [IsSocio, IsSocioActivo]

    def post(self, request):
        input_serializer = CrearPreferenciaSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        plan = get_object_or_404(PlanMembresia, pk=input_serializer.validated_data['plan_id'], activo=True)
        socio = request.user.socio

        try:
            result = crear_preferencia(socio, plan)
        except Exception as exc:
            logger.error('crear_preferencia failed: %s', exc, exc_info=True)
            return Response({'detail': 'No se pudo generar la preferencia con MercadoPago.'}, status=status.HTTP_502_BAD_GATEWAY)

        return Response(
            {
                'pago_id': result['pago'].pk,
                'preference_id': result['preference_id'],
                'init_point': result['init_point'],
                'sandbox_init_point': result['sandbox_init_point'],
                'external_reference': result['external_reference'],
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    post=extend_schema(
        tags=['payments'],
        summary='Registrar cobro manual (recep/admin)',
        description=(
            'Contingencia ante caída de MercadoPago (riesgo #3 del PDF). El recepcionista '
            'confirma que recibió el pago fuera de MP y activa la membresía en el acto. '
            'Se dispara el email de confirmación al socio. '
            'El campo `medio` es obligatorio. Si `monto != plan.precio`, `motivo` es obligatorio. '
            'Enviar `idempotency_key` para evitar cobros duplicados.'
        ),
        request=CobroManualSerializer,
        responses={201: PagoSerializer},
    ),
)
class CobroManualView(APIView):
    permission_classes = [IsReceptionistOrAdmin]

    def post(self, request):
        input_serializer = CobroManualSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        socio = get_object_or_404(Socio, pk=input_serializer.validated_data['socio_id'])
        plan = get_object_or_404(PlanMembresia, pk=input_serializer.validated_data['plan_id'], activo=True)
        monto = input_serializer.validated_data['monto']
        medio = input_serializer.validated_data['medio']
        observacion = input_serializer.validated_data.get('observacion', '')
        motivo = input_serializer.validated_data.get('motivo', '')
        idempotency_key = input_serializer.validated_data.get('idempotency_key') or None

        try:
            pago = cobro_manual(
                request.user, socio, plan, monto,
                medio=medio,
                observacion=observacion,
                motivo=motivo,
                idempotency_key=idempotency_key,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(PagoSerializer(pago).data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=['payments'],
    summary='Resumen de caja diaria (recep/admin) #193',
    description=(
        'Devuelve totales de cobros manuales agrupados por medio de pago para una fecha dada. '
        'Recepcionistas solo ven su propia caja. Administradores pueden consultar cualquier '
        'operador pasando operador_id. El cierre de turno declarativo está diferido al roadmap.'
    ),
    parameters=[
        OpenApiParameter('fecha', OpenApiTypes.DATE, OpenApiParameter.QUERY,
                         description='Fecha a consultar (YYYY-MM-DD). Defaults a hoy.'),
        OpenApiParameter('operador_id', OpenApiTypes.INT, OpenApiParameter.QUERY,
                         description='ID del operador. Solo disponible para admins.'),
    ],
    responses={200: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT},
)
class CajaView(APIView):
    """GET /api/payments/caja/ — Daily cash register summary (#193).

    Aggregates manual payments by medio_manual for a given date and operator.
    Recepcionistas are restricted to their own caja (cobrado_por=request.user).
    Admins may query any operator via ?operador_id=.
    """
    permission_classes = [IsReceptionistOrAdmin]

    def get(self, request):
        # --- Parse fecha ---
        fecha_str = request.query_params.get('fecha')
        if fecha_str:
            try:
                fecha = datetime.date.fromisoformat(fecha_str)
            except (ValueError, TypeError):
                return Response(
                    {'detail': 'Formato de fecha inválido. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            from django.utils import timezone
            fecha = timezone.localdate()

        # --- Determine operator scope ---
        is_admin = request.user.is_staff or getattr(request.user, 'rol', '') == 'administrador'
        operador_id_param = request.query_params.get('operador_id')

        if is_admin and operador_id_param:
            try:
                operador_id = int(operador_id_param)
            except (ValueError, TypeError):
                return Response(
                    {'detail': 'operador_id debe ser un entero.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            operador = get_object_or_404(User, pk=operador_id)
        else:
            # Recepcionistas always see only their own caja
            operador = request.user
            operador_id = request.user.pk

        # --- Base queryset: manual payments for this date and operator ---
        base_qs = Pago.objects.filter(
            metodo=Pago.Metodo.MANUAL,
            cobrado_por=operador,
            created_at__date=fecha,
        )

        # --- Cobros por medio (gross: includes the ones annulled later) ---
        # Anulaciones are subtracted once, in neto. Leaving annulled cobros out
        # here as well would deduct them twice.
        cobros_qs = base_qs.filter(Q(estado=Pago.Estado.APROBADO) | Q(anulado=True))

        medios = [choice[0] for choice in Pago.MedioManual.choices]
        cobros_por_medio = {}
        total_cobros = 0

        for medio in medios:
            agg = cobros_qs.filter(medio_manual=medio).aggregate(
                count=Count('id'),
                total=Sum('monto'),
            )
            count = agg['count'] or 0
            total = float(agg['total'] or 0)
            cobros_por_medio[medio] = {'count': count, 'total': total}
            total_cobros += total

        # --- Anulaciones ---
        total_anulaciones = float(
            base_qs.filter(anulado=True).aggregate(total=Sum('monto'))['total'] or 0
        )

        return Response({
            'fecha': fecha.isoformat(),
            'operador': {
                'id': operador.pk,
                'email': operador.email,
                'nombre': f'{operador.first_name} {operador.last_name}'.strip() or operador.email,
            },
            'cobros_por_medio': cobros_por_medio,
            'total_cobros': total_cobros,
            'total_anulaciones': total_anulaciones,
            'diferencia': None,  # cierre de turno declarativo diferido al roadmap
        }, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        tags=['payments'],
        summary='Webhook MercadoPago (sin auth, firma HMAC)',
        description=(
            'Endpoint público que MercadoPago invoca al cambiar el estado de un pago. '
            'Valida la firma con MP_WEBHOOK_SECRET, actualiza el Pago correspondiente, '
            'activa la membresía cuando el estado pasa a `approved` y dispara el email '
            'de confirmación. Idempotente por `mp_payment_id`.'
        ),
        request=OpenApiTypes.OBJECT,
        parameters=[
            OpenApiParameter('data.id', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
            OpenApiParameter('x-signature', OpenApiTypes.STR, OpenApiParameter.HEADER, required=False),
            OpenApiParameter('x-request-id', OpenApiTypes.STR, OpenApiParameter.HEADER, required=False),
        ],
        responses={200: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT},
    ),
)
class WebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            payload = request.data if isinstance(request.data, dict) else json.loads(request.body or b'{}')
        except (json.JSONDecodeError, ValueError):
            payload = {}

        x_signature = request.headers.get('x-signature', '')
        x_request_id = request.headers.get('x-request-id', '')
        query = request.query_params

        ok, message, _pago = procesar_webhook(payload, query, x_signature, x_request_id)

        http_status = status.HTTP_200_OK if ok else status.HTTP_400_BAD_REQUEST
        return Response({'ok': ok, 'detail': message}, status=http_status)
