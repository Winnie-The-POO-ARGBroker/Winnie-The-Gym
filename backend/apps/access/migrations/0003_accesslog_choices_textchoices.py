"""
Migration 0003: Add 'INVALID_TOKEN' choice to AccessLog.denial_reason using TextChoices.

Replaces the raw list-of-tuples in ACCESS_TYPE_CHOICES, STATUS_CHOICES and
DENIAL_REASON_CHOICES with no schema change on the database
(Django migrations for TextChoices/choices changes are metadata-only).
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('access', '0002_alter_accesslog_denial_reason'),
    ]

    operations = [
        # access_type: raw list → TextChoices-equivalent (metadata only, no DB column change)
        migrations.AlterField(
            model_name='accesslog',
            name='access_type',
            field=models.CharField(
                max_length=10,
                choices=[('ENTRY', 'Ingreso'), ('EXIT', 'Egreso')],
                default='ENTRY',
                verbose_name='Tipo de Acceso',
            ),
        ),
        # status: same pattern
        migrations.AlterField(
            model_name='accesslog',
            name='status',
            field=models.CharField(
                max_length=10,
                choices=[('GRANTED', 'Permitido'), ('DENIED', 'Denegado')],
                default='GRANTED',
                verbose_name='Estado de Acceso',
            ),
        ),
    ]
