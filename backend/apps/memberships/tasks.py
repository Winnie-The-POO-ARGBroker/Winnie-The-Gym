import logging
from datetime import date, timedelta

from celery import shared_task
from django.utils import timezone

from apps.common.tasks import enqueue_email

from .models import Membresia


logger = logging.getLogger(__name__)

# Days-before-expiration that trigger an email. `0` means the day the membership expires.
EXPIRATION_ALERT_DAYS = (7, 3, 1, 0)

# Default mora reminder schedule (days after expiration: +1, +7, +15)
DEFAULT_MORA_REMINDER_DAYS = [1, 7, 15]


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


@shared_task(name='memberships.expire_overdue_memberships')
def expire_overdue_memberships():
    """Barrido diario: todas las membresías ACTIVA con fecha_fin < hoy → VENCIDA.

    Complementa check_expiring_memberships: while that task handles scheduled
    alerts (and flips on day 0), this task is a safety net that catches any
    memberships that slipped through (e.g., the task was skipped one day).

    Returns a dict summarising the run for observability.
    """
    today = timezone.localdate()
    updated = Membresia.objects.filter(
        estado=Membresia.Estado.ACTIVA,
        fecha_fin__lt=today,
    ).update(estado=Membresia.Estado.VENCIDA)

    result = {'expired': updated, 'run_at': today.isoformat()}
    logger.info('expire_overdue_memberships completed: %s', result)
    return result


@shared_task(name='memberships.send_morosos_reminders')
def send_morosos_reminders():
    """Envía recordatorios de mora a socios con membresías vencidas.

    Días de recordatorio configurados en GymConfig.recordatorios_mora_dias
    (default: [1, 7, 15] días después del vencimiento).

    Idempotency: each reminder is sent at most once per day per membership.
    The flag ``recordatorio_mora_enviado_en`` stored in ``avisos_enviados``
    under the key ``'mora_<dias>'`` prevents duplicates.

    Returns a dict summarising the run for observability.
    """
    today = timezone.localdate()

    # Get configurable days from GymConfig, fall back to default
    try:
        from apps.common.models import GymConfig
        config = GymConfig.get()
        mora_dias = getattr(config, 'recordatorios_mora_dias', None) or DEFAULT_MORA_REMINDER_DAYS
    except Exception:
        mora_dias = DEFAULT_MORA_REMINDER_DAYS

    sent = 0
    skipped = 0

    vencidas = (
        Membresia.objects
        .filter(estado=Membresia.Estado.VENCIDA, fecha_fin__lt=today)
        .select_related('socio', 'plan', 'socio__usuario')
    )

    for membresia in vencidas:
        dias_atraso = (today - membresia.fecha_fin).days
        if dias_atraso not in mora_dias:
            continue

        key = f'mora_{dias_atraso}'
        avisos = dict(membresia.avisos_enviados or {})

        # Idempotency check: only send once per (dias_atraso) per membership
        if avisos.get(key):
            skipped += 1
            continue

        user = getattr(membresia.socio, 'usuario', None)
        email = getattr(user, 'email', None)
        if not email:
            continue

        enqueue_email(
            template_base='mora_reminder',
            subject='Recordatorio: tu membresía en Winnie The Gym está vencida',
            to=[email],
            context={
                'nombre': membresia.socio.nombre,
                'plan_nombre': membresia.plan.nombre,
                'fecha_fin': membresia.fecha_fin,
                'dias_atraso': dias_atraso,
            },
            category='mora_reminder',
        )

        avisos[key] = today.isoformat()
        membresia.avisos_enviados = avisos
        membresia.save(update_fields=['avisos_enviados', 'updated_at'])
        sent += 1

    result = {'sent': sent, 'skipped': skipped, 'run_at': today.isoformat()}
    logger.info('send_morosos_reminders completed: %s', result)
    return result
