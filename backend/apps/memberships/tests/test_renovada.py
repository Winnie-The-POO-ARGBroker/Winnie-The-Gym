"""Tests for the RENOVADA estado: a membership superseded by a renewal while still running."""
from datetime import date, timedelta

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.access.services import has_active_membership
from apps.memberships.models import Membresia
from apps.memberships.services import (
    VALID_TRANSITIONS,
    cancelar_membresia,
    reactivar_membresia,
    renovar_membresia,
    suspender_membresia,
)
from conftest import make_membresia_factory, make_plan_factory, make_socio_factory, make_user_factory

URL = '/api/memberships/membresias/'


def _client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


def _socio():
    return make_socio_factory(usuario=make_user_factory(rol='socio'), estado='activo')


# ---------------------------------------------------------------------------
# renovar_membresia
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_renovar_marks_running_membership_as_renovada_and_stacks_days():
    socio = _socio()
    plan = make_plan_factory(duracion_dias=30)
    today = date.today()
    running = make_membresia_factory(
        socio, plan, fecha_inicio=today - timedelta(days=20), fecha_fin=today + timedelta(days=10),
    )

    nueva = renovar_membresia(socio, plan)

    running.refresh_from_db()
    assert running.estado == Membresia.Estado.RENOVADA
    assert nueva.estado == Membresia.Estado.ACTIVA
    assert nueva.fecha_fin == today + timedelta(days=30 + 10)


@pytest.mark.django_db
def test_renovar_marks_already_ended_active_membership_as_vencida():
    socio = _socio()
    plan = make_plan_factory(duracion_dias=30)
    today = date.today()
    ended = make_membresia_factory(
        socio, plan, fecha_inicio=today - timedelta(days=40), fecha_fin=today - timedelta(days=1),
    )

    nueva = renovar_membresia(socio, plan)

    ended.refresh_from_db()
    assert ended.estado == Membresia.Estado.VENCIDA
    assert nueva.estado == Membresia.Estado.ACTIVA
    assert Membresia.objects.filter(socio=socio, estado=Membresia.Estado.ACTIVA).count() == 1


@pytest.mark.django_db
def test_renovar_leaves_other_estados_untouched():
    socio = _socio()
    plan = make_plan_factory(duracion_dias=30)
    today = date.today()
    old = make_membresia_factory(
        socio, plan, fecha_inicio=today - timedelta(days=90), fecha_fin=today - timedelta(days=60),
        estado=Membresia.Estado.VENCIDA,
    )
    cancelled = make_membresia_factory(
        socio, plan, fecha_inicio=today - timedelta(days=10), fecha_fin=today + timedelta(days=20),
        estado=Membresia.Estado.CANCELADA,
    )

    renovar_membresia(socio, plan)

    old.refresh_from_db()
    cancelled.refresh_from_db()
    assert old.estado == Membresia.Estado.VENCIDA
    assert cancelled.estado == Membresia.Estado.CANCELADA


# ---------------------------------------------------------------------------
# Transitions: terminal and not settable
# ---------------------------------------------------------------------------

def test_renovada_is_terminal_and_not_a_transition_target():
    assert VALID_TRANSITIONS[Membresia.Estado.RENOVADA] == set()
    for origin, targets in VALID_TRANSITIONS.items():
        assert Membresia.Estado.RENOVADA not in targets, origin


@pytest.mark.django_db
def test_lifecycle_services_reject_renovada():
    socio = _socio()
    plan = make_plan_factory()
    m = make_membresia_factory(socio, plan, estado=Membresia.Estado.RENOVADA)
    actor = make_user_factory(rol='administrador')

    with pytest.raises(ValueError):
        suspender_membresia(m, actor, 'x')
    with pytest.raises(ValueError):
        reactivar_membresia(m, actor)
    with pytest.raises(ValueError):
        cancelar_membresia(m, actor, 'x')


@pytest.mark.django_db
def test_patch_estado_renovada_is_rejected():
    admin = make_user_factory(rol='administrador')
    m = make_membresia_factory(_socio(), make_plan_factory())

    resp = _client(admin).patch(f'{URL}{m.pk}/', {'estado': 'renovada'}, format='json')

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    m.refresh_from_db()
    assert m.estado == Membresia.Estado.ACTIVA


