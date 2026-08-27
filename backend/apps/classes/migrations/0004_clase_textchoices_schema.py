"""
Migration 0004: Update Clase choice fields to use TextChoices.

- Categoria, Estado: stored values unchanged (already lowercase).
- Dia: stored values change from Title-case to lowercase (data migration in 0005).
"""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0003_clase_instructor_empty_default'),
    ]

    operations = [
        migrations.AlterField(
            model_name='clase',
            name='categoria',
            field=models.CharField(
                choices=[
                    ('funcional', 'Funcional'),
                    ('spinning', 'Spinning'),
                    ('crossfit', 'Crossfit'),
                    ('pilates', 'Pilates'),
                    ('yoga', 'Yoga'),
                    ('boxeo', 'Boxeo'),
                    ('hiit', 'HIIT'),
                ],
                default='funcional',
                max_length=50,
            ),
        ),
        migrations.AlterField(
            model_name='clase',
            name='estado',
            field=models.CharField(
                choices=[
                    ('activa', 'Activa'),
                    ('cancelada', 'Cancelada'),
                    ('finalizada', 'Finalizada'),
                ],
                default='activa',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='clase',
            name='dia',
            field=models.CharField(
                choices=[
                    ('lunes', 'Lunes'),
                    ('martes', 'Martes'),
                    ('miercoles', 'Miercoles'),
                    ('jueves', 'Jueves'),
                    ('viernes', 'Viernes'),
                    ('sabado', 'Sabado'),
                    ('domingo', 'Domingo'),
                ],
                default='lunes',
                max_length=20,
            ),
        ),
    ]
