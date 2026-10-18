import django_filters

from .models import Membresia, PlanMembresia
from .selectors import ultimas_membresias


class PlanMembresiaFilter(django_filters.FilterSet):
    precio_min = django_filters.NumberFilter(field_name='precio', lookup_expr='gte')
    precio_max = django_filters.NumberFilter(field_name='precio', lookup_expr='lte')

    class Meta:
        model = PlanMembresia
        fields = {
            'activo': ['exact'],
            'duracion_dias': ['exact', 'gte', 'lte'],
        }


class MembresiaFilter(django_filters.FilterSet):
    vence_desde = django_filters.DateFilter(field_name='fecha_fin', lookup_expr='gte')
    vence_hasta = django_filters.DateFilter(field_name='fecha_fin', lookup_expr='lte')
    inicio_desde = django_filters.DateFilter(field_name='fecha_inicio', lookup_expr='gte')
    inicio_hasta = django_filters.DateFilter(field_name='fecha_inicio', lookup_expr='lte')
    ultima = django_filters.BooleanFilter(
        method='filter_ultima',
        help_text='true: solo la última membresía de cada socio (la de mayor fecha_fin).',
    )

    def filter_ultima(self, queryset, name, value):
        # "Latest" is resolved over all of the socio's rows, independent of the
        # other filters, so ?estado=vencida&ultima=true means "latest AND vencida".
        return ultimas_membresias(queryset) if value else queryset

    class Meta:
        model = Membresia
        fields = {
            'estado': ['exact', 'in'],
            'socio': ['exact'],
            'plan': ['exact'],
        }
