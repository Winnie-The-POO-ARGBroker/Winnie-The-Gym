import json
import logging

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.access.permissions import IsAdminOnly, IsReceptionistOrAdmin, IsSocio
from apps.members.models import Socio
from apps.memberships.models import PlanMembresia

from .filters import PagoFilter
from .models import Pago
from .serializers import (
    CobroManualSerializer,
    CrearPreferenciaResponseSerializer,
    CrearPreferenciaSerializer,
    PagoSerializer,
)
from .services import cobro_manual, crear_preferencia, procesar_webhook


logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(tags=['payments'], summary='Listar pagos (recep/admin)'),
    retrieve=extend_schema(tags=['payments'], summary='Detalle de pago (recep/admin)'),
)
class PagoViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Pago.objects.all()
    serializer_class = PagoSerializer
    filterset_class = PagoFilter
    ordering_fields = ['created_at', 'monto', 'estado']
    ordering = ['-created_at']

    def get_permissions(self):
        return [IsReceptionistOrAdmin()]


@extend_schema(
    tags=['payments'],
    summary='Crear preferencia MercadoPago (socio)',
    description=(
        'El socio autenticado crea un intento de pago para el plan indicado. '
        'Se registra un Pago en estado `pendiente` y se devuelve la URL de '
        'MercadoPago Checkout Pro para redireccionar el navegador.'
    ),
    request=CrearPreferenciaSerializer,
    responses={201: CrearPreferenciaResponseSerializer},
)
@api_view(['POST'])
@permission_classes([IsSocio])
def crear_preferencia_view(request):
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


@extend_schema(
    tags=['payments'],
    summary='Registrar cobro manual (recep/admin)',
    description=(
        'Contingencia ante caída de MercadoPago (riesgo #3 del PDF). El recepcionista '
        'confirma que recibió el pago fuera de MP y activa la membresía en el acto. '
        'Se dispara el email de confirmación al socio.'
    ),
    request=CobroManualSerializer,
    responses={201: PagoSerializer},
)
@api_view(['POST'])
@permission_classes([IsReceptionistOrAdmin])
def cobro_manual_view(request):
    input_serializer = CobroManualSerializer(data=request.data)
    input_serializer.is_valid(raise_exception=True)

    socio = get_object_or_404(Socio, pk=input_serializer.validated_data['socio_id'])
    plan = get_object_or_404(PlanMembresia, pk=input_serializer.validated_data['plan_id'], activo=True)
    monto = input_serializer.validated_data['monto']
    observacion = input_serializer.validated_data.get('observacion', '')

    pago = cobro_manual(request.user, socio, plan, monto, observacion=observacion)
    return Response(PagoSerializer(pago).data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=['payments'],
    summary='Webhook MercadoPago (sin auth, firma HMAC)',
    description=(
        'Endpoint público que MercadoPago invoca al cambiar el estado de un pago. '
        'Valida la firma con MP_WEBHOOK_SECRET, actualiza el Pago correspondiente, '
        'activa la membresía cuando el estado pasa a `approved` y dispara el email '
        'de confirmación. Idempotente por `mp_payment_id`.'
    ),
    parameters=[
        OpenApiParameter('data.id', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
        OpenApiParameter('x-signature', OpenApiTypes.STR, OpenApiParameter.HEADER, required=False),
        OpenApiParameter('x-request-id', OpenApiTypes.STR, OpenApiParameter.HEADER, required=False),
    ],
    responses={200: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT},
)
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def webhook_view(request):
    try:
        payload = request.data if isinstance(request.data, dict) else json.loads(request.body or b'{}')
    except Exception:
        payload = {}

    x_signature = request.headers.get('x-signature', '')
    x_request_id = request.headers.get('x-request-id', '')
    query = request.query_params

    ok, message, _pago = procesar_webhook(payload, query, x_signature, x_request_id)

    http_status = status.HTTP_200_OK if ok else status.HTTP_400_BAD_REQUEST
    return Response({'ok': ok, 'detail': message}, status=http_status)
