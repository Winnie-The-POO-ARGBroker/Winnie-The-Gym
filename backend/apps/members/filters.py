import django_filters

from .models import Socio


class SocioFilter(django_filters.FilterSet):
    fecha_alta_desde = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    fecha_alta_hasta = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')
    con_certificado = django_filters.BooleanFilter(method='filter_con_certificado')

    class Meta:
        model = Socio
        fields = {
            'estado': ['exact', 'in'],
            'dni': ['exact', 'icontains'],
            'numero_socio': ['exact', 'icontains'],
        }

    def filter_con_certificado(self, queryset, name, value):
        if value is None:
            return queryset
        if value:
            return queryset.exclude(certificado_medico_url='')
        return queryset.filter(certificado_medico_url='')
