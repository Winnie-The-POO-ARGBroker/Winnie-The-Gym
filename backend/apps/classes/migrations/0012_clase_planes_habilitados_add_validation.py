# Fix #173: planes_habilitados validation
# The planes_habilitados JSONField already exists from 0001_initial.
# This migration documents that plan-based enrollment filtering is now enforced
# at the service layer. No schema changes required.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0011_inscripcion_asistio_nullable'),
    ]

    operations = [
        # No schema changes — planes_habilitados JSONField (list of plan IDs)
        # already exists. Enforcement is added in services.inscribir_socio.
    ]
