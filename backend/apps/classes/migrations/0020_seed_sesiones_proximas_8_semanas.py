"""#178 — Data migration: seed SesionClase rows for the next 8 weeks from active Clases.

Creates SesionClase rows for each active Clase, for each date in the next 56 days
that matches the clase's dias_recurrencia (or dia fallback).

Reverse: deletes all SesionClase rows that were created by this migration
(rows with estado='activa' and created_at >= migration time).
Safer approach: delete all SesionClase rows (table is generated data, fully re-creatable).
"""
import datetime

from django.db import migrations

DIA_TO_WEEKDAY = {
    'lunes': 0,
    'martes': 1,
    'miercoles': 2,
    'jueves': 3,
    'viernes': 4,
    'sabado': 5,
    'domingo': 6,
}


def seed_forward(apps, schema_editor):
    Clase = apps.get_model('classes', 'Clase')
    SesionClase = apps.get_model('classes', 'SesionClase')

    today = datetime.date.today()
    hasta = today + datetime.timedelta(days=56)  # 8 weeks

    clases_activas = Clase.objects.filter(estado='activa')

    for clase in clases_activas:
        dias = clase.dias_recurrencia or []
        if dias:
            target_weekdays = {DIA_TO_WEEKDAY[d] for d in dias if d in DIA_TO_WEEKDAY}
        else:
            dia_value = clase.dia
            target_weekdays = {DIA_TO_WEEKDAY[dia_value]} if dia_value in DIA_TO_WEEKDAY else set()

        if not target_weekdays:
            continue

        current = today
        while current <= hasta:
            if current.weekday() in target_weekdays:
                SesionClase.objects.get_or_create(
                    clase=clase,
                    fecha=current,
                    defaults={'estado': 'activa'},
                )
            current += datetime.timedelta(days=1)


def seed_reverse(apps, schema_editor):
    """Reverse: truncate all SesionClase rows — they are fully re-generatable."""
    SesionClase = apps.get_model('classes', 'SesionClase')
    SesionClase.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0019_seed_instructores_from_clases'),
    ]

    operations = [
        migrations.RunPython(seed_forward, seed_reverse),
    ]
