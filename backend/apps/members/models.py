from datetime import date, timedelta

from django.conf import settings
from django.db import connection, models


class Socio(models.Model):

    class Estado(models.TextChoices):
        ACTIVO = 'activo', 'Activo'
        SUSPENDIDO = 'suspendido', 'Suspendido'
        BAJA = 'baja', 'Baja'

    class Genero(models.TextChoices):
        FEMENINO = 'F', 'Femenino'
        MASCULINO = 'M', 'Masculino'
        NO_BINARIO = 'X', 'No binario'
        PREFIERO_NO_DECIR = 'N', 'Prefiero no decir'

    class AptoEstado(models.TextChoices):
        SIN_APTO = 'sin_apto', 'Sin apto'
        VIGENTE = 'vigente', 'Vigente'
        POR_VENCER = 'por_vencer', 'Por vencer'
        VENCIDO = 'vencido', 'Vencido'

    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='socio',
    )
    dni = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    telefono = models.CharField(max_length=30)
    # Legacy URL field — kept for backward compat; new uploads use certificado_medico_path
    certificado_medico_url = models.URLField(blank=True)
    # #227 — private bucket path (UUID-named key, no PII in the name)
    certificado_medico_path = models.CharField(max_length=500, blank=True, default='')
    numero_socio = models.CharField(max_length=10, unique=True)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVO)
    fecha_baja = models.DateField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    observaciones = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    # #232 — extended socio data
    fecha_nacimiento = models.DateField(blank=True, null=True)
    genero = models.CharField(
        max_length=1,
        choices=Genero.choices,
        blank=True,
        null=True,
    )
    contacto_emergencia_nombre = models.CharField(max_length=100, blank=True, default='')
    contacto_emergencia_telefono = models.CharField(max_length=30, blank=True, default='')
    # #228 — medical certificate validity
    certificado_emitido_en = models.DateField(blank=True, null=True)
    certificado_vence_en = models.DateField(blank=True, null=True)
    # #228 — idempotency flags for validity reminder emails (JSON dict stored as text)
    _aviso_apto_enviado = models.TextField(blank=True, default='{}', db_column='aviso_apto_enviado')

    @property
    def apto_estado(self):
        """Compute the medical certificate validity state.

        Returns one of: sin_apto | vigente | por_vencer | vencido.

        Logic (per contract):
          - sin_apto  → no certificado_medico_path
          - vigente   → vence_en > today + 30 days
          - por_vencer → vence_en ∈ (today, today + 30 days]
          - vencido   → vence_en <= today, or has path but no fecha
        """
        if not self.certificado_medico_path and not self.certificado_medico_url:
            return self.AptoEstado.SIN_APTO
        if not self.certificado_vence_en:
            # Has a file but no expiry date recorded
            return self.AptoEstado.VENCIDO
        today = date.today()
        vence = self.certificado_vence_en
        if vence <= today:
            return self.AptoEstado.VENCIDO
        threshold = today + timedelta(days=30)
        if vence <= threshold:
            return self.AptoEstado.POR_VENCER
        return self.AptoEstado.VIGENTE

    def get_aviso_apto_enviado(self):
        """Return the idempotency dict for apto reminder emails."""
        import json
        try:
            return json.loads(self._aviso_apto_enviado or '{}')
        except (ValueError, TypeError):
            return {}

    def set_aviso_apto_enviado(self, data: dict):
        """Persist the idempotency dict for apto reminder emails."""
        import json
        self._aviso_apto_enviado = json.dumps(data)

    def save(self, *args, **kwargs):
        if not self.numero_socio:
            with connection.cursor() as cursor:
                cursor.execute("SELECT nextval('socio_numero_seq')")
                n = cursor.fetchone()[0]
            self.numero_socio = f'S-{n:05d}'

        if self.estado == self.Estado.BAJA:
            if not self.fecha_baja:
                self.fecha_baja = date.today()
        else:
            self.fecha_baja = None

        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.nombre} {self.apellido}'

    class Meta:
        verbose_name = 'Socio'
        verbose_name_plural = 'Socios'
        ordering = ['numero_socio']


class SocioNota(models.Model):
    """Internal staff notes attached to a Socio record (#234)."""

    socio = models.ForeignKey(
        Socio,
        on_delete=models.CASCADE,
        related_name='notas',
    )
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notas_socios',
    )
    texto = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Nota de Socio'
        verbose_name_plural = 'Notas de Socios'
        ordering = ['-created_at']

    def __str__(self):
        return f'Nota de {self.autor} sobre {self.socio}'
