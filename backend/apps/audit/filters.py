import django_filters

from .models import AuditLog


class AuditLogFilter(django_filters.FilterSet):
    actor_id = django_filters.NumberFilter(field_name='actor__id')
    entity_type = django_filters.CharFilter(field_name='entity_type', lookup_expr='iexact')
    date_from = django_filters.DateTimeFilter(field_name='timestamp', lookup_expr='gte')
    date_to = django_filters.DateTimeFilter(field_name='timestamp', lookup_expr='lte')

    class Meta:
        model = AuditLog
        fields = ['actor_id', 'entity_type', 'date_from', 'date_to']
