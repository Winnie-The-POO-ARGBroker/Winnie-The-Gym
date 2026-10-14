from django.core.exceptions import ValidationError
from django.db import models


class GymConfig(models.Model):
    """Singleton configuration table — only one row ever exists (pk=1).

    Callers should always use ``GymConfig.get()`` instead of direct ORM access.
    """

    nombre_gym = models.CharField(max_length=100, default='Winnie The Gym')
    aforo_maximo = models.IntegerField(default=200)
    hora_apertura = models.TimeField(default='07:00')
    hora_cierre = models.TimeField(null=True, blank=True, default=None)
    cierre_gracia_minutos = models.IntegerField(default=30)
    telefono_contacto = models.CharField(max_length=20, blank=True, default='')
    aforo_umbral_alerta_pct = models.IntegerField(default=90)
    aforo_bloqueo_al_llegar_max = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Configuración del Gimnasio'
        verbose_name_plural = 'Configuración del Gimnasio'

    def clean(self):
        """#158 — Validate that hora_cierre is after hora_apertura (or cross-midnight).

        When both are set and are equal, raise a ValidationError because that
        would mean the gym is never open. Cross-midnight ranges (cierre < apertura)
        are explicitly supported and considered valid.
        """
        if self.hora_apertura and self.hora_cierre:
            if self.hora_cierre == self.hora_apertura:
                raise ValidationError({
                    'hora_cierre': (
                        'El horario de cierre debe ser posterior al de apertura '
                        'o cruzar la medianoche.'
                    )
                })

    def save(self, *args, **kwargs):
        # Enforce singleton: always write to pk=1.
        self.pk = 1
        # Only run model-level clean(); skip validate_unique() because it
        # trips on the singleton's own pk=1 the second time it is saved.
        self.clean()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Prevent accidental deletion of the singleton.
        pass

    @classmethod
    def get(cls):
        """Return the singleton instance, creating it if it does not exist."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return self.nombre_gym
