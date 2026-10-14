import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, generics, permissions
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from rest_framework.response import Response

from .consumers import AFORO_GROUP
from .filters import AccessLogFilter
from .models import AccessLog
from .pagination import AccessLogPagination
from .permissions import IsReceptionistOrAdmin, IsAdminOnly
from .services import (
    has_active_membership,
    get_aforo_stats,
    get_aforo_actual,
    invalidate_aforo_cache,
    get_presencia,
    check_aforo,
    check_horario,
)
from .serializers import (
    AccessLogSerializer,
    AccessLogSocioSerializer,
    CerrarDiaSerializer,
    GenerateQRResponseSerializer,
    MiActividadResumenSerializer,
    PresenteSerializer,
    SalidaManualSerializer,
    ScanQRSerializer,
    ManualAccessSerializer,
)
from .tasks import log_qr_event_task
from .utils import (
    generate_dynamic_qr_token,
    verify_dynamic_qr_token,
)
from apps.members.models import Socio

logger = logging.getLogger(__name__)
User = get_user_model()


# ---------------------------------------------------------------------------
# Rate throttles (#159)
# ---------------------------------------------------------------------------

class AccessScanThrottle(UserRateThrottle):
    scope = 'access_scan'


class AccessManualThrottle(UserRateThrottle):
    scope = 'access_manual'


class AccessCredencialThrottle(UserRateThrottle):
    scope = 'access_scan'


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_presentes_qs():
    """Return a queryset of AccessLog representing each socio currently inside.

    A socio is "inside" when their most recent GRANTED log of the local day is
    an ENTRY (not followed by an EXIT GRANTED on the same day).
    """
    today = timezone.localdate()

    # Fetch all GRANTED logs for today ordered by user + timestamp asc.
    # We compute "inside" by walking each user's logs; the last GRANTED for each
    # user tells us their current state.
    granted_today = (
        AccessLog.objects
        .filter(
            timestamp__date=today,
            status=AccessLog.AccessStatus.GRANTED,
            access_type__in=[AccessLog.AccessType.ENTRY, AccessLog.AccessType.EXIT],
            user__isnull=False,
        )
        .select_related('user__socio')
        .prefetch_related('user__socio__membresias')
        .order_by('user_id', 'timestamp')
    )

    # Build a dict user_id -> last_log
    last_log_per_user: dict = {}
    for log in granted_today:
        last_log_per_user[log.user_id] = log

    # Keep only users whose last log is ENTRY
    inside_logs = [
        log for log in last_log_per_user.values()
        if log.access_type == AccessLog.AccessType.ENTRY
    ]
    return inside_logs


def _broadcast_aforo_update():
    """Invalidate the aforo cache and broadcast an aforo.update to the WS group."""
    invalidate_aforo_cache()
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        payload = {'type': 'aforo.update', **get_aforo_actual()}
        async_to_sync(channel_layer.group_send)(AFORO_GROUP, payload)
    except Exception as exc:  # noqa: BLE001
        logger.warning('Aforo broadcast failed: %s', exc)


def _broadcast_aforo_alert(aforo_actual: int, aforo_maximo: int, umbral_pct: int, bloqueo_activo: bool):
    """Emit an aforo.alert message when threshold is crossed."""
    if aforo_maximo <= 0:
        return
    pct = aforo_actual / aforo_maximo * 100
    level = 'critical' if bloqueo_activo and aforo_actual >= aforo_maximo else 'warning'
    message = f"Aforo al {pct:.0f}% — cerca de la capacidad máxima"
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        payload = {
            'type': 'aforo.alert',
            'level': level,
            'aforo_actual': aforo_actual,
            'aforo_maximo': aforo_maximo,
            'pct': round(pct, 1),
            'message': message,
        }
        async_to_sync(channel_layer.group_send)(AFORO_GROUP, payload)
    except Exception as exc:  # noqa: BLE001
        logger.warning('Aforo alert broadcast failed: %s', exc)


