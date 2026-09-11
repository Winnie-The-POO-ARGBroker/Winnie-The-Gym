from datetime import timedelta
from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config('SECRET_KEY')

INSTALLED_APPS = [
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
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'dj_rest_auth',
    'dj_rest_auth.registration',
    # Apps
    'apps.users',
    'apps.members',
    'apps.memberships',
    'apps.classes',
    'apps.access',
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

EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', cast=int, default=587)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', cast=bool, default=True)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='Winnie Gym <noreply@winniegym.com>')
EMAIL_TIMEOUT = 5

FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')

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

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': f"redis://{config('REDIS_HOST', default='redis')}:{config('REDIS_PORT', default=6379, cast=int)}/1",
    }
}

MONGODB = {
    'URI': config('MONGO_URI', default='mongodb://localhost:27017/'),
    'DB_NAME': config('MONGO_DB_NAME', default='winnie_gym_logs'),
}

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [(config('REDIS_HOST', default='localhost'), config('REDIS_PORT', default=6379, cast=int))],
        },
    },
}

ASGI_APPLICATION = 'core.asgi.application'


