"""Add new DenialReason choices for PR5 (#149 anti-passback, #220 aforo/horario)."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('access', '0004_accesslog_source_operator_motivo'),
    ]

    operations = [
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
                    # #149 — Anti-passback
                    ('YA_FIGURA_ADENTRO', 'El socio ya figura dentro del gimnasio'),
                    ('NO_FIGURA_ADENTRO', 'El socio no figura adentro del gimnasio'),
                    ('YA_REGISTRADO', 'Acceso registrado recientemente (replay)'),
                    # #220 — Aforo / horario
                    ('AFORO_COMPLETO', 'Aforo máximo alcanzado'),
                    ('FUERA_DE_HORARIO', 'El gimnasio está fuera de horario'),
                ],
                max_length=50,
                null=True,
                verbose_name='Motivo de Rechazo',
            ),
        ),
    ]
