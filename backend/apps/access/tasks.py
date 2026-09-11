import logging

from celery import shared_task

from core.mongodb import log_qr_event


logger = logging.getLogger(__name__)


@shared_task(name='access.log_qr_event', bind=True, max_retries=3, default_retry_delay=30)
def log_qr_event_task(self, payload):
    """Persist a QR access event in MongoDB out-of-band from the HTTP request.

    Replaces the previous `Thread(daemon=True)` approach: Celery guarantees
    retries on transient failures and honours graceful shutdown.
    """
    try:
        log_qr_event(payload)
    except Exception as exc:
        logger.warning('Retrying log_qr_event for %s: %s', payload.get('qr_jti'), exc)
        raise self.retry(exc=exc)
