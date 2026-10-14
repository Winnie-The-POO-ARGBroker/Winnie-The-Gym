import datetime

from django.core.exceptions import ValidationError
from django.conf import settings
from django.db import models


# ---------------------------------------------------------------------------
# #180 Fase 1 — Instructor entity (profile without login)
# ---------------------------------------------------------------------------

class Instructor(models.Model):
    """Instructor profile entity — Fase 1 (no auth role).

    Stores the instructor's identity and contact info independently from
    the User model. Fase 2 (login + "Mis clases") is deferred post-defensa
    per ADR-004.
    """
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    email = models.EmailField(blank=True, default='')
    telefono = models.CharField(max_length=30, blank=True, default='')
    especialidades = models.JSONField(default=list, blank=True)
    bio = models.TextField(blank=True, default='')
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.nombre} {self.apellido}'

    class Meta:
        verbose_name = 'Instructor'
        verbose_name_plural = 'Instructores'
        ordering = ['apellido', 'nombre']


# ---------------------------------------------------------------------------
# #179 — Configurable Disciplina and Sala catalogs
# ---------------------------------------------------------------------------

class Disciplina(models.Model):
    """Configurable class discipline (replaces hardcoded Clase.Categoria choices)."""
    nombre = models.CharField(max_length=100, unique=True)
    color_hex = models.CharField(
        max_length=7, blank=True, default='#735d3e',
        help_text='Color in #RRGGBB format for UI display.',
    )
    slug = models.SlugField(max_length=100, unique=True)
    activa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = 'Disciplina'
        verbose_name_plural = 'Disciplinas'
        ordering = ['nombre']


class Sala(models.Model):
    """Configurable gym room with capacity enforcement."""
    nombre = models.CharField(max_length=100, unique=True)
    capacidad = models.PositiveIntegerField(default=0, help_text='Maximum capacity (0 = unlimited).')
    activa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = 'Sala'
        verbose_name_plural = 'Salas'
        ordering = ['nombre']


class Clase(models.Model):

    class Categoria(models.TextChoices):
        FUNCIONAL = 'funcional', 'Funcional'
        SPINNING = 'spinning', 'Spinning'
        CROSSFIT = 'crossfit', 'Crossfit'
        PILATES = 'pilates', 'Pilates'
        YOGA = 'yoga', 'Yoga'
        BOXEO = 'boxeo', 'Boxeo'
        HIIT = 'hiit', 'HIIT'

    class Estado(models.TextChoices):
        ACTIVA = 'activa', 'Activa'
        CANCELADA = 'cancelada', 'Cancelada'
        FINALIZADA = 'finalizada', 'Finalizada'

    class Dia(models.TextChoices):
        LUNES = 'lunes', 'Lunes'
        MARTES = 'martes', 'Martes'
        MIERCOLES = 'miercoles', 'Miercoles'
        JUEVES = 'jueves', 'Jueves'
        VIERNES = 'viernes', 'Viernes'
        SABADO = 'sabado', 'Sabado'
        DOMINGO = 'domingo', 'Domingo'

    nombre = models.CharField(max_length=120)
    categoria = models.CharField(max_length=50, choices=Categoria.choices, default=Categoria.FUNCIONAL)
    # #179 — FK to Disciplina (nullable for backwards compat; categoria remains for transition)
    disciplina_fk = models.ForeignKey(
        'classes.Disciplina',
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='clases',
        verbose_name='Disciplina',
    )
    descripcion = models.TextField(blank=True, default='')
    dia = models.CharField(max_length=20, choices=Dia.choices, default=Dia.LUNES)
    hora = models.TimeField(default=datetime.time(8, 0))
    duracion_min = models.PositiveIntegerField(default=45)
    sala = models.CharField(max_length=80, default='Sala A')
    # #179 — FK to Sala (nullable for backwards compat; sala CharField remains as fallback)
    sala_fk = models.ForeignKey(
        'classes.Sala',
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='clases',
        verbose_name='Sala (configurada)',
    )
    instructor = models.CharField(max_length=120, default='')
    # #180 Fase 1 — FK to Instructor entity (nullable for backwards compat)
    instructor_fk = models.ForeignKey(
        'classes.Instructor',
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='clases',
        verbose_name='Instructor (entidad)',
    )
    cupo_maximo = models.PositiveIntegerField(default=20)
    lista_espera_max = models.PositiveIntegerField(default=0)
    cancelacion_horas = models.PositiveIntegerField(default=2)
    planes_habilitados = models.JSONField(default=list, blank=True)
    recurrencia = models.CharField(max_length=100, default='Semanal - L/M/V')
    dias_recurrencia = models.JSONField(default=list, blank=True)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVA)
    fecha_cancelacion = models.DateTimeField(null=True, blank=True)
    motivo_cancelacion = models.TextField(blank=True, default='')
    cancelada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='clases_canceladas',
        verbose_name='Cancelada por',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        """#179 — Validate cupo_maximo <= sala_fk.capacidad when sala_fk is set."""
        if (
            self.sala_fk_id is not None
            and self.cupo_maximo is not None
            and self.sala_fk.capacidad > 0
            and self.cupo_maximo > self.sala_fk.capacidad
        ):
            raise ValidationError({
                'cupo_maximo': (
                    f'El cupo máximo ({self.cupo_maximo}) no puede superar la '
                    f'capacidad de la sala "{self.sala_fk.nombre}" ({self.sala_fk.capacidad}).'
                )
            })

    def __str__(self):
        return f'{self.nombre} ({self.dia} {self.hora}) - {self.sala}'

    @property
    def cupos_reservados(self):
        return self.inscripciones.filter(en_espera=False).count()

    class Meta:
        verbose_name = 'Clase'
        verbose_name_plural = 'Clases'
        ordering = ['id']


