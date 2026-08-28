"""
Migration 0005: Data migration — normalize Clase.dia from Title-case to lowercase.

Forward:  'Lunes' → 'lunes', 'Miércoles'/'Miercoles' → 'miercoles', etc.
Backward: 'lunes' → 'Lunes', etc. (restores canonical Title-case values).

Values not in the map are left unchanged (defensive).
"""

from django.db import migrations

DIA_MAP_FORWARD = {
    'Lunes': 'lunes',
    'Martes': 'martes',
    'Miércoles': 'miercoles',
    'Miercoles': 'miercoles',
    'Jueves': 'jueves',
    'Viernes': 'viernes',
    'Sábado': 'sabado',
    'Sabado': 'sabado',
    'Domingo': 'domingo',
}

DIA_MAP_BACKWARD = {
    'lunes': 'Lunes',
    'martes': 'Martes',
    'miercoles': 'Miércoles',
    'jueves': 'Jueves',
    'viernes': 'Viernes',
    'sabado': 'Sábado',
    'domingo': 'Domingo',
}


def normalize_dia_forward(apps, schema_editor):
    Clase = apps.get_model('classes', 'Clase')
    for clase in Clase.objects.all():
        new_dia = DIA_MAP_FORWARD.get(clase.dia)
        if new_dia is not None and new_dia != clase.dia:
            clase.dia = new_dia
            clase.save(update_fields=['dia'])


def normalize_dia_backward(apps, schema_editor):
    Clase = apps.get_model('classes', 'Clase')
    for clase in Clase.objects.all():
        original = DIA_MAP_BACKWARD.get(clase.dia)
        if original is not None and original != clase.dia:
            clase.dia = original
            clase.save(update_fields=['dia'])


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0004_clase_textchoices_schema'),
    ]

    operations = [
        migrations.RunPython(normalize_dia_forward, normalize_dia_backward),
    ]
