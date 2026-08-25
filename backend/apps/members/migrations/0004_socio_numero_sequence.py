from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('members', '0003_socio_lifecycle_fields'),
    ]

    operations = [
        migrations.RunSQL(
            sql="CREATE SEQUENCE IF NOT EXISTS socio_numero_seq START WITH 1 INCREMENT BY 1;",
            reverse_sql="DROP SEQUENCE IF EXISTS socio_numero_seq;",
        ),
    ]
