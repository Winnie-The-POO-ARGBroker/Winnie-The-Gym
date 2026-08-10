import base64
import hmac
import hashlib
import json
import time
import uuid
import logging
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')


def _base64url_decode(data_str: str) -> bytes:
    padding = '=' * (4 - (len(data_str) % 4))
    return base64.urlsafe_b64decode(data_str + padding)


def generate_dynamic_qr_token(user) -> dict:
    """
    Genera un token QR dinámico firmado con HMAC-SHA256 con tiempo de expiración (defecto 30 segundos).
    """
    secret = getattr(settings, 'QR_SECRET_KEY', settings.SECRET_KEY).encode('utf-8')
    ttl = getattr(settings, 'QR_TOKEN_EXPIRATION_SECONDS', 30)

    now = int(time.time())
    jti = str(uuid.uuid4())

    payload = {
        'user_id': user.id,
        'user_email': user.email,
        'jti': jti,
        'iat': now,
        'exp': now + ttl
    }

    payload_json = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    payload_b64 = _base64url_encode(payload_json)

    signature = hmac.new(secret, payload_b64.encode('utf-8'), hashlib.sha256).digest()
    signature_b64 = _base64url_encode(signature)

    qr_token = f"{payload_b64}.{signature_b64}"

    return {
        'qr_token': qr_token,
        'expires_in': ttl,
        'expires_at': payload['exp'],
        'jti': jti
    }


def verify_dynamic_qr_token(qr_token_str: str) -> tuple[bool, str | None, dict | None]:
    """
    Verifica la firma, caducidad y reutilización del token QR dinámico.
    Retorna: (is_valid, error_code, payload)
    """
    if not qr_token_str or '.' not in qr_token_str:
        return False, 'INVALID_SIGNATURE', None

    try:
        payload_b64, signature_b64 = qr_token_str.rsplit('.', 1)
        secret = getattr(settings, 'QR_SECRET_KEY', settings.SECRET_KEY).encode('utf-8')

        # Verificar firma HMAC
        expected_sig = hmac.new(secret, payload_b64.encode('utf-8'), hashlib.sha256).digest()
        actual_sig = _base64url_decode(signature_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return False, 'INVALID_SIGNATURE', None

        # Decodificar payload
        payload_bytes = _base64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))

        now = int(time.time())
        exp = payload.get('exp', 0)

        # Validar expiración (30s)
        if now > exp:
            return False, 'TOKEN_EXPIRED', payload

        # Validar anti-replay (que no haya sido consumido)
        jti = payload.get('jti')
        if jti:
            cache_key = f"qr_used:{jti}"
            if cache.get(cache_key):
                return False, 'REPLAY_ATTACK', payload

        return True, None, payload

    except Exception as e:
        logger.error(f"Error al decodificar token QR: {e}")
        return False, 'INVALID_SIGNATURE', None


def mark_qr_token_used(jti: str, ttl: int = 300):
    """
    Marca un token QR como consumido en el cache/Redis para prevenir ataques de reutilización.
    """
    if jti:
        cache_key = f"qr_used:{jti}"
        cache.set(cache_key, True, timeout=ttl)
