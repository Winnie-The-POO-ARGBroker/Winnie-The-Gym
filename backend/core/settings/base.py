import logging
from datetime import timedelta
from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config('SECRET_KEY')

INSTALLED_APPS = [
    # `daphne` must come first so it overrides Django's default runserver with
    # an ASGI-capable one that speaks HTTP + WebSocket. Without this, `runserver`
    # falls back to WSGI and every ws:// request answers 404.
    'daphne',
    'channels',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    # Third party
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'django_celery_beat',
    'anymail',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'dj_rest_auth',
    'dj_rest_auth.registration',
    # Apps
    'apps.common',
    'apps.users',
    'apps.members',
    'apps.memberships',
    'apps.classes',
    'apps.access',
    'apps.payments',
    'apps.reports',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    # Must come AFTER AuthenticationMiddleware so request.user is populated
    # before we stash it in thread-local for the audit trail.
    'apps.common.middleware.CurrentUserMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'es-ar'
TIME_ZONE = 'America/Argentina/Buenos_Aires'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

SITE_ID = 1

# ---------------------------------------------------------------------------
# Structured JSON logging
# ---------------------------------------------------------------------------
# All log lines are emitted as single-line JSON so they can be shipped to
# Loki/Datadog/CloudWatch without a parser. Toggle with LOG_FORMAT=plain.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s %(pathname)s %(lineno)d',
            'rename_fields': {'asctime': 'timestamp', 'levelname': 'level'},
        },
        'plain': {
            'format': '[{asctime}] {levelname} {name}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': config('LOG_FORMAT', default='json'),
        },
    },
    'root': {
        'handlers': ['console'],
        'level': config('LOG_LEVEL', default='INFO'),
    },
    'loggers': {
        # Silence Django's unstructured request access log but keep errors.
        'django.server': {'handlers': ['console'], 'level': 'WARNING', 'propagate': False},
    },
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Winnie The Gym API',
    'DESCRIPTION': (
        'API RESTful para la gestión integral de gimnasios: socios, membresías, '
        'clases, control de accesos con QR, pagos con MercadoPago y reportes.'
    ),
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SWAGGER_UI_SETTINGS': {
        'persistAuthorization': True,
        'displayOperationId': False,
    },
    'ENUM_GENERATE_CHOICE_DESCRIPTION': False,
    'TAGS': [
        {'name': 'auth', 'description': 'Autenticación local, Google OAuth y recupero de contraseña.'},
        {'name': 'users', 'description': 'Gestión de usuarios de la plataforma (admin, recep, socio).'},
        {'name': 'members', 'description': 'ABM de socios y carga de certificado médico (RF08).'},
        {'name': 'memberships', 'description': 'Planes de membresía y suscripciones de socios.'},
        {'name': 'classes', 'description': 'Clases grupales, cupos, reservas y cancelaciones (HU06, HU07).'},
        {'name': 'access', 'description': 'Validación de acceso por QR, historial y monitor de aforo.'},
        {'name': 'payments', 'description': 'Integración con MercadoPago Checkout Pro y cobros manuales.'},
        {'name': 'reports', 'description': 'Reportes exportables en CSV/PDF/XLSX.'},
        {'name': 'health', 'description': 'Endpoints de infraestructura.'},
    ],
}

SIMPLE_JWT = {
    # RNF05 — Auto-invalidate admin/recepcionista sessions after 30 minutes of inactivity.
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

REST_AUTH = {
    'USE_JWT': True,
    'JWT_AUTH_HTTPONLY': False,
    'USER_DETAILS_SERIALIZER': 'apps.users.serializers.UserDetailsSerializer',
    'JWT_SERIALIZER': 'apps.users.serializers.CustomJWTSerializer',
}

AUTH_USER_MODEL = 'users.User'

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
        'APP': {
            'client_id': config('GOOGLE_CLIENT_ID'),
            'secret': config('GOOGLE_CLIENT_SECRET'),
            'key': '',
        },
    }
}

ACCOUNT_EMAIL_VERIFICATION = 'none'
ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_UNIQUE_EMAIL = True
SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT = True
ACCOUNT_USERNAME_REQUIRED = False

EMAIL_BACKEND = config(
    'EMAIL_BACKEND',
    default='anymail.backends.mailtrap.EmailBackend',
)
# Legacy SMTP config kept as a fallback provider (e.g. Gmail) when
# EMAIL_BACKEND is switched to django.core.mail.backends.smtp.EmailBackend.
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', cast=int, default=587)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', cast=bool, default=True)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config(
    'DEFAULT_FROM_EMAIL',
    default='Winnie The Gym <hello@demomailtrap.co>',
)
EMAIL_REPLY_TO = config('EMAIL_REPLY_TO', default='')
EMAIL_TIMEOUT = 5

ANYMAIL = {
    'MAILTRAP_API_TOKEN': config('MAILTRAP_API_TOKEN', default=''),
}

FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')

# ---------------------------------------------------------------------------
# Celery
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# MercadoPago
# ---------------------------------------------------------------------------
MP_ACCESS_TOKEN = config('MP_ACCESS_TOKEN', default='')
MP_PUBLIC_KEY = config('MP_PUBLIC_KEY', default='')
MP_WEBHOOK_SECRET = config('MP_WEBHOOK_SECRET', default='')
MP_APP_ID = config('MP_APP_ID', default='')
MP_NGROK_URL = config('MP_NGROK_URL', default='')

