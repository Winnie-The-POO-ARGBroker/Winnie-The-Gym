"""Signals that create AuditLog entries on model changes.

Attached to: Socio, User, PlanMembresia, Membresia.
Actor is retrieved from thread-local via apps.common.middleware.get_current_user().
"""
import json

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from apps.common.middleware import get_current_user
from .models import AuditLog

# Registry of model labels to audit.
_AUDITED_LABELS = {
    'members.Socio',
    'users.User',
    'memberships.PlanMembresia',
    'memberships.Membresia',
}

# Fields to exclude from diff (auto/internal noise).
_EXCLUDED_FIELDS = {'updated_at', 'created_at', 'password', 'last_login'}


def _model_label(instance):
    opts = instance._meta
    return f'{opts.app_label}.{opts.object_name}'


def _serialize_value(value):
    """Convert a field value to a JSON-safe primitive."""
    if value is None:
        return None
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    # ForeignKey / OneToOne / ManyToMany model instances → use pk.
    if hasattr(value, 'pk'):
        return value.pk
    # Decimal, UUID, etc. — fallback to str to stay JSON-safe.
    try:
        json.dumps(value)
        return value
    except (TypeError, ValueError):
        return str(value)


def _build_diff(old_instance, new_instance):
    """Return {field: [old, new]} for fields that changed."""
    diff = {}
    for field in new_instance._meta.concrete_fields:
        name = field.name
        if name in _EXCLUDED_FIELDS:
            continue
        new_val = _serialize_value(getattr(new_instance, name))
        old_val = _serialize_value(getattr(old_instance, name)) if old_instance else None
        if old_val != new_val:
            diff[name] = [old_val, new_val]
    return diff


# Store pre-save snapshots so post_save can diff them.
_pre_save_snapshots: dict[int, object] = {}


@receiver(pre_save)
def capture_pre_save(sender, instance, **kwargs):
    label = _model_label(instance)
    if label not in _AUDITED_LABELS:
        return
    if instance.pk:
        try:
            _pre_save_snapshots[id(instance)] = sender.objects.get(pk=instance.pk)
        except sender.DoesNotExist:
            _pre_save_snapshots[id(instance)] = None
    else:
        _pre_save_snapshots[id(instance)] = None


@receiver(post_save)
def create_audit_log(sender, instance, created, **kwargs):
    label = _model_label(instance)
    if label not in _AUDITED_LABELS:
        return

    old_instance = _pre_save_snapshots.pop(id(instance), None)
    action = AuditLog.Action.CREATE if created else AuditLog.Action.UPDATE
    diff = _build_diff(old_instance, instance)

    # Skip no-op updates (e.g. auto_now fields only).
    if not created and not diff:
        return

    actor = get_current_user()

    AuditLog.objects.create(
        actor=actor,
        action=action,
        entity_type=label,
        entity_id=instance.pk,
        changes_json=diff,
    )
