"""#179 — Add Disciplina and Sala models, plus FK fields to Clase."""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0013_clase_cancelada_por_lista_espera_default'),
    ]

    operations = [
        # Disciplina model
        migrations.CreateModel(
            name='Disciplina',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100, unique=True)),
                ('color_hex', models.CharField(
                    blank=True,
                    default='#735d3e',
                    help_text='Color in #RRGGBB format for UI display.',
                    max_length=7,
                )),
                ('slug', models.SlugField(unique=True)),
                ('activa', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Disciplina',
                'verbose_name_plural': 'Disciplinas',
                'ordering': ['nombre'],
            },
        ),
        # Sala model
        migrations.CreateModel(
            name='Sala',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100, unique=True)),
                ('capacidad', models.PositiveIntegerField(
                    default=0,
                    help_text='Maximum capacity (0 = unlimited).',
                )),
                ('activa', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Sala',
                'verbose_name_plural': 'Salas',
                'ordering': ['nombre'],
            },
        ),
        # FK fields on Clase
        migrations.AddField(
            model_name='clase',
            name='disciplina_fk',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='clases',
                to='classes.disciplina',
                verbose_name='Disciplina',
            ),
        ),
        migrations.AddField(
            model_name='clase',
            name='sala_fk',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='clases',
                to='classes.sala',
                verbose_name='Sala (configurada)',
            ),
        ),
    ]
