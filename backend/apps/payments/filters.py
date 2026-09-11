import django_filters

from .models import Pago


class PagoFilter(django_filters.FilterSet):
    fecha_desde = django_filters.DateFilter(field_name='created_at', lookup_expr='date__gte')
    fecha_hasta = django_filters.DateFilter(field_name='created_at', lookup_expr='date__lte')
    monto_min = django_filters.NumberFilter(field_name='monto', lookup_expr='gte')
    monto_max = django_filters.NumberFilter(field_name='monto', lookup_expr='lte')

    class Meta:
        model = Pago
        fields = {
            'estado': ['exact', 'in'],
            'metodo': ['exact', 'in'],
            'socio': ['exact'],
            'plan': ['exact'],
        }
