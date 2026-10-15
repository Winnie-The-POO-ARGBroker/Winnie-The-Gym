"""Production settings hardened for Render + Supabase + Upstash + Atlas.

See docs/deploy.md for the full deploy plan and the env vars each service
expects. Anything opinionated is documented inline.
"""
from .base import *  # noqa: F401,F403


DEBUG = False

ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=lambda v: [s.strip() for s in v.split(',') if s.strip()])

# Render inyecta automáticamente RENDER_EXTERNAL_HOSTNAME con el hostname
# real del service en cada deploy. Si Render rota el sufijo del hostname
# (p.ej. 'winnie-backend-b4fv.onrender.com') la env ALLOWED_HOSTS del
# dashboard queda desactualizada y todo request responde 400 'Invalid
# HTTP_HOST'. Agregamos el hostname inyectado al vuelo para que el deploy
# nunca dependa de recordar actualizar la env var manualmente.
RENDER_EXTERNAL_HOSTNAME = config('RENDER_EXTERNAL_HOSTNAME', default=None)
if RENDER_EXTERNAL_HOSTNAME and RENDER_EXTERNAL_HOSTNAME not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

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
# Mismo auto-detect para CSRF: cualquier POST desde el admin de Django al
# propio hostname del service tiene que coincidir con un origin confiable.
if RENDER_EXTERNAL_HOSTNAME:
    csrf_render_origin = f'https://{RENDER_EXTERNAL_HOSTNAME}'
    if csrf_render_origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(csrf_render_origin)


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
# Django >= 5.1 removed DEFAULT_FILE_STORAGE: only STORAGES is honored, so the
# media backend has to be declared here. "staticfiles" keeps Django's default
# (WhiteNoise serves the collected files from the middleware).
STORAGES = {
    'default': {'BACKEND': 'apps.common.storages.SupabaseMediaStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
}

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

# Override the base MEDIA_URL ("/media/") with the Supabase public URL of the
# bucket so the Django setting reflects reality in production. Note:
# django-storages overrides `.url()` per-field through
# SupabaseMediaStorage.url(), so the actual signed/public URLs returned by
# file fields are always correct regardless of this setting. Setting
# MEDIA_URL truthfully here avoids misleading log output and any direct
# references to settings.MEDIA_URL in admin or third-party packages.
#
# Django requires MEDIA_URL to end with a slash (urls.E006) and the public base
# is documented without one, so the value is rebuilt with the same layout as
# SupabaseMediaStorage.url(): {base}/{bucket}/. Without a base the "/media/"
# default from base.py is kept.
_media_public_base = SUPABASE_STORAGE_PUBLIC_URL_BASE.rstrip('/')
if _media_public_base:
    MEDIA_URL = f'{_media_public_base}/{SUPABASE_STORAGE_BUCKET}/'


# ---------------------------------------------------------------------------
# Logging — force JSON in prod (dev may override with LOG_FORMAT=plain)
# ---------------------------------------------------------------------------
LOGGING['handlers']['console']['formatter'] = 'json'  # noqa: F405
LOGGING['root']['level'] = config('LOG_LEVEL', default='INFO')  # noqa: F405
