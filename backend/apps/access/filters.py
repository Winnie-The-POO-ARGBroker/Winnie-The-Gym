import django_filters

from .models import AccessLog


class AccessLogFilter(django_filters.FilterSet):
    fecha_desde = django_filters.DateFilter(field_name='timestamp', lookup_expr='date__gte')
    fecha_hasta = django_filters.DateFilter(field_name='timestamp', lookup_expr='date__lte')

    class Meta:
        model = AccessLog
        fields = {
            'access_type': ['exact', 'in'],
            'status': ['exact', 'in'],
            'denial_reason': ['exact'],
            'user': ['exact'],
            'scanned_by': ['exact'],
        }
