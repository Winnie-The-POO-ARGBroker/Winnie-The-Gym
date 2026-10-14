from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class CierreGimnasio(models.Model):
    """Planned gym closure or holiday — blocks reservations and physical access.

    A closure can affect the entire gym ('todo') or a single sala ('sala').
    date ranges are inclusive: [fecha_desde, fecha_hasta].
    Overlapping ranges are intentionally permitted (e.g. partial + full day).
    """

    class Afecta(models.TextChoices):
        TODO = 'todo', 'Todo el gym'
        SALA = 'sala', 'Una sala'

    fecha_desde = models.DateField(verbose_name='Fecha desde')
    fecha_hasta = models.DateField(verbose_name='Fecha hasta')
    motivo = models.CharField(max_length=200, verbose_name='Motivo')
    afecta = models.CharField(
        max_length=10,
        choices=Afecta.choices,
        default=Afecta.TODO,
        verbose_name='Ámbito',
    )
    sala = models.ForeignKey(
        'classes.Sala',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cierres',
        verbose_name='Sala',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cierres_creados',
        verbose_name='Creado por',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')

    class Meta:
        verbose_name = 'Cierre del Gimnasio'
        verbose_name_plural = 'Cierres del Gimnasio'
        ordering = ['-fecha_desde']

    def __str__(self):
        return f'Cierre {self.fecha_desde} → {self.fecha_hasta}: {self.motivo}'


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
