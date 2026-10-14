from datetime import date, timedelta
from django.db import transaction
from django.utils import timezone

from .models import Membresia


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
