"""#158 — Add PLAN_FUERA_DE_HORARIO and PLAN_DIA_NO_HABILITADO to DenialReason choices."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('access', '0005_accesslog_denial_reason_pr5'),
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
                    ('YA_FIGURA_ADENTRO', 'El socio ya figura dentro del gimnasio'),
                    ('NO_FIGURA_ADENTRO', 'El socio no figura adentro del gimnasio'),
                    ('YA_REGISTRADO', 'Acceso registrado recientemente (replay)'),
                    ('AFORO_COMPLETO', 'Aforo máximo alcanzado'),
                    ('FUERA_DE_HORARIO', 'El gimnasio está fuera de horario'),
                    ('PLAN_FUERA_DE_HORARIO', 'Tu plan no permite acceso en este horario'),
                    ('PLAN_DIA_NO_HABILITADO', 'Tu plan no permite acceso este día'),
                ],
                max_length=50,
                null=True,
                verbose_name='Motivo de Rechazo',
            ),
        ),
    ]
