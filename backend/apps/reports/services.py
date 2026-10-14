"""Report row builders: pure functions that assemble the data to export.

Each function returns (headers, rows) where `rows` is a list of lists.
Filters passed in by the view are honored so that exported data matches the
listing the user was looking at.
"""
from datetime import date, datetime, time
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Q, Sum
from django.utils import timezone

from apps.access.models import AccessLog
from apps.memberships.models import Membresia
from apps.payments.models import Pago


# ---------------------------------------------------------------------------
# Resumen / Dashboard (server-side aggregation — fix #183)
# ---------------------------------------------------------------------------

def _parse_mes(mes_str):
    """Parse 'YYYY-MM' string into (year, month). Defaults to current month."""
    if mes_str:
        try:
            year, month = [int(x) for x in mes_str.split('-', 1)]
            return year, month
        except (ValueError, TypeError):
            pass
    today = timezone.localdate()
    return today.year, today.month


def _month_range(year, month):
    """Return (start_dt, end_dt) for a calendar month in the local timezone."""
    tz = timezone.get_current_timezone()
    start = datetime(year, month, 1, tzinfo=tz)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=tz)
    else:
        end = datetime(year, month + 1, 1, tzinfo=tz)
    return start, end


def _prev_month(year, month):
    if month == 1:
        return year - 1, 12
    return year, month - 1


def _ingresos_mes(year, month, plan_id=None):
    """Total of approved payments for a given (year, month)."""
    start, end = _month_range(year, month)
    qs = Pago.objects.filter(
        estado=Pago.Estado.APROBADO,
        paid_at__gte=start,
        paid_at__lt=end,
    )
    if plan_id:
        qs = qs.filter(plan_id=plan_id)
    total = qs.aggregate(total=Sum('monto'))['total'] or Decimal('0')
    return total


def build_resumen(mes=None, plan_id=None):
    """Build the full dashboard summary JSON for a given month + optional plan filter.

    Returns a dict matching the contract:
    {
      "ingresos": {"mes_actual": X, "mes_anterior": Y, "variacion_pct": Z, "serie_6_meses": [...]},
      "morosos":  {"cantidad": N, "monto_total": M, "tasa_pct": P},
      "membresias": {"activas": A, "por_vencer_7d": V, "nuevas_mes": NM},
      "asistencia": {"promedio_dia": {"lun": ..., "mar": ..., ...}},
    }
    """
    year, month = _parse_mes(mes)
    plan_id = int(plan_id) if plan_id else None

    # ---- Ingresos ----
    mes_actual = _ingresos_mes(year, month, plan_id)
    py, pm = _prev_month(year, month)
    mes_anterior = _ingresos_mes(py, pm, plan_id)

    if mes_anterior and mes_anterior != 0:
        variacion_pct = float(
            ((mes_actual - mes_anterior) / mes_anterior * 100).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)
        )
    else:
        variacion_pct = None

    # Last 6 months series (oldest → newest)
    serie_6_meses = []
    cy, cm = year, month
    months_back = []
    for _ in range(6):
        months_back.append((cy, cm))
        cy, cm = _prev_month(cy, cm)
    months_back.reverse()
    for sy, sm in months_back:
        start, end = _month_range(sy, sm)
        label = f'{sy}-{sm:02d}'
        total = _ingresos_mes(sy, sm, plan_id)
        serie_6_meses.append({'mes': label, 'total': float(total)})

    # ---- Morosos ----
    today = timezone.localdate()
    morosos_qs = Membresia.objects.filter(
        estado__in=[Membresia.Estado.VENCIDA, Membresia.Estado.PENDIENTE_PAGO],
        fecha_fin__lte=today,
    )
    if plan_id:
        morosos_qs = morosos_qs.filter(plan_id=plan_id)
    morosos_count = morosos_qs.count()
    # Use the plan price as the owed amount per delinquent membership
    monto_morosos = morosos_qs.select_related('plan').aggregate(
        total=Sum('plan__precio')
    )['total'] or Decimal('0')

    total_socios = Membresia.objects.values('socio_id').distinct().count() or 1
    tasa_pct = float(
        (Decimal(morosos_count) / Decimal(total_socios) * 100).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)
    )

    # ---- Membresías ----
    activas_qs = Membresia.objects.filter(estado=Membresia.Estado.ACTIVA)
    if plan_id:
        activas_qs = activas_qs.filter(plan_id=plan_id)
    activas = activas_qs.count()

    vencer_7d = activas_qs.filter(
        fecha_fin__lte=today + timezone.timedelta(days=7),
        fecha_fin__gte=today,
    ).count()

    start_mes, end_mes = _month_range(year, month)
    nuevas_qs = Membresia.objects.filter(
        created_at__gte=start_mes,
        created_at__lt=end_mes,
    )
    if plan_id:
        nuevas_qs = nuevas_qs.filter(plan_id=plan_id)
    nuevas_mes = nuevas_qs.count()

    # ---- Asistencia por día de semana ----
    day_names = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']
    # Use the target month for attendance aggregation
    a_start, a_end = _month_range(year, month)
    entries = AccessLog.objects.filter(
        access_type=AccessLog.AccessType.ENTRY,
        status=AccessLog.AccessStatus.GRANTED,
        timestamp__gte=a_start,
        timestamp__lt=a_end,
    )
    tz = timezone.get_current_timezone()
    counts = {d: 0 for d in day_names}
    days_seen = {d: set() for d in day_names}
    for entry in entries.values('timestamp'):
        local_dt = entry['timestamp'].astimezone(tz)
        day_key = day_names[local_dt.weekday()]
        day_date = local_dt.date()
        days_seen[day_key].add(day_date)
        counts[day_key] += 1

    promedio_dia = {}
    for d in day_names:
        n_days = len(days_seen[d]) or 1
        promedio_dia[d] = round(counts[d] / n_days, 1)

    return {
        'ingresos': {
            'mes_actual': float(mes_actual),
            'mes_anterior': float(mes_anterior),
            'variacion_pct': variacion_pct,
            'serie_6_meses': serie_6_meses,
        },
        'morosos': {
            'cantidad': morosos_count,
            'monto_total': float(monto_morosos),
            'tasa_pct': tasa_pct,
        },
        'membresias': {
            'activas': activas,
            'por_vencer_7d': vencer_7d,
            'nuevas_mes': nuevas_mes,
        },
        'asistencia': {
            'promedio_dia': promedio_dia,
        },
    }


