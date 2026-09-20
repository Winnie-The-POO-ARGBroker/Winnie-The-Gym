"""Broadcasting of aforo changes to WebSocket subscribers.

Every time a new AccessLog is inserted (GRANTED entry or exit) we invalidate
the cache and push the fresh aforo value to the `aforo_updates` group.
"""
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models.signals import post_save
from django.dispatch import receiver

from .consumers import AFORO_GROUP
from .models import AccessLog
from .services import get_aforo_actual, invalidate_aforo_cache


logger = logging.getLogger(__name__)


@receiver(post_save, sender=AccessLog, dispatch_uid='broadcast_aforo_on_access')
def broadcast_aforo_on_access(sender, instance, created, **kwargs):
    if not created:
        return
    if instance.status != AccessLog.AccessStatus.GRANTED:
        return
    if instance.access_type not in (AccessLog.AccessType.ENTRY, AccessLog.AccessType.EXIT):
        return

    invalidate_aforo_cache()

    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        payload = {'type': 'aforo.update', **get_aforo_actual()}
        async_to_sync(channel_layer.group_send)(AFORO_GROUP, payload)
    except Exception as exc:  # noqa: BLE001
        logger.warning('Aforo broadcast failed: %s', exc)
