"""#179 — Data migration: seed Disciplina and Sala from existing Clase values.

For each unique Clase.categoria value, create a Disciplina.
For each unique Clase.sala value, create a Sala.
Then point disciplina_fk and sala_fk on existing Clase rows to their new objects.

Reverse: clears the FK fields (Disciplina and Sala rows remain but are disconnected).
"""
import re

from django.db import migrations


def _slugify(text):
    """Simple ASCII slugifier — avoids external library dependency in migrations."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text[:100]


def seed_forward(apps, schema_editor):
    Clase = apps.get_model('classes', 'Clase')
    Disciplina = apps.get_model('classes', 'Disciplina')
    Sala = apps.get_model('classes', 'Sala')

    # --- Disciplinas ---
    categorias = (
        Clase.objects.exclude(categoria='')
        .values_list('categoria', flat=True)
        .distinct()
    )

    disciplina_map = {}
    for cat in categorias:
        if not cat:
            continue
        slug = _slugify(cat)
        # Ensure slug uniqueness by appending suffix if needed
        base_slug = slug
        counter = 1
        while Disciplina.objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1
        disciplina, _ = Disciplina.objects.get_or_create(
            nombre=cat,
            defaults={'slug': slug, 'color_hex': '#735d3e', 'activa': True},
        )
        disciplina_map[cat] = disciplina

    for cat, disciplina in disciplina_map.items():
        Clase.objects.filter(categoria=cat).update(disciplina_fk=disciplina)

    # --- Salas ---
    salas = (
        Clase.objects.exclude(sala='')
        .values_list('sala', flat=True)
        .distinct()
    )

    sala_map = {}
    for sala_nombre in salas:
        if not sala_nombre:
            continue
        sala, _ = Sala.objects.get_or_create(
            nombre=sala_nombre,
            defaults={'capacidad': 0, 'activa': True},
        )
        sala_map[sala_nombre] = sala

    for sala_nombre, sala in sala_map.items():
        Clase.objects.filter(sala=sala_nombre).update(sala_fk=sala)


def seed_reverse(apps, schema_editor):
    """Reverse: just clear the FK fields. Disciplina/Sala rows are left intact."""
    Clase = apps.get_model('classes', 'Clase')
    Clase.objects.update(disciplina_fk=None, sala_fk=None)


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0014_disciplina_sala_models'),
    ]

    operations = [
        migrations.RunPython(seed_forward, seed_reverse),
    ]
