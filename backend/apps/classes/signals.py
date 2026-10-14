"""Signals for the classes app.

Cancellation email logic:
  - ``pre_save`` snapshot captures the previous estado before any save.
  - ``post_save`` fires emails only on the activa → cancelada transition.
  - Emails are enqueued via ``transaction.on_commit`` to avoid sending before
    the DB transaction commits.
  - Subsequent saves on an already-cancelled class do NOT re-send emails.
"""
import logging

from django.db import transaction
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from apps.common.tasks import enqueue_email

from .models import Clase


logger = logging.getLogger(__name__)

# Thread-local snapshot: maps instance id → previous estado string (or None for new objects)
_estado_snapshot: dict[int, str | None] = {}


@receiver(pre_save, sender=Clase)
def snapshot_estado_before_save(sender, instance, **kwargs):
    """Capture the previous estado before the model is saved."""
    if instance.pk:
        try:
            previous = Clase.objects.get(pk=instance.pk)
            _estado_snapshot[id(instance)] = previous.estado
        except Clase.DoesNotExist:
            _estado_snapshot[id(instance)] = None
    else:
        _estado_snapshot[id(instance)] = None


@receiver(post_save, sender=Clase)
def notify_inscriptos_on_cancelacion(sender, instance, created, **kwargs):
    """Email all enrolled socios when a class transitions to 'cancelada'.

    Fires only on the activa → cancelada transition (idempotent on subsequent
    saves of an already-cancelled class).
    """
    if created:
        _estado_snapshot.pop(id(instance), None)
        return

    previous_estado = _estado_snapshot.pop(id(instance), None)

    # Only fire on a genuine transition to cancelada
    if previous_estado == Clase.Estado.CANCELADA or instance.estado != Clase.Estado.CANCELADA:
        return

    # Confirmed enrollees
    inscripciones_confirmadas = list(
        instance.inscripciones.select_related('socio__usuario').filter(en_espera=False)
    )
    # Wait-listed enrollees
    inscripciones_espera = list(
        instance.inscripciones.select_related('socio__usuario').filter(en_espera=True)
    )

    common_context = {
        'clase_nombre': instance.nombre,
        'clase_dia': instance.get_dia_display(),
        'clase_hora': instance.hora.strftime('%H:%M'),
        'motivo': instance.motivo_cancelacion or 'Sin motivo especificado.',
        'fecha_cancelacion': (
            instance.fecha_cancelacion.strftime('%d/%m/%Y %H:%M')
            if instance.fecha_cancelacion else ''
        ),
    }

    def _enqueue_all(inscripciones_confirmadas=inscripciones_confirmadas,
                     inscripciones_espera=inscripciones_espera,
                     common_context=common_context,
                     nombre_clase=instance.nombre):
        for inscripcion in inscripciones_confirmadas:
            socio = inscripcion.socio
            user = getattr(socio, 'usuario', None)
            if not user or not user.email:
                logger.debug(
                    'Skipping cancellation email for socio %s — no email.',
                    socio.pk,
                )
                continue
            enqueue_email(
                template_base='clase_cancelada',
                subject=f'Clase cancelada: {nombre_clase}',
                to=[user.email],
                context={**common_context, 'nombre': socio.nombre, 'apellido': socio.apellido},
                category='clase_cancelada',
            )
            logger.info('Queued cancellation email for class %s to socio %s.', socio.pk, socio.pk)

        for inscripcion in inscripciones_espera:
            socio = inscripcion.socio
            user = getattr(socio, 'usuario', None)
            if not user or not user.email:
                continue
            enqueue_email(
                template_base='clase_cancelada_espera',
                subject=f'Clase cancelada: {nombre_clase}',
                to=[user.email],
                context={**common_context, 'nombre': socio.nombre, 'apellido': socio.apellido, 'en_espera': True},
                category='clase_cancelada',
            )
            logger.info('Queued waitlist cancellation email for class to socio %s.', socio.pk)

    transaction.on_commit(_enqueue_all)
