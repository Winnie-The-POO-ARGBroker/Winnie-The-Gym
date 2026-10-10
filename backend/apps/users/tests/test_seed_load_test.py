"""Tests for the seed_load_test_users management command.

Verifies creation of synthetic users with Faker, role distribution (90/8/2%),
Socio & active Membresia generation, password verification, purge flag,
idempotency, and DEBUG=True guardrail.
"""
from io import StringIO
import os
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from apps.members.models import Socio
from apps.memberships.models import Membresia, PlanMembresia

User = get_user_model()


class SeedLoadTestUsersCommandTests(TestCase):

    def setUp(self):
        super().setUp()
        self.plan = PlanMembresia.objects.create(
            nombre='Plan Test Base',
            duracion_dias=30,
            precio=10000,
            clases_asignadas=10,
            activo=True,
        )

    @override_settings(DEBUG=True)
    def test_creates_100_users_by_default(self):
        """Running the command without args creates 100 load test users by default."""
        out = StringIO()
        call_command('seed_load_test_users', stdout=out)

        load_users = User.objects.filter(email__endswith='@loadtest.local')
        self.assertEqual(load_users.count(), 100)

        # Check role distribution: 90% socio, 8% recepcionista, 2% admin
        admins = load_users.filter(rol=User.Rol.ADMINISTRADOR)
        receps = load_users.filter(rol=User.Rol.RECEPCIONISTA)
        socios = load_users.filter(rol=User.Rol.SOCIO)

        self.assertEqual(admins.count(), 2)
        self.assertEqual(receps.count(), 8)
        self.assertEqual(socios.count(), 90)

        # Admins have rol=ADMINISTRADOR but is_staff=False and is_superuser=False (defensive posture)
        for admin in admins:
            self.assertEqual(admin.rol, User.Rol.ADMINISTRADOR)
            self.assertFalse(admin.is_staff)
            self.assertFalse(admin.is_superuser)

        # Recepcionistas have staff=False, superuser=False
        for recep in receps:
            self.assertEqual(recep.rol, User.Rol.RECEPCIONISTA)
            self.assertFalse(recep.is_staff)
            self.assertFalse(recep.is_superuser)

        # Socios have linked Socio records and active memberships consistent with plan duration
        for socio_user in socios:
            self.assertTrue(hasattr(socio_user, 'socio'))
            socio_record = socio_user.socio
            self.assertTrue(socio_record.dni.startswith('4000'))
            membresia = Membresia.objects.filter(socio=socio_record, estado=Membresia.Estado.ACTIVA).first()
            self.assertIsNotNone(membresia)
            # fecha_fin - fecha_inicio must match plan.duracion_dias exactly
            self.assertEqual((membresia.fecha_fin - membresia.fecha_inicio).days, membresia.plan.duracion_dias)

        # Verify password is valid / login-able
        sample_user = load_users.first()
        self.assertTrue(sample_user.check_password('LoadTest123!'))

    @override_settings(DEBUG=True)
    def test_membership_duration_matches_plan_duracion_dias(self):
        """La duración de la Membresía creada debe coincidir con plan.duracion_dias."""
        call_command('seed_load_test_users', count=5, prefix='dur_', stdout=StringIO())
        for membresia in Membresia.objects.filter(socio__usuario__email__startswith='dur_'):
            duracion = (membresia.fecha_fin - membresia.fecha_inicio).days
            self.assertEqual(duracion, membresia.plan.duracion_dias)

    @override_settings(DEBUG=True)
    def test_count_12_forces_min_one_recepcionista(self):
        """Count=12 fuerza al menos 1 recepcionista (branch de minimum)."""
        call_command('seed_load_test_users', count=12, prefix='r12_', stdout=StringIO())
        receps = User.objects.filter(email__startswith='r12_', rol=User.Rol.RECEPCIONISTA)
        self.assertGreaterEqual(receps.count(), 1)

    @override_settings(DEBUG=True)
    def test_count_50_forces_min_one_admin(self):
        """Count=50 fuerza al menos 1 administrador (branch de minimum)."""
        call_command('seed_load_test_users', count=50, prefix='a50_', stdout=StringIO())
        admins = User.objects.filter(email__startswith='a50_', rol=User.Rol.ADMINISTRADOR)
        self.assertGreaterEqual(admins.count(), 1)



    @override_settings(DEBUG=True)
    def test_purge_deletes_previous(self):
        """The --purge option removes existing load test users matching prefix before seeding."""
        call_command('seed_load_test_users', count=5, prefix='custom_', stdout=StringIO())
        self.assertEqual(User.objects.filter(email__startswith='custom_').count(), 5)

        # Run again with purge and count=3
        call_command('seed_load_test_users', count=3, prefix='custom_', purge=True, stdout=StringIO())
        self.assertEqual(User.objects.filter(email__startswith='custom_').count(), 3)

    @override_settings(DEBUG=False)
    def test_aborts_when_debug_false(self):
        """The command raises CommandError when DEBUG=False."""
        with self.assertRaises(CommandError) as ctx:
            call_command('seed_load_test_users', stdout=StringIO())

        self.assertIn('DEBUG=True', str(ctx.exception))

    @override_settings(DEBUG=True)
    def test_idempotent_no_duplicates_on_second_run(self):
        """Running the command multiple times with the same count without purge is idempotent."""
        out = StringIO()
        call_command('seed_load_test_users', count=10, prefix='idem_', stdout=out)
        self.assertEqual(User.objects.filter(email__startswith='idem_').count(), 10)

        # Second run without purge
        call_command('seed_load_test_users', count=10, prefix='idem_', stdout=out)
        self.assertEqual(User.objects.filter(email__startswith='idem_').count(), 10)

    @override_settings(DEBUG=True)
    def test_custom_password_env_var(self):
        """The command respects the LOAD_TEST_PASSWORD environment variable."""
        with patch.dict(os.environ, {'LOAD_TEST_PASSWORD': 'CustomSecret999!'}):
            call_command('seed_load_test_users', count=2, prefix='envpass_', stdout=StringIO())

        user = User.objects.get(email='envpass_00000@loadtest.local')
        self.assertTrue(user.check_password('CustomSecret999!'))
