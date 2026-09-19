from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework.views import APIView

from apps.access.permissions import IsReceptionistOrAdmin

from .exporters import export
from .services import build_asistencia, build_facturacion, build_morosidad


FORMAT_PARAMETER = OpenApiParameter(
    'formato',
    OpenApiTypes.STR,
    OpenApiParameter.QUERY,
    enum=['csv', 'xlsx', 'pdf'],
    description='Formato de exportación (csv, xlsx o pdf). Default csv.',
)


class MorosidadReportView(APIView):
    permission_classes = [IsReceptionistOrAdmin]

    @extend_schema(
        tags=['reports'],
        summary='Reporte de socios en mora',
        description='Lista socios con membresías vencidas o en `pendiente_pago`. Respeta filtros por estado y plan.',
        parameters=[
            FORMAT_PARAMETER,
            OpenApiParameter('estado', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, enum=['vencida', 'pendiente_pago']),
            OpenApiParameter('plan_id', OpenApiTypes.INT, OpenApiParameter.QUERY, required=False),
        ],
        responses={200: OpenApiTypes.BINARY},
    )
    def get(self, request):
        fmt = request.query_params.get('formato', 'csv')
        estado = request.query_params.get('estado')
        plan_id = request.query_params.get('plan_id')

        headers, rows = build_morosidad(estado=estado, plan_id=plan_id)
        return export(fmt, slug='morosidad', title='Reporte de Morosidad', headers=headers, rows=rows)


class FacturacionReportView(APIView):
    permission_classes = [IsReceptionistOrAdmin]

    @extend_schema(
        tags=['reports'],
        summary='Reporte de facturación mensual',
        description='Pagos aprobados del mes indicado (YYYY-MM). Default: mes actual.',
        parameters=[
            FORMAT_PARAMETER,
            OpenApiParameter('mes', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='YYYY-MM'),
            OpenApiParameter('metodo', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, enum=['mercado_pago', 'manual']),
        ],
        responses={200: OpenApiTypes.BINARY},
    )
    def get(self, request):
        fmt = request.query_params.get('formato', 'csv')
        mes = request.query_params.get('mes')
        metodo = request.query_params.get('metodo')

        headers, rows = build_facturacion(mes=mes, metodo=metodo)
        slug = f'facturacion_{mes}' if mes else 'facturacion'
        return export(fmt, slug=slug, title='Facturación mensual', headers=headers, rows=rows)


class AsistenciaReportView(APIView):
    permission_classes = [IsReceptionistOrAdmin]

    @extend_schema(
        tags=['reports'],
        summary='Reporte de asistencias',
        description='Ingresos por QR con su egreso correspondiente y permanencia calculada. Filtra por rango de fechas.',
        parameters=[
            FORMAT_PARAMETER,
            OpenApiParameter('fecha_desde', OpenApiTypes.DATE, OpenApiParameter.QUERY, required=False),
            OpenApiParameter('fecha_hasta', OpenApiTypes.DATE, OpenApiParameter.QUERY, required=False),
        ],
        responses={200: OpenApiTypes.BINARY},
    )
    def get(self, request):
        fmt = request.query_params.get('formato', 'csv')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')

        headers, rows = build_asistencia(fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)
        return export(fmt, slug='asistencia', title='Reporte de Asistencia', headers=headers, rows=rows)


