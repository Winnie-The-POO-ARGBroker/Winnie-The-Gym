import os

from celery import Celery


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.development')

app = Celery('winnie_the_gym')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
