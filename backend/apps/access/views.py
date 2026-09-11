from threading import Thread
import logging

from django.contrib.auth import get_user_model
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from core.mongodb import log_qr_event

from .filters import AccessLogFilter
from .models import AccessLog
from .permissions import IsReceptionistOrAdmin
from .services import has_active_membership
from .serializers import (
    GenerateQRResponseSerializer,
    ScanQRSerializer,
    AccessLogSerializer,
)
from .utils import (
    generate_dynamic_qr_token,
    verify_dynamic_qr_token,
)

logger = logging.getLogger(__name__)
User = get_user_model()


def _async_mongo_log(payload: dict):
    """
    [BLOCKER-7 Fix]: Ejecuta la inyección en MongoDB de forma asíncrona fuera del hilo
    crítico de la petición HTTP para no congelar el molinete si Mongo tiene latencia.
    """
    try:
        log_qr_event(payload)
    except Exception as e:
        logger.error(f"Error asíncrono al guardar log en MongoDB: {e}", exc_info=True)


@extend_schema(
    tags=['access'],
    summary='Generar QR dinámico (socio)',
    description='Emite un token QR firmado con TTL corto para el socio autenticado.',
    responses={200: GenerateQRResponseSerializer},
)
class GenerateQRView(APIView):
    """
    GET /api/access/qr/generate/
    Genera un token QR dinámico firmado para el socio autenticado (duración 30s).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        token_data = generate_dynamic_qr_token(request.user)
        serializer = GenerateQRResponseSerializer(token_data)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(
    tags=['access'],
    summary='Escanear QR (recep/admin)',
    description=(
        'Procesa el escaneo del código QR en recepción. Valida token, membresía y '
        'estado del socio, registra el evento en Postgres y de forma asíncrona en Mongo.'
    ),
    request=ScanQRSerializer,
    responses={200: AccessLogSerializer, 403: AccessLogSerializer, 400: None},
)
class ScanQRView(APIView):
    """
    POST /api/access/qr/scan/
    Procesa el escaneo de un código QR en la terminal de recepción.
    [BLOCKER-1 Fix]: Protegido con IsReceptionistOrAdmin para prevenir auto-aprobación por socios.
    """
    permission_classes = [IsReceptionistOrAdmin]

    def post(self, request):
        serializer = ScanQRSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        qr_token = serializer.validated_data['qr_token']
        access_type = serializer.validated_data['access_type']

        scanned_by_user = request.user

        # 1. Verificar Token QR y consumir atómicamente anti-replay
        is_valid, error_code, payload = verify_dynamic_qr_token(qr_token, consume=True)

        user_obj = None
        jti = payload.get('jti') if payload else None

        if payload and 'user_id' in payload:
            try:
                user_obj = User.objects.get(id=payload['user_id'])
            except User.DoesNotExist:
                error_code = 'UNKNOWN_USER'
                is_valid = False

        # 2. Verificar estado activo del socio y membresía
        if is_valid and user_obj:
            if not user_obj.is_active:
                is_valid = False
                error_code = 'USER_SUSPENDED'
            elif not has_active_membership(user_obj):
                is_valid = False
                error_code = 'MEMBERSHIP_INACTIVE'

        # 3. Determinar estado final
        access_status = 'GRANTED' if is_valid else 'DENIED'
        denial_reason = error_code if not is_valid else None

        # 4. Persistir log relacional en PostgreSQL
        access_log = AccessLog.objects.create(
            user=user_obj,
            access_type=access_type,
            status=access_status,
            denial_reason=denial_reason,
            qr_jti=jti,
            scanned_by=scanned_by_user,
        )

        # 5. [BLOCKER-3 & BLOCKER-7 & W-2 Fix]: Mongo payload sanitizado + guardado asíncrono
        mongo_payload = {
            "postgres_access_log_id": access_log.id,
            "timestamp": timezone.now().isoformat(),
            "access_type": access_type,
            "status": access_status,
            "denial_reason": denial_reason,
            "user_id": user_obj.id if user_obj else None,
            "scanned_by_id": scanned_by_user.id if scanned_by_user else None,
            "qr_jti": jti,
        }
        # TODO: move to Django Channels worker for non-blocking Mongo writes (channels + channels_redis already installed)
        Thread(target=_async_mongo_log, args=(mongo_payload,), daemon=True).start()

        # 6. Responder
        response_data = {
            "status": access_status,
            "message": "Acceso permitido" if is_valid else f"Acceso denegado: {denial_reason}",
            "denial_reason": denial_reason,
            "access_log": AccessLogSerializer(access_log).data,
        }

        response_status = status.HTTP_200_OK if is_valid else status.HTTP_403_FORBIDDEN
        return Response(response_data, status=response_status)


@extend_schema(
    tags=['access'],
    summary='Listar registros de acceso',
    description=(
        'Devuelve los registros de acceso paginados. Los socios solo ven sus propios '
        'accesos; recepcionistas, administradores y staff ven todos. Se puede filtrar '
        'por fecha, estado, tipo y usuario.'
    ),
    responses={200: AccessLogSerializer(many=True)},
)
class AccessLogListView(generics.ListAPIView):
    """
    GET /api/access/logs/
    [BLOCKER-2 Fix]: Filtro por ownership. Socios sólo ven sus propios logs; staff/admin ven todos.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AccessLogSerializer
    filterset_class = AccessLogFilter
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return AccessLog.objects.none()

        user = self.request.user
        is_privileged = user.rol in ('administrador', 'recepcionista') or user.is_staff

        if is_privileged:
            return AccessLog.objects.all()
        return AccessLog.objects.filter(user=user)
