from django.apps import AppConfig


class AccessConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.access'

    def ready(self):
        # Wire the aforo broadcast signal so any new AccessLog pushes to the WS group.
        from . import ws_signals  # noqa: F401
