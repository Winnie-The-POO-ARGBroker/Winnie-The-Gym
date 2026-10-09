import logging
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.utils import timezone

logger = logging.getLogger(__name__)

STAFF_ROLES = {'administrador', 'recepcionista'}
DEFAULT_INACTIVITY_TIMEOUT_SECONDS = 30 * 60  # 30 minutos (RNF05)
CACHE_KEY_PREFIX = 'staff_last_activity_'
CACHE_EXPIRY_SECONDS = 24 * 60 * 60  # 24 horas


def get_staff_activity_cache_key(user_id):
    return f'{CACHE_KEY_PREFIX}{user_id}'


def record_staff_activity(user_id):
    """Actualiza la marca de tiempo de última actividad para un usuario staff."""
    try:
        now_ts = timezone.now().timestamp()
        cache.set(get_staff_activity_cache_key(user_id), now_ts, timeout=CACHE_EXPIRY_SECONDS)
    except Exception as e:
        logger.warning('Error al registrar actividad de staff en cache: %s', e)


def clear_staff_activity(user_id):
    """Elimina el registro de actividad de staff en cache."""
    try:
        cache.delete(get_staff_activity_cache_key(user_id))
    except Exception as e:
        logger.warning('Error al limpiar actividad de staff en cache: %s', e)


def get_staff_last_activity(user_id):
    """Obtiene el timestamp de última actividad registrada para un usuario staff."""
    try:
        return cache.get(get_staff_activity_cache_key(user_id))
    except Exception as e:
        logger.warning('Error al consultar actividad de staff en cache: %s', e)
        return None


class StaffInactivityMiddleware:
    """RNF05: Invalida la sesión tras 30 minutos de inactividad para usuarios staff (admin/recepcionista).

    Previene accesos no autorizados en terminales compartidas de recepción.
    No aplica a socios (portal móvil).
    """

    EXEMPT_PATHS = (
        '/api/auth/login/',
        '/api/auth/google/',
        '/api/auth/password/reset/',
        '/api/auth/password/reset/confirm/',
        '/health/',
        '/api/health/',
        '/api/schema/',
        '/api/docs/',
        '/api/redoc/',
    )

    def __init__(self, get_response):
        self.get_response = get_response
        self.timeout_seconds = getattr(
            settings,
            'STAFF_INACTIVITY_TIMEOUT_SECONDS',
            DEFAULT_INACTIVITY_TIMEOUT_SECONDS,
        )

    def _resolve_user(self, request):
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            return user

        auth_header = request.headers.get('Authorization') or request.META.get('HTTP_AUTHORIZATION')
        if auth_header and auth_header.startswith('Bearer '):
            raw_token = auth_header.split(' ', 1)[1].strip()
            if raw_token:
                try:
                    from rest_framework_simplejwt.tokens import AccessToken
                    from django.contrib.auth import get_user_model
                    access = AccessToken(raw_token)
                    user_id = access.get('user_id')
                    if user_id:
                        User = get_user_model()
                        resolved = User.objects.filter(pk=user_id).first()
                        if resolved:
                            return resolved
                except Exception:
                    pass
        return None

    def __call__(self, request):
        path = request.path_info
        if any(path.startswith(exempt) for exempt in self.EXEMPT_PATHS):
            return self.get_response(request)

        user = self._resolve_user(request)

        if not user or not user.is_authenticated:
            return self.get_response(request)

        user_role = getattr(user, 'rol', None)
        if user_role not in STAFF_ROLES:
            return self.get_response(request)

        now_ts = timezone.now().timestamp()
        last_activity = get_staff_last_activity(user.id)

        if last_activity is not None:
            elapsed = now_ts - last_activity
            if elapsed > self.timeout_seconds:
                clear_staff_activity(user.id)
                logger.info(
                    'RNF05: Sesión invalidada por inactividad para staff id=%s (inactivo por %d s)',
                    user.id,
                    int(elapsed),
                )
                return JsonResponse(
                    {
                        'detail': 'Sesión expirada por inactividad.',
                        'code': 'session_inactive',
                    },
                    status=401,
                )

        record_staff_activity(user.id)
        return self.get_response(request)
