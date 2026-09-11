import django_filters

from .models import Clase, InscripcionClase


class ClaseFilter(django_filters.FilterSet):
    """Advanced multi-criteria filter for classes (HU06).

    Combines exact filters (category, day, status), free-text search on the
    ViewSet's SearchFilter and time-range filters on the class schedule.
    """

    hora_desde = django_filters.TimeFilter(field_name='hora', lookup_expr='gte')
    hora_hasta = django_filters.TimeFilter(field_name='hora', lookup_expr='lte')
    duracion_min_gte = django_filters.NumberFilter(field_name='duracion_min', lookup_expr='gte')
    duracion_min_lte = django_filters.NumberFilter(field_name='duracion_min', lookup_expr='lte')
    cupo_disponible = django_filters.BooleanFilter(method='filter_cupo_disponible')

    class Meta:
        model = Clase
        fields = {
            'categoria': ['exact', 'in'],
            'dia': ['exact', 'in'],
            'estado': ['exact', 'in'],
            'sala': ['exact', 'icontains'],
            'instructor': ['exact', 'icontains'],
        }

    def filter_cupo_disponible(self, queryset, name, value):
        if value is None:
            return queryset
        with_free_slot_ids = [
            c.id for c in queryset
            if c.inscripciones.filter(en_espera=False).count() < c.cupo_maximo
        ]
        if value:
            return queryset.filter(id__in=with_free_slot_ids)
        return queryset.exclude(id__in=with_free_slot_ids)


class InscripcionClaseFilter(django_filters.FilterSet):
    fecha_desde = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    fecha_hasta = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')

    class Meta:
        model = InscripcionClase
        fields = {
            'clase': ['exact'],
            'socio': ['exact'],
            'en_espera': ['exact'],
            'asistio': ['exact'],
        }