@pytest.mark.django_db
def test_renovar_endpoint_marks_previous_as_renovada():
    admin = make_user_factory(rol='administrador')
    plan = make_plan_factory()
    m = make_membresia_factory(_socio(), plan)

    resp = _client(admin).post(f'{URL}{m.pk}/renovar/', {'plan_id': plan.pk}, format='json')

    assert resp.status_code == status.HTTP_201_CREATED
    m.refresh_from_db()
    assert m.estado == Membresia.Estado.RENOVADA


# ---------------------------------------------------------------------------
# GET ?ultima=true
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_list_ultima_true_returns_only_latest_membership_per_socio():
    admin = make_user_factory(rol='administrador')
    plan = make_plan_factory()
    today = date.today()

    renewed = _socio()
    make_membresia_factory(
        renewed, plan, fecha_inicio=today - timedelta(days=60), fecha_fin=today - timedelta(days=30),
        estado=Membresia.Estado.VENCIDA,
    )
    current = make_membresia_factory(
        renewed, plan, fecha_inicio=today - timedelta(days=5), fecha_fin=today + timedelta(days=25),
    )
    expired = _socio()
    only = make_membresia_factory(
        expired, plan, fecha_inicio=today - timedelta(days=60), fecha_fin=today - timedelta(days=30),
        estado=Membresia.Estado.VENCIDA,
    )

    resp = _client(admin).get(URL, {'ultima': 'true'})

    assert resp.status_code == status.HTTP_200_OK
    ids = {row['id'] for row in resp.data['results']}
    assert ids == {current.pk, only.pk}


@pytest.mark.django_db
def test_list_ultima_with_estado_vencida_excludes_socios_who_renewed():
    admin = make_user_factory(rol='administrador')
    plan = make_plan_factory()
    today = date.today()

    renewed = _socio()
    make_membresia_factory(
        renewed, plan, fecha_inicio=today - timedelta(days=60), fecha_fin=today - timedelta(days=30),
        estado=Membresia.Estado.VENCIDA,
    )
    make_membresia_factory(renewed, plan, fecha_inicio=today - timedelta(days=5), fecha_fin=today + timedelta(days=25))
    expired = _socio()
    only = make_membresia_factory(
        expired, plan, fecha_inicio=today - timedelta(days=60), fecha_fin=today - timedelta(days=30),
        estado=Membresia.Estado.VENCIDA,
    )

    resp = _client(admin).get(URL, {'ultima': 'true', 'estado': 'vencida'})

    assert [row['id'] for row in resp.data['results']] == [only.pk]


@pytest.mark.django_db
def test_list_without_ultima_returns_every_membership():
    admin = make_user_factory(rol='administrador')
    plan = make_plan_factory()
    socio = _socio()
    today = date.today()
    make_membresia_factory(
        socio, plan, fecha_inicio=today - timedelta(days=60), fecha_fin=today - timedelta(days=30),
        estado=Membresia.Estado.VENCIDA,
    )
    make_membresia_factory(socio, plan)

    resp = _client(admin).get(URL)

    assert len(resp.data['results']) == 2


# ---------------------------------------------------------------------------
# Access
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_access_with_active_and_renovada_pair_is_granted_by_the_active_one():
    socio = _socio()
    plan = make_plan_factory()
    today = date.today()
    make_membresia_factory(
        socio, plan, fecha_inicio=today - timedelta(days=20), fecha_fin=today + timedelta(days=10),
        estado=Membresia.Estado.RENOVADA,
    )
    make_membresia_factory(socio, plan, fecha_inicio=today, fecha_fin=today + timedelta(days=40))

    assert has_active_membership(socio.usuario) is True


@pytest.mark.django_db
def test_renovada_alone_never_grants_access():
    socio = _socio()
    plan = make_plan_factory()
    today = date.today()
    renovada = make_membresia_factory(
        socio, plan, fecha_inicio=today - timedelta(days=20), fecha_fin=today + timedelta(days=10),
        estado=Membresia.Estado.RENOVADA,
    )

    assert has_active_membership(socio.usuario) is False
    renovada.refresh_from_db()
    assert renovada.estado == Membresia.Estado.RENOVADA
