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

    def test_force_combined_with_dry_run_resolves_to_dry_run_safer_default(self):
        """Si vienen ambos flags (--force --dry-run), gana dry-run por seguridad."""
        admin_user = make_user_factory(email='combo@test.com', rol='administrador')
        orphan_socio = make_socio_factory(usuario=admin_user)

        out = StringIO()
        call_command('cleanup_orphan_socios', '--force', '--dry-run', stdout=out)
        output = out.getvalue()

        # Debe ganar dry-run
        self.assertIn('Dry-run', output)
        self.assertIn('Ninguno borrado', output)

        # El socio debe seguir existiendo
        self.assertTrue(Socio.objects.filter(id=orphan_socio.id).exists())


class CleanupOrphanSociosForceTests(TestCase):
    """Test cleanup_orphan_socios command with --force execution."""

    def test_force_deletes_orphan_socio_and_reports_deleted_id(self):
        """Con --force se eliminan los socios huerfanos y se reportan sus IDs."""
        admin_user = make_user_factory(email='admin_force@test.com', rol='administrador')
        orphan_socio = make_socio_factory(usuario=admin_user)
        orphan_id = orphan_socio.id

        out = StringIO()
        call_command('cleanup_orphan_socios', '--force', stdout=out)
        output = out.getvalue()

        # Debe confirmar el borrado e incluir el ID eliminado
        self.assertIn('Borrados 1 socios', output)
        self.assertIn(str(orphan_id), output)

        # El registro de Socio debe haber sido eliminado
        self.assertFalse(Socio.objects.filter(id=orphan_id).exists())

        # El usuario User NO debe haber sido eliminado (sigue existiendo como admin)
        admin_user.refresh_from_db()
        self.assertEqual(admin_user.rol, 'administrador')

    def test_preserves_legitimate_socio_with_rol_socio(self):
        """Los socios legitimos (usuario.rol == 'socio') NUNCA deben ser borrados."""
        legit_user = make_user_factory(email='legit_socio@test.com', rol='socio')
        legit_socio = make_socio_factory(usuario=legit_user)

        admin_user = make_user_factory(email='another_admin@test.com', rol='administrador')
        orphan_socio = make_socio_factory(usuario=admin_user)

        out = StringIO()
        call_command('cleanup_orphan_socios', '--force', stdout=out)

        # El socio legítimo debe seguir existiendo intacto
        self.assertTrue(Socio.objects.filter(id=legit_socio.id).exists())
        # El huérfano sí debió ser eliminado
        self.assertFalse(Socio.objects.filter(id=orphan_socio.id).exists())

    def test_no_orphan_socios_found_message(self):
        """Si no hay socios huerfanos, informa el estado sin errores."""
        legit_user = make_user_factory(email='only_legit@test.com', rol='socio')
        make_socio_factory(usuario=legit_user)

        out = StringIO()
        call_command('cleanup_orphan_socios', stdout=out)
        output = out.getvalue()

        self.assertIn('No se encontraron socios huerfanos', output)
