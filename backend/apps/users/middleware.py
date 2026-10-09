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
    """Actualiza la marca de tiempo de última actividad para un usuario staff en caché."""
    try:
        now_ts = timezone.now().timestamp()
        cache.set(get_staff_activity_cache_key(user_id), now_ts, timeout=CACHE_EXPIRY_SECONDS)
    except Exception as e:
        logger.warning('Error al registrar actividad de staff en cache: %s', e)


def clear_staff_activity(user_id):
    """Elimina el registro de actividad de staff en caché."""
    try:
        cache.delete(get_staff_activity_cache_key(user_id))
    except Exception as e:
        logger.warning('Error al limpiar actividad de staff en cache: %s', e)


def get_staff_last_activity(user_id):
    """Obtiene el timestamp de última actividad registrada para un usuario staff desde caché."""
    try:
        return cache.get(get_staff_activity_cache_key(user_id))
    except Exception as e:
        logger.warning('Error al consultar actividad de staff en cache: %s', e)
        return None


class StaffInactivityMiddleware:
    """RNF05: Invalida la sesión tras 30 minutos de inactividad para usuarios staff (admin/recepcionista).

    Previene accesos no autorizados en terminales compartidas de recepción.
    No aplica a socios (portal móvil).
    Opera con 0 queries a la base de datos usando presencia de clave en caché.
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

    def _enforce_activity(self, user_id, is_known_staff=False):
        """Valida y actualiza la actividad de staff en caché sin realizar consultas a la base de datos.

        Retorna JsonResponse(401) si la sesión expiró por inactividad, o None si está activa.
        """
        last_activity = get_staff_last_activity(user_id)
        if last_activity is None:
            # Si se conoce explícitamente que es staff (p.ej. session auth), registrar actividad inicial
            if is_known_staff:
                record_staff_activity(user_id)
            # Si no hay actividad registrada en caché (JWT) -> no es staff tracked -> bypass sin DB
            return None

        now_ts = timezone.now().timestamp()
        if (now_ts - last_activity) > self.timeout_seconds:
            clear_staff_activity(user_id)
            logger.info(
                'RNF05: Sesión invalidada por inactividad para staff id=%s (inactivo por %d s)',
                user_id,
                int(now_ts - last_activity),
            )
            return JsonResponse(
                {
                    'detail': 'Sesión expirada por inactividad.',
                    'code': 'session_inactive',
                },
                status=401,
            )

        record_staff_activity(user_id)
        return None

    def _check_token_refresh(self, request):
        """Si la petición es un refresh token de un staff inactivo, rechaza con 401."""
        try:
            import json
            body = json.loads(request.body.decode('utf-8'))
            refresh_token_str = body.get('refresh')
            if not refresh_token_str:
                return None

            from rest_framework_simplejwt.tokens import UntypedToken
            token = UntypedToken(refresh_token_str)
            user_id = token.get('user_id')
            if not user_id:
                return None

            return self._enforce_activity(user_id)
        except Exception as e:
            logger.debug('Error validando refresh token en middleware: %s', e)
        return None

    def __call__(self, request):
        path = request.path_info

        # Validar refresh token de staff ante inactividad
        if (path.startswith('/api/auth/token/refresh/') or path.startswith('/api/token/refresh/')) and request.method == 'POST':
            refresh_response = self._check_token_refresh(request)
            if refresh_response:
                return refresh_response

        if any(path.startswith(exempt) for exempt in self.EXEMPT_PATHS):
            return self.get_response(request)

        # 1. Fast path para Session auth (Django admin)
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            if getattr(user, 'rol', None) in STAFF_ROLES:
                response = self._enforce_activity(user.id, is_known_staff=True)
                if response:
                    return response
            return self.get_response(request)

        # 2. JWT auth — decode de token en memoria (0 consultas a la base de datos)
        auth_header = request.headers.get('Authorization') or request.META.get('HTTP_AUTHORIZATION') or ''
        if not auth_header.startswith('Bearer '):
            return self.get_response(request)

        try:
            raw_token = auth_header.split(' ', 1)[1].strip()
            if not raw_token:
                return self.get_response(request)

            from rest_framework_simplejwt.tokens import AccessToken
            access = AccessToken(raw_token)
            user_id = access.get('user_id')
            if not user_id:
                return self.get_response(request)
        except Exception:
            # Token inválido o malformado: dejar que DRF maneje la autenticación normalmente
            return self.get_response(request)

        response = self._enforce_activity(user_id)
        if response:
            return response

        return self.get_response(request)
