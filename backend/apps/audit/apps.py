from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.audit'
    verbose_name = 'Audit'

    def ready(self):
        # Import signals module to register handlers when app is ready.
        import apps.audit.signals  # noqa: F401
