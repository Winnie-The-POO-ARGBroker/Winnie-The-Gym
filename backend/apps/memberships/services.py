from datetime import date, timedelta
from django.db import transaction

from .models import Membresia


def renovar_membresia(socio, plan, fecha_inicio=None):
    """Create a new active Membresia for a socio, expiring any current active ones.

    Atomically transitions all active memberships to VENCIDA and creates a new
    ACTIVA membership with fecha_fin calculated from plan.duracion_dias.

    Args:
        socio: Socio instance to renew.
        plan: PlanMembresia instance to apply.
        fecha_inicio: Optional start date; defaults to today.

    Returns:
        The newly created Membresia instance.
    """
    if fecha_inicio is None:
        fecha_inicio = date.today()

    fecha_fin = fecha_inicio + timedelta(days=plan.duracion_dias)

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
