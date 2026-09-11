import logging

from celery import shared_task

from .emails import send_templated_email


logger = logging.getLogger(__name__)


@shared_task(name='common.send_email', bind=True, max_retries=3, default_retry_delay=60)
def send_email_task(self, template_base, subject, to, context=None, category=None):
    """Celery wrapper around send_templated_email so callers can enqueue.

    Retries up to 3 times with a 60-second delay on unhandled exceptions.
    """
    try:
        return send_templated_email(
            template_base=template_base,
            subject=subject,
            to=to,
            context=context,
            category=category,
        )
    except Exception as exc:
        logger.warning('Retrying send_email_task for %s: %s', to, exc)
        raise self.retry(exc=exc)


def enqueue_email(template_base, subject, to, context=None, category=None):
    """Fire-and-forget helper that queues an email via Celery.

    Falls back to synchronous delivery if Celery is running in eager mode (tests
    or dev without a worker) — the underlying task honours that flag.
    """
    send_email_task.delay(
        template_base=template_base,
        subject=subject,
        to=list(to) if to else [],
        context=context or {},
        category=category,
    )
