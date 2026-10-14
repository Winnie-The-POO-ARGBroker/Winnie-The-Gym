import datetime
import logging
import zoneinfo

from django.core.cache import cache
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

logger = logging.getLogger(__name__)

ART_TZ = zoneinfo.ZoneInfo('America/Argentina/Buenos_Aires')


def get_presencia(socio_user, *, date=None):
    """Return 'inside', 'outside', or 'unknown' based on the last GRANTED log today.

    #149 — Anti-passback: determines the current presence state of a socio
    from the most recent ENTRY or EXIT GRANTED log on the local date.
    """
    from apps.access.models import AccessLog  # local to avoid circular imports

    if date is None:
        date = timezone.localdate()

    last_granted = (
        AccessLog.objects
        .filter(
            user=socio_user,
            timestamp__date=date,
            status=AccessLog.AccessStatus.GRANTED,
            access_type__in=[AccessLog.AccessType.ENTRY, AccessLog.AccessType.EXIT],
        )
        .order_by('-timestamp')
        .first()
    )
    if last_granted is None:
        return 'unknown'
    if last_granted.access_type == AccessLog.AccessType.ENTRY:
        return 'inside'
    return 'outside'


def check_aforo(gym_config) -> tuple[bool, str | None]:
    """Return (ok, denial_reason). Denied when aforo_actual >= aforo_maximo.

    #220 — Aforo enforcement.  Returns True when aforo_bloqueo_al_llegar_max
    is False (feature flag off) to preserve backwards compatibility.

    Returns denial_reason 'AFORO_FULL' (the existing code already in the model)
    for backwards compatibility with existing tests and frontend denial handling.
    """
    if not gym_config.aforo_bloqueo_al_llegar_max:
        return True, None

    aforo_data = get_aforo_actual(use_cache=False)
    actual = aforo_data.get('aforo_actual', 0)
    maximo = gym_config.aforo_maximo

    if maximo > 0 and actual >= maximo:
        return False, 'AFORO_FULL'
    return True, None


def check_horario(gym_config, now_local: datetime.datetime | None = None) -> tuple[bool, str | None]:
    """Return (ok, denial_reason). Denied when current local time is outside operating hours.

    #220 — Horario enforcement. Supports closing time past midnight (e.g. 02:00).
    When hora_cierre is None the gym never closes.
    """
    if gym_config.hora_apertura is None:
        return True, None
    if gym_config.hora_cierre is None:
        return True, None

    if now_local is None:
        now_local = timezone.now().astimezone(ART_TZ)

    current_time = now_local.time().replace(second=0, microsecond=0)
    apertura = gym_config.hora_apertura
    cierre = gym_config.hora_cierre

    if cierre > apertura:
        # Normal range: e.g. 07:00 - 23:00
        in_range = apertura <= current_time <= cierre
    else:
        # Crosses midnight: e.g. 07:00 - 02:00
        # Valid when time >= apertura (daytime) OR time <= cierre (next day early morning)
        in_range = current_time >= apertura or current_time <= cierre

    if not in_range:
        return False, 'FUERA_DE_HORARIO'
    return True, None


AFORO_CACHE_KEY = 'aforo:current'
AFORO_CACHE_TTL_SECONDS = 5


def compute_aforo_actual():
    """Return the count of socios currently inside the gym and today's movements.

    Definition: ENTRY (GRANTED) minus EXIT (GRANTED) of the current day,
    clamped to 0. Runs a single aggregate query on `AccessLog`.
    """
    from apps.access.models import AccessLog  # local to avoid circular imports

    today = timezone.localdate()
    aggregate = (
        AccessLog.objects
        .filter(timestamp__date=today, status=AccessLog.AccessStatus.GRANTED)
        .aggregate(
            entries=Count('id', filter=Q(access_type=AccessLog.AccessType.ENTRY)),
            exits=Count('id', filter=Q(access_type=AccessLog.AccessType.EXIT)),
        )
    )
    entries = aggregate.get('entries') or 0
    exits = aggregate.get('exits') or 0
    return {
        'aforo_actual': max(entries - exits, 0),
        'ingresos_hoy': entries,
        'egresos_hoy': exits,
    }


AFORO_STATS_CACHE_KEY = 'aforo:stats'
AFORO_STATS_CACHE_TTL_SECONDS = 30


