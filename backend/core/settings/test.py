from .development import *

# Django test client uses HTTP_HOST='testserver' by default; keep the ngrok
# wildcards inherited from development so infra hardening tests still pass.
ALLOWED_HOSTS = ALLOWED_HOSTS + ['testserver']

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Run Celery tasks synchronously during tests so we can assert their side effects.
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Isolated Mongo db for tests so we never pollute dev data. Same instance,
# different logical database. Tests are responsible for clean-up in setUp/tearDown.
MONGODB = {
    'URI': MONGODB['URI'],
    'DB_NAME': 'winnie_gym_logs_test',
}
