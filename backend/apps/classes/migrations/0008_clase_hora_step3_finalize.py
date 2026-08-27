"""
Migration 0008: Step 3 of 3 — Drop hora_str CharField, make hora TimeField non-nullable.

Any NULL remaining in hora (should not happen after 0007) defaults to 08:00.
"""

import datetime

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0007_clase_hora_step2_data_migration'),
    ]

    operations = [
        # Make hora non-nullable with a safe default (converts any remaining NULLs)
        migrations.AlterField(
            model_name='clase',
            name='hora',
            field=models.TimeField(default=datetime.time(8, 0)),
        ),
        # Drop the now-redundant hora_str field
        migrations.RemoveField(
            model_name='clase',
            name='hora_str',
        ),
    ]
