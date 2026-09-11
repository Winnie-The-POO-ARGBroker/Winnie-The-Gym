import logging

from django.core.cache import cache
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

logger = logging.getLogger(__name__)


AFORO_CACHE_KEY = 'aforo:current'
AFORO_CACHE_TTL_SECONDS = 5


def compute_aforo_actual():
    """Return the count of socios currently inside the gym.

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
    return max(entries - exits, 0)


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
