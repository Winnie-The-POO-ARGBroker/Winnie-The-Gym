from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.access.permissions import IsAdminOnly, IsReceptionistOrAdmin
from apps.users.services import is_synthetic_email, send_activation_email

from .filters import SocioFilter
from .permissions import IsAdminOrOwnSocio
from .models import Socio, SocioNota
from .serializers import (
    SocioCertificadoResponseSerializer,
    SocioCertificadoSignedUrlSerializer,
    SocioCertificadoUploadSerializer,
    SocioNotaSerializer,
    SocioSerializer,
)
from .services import dar_baja, generar_signed_url_certificado, guardar_certificado_medico


class SocioPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


@extend_schema_view(
    list=extend_schema(tags=['members'], summary='Listar socios (recep/admin)'),
    retrieve=extend_schema(tags=['members'], summary='Detalle de socio (recep/admin)'),
    create=extend_schema(tags=['members'], summary='Alta de socio (admin)'),
    update=extend_schema(tags=['members'], summary='Actualizar socio (admin)'),
    partial_update=extend_schema(tags=['members'], summary='Actualizar socio parcialmente (admin)'),
    destroy=extend_schema(tags=['members'], summary='Eliminar socio (admin)'),
)
class SocioViewSet(viewsets.ModelViewSet):
    queryset = Socio.objects.all().order_by('id')
    serializer_class = SocioSerializer
    pagination_class = SocioPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = SocioFilter
    search_fields = ['nombre', 'apellido', 'dni', 'numero_socio']
    ordering_fields = ['apellido', 'nombre', 'numero_socio', 'created_at', 'estado', 'dni']
    ordering = ['numero_socio']

    def get_permissions(self):
        if self.action in ('update', 'partial_update', 'dar_baja', 'reactivar'):
            return [IsAdminOnly()]
        if self.action == 'destroy':
            # Any authenticated staff can reach the override; the override itself returns 405
            return [IsReceptionistOrAdmin()]
        if self.action == 'create':
            # fix #223: recepcionista can create socios
            return [IsReceptionistOrAdmin()]
        if self.action in ('subir_certificado', 'certificado_url'):
            return [IsAdminOrOwnSocio()]
        if self.action == 'resend_activation':
            return [IsReceptionistOrAdmin()]
        if self.action in ('notas', 'actividad'):
            # #234: admin + recep only; socios get 403
            return [IsReceptionistOrAdmin()]
        return [IsReceptionistOrAdmin()]

    def destroy(self, request, *args, **kwargs):
        """Block physical deletion — soft-cancel via dar-de-baja instead (fix #229)."""
        return Response(
            {
                'detail': (
                    'Method "DELETE" not allowed. '
                    'Use POST /api/members/socios/{id}/dar-de-baja/ instead.'
                )
            },
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @extend_schema(
        tags=['members'],
        summary='Dar de baja al socio (admin)',
        request=None,
        responses={200: SocioSerializer},
    )
    @action(detail=True, methods=['post'], url_path='dar-baja', url_name='dar-baja')
    def dar_baja(self, request, pk=None):
        socio = self.get_object()

        if socio.estado == Socio.Estado.BAJA:
            return Response(
                {'detail': 'El socio ya está dado de baja.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        socio = dar_baja(socio)
        socio.refresh_from_db()

        serializer = SocioSerializer(socio)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['members'],
        summary='Reactivar socio dado de baja (admin) — fix #229',
        request=None,
        responses={200: dict},
    )
    @action(detail=True, methods=['post'], url_path='reactivar', url_name='reactivar')
    def reactivar(self, request, pk=None):
        """Set estado='activo' and fecha_baja=None. Idempotent — no-op if already active."""
        socio = self.get_object()

        if socio.estado == Socio.Estado.ACTIVO:
            # Already active — idempotent, return current state without modification
            return Response(
                {
                    'id': socio.id,
                    'estado': socio.estado,
                    'fecha_baja': None,
                    'updated_at': socio.updated_at,
                },
                status=status.HTTP_200_OK,
            )

        socio.estado = Socio.Estado.ACTIVO
        # The model's save() handles fecha_baja = None invariant when estado != BAJA
        socio.save()
        socio.refresh_from_db()

        return Response(
            {
                'id': socio.id,
                'estado': socio.estado,
                'fecha_baja': socio.fecha_baja,
                'updated_at': socio.updated_at,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        tags=['members'],
        summary='Métricas y estadísticas de socios (recep/admin)',
        responses={200: dict},
    )
    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        from django.db.models import Q
        total = Socio.objects.count()
        activos = Socio.objects.filter(estado=Socio.Estado.ACTIVO).count()
        con_certificado = Socio.objects.filter(
            ~Q(certificado_medico_path='') | ~Q(certificado_medico_url='')
        ).count()
        bajas = Socio.objects.filter(estado=Socio.Estado.BAJA).count()
        return Response({
            'total': total,
            'activos': activos,
            'con_certificado': con_certificado,
            'bajas': bajas,
        })

    @extend_schema(
        tags=['members'],
        summary='Subir certificado médico del socio (RF08 / #227 / #228)',
        description=(
            'Adjunta el certificado médico digital del socio (PDF o imagen, máx. 5 MB). '
            'El archivo se persiste en un bucket Supabase PRIVADO bajo un nombre UUID '
            'para proteger la identidad del socio. Las URLs son siempre firmadas (5 min). '
            'Acepta opcionalmente emitido_en y vence_en para registrar la vigencia.'
        ),
        request={'multipart/form-data': SocioCertificadoUploadSerializer},
        responses={200: SocioCertificadoResponseSerializer},
    )
    @action(
        detail=True,
        methods=['post'],
        url_path='certificado-medico',
        url_name='certificado-medico',
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def subir_certificado(self, request, pk=None):
        socio = self.get_object()

        upload_serializer = SocioCertificadoUploadSerializer(data=request.data)
        upload_serializer.is_valid(raise_exception=True)
        archivo = upload_serializer.validated_data['archivo']
        emitido_en = upload_serializer.validated_data.get('emitido_en')
        vence_en = upload_serializer.validated_data.get('vence_en')

        socio = guardar_certificado_medico(
            socio, archivo,
            emitido_en=emitido_en,
            vence_en=vence_en,
            request=request,
        )

        return Response(SocioCertificadoResponseSerializer(socio).data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['members'],
        summary='Obtener URL firmada del certificado médico (#227)',
        description=(
            'Genera una URL firmada de corta duración (5 minutos) para descargar el '
            'certificado médico del socio desde el bucket privado de Supabase. '
            'Admins y recepcionistas pueden obtener el URL de cualquier socio. '
            'Los socios solo pueden obtener el de su propio perfil.'
        ),
        responses={200: SocioCertificadoSignedUrlSerializer},
    )
    @action(
        detail=True,
        methods=['get'],
        url_path='certificado/url',
        url_name='certificado-url',
    )
    def certificado_url(self, request, pk=None):
        socio = self.get_object()
        result = generar_signed_url_certificado(socio)
        serializer = SocioCertificadoSignedUrlSerializer(result)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['members'],
        summary='Reenviar email de activación al socio (admin/recep) — fix #233',
        request=None,
        responses={
            200: {'type': 'object', 'properties': {'detail': {'type': 'string'}}},
            400: {'type': 'object', 'properties': {'detail': {'type': 'string'}}},
        },
    )
    @action(
        detail=True,
        methods=['post'],
        url_path='resend-activation',
        url_name='resend-activation',
    )
    def resend_activation(self, request, pk=None):
        """Resend activation email to a socio (admin + recepcionista only).

        Returns 400 if the socio has a synthetic placeholder email address
        and cannot receive real emails.
        """
        socio = self.get_object()
        email = socio.usuario.email if socio.usuario_id else ''

        if is_synthetic_email(email):
            return Response(
                {'detail': 'El socio no tiene un email real registrado. No se puede reenviar activación.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        send_activation_email(socio.usuario)
        return Response({'detail': 'Email de activación reenviado.'}, status=status.HTTP_200_OK)

    # ------------------------------------------------------------------
    # #234 — Notas internas + Actividad
    # ------------------------------------------------------------------

    @extend_schema(
        tags=['members'],
        summary='Listar y crear notas internas de un socio (admin/recep)',
        responses={200: SocioNotaSerializer(many=True), 201: SocioNotaSerializer},
    )
    @action(
        detail=True,
        methods=['get', 'post'],
        url_path='notas',
        url_name='notas',
    )
    def notas(self, request, pk=None):
        """GET: list notes for a socio. POST: create a note."""
        socio = self.get_object()

        if request.method == 'GET':
            qs = SocioNota.objects.filter(socio=socio).select_related('autor')
            serializer = SocioNotaSerializer(qs, many=True)
            return Response(serializer.data)

        # POST
        serializer = SocioNotaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(socio=socio, autor=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        tags=['members'],
        summary='Actividad del socio: merge de audit + reservas + accesos + notas (admin/recep)',
        responses={200: dict},
    )
    @action(
        detail=True,
        methods=['get'],
        url_path='actividad',
        url_name='actividad',
    )
    def actividad(self, request, pk=None):
        """Merged timeline of audit logs, class reservations, access logs and notes, ordered desc."""
        socio = self.get_object()
        timeline = []

        # Audit logs for this socio entity
        try:
            from apps.audit.models import AuditLog
            entity_label = 'members.Socio'
            audit_qs = AuditLog.objects.filter(
                entity_type=entity_label,
                entity_id=socio.pk,
            ).select_related('actor').order_by('-timestamp')[:50]
            for log in audit_qs:
                timeline.append({
                    'type': 'audit',
                    'timestamp': log.timestamp,
                    'actor_email': log.actor.email if log.actor_id else None,
                    'action': log.action,
                    'changes': log.changes_json,
                })
        except Exception:
            pass

        # Class reservations
        try:
            inscripciones = (
                socio.inscripciones_clases
                .select_related('clase')
                .order_by('-created_at')[:20]
            )
            for ins in inscripciones:
                timeline.append({
                    'type': 'reserva',
                    'timestamp': ins.created_at,
                    'clase_nombre': ins.clase.nombre,
                    'en_espera': ins.en_espera,
                    'asistio': ins.asistio,
                })
        except Exception:
            pass

        # Access logs (via user FK)
        try:
            from apps.access.models import AccessLog
            accesos = (
                AccessLog.objects
                .filter(user=socio.usuario)
                .order_by('-timestamp')[:20]
            )
            for acc in accesos:
                timeline.append({
                    'type': 'acceso',
                    'timestamp': acc.timestamp,
                    'access_type': acc.access_type,
                    'status': acc.status,
                    'source': acc.source,
                })
        except Exception:
            pass

        # Internal notes
        try:
            notas = SocioNota.objects.filter(socio=socio).select_related('autor').order_by('-created_at')[:20]
            for nota in notas:
                timeline.append({
                    'type': 'nota',
                    'timestamp': nota.created_at,
                    'autor_email': nota.autor.email if nota.autor_id else None,
                    'texto': nota.texto,
                })
        except Exception:
            pass

        # Sort merged timeline descending by timestamp
        timeline.sort(key=lambda x: x['timestamp'], reverse=True)

        return Response({'results': timeline})
