from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'actor', 'action', 'entity_type', 'entity_id')
    list_filter = ('action', 'entity_type')
    search_fields = ('actor__email', 'entity_type')
    readonly_fields = ('actor', 'timestamp', 'action', 'entity_type', 'entity_id', 'changes_json')
    ordering = ('-timestamp',)
