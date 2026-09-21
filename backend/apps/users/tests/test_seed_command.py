"""Tests for the seed_demo_users management command.

Verifies idempotency, correct user/socio/membership creation,
and DEBUG guard.

REQ-1.1
"""
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from apps.members.models import Socio
from apps.memberships.models import Membresia
from apps.users.models import User


class SeedDemoUsersCommandTests(TestCase):

    @override_settings(DEBUG=True)
    def test_creates_five_demo_users(self):
        """Running the command once creates exactly 5 demo users."""
        out = StringIO()
        call_command('seed_demo_users', stdout=out)

        self.assertEqual(
            User.objects.filter(email__endswith='@winnie.local').count(),
            5,
        )

    @override_settings(DEBUG=True)
    def test_admin_user_has_correct_flags(self):
        """The admin demo user has is_staff=True and is_superuser=True."""
        call_command('seed_demo_users', stdout=StringIO())

        admin = User.objects.get(email='admin@winnie.local')
        self.assertEqual(admin.rol, 'administrador')
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

    @override_settings(DEBUG=True)
    def test_recepcionista_user_created(self):
        """The recepcionista demo user is created with the correct role."""
        call_command('seed_demo_users', stdout=StringIO())

        recep = User.objects.get(email='recepcion@winnie.local')
        self.assertEqual(recep.rol, 'recepcionista')
        self.assertFalse(recep.is_superuser)

    @override_settings(DEBUG=True)
    def test_three_socios_have_socio_records(self):
        """The 3 socio demo users each have a linked Socio record."""
        call_command('seed_demo_users', stdout=StringIO())

        socio_emails = [
            'socio.activo@winnie.local',
            'socio.vencido@winnie.local',
            'socio.nuevo@winnie.local',
        ]
        for email in socio_emails:
            user = User.objects.get(email=email)
            self.assertTrue(
                Socio.objects.filter(usuario=user).exists(),
                f'Expected Socio record for {email}',
            )

    @override_settings(DEBUG=True)
    def test_socio_activo_has_active_membership(self):
        """socio.activo has a Membresia with estado=activa."""
        call_command('seed_demo_users', stdout=StringIO())

        user = User.objects.get(email='socio.activo@winnie.local')
        socio = Socio.objects.get(usuario=user)
        self.assertTrue(
            Membresia.objects.filter(socio=socio, estado=Membresia.Estado.ACTIVA).exists(),
            'Expected an active Membresia for socio.activo',
        )

    @override_settings(DEBUG=True)
    def test_socio_vencido_has_expired_membership(self):
        """socio.vencido has a Membresia with estado=vencida."""
        call_command('seed_demo_users', stdout=StringIO())

        user = User.objects.get(email='socio.vencido@winnie.local')
        socio = Socio.objects.get(usuario=user)
        self.assertTrue(
            Membresia.objects.filter(socio=socio, estado=Membresia.Estado.VENCIDA).exists(),
            'Expected a vencida Membresia for socio.vencido',
        )

    @override_settings(DEBUG=True)
    def test_socio_nuevo_has_no_membership(self):
        """socio.nuevo has no Membresia records."""
        call_command('seed_demo_users', stdout=StringIO())

        user = User.objects.get(email='socio.nuevo@winnie.local')
        socio = Socio.objects.get(usuario=user)
        self.assertEqual(
            Membresia.objects.filter(socio=socio).count(),
            0,
            'Expected no Membresia for socio.nuevo',
        )

    @override_settings(DEBUG=True)
    def test_idempotent_no_duplicates_on_second_run(self):
        """Running the command twice does not create duplicate users."""
        out = StringIO()
        call_command('seed_demo_users', stdout=out)
        call_command('seed_demo_users', stdout=out)

        self.assertEqual(
            User.objects.filter(email__endswith='@winnie.local').count(),
            5,
        )

    @override_settings(DEBUG=False)
    def test_aborts_when_debug_false(self):
        """The command raises CommandError when DEBUG=False."""
        with self.assertRaises(CommandError):
            call_command('seed_demo_users', stdout=StringIO())
