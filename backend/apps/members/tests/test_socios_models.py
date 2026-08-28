import re

from django.test import TestCase

from apps.members.models import Socio
from conftest import make_socio_factory, make_user_factory


class SocioTextChoicesTest(TestCase):

    def test_estado_textchoices_activo_value(self):
        from apps.members.models import Socio
        self.assertEqual(Socio.Estado.ACTIVO, 'activo')

    def test_estado_textchoices_suspendido_value(self):
        from apps.members.models import Socio
        self.assertEqual(Socio.Estado.SUSPENDIDO, 'suspendido')

    def test_estado_textchoices_baja_value(self):
        from apps.members.models import Socio
        self.assertEqual(Socio.Estado.BAJA, 'baja')

    def test_meta_ordering_is_numero_socio(self):
        from apps.members.models import Socio
        self.assertEqual(Socio._meta.ordering, ['numero_socio'])


class SocioLifecycleFieldsTest(TestCase):

    def test_numero_socio_auto_assigned_on_save(self):
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)
        self.assertIsNotNone(socio.numero_socio)
        self.assertRegex(socio.numero_socio, r'^S-\d{5}$')

    def test_numero_socio_not_overridden_if_already_set(self):
        user1 = make_user_factory()
        user2 = make_user_factory()
        socio1 = make_socio_factory(usuario=user1)
        socio2 = make_socio_factory(usuario=user2)
        self.assertNotEqual(socio1.numero_socio, socio2.numero_socio)

    def test_estado_defaults_to_activo(self):
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)
        self.assertEqual(socio.estado, 'activo')

    def test_socio_str(self):
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)
        self.assertEqual(str(socio), f'{socio.nombre} {socio.apellido}')

    def test_fecha_baja_defaults_none(self):
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)
        self.assertIsNone(socio.fecha_baja)

    def test_observaciones_defaults_blank(self):
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)
        self.assertEqual(socio.observaciones, '')
