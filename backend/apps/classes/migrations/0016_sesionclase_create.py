"""#178 — Add SesionClase model and Clase.instructor_fk FK (#180 Fase 1 Instructor added in 0018)."""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0015_seed_disciplinas_salas_from_clases'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SesionClase',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha', models.DateField(help_text='Specific date for this session.')),
                ('estado', models.CharField(
                    choices=[('activa', 'Activa'), ('cancelada', 'Cancelada'), ('finalizada', 'Finalizada')],
                    default='activa',
                    max_length=20,
                )),
                ('motivo_cancelacion', models.TextField(blank=True, default='')),
                ('fecha_cancelacion', models.DateTimeField(blank=True, null=True)),
                ('hora_override', models.TimeField(
                    blank=True,
                    help_text='Override class hour for this specific date.',
                    null=True,
                )),
                ('cupo_override', models.IntegerField(
                    blank=True,
                    help_text='Override cupo_maximo for this specific date.',
                    null=True,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('cancelada_por', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='sesiones_canceladas',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('clase', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='sesiones',
                    to='classes.clase',
                )),
            ],
            options={
                'verbose_name': 'Sesión de Clase',
                'verbose_name_plural': 'Sesiones de Clase',
                'ordering': ['fecha', 'clase'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='sesionclase',
            unique_together={('clase', 'fecha')},
        ),
    ]
