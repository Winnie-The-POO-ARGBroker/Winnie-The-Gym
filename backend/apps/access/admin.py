from django.contrib import admin
from .models import AccessLog


@admin.register(AccessLog)
class AccessLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'access_type', 'status', 'denial_reason', 'scanned_by')
    list_filter = ('status', 'access_type', 'denial_reason', 'timestamp')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'qr_jti')
    readonly_fields = ('timestamp', 'user', 'access_type', 'status', 'denial_reason', 'qr_jti', 'scanned_by')
    date_hierarchy = 'timestamp'