def _process_scan(user_obj, is_valid, error_code, access_type, jti, scanned_by_user, source, override=False):
    """Shared scan processing: membership check, aforo, horario, anti-passback, persist log.

    Returns (access_log, is_valid, error_code, message, allow_override, scan_status).

    scan_status is one of 'granted', 'denied', 'warning':
      - 'warning': anti-passback condition — log is persisted as GRANTED with
        the warning code in denial_reason. Caller returns HTTP 200.
      - 'granted': access granted normally.
      - 'denied': access denied, log persisted as DENIED.

    allow_override is True when a staff member may retry with override=True.
    """
    from apps.common.models import GymConfig

    gym_cfg = GymConfig.get()
    aforo_maximo = gym_cfg.aforo_maximo

    allow_override = False
    scan_status = 'denied'
    warning_reason = None

    if is_valid and user_obj:
        if access_type == AccessLog.AccessType.ENTRY:
            # #220 — Horario check (EXIT always permitted regardless of schedule)
            horario_ok, horario_error = check_horario(gym_cfg)
            if not horario_ok:
                is_valid = False
                error_code = horario_error

            # #220 — Aforo check
            if is_valid:
                aforo_ok, aforo_error = check_aforo(gym_cfg)
                if not aforo_ok:
                    is_valid = False
                    error_code = aforo_error

            # Membership & suspension
            if is_valid:
                if not user_obj.is_active:
                    is_valid = False
                    error_code = 'USER_SUSPENDED'
                elif not has_active_membership(user_obj):
                    is_valid = False
                    error_code = 'MEMBERSHIP_INACTIVE'

            # #149 — Anti-passback ENTRY
            if is_valid:
                presencia = get_presencia(user_obj)
                if presencia == 'inside':
                    if override:
                        # Staff override: close the previous open session first
                        _close_previous_session(user_obj, scanned_by_user)
                        # Continue — create the new ENTRY below
                    else:
                        warning_reason = 'YA_FIGURA_ADENTRO'
                        allow_override = True
                        is_valid = False

        else:
            # EXIT — always allowed from schedule/aforo perspective (#220)
            # #149 — Warn if socio not inside, but still register the EXIT as GRANTED
            presencia = get_presencia(user_obj)
            if presencia != 'inside':
                warning_reason = 'NO_FIGURA_ADENTRO'
                # is_valid stays True: log as GRANTED

    # Determine log fields
    if warning_reason:
        scan_status = 'warning'
        access_status = AccessLog.AccessStatus.GRANTED
        denial_reason = warning_reason
    elif is_valid:
        scan_status = 'granted'
        access_status = AccessLog.AccessStatus.GRANTED
        denial_reason = None
    else:
        scan_status = 'denied'
        access_status = AccessLog.AccessStatus.DENIED
        denial_reason = error_code

    message = _build_message(scan_status, warning_reason, error_code, access_type)

    access_log = AccessLog.objects.create(
        user=user_obj,
        access_type=access_type,
        status=access_status,
        denial_reason=denial_reason,
        qr_jti=jti,
        scanned_by=scanned_by_user,
        source=source,
    )

    # Broadcast aforo update for all GRANTED logs (including warnings that are GRANTED)
    if access_status == AccessLog.AccessStatus.GRANTED:
        _broadcast_aforo_update()
        new_aforo = get_aforo_actual().get('aforo_actual', 0)
        umbral_pct = gym_cfg.aforo_umbral_alerta_pct
        if aforo_maximo > 0 and new_aforo / aforo_maximo * 100 >= umbral_pct:
            _broadcast_aforo_alert(new_aforo, aforo_maximo, umbral_pct, gym_cfg.aforo_bloqueo_al_llegar_max)

    return access_log, is_valid, error_code, message, allow_override, scan_status


