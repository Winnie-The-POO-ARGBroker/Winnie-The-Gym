import datetime
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class PlanMembresia(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    duracion_dias = models.PositiveIntegerField()
    precio = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    clases_asignadas = models.PositiveIntegerField(default=0)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = 'Plan de Membresía'
        verbose_name_plural = 'Planes de Membresía'


class Membresia(models.Model):

    ESTADO_CHOICES = [
        ('activa', 'Activa'),
        ('vencida', 'Vencida'),
        ('suspendida', 'Suspendida'),
        ('cancelada', 'Cancelada'),
        ('pendiente_pago', 'Pendiente de Pago'),  # reserved — never writable via API
    ]

    # ADR-7: string form for cross-app FKs
    socio = models.ForeignKey(
        'members.Socio',
        on_delete=models.CASCADE,
        related_name='membresias',
    )
    plan = models.ForeignKey(
        'memberships.PlanMembresia',
        on_delete=models.PROTECT,
        related_name='membresias',
    )
    fecha_inicio = models.DateField(default=datetime.date.today)
    fecha_fin = models.DateField()
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activa')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.socio} - {self.plan} ({self.estado})'

    class Meta:
        verbose_name = 'Membresía'
        verbose_name_plural = 'Membresías'
        indexes = [
            models.Index(fields=['socio', 'estado'], name='memberships_socio_e_idx'),
        ]
