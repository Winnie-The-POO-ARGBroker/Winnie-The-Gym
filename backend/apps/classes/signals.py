import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.common.tasks import enqueue_email

from .models import Clase


logger = logging.getLogger(__name__)


@receiver(post_save, sender=Clase)
def notify_inscriptos_on_cancelacion(sender, instance, created, **kwargs):
    """When a Clase transitions to 'cancelada', email all enrolled socios."""
    if created:
        return
    if instance.estado != Clase.Estado.CANCELADA:
        return

    inscripciones = instance.inscripciones.select_related('socio__usuario').filter(en_espera=False)

    for inscripcion in inscripciones:
        socio = inscripcion.socio
        user = getattr(socio, 'usuario', None)
        if not user or not user.email:
            logger.debug(
                'Skipping class cancellation email for socio %s — no email.',
                socio.pk,
            )
            continue

        enqueue_email(
            template_base='clase_cancelada',
            subject=f'Clase cancelada: {instance.nombre}',
            to=[user.email],
            context={
                'nombre': socio.nombre,
                'apellido': socio.apellido,
                'clase_nombre': instance.nombre,
                'clase_dia': instance.get_dia_display(),
                'clase_hora': instance.hora.strftime('%H:%M'),
                'motivo': instance.motivo_cancelacion or 'Sin motivo especificado.',
                'fecha_cancelacion': (
                    instance.fecha_cancelacion.strftime('%d/%m/%Y %H:%M')
                    if instance.fecha_cancelacion else ''
                ),
            },
            category='clase_cancelada',
        )
        logger.info(
            'Queued cancellation email for class %s to socio %s.',
            instance.pk, socio.pk,
        )
