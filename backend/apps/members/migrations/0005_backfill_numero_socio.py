from django.db import migrations


def backfill_numero_socio(apps, schema_editor):
    Socio = apps.get_model('members', 'Socio')
    with schema_editor.connection.cursor() as cursor:
        for socio in Socio.objects.filter(numero_socio__isnull=True).order_by('id'):
            cursor.execute("SELECT nextval('socio_numero_seq')")
            n = cursor.fetchone()[0]
            socio.numero_socio = f'S-{n:05d}'
            socio.save(update_fields=['numero_socio'])


class Migration(migrations.Migration):

    dependencies = [
        ('members', '0004_socio_numero_sequence'),
    ]

    operations = [
        migrations.RunPython(backfill_numero_socio, migrations.RunPython.noop),
    ]
