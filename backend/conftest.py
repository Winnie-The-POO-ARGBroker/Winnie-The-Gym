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


# ---------------------------------------------------------------------------
# Gym clock pin — keeps access tests independent of the wall-clock time
# ---------------------------------------------------------------------------
# The seeded GymConfig row (migration 0002) is open 07:00-23:00 ART, so any
# test that hits an access endpoint was denied with FUERA_DE_HORARIO whenever
# the suite ran outside those hours (e.g. CI at 23:46 ART).

import contextlib  # noqa: E402
import datetime  # noqa: E402
import zoneinfo  # noqa: E402
from unittest.mock import patch  # noqa: E402

_GYM_TZ = zoneinfo.ZoneInfo('America/Argentina/Buenos_Aires')
_DEFAULT_GYM_CLOCK = datetime.time(12, 0)
_gym_clock = {'time': _DEFAULT_GYM_CLOCK}


def _gym_now_local():
    today = datetime.datetime.now(_GYM_TZ).date()
    return datetime.datetime.combine(today, _gym_clock['time'], tzinfo=_GYM_TZ)


@contextlib.contextmanager
def gym_clock_at(hour, minute=0):
    """Override the pinned gym-local time (ART) used by the access horario checks."""
    previous = _gym_clock['time']
    _gym_clock['time'] = datetime.time(hour, minute)
    try:
        yield
    finally:
        _gym_clock['time'] = previous


@pytest.fixture(autouse=True)
def pin_gym_clock():
    """Pin check_horario / check_horario_plan to 12:00 ART unless overridden."""
    from apps.access import services

    def _check_horario(gym_config, now_local=None):
        return services.check_horario(gym_config, now_local=now_local or _gym_now_local())

    def _check_horario_plan(socio, plan, now_local=None):
        return services.check_horario_plan(socio, plan, now_local=now_local or _gym_now_local())

    with patch('apps.access.views.check_horario', _check_horario), \
            patch('apps.access.views.check_horario_plan', _check_horario_plan):
        _gym_clock['time'] = _DEFAULT_GYM_CLOCK
        yield
