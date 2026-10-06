from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.members.models import Socio
from conftest import make_socio_factory, make_user_factory


class CleanupOrphanSociosDryRunTests(TestCase):
    """Test cleanup_orphan_socios command in dry-run mode (default)."""

    def test_dry_run_by_default_detects_but_does_not_delete(self):
        """Por defecto el comando opera en dry-run y no borra el Socio de un admin."""
        admin_user = make_user_factory(email='admin_orphan@test.com', rol='administrador')
        orphan_socio = make_socio_factory(usuario=admin_user)

        out = StringIO()
        call_command('cleanup_orphan_socios', stdout=out)
        output = out.getvalue()

        # Debe listarlo en el reporte
        self.assertIn(f'Socio #{orphan_socio.id}', output)
        self.assertIn('admin_orphan@test.com', output)
        self.assertIn('Dry-run', output)
        self.assertIn('Ninguno borrado', output)

        # El socio huérfano debe continuar existiendo en base de datos
        self.assertTrue(Socio.objects.filter(id=orphan_socio.id).exists())

    def test_explicit_dry_run_flag_prevents_deletion(self):
        """Pasar --dry-run explícitamente previene el borrado."""
        recepcion_user = make_user_factory(email='recepcion_orphan@test.com', rol='recepcionista')
        orphan_socio = make_socio_factory(usuario=recepcion_user)

        out = StringIO()
        call_command('cleanup_orphan_socios', '--dry-run', stdout=out)
        output = out.getvalue()

        self.assertIn('Dry-run', output)
        self.assertTrue(Socio.objects.filter(id=orphan_socio.id).exists())
