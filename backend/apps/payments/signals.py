"""#192 — Signal to auto-assign sequential annual receipt numbers (R-YYYY-NNNNNN)."""
import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, sender='payments.Pago')
def asignar_numero_comprobante(sender, instance, created, **kwargs):
    """Assign a sequential annual receipt number to newly-approved Pagos.

    Runs inside a ``transaction.on_commit`` so the number is only assigned once
    the row is durable in the DB. Uses ``select_for_update`` + ``MAX`` to
    serialize concurrent approvals safely.

    Format: R-{YYYY}-{NNNNNN} e.g. R-2026-000001.
    """
    if instance.estado != 'aprobado':
        return
    if instance.numero_comprobante:
        return

    def _assign():
        from apps.payments.models import Pago  # local to avoid circular import
        from django.utils import timezone

        year = timezone.localdate().year

        with transaction.atomic():
            # Lock the row to prevent concurrent assignment for the same pago
            try:
                locked_pago = Pago.objects.select_for_update().get(pk=instance.pk)
            except Pago.DoesNotExist:
                return

            # Idempotency: another concurrent call may have already assigned it
            if locked_pago.numero_comprobante:
                return

            # Find the current MAX sequential number for this year
            prefix = f'R-{year}-'
            last = (
                Pago.objects
                .filter(numero_comprobante__startswith=prefix)
                .order_by('-numero_comprobante')
                .values_list('numero_comprobante', flat=True)
                .first()
            )
            if last:
                try:
                    last_n = int(last.split('-')[-1])
                except (ValueError, IndexError):
                    last_n = 0
            else:
                last_n = 0

            numero = f'{prefix}{last_n + 1:06d}'
            locked_pago.numero_comprobante = numero
            locked_pago.save(update_fields=['numero_comprobante'])
            logger.info('Assigned comprobante %s to pago %s', numero, instance.pk)

    transaction.on_commit(_assign)
