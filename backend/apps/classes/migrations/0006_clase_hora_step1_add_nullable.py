"""
Migration 0006: Step 1 of 3 — Rename hora CharField → hora_str, add nullable hora TimeField.

This keeps the original string data in hora_str while providing the new
hora TimeField for the data migration in 0007.
"""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0005_clase_dia_data_migration'),
    ]

    operations = [
        # Rename existing hora CharField to hora_str to preserve data
        migrations.RenameField(
            model_name='clase',
            old_name='hora',
            new_name='hora_str',
        ),
        # Add new nullable hora TimeField
        migrations.AddField(
            model_name='clase',
            name='hora',
            field=models.TimeField(null=True, blank=True),
        ),
    ]
