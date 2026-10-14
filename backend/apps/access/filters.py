import django_filters
from django.db.models import Q

from .models import AccessLog


class AccessLogFilter(django_filters.FilterSet):
    fecha_desde = django_filters.DateFilter(field_name='timestamp', lookup_expr='date__gte')
    fecha_hasta = django_filters.DateFilter(field_name='timestamp', lookup_expr='date__lte')

    # #150 — search by DNI, nombre, or apellido (via related Socio)
    search = django_filters.CharFilter(method='filter_search')

    # #150 — filter by Socio pk (separate from user FK for convenience)
    socio = django_filters.NumberFilter(method='filter_socio')

    # #150 — optional hour-range filter (24h format, inclusive)
    hora_desde = django_filters.TimeFilter(field_name='timestamp', lookup_expr='time__gte')
    hora_hasta = django_filters.TimeFilter(field_name='timestamp', lookup_expr='time__lte')

    def filter_search(self, queryset, name, value):  # noqa: ARG002
        """Search across Socio DNI, nombre, and apellido."""
        return queryset.filter(
            Q(user__socio__dni__icontains=value)
            | Q(user__socio__nombre__icontains=value)
            | Q(user__socio__apellido__icontains=value)
        )

    def filter_socio(self, queryset, name, value):  # noqa: ARG002
        """Filter by Socio pk (user__socio__pk)."""
        return queryset.filter(user__socio__pk=value)

    class Meta:
        model = AccessLog
        fields = {
            'access_type': ['exact', 'in'],
            'status': ['exact', 'in'],
            'denial_reason': ['exact'],
            'user': ['exact'],
            'scanned_by': ['exact'],
        }