def compute_aforo_stats():
    """Compute statistics for the AforoMonitor today.

    Returns a dict with keys: promedioHoy, picoMaximo, picoHora,
    ingresoUltimaHora, egresoUltimaHora.

    promedio_hoy is calculated as a time-weighted average of occupancy over
    the day so far: sum(occupancy_level * seconds_at_that_level) / total_elapsed_seconds.
    This replaces the previous ``pico_max // 2`` heuristic which systematically
    underestimated average occupancy for gyms with sharp entry/exit peaks.
    """
    from apps.access.models import AccessLog
    from datetime import timedelta

    now = timezone.now()
    today = timezone.localdate()
    one_hour_ago = now - timedelta(hours=1)

    # Use .values() to prevent instantiating all model objects in memory
    logs = list(
        AccessLog.objects.filter(
            timestamp__date=today,
            status=AccessLog.AccessStatus.GRANTED,
        ).values('timestamp', 'access_type').order_by('timestamp')
    )

    current = 0
    pico_max = 0
    pico_time = None

    ingreso_ultima_hora = 0
    egreso_ultima_hora = 0

    # Time-weighted average state tracking
    prev_timestamp = None
    weighted_sum = 0.0

    for log in logs:
        ts = log['timestamp']

        # Accumulate weighted occupancy since the previous event
        if prev_timestamp is not None:
            delta_seconds = (ts - prev_timestamp).total_seconds()
            weighted_sum += current * delta_seconds
        prev_timestamp = ts

        if log['access_type'] == AccessLog.AccessType.ENTRY:
            current += 1
            if ts >= one_hour_ago:
                ingreso_ultima_hora += 1
        elif log['access_type'] == AccessLog.AccessType.EXIT:
            current = max(0, current - 1)
            if ts >= one_hour_ago:
                egreso_ultima_hora += 1

        if current > pico_max:
            pico_max = current
            pico_time = ts

    # Accumulate occupancy from last event to now
    if prev_timestamp is not None:
        delta_seconds = (now - prev_timestamp).total_seconds()
        weighted_sum += current * max(delta_seconds, 0)

    # Compute time-weighted average over total elapsed seconds since midnight
    day_start = timezone.make_aware(
        timezone.datetime.combine(today, timezone.datetime.min.time()),
        timezone.get_current_timezone(),
    )
    total_elapsed = max((now - day_start).total_seconds(), 1)
    promedio_hoy = round(weighted_sum / total_elapsed) if pico_max > 0 else 0

    pico_hora_str = (
        pico_time.astimezone(timezone.get_current_timezone()).strftime('%H:%M')
        if pico_time
        else '--:--'
    )

    return {
        'promedioHoy': str(promedio_hoy),
        'picoMaximo': str(pico_max),
        'picoHora': pico_hora_str,
        'ingresoUltimaHora': str(ingreso_ultima_hora),
        'egresoUltimaHora': str(egreso_ultima_hora),
    }


def get_aforo_stats(use_cache=True):
    """Cached wrapper around ``compute_aforo_stats``.

    Results are cached for 30 seconds under ``aforo:stats``.
    Call ``invalidate_aforo_stats_cache()`` after any AccessLog write to keep
    the cache fresh (wire this to the ``post_save`` / ``post_delete`` signals
    on AccessLog in apps.access.signals).
    """
    if not use_cache:
        return compute_aforo_stats()
    cached = cache.get(AFORO_STATS_CACHE_KEY)
    if cached is not None:
        return cached
    value = compute_aforo_stats()
    cache.set(AFORO_STATS_CACHE_KEY, value, timeout=AFORO_STATS_CACHE_TTL_SECONDS)
    return value


def invalidate_aforo_stats_cache():
    cache.delete(AFORO_STATS_CACHE_KEY)


def get_aforo_actual(use_cache=True):
    """Cached wrapper around `compute_aforo_actual` for hot paths (WebSocket)."""
    if not use_cache:
        return compute_aforo_actual()
    cached = cache.get(AFORO_CACHE_KEY)
    if cached is not None:
        return cached
    value = compute_aforo_actual()
    cache.set(AFORO_CACHE_KEY, value, timeout=AFORO_CACHE_TTL_SECONDS)
    return value


def invalidate_aforo_cache():
    cache.delete(AFORO_CACHE_KEY)


