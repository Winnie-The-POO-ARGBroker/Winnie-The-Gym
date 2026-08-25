import logging

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


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
