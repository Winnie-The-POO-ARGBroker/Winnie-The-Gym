"""#182 — Add CierreGimnasio model for gym closures and holidays."""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0014_disciplina_sala_models'),
        ('common', '0003_gymconfig_aforo_fields'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CierreGimnasio',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_desde', models.DateField(verbose_name='Fecha desde')),
                ('fecha_hasta', models.DateField(verbose_name='Fecha hasta')),
                ('motivo', models.CharField(max_length=200, verbose_name='Motivo')),
                ('afecta', models.CharField(
                    choices=[('todo', 'Todo el gym'), ('sala', 'Una sala')],
                    default='todo',
                    max_length=10,
                    verbose_name='Ámbito',
                )),
                ('sala', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='cierres',
                    to='classes.sala',
                    verbose_name='Sala',
                )),
                ('created_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='cierres_creados',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Creado por',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Creado en')),
            ],
            options={
                'verbose_name': 'Cierre del Gimnasio',
                'verbose_name_plural': 'Cierres del Gimnasio',
                'ordering': ['-fecha_desde'],
            },
        ),
    ]
