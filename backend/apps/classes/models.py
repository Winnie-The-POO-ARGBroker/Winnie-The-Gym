from django.db import models


class Clase(models.Model):
    CATEGORIA_CHOICES = [
        ('funcional', 'Funcional'),
        ('spinning', 'Spinning'),
        ('crossfit', 'Crossfit'),
        ('pilates', 'Pilates'),
        ('yoga', 'Yoga'),
        ('boxeo', 'Boxeo'),
        ('hiit', 'HIIT'),
    ]

    ESTADO_CHOICES = [
        ('activa', 'Activa'),
        ('cancelada', 'Cancelada'),
        ('finalizada', 'Finalizada'),
    ]

    DIA_CHOICES = [
        ('Lunes', 'Lunes'),
        ('Martes', 'Martes'),
        ('Miércoles', 'Miércoles'),
        ('Jueves', 'Jueves'),
        ('Viernes', 'Viernes'),
        ('Sábado', 'Sábado'),
        ('Domingo', 'Domingo'),
    ]

    nombre = models.CharField(max_length=120)
    categoria = models.CharField(max_length=50, choices=CATEGORIA_CHOICES, default='funcional')
    descripcion = models.TextField(blank=True, default='')
    dia = models.CharField(max_length=20, choices=DIA_CHOICES, default='Lunes')
    hora = models.CharField(max_length=10, default='08:00')
    duracion_min = models.PositiveIntegerField(default=45)
    sala = models.CharField(max_length=80, default='Sala A')
    instructor = models.CharField(max_length=120, default='')
    cupo_maximo = models.PositiveIntegerField(default=20)
    lista_espera_max = models.PositiveIntegerField(default=5)
    cancelacion_horas = models.PositiveIntegerField(default=2)
    planes_habilitados = models.JSONField(default=list, blank=True)
    recurrencia = models.CharField(max_length=100, default='Semanal - L/M/V')
    dias_recurrencia = models.JSONField(default=list, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activa')
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
