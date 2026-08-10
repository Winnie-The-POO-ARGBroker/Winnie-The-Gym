from datetime import datetime
from django.contrib.auth import get_user_model
from rest_framework import status, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from core.mongodb import log_qr_event
from .models import AccessLog
from .serializers import (
    GenerateQRResponseSerializer,
    ScanQRSerializer,
    AccessLogSerializer
)
from .utils import (
    generate_dynamic_qr_token,
    verify_dynamic_qr_token,
    mark_qr_token_used
)

User = get_user_model()


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


class ScanQRView(APIView):
    """
    POST /api/access/qr/scan/
    Procesa el escaneo de un código QR en el lector/terminal de recepción.
    Registra el acceso en PostgreSQL y audita en MongoDB.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ScanQRSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        qr_token = serializer.validated_data['qr_token']
        access_type = serializer.validated_data['access_type']
        scanned_by_user = request.user

        # 1. Verificar Token QR
        is_valid, error_code, payload = verify_dynamic_qr_token(qr_token)

        user_obj = None
        jti = payload.get('jti') if payload else None

        if payload and 'user_id' in payload:
            try:
                user_obj = User.objects.get(id=payload['user_id'])
            except User.DoesNotExist:
                error_code = 'UNKNOWN_USER'
                is_valid = False

        # 2. Verificar estado del usuario si el token era válido
        if is_valid and user_obj:
            if not user_obj.is_active:
                is_valid = False
                error_code = 'USER_SUSPENDED'

        # 3. Determinar estado final
        access_status = 'GRANTED' if is_valid else 'DENIED'
        denial_reason = error_code if not is_valid else None

        # 4. Marcar token como consumido si era válido para prevenir reuso
        if is_valid and jti:
            mark_qr_token_used(jti)

        # 5. Persistir log en PostgreSQL
        access_log = AccessLog.objects.create(
            user=user_obj,
            access_type=access_type,
            status=access_status,
            denial_reason=denial_reason,
            qr_jti=jti,
            scanned_by=scanned_by_user
        )

        # 6. Auditar evento en MongoDB (colección 'qr_history')
        mongo_payload = {
            "postgres_access_log_id": access_log.id,
            "timestamp": datetime.utcnow().isoformat(),
            "access_type": access_type,
            "status": access_status,
            "denial_reason": denial_reason,
            "user_id": user_obj.id if user_obj else None,
            "user_email": user_obj.email if user_obj else None,
            "scanned_by_id": scanned_by_user.id,
            "scanned_by_email": scanned_by_user.email,
            "qr_jti": jti,
            "qr_token_raw": qr_token,
            "payload_data": payload
        }
        log_qr_event(mongo_payload)

        # 7. Responder
        response_data = {
            "status": access_status,
            "message": "Acceso permitido" if is_valid else f"Acceso denegado: {denial_reason}",
            "access_log": AccessLogSerializer(access_log).data
        }

        response_status = status.HTTP_200_OK if is_valid else status.HTTP_403_FORBIDDEN
        return Response(response_data, status=response_status)


class AccessLogListView(generics.ListAPIView):
    """
    GET /api/access/logs/
    Listado histórico de ingresos y egresos con filtros por fecha, estado y socio.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AccessLogSerializer
    queryset = AccessLog.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get('user_id')
        status_param = self.request.query_params.get('status')
        access_type = self.request.query_params.get('access_type')

        if user_id:
            qs = qs.filter(user_id=user_id)
        if status_param:
            qs = qs.filter(status=status_param)
        if access_type:
            qs = qs.filter(access_type=access_type)

        return qs
