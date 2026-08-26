from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('members', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='socio',
            name='numero_socio',
            field=models.CharField(blank=True, max_length=10, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='socio',
            name='estado',
            field=models.CharField(
                choices=[
                    ('activo', 'Activo'),
                    ('suspendido', 'Suspendido'),
                    ('baja', 'Baja'),
                ],
                default='activo',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='socio',
            name='fecha_baja',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='socio',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name='socio',
            name='observaciones',
            field=models.TextField(blank=True, default=''),
        ),
    ]
