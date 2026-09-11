import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.members.models import Socio

from .tasks import enqueue_email


logger = logging.getLogger(__name__)


@receiver(post_save, sender=Socio)
def send_welcome_email_on_socio_create(sender, instance, created, **kwargs):
    """Enqueue the welcome email when a Socio is created with a linked user."""
    if not created:
        return

    user = getattr(instance, 'usuario', None)
    if not user or not user.email:
        logger.debug('Skipping welcome email — socio %s has no user email.', instance.pk)
        return

    enqueue_email(
        template_base='welcome',
        subject='¡Bienvenido/a a Winnie The Gym!',
        to=[user.email],
        context={
            'nombre': instance.nombre,
            'apellido': instance.apellido,
            'numero_socio': instance.numero_socio,
        },
        category='welcome',
    )
