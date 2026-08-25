import datetime

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('members', '0006_socio_numero_not_null'),
    ]

    operations = [
        migrations.CreateModel(
            name='PlanMembresia',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100, unique=True)),
                ('duracion_dias', models.PositiveIntegerField()),
                ('precio', models.DecimalField(decimal_places=2, max_digits=10)),
                ('clases_asignadas', models.PositiveIntegerField(default=0)),
                ('activo', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Plan de Membresía',
                'verbose_name_plural': 'Planes de Membresía',
            },
        ),
        migrations.CreateModel(
            name='Membresia',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_inicio', models.DateField(default=datetime.date.today)),
                ('fecha_fin', models.DateField()),
                ('estado', models.CharField(
                    choices=[
                        ('activa', 'Activa'),
                        ('vencida', 'Vencida'),
                        ('suspendida', 'Suspendida'),
                        ('cancelada', 'Cancelada'),
                        ('pendiente_pago', 'Pendiente de Pago'),
                    ],
                    default='activa',
                    max_length=20,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('socio', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='membresias',
                    to='members.socio',
                )),
                ('plan', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='membresias',
                    to='memberships.planmembresia',
                )),
            ],
            options={
                'verbose_name': 'Membresía',
                'verbose_name_plural': 'Membresías',
            },
        ),
        migrations.AddIndex(
            model_name='membresia',
            index=models.Index(fields=['socio', 'estado'], name='memberships_socio_e_idx'),
        ),
    ]