# ---------------------------------------------------------------------------
# Redis — shared by Cache, Channel Layer and Celery. Uses a single REDIS_URL
# so managed providers with TLS+auth (Upstash, Redis Cloud) work with the
# same code path as local docker-compose (redis:// without password).
# ---------------------------------------------------------------------------
_REDIS_URL = config('REDIS_URL', default='')
if not _REDIS_URL:
    _redis_host = config('REDIS_HOST', default='redis')
    _redis_port = config('REDIS_PORT', default=6379, cast=int)
    _REDIS_URL = f'redis://{_redis_host}:{_redis_port}'
_REDIS_URL = _REDIS_URL.rstrip('/')


def _normalize_rediss(url):
    """Celery/redis-py refuse `rediss://` URLs that do not declare
    `ssl_cert_reqs`. Managed providers like Upstash publish the URL without
    it, so we add the safe default (CERT_REQUIRED — validate server cert)
    when it is missing. Non-TLS `redis://` URLs pass through unchanged.
    """
    if not url or not url.startswith('rediss://'):
        return url
    if 'ssl_cert_reqs=' in url:
        return url
    sep = '&' if '?' in url else '?'
    return f'{url}{sep}ssl_cert_reqs=CERT_REQUIRED'


# NOTE: `_REDIS_URL` stays without ssl_cert_reqs so the DB number (/1, /2...)
# can be appended before the query string. `_normalize_rediss` is applied to
# each derived URL after the /N is concatenated.

CELERY_BROKER_URL = _normalize_rediss(config('CELERY_BROKER_URL', default=f'{_REDIS_URL}/0'))
CELERY_RESULT_BACKEND = _normalize_rediss(config('CELERY_RESULT_BACKEND', default=f'{_REDIS_URL}/3'))

# Celery discards the URL query string when parsing rediss:// so passing
# `?ssl_cert_reqs=CERT_REQUIRED` in the URL is not enough. The canonical way
# is to declare the SSL options as dicts. Kombu (broker) and celery.backends
# .redis (result backend) each have their own setting.
if CELERY_BROKER_URL.startswith('rediss://'):
    import ssl as _ssl
    CELERY_BROKER_USE_SSL = {'ssl_cert_reqs': _ssl.CERT_REQUIRED}
    CELERY_REDIS_BACKEND_USE_SSL = {'ssl_cert_reqs': _ssl.CERT_REQUIRED}

CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TIME_LIMIT = 60
CELERY_TASK_SOFT_TIME_LIMIT = 45
CELERY_TASK_ALWAYS_EAGER = config('CELERY_TASK_ALWAYS_EAGER', cast=bool, default=False)
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

from django.core.exceptions import ImproperlyConfigured

QR_SECRET_KEY = config('QR_SECRET_KEY', default=None)
if not QR_SECRET_KEY:
    raise ImproperlyConfigured(
        "QR_SECRET_KEY is required. Set it in your .env file. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )
if len(QR_SECRET_KEY) < 32:
    raise ImproperlyConfigured(
        f"QR_SECRET_KEY must be at least 32 characters. Got {len(QR_SECRET_KEY)}."
    )
QR_TOKEN_EXPIRATION_SECONDS = config('QR_TOKEN_EXPIRATION_SECONDS', cast=int, default=30)

# Django's built-in RedisCache uses redis-py directly. redis-py rejects
# `?ssl_cert_reqs=CERT_REQUIRED` (Celery-style) as an "Invalid SSL
# Certificate Requirements Flag" — it only understands lowercase
# `none|optional|required`. Instead of normalising the URL, we pass the
# right SSL kwargs via OPTIONS.CONNECTION_POOL_KWARGS when the URL is TLS.
_CACHE_URL = f'{_REDIS_URL}/1'
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': _CACHE_URL,
    }
}
if _CACHE_URL.startswith('rediss://'):
    import ssl as _ssl
    CACHES['default']['OPTIONS'] = {
        'CONNECTION_POOL_KWARGS': {'ssl_cert_reqs': _ssl.CERT_REQUIRED},
    }

MONGODB = {
    'URI': config('MONGO_URI', default='mongodb://localhost:27017/'),
    'DB_NAME': config('MONGO_DB_NAME', default='winnie_gym_logs'),
}
MONGO_RETENTION_DAYS = config('MONGO_RETENTION_DAYS', cast=int, default=90)

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        # `channels_redis` 4.x accepts a URL string here (unlike the tuple form
        # that does not support auth/TLS). Dev Docker uses plain `redis://`;
        # Upstash / Redis Cloud use `rediss://default:<token>@...`. The client
        # (redis.asyncio) handles TLS automatically from the `rediss` scheme,
        # no `?ssl_cert_reqs=` query needed (unlike Celery).
        'CONFIG': {'hosts': [f'{_REDIS_URL}/2']},
    },
}

ASGI_APPLICATION = 'core.asgi.application'


# ---------------------------------------------------------------------------
# Sentry (opt-in via env)
# ---------------------------------------------------------------------------
SENTRY_DSN = config('SENTRY_DSN', default='')
SENTRY_ENVIRONMENT = config('SENTRY_ENVIRONMENT', default='development')
SENTRY_TRACES_SAMPLE_RATE = config('SENTRY_TRACES_SAMPLE_RATE', cast=float, default=0.0)

if SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.celery import CeleryIntegration
        from sentry_sdk.integrations.django import DjangoIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration

        sentry_sdk.init(
            dsn=SENTRY_DSN,
            environment=SENTRY_ENVIRONMENT,
            integrations=[
                DjangoIntegration(),
                CeleryIntegration(),
                LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
            ],
            traces_sample_rate=SENTRY_TRACES_SAMPLE_RATE,
            send_default_pii=False,
        )
    except ImportError:
        # sentry-sdk missing at import time is a valid dev state; skip silently.
        pass


