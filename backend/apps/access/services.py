import logging

from django.core.cache import cache
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

logger = logging.getLogger(__name__)


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
        .filter(timestamp__date=today, status='GRANTED')
        .aggregate(
            entries=Count('id', filter=Q(access_type='ENTRY')),
            exits=Count('id', filter=Q(access_type='EXIT')),
        )
    )
    entries = aggregate.get('entries') or 0
    exits = aggregate.get('exits') or 0
    return {
        'aforo_actual': max(entries - exits, 0),
        'ingresos_hoy': entries,
        'egresos_hoy': exits,
    }


def compute_aforo_stats():
    """Compute statistics for the AforoMonitor today."""
    from apps.access.models import AccessLog
    from datetime import timedelta
    
    now = timezone.now()
    today = timezone.localdate()
    one_hour_ago = now - timedelta(hours=1)
    
    logs = AccessLog.objects.filter(timestamp__date=today, status='GRANTED').order_by('timestamp')
    
    current = 0
    pico_max = 0
    pico_time = None
    
    ingreso_ultima_hora = 0
    egreso_ultima_hora = 0
    
    for log in logs:
        if log.access_type == 'ENTRY':
            current += 1
            if log.timestamp >= one_hour_ago:
                ingreso_ultima_hora += 1
        elif log.access_type == 'EXIT':
            current = max(0, current - 1)
            if log.timestamp >= one_hour_ago:
                egreso_ultima_hora += 1
                
        if current > pico_max:
            pico_max = current
            pico_time = log.timestamp
            
    pico_hora_str = pico_time.astimezone(timezone.get_current_timezone()).strftime('%H:%M') if pico_time else '--:--'
    promedio_hoy = max(1, pico_max // 2) if pico_max > 0 else 0
    
    return {
        'promedioHoy': str(promedio_hoy),
        'picoMaximo': str(pico_max),
        'picoHora': pico_hora_str,
        'ingresoUltimaHora': str(ingreso_ultima_hora),
        'egresoUltimaHora': str(egreso_ultima_hora),
    }


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
