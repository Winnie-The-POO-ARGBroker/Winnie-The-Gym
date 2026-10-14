# Generated manually — Fix #171: tri-state attendance tracking

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0010_add_cancelacion_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='inscripcionclase',
            name='asistio',
            field=models.BooleanField(blank=True, default=None, null=True),
        ),
    ]
