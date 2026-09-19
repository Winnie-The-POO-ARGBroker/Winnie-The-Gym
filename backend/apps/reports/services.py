"""Report row builders: pure functions that assemble the data to export.

Each function returns (headers, rows) where `rows` is a list of lists.
Filters passed in by the view are honored so that exported data matches the
listing the user was looking at.
"""
from datetime import date, datetime, time
from decimal import Decimal

from django.db.models import Q
from django.utils import timezone

from apps.access.models import AccessLog
from apps.memberships.models import Membresia
from apps.payments.models import Pago


# ---------------------------------------------------------------------------
# Morosidad
# ---------------------------------------------------------------------------

MOROSIDAD_HEADERS = [
    'dni', 'apellido', 'nombre', 'plan',
    'fecha_vencimiento', 'dias_atraso', 'monto_adeudado',
    'telefono', 'email',
]


def build_morosidad(estado=None, plan_id=None):
    today = timezone.localdate()
    qs = Membresia.objects.select_related('socio', 'socio__usuario', 'plan').filter(
        estado__in=[Membresia.Estado.VENCIDA, Membresia.Estado.PENDIENTE_PAGO],
        fecha_fin__lte=today,
    )
    if estado:
        qs = qs.filter(estado=estado)
    if plan_id:
        qs = qs.filter(plan_id=plan_id)

    rows = []
    for m in qs.order_by('fecha_fin'):
        dias_atraso = (today - m.fecha_fin).days
        rows.append([
            m.socio.dni,
            m.socio.apellido,
            m.socio.nombre,
            m.plan.nombre,
            m.fecha_fin.isoformat(),
            dias_atraso,
            f'{Decimal(m.plan.precio):.2f}',
            m.socio.telefono,
            getattr(m.socio.usuario, 'email', '') or '',
        ])
    return MOROSIDAD_HEADERS, rows


# ---------------------------------------------------------------------------
# Facturación mensual
# ---------------------------------------------------------------------------

FACTURACION_HEADERS = [
    'fecha_pago', 'socio_dni', 'socio_nombre', 'plan',
    'monto', 'metodo_pago', 'estado', 'mp_payment_id',
]


def build_facturacion(mes=None, metodo=None):
    """`mes` is a 'YYYY-MM' string. Defaults to the current month."""
    if mes:
        year, month = [int(x) for x in mes.split('-', 1)]
    else:
        now = timezone.localdate()
        year, month = now.year, now.month

    tz = timezone.get_current_timezone()
    start = datetime(year, month, 1, tzinfo=tz)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=tz)
    else:
        end = datetime(year, month + 1, 1, tzinfo=tz)

    qs = Pago.objects.select_related('socio', 'plan').filter(
        estado=Pago.Estado.APROBADO,
        paid_at__gte=start,
        paid_at__lt=end,
    )
    if metodo:
        qs = qs.filter(metodo=metodo)

    rows = []
    for p in qs.order_by('paid_at'):
        rows.append([
            (p.paid_at.astimezone(tz).date().isoformat() if p.paid_at else ''),
            p.socio.dni,
            f'{p.socio.apellido}, {p.socio.nombre}',
            p.plan.nombre,
            f'{Decimal(p.monto):.2f}',
            p.get_metodo_display(),
            p.get_estado_display(),
            p.mp_payment_id or '',
        ])
    return FACTURACION_HEADERS, rows


# ---------------------------------------------------------------------------
# Asistencia
# ---------------------------------------------------------------------------

ASISTENCIA_HEADERS = [
    'fecha', 'hora_ingreso', 'hora_egreso',
    'socio_dni', 'socio_nombre', 'plan', 'permanencia_minutos',
]


def _plan_for(socio):
    if not socio:
        return ''
    membresia = socio.membresias.order_by('-fecha_inicio').first()
    return membresia.plan.nombre if membresia else ''


def _active_plan_via_user(user):
    socio = getattr(user, 'socio', None)
    return _plan_for(socio) if socio else ''


def build_asistencia(fecha_desde=None, fecha_hasta=None):
    tz = timezone.get_current_timezone()
    qs = AccessLog.objects.select_related('user', 'user__socio').filter(
        status=AccessLog.AccessStatus.GRANTED
    )

    if fecha_desde:
        qs = qs.filter(timestamp__date__gte=fecha_desde)
    if fecha_hasta:
        qs = qs.filter(timestamp__date__lte=fecha_hasta)

    ingresos = list(qs.filter(access_type=AccessLog.AccessType.ENTRY).order_by('timestamp'))
    egresos = list(qs.filter(access_type=AccessLog.AccessType.EXIT).order_by('timestamp'))

    rows = []
    consumed_exit_ids = set()

    for entrada in ingresos:
        matching_exit = None
        for salida in egresos:
            if (
                salida.id in consumed_exit_ids
                or salida.user_id != entrada.user_id
                or salida.timestamp <= entrada.timestamp
                or salida.timestamp.date() != entrada.timestamp.date()
            ):
                continue
            matching_exit = salida
            consumed_exit_ids.add(salida.id)
            break

        entrada_local = entrada.timestamp.astimezone(tz)
        egreso_local = matching_exit.timestamp.astimezone(tz) if matching_exit else None
        socio = getattr(entrada.user, 'socio', None)
        socio_nombre = (
            f'{socio.apellido}, {socio.nombre}' if socio else (entrada.user.email if entrada.user else '')
        )
        socio_dni = socio.dni if socio else ''
        plan = _active_plan_via_user(entrada.user) if entrada.user else ''
        permanencia = (
            int(round((matching_exit.timestamp - entrada.timestamp).total_seconds() / 60))
            if matching_exit else ''
        )

        rows.append([
            entrada_local.date().isoformat(),
            entrada_local.time().replace(microsecond=0).isoformat(),
            (egreso_local.time().replace(microsecond=0).isoformat() if egreso_local else ''),
            socio_dni,
            socio_nombre,
            plan,
            permanencia,
        ])

    return ASISTENCIA_HEADERS, rows
