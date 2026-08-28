import pytest
from datetime import date, timedelta
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.members.models import Socio
from apps.memberships.models import PlanMembresia, Membresia

User = get_user_model()

_counter = 0


def _next_id():
    global _counter
    _counter += 1
    return _counter


# ---------------------------------------------------------------------------
# Plain factory functions — importable directly by unittest.TestCase.setUp
# ---------------------------------------------------------------------------

def make_user_factory(rol='administrador', **kwargs):
    """Create a User without requiring pytest db fixture. Use in TestCase.setUp."""
    n = _next_id()
    defaults = dict(
        email=f'user{n}@conftest.test',
        password='pass1234!',
        username=f'user{n}@conftest.test',
        rol=rol,
    )
    defaults.update(kwargs)
    return User.objects.create_user(**defaults)


def make_socio_factory(usuario, **kwargs):
    """Create a Socio for the given user. Use in TestCase.setUp."""
    n = _next_id()
    socio_fields = dict(
        nombre='Test',
        apellido='Socio',
        dni=f'{n:08d}',
        telefono='5491100000001',
    )
    socio_fields.update(kwargs)
    return Socio.objects.create(usuario=usuario, **socio_fields)


def make_plan_factory(**kwargs):
    """Create a PlanMembresia. Use in TestCase.setUp."""
    n = _next_id()
    defaults = dict(
        nombre=f'Plan {n}',
        precio='1000.00',
        duracion_dias=30,
        clases_asignadas=0,
        activo=True,
    )
    defaults.update(kwargs)
    return PlanMembresia.objects.create(**defaults)


def make_membresia_factory(socio, plan, **kwargs):
    """Create a Membresia for the given socio and plan. Use in TestCase.setUp."""
    fecha_inicio = kwargs.pop('fecha_inicio', date.today())
    fecha_fin = kwargs.pop('fecha_fin', fecha_inicio + timedelta(days=plan.duracion_dias))
    defaults = dict(
        socio=socio,
        plan=plan,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        estado=Membresia.Estado.ACTIVA,
    )
    defaults.update(kwargs)
    return Membresia.objects.create(**defaults)


# ---------------------------------------------------------------------------
# pytest fixtures — used in pytest-native test functions and classes
# ---------------------------------------------------------------------------

@pytest.fixture
def make_user(db):
    def _make(rol='administrador', **kwargs):
        return make_user_factory(rol=rol, **kwargs)
    return _make


@pytest.fixture
def make_socio(db, make_user):
    def _make(rol='socio', usuario=None, **kwargs):
        if usuario is None:
            usuario = make_user(rol=rol)
        return make_socio_factory(usuario=usuario, **kwargs)
    return _make


@pytest.fixture
def make_plan(db):
    def _make(**kwargs):
        return make_plan_factory(**kwargs)
    return _make


@pytest.fixture
def make_membresia(db, make_socio, make_plan):
    def _make(socio=None, plan=None, **kwargs):
        if socio is None:
            socio = make_socio()
        if plan is None:
            plan = make_plan()
        return make_membresia_factory(socio=socio, plan=plan, **kwargs)
    return _make


@pytest.fixture
def auth_client(db, make_user):
    def _make(user=None, rol='administrador'):
        if user is None:
            user = make_user(rol=rol)
        client = APIClient()
        client.force_authenticate(user=user)
        return client, user
    return _make
