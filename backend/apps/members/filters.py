from datetime import date, timedelta

import django_filters

from .models import Socio


class SocioFilter(django_filters.FilterSet):
    fecha_alta_desde = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    fecha_alta_hasta = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')
    con_certificado = django_filters.BooleanFilter(method='filter_con_certificado')
    # #228 — filter by computed apto_estado
    apto_estado = django_filters.CharFilter(method='filter_apto_estado')

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
            return queryset.exclude(certificado_medico_path='').exclude(certificado_medico_url='')
        return queryset.filter(certificado_medico_path='', certificado_medico_url='')

    def filter_apto_estado(self, queryset, name, value):
        """Filter by computed apto_estado.

        Translates the logical state into DB-level conditions on
        certificado_medico_path, certificado_medico_url, and certificado_vence_en.
        """
        today = date.today()
        threshold = today + timedelta(days=30)

        if value == Socio.AptoEstado.SIN_APTO:
            return queryset.filter(certificado_medico_path='', certificado_medico_url='')

        # Has a cert file (either path or legacy url)
        has_cert = queryset.exclude(
            certificado_medico_path='',
        ) | queryset.exclude(certificado_medico_url='')
        # Distinct to avoid duplicates from the union
        has_cert = queryset.filter(
            # has some cert reference
        ).exclude(certificado_medico_path='', certificado_medico_url='')

        if value == Socio.AptoEstado.VIGENTE:
            return has_cert.filter(
                certificado_vence_en__isnull=False,
                certificado_vence_en__gt=threshold,
            )

        if value == Socio.AptoEstado.POR_VENCER:
            return has_cert.filter(
                certificado_vence_en__isnull=False,
                certificado_vence_en__gt=today,
                certificado_vence_en__lte=threshold,
            )

        if value == Socio.AptoEstado.VENCIDO:
            # Expired date OR has cert but no date set
            vencido_con_fecha = has_cert.filter(
                certificado_vence_en__isnull=False,
                certificado_vence_en__lte=today,
            )
            vencido_sin_fecha = has_cert.filter(certificado_vence_en__isnull=True)
            # Combine using pk__in to avoid complex union issues
            vencido_pks = set(
                vencido_con_fecha.values_list('pk', flat=True)
            ) | set(vencido_sin_fecha.values_list('pk', flat=True))
            return queryset.filter(pk__in=vencido_pks)

        return queryset