# ---------------------------------------------------------------------------
# #178 — SesionClase: concrete occurrence of a recurring Clase
# ---------------------------------------------------------------------------

class SesionClase(models.Model):
    """A concrete, date-specific occurrence of a recurring Clase.

    Stores per-session overrides (hour, cupo, instructor) and cancellation
    metadata. unique_together(clase, fecha) ensures no duplicate sessions.
    """

    class Estado(models.TextChoices):
        ACTIVA = 'activa', 'Activa'
        CANCELADA = 'cancelada', 'Cancelada'
        FINALIZADA = 'finalizada', 'Finalizada'

    clase = models.ForeignKey(
        'classes.Clase',
        on_delete=models.CASCADE,
        related_name='sesiones',
    )
    fecha = models.DateField(help_text='Specific date for this session.')
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.ACTIVA,
    )
    motivo_cancelacion = models.TextField(blank=True, default='')
    cancelada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='sesiones_canceladas',
    )
    fecha_cancelacion = models.DateTimeField(null=True, blank=True)
    # Per-session overrides — null means "use the Clase value"
    hora_override = models.TimeField(
        null=True, blank=True,
        help_text='Override class hour for this specific date.',
    )
    cupo_override = models.IntegerField(
        null=True, blank=True,
        help_text='Override cupo_maximo for this specific date.',
    )
    instructor_override_fk = models.ForeignKey(
        'classes.Instructor',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='sesiones_como_instructor',
        verbose_name='Instructor override',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.clase.nombre} — {self.fecha}'

    @property
    def hora_efectiva(self):
        """Return the session's effective hour (override or clase default)."""
        return self.hora_override if self.hora_override is not None else self.clase.hora

    @property
    def cupo_efectivo(self):
        """Return the session's effective cupo (override or clase default)."""
        return self.cupo_override if self.cupo_override is not None else self.clase.cupo_maximo

    class Meta:
        verbose_name = 'Sesión de Clase'
        verbose_name_plural = 'Sesiones de Clase'
        unique_together = [('clase', 'fecha')]
        ordering = ['fecha', 'clase']


class InscripcionClase(models.Model):
    clase = models.ForeignKey(
        'classes.Clase',
        on_delete=models.CASCADE,
        related_name='inscripciones',
    )
    # #178 — FK to SesionClase (nullable for transition; future enrollments link to a sesion)
    sesion = models.ForeignKey(
        'classes.SesionClase',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='inscripciones',
        verbose_name='Sesión',
    )
    socio = models.ForeignKey(
        'members.Socio',
        on_delete=models.CASCADE,
        related_name='inscripciones_clases',
    )
    asistio = models.BooleanField(null=True, blank=True, default=None)
    en_espera = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.socio} en {self.clase}'

    class Meta:
        verbose_name = 'Inscripción a Clase'
        verbose_name_plural = 'Inscripciones a Clases'
        unique_together = ('clase', 'socio')
        ordering = ['-created_at']
