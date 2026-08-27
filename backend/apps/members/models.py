from django.conf import settings
from django.db import connection, models


class Socio(models.Model):

    class Estado(models.TextChoices):
        ACTIVO = 'activo', 'Activo'
        SUSPENDIDO = 'suspendido', 'Suspendido'
        BAJA = 'baja', 'Baja'

    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='socio',
    )
    dni = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    telefono = models.CharField(max_length=30)
    certificado_medico_url = models.URLField(blank=True)
    numero_socio = models.CharField(max_length=10, unique=True)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVO)
    fecha_baja = models.DateField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    observaciones = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.numero_socio:
            with connection.cursor() as cursor:
                cursor.execute("SELECT nextval('socio_numero_seq')")
                n = cursor.fetchone()[0]
            self.numero_socio = f'S-{n:05d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.nombre} {self.apellido}'

    class Meta:
        verbose_name = 'Socio'
        verbose_name_plural = 'Socios'
        ordering = ['numero_socio']
