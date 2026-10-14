import datetime
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


class PlanMembresia(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    # #165 — optional marketing subtitle
    subtitulo = models.CharField(max_length=255, blank=True, default='')
    duracion_dias = models.PositiveIntegerField()
    precio = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    clases_asignadas = models.PositiveIntegerField(default=0)
    activo = models.BooleanField(default=True)
    es_popular = models.BooleanField(default=False)
    # #165 — ordered list of feature strings shown in plan card (max 10)
    beneficios = models.JSONField(default=list, blank=True)
    # #165 — free-form feature → value mapping for the comparison matrix
    matriz_comparativa = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = 'Plan de Membresía'
        verbose_name_plural = 'Planes de Membresía'
        ordering = ['nombre']


class Membresia(models.Model):

    class Estado(models.TextChoices):
        ACTIVA = 'activa', 'Activa'
        VENCIDA = 'vencida', 'Vencida'
        SUSPENDIDA = 'suspendida', 'Suspendida'
        CANCELADA = 'cancelada', 'Cancelada'
        PENDIENTE_PAGO = 'pendiente_pago', 'Pendiente de Pago'  # reserved — never writable via API

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
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVA)
    # Tracks which expiration alerts (7/3/1/0) have already been emailed so the
    # scheduled job does not re-send. Structure: {"7": true, "3": true, ...}.
    avisos_enviados = models.JSONField(default=dict, blank=True)

    # #188 — Lifecycle audit fields
    motivo_estado = models.CharField(max_length=255, blank=True, default='')
    cambiado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='membresias_modificadas',
    )
    cambiado_en = models.DateTimeField(null=True, blank=True)
    fecha_suspension = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.socio} - {self.plan} ({self.estado})'

    class Meta:
        verbose_name = 'Membresía'
        verbose_name_plural = 'Membresías'
        ordering = ['-fecha_inicio']
        indexes = [
            models.Index(fields=['socio', 'estado'], name='memberships_socio_e_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['socio'],
                condition=Q(estado='activa'),
                name='unique_active_membresia_per_socio',
            ),
        ]