# ---------------------------------------------------------------------------
# Morosidad
# ---------------------------------------------------------------------------

MOROSIDAD_HEADERS = [
    'dni', 'apellido', 'nombre', 'plan',
    'fecha_vencimiento', 'dias_atraso', 'monto_adeudado',
    'telefono', 'email',
]


def build_morosidad(estado=None, plan_id=None):
    """#185: uses socios_morosos_queryset as the single source of truth.

    Falls back to the legacy Membresia-based approach if `estado` filter is set,
    since socios_morosos_queryset always returns VENCIDA rows (no pendiente_pago
    differentiation is needed for the delinquency report).
    """
    today = timezone.localdate()

    if estado:
        # Legacy path: explicit estado filter bypasses the selector
        qs = Membresia.objects.select_related('socio', 'socio__usuario', 'plan').filter(
            estado__in=[Membresia.Estado.VENCIDA, Membresia.Estado.PENDIENTE_PAGO],
            fecha_fin__lte=today,
        )
        qs = qs.filter(estado=estado)
        if plan_id:
            qs = qs.filter(plan_id=plan_id)

        rows = []
        total_adeudado = Decimal('0')
        for m in qs.order_by('fecha_fin'):
            dias_atraso = (today - m.fecha_fin).days
            monto = Decimal(m.plan.precio)
            total_adeudado += monto
            rows.append([
                m.socio.dni,
                m.socio.apellido,
                m.socio.nombre,
                m.plan.nombre,
                m.fecha_fin.isoformat(),
                dias_atraso,
                f'{monto:.2f}',
                m.socio.telefono,
                getattr(m.socio.usuario, 'email', '') or '',
            ])
    else:
        # #185: canonical path — use the selector for correctness
        from apps.memberships.selectors import socios_morosos_queryset
        socios_qs = socios_morosos_queryset()
        if plan_id:
            socios_qs = socios_qs.filter(membresias__estado=Membresia.Estado.VENCIDA, membresias__plan_id=plan_id).distinct()

        rows = []
        total_adeudado = Decimal('0')
        for socio in socios_qs:
            # Get the latest vencida membership
            last_mem_qs = socio.membresias.filter(estado=Membresia.Estado.VENCIDA).order_by('-fecha_fin')
            if plan_id:
                last_mem_qs = last_mem_qs.filter(plan_id=plan_id)
            m = last_mem_qs.select_related('plan').first()
            if not m:
                continue
            dias_atraso = (today - m.fecha_fin).days
            monto = Decimal(m.plan.precio)
            total_adeudado += monto
            rows.append([
                socio.dni,
                socio.apellido,
                socio.nombre,
                m.plan.nombre,
                m.fecha_fin.isoformat(),
                dias_atraso,
                f'{monto:.2f}',
                socio.telefono,
                getattr(socio.usuario, 'email', '') or '',
            ])

    # #184: append TOTAL row
    if rows:
        rows.append([
            'TOTAL', '', '', '', '', '', f'{total_adeudado:.2f}', '', '',
        ])

    return MOROSIDAD_HEADERS, rows


