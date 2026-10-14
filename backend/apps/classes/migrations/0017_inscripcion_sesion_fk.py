"""#178 — Add InscripcionClase.sesion FK to SesionClase (nullable for transition)."""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0016_sesionclase_create'),
    ]

    operations = [
        migrations.AddField(
            model_name='inscripcionclase',
            name='sesion',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='inscripciones',
                to='classes.sesionclase',
                verbose_name='Sesión',
            ),
        ),
    ]
