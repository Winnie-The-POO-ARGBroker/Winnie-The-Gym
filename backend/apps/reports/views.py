import re

from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.access.permissions import IsReceptionistOrAdmin

from .exporters import export
from .services import (
    build_asistencia,
    build_asistencia_clases,
    build_facturacion,
    build_morosidad,
    build_no_shows,
    build_ocupacion_clases,
    build_resumen,
)


# ---------------------------------------------------------------------------
# Validation helpers (#184)
# ---------------------------------------------------------------------------

VALID_FORMATOS = {'csv', 'xlsx', 'pdf'}
MES_RE = re.compile(r'^\d{4}-(0[1-9]|1[0-2])$')
DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def _validate_formato(fmt):
    """Return None if valid, or an error message string."""
    if fmt and fmt not in VALID_FORMATOS:
        return f"Formato inválido '{fmt}'. Valores permitidos: {', '.join(sorted(VALID_FORMATOS))}."
    return None


def _validate_mes(mes):
    if mes and not MES_RE.match(mes):
        return f"El parámetro 'mes' debe tener formato YYYY-MM (por ejemplo: 2024-03). Recibido: '{mes}'."
    return None


def _validate_date(value, param_name):
    if value and not DATE_RE.match(value):
        return f"El parámetro '{param_name}' debe tener formato YYYY-MM-DD. Recibido: '{value}'."
    return None


def _validate_plan_id(plan_id):
    if plan_id is not None:
        try:
            int(plan_id)
        except (ValueError, TypeError):
            return f"El parámetro 'plan_id' debe ser un entero. Recibido: '{plan_id}'."
    return None


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------

