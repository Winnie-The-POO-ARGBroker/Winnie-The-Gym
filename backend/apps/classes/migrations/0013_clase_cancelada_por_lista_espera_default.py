"""
Migration for PR4 CLS Features P1:
  - Add cancelada_por FK to users.User (nullable)
  - Set lista_espera_max default to 0 (no waiting list by default)
"""
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0012_clase_planes_habilitados_add_validation'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='clase',
            name='cancelada_por',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='clases_canceladas',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Cancelada por',
            ),
        ),
        migrations.AlterField(
            model_name='clase',
            name='lista_espera_max',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
