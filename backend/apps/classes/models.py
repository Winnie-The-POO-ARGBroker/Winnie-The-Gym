import datetime

from django.db import models


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
    descripcion = models.TextField(blank=True, default='')
    dia = models.CharField(max_length=20, choices=Dia.choices, default=Dia.LUNES)
    hora = models.TimeField(default=datetime.time(8, 0))
    duracion_min = models.PositiveIntegerField(default=45)
    sala = models.CharField(max_length=80, default='Sala A')
    instructor = models.CharField(max_length=120, default='')
    cupo_maximo = models.PositiveIntegerField(default=20)
    lista_espera_max = models.PositiveIntegerField(default=5)
    cancelacion_horas = models.PositiveIntegerField(default=2)
    planes_habilitados = models.JSONField(default=list, blank=True)
    recurrencia = models.CharField(max_length=100, default='Semanal - L/M/V')
    dias_recurrencia = models.JSONField(default=list, blank=True)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVA)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.nombre} ({self.dia} {self.hora}) - {self.sala}'

    @property
    def cupos_reservados(self):
        return self.inscripciones.filter(en_espera=False).count()

    class Meta:
        verbose_name = 'Clase'
        verbose_name_plural = 'Clases'
        ordering = ['id']


class InscripcionClase(models.Model):
    clase = models.ForeignKey(
        'classes.Clase',
        on_delete=models.CASCADE,
        related_name='inscripciones',
    )
    socio = models.ForeignKey(
        'members.Socio',
        on_delete=models.CASCADE,
        related_name='inscripciones_clases',
    )
    asistio = models.BooleanField(default=False)
    en_espera = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.socio} en {self.clase}'

    class Meta:
        verbose_name = 'Inscripción a Clase'
        verbose_name_plural = 'Inscripciones a Clases'
        unique_together = ('clase', 'socio')
