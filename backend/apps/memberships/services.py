from datetime import date, timedelta
from django.db import transaction
from django.utils import timezone

from .models import Membresia


# ---------------------------------------------------------------------------
# Valid state transitions (#188)
# ---------------------------------------------------------------------------

# Maps (current_estado) → set of estados reachable from it
VALID_TRANSITIONS = {
    Membresia.Estado.ACTIVA: {Membresia.Estado.SUSPENDIDA, Membresia.Estado.CANCELADA},
    Membresia.Estado.SUSPENDIDA: {Membresia.Estado.ACTIVA, Membresia.Estado.CANCELADA},
    Membresia.Estado.VENCIDA: {Membresia.Estado.CANCELADA},
    Membresia.Estado.PENDIENTE_PAGO: {Membresia.Estado.CANCELADA},
    Membresia.Estado.CANCELADA: set(),  # terminal — no further transitions
}


def _set_lifecycle_fields(membresia, nuevo_estado, actor, motivo):
    """Apply estado transition and audit fields atomically (caller holds atomic block)."""
    now = timezone.now()
    membresia.estado = nuevo_estado
    membresia.motivo_estado = motivo or ''
    membresia.cambiado_por = actor
    membresia.cambiado_en = now
    membresia.save(update_fields=['estado', 'motivo_estado', 'cambiado_por', 'cambiado_en', 'updated_at'])


def suspender_membresia(membresia, actor, motivo):
    """Transition ACTIVA → SUSPENDIDA. Records fecha_suspension for future reactivation math.

    Args:
        membresia: Membresia instance.
        actor: User instance triggering the action.
        motivo: Non-empty reason string (required).

    Returns:
        Updated Membresia instance.

    Raises:
        ValueError: If the transition is not allowed or motivo is missing.
    """
    if not motivo or not motivo.strip():
        raise ValueError('El motivo es obligatorio para suspender una membresía.')

    if Membresia.Estado.SUSPENDIDA not in VALID_TRANSITIONS.get(membresia.estado, set()):
        raise ValueError(
            f"No se puede suspender una membresía en estado '{membresia.estado}'."
        )

    with transaction.atomic():
        membresia.fecha_suspension = timezone.localdate()
        membresia.save(update_fields=['fecha_suspension', 'updated_at'])
        _set_lifecycle_fields(membresia, Membresia.Estado.SUSPENDIDA, actor, motivo)

    return membresia


def reactivar_membresia(membresia, actor, motivo=''):
    """Transition SUSPENDIDA → ACTIVA. Extends fecha_fin by the days suspended.

    The date extension ensures the socio does not lose paid time due to the suspension.

    Args:
        membresia: Membresia instance (must be SUSPENDIDA).
        actor: User triggering the action.
        motivo: Optional reason string.

    Returns:
        Updated Membresia instance.

    Raises:
        ValueError: If the transition is not allowed.
    """
    if Membresia.Estado.ACTIVA not in VALID_TRANSITIONS.get(membresia.estado, set()):
        raise ValueError(
            f"No se puede reactivar una membresía en estado '{membresia.estado}'."
        )

    today = timezone.localdate()
    days_suspended = 0
    if membresia.fecha_suspension:
        days_suspended = max(0, (today - membresia.fecha_suspension).days)

    with transaction.atomic():
        if days_suspended > 0:
            membresia.fecha_fin = membresia.fecha_fin + timedelta(days=days_suspended)
        membresia.fecha_suspension = None
        membresia.save(update_fields=['fecha_fin', 'fecha_suspension', 'updated_at'])
        _set_lifecycle_fields(membresia, Membresia.Estado.ACTIVA, actor, motivo)

    return membresia


def cancelar_membresia(membresia, actor, motivo):
    """Transition any non-CANCELADA estado → CANCELADA (terminal).

    Args:
        membresia: Membresia instance.
        actor: User triggering the action (admin only; view enforces this).
        motivo: Non-empty reason string (required).

    Returns:
        Updated Membresia instance.

    Raises:
        ValueError: If the transition is not allowed or motivo is missing.
    """
    if not motivo or not motivo.strip():
        raise ValueError('El motivo es obligatorio para cancelar una membresía.')

    if Membresia.Estado.CANCELADA not in VALID_TRANSITIONS.get(membresia.estado, set()):
        raise ValueError(
            f"No se puede cancelar una membresía en estado '{membresia.estado}'."
        )

    with transaction.atomic():
        _set_lifecycle_fields(membresia, Membresia.Estado.CANCELADA, actor, motivo)

    return membresia


def renovar_membresia(socio, plan, *, fecha_inicio=None, politica='stack'):
    """Create a new active Membresia for a socio.

    Supports two renewal policies:
    - ``politica='stack'`` (default): remaining days from the current active
      membership are accumulated on top of the new plan's duration. This is
      the fair behavior so the socio never loses prepaid time.
    - ``politica='replace'``: current active memberships are expired immediately
      and the new plan starts from ``fecha_inicio`` (or today).

    Atomically transitions all active memberships to VENCIDA and creates a new
    ACTIVA membership.

    Args:
        socio: Socio instance to renew.
        plan: PlanMembresia instance to apply.
        fecha_inicio: Optional start date; defaults to today.
        politica: 'stack' (default) or 'replace'.

    Returns:
        The newly created Membresia instance.
    """
    if fecha_inicio is None:
        fecha_inicio = date.today()

    extra_days = 0
    if politica == 'stack':
        today = timezone.localdate()
        active = socio.membresias.filter(estado=Membresia.Estado.ACTIVA).order_by('-fecha_fin').first()
        if active and active.fecha_fin > today:
            extra_days = (active.fecha_fin - today).days

    fecha_fin = fecha_inicio + timedelta(days=plan.duracion_dias + extra_days)

    with transaction.atomic():
        socio.membresias.filter(
            estado=Membresia.Estado.ACTIVA,
        ).update(estado=Membresia.Estado.VENCIDA)

        return socio.membresias.create(
            plan=plan,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            estado=Membresia.Estado.ACTIVA,
        )
