from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.db.models.query_utils


class Migration(migrations.Migration):

    dependencies = [
        ('memberships', '0005_add_es_popular'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='membresia',
            name='motivo_estado',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='membresia',
            name='cambiado_por',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='membresias_modificadas',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='membresia',
            name='cambiado_en',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='membresia',
            name='fecha_suspension',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddConstraint(
            model_name='membresia',
            constraint=models.UniqueConstraint(
                condition=django.db.models.query_utils.Q(estado='activa'),
                fields=['socio'],
                name='unique_active_membresia_per_socio',
            ),
        ),
    ]
