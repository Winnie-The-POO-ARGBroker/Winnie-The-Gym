"""
Migration 0007: Step 2 of 3 — Parse hora_str → hora TimeField.

Forward:  Parses 'HH:MM' string from hora_str into a datetime.time in hora.
          Unparseable values default to datetime.time(8, 0) and log a warning.
Backward: Converts hora TimeField back to 'HH:MM' string in hora_str.
          Sets hora back to NULL.
"""

import datetime
import logging

from django.db import migrations

logger = logging.getLogger(__name__)


def parse_hora_forward(apps, schema_editor):
    Clase = apps.get_model('classes', 'Clase')
    for clase in Clase.objects.all():
        hora_str = clase.hora_str or ''
        try:
            parts = hora_str.strip().split(':')
            if len(parts) != 2:
                raise ValueError(f'Unexpected format: {hora_str!r}')
            hora_time = datetime.time(int(parts[0]), int(parts[1]))
        except (ValueError, TypeError) as exc:
            logger.warning(
                'Clase pk=%s: could not parse hora_str=%r (%s). Defaulting to 08:00.',
                clase.pk,
                hora_str,
                exc,
            )
            hora_time = datetime.time(8, 0)
        clase.hora = hora_time
        clase.save(update_fields=['hora'])


def parse_hora_backward(apps, schema_editor):
    Clase = apps.get_model('classes', 'Clase')
    for clase in Clase.objects.all():
        if clase.hora is not None:
            clase.hora_str = clase.hora.strftime('%H:%M')
        else:
            clase.hora_str = '08:00'
        clase.hora = None
        clase.save(update_fields=['hora_str', 'hora'])


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0006_clase_hora_step1_add_nullable'),
    ]

    operations = [
        migrations.RunPython(parse_hora_forward, parse_hora_backward),
    ]
