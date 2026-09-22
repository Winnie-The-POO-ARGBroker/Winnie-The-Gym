from django.db import migrations


def create_default_gym_config(apps, schema_editor):
    GymConfig = apps.get_model('common', 'GymConfig')
    GymConfig.objects.get_or_create(
        pk=1,
        defaults={
            'nombre_gym': 'Winnie The Gym',
            'aforo_maximo': 200,
            'hora_apertura': '07:00',
            'hora_cierre': '23:00',
            'telefono_contacto': '',
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0001_gymconfig_initial'),
    ]

    operations = [
        migrations.RunPython(create_default_gym_config, migrations.RunPython.noop),
    ]
