import datetime

from django.test import TestCase

from apps.access.services import has_active_membership
from conftest import make_membresia_factory, make_plan_factory, make_socio_factory, make_user_factory


class HasActiveMembershipTests(TestCase):

    def test_no_socio_returns_false(self):
        user = make_user_factory(rol='socio')
        result = has_active_membership(user)
        self.assertFalse(result)

    def test_no_membership_returns_false(self):
        user = make_user_factory(rol='socio')
        make_socio_factory(usuario=user, estado='activo')
        result = has_active_membership(user)
        self.assertFalse(result)

    def test_active_non_expired_returns_true(self):
        user = make_user_factory(rol='socio')
        socio = make_socio_factory(usuario=user, estado='activo')
        plan = make_plan_factory()
        today = datetime.date.today()
        make_membresia_factory(socio, plan, fecha_fin=today + datetime.timedelta(days=10))

        result = has_active_membership(user)
        self.assertTrue(result)

    def test_expired_membership_returns_false_and_marks_vencida(self):
        user = make_user_factory(rol='socio')
        socio = make_socio_factory(usuario=user, estado='activo')
        plan = make_plan_factory()
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        membresia = make_membresia_factory(socio, plan, fecha_fin=yesterday)

        result = has_active_membership(user)
        self.assertFalse(result)

        membresia.refresh_from_db()
        self.assertEqual(membresia.estado, 'vencida')

    def test_socio_suspendido_returns_false(self):
        user = make_user_factory(rol='socio')
        socio = make_socio_factory(usuario=user, estado='suspendido')
        plan = make_plan_factory()
        today = datetime.date.today()
        make_membresia_factory(socio, plan, fecha_fin=today + datetime.timedelta(days=10))

        result = has_active_membership(user)
        self.assertFalse(result)

    def test_socio_baja_returns_false(self):
        user = make_user_factory(rol='socio')
        socio = make_socio_factory(usuario=user, estado='baja')
        plan = make_plan_factory()
        today = datetime.date.today()
        make_membresia_factory(socio, plan, fecha_fin=today + datetime.timedelta(days=10))

        result = has_active_membership(user)
        self.assertFalse(result)

    def test_concurrent_lazy_expiry_consistent(self):
        """
        Two sequential calls on the same expired membership.
        Both must return False and membership must be vencida exactly once.
        """
        user = make_user_factory(rol='socio')
        socio = make_socio_factory(usuario=user, estado='activo')
        plan = make_plan_factory()
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        membresia = make_membresia_factory(socio, plan, fecha_fin=yesterday)

        result1 = has_active_membership(user)
        result2 = has_active_membership(user)

        self.assertFalse(result1)
        self.assertFalse(result2)

        membresia.refresh_from_db()
        self.assertEqual(membresia.estado, 'vencida')
