"""Add the RENOVADA estado and backfill rows that were superseded by a renewal.

Before this change ``renovar_membresia`` marked every active membership as
``vencida`` even though its remaining days were carried over. A ``vencida`` row
that overlaps a later membership of the same socio (the later one starts on or
before this one ends) was therefore superseded, not expired: it becomes
``renovada``. Genuinely expired rows (no overlap) stay ``vencida``.
"""
from django.db import migrations, models
from django.db.models import Exists, OuterRef


def mark_superseded_as_renovada(apps, schema_editor):
    Membresia = apps.get_model('memberships', 'Membresia')
    later_overlapping = Membresia.objects.filter(
        socio=OuterRef('socio'),
        pk__gt=OuterRef('pk'),
        fecha_inicio__lte=OuterRef('fecha_fin'),
    )
    Membresia.objects.filter(estado='vencida').filter(Exists(later_overlapping)).update(estado='renovada')


def revert_renovada_to_vencida(apps, schema_editor):
    Membresia = apps.get_model('memberships', 'Membresia')
    Membresia.objects.filter(estado='renovada').update(estado='vencida')


class Migration(migrations.Migration):

    dependencies = [
        ('memberships', '0008_plan_franja_horaria_dias_habilitados'),
    ]

    operations = [
        migrations.AlterField(
            model_name='membresia',
            name='estado',
            field=models.CharField(
                choices=[
                    ('activa', 'Activa'),
                    ('vencida', 'Vencida'),
                    ('suspendida', 'Suspendida'),
                    ('cancelada', 'Cancelada'),
                    ('pendiente_pago', 'Pendiente de Pago'),
                    ('renovada', 'Renovada'),
                ],
                default='activa',
                max_length=20,
            ),
        ),
        migrations.RunPython(mark_superseded_as_renovada, revert_renovada_to_vencida),
    ]
