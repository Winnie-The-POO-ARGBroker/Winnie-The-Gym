import datetime
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


@shared_task(
    name='access.publish_qr_history',
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=30,
    max_retries=3,
)
def publish_qr_history(self, payload: dict):
    """#159 — Publish a QR access event to MongoDB with guaranteed delivery.

    Uses autoretry_for so any transient Mongo or network error is retried
    automatically up to 3 times with a 30-second backoff. Permanent failures
    are logged at ERROR level so Sentry captures them.

    The `timestamp` field is stored as a datetime.datetime (UTC) object, NOT
    as a string, to ensure TTL indexes work correctly.
    """
    # Normalise timestamp: accept ISO strings or datetime objects, store as datetime UTC.
    raw_ts = payload.get('timestamp')
    if isinstance(raw_ts, str):
        try:
            ts = datetime.datetime.fromisoformat(raw_ts)
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=datetime.timezone.utc)
            else:
                ts = ts.astimezone(datetime.timezone.utc)
        except (ValueError, TypeError):
            ts = datetime.datetime.now(tz=datetime.timezone.utc)
    elif isinstance(raw_ts, datetime.datetime):
        if raw_ts.tzinfo is None:
            ts = raw_ts.replace(tzinfo=datetime.timezone.utc)
        else:
            ts = raw_ts.astimezone(datetime.timezone.utc)
    else:
        ts = datetime.datetime.now(tz=datetime.timezone.utc)

    payload_to_save = {**payload, 'timestamp': ts}

    try:
        log_qr_event(payload_to_save)
    except Exception as exc:
        logger.error(
            'publish_qr_history failed (attempt %d/%d) for jti=%s: %s',
            self.request.retries + 1,
            self.max_retries + 1,
            payload.get('qr_jti'),
            exc,
            exc_info=True,
        )
        raise
