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
    # Terminal and informational: only renovar_membresia sets it, never the transition API.
    Membresia.Estado.RENOVADA: set(),
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


def cancelar_membresia_por_anulacion(membresia, actor, motivo):
    """Cancel a membership because the payment that created it was annulled.

    Unlike ``cancelar_membresia`` this also accepts RENOVADA rows: a renewal that was
    already superseded by a later one still has its sale reversed, and it must end up
    CANCELADA (a reversed sale) instead of staying RENOVADA with an annulled payment,
    where reports would count it and a later restore could bring it back. Not reachable
    from the public lifecycle endpoints.

    Raises:
        ValueError: If the membership is already CANCELADA or motivo is missing.
    """
    if not motivo or not motivo.strip():
        raise ValueError('El motivo es obligatorio para cancelar una membresía.')
    if membresia.estado == Membresia.Estado.CANCELADA:
        raise ValueError('La membresía ya está cancelada.')

    with transaction.atomic():
        _set_lifecycle_fields(membresia, Membresia.Estado.CANCELADA, actor, motivo)

    return membresia


def restaurar_membresia_renovada(membresia_cancelada, actor, motivo):
    """Undo a renewal: give the previous RENOVADA membership back its ACTIVA state.

    Called when the payment that created ``membresia_cancelada`` is annulled. This is a
    dedicated path on purpose: RENOVADA -> ACTIVA is deliberately absent from
    VALID_TRANSITIONS and unreachable from the lifecycle endpoints.

    The previous membership is restored only when ALL of these hold; otherwise nothing
    changes and None is returned (never raises for a business-rule miss):
    - ``membresia_cancelada`` is the socio's current one (no later non-cancelled row).
    - The candidate is the socio's most recent RENOVADA row before it.
    - The candidate has not ended (fecha_fin >= today).
    - The socio has no other ACTIVA membership.

    Returns:
        The restored Membresia, or None when nothing was restored.
    """
    socio = membresia_cancelada.socio

    with transaction.atomic():
        # Lock the socio's rows so two concurrent annulments cannot both pass the checks
        # below and leave two ACTIVA memberships.
        rows = Membresia.objects.filter(socio=socio)
        list(rows.select_for_update().values_list('pk', flat=True))

        if rows.filter(pk__gt=membresia_cancelada.pk).exclude(
            estado=Membresia.Estado.CANCELADA,
        ).exists():
            return None

        candidata = rows.filter(
            estado=Membresia.Estado.RENOVADA, pk__lt=membresia_cancelada.pk,
        ).order_by('-pk').first()
        if candidata is None or candidata.fecha_fin < timezone.localdate():
            return None

        if rows.filter(estado=Membresia.Estado.ACTIVA).exists():
            return None

        _set_lifecycle_fields(candidata, Membresia.Estado.ACTIVA, actor, motivo)

    return candidata


def renovar_membresia(socio, plan, *, fecha_inicio=None, politica='stack'):
    """Create a new active Membresia for a socio.

    Supports two renewal policies:
    - ``politica='stack'`` (default): remaining days from the current active
      membership are accumulated on top of the new plan's duration. This is
      the fair behavior so the socio never loses prepaid time.
    - ``politica='replace'``: current active memberships are expired immediately
      and the new plan starts from ``fecha_inicio`` (or today).

    Atomically retires the socio's active memberships and creates a new ACTIVA
    one. Those still running at ``fecha_inicio`` were superseded by this renewal
    (their days are carried over) and become RENOVADA; those that had already
    ended (lazy expiry not yet applied) become VENCIDA.

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
        activas = socio.membresias.filter(estado=Membresia.Estado.ACTIVA)
        activas.filter(fecha_fin__gte=fecha_inicio).update(estado=Membresia.Estado.RENOVADA)
        activas.filter(fecha_fin__lt=fecha_inicio).update(estado=Membresia.Estado.VENCIDA)

        return socio.membresias.create(
            plan=plan,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            estado=Membresia.Estado.ACTIVA,
        )