class ReportesResumenView(APIView):
    """Server-side dashboard summary (fix #183 — never truncated)."""
    permission_classes = [IsReceptionistOrAdmin]

    @extend_schema(
        tags=['reports'],
        summary='Resumen del dashboard (ingresos, morosos, membresías, asistencia)',
        description=(
            'Calcula los KPIs del dashboard server-side. Acepta `mes=YYYY-MM` '
            'y `plan_id` como filtros opcionales.'
        ),
        parameters=[
            OpenApiParameter('mes', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='YYYY-MM'),
            OpenApiParameter('plan_id', OpenApiTypes.INT, OpenApiParameter.QUERY, required=False),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        mes = request.query_params.get('mes')
        plan_id = request.query_params.get('plan_id')
        data = build_resumen(mes=mes, plan_id=plan_id)
        return Response(data)


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
        description='Lista socios con membresías vencidas. Respeta filtros por estado y plan.',
        parameters=[
            FORMAT_PARAMETER,
            OpenApiParameter('estado', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, enum=['vencida', 'pendiente_pago']),
            OpenApiParameter('plan_id', OpenApiTypes.INT, OpenApiParameter.QUERY, required=False),
        ],
        responses={200: OpenApiTypes.BINARY, 400: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        fmt = request.query_params.get('formato', 'csv')
        estado = request.query_params.get('estado')
        plan_id = request.query_params.get('plan_id')

        # #184: validate params
        errors = {}
        err = _validate_formato(fmt)
        if err:
            errors['formato'] = err
        err = _validate_plan_id(plan_id)
        if err:
            errors['plan_id'] = err
        if errors:
            return Response({'detail': 'Parámetros inválidos.', 'errors': errors},
                            status=status.HTTP_400_BAD_REQUEST)

        headers, rows = build_morosidad(estado=estado, plan_id=plan_id)
        return export(fmt, slug='morosidad', title='Reporte de Morosidad', headers=headers, rows=rows)


class FacturacionReportView(APIView):
    permission_classes = [IsReceptionistOrAdmin]

    @extend_schema(
        tags=['reports'],
        summary='Reporte de facturación',
        description=(
            'Pagos aprobados filtrados por rango (`fecha_desde`/`fecha_hasta`) o mes (`YYYY-MM`). '
            'Si se envían rango y mes, el rango tiene prioridad. '
            'Filtra por `plan_id` y `metodo`. Default: mes actual.'
        ),
        parameters=[
            FORMAT_PARAMETER,
            OpenApiParameter('mes', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='YYYY-MM'),
            OpenApiParameter('fecha_desde', OpenApiTypes.DATE, OpenApiParameter.QUERY, required=False),
            OpenApiParameter('fecha_hasta', OpenApiTypes.DATE, OpenApiParameter.QUERY, required=False),
            OpenApiParameter('plan_id', OpenApiTypes.INT, OpenApiParameter.QUERY, required=False),
            OpenApiParameter('metodo', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, enum=['mercado_pago', 'manual']),
            OpenApiParameter('estado', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, enum=['aprobado', 'pendiente', 'rechazado']),
        ],
        responses={200: OpenApiTypes.BINARY, 400: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        fmt = request.query_params.get('formato', 'csv')
        mes = request.query_params.get('mes')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        plan_id = request.query_params.get('plan_id')
        metodo = request.query_params.get('metodo')
        estado_filter = request.query_params.get('estado', 'aprobado')

        # #184: validate params
        errors = {}
        err = _validate_formato(fmt)
        if err:
            errors['formato'] = err
        err = _validate_mes(mes)
        if err:
            errors['mes'] = err
        err = _validate_date(fecha_desde, 'fecha_desde')
        if err:
            errors['fecha_desde'] = err
        err = _validate_date(fecha_hasta, 'fecha_hasta')
        if err:
            errors['fecha_hasta'] = err
        err = _validate_plan_id(plan_id)
        if err:
            errors['plan_id'] = err
        if errors:
            return Response({'detail': 'Parámetros inválidos.', 'errors': errors},
                            status=status.HTTP_400_BAD_REQUEST)

        headers, rows = build_facturacion(
            mes=mes,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            plan_id=plan_id,
            metodo=metodo,
            estado=estado_filter,
        )
        # Build a descriptive slug
        if fecha_desde or fecha_hasta:
            slug = f'facturacion_{fecha_desde or "inicio"}_{fecha_hasta or "hoy"}'
        elif mes:
            slug = f'facturacion_{mes}'
        else:
            slug = 'facturacion'

        return export(fmt, slug=slug, title='Facturación', headers=headers, rows=rows)


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
        responses={200: OpenApiTypes.BINARY, 400: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        fmt = request.query_params.get('formato', 'csv')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')

        # #184: validate params
        errors = {}
        err = _validate_formato(fmt)
        if err:
            errors['formato'] = err
        err = _validate_date(fecha_desde, 'fecha_desde')
        if err:
            errors['fecha_desde'] = err
        err = _validate_date(fecha_hasta, 'fecha_hasta')
        if err:
            errors['fecha_hasta'] = err
        if errors:
            return Response({'detail': 'Parámetros inválidos.', 'errors': errors},
                            status=status.HTTP_400_BAD_REQUEST)

        headers, rows = build_asistencia(fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)
        return export(fmt, slug='asistencia', title='Reporte de Asistencia', headers=headers, rows=rows)


# ---------------------------------------------------------------------------
# #181 — Reportes de clases
# ---------------------------------------------------------------------------

class OcupacionClasesView(APIView):
    """GET /api/reports/clases/ocupacion/ — Class occupation fill rate."""
    permission_classes = [IsReceptionistOrAdmin]

    @extend_schema(
        tags=['reports'],
        summary='Reporte de ocupación de clases',
        description='Tasa de ocupación por clase: cupo máximo vs. inscriptos confirmados.',
        parameters=[
            FORMAT_PARAMETER,
            OpenApiParameter('fecha_desde', OpenApiTypes.DATE, OpenApiParameter.QUERY, required=False),
            OpenApiParameter('fecha_hasta', OpenApiTypes.DATE, OpenApiParameter.QUERY, required=False),
            OpenApiParameter('instructor', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
            OpenApiParameter('disciplina', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
        ],
        responses={200: OpenApiTypes.BINARY, 400: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        fmt = request.query_params.get('formato', 'csv')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        instructor = request.query_params.get('instructor')
        disciplina = request.query_params.get('disciplina')

        errors = {}
        err = _validate_formato(fmt)
        if err:
            errors['formato'] = err
        err = _validate_date(fecha_desde, 'fecha_desde')
        if err:
            errors['fecha_desde'] = err
        err = _validate_date(fecha_hasta, 'fecha_hasta')
        if err:
            errors['fecha_hasta'] = err
        if errors:
            return Response({'detail': 'Parámetros inválidos.', 'errors': errors},
                            status=status.HTTP_400_BAD_REQUEST)

        headers, rows = build_ocupacion_clases(
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            instructor=instructor,
            disciplina=disciplina,
        )
        return export(fmt, slug='ocupacion_clases', title='Ocupación de Clases', headers=headers, rows=rows)


class AsistenciaClasesView(APIView):
    """GET /api/reports/clases/asistencia/ — Class attendance (present/absent/unmarked)."""
    permission_classes = [IsReceptionistOrAdmin]

    @extend_schema(
        tags=['reports'],
        summary='Reporte de asistencia a clases',
        description='Presentes, ausentes y sin marcar por clase.',
        parameters=[
            FORMAT_PARAMETER,
            OpenApiParameter('fecha_desde', OpenApiTypes.DATE, OpenApiParameter.QUERY, required=False),
            OpenApiParameter('fecha_hasta', OpenApiTypes.DATE, OpenApiParameter.QUERY, required=False),
            OpenApiParameter('instructor', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
        ],
        responses={200: OpenApiTypes.BINARY, 400: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        fmt = request.query_params.get('formato', 'csv')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        instructor = request.query_params.get('instructor')

        errors = {}
        err = _validate_formato(fmt)
        if err:
            errors['formato'] = err
        err = _validate_date(fecha_desde, 'fecha_desde')
        if err:
            errors['fecha_desde'] = err
        err = _validate_date(fecha_hasta, 'fecha_hasta')
        if err:
            errors['fecha_hasta'] = err
        if errors:
            return Response({'detail': 'Parámetros inválidos.', 'errors': errors},
                            status=status.HTTP_400_BAD_REQUEST)

        headers, rows = build_asistencia_clases(
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            instructor=instructor,
        )
        return export(fmt, slug='asistencia_clases', title='Asistencia a Clases', headers=headers, rows=rows)


class NoShowsClasesView(APIView):
    """GET /api/reports/clases/no_shows/ — Socios with repeated absences."""
    permission_classes = [IsReceptionistOrAdmin]

    @extend_schema(
        tags=['reports'],
        summary='Reporte de no-shows en clases',
        description='Socios con ausencias repetidas en la ventana configurada.',
        parameters=[
            FORMAT_PARAMETER,
            OpenApiParameter('fecha_desde', OpenApiTypes.DATE, OpenApiParameter.QUERY, required=False),
            OpenApiParameter('fecha_hasta', OpenApiTypes.DATE, OpenApiParameter.QUERY, required=False),
            OpenApiParameter('ventana_dias', OpenApiTypes.INT, OpenApiParameter.QUERY, required=False,
                             description='Días de ventana (default 30)'),
            OpenApiParameter('min_ausencias', OpenApiTypes.INT, OpenApiParameter.QUERY, required=False,
                             description='Mínimo de ausencias para aparecer en reporte (default 3)'),
        ],
        responses={200: OpenApiTypes.BINARY, 400: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        fmt = request.query_params.get('formato', 'csv')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')

        try:
            ventana_dias = int(request.query_params.get('ventana_dias', 30))
        except (ValueError, TypeError):
            ventana_dias = 30

        try:
            min_ausencias = int(request.query_params.get('min_ausencias', 3))
        except (ValueError, TypeError):
            min_ausencias = 3

        errors = {}
        err = _validate_formato(fmt)
        if err:
            errors['formato'] = err
        err = _validate_date(fecha_desde, 'fecha_desde')
        if err:
            errors['fecha_desde'] = err
        err = _validate_date(fecha_hasta, 'fecha_hasta')
        if err:
            errors['fecha_hasta'] = err
        if errors:
            return Response({'detail': 'Parámetros inválidos.', 'errors': errors},
                            status=status.HTTP_400_BAD_REQUEST)

        headers, rows = build_no_shows(
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            ventana_dias=ventana_dias,
            min_ausencias=min_ausencias,
        )
        return export(fmt, slug='no_shows_clases', title='No-Shows en Clases', headers=headers, rows=rows)
