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
    Elimina PII (email) del payload expuesto en el código QR.
    """
    secret = settings.QR_SECRET_KEY.encode('utf-8')
    ttl = getattr(settings, 'QR_TOKEN_EXPIRATION_SECONDS', 30)

    now = int(time.time())
    jti = str(uuid.uuid4())

    # CRITICAL-2 Fix: PII (user_email) omitida del payload del token QR público
    payload = {
        'user_id': user.id,
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


def verify_and_consume_token(jti: str, ttl: int = None) -> tuple[bool, str | None]:
    """
    [BLOCKER-4 & BLOCKER-6 & W-1 Fix]: Usa cache.add() (SET NX en Redis) para verificar
    y consumir el token de forma atómica evitando la condición de carrera TOCTOU.
    Maneja caídas de Redis con fallback degradado controlado (fail open con warning).
    """
    if not jti:
        return False, 'INVALID_TOKEN'

    if ttl is None:
        token_ttl = getattr(settings, 'QR_TOKEN_EXPIRATION_SECONDS', 30)
        ttl = token_ttl + 60  # Buffer razonable sobre el tiempo de expiración

    cache_key = f"qr_used:{jti}"

    try:
        # cache.add retorna True si la clave NO existía y fue agregada (primer uso).
        # Retorna False si la clave ya existía en Redis (REPLAY ATTACK).
        is_first_use = cache.add(cache_key, True, ttl)
        if not is_first_use:
            return False, 'REPLAY_ATTACK'
        return True, None
    except Exception as e:
        logger.error(f"Redis indisponible durante verificación anti-replay de QR (jti={jti}): {e}")
        # Política Fail Open degradada: permitir el paso sin tirar excepción si Redis cae
        return True, "REDIS_UNAVAILABLE"


def verify_dynamic_qr_token(qr_token_str: str, consume: bool = True) -> tuple[bool, str | None, dict | None]:
    """
    Verifica la firma, caducidad y reutilización del token QR dinámico.
    Retorna: (is_valid, error_code, payload)
    """
    if not qr_token_str or '.' not in qr_token_str:
        return False, 'INVALID_SIGNATURE', None

    try:
        payload_b64, signature_b64 = qr_token_str.rsplit('.', 1)
        secret = settings.QR_SECRET_KEY.encode('utf-8')

        # 1. Verificar firma HMAC
        expected_sig = hmac.new(secret, payload_b64.encode('utf-8'), hashlib.sha256).digest()
        actual_sig = _base64url_decode(signature_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return False, 'INVALID_SIGNATURE', None

        # 2. Decodificar payload
        payload_bytes = _base64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))

        now = int(time.time())
        exp = payload.get('exp', 0)

        # 3. Validar expiración (30s)
        if now > exp:
            return False, 'TOKEN_EXPIRED', payload

        # 4. Validar y consumir anti-replay atómicamente si consume=True
        jti = payload.get('jti')
        if consume:
            is_valid_use, replay_error = verify_and_consume_token(jti)
            if not is_valid_use:
                return False, replay_error, payload

        return True, None, payload

    except Exception as e:
        logger.error(f"Error al decodificar token QR: {e}")
        return False, 'INVALID_SIGNATURE', None


def mark_qr_token_used(jti: str, ttl: int = None):
    """
    Wrapper de compatibilidad para marcar un token QR como consumido.
    """
    verify_and_consume_token(jti, ttl)
