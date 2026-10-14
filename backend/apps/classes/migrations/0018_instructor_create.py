"""#180 Fase 1 — Add Instructor model and Clase.instructor_fk + SesionClase.instructor_override_fk."""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0017_inscripcion_sesion_fk'),
    ]

    operations = [
        # 1. Create the Instructor model
        migrations.CreateModel(
            name='Instructor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100)),
                ('apellido', models.CharField(max_length=100)),
                ('email', models.EmailField(blank=True, default='')),
                ('telefono', models.CharField(blank=True, default='', max_length=30)),
                ('especialidades', models.JSONField(blank=True, default=list)),
                ('bio', models.TextField(blank=True, default='')),
                ('activo', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Instructor',
                'verbose_name_plural': 'Instructores',
                'ordering': ['apellido', 'nombre'],
            },
        ),
        # 2. Add instructor_fk to Clase
        migrations.AddField(
            model_name='clase',
            name='instructor_fk',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='clases',
                to='classes.instructor',
                verbose_name='Instructor (entidad)',
            ),
        ),
        # 3. Add instructor_override_fk to SesionClase
        migrations.AddField(
            model_name='sesionclase',
            name='instructor_override_fk',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='sesiones_como_instructor',
                to='classes.instructor',
                verbose_name='Instructor override',
            ),
        ),
    ]
