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


def inscribir_socio(clase, socio):
    """Enroll a socio in a clase, placing them on the wait-list when cupo is full.

    Raises:
        ValidationError: if the socio is already enrolled, or both cupo and
                         lista de espera are at capacity.

    Returns:
        The newly created InscripcionClase instance.
    """
    if InscripcionClase.objects.filter(clase=clase, socio=socio).exists():
        raise ValidationError({'detail': 'Ya estás inscripto en esta clase.'})

    cupos_ocupados = clase.inscripciones.filter(en_espera=False).count()
    en_espera = cupos_ocupados >= clase.cupo_maximo

    if en_espera:
        en_lista = clase.inscripciones.filter(en_espera=True).count()
        if en_lista >= clase.lista_espera_max:
            raise ValidationError({'detail': 'La clase y su lista de espera están completas.'})

    return InscripcionClase.objects.create(
        clase=clase,
        socio=socio,
        en_espera=en_espera,
    )


def _next_clase_datetime(clase):
    """Return the next scheduled datetime for a recurring class in local tz."""
    now = timezone.localtime()
    target_weekday = DIA_TO_WEEKDAY[clase.dia]
    days_ahead = (target_weekday - now.weekday()) % 7
    candidate = now.replace(hour=clase.hora.hour, minute=clase.hora.minute, second=0, microsecond=0)
    candidate = candidate + timedelta(days=days_ahead)
    if candidate <= now:
        candidate = candidate + timedelta(days=7)
    return candidate


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
