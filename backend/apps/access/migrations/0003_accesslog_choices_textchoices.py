"""
Migrate choices to TextChoices classes.

Replaces the raw list-of-tuples in ACCESS_TYPE_CHOICES, STATUS_CHOICES and
DENIAL_REASON_CHOICES with TextChoices-equivalent classes. Metadata-only change.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('access', '0002_alter_accesslog_denial_reason'),
    ]

    operations = [
        migrations.AlterField(
            model_name='accesslog',
            name='access_type',
            field=models.CharField(
                choices=[('ENTRY', 'Ingreso'), ('EXIT', 'Egreso')],
                default='ENTRY',
                max_length=10,
                verbose_name='Tipo de Acceso',
            ),
        ),
        migrations.AlterField(
            model_name='accesslog',
            name='status',
            field=models.CharField(
                choices=[('GRANTED', 'Permitido'), ('DENIED', 'Denegado')],
                default='GRANTED',
                max_length=10,
                verbose_name='Estado de Acceso',
            ),
        ),
        migrations.AlterField(
            model_name='accesslog',
            name='denial_reason',
            field=models.CharField(
                blank=True,
                choices=[
                    ('TOKEN_EXPIRED', 'Token QR expirado'),
                    ('INVALID_SIGNATURE', 'Firma de token inválida'),
                    ('INVALID_TOKEN', 'Token QR malformado o sin identificador'),
                    ('REPLAY_ATTACK', 'Token QR ya utilizado'),
                    ('MEMBERSHIP_INACTIVE', 'Membresía inactiva o cuota vencida'),
                    ('NO_MEMBERSHIP', 'Socio sin membresía registrada'),
                    ('USER_SUSPENDED', 'Usuario suspendido'),
                    ('UNKNOWN_USER', 'Usuario no registrado'),
                ],
                max_length=50,
                null=True,
                verbose_name='Motivo de Rechazo',
            ),
        ),
    ]