def _build_message(scan_status, warning_reason, error_code, access_type):
    """Return a human-readable status message for the scan response."""
    if scan_status == 'warning':
        msg_map = {
            'YA_FIGURA_ADENTRO': 'El socio ya figura dentro del gimnasio',
            'NO_FIGURA_ADENTRO': 'El socio no figura dentro del gimnasio',
            'YA_REGISTRADO': 'Acceso registrado recientemente',
        }
        return msg_map.get(warning_reason, f'Advertencia: {warning_reason}')

    if scan_status == 'granted':
        return 'Entrada registrada' if access_type == AccessLog.AccessType.ENTRY else 'Salida registrada'

    # denied
    msg_map = {
        'MEMBERSHIP_INACTIVE': 'Membresía vencida',
        'NOT_INSIDE': 'El socio no registra entrada hoy',
        'AFORO_FULL': 'Aforo completo',
        'AFORO_COMPLETO': 'Aforo máximo alcanzado',
        'FUERA_DE_HORARIO': 'El gimnasio está fuera del horario permitido',
        'USER_SUSPENDED': 'Usuario suspendido',
        'UNKNOWN_USER': 'Usuario desconocido',
    }
    return msg_map.get(error_code, f'Acceso denegado: {error_code}')


def _close_previous_session(user_obj, operator):
    """#149 — Override: create an EXIT GRANTED to close the socio's open session.

    Called when staff sends override=True for a YA_FIGURA_ADENTRO situation.
    """
    AccessLog.objects.create(
        user=user_obj,
        access_type=AccessLog.AccessType.EXIT,
        status=AccessLog.AccessStatus.GRANTED,
        source=AccessLog.AccessSource.MANUAL_CORRECTION,
        operator=operator,
        scanned_by=operator,
        motivo='Sesión previa cerrada por override de staff (anti-passback)',
    )
    logger.info(
        'Anti-passback override: closed previous session for user %s by operator %s',
        user_obj.pk,
        operator.pk if operator else None,
    )


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------

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
        'Procesa el escaneo del código QR en recepción. Para ENTRY: valida token, membresía, '
        'estado del socio y aforo máximo. Para EXIT: valida token y anti-passback (socio debe '
        'estar adentro); NO valida membresía activa.'
    ),
    request=ScanQRSerializer,
    responses={200: AccessLogSerializer, 403: AccessLogSerializer, 400: None},
)
class ScanQRView(APIView):
    """
    POST /api/access/qr/scan/
    Procesa el escaneo de un código QR en la terminal de recepción.
    [BLOCKER-1 Fix]: Protegido con IsReceptionistOrAdmin para prevenir auto-aprobación por socios.
    [Fix #148]: EXIT no valida membresía activa.
    [Fix #149]: Anti-passback warning + override support.
    [Fix #220]: Aforo + horario enforcement.
    [Fix #159]: Throttled at 60/min.
    """
    permission_classes = [IsReceptionistOrAdmin]
    throttle_classes = [AccessScanThrottle]

    def post(self, request):
        serializer = ScanQRSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        qr_token = serializer.validated_data['qr_token']
        access_type = serializer.validated_data['access_type']
        override = bool(request.data.get('override', False))
        scanned_by_user = request.user

        # 1. Verify Token QR and consume atomically (anti-replay)
        is_valid, error_code, payload = verify_dynamic_qr_token(qr_token, consume=True)

        user_obj = None
        jti = payload.get('jti') if payload else None

        if payload and 'user_id' in payload:
            try:
                user_obj = User.objects.get(id=payload['user_id'])
            except User.DoesNotExist:
                error_code = 'UNKNOWN_USER'
                is_valid = False

        # 2. Process scan (membership, aforo, horario, anti-passback)
        access_log, is_valid, error_code, message, allow_override, scan_status = _process_scan(
            user_obj=user_obj,
            is_valid=is_valid,
            error_code=error_code,
            access_type=access_type,
            jti=jti,
            scanned_by_user=scanned_by_user,
            source=AccessLog.AccessSource.QR_SCAN,
            override=override,
        )

        # 3. Fire async Mongo audit log
        access_status = access_log.status
        denial_reason = access_log.denial_reason
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
        log_qr_event_task.delay(mongo_payload)

        # 4. Build response
        response_data = {
            "is_valid": is_valid,
            "scan_status": scan_status,
            "status": access_status,
            "access_type": access_type,
            "message": message,
            "denial_reason": denial_reason,
            "allow_override": allow_override,
            "socio": _socio_data(user_obj),
            "access_log": AccessLogSerializer(access_log).data,
        }

        # Warnings are HTTP 200 so the frontend can display the override button
        if scan_status in ('granted', 'warning'):
            response_status = status.HTTP_200_OK
        else:
            response_status = status.HTTP_403_FORBIDDEN
        return Response(response_data, status=response_status)