def check_horario_plan(socio, plan, now_local: datetime.datetime | None = None) -> tuple[bool, str | None]:
    """Return (ok, denial_reason) for plan-level time and day restrictions.

    #158 — Called during ENTRY after gym-level horario/aforo checks pass.

    Rules:
      - If plan.franja_desde and plan.franja_hasta are both set: deny when
        now_local.time() is outside [franja_desde, franja_hasta].
        Supports cross-midnight ranges (franja_hasta < franja_desde).
      - If plan.dias_habilitados is a non-empty list: deny when today's
        weekday abbreviation is not in the list.
        Valid values: 'lun','mar','mie','jue','vie','sab','dom'.

    Args:
        socio: Socio instance (unused directly, reserved for future per-socio overrides).
        plan: PlanMembresia instance — carries franja_desde/hasta/dias_habilitados.
        now_local: current local datetime. Defaults to timezone.now() in ART.

    Returns:
        (True, None) when access is allowed; (False, denial_reason) otherwise.
    """
    if now_local is None:
        now_local = timezone.now().astimezone(ART_TZ)

    # Day check
    dias = getattr(plan, 'dias_habilitados', None)
    if dias:
        day_map = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']
        today_abbr = day_map[now_local.weekday()]
        if today_abbr not in dias:
            return False, 'PLAN_DIA_NO_HABILITADO'

    # Time-slot check (only when BOTH bounds are defined)
    franja_desde = getattr(plan, 'franja_desde', None)
    franja_hasta = getattr(plan, 'franja_hasta', None)
    if franja_desde is not None and franja_hasta is not None:
        current_time = now_local.time().replace(second=0, microsecond=0)
        if franja_hasta >= franja_desde:
            # Normal range: e.g. 07:00 - 12:00
            in_range = franja_desde <= current_time <= franja_hasta
        else:
            # Cross-midnight: e.g. 22:00 - 06:00
            in_range = current_time >= franja_desde or current_time <= franja_hasta
        if not in_range:
            return False, 'PLAN_FUERA_DE_HORARIO'

    return True, None


def check_cierre_gimnasio(now_local: datetime.datetime | None = None) -> tuple[bool, str | None]:
    """Return (ok, denial_reason). Denied when a CierreGimnasio with afecta='todo' covers today.

    #182 — Gym closure enforcement on physical ENTRY.
    Only 'todo' closures are checked here; sala-level closures are handled
    at the class enrollment layer (inscribir_socio).

    Args:
        now_local: current local datetime. Defaults to timezone.now() in ART.

    Returns:
        (True, None) when no active total closure exists for today.
        (False, 'GYM_CERRADO') when a closure covers today.
    """
    from apps.common.models import CierreGimnasio  # local to avoid circular imports

    if now_local is None:
        now_local = timezone.now().astimezone(ART_TZ)

    today = now_local.date()

    cierre = (
        CierreGimnasio.objects
        .filter(
            afecta=CierreGimnasio.Afecta.TODO,
            fecha_desde__lte=today,
            fecha_hasta__gte=today,
        )
        .first()
    )

    if cierre is not None:
        return False, 'GYM_CERRADO'
    return True, None


def has_active_membership(user) -> bool:
    """
    Returns True only when all of the following hold:
      1. user has a linked Socio record.
      2. Socio.estado is 'activo'.
      3. A Membresia exists with estado='activa' and fecha_fin >= today.

    If a Membresia has estado='activa' but fecha_fin < today, this function
    atomically flips it to 'vencida' (lazy expiry) and returns False.

    Import of Membresia is deferred to function scope to avoid circular app-registry
    issues (ADR-7).
    """
    # Local import — keeps apps.access importable during app registry setup.
    from apps.memberships.models import Membresia  # noqa: PLC0415

    today = timezone.localdate()

    socio = getattr(user, 'socio', None)
    if socio is None:
        return False

    if socio.estado not in ('activo',):
        return False

    with transaction.atomic():
        qs = (
            Membresia.objects
            .select_for_update(skip_locked=True)
            .filter(socio=socio, estado='activa')
            .order_by('-fecha_fin')
        )
        membresia = qs.first()

        if membresia is None:
            return False

        if membresia.fecha_fin < today:
            membresia.estado = 'vencida'
            membresia.save(update_fields=['estado'])
            logger.info(
                "Membresia %s marcada vencida (lazy expiry) durante scan de socio %s",
                membresia.pk,
                socio.numero_socio,
            )
            return False

        return True
