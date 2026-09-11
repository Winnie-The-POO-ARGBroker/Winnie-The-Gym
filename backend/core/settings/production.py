"""Production settings hardened for Render + Supabase + Upstash + Atlas.

See docs/deploy.md for the full deploy plan and the env vars each service
expects. Anything opinionated is documented inline.
"""
from .base import *  # noqa: F401,F403


DEBUG = False

ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=lambda v: [s.strip() for s in v.split(',') if s.strip()])

CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', cast=lambda v: [s.strip() for s in v.split(',') if s.strip()])
CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^https:\/\/.*\.vercel\.app$',
    r'^https:\/\/.*\.onrender\.com$',
]

CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    cast=lambda v: [s.strip() for s in v.split(',') if s.strip()],
    default='',
)


# ---------------------------------------------------------------------------
# Security headers (Render terminates TLS and forwards X-Forwarded-Proto)
# ---------------------------------------------------------------------------
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', cast=bool, default=True)
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', cast=int, default=31536000)  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = 'DENY'


# ---------------------------------------------------------------------------
# Static files via WhiteNoise (served straight from the Django process)
# ---------------------------------------------------------------------------
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Insert WhiteNoise right after SecurityMiddleware — the recommended slot.
_middleware = list(MIDDLEWARE)  # noqa: F405 (imported via wildcard)
_security_idx = _middleware.index('django.middleware.security.SecurityMiddleware')
_middleware.insert(_security_idx + 1, 'whitenoise.middleware.WhiteNoiseMiddleware')
MIDDLEWARE = _middleware


# ---------------------------------------------------------------------------
# Media files via Supabase Storage (S3-compatible endpoint)
# ---------------------------------------------------------------------------
DEFAULT_FILE_STORAGE = 'apps.common.storages.SupabaseMediaStorage'

SUPABASE_STORAGE_ACCESS_KEY = config('SUPABASE_STORAGE_ACCESS_KEY', default='')
SUPABASE_STORAGE_SECRET_KEY = config('SUPABASE_STORAGE_SECRET_KEY', default='')
SUPABASE_STORAGE_BUCKET = config('SUPABASE_STORAGE_BUCKET', default='fichas-medicas')
SUPABASE_STORAGE_REGION = config('SUPABASE_STORAGE_REGION', default='us-east-1')
SUPABASE_STORAGE_ENDPOINT = config(
    'SUPABASE_STORAGE_ENDPOINT',
    default='',  # ej: https://<project-ref>.supabase.co/storage/v1/s3
)
SUPABASE_STORAGE_PUBLIC_URL_BASE = config(
    'SUPABASE_STORAGE_PUBLIC_URL_BASE',
    default='',  # ej: https://<project-ref>.supabase.co/storage/v1/object/public
)


# ---------------------------------------------------------------------------
# Logging — force JSON in prod (dev may override with LOG_FORMAT=plain)
# ---------------------------------------------------------------------------
LOGGING['handlers']['console']['formatter'] = 'json'  # noqa: F405
LOGGING['root']['level'] = config('LOG_LEVEL', default='INFO')  # noqa: F405
