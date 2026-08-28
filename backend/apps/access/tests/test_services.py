import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.access.services import has_active_membership
from apps.members.models import Socio
from apps.memberships.models import Membresia, PlanMembresia

User = get_user_model()

_counter = 0


def _make_user(email=None, rol='socio', **kwargs):
    global _counter
    _counter += 1
    if email is None:
        email = f'user{_counter}@access.services.test'
    return User.objects.create_user(
        email=email,
        password='pass1234!',
        username=email,
        rol=rol,
        **kwargs,
    )


def _make_socio(user, estado='activo', dni=None):
    global _counter
    _counter += 1
    if dni is None:
        dni = f'{_counter:08d}'
    return Socio.objects.create(
        usuario=user,
        dni=dni,
        nombre='Test',
        apellido='Service',
        telefono='5491100000066',
        estado=estado,
    )


def _make_plan(nombre=None, duracion_dias=30):
    global _counter
    _counter += 1
    if nombre is None:
        nombre = f'Plan Svc {_counter}'
    return PlanMembresia.objects.create(
        nombre=nombre,
        duracion_dias=duracion_dias,
        precio='5000.00',
        clases_asignadas=0,
        activo=True,
    )


def _make_membresia(socio, plan, estado='activa', fecha_fin=None):
    today = datetime.date.today()
    if fecha_fin is None:
        fecha_fin = today + datetime.timedelta(days=plan.duracion_dias)
    return Membresia.objects.create(
        socio=socio,
        plan=plan,
        fecha_inicio=today,
        fecha_fin=fecha_fin,
        estado=estado,
    )


class HasActiveMembershipTests(TestCase):

    def test_no_socio_returns_false(self):
        user = _make_user()
        result = has_active_membership(user)
        self.assertFalse(result)

    def test_no_membership_returns_false(self):
        user = _make_user()
        _make_socio(user, estado='activo')
        result = has_active_membership(user)
        self.assertFalse(result)

    def test_active_non_expired_returns_true(self):
        user = _make_user()
        socio = _make_socio(user, estado='activo')
        plan = _make_plan()
        today = datetime.date.today()
        _make_membresia(socio, plan, estado='activa', fecha_fin=today + datetime.timedelta(days=10))

        result = has_active_membership(user)
        self.assertTrue(result)

    def test_expired_membership_returns_false_and_marks_vencida(self):
        user = _make_user()
        socio = _make_socio(user, estado='activo')
        plan = _make_plan()
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        membresia = _make_membresia(socio, plan, estado='activa', fecha_fin=yesterday)

        result = has_active_membership(user)
        self.assertFalse(result)

        membresia.refresh_from_db()
        self.assertEqual(membresia.estado, 'vencida')

    def test_socio_suspendido_returns_false(self):
        user = _make_user()
        socio = _make_socio(user, estado='suspendido')
        plan = _make_plan()
        today = datetime.date.today()
        _make_membresia(socio, plan, estado='activa', fecha_fin=today + datetime.timedelta(days=10))

        result = has_active_membership(user)
        self.assertFalse(result)

    def test_socio_baja_returns_false(self):
        user = _make_user()
        socio = _make_socio(user, estado='baja')
        plan = _make_plan()
        today = datetime.date.today()
        _make_membresia(socio, plan, estado='activa', fecha_fin=today + datetime.timedelta(days=10))

        result = has_active_membership(user)
        self.assertFalse(result)

    def test_concurrent_lazy_expiry_consistent(self):
        """
        Two sequential calls on the same expired membership.
        Both must return False and membership must be vencida exactly once.
        """
        user = _make_user()
        socio = _make_socio(user, estado='activo')
        plan = _make_plan()
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        membresia = _make_membresia(socio, plan, estado='activa', fecha_fin=yesterday)

        result1 = has_active_membership(user)
        result2 = has_active_membership(user)

        self.assertFalse(result1)
        self.assertFalse(result2)

        membresia.refresh_from_db()
        self.assertEqual(membresia.estado, 'vencida')