# ---------------------------------------------------------------------------
# Facturación mensual
# ---------------------------------------------------------------------------

FACTURACION_HEADERS = [
    'fecha_pago', 'socio_dni', 'socio_nombre', 'plan',
    'monto', 'metodo_pago', 'estado', 'mp_payment_id',
]


def build_facturacion(mes=None, fecha_desde=None, fecha_hasta=None, metodo=None, plan_id=None, estado='aprobado'):
    """`mes` is a 'YYYY-MM' string. Defaults to the current month.

    #184: Supports `fecha_desde`/`fecha_hasta` range (priority over `mes`),
    `plan_id` filter, and `estado` filter (default 'aprobado').
    Range timestamps respect ART timezone.
    """
    tz = timezone.get_current_timezone()

    if fecha_desde or fecha_hasta:
        # Range mode: fecha_desde/hasta take priority over mes
        if fecha_desde:
            fd = date.fromisoformat(fecha_desde)
            start = datetime(fd.year, fd.month, fd.day, 0, 0, 0, tzinfo=tz)
        else:
            start = None
        if fecha_hasta:
            fh = date.fromisoformat(fecha_hasta)
            # End of day in ART: 23:59:59
            end = datetime(fh.year, fh.month, fh.day, 23, 59, 59, tzinfo=tz)
        else:
            end = None
    else:
        # Month mode
        if mes:
            year, month = [int(x) for x in mes.split('-', 1)]
        else:
            now = timezone.localdate()
            year, month = now.year, now.month

        start = datetime(year, month, 1, tzinfo=tz)
        if month == 12:
            end = datetime(year + 1, 1, 1, tzinfo=tz)
        else:
            end = datetime(year, month + 1, 1, tzinfo=tz)

    qs = Pago.objects.select_related('socio', 'plan')

    # Estado filter (default: aprobado)
    if estado and estado != 'todos':
        qs = qs.filter(estado=estado)

    if start:
        qs = qs.filter(paid_at__gte=start)
    if end:
        # For range mode we use lte (inclusive end of day), for month mode lt (exclusive month start)
        if fecha_desde or fecha_hasta:
            qs = qs.filter(paid_at__lte=end)
        else:
            qs = qs.filter(paid_at__lt=end)
    if metodo:
        qs = qs.filter(metodo=metodo)
    if plan_id:
        qs = qs.filter(plan_id=int(plan_id))

    rows = []
    total_monto = Decimal('0')
    for p in qs.order_by('paid_at'):
        monto = Decimal(p.monto)
        total_monto += monto
        rows.append([
            (p.paid_at.astimezone(tz).date().isoformat() if p.paid_at else ''),
            p.socio.dni,
            f'{p.socio.apellido}, {p.socio.nombre}',
            p.plan.nombre,
            monto,  # numeric for XLSX (#184)
            p.get_metodo_display(),
            p.get_estado_display(),
            p.mp_payment_id or '',
        ])

    # #184: append TOTAL row
    if rows:
        rows.append([
            'TOTAL', '', '', '', total_monto, '', '', '',
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


def _parse_date(val):
    """Parsea una fecha si viene como string ISO o retorna el objeto date."""
    if not val:
        return None
    if isinstance(val, date):
        return val
    if isinstance(val, str):
        try:
            return date.fromisoformat(val)
        except (ValueError, TypeError):
            return None
    return None


def build_asistencia(fecha_desde=None, fecha_hasta=None):
    tz = timezone.get_current_timezone()
    qs = AccessLog.objects.select_related('user', 'user__socio').filter(
        status=AccessLog.AccessStatus.GRANTED
    )

    fecha_desde = _parse_date(fecha_desde)
    fecha_hasta = _parse_date(fecha_hasta)

    if fecha_desde:
        start = timezone.make_aware(datetime.combine(fecha_desde, time.min), tz)
        qs = qs.filter(timestamp__gte=start)
    if fecha_hasta:
        end = timezone.make_aware(datetime.combine(fecha_hasta, time.max), tz)
        qs = qs.filter(timestamp__lte=end)

    ingresos = list(qs.filter(access_type=AccessLog.AccessType.ENTRY).order_by('timestamp'))
    egresos = list(qs.filter(access_type=AccessLog.AccessType.EXIT).order_by('timestamp'))

    rows = []
    consumed_exit_ids = set()

    for entrada in ingresos:
        matching_exit = None
        entrada_local_date = entrada.timestamp.astimezone(tz).date()
        for salida in egresos:
            if (
                salida.id in consumed_exit_ids
                or salida.user_id != entrada.user_id
                or salida.timestamp <= entrada.timestamp
                or salida.timestamp.astimezone(tz).date() != entrada_local_date
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
