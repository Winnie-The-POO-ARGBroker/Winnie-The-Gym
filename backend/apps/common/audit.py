"""MongoDB audit trail for CRUD operations on critical models.

Signals `post_save` and `post_delete` on `Socio`, `PlanMembresia`, `Membresia`,
`Clase` and `Pago` write an entry to the `audit_logs` collection via
`core.mongodb.log_audit_event`.

Actor detection uses `apps.common.middleware.CurrentUserMiddleware` — when a
request is in flight the user is thread-local; when the trigger is CLI, Celery
or a signal from another signal the actor is `None` with `actor_rol='system'`.
"""
import datetime as _dt
import decimal as _dec
import json
import logging
import uuid

from django.core.serializers.json import DjangoJSONEncoder
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.forms.models import model_to_dict

from core.mongodb import log_audit_event

from .middleware import get_current_user


logger = logging.getLogger(__name__)


class _AuditEncoder(DjangoJSONEncoder):
    """Serialize field values as strings when Mongo cannot store them directly."""

    def default(self, obj):
        if isinstance(obj, _dec.Decimal):
            return str(obj)
        if isinstance(obj, (_dt.date, _dt.datetime, _dt.time)):
            return obj.isoformat()
        if isinstance(obj, uuid.UUID):
            return str(obj)
        return super().default(obj)


def _serialize(instance):
    """Return a dict of the instance state that is safe to store in Mongo."""
    try:
        raw = model_to_dict(instance)
    except Exception:  # noqa: BLE001
        return {'id': getattr(instance, 'pk', None)}
    # Round-trip through the encoder to normalize Decimal/date/etc.
    return json.loads(json.dumps(raw, cls=_AuditEncoder))


def _describe_actor():
    user = get_current_user()
    if user is None or not getattr(user, 'is_authenticated', False):
        return {'actor_id': None, 'actor_email': None, 'actor_rol': 'system'}
    return {
        'actor_id': user.pk,
        'actor_email': getattr(user, 'email', None),
        'actor_rol': getattr(user, 'rol', None),
    }


def _dispatch(instance, action):
    model_label = f'{instance._meta.app_label}.{instance._meta.model_name}'
    payload = {
        'timestamp': _dt.datetime.now(_dt.timezone.utc).isoformat().replace('+00:00', 'Z'),
        'action': action,
        'model': model_label,
        'instance_id': getattr(instance, 'pk', None),
        'snapshot': _serialize(instance),
        **_describe_actor(),
    }
    try:
        log_audit_event(payload)
    except Exception as exc:  # noqa: BLE001
        logger.warning('Audit log failed for %s#%s (%s): %s', model_label, payload['instance_id'], action, exc)


# ---------------------------------------------------------------------------
# Signal registration
# ---------------------------------------------------------------------------
# Wire receivers here (not in signals.py) so the audit logic stays cohesive.

_AUDITED_MODELS = (
    ('members', 'Socio'),
    ('memberships', 'PlanMembresia'),
    ('memberships', 'Membresia'),
    ('classes', 'Clase'),
    ('payments', 'Pago'),
)


def _make_save_receiver(sender_label):
    def _receiver(sender, instance, created, **kwargs):
        _dispatch(instance, 'create' if created else 'update')
    _receiver.__name__ = f'audit_post_save_{sender_label}'
    return _receiver


def _make_delete_receiver(sender_label):
    def _receiver(sender, instance, **kwargs):
        _dispatch(instance, 'delete')
    _receiver.__name__ = f'audit_post_delete_{sender_label}'
    return _receiver


def register_audit_signals():
    """Called from apps.common.apps.CommonConfig.ready()."""
    from django.apps import apps as django_apps

    for app_label, model_name in _AUDITED_MODELS:
        try:
            sender = django_apps.get_model(app_label, model_name)
        except LookupError:
            logger.warning('Audit skipped: model %s.%s not installed.', app_label, model_name)
            continue
        label = f'{app_label}_{model_name}'.lower()
        post_save.connect(_make_save_receiver(label), sender=sender, weak=False, dispatch_uid=f'audit_save_{label}')
        post_delete.connect(_make_delete_receiver(label), sender=sender, weak=False, dispatch_uid=f'audit_delete_{label}')
