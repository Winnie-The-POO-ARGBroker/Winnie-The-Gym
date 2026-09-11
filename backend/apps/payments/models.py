from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class Pago(models.Model):

    class Estado(models.TextChoices):
        PENDIENTE = 'pendiente', 'Pendiente'
        APROBADO = 'aprobado', 'Aprobado'
        RECHAZADO = 'rechazado', 'Rechazado'
        CANCELADO = 'cancelado', 'Cancelado'
        REEMBOLSADO = 'reembolsado', 'Reembolsado'

    class Metodo(models.TextChoices):
        MERCADO_PAGO = 'mercado_pago', 'MercadoPago'
        MANUAL = 'manual', 'Cobro Manual'

    # ADR-7: string form for cross-app FKs
    socio = models.ForeignKey(
        'members.Socio',
        on_delete=models.PROTECT,
        related_name='pagos',
    )
    plan = models.ForeignKey(
        'memberships.PlanMembresia',
        on_delete=models.PROTECT,
        related_name='pagos',
    )
    membresia = models.ForeignKey(
        'memberships.Membresia',
        on_delete=models.SET_NULL,
        related_name='pagos',
        null=True, blank=True,
    )
    monto = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    moneda = models.CharField(max_length=3, default='ARS')
    metodo = models.CharField(max_length=20, choices=Metodo.choices, default=Metodo.MERCADO_PAGO)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PENDIENTE)

    # MercadoPago references
    mp_preference_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    mp_payment_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    mp_external_reference = models.CharField(max_length=64, blank=True, default='', db_index=True)
    mp_status_detail = models.CharField(max_length=100, blank=True, default='')
    raw_webhook = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['socio', 'estado'], name='pagos_socio_e_idx'),
            models.Index(fields=['mp_external_reference'], name='pagos_extref_idx'),
        ]

    def __str__(self):
        return f'Pago #{self.pk} · {self.socio} · {self.plan} · {self.estado}'
