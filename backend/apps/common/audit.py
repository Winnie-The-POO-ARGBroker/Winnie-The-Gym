"""MongoDB audit trail for CRUD operations on critical models.

Signals `pre_save`, `post_save` and `post_delete` on `Socio`, `PlanMembresia`,
`Membresia`, `Clase`, `User` and `Pago` write an entry to the `audit_logs`
collection via `core.mongodb.log_audit_event`.

On updates, the `pre_save` signal captures a snapshot of the instance before
the write, and `post_save` computes a field-level diff (using `deepdiff`) that
is stored alongside the audit entry for full traceability (RNF04).

Actor detection uses `apps.common.middleware.CurrentUserMiddleware` — when a
request is in flight the user is thread-local; when the trigger is CLI, Celery
or a signal from another signal the actor is `None` with `actor_rol='system'`.
"""
import datetime as _dt
import decimal as _dec
import json
import logging
import uuid

from deepdiff import DeepDiff
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models.signals import post_delete, post_save, pre_save
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
        return {
            'actor_id': None,
            'actor_user_id': None,
            'actor_email': None,
            'actor_rol': 'system',
        }
    return {
        'actor_id': user.pk,
        'actor_user_id': user.pk,
        'actor_email': getattr(user, 'email', None),
        'actor_rol': getattr(user, 'rol', None),
    }


def _capture_pre_state(instance):
    """Snapshot the current DB state of the instance before the write.

    Called from the `pre_save` signal. Stores the serialised dict on a
    transient attribute ``_audit_pre_state`` so that `post_save` can
    compute the diff without an extra DB query.
    """
    if instance.pk is None:
        # New instance — no previous state exists.
        instance._audit_pre_state = {}
        return
    try:
        db_instance = instance.__class__.objects.get(pk=instance.pk)
        instance._audit_pre_state = _serialize(db_instance)
    except instance.__class__.DoesNotExist:
        instance._audit_pre_state = {}


def _compute_diff(pre_state, post_state):
    """Return a flat ``{field: {old, new}}`` dict from two serialised snapshots.

    Uses ``deepdiff`` to detect value changes and presents them in the
    format the issue specifies::

        {"precio": {"old": "1500.00", "new": "2000.00"}}

    Internal / noisy fields (timestamps, state metadata) are included — the
    audit trail should capture *everything* that changed.
    """
    if not pre_state:
        return {}

    diff = DeepDiff(pre_state, post_state, ignore_order=True, verbose_level=2)
    result = {}

    for changed_key, details in diff.get('values_changed', {}).items():
        # DeepDiff keys look like "root['precio']" — extract the field name.
        field_name = changed_key.replace("root['", '').replace("']", '')
        result[field_name] = {
            'old': details.get('old_value'),
            'new': details.get('new_value'),
        }

    for changed_key, details in diff.get('type_changes', {}).items():
        field_name = changed_key.replace("root['", '').replace("']", '')
        result[field_name] = {
            'old': details.get('old_value'),
            'new': details.get('new_value'),
        }

    return result


def _get_request_id():
    """Obtain the current request_id from contextvars (issue #58 integration)."""
    try:
        from core.middleware.request_id import get_request_id
        return get_request_id() or None
    except ImportError:
        return None


def _dispatch(instance, action, diff=None):
    model_label = f'{instance._meta.app_label}.{instance._meta.model_name}'
    pk = getattr(instance, 'pk', None)
    payload = {
        'timestamp': _dt.datetime.now(_dt.timezone.utc).isoformat().replace('+00:00', 'Z'),
        'action': action,
        'model': model_label,
        'instance_id': pk,
        'object_id': pk,
        'snapshot': _serialize(instance),
        **_describe_actor(),
        'request_id': _get_request_id(),
    }
    if diff is not None:
        payload['diff'] = diff
    try:
        log_audit_event(payload)
    except Exception as exc:  # noqa: BLE001
        logger.warning('Audit log failed for %s#%s (%s): %s', model_label, pk, action, exc)


# ---------------------------------------------------------------------------
# Signal registration
# ---------------------------------------------------------------------------
# Wire receivers here (not in signals.py) so the audit logic stays cohesive.

_AUDITED_MODELS = (
    ('members', 'Socio'),
    ('memberships', 'PlanMembresia'),
    ('memberships', 'Membresia'),
    ('classes', 'Clase'),
    ('users', 'User'),
    ('payments', 'Pago'),
)


def _make_pre_save_receiver(sender_label):
    """Factory for pre_save receivers that capture DB state before the write."""
    def _receiver(sender, instance, **kwargs):
        _capture_pre_state(instance)
    _receiver.__name__ = f'audit_pre_save_{sender_label}'
    return _receiver


def _make_save_receiver(sender_label):
    """Factory for post_save receivers that emit the audit entry with diff."""
    def _receiver(sender, instance, created, **kwargs):
        if created:
            _dispatch(instance, 'create')
        else:
            pre_state = getattr(instance, '_audit_pre_state', {})
            post_state = _serialize(instance)
            diff = _compute_diff(pre_state, post_state)
            _dispatch(instance, 'update', diff=diff)
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
        pre_save.connect(_make_pre_save_receiver(label), sender=sender, weak=False, dispatch_uid=f'audit_pre_{label}')
        post_save.connect(_make_save_receiver(label), sender=sender, weak=False, dispatch_uid=f'audit_save_{label}')
        post_delete.connect(_make_delete_receiver(label), sender=sender, weak=False, dispatch_uid=f'audit_delete_{label}')
