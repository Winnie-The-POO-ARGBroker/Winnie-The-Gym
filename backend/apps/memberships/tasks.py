import logging
from datetime import date, timedelta

from celery import shared_task
from django.utils import timezone

from apps.common.tasks import enqueue_email

from .models import Membresia


logger = logging.getLogger(__name__)

# Days-before-expiration that trigger an email. `0` means the day the membership expires.
EXPIRATION_ALERT_DAYS = (7, 3, 1, 0)


def _send_alert(membresia, dias_restantes):
    """Enqueue the expiration email and record the alert as sent."""
    user = getattr(membresia.socio, 'usuario', None)
    email = getattr(user, 'email', None)
    if not email:
        return False

    enqueue_email(
        template_base='expiration_alert',
        subject='Tu membresía en Winnie The Gym está por vencer',
        to=[email],
        context={
            'nombre': membresia.socio.nombre,
            'plan_nombre': membresia.plan.nombre,
            'fecha_fin': membresia.fecha_fin,
            'dias_restantes': dias_restantes,
        },
        category='expiration_alert',
    )

    avisos = dict(membresia.avisos_enviados or {})
    avisos[str(dias_restantes)] = True
    membresia.avisos_enviados = avisos
    membresia.save(update_fields=['avisos_enviados', 'updated_at'])
    return True


@shared_task(name='memberships.check_expiring_memberships')
def check_expiring_memberships():
    """Daily scan for active memberships hitting an alert threshold.

    - Sends 7/3/1-day reminders for memberships about to expire.
    - On the vencimiento day sends the final "vencida" email and flips estado.
    - Skips memberships that already received a given alert (deduplicated by
      `Membresia.avisos_enviados`).

    Returns a dict summarising the run for observability.
    """
    today = timezone.localdate()
    sent = {str(d): 0 for d in EXPIRATION_ALERT_DAYS}
    expired = 0

    active = Membresia.objects.filter(estado=Membresia.Estado.ACTIVA)

    for membresia in active.select_related('socio', 'plan', 'socio__usuario'):
        delta = (membresia.fecha_fin - today).days
        if delta not in EXPIRATION_ALERT_DAYS:
            continue

        key = str(delta)
        already_sent = bool((membresia.avisos_enviados or {}).get(key))
        if already_sent:
            continue

        if _send_alert(membresia, delta):
            sent[key] += 1

        if delta == 0:
            membresia.estado = Membresia.Estado.VENCIDA
            membresia.save(update_fields=['estado', 'updated_at'])
            expired += 1

    result = {'sent': sent, 'expired': expired, 'run_at': today.isoformat()}
    logger.info('check_expiring_memberships completed: %s', result)
    return result
