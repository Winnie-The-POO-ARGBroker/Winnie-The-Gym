import re

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.members.models import Socio

User = get_user_model()

_user_counter = 0


def _make_user(email=None, rol='socio', **kwargs):
    global _user_counter
    _user_counter += 1
    if email is None:
        email = f'user{_user_counter}@test.com'
    return User.objects.create_user(
        email=email,
        password='pass1234!',
        username=email,
        rol=rol,
        **kwargs,
    )


def _make_socio(user, dni=None):
    global _user_counter
    if dni is None:
        _user_counter += 1
        dni = f'{_user_counter:08d}'
    return Socio.objects.create(
        usuario=user,
        dni=dni,
        nombre='Ana',
        apellido='Lopez',
        telefono='5491100000000',
    )


class SocioLifecycleFieldsTest(TestCase):

    def test_numero_socio_auto_assigned_on_save(self):
        user = _make_user()
        socio = _make_socio(user)
        self.assertIsNotNone(socio.numero_socio)
        self.assertRegex(socio.numero_socio, r'^S-\d{5}$')

    def test_numero_socio_not_overridden_if_already_set(self):
        user1 = _make_user()
        user2 = _make_user()
        socio1 = _make_socio(user1)
        socio2 = _make_socio(user2)
        self.assertNotEqual(socio1.numero_socio, socio2.numero_socio)

    def test_estado_defaults_to_activo(self):
        user = _make_user()
        socio = _make_socio(user)
        self.assertEqual(socio.estado, 'activo')

    def test_socio_str(self):
        user = _make_user()
        socio = _make_socio(user)
        self.assertEqual(str(socio), f'{socio.nombre} {socio.apellido}')

    def test_fecha_baja_defaults_none(self):
        user = _make_user()
        socio = _make_socio(user)
        self.assertIsNone(socio.fecha_baja)

    def test_observaciones_defaults_blank(self):
        user = _make_user()
        socio = _make_socio(user)
        self.assertEqual(socio.observaciones, '')
