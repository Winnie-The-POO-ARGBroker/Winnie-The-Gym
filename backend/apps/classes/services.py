from datetime import datetime, timedelta

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Clase, InscripcionClase


def cancelar_clase(clase, motivo, actor=None):
    """Soft-cancel a Clase.

    Sets the class to 'cancelada' state with a timestamp and reason.
    The post_save signal in apps.classes.signals fires after this, enqueueing
    cancellation emails to all enrolled socios.

    Raises:
        ValidationError: if the class is already cancelled or if the motivo
                         is fewer than 10 characters.
    """
    if clase.estado == Clase.Estado.CANCELADA:
        raise ValidationError({'detail': 'La clase ya está cancelada.'})
    if len((motivo or '').strip()) < 10:
        raise ValidationError({'motivo': 'El motivo debe tener al menos 10 caracteres.'})

    clase.estado = Clase.Estado.CANCELADA
    clase.fecha_cancelacion = timezone.now()
    clase.motivo_cancelacion = motivo.strip()
    clase.save(update_fields=['estado', 'fecha_cancelacion', 'motivo_cancelacion'])


DIA_TO_WEEKDAY = {
    Clase.Dia.LUNES: 0,
    Clase.Dia.MARTES: 1,
    Clase.Dia.MIERCOLES: 2,
    Clase.Dia.JUEVES: 3,
    Clase.Dia.VIERNES: 4,
    Clase.Dia.SABADO: 5,
    Clase.Dia.DOMINGO: 6,
}


def inscribir_socio(clase, socio, *, forzar=False):
    """Enroll a socio in a clase, placing them on the wait-list when cupo is full.

    Validates:
      1. Class is active (not 'cancelada' or 'finalizada').
      2. Socio is active (not 'baja' or 'suspendido').
      3. Socio has an active membership with fecha_inicio <= today <= fecha_fin.
      4. If clase.planes_habilitados is non-empty: socio's plan must be in the list.
      5. Concurrency-safe cupo check via select_for_update inside atomic transaction.
      6. forzar=True (admin only) allows overcapacity enrollment.

    Raises:
        ValidationError: for any of the above validation failures, or when both
                         cupo and lista de espera are at capacity.

    Returns:
        The newly created InscripcionClase instance.
    """
    from datetime import date
    from django.db import transaction
    from apps.memberships.models import Membresia  # noqa: PLC0415

    # 1. Class must be active
    if clase.estado in (Clase.Estado.CANCELADA, Clase.Estado.FINALIZADA):
        raise ValidationError({'detail': 'No podés inscribirte en una clase cancelada o finalizada.'})

    # 2. Socio must be active
    if socio.estado in ('baja', 'suspendido'):
        raise ValidationError({'detail': 'Tu cuenta de socio no está activa.'})

    # 3. Active membership with valid dates
    today = date.today()
    membresia = (
        Membresia.objects
        .filter(socio=socio, estado=Membresia.Estado.ACTIVA)
        .select_related('plan')
        .order_by('-fecha_fin')
        .first()
    )
    if membresia is None or not (membresia.fecha_inicio <= today <= membresia.fecha_fin):
        raise ValidationError({'detail': 'No tenés una membresía activa vigente.'})

    # 4. Plan filter — empty list means all plans allowed
    planes_habilitados = clase.planes_habilitados or []
    if planes_habilitados:
        plan_id = membresia.plan_id
        if plan_id not in planes_habilitados:
            plan_nombre = membresia.plan.nombre
            raise ValidationError({
                'detail': f'Tu plan ({plan_nombre}) no incluye esta clase.',
            })

    # 5. Duplicate check + concurrency-safe cupo enforcement
    if InscripcionClase.objects.filter(clase=clase, socio=socio).exists():
        raise ValidationError({'detail': 'Ya estás inscripto en esta clase.'})

    with transaction.atomic():
        # Lock the Clase row to serialize concurrent inscriptions
        locked_clase = Clase.objects.select_for_update().get(pk=clase.pk)

        cupos_ocupados = locked_clase.inscripciones.filter(en_espera=False).count()
        cupo_lleno = cupos_ocupados >= locked_clase.cupo_maximo

        if cupo_lleno and forzar:
            # Admin override — confirm cupo but mark as espera if truly over
            en_espera = False
        elif cupo_lleno:
            en_lista = locked_clase.inscripciones.filter(en_espera=True).count()
            if en_lista >= locked_clase.lista_espera_max:
                raise ValidationError({'detail': 'La clase y su lista de espera están completas.'})
            en_espera = True
        else:
            en_espera = False

        return InscripcionClase.objects.create(
            clase=locked_clase,
            socio=socio,
            en_espera=en_espera,
        )


def _next_clase_datetime(clase):
    """Return the next scheduled datetime for a recurring class in local tz.

    When `dias_recurrencia` is populated (list of Dia values), the next
    occurrence is the soonest weekday from that list that is strictly after
    now. Falls back to the single `clase.dia` field when the list is empty.
    """
    now = timezone.localtime()

    # Build candidate weekdays from dias_recurrencia or fall back to clase.dia
    dias = clase.dias_recurrencia or []
    if dias:
        target_weekdays = sorted({DIA_TO_WEEKDAY[d] for d in dias if d in DIA_TO_WEEKDAY})
    else:
        target_weekdays = [DIA_TO_WEEKDAY[clase.dia]]

    best_candidate = None
    for target_weekday in target_weekdays:
        days_ahead = (target_weekday - now.weekday()) % 7
        candidate = now.replace(hour=clase.hora.hour, minute=clase.hora.minute, second=0, microsecond=0)
        candidate = candidate + timedelta(days=days_ahead)
        if candidate <= now:
            candidate = candidate + timedelta(days=7)
        if best_candidate is None or candidate < best_candidate:
            best_candidate = candidate

    return best_candidate


def cancelar_inscripcion(clase, socio):
    """Cancel a socio's enrollment (HU07).

    Enforces the class's `cancelacion_horas` cut-off window and promotes the
    oldest waiting-list entry when a confirmed slot is freed.

    Raises:
        ValidationError: when the socio is not enrolled or the cancellation
                         happens inside the cut-off window.

    Returns:
        True if a wait-listed socio was promoted to a confirmed slot, else False.
    """
    try:
        inscripcion = InscripcionClase.objects.get(clase=clase, socio=socio)
    except InscripcionClase.DoesNotExist:
        raise ValidationError({'detail': 'No tenés una inscripción vigente en esta clase.'})

    next_start = _next_clase_datetime(clase)
    cutoff = next_start - timedelta(hours=clase.cancelacion_horas)
    if timezone.localtime() > cutoff:
        raise ValidationError({
            'detail': (
                f'Fuera del margen para cancelar. El límite es '
                f'{clase.cancelacion_horas} horas antes del inicio.'
            ),
        })

    was_confirmed = not inscripcion.en_espera
    inscripcion.delete()

    if not was_confirmed:
        return False

    next_in_line = (
        InscripcionClase.objects
        .filter(clase=clase, en_espera=True)
        .order_by('created_at')
        .first()
    )
    if next_in_line is None:
        return False

    next_in_line.en_espera = False
    next_in_line.save(update_fields=['en_espera'])
    return True
