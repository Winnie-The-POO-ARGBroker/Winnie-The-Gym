"""Add aforo alert/block fields, update hora_cierre to nullable, and add cierre_gracia_minutos."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0002_gymconfig_default_row'),
    ]

    operations = [
        migrations.AddField(
            model_name='gymconfig',
            name='aforo_umbral_alerta_pct',
            field=models.IntegerField(default=90),
        ),
        migrations.AddField(
            model_name='gymconfig',
            name='aforo_bloqueo_al_llegar_max',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='gymconfig',
            name='cierre_gracia_minutos',
            field=models.IntegerField(default=30),
        ),
        migrations.AlterField(
            model_name='gymconfig',
            name='hora_cierre',
            field=models.TimeField(blank=True, null=True, default=None),
        ),
    ]
