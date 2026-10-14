"""Celery tasks for the payments app."""
import logging

from celery import shared_task
from django.utils import timezone

from .models import Pago


logger = logging.getLogger(__name__)

# Payments pending for more than this many hours are considered abandoned.
PENDING_EXPIRY_HOURS = 24


@shared_task(name='payments.expirar_pagos_pendientes')
def expirar_pagos_pendientes():
    """Cancel pending payments that have been waiting for more than 24 hours.

    Fix #190: MercadoPago webhooks can be delayed or lost. Payments that
    remain ``pendiente`` for over 24h are safely cancelled so they don't
    pollute the dashboard and so the socio can retry.

    Returns the number of payments cancelled.
    """
    cutoff = timezone.now() - timezone.timedelta(hours=PENDING_EXPIRY_HOURS)
    qs = Pago.objects.filter(
        estado=Pago.Estado.PENDIENTE,
        created_at__lte=cutoff,
    )
    count = qs.count()
    if count:
        qs.update(estado=Pago.Estado.CANCELADO, updated_at=timezone.now())
        logger.info('expirar_pagos_pendientes: cancelled %d stale pending payments (older than %dh)', count, PENDING_EXPIRY_HOURS)
    return count
