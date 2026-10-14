"""#180 Fase 1 — Data migration: seed Instructor rows from Clase.instructor CharField values.

For each unique non-empty Clase.instructor string:
  - Split "Nombre Apellido" to populate nombre/apellido (first word = nombre, rest = apellido).
  - Create an Instructor row.
  - Point Clase.instructor_fk to the new row.

Reverse: clears instructor_fk on all Clase rows (Instructor rows remain).
"""

from django.db import migrations


def _split_nombre_apellido(full_name):
    """Split a full name string into (nombre, apellido).

    First word becomes nombre; remainder becomes apellido.
    If only one word, apellido is empty string.
    """
    parts = full_name.strip().split(maxsplit=1)
    if not parts:
        return ('', '')
    nombre = parts[0]
    apellido = parts[1] if len(parts) > 1 else ''
    return nombre, apellido


def seed_forward(apps, schema_editor):
    Clase = apps.get_model('classes', 'Clase')
    Instructor = apps.get_model('classes', 'Instructor')

    # Collect distinct non-empty instructor strings
    instructor_strings = (
        Clase.objects
        .exclude(instructor='')
        .values_list('instructor', flat=True)
        .distinct()
    )

    instructor_map = {}
    for full_name in instructor_strings:
        if not full_name or not full_name.strip():
            continue
        nombre, apellido = _split_nombre_apellido(full_name)
        # Use get_or_create keyed on (nombre, apellido) to handle duplicates
        instructor, _ = Instructor.objects.get_or_create(
            nombre=nombre,
            apellido=apellido,
            defaults={
                'email': '',
                'telefono': '',
                'especialidades': [],
                'bio': '',
                'activo': True,
            },
        )
        instructor_map[full_name] = instructor

    for full_name, instructor in instructor_map.items():
        Clase.objects.filter(instructor=full_name).update(instructor_fk=instructor)


def seed_reverse(apps, schema_editor):
    """Reverse: clear instructor_fk on all Clase rows. Instructor rows remain."""
    Clase = apps.get_model('classes', 'Clase')
    Clase.objects.update(instructor_fk=None)


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0018_instructor_create'),
    ]

    operations = [
        migrations.RunPython(seed_forward, seed_reverse),
    ]
