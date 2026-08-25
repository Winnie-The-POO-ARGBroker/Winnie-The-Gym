from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('members', '0005_backfill_numero_socio'),
    ]

    operations = [
        migrations.AlterField(
            model_name='socio',
            name='numero_socio',
            field=models.CharField(max_length=10, unique=True),
        ),
    ]
