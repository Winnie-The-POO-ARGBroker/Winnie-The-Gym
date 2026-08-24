from .base import *

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