@extend_schema(
    tags=['access'],
    summary='Validar acceso por DNI (recep/admin)',
    description=(
        'Procesa el acceso manual ingresando el DNI en la terminal de recepción. '
        'Para ENTRY: valida membresía y aforo. Para EXIT: valida anti-passback; '
        'NO valida membresía activa.'
    ),
    request=ManualAccessSerializer,
    responses={200: AccessLogSerializer, 403: AccessLogSerializer, 400: None},
)
class ManualAccessView(APIView):
    """
    POST /api/access/manual/ (DNI scan)
    [Fix #148]: EXIT no valida membresía activa.
    [Fix #149]: Anti-passback warning + override support.
    [Fix #220]: Aforo + horario enforcement.
    [Fix #159]: Throttled at 60/min.
    """
    permission_classes = [IsReceptionistOrAdmin]
    throttle_classes = [AccessManualThrottle]

    def post(self, request):
        serializer = ManualAccessSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        dni = serializer.validated_data['dni']
        access_type = serializer.validated_data['access_type']
        override = bool(request.data.get('override', False))
        scanned_by_user = request.user

        is_valid = True
        error_code = None
        user_obj = None

        try:
            socio = Socio.objects.get(dni=dni)
            user_obj = socio.usuario
        except Socio.DoesNotExist:
            is_valid = False
            error_code = 'UNKNOWN_USER'

        access_log, is_valid, error_code, message, allow_override, scan_status = _process_scan(
            user_obj=user_obj,
            is_valid=is_valid,
            error_code=error_code,
            access_type=access_type,
            jti=None,
            scanned_by_user=scanned_by_user,
            source=AccessLog.AccessSource.DNI_SCAN,
            override=override,
        )

        access_status = access_log.status
        denial_reason = access_log.denial_reason
        mongo_payload = {
            "postgres_access_log_id": access_log.id,
            "timestamp": timezone.now().isoformat(),
            "access_type": access_type,
            "status": access_status,
            "denial_reason": denial_reason,
            "user_id": user_obj.id if user_obj else None,
            "scanned_by_id": scanned_by_user.id if scanned_by_user else None,
            "qr_jti": None,
        }
        log_qr_event_task.delay(mongo_payload)

        response_data = {
            "is_valid": is_valid,
            "scan_status": scan_status,
            "status": access_status,
            "access_type": access_type,
            "message": message,
            "denial_reason": denial_reason,
            "allow_override": allow_override,
            "socio": _socio_data(user_obj),
            "access_log": AccessLogSerializer(access_log).data,
        }

        if scan_status in ('granted', 'warning'):
            response_status = status.HTTP_200_OK
        else:
            response_status = status.HTTP_403_FORBIDDEN
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
    [Fix #152]: AccessLogPagination with page_size_query_param support.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AccessLogSerializer
    filterset_class = AccessLogFilter
    pagination_class = AccessLogPagination
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return AccessLog.objects.none()

        user = self.request.user
        is_privileged = user.rol in ('administrador', 'recepcionista') or user.is_staff

        # #150 — select_related covers all FK traversals used by AccessLogSerializer
        # (user__socio for nombre/apellido, membresias__plan for user_plan_nombre).
        # prefetch_related on membresias__plan avoids the N+1 that previously hit
        # the DB once per row when calling socio.membresias.filter(...).first().
        base_qs = AccessLog.objects.select_related(
            'user__socio',
            'scanned_by',
            'operator',
        ).prefetch_related(
            'user__socio__membresias__plan',
        )

        if is_privileged:
            return base_qs
        return base_qs.filter(user=user)


@extend_schema(
    tags=['access'],
    summary='Estadísticas de aforo del día actual',
    description='Devuelve estadísticas como promedio, picos, ingresos y egresos de la última hora.',
    responses={200: {}},
)
class AforoStatsView(APIView):
    """
    GET /api/access/stats/
    """
    permission_classes = [IsReceptionistOrAdmin]

    def get(self, request):
        stats = get_aforo_stats()  # use cached wrapper (30s TTL)
        return Response(stats, status=status.HTTP_200_OK)


@extend_schema(
    tags=['access'],
    summary='Socios presentes ahora (recep/admin)',
    description=(
        'Lista los socios cuya última AccessLog GRANTED del día local es ENTRY sin EXIT posterior.'
    ),
    responses={200: {}},
)
class PresentesView(APIView):
    """
    GET /api/access/presentes/
    Fix #154: lista socios actualmente dentro del gimnasio.
    """
    permission_classes = [IsReceptionistOrAdmin]

    def get(self, request):
        now = timezone.now()
        inside_logs = _get_presentes_qs()

        presentes = []
        for log in inside_logs:
            user = log.user
            socio = getattr(user, 'socio', None)
            if socio is None:
                continue

            minutos_adentro = int((now - log.timestamp).total_seconds() / 60)

            # Determine current membership state
            membresia = socio.membresias.filter(
                Q(estado='activa') | Q(estado='vencida') | Q(estado='suspendida')
            ).order_by('-fecha_fin').first()

            if membresia:
                estado_membresia = membresia.estado
            elif socio.estado == 'suspendido':
                estado_membresia = 'suspendido'
            else:
                estado_membresia = 'vencida'

            presentes.append({
                'socio_id': socio.id,
                'numero_socio': socio.numero_socio,
                'nombre': socio.nombre,
                'apellido': socio.apellido,
                'entrada_timestamp': log.timestamp,
                'estado_membresia': estado_membresia,
                'minutos_adentro': minutos_adentro,
            })

        return Response({'count': len(presentes), 'presentes': presentes}, status=status.HTTP_200_OK)


@extend_schema(
    tags=['access'],
    summary='Registrar salida manual (recep/admin)',
    description=(
        'Crea registros EXIT/GRANTED para los socios indicados con source=MANUAL_CORRECTION. '
        'Socios que no están presentes son omitidos y reportados en warnings.'
    ),
    responses={200: {}},
)
class SalidaManualView(APIView):
    """
    POST /api/access/salida-manual/
    Fix #154.
    """
    permission_classes = [IsReceptionistOrAdmin]

    def post(self, request):
        serializer = SalidaManualSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        socio_ids = serializer.validated_data['socio_ids']
        motivo = serializer.validated_data.get('motivo', '')
        operator = request.user
        now = timezone.now()

        inside_logs = _get_presentes_qs()
        inside_by_socio_id = {
            log.user.socio.id: log
            for log in inside_logs
            if getattr(log.user, 'socio', None) is not None
        }

        created_logs = []
        warnings = []

        for socio_id in socio_ids:
            if socio_id not in inside_by_socio_id:
                warnings.append({'socio_id': socio_id, 'reason': 'Not currently inside or not found'})
                continue

            entry_log = inside_by_socio_id[socio_id]
            user_obj = entry_log.user
            socio = user_obj.socio

            access_log = AccessLog.objects.create(
                user=user_obj,
                access_type=AccessLog.AccessType.EXIT,
                status=AccessLog.AccessStatus.GRANTED,
                source=AccessLog.AccessSource.MANUAL_CORRECTION,
                operator=operator,
                motivo=motivo,
                scanned_by=operator,
            )

            created_logs.append({
                'id': access_log.id,
                'socio_id': socio.id,
                'access_type': 'EXIT',
                'status': 'GRANTED',
                'source': 'MANUAL_CORRECTION',
                'operator_id': operator.id,
                'operator_name': f"{operator.first_name} {operator.last_name}".strip() or operator.email,
                'timestamp': access_log.timestamp,
                'motivo': motivo,
            })

        # Broadcast aforo update after bulk exits
        if created_logs:
            _broadcast_aforo_update()

        return Response({
            'created_count': len(created_logs),
            'access_logs': created_logs,
            'warnings': warnings,
        }, status=status.HTTP_200_OK)


@extend_schema(
    tags=['access'],
    summary='Cerrar día — registrar salida para todos los presentes (admin-only)',
    description=(
        'Admin-only. Lista todos los socios presentes y crea un registro EXIT/GRANTED '
        'con source=DAY_CLOSE_AUTO para cada uno.'
    ),
    responses={200: {}},
)
class CerrarDiaView(APIView):
    """
    POST /api/access/cerrar-dia/
    Fix #154. Admin-only.
    """
    permission_classes = [IsAdminOnly]

    def post(self, request):
        serializer = CerrarDiaSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if not serializer.validated_data.get('confirm'):
            return Response(
                {'detail': 'Se requiere confirm=true para ejecutar el cierre de día.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        operator = request.user
        now = timezone.now()

        inside_logs = _get_presentes_qs()
        closed_count = 0

        for log in inside_logs:
            user_obj = log.user
            AccessLog.objects.create(
                user=user_obj,
                access_type=AccessLog.AccessType.EXIT,
                status=AccessLog.AccessStatus.GRANTED,
                source=AccessLog.AccessSource.DAY_CLOSE_AUTO,
                operator=operator,
                motivo='Cierre de día automático',
                scanned_by=operator,
            )
            closed_count += 1

        if closed_count:
            _broadcast_aforo_update()

        return Response({
            'closed_count': closed_count,
            'message': f'{closed_count} presentes dieron salida al cierre del día.',
            'timestamp_cierre': now,
        }, status=status.HTTP_200_OK)


@extend_schema(
    tags=['access'],
    summary='Snapshot REST de aforo actual (fallback cuando WebSocket no conecta)',
    description=(
        'Devuelve el estado actual del aforo: aforo_actual, aforo_maximo, '
        'ingresos_hoy, egresos_hoy y timestamp. Usar como fallback REST '
        'cuando el WebSocket tarda más de 3 segundos en conectar.'
    ),
    responses={200: {
        'type': 'object',
        'properties': {
            'aforo_actual': {'type': 'integer'},
            'aforo_maximo': {'type': 'integer'},
            'ingresos_hoy': {'type': 'integer'},
            'egresos_hoy': {'type': 'integer'},
            'timestamp': {'type': 'string', 'format': 'date-time'},
        },
    }},
)
class AforoSnapshotView(APIView):
    """
    GET /api/access/aforo/snapshot/
    Fix #152 — REST fallback for aforo when WebSocket is unavailable.
    """
    permission_classes = [IsReceptionistOrAdmin]

    def get(self, request):
        from apps.common.models import GymConfig  # noqa: PLC0415

        aforo_data = get_aforo_actual()
        gym_cfg = GymConfig.get()

        return Response({
            'aforo_actual': aforo_data.get('aforo_actual', 0),
            'aforo_maximo': gym_cfg.aforo_maximo,
            'ingresos_hoy': aforo_data.get('ingresos_hoy', 0),
            'egresos_hoy': aforo_data.get('egresos_hoy', 0),
            'timestamp': timezone.now().isoformat(),
        }, status=status.HTTP_200_OK)


@extend_schema(
    tags=['access'],
    summary='Estado de credencial digital del socio autenticado (#157)',
    description=(
        'Devuelve si el socio puede generar QR y el motivo en caso contrario. '
        'Motivos posibles: membresia_vencida, socio_suspendido, socio_baja, sin_plan.'
    ),
    responses={200: {
        'type': 'object',
        'properties': {
            'habilitado': {'type': 'boolean'},
            'motivo': {'type': 'string', 'nullable': True},
            'cta': {'type': 'object', 'nullable': True,
                    'properties': {'label': {'type': 'string'}, 'href': {'type': 'string'}}},
        },
    }},
)
class CredencialEstadoView(APIView):
    """
    GET /api/access/credencial/estado/
    #157 — Returns the credencial state for the authenticated socio.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AccessCredencialThrottle]

    def get(self, request):
        from django.conf import settings as django_settings
        from apps.memberships.models import Membresia  # noqa: PLC0415

        user = request.user
        frontend_url = getattr(django_settings, 'FRONTEND_URL', '').rstrip('/')

        socio = getattr(user, 'socio', None)
        if socio is None:
            return Response({
                'habilitado': False,
                'motivo': 'sin_plan',
                'cta': {'label': 'Contactar recepción', 'href': f'{frontend_url}/contacto'},
            })

        if socio.estado == 'baja':
            return Response({
                'habilitado': False,
                'motivo': 'socio_baja',
                'cta': {'label': 'Contactar recepción', 'href': f'{frontend_url}/contacto'},
            })

        if socio.estado == 'suspendido':
            return Response({
                'habilitado': False,
                'motivo': 'socio_suspendido',
                'cta': {'label': 'Contactar recepción', 'href': f'{frontend_url}/contacto'},
            })

        # Check active membership
        from django.utils import timezone as tz
        today = tz.localdate()
        membresia = (
            Membresia.objects
            .filter(socio=socio, estado=Membresia.Estado.ACTIVA)
            .order_by('-fecha_fin')
            .first()
        )

        if membresia is None:
            # No active plan at all
            return Response({
                'habilitado': False,
                'motivo': 'sin_plan',
                'cta': {'label': 'Ver planes', 'href': f'{frontend_url}/planes'},
            })

        if membresia.fecha_fin < today:
            return Response({
                'habilitado': False,
                'motivo': 'membresia_vencida',
                'cta': {'label': 'Renovar membresía', 'href': f'{frontend_url}/perfil/membresia'},
            })

        return Response({'habilitado': True, 'motivo': None, 'cta': None})


# ---------------------------------------------------------------------------
# #151 — Mi actividad (socio self-service)
# ---------------------------------------------------------------------------

@extend_schema(
    tags=['access'],
    summary='Mi actividad de acceso (socio autenticado)',
    description=(
        'Devuelve un resumen mensual (accesos_mes, ultimo_acceso, rechazos_mes) '
        'más el historial paginado de logs propios. No expone campos internos '
        '(scanned_by_email, qr_jti).'
    ),
    responses={200: {
        'type': 'object',
        'properties': {
            'resumen': {'type': 'object'},
            'count': {'type': 'integer'},
            'next': {'type': 'string', 'nullable': True},
            'previous': {'type': 'string', 'nullable': True},
            'results': {'type': 'array', 'items': {}},
        },
    }},
)
class MiActividadView(generics.ListAPIView):
    """
    GET /api/access/me/actividad/
    #151 — Socio-only endpoint: resumen + paginación de propios logs.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AccessLogSocioSerializer
    pagination_class = AccessLogPagination

    def get_queryset(self):
        return (
            AccessLog.objects
            .filter(user=self.request.user)
            .order_by('-timestamp')
        )

    def list(self, request, *args, **kwargs):
        from django.utils import timezone as tz

        user = request.user
        start_of_month = tz.localdate().replace(day=1)

        # Resumen aggregates
        logs_mes = AccessLog.objects.filter(
            user=user,
            timestamp__date__gte=start_of_month,
        )
        accesos_mes = logs_mes.filter(
            access_type=AccessLog.AccessType.ENTRY,
            status=AccessLog.AccessStatus.GRANTED,
        ).count()
        rechazos_mes = logs_mes.filter(
            status=AccessLog.AccessStatus.DENIED,
        ).count()
        ultimo_log = (
            AccessLog.objects
            .filter(
                user=user,
                access_type=AccessLog.AccessType.ENTRY,
                status=AccessLog.AccessStatus.GRANTED,
            )
            .order_by('-timestamp')
            .first()
        )
        ultimo_acceso = ultimo_log.timestamp if ultimo_log else None

        resumen = {
            'accesos_mes': accesos_mes,
            'ultimo_acceso': ultimo_acceso,
            'rechazos_mes': rechazos_mes,
        }

        # Standard paginated logs
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated = self.get_paginated_response(serializer.data)
            paginated.data['resumen'] = resumen
            return paginated

        serializer = self.get_serializer(queryset, many=True)
        return Response({'resumen': resumen, 'results': serializer.data})


# ---------------------------------------------------------------------------
# #150 — Access log export (CSV / XLSX)
# ---------------------------------------------------------------------------

@extend_schema(
    tags=['access'],
    summary='Exportar historial de accesos (recep/admin)',
    description=(
        'Exporta los registros de acceso aplicando los mismos filtros de '
        'AccessLogFilter. Soporta ?format=csv (default) y ?format=xlsx. '
        'Incluye filas DENIED con su motivo.'
    ),
    responses={200: {}},
)
class AccessLogExportView(generics.GenericAPIView):
    """
    GET /api/access/logs/export/
    #150 — Export access logs as CSV or XLSX.
    """
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = AccessLogFilter

    def get_queryset(self):
        user = self.request.user
        is_privileged = user.rol in ('administrador', 'recepcionista') or user.is_staff

        base_qs = AccessLog.objects.select_related(
            'user__socio',
            'scanned_by',
            'operator',
        ).prefetch_related(
            'user__socio__membresias__plan',
        ).order_by('-timestamp')

        if is_privileged:
            return base_qs
        return base_qs.filter(user=user)

    def get(self, request, *args, **kwargs):
        from apps.reports.exporters import export as do_export

        fmt = (request.query_params.get('fmt') or 'csv').lower()
        if fmt not in ('csv', 'xlsx'):
            return Response(
                {'detail': f"Formato '{fmt}' no soportado. Use csv o xlsx."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self.filter_queryset(self.get_queryset())

        headers = [
            'ID', 'Timestamp', 'DNI', 'Nombre', 'Apellido', 'Plan',
            'Tipo', 'Estado', 'Motivo denegación', 'Fuente', 'Operador',
        ]

        def _row(log):
            socio = getattr(getattr(log, 'user', None), 'socio', None)
            membresia = None
            if socio:
                membresia = socio.membresias.filter(estado='activa').first()
            return [
                log.id,
                log.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                socio.dni if socio else '',
                socio.nombre if socio else '',
                socio.apellido if socio else '',
                membresia.plan.nombre if membresia else '',
                log.access_type,
                log.status,
                log.denial_reason or '',
                log.source,
                (
                    f'{log.operator.first_name} {log.operator.last_name}'.strip()
                    if log.operator else ''
                ),
            ]

        rows = [_row(log) for log in queryset]

        return do_export(fmt, 'historial_accesos', 'Historial de Accesos', headers, rows)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _socio_data(user_obj):
    """Return a minimal socio dict for scan responses, or None."""
    if user_obj is None:
        return None
    socio = getattr(user_obj, 'socio', None)
    if socio is None:
        return None
    return {
        'id': socio.id,
        'numero_socio': socio.numero_socio,
        'nombre': socio.nombre,
        'apellido': socio.apellido,
    }
