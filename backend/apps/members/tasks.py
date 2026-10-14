"""Celery tasks for the members domain.

#228 — enviar_avisos_apto_medico: daily task that sends reminder emails to socios
whose medical certificate is about to expire (30, 7, or 0 days before expiry).
Each reminder is sent at most once per threshold per certificate cycle (idempotent).
"""
import logging
from datetime import date, timedelta

from celery import shared_task

logger = logging.getLogger(__name__)

# Thresholds in days: we remind socios at 30, 7, and 0 days before expiry.
APTO_REMINDER_THRESHOLDS = [30, 7, 0]


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def enviar_avisos_apto_medico(self):
    """Send medical certificate expiry reminder emails (#228).

    Runs daily (scheduled via django-celery-beat). For each threshold (30/7/0
    days) it finds socios whose certificate expires exactly on today + N days,
    checks an idempotency flag stored on the Socio record, and sends the email
    only once per threshold per certificate cycle.

    The idempotency flag is a JSON dict stored in Socio._aviso_apto_enviado:
        {"30": "2026-10-14", "7": "2026-10-17", "0": "2026-10-21"}

    A flag is considered already sent if the stored date matches the current
    certificado_vence_en. If the certificate is later renewed, the dict key
    won't match the new expiry date so reminders start fresh.
    """
    from apps.common.emails import send_templated_email
    from apps.members.models import Socio

    today = date.today()
    sent_count = 0
    error_count = 0

    for days in APTO_REMINDER_THRESHOLDS:
        target_date = today + timedelta(days=days)
        candidates = Socio.objects.filter(
            certificado_vence_en=target_date,
        ).exclude(
            certificado_medico_path='',
            certificado_medico_url='',
        ).select_related('usuario')

        for socio in candidates:
            try:
                _send_apto_reminder(socio, days, send_templated_email)
                sent_count += 1
            except Exception as exc:
                error_count += 1
                logger.warning(
                    'enviar_avisos_apto_medico: failed for socio %s threshold %d: %s',
                    socio.pk, days, exc,
                )

    logger.info(
        'enviar_avisos_apto_medico: sent=%d errors=%d date=%s',
        sent_count, error_count, today,
    )
    return {'sent': sent_count, 'errors': error_count}


def _send_apto_reminder(socio, days, send_fn):
    """Send a single apto reminder, checking the idempotency flag first.

    The idempotency key stores the certificado_vence_en date for each threshold,
    ensuring the reminder fires exactly once per (threshold, vence_en) pair.
    """
    email = socio.usuario.email if socio.usuario_id else None
    if not email:
        logger.debug('_send_apto_reminder: socio %s has no email, skipping', socio.pk)
        return

    vence_en = socio.certificado_vence_en
    if not vence_en:
        return

    aviso_dict = socio.get_aviso_apto_enviado()
    flag_key = str(days)
    # Idempotency: if the stored date matches the current vence_en, skip
    if aviso_dict.get(flag_key) == vence_en.isoformat():
        logger.debug(
            '_send_apto_reminder: already sent for socio %s threshold %d vence_en %s',
            socio.pk, days, vence_en,
        )
        return

    # Determine subject and context based on threshold
    if days == 0:
        subject = 'Tu apto médico vence hoy — renovalo para seguir accediendo al gimnasio'
        urgency = 'hoy'
    elif days <= 7:
        subject = f'Tu apto médico vence en {days} días — recordatorio de Winnie The Gym'
        urgency = f'en {days} días'
    else:
        subject = f'Tu apto médico vence en {days} días — recordatorio de Winnie The Gym'
        urgency = f'en {days} días'

    send_fn(
        template_base='apto_vencimiento',
        subject=subject,
        to=[email],
        context={
            'socio': socio,
            'days': days,
            'urgency': urgency,
            'vence_en': vence_en,
        },
        category='apto_medico_reminder',
    )

    # Update idempotency flag
    aviso_dict[flag_key] = vence_en.isoformat()
    socio.set_aviso_apto_enviado(aviso_dict)
    socio.save(update_fields=['_aviso_apto_enviado', 'updated_at'])
