from datetime import datetime, timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.common.tasks import enqueue_email

from .models import Clase, InscripcionClase


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

DIA_TO_WEEKDAY = {
    Clase.Dia.LUNES: 0,
    Clase.Dia.MARTES: 1,
    Clase.Dia.MIERCOLES: 2,
    Clase.Dia.JUEVES: 3,
    Clase.Dia.VIERNES: 4,
    Clase.Dia.SABADO: 5,
    Clase.Dia.DOMINGO: 6,
}


def _next_clase_datetime(clase):
    """Return the next scheduled datetime for a recurring class in local tz.

    When `dias_recurrencia` is populated (list of Dia values), the next
    occurrence is the soonest weekday from that list that is strictly after
    now. Falls back to the single `clase.dia` field when the list is empty.
    """
    now = timezone.localtime()

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


# ---------------------------------------------------------------------------
# Wait-list promotion (atomic, reused by all 4 paths)
# ---------------------------------------------------------------------------

def promover_de_espera(clase):
    """Promote the oldest wait-listed socio to confirmed, if any slot is free.

    Must be called inside an existing ``transaction.atomic()`` block that already
    holds a ``select_for_update`` lock on the Clase row, OR it acquires its own
    lock when called as a standalone operation.

    Sends a promotion email via ``transaction.on_commit`` so the email is only
    dispatched after the transaction successfully commits.

    Returns:
        The promoted InscripcionClase instance, or None when nobody was promoted.
    """
    with transaction.atomic():
        locked_clase = Clase.objects.select_for_update().get(pk=clase.pk)

        cupos_ocupados = locked_clase.inscripciones.filter(en_espera=False).count()
        if cupos_ocupados >= locked_clase.cupo_maximo:
            return None

        next_in_line = (
            InscripcionClase.objects
            .select_related('socio__usuario')
            .filter(clase=locked_clase, en_espera=True)
            .order_by('created_at')
            .first()
        )
        if next_in_line is None:
            return None

        next_in_line.en_espera = False
        next_in_line.save(update_fields=['en_espera', 'updated_at'])

        # Capture values for the closure before the transaction commits.
        socio = next_in_line.socio
        user = getattr(socio, 'usuario', None)
        email = getattr(user, 'email', None) if user else None

        if email:
            _email = email
            _socio = socio
            _clase = locked_clase

            def _send():
                enqueue_email(
                    template_base='promocion_espera',
                    subject=f'¡Fuiste promovido! Tenés lugar en {_clase.nombre}',
                    to=[_email],
                    context={
                        'nombre': _socio.nombre,
                        'apellido': _socio.apellido,
                        'clase_nombre': _clase.nombre,
                        'clase_dia': _clase.get_dia_display(),
                        'clase_hora': _clase.hora.strftime('%H:%M'),
                    },
                    category='promocion_espera',
                )
            transaction.on_commit(_send)

    return next_in_line


# ---------------------------------------------------------------------------
# Clase cancellation / reactivation
# ---------------------------------------------------------------------------

def cancelar_clase(clase, motivo, actor=None):
    """Soft-cancel a Clase and notify all enrolled socios.

    Transitions ``activa → cancelada`` exactly once. Subsequent saves do NOT
    re-send emails because the signal compares previous state.

    Saves ``cancelada_por``, ``fecha_cancelacion``, ``motivo_cancelacion``.

    Returns:
        dict with ``confirmados_notificados`` and ``espera_notificados`` counts.

    Raises:
        ValidationError: if already cancelled or motivo < 10 chars.
    """
    if clase.estado == Clase.Estado.CANCELADA:
        raise ValidationError({'detail': 'La clase ya está cancelada.'})
    if len((motivo or '').strip()) < 10:
        raise ValidationError({'motivo': 'El motivo debe tener al menos 10 caracteres.'})

    clase.estado = Clase.Estado.CANCELADA
    clase.fecha_cancelacion = timezone.now()
    clase.motivo_cancelacion = motivo.strip()
    clase.cancelada_por = actor
    clase.save(update_fields=['estado', 'fecha_cancelacion', 'motivo_cancelacion', 'cancelada_por'])

    # Count notified (signal fires after save, returns these counts for the view)
    confirmados = clase.inscripciones.filter(en_espera=False).count()
    espera = clase.inscripciones.filter(en_espera=True).count()
    return {
        'confirmados_notificados': confirmados,
        'espera_notificados': espera,
    }


def reactivar_clase(clase):
    """Reactivate a cancelled class back to 'activa'.

    Raises:
        ValidationError: if the class is not currently cancelled.
    """
    if clase.estado != Clase.Estado.CANCELADA:
        raise ValidationError({'detail': 'Solo se pueden reactivar clases canceladas.'})

    clase.estado = Clase.Estado.ACTIVA
    clase.fecha_cancelacion = None
    clase.motivo_cancelacion = ''
    clase.cancelada_por = None
    clase.save(update_fields=['estado', 'fecha_cancelacion', 'motivo_cancelacion', 'cancelada_por'])


# ---------------------------------------------------------------------------
# Socio enrollment
# ---------------------------------------------------------------------------

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
            en_espera = False
        elif cupo_lleno:
            en_lista = locked_clase.inscripciones.filter(en_espera=True).count()
            if locked_clase.lista_espera_max == 0:
                raise ValidationError({'detail': 'Esta clase no tiene lista de espera.'})
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


# ---------------------------------------------------------------------------
# Socio inscription cancellation
# ---------------------------------------------------------------------------

def cancelar_inscripcion(clase, socio):
    """Cancel a socio's enrollment.

    Enforces the class's ``cancelacion_horas`` cut-off window.
    Calls ``promover_de_espera`` inside the delete transaction when a confirmed
    slot is freed, so promotion and email happen atomically.

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

    with transaction.atomic():
        inscripcion.delete()

        if not was_confirmed:
            return False

        promovido = promover_de_espera(clase)
        return promovido is not None


def eliminar_inscripcion(inscripcion):
    """Staff-only hard-delete of an enrollment.

    When a confirmed slot is freed, promotes the oldest wait-listed socio.

    Returns:
        True if a wait-listed socio was promoted, else False.
    """
    was_confirmed = not inscripcion.en_espera
    clase = inscripcion.clase

    with transaction.atomic():
        inscripcion.delete()

        if not was_confirmed:
            return False

        promovido = promover_de_espera(clase)
        return promovido is not None
