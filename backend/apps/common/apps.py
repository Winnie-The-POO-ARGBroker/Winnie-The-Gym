from django.apps import AppConfig


class CommonConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.common'
    label = 'common'

    def ready(self):
        # Wire up signal receivers on app boot.
        from . import signals  # noqa: F401
        from .audit import register_audit_signals

        register_audit_signals()
