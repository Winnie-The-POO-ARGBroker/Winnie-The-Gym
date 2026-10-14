from django.contrib import admin
from .models import AccessLog


@admin.register(AccessLog)
class AccessLogAdmin(admin.ModelAdmin):
    """#159 — Access logs are immutable audit records. Delete and change are disabled."""

    list_display = ('timestamp', 'user', 'access_type', 'status', 'denial_reason', 'scanned_by', 'source')
    list_filter = ('status', 'access_type', 'denial_reason', 'source', 'timestamp')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'qr_jti')
    readonly_fields = (
        'timestamp', 'user', 'access_type', 'status', 'denial_reason',
        'qr_jti', 'scanned_by', 'source', 'operator', 'motivo',
    )
    date_hierarchy = 'timestamp'

    def has_delete_permission(self, request, obj=None):
        """Immutable audit log — delete is never permitted."""
        return False

    def has_change_permission(self, request, obj=None):
        """Immutable audit log — change is never permitted."""
        return False
