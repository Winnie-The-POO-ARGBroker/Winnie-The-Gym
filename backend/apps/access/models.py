from django.db import models
from django.conf import settings


class AccessLog(models.Model):
    ACCESS_TYPE_CHOICES = [
        ('ENTRY', 'Ingreso'),
        ('EXIT', 'Egreso'),
    ]

    STATUS_CHOICES = [
        ('GRANTED', 'Permitido'),
        ('DENIED', 'Denegado'),
    ]

    DENIAL_REASON_CHOICES = [
        ('TOKEN_EXPIRED', 'Token QR expirado'),
        ('INVALID_SIGNATURE', 'Firma de token inválida'),
        ('INVALID_TOKEN', 'Token QR malformado o sin identificador'),
        ('REPLAY_ATTACK', 'Token QR ya utilizado'),
        ('MEMBERSHIP_INACTIVE', 'Membresía inactiva o cuota vencida'),
        ('NO_MEMBERSHIP', 'Socio sin membresía registrada'),
        ('USER_SUSPENDED', 'Usuario suspendido'),
        ('UNKNOWN_USER', 'Usuario no registrado'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='access_logs',
        verbose_name='Socio'
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name='Fecha y Hora'
    )
    access_type = models.CharField(
        max_length=10,
        choices=ACCESS_TYPE_CHOICES,
        default='ENTRY',
        verbose_name='Tipo de Acceso'
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='GRANTED',
        verbose_name='Estado de Acceso'
    )
    denial_reason = models.CharField(
        max_length=50,
        choices=DENIAL_REASON_CHOICES,
        blank=True,
        null=True,
        verbose_name='Motivo de Rechazo'
    )
    qr_jti = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        db_index=True,
        verbose_name='Identificador Unico del QR (JTI)'
    )
    scanned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='scanned_access_logs',
        verbose_name='Escaneado por (Personal/Dispositivo)'
    )

    class Meta:
        verbose_name = 'Registro de Acceso'
        verbose_name_plural = 'Registros de Acceso'
        ordering = ['-timestamp']

    def __str__(self):
        status_display = self.get_status_display()
        user_display = self.user.email if self.user else "Anon/Desconocido"
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {user_display} - {status_display}"
