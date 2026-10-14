"""Add source, operator, and motivo fields to AccessLog (fix #154)."""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('access', '0003_accesslog_choices_textchoices'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='accesslog',
            name='source',
            field=models.CharField(
                choices=[
                    ('QR_SCAN', 'QR Scan'),
                    ('DNI_SCAN', 'DNI Scan'),
                    ('MANUAL_CORRECTION', 'Manual Correction'),
                    ('DAY_CLOSE_AUTO', 'Day Close Auto'),
                ],
                default='QR_SCAN',
                max_length=30,
                verbose_name='Fuente del registro',
            ),
        ),
        migrations.AddField(
            model_name='accesslog',
            name='operator',
            field=models.ForeignKey(
                blank=True,
                help_text='User que operó esta acción (admin/recep en caso de corrección manual o cierre día).',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='operated_access_logs',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Operador (admin/recepcionista en corrección manual o cierre día)',
            ),
        ),
        migrations.AddField(
            model_name='accesslog',
            name='motivo',
            field=models.CharField(
                blank=True,
                default='',
                max_length=200,
                verbose_name='Motivo (corrección manual)',
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
                    ('AFORO_FULL', 'Aforo completo'),
                    ('NOT_INSIDE', 'Socio no registra entrada hoy'),
                ],
                max_length=50,
                null=True,
                verbose_name='Motivo de Rechazo',
            ),
        ),
    ]
