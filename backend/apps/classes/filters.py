import django_filters

from .models import Clase, InscripcionClase

class CharInFilter(django_filters.BaseInFilter, django_filters.CharFilter):
    pass

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

    dia = django_filters.CharFilter(method='filter_por_dia')
    dia__in = CharInFilter(method='filter_por_dias')

    class Meta:
        model = Clase
        fields = {
            'categoria': ['exact', 'in'],
            'estado': ['exact', 'in'],
            'sala': ['exact', 'icontains'],
            'instructor': ['exact', 'icontains'],
        }

    def filter_por_dia(self, queryset, name, value):
        from django.db.models import Q
        dias_map = {
            'lunes': 'L', 'martes': 'M', 'miercoles': 'X',
            'jueves': 'J', 'viernes': 'V', 'sabado': 'S', 'domingo': 'D'
        }
        key = dias_map.get(value.lower())
        if key:
            return queryset.filter(Q(dia=value) | Q(dias_recurrencia__contains=key))
        return queryset.filter(dia=value)

    def filter_por_dias(self, queryset, name, values):
        from django.db.models import Q
        dias_map = {
            'lunes': 'L', 'martes': 'M', 'miercoles': 'X',
            'jueves': 'J', 'viernes': 'V', 'sabado': 'S', 'domingo': 'D'
        }
        q_obj = Q()
        for value in values:
            key = dias_map.get(value.lower())
            if key:
                q_obj |= Q(dia=value) | Q(dias_recurrencia__contains=key)
            else:
                q_obj |= Q(dia=value)
        return queryset.filter(q_obj)

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
