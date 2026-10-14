"""#158 — Add franja_desde, franja_hasta, dias_habilitados to PlanMembresia."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('memberships', '0007_add_plan_subtitulo_beneficios_matriz'),
    ]

    operations = [
        migrations.AddField(
            model_name='planmembresia',
            name='franja_desde',
            field=models.TimeField(
                blank=True,
                null=True,
                verbose_name='Horario de entrada desde',
                help_text='Si está definido junto a franja_hasta, el socio solo puede entrar en esa franja.',
            ),
        ),
        migrations.AddField(
            model_name='planmembresia',
            name='franja_hasta',
            field=models.TimeField(
                blank=True,
                null=True,
                verbose_name='Horario de entrada hasta',
            ),
        ),
        migrations.AddField(
            model_name='planmembresia',
            name='dias_habilitados',
            field=models.JSONField(
                blank=True,
                null=True,
                verbose_name='Días habilitados',
                help_text='Lista de días en que el plan habilita acceso. null = todos.',
            ),
        ),
    ]
