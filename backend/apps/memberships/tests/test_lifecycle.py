"""Tests for #188 — Membresía lifecycle: suspender/reactivar/cancelar/renovar."""
from datetime import date, timedelta

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.memberships.models import Membresia
from apps.memberships.services import (
    cancelar_membresia,
    reactivar_membresia,
    renovar_membresia,
    suspender_membresia,
)
from conftest import (
    make_membresia_factory,
    make_plan_factory,
    make_socio_factory,
    make_user_factory,
)


def _make_admin():
    return make_user_factory(rol='administrador')


def _make_recep():
    return make_user_factory(rol='recepcionista')


def _make_socio():
    u = make_user_factory(rol='socio')
    return make_socio_factory(u)


def _make_plan():
    return make_plan_factory()


def _auth_client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


# ---------------------------------------------------------------------------
# Test #1: suspender requires motivo and transitions correctly
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_suspender_membresia_requires_motivo_and_transitions_correctly():
    """#188 — mandatory test 1."""
    admin = _make_admin()
    socio = _make_socio()
    plan = _make_plan()
    m = make_membresia_factory(socio, plan, estado=Membresia.Estado.ACTIVA)

    # Without motivo → ValueError
    with pytest.raises(ValueError, match='motivo'):
        suspender_membresia(m, admin, motivo='')

    # With motivo → transitions to SUSPENDIDA
    suspender_membresia(m, admin, motivo='Lesión temporaria')
    m.refresh_from_db()

    assert m.estado == Membresia.Estado.SUSPENDIDA
    assert m.motivo_estado == 'Lesión temporaria'
    assert m.cambiado_por == admin
    assert m.fecha_suspension == timezone.localdate()


# ---------------------------------------------------------------------------
# Test #2: cancelar locks further transitions
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_cancel_locks_further_transitions_returns_400():
    """#188 — mandatory test 2."""
    admin = _make_admin()
    socio = _make_socio()
    plan = _make_plan()
    m = make_membresia_factory(socio, plan, estado=Membresia.Estado.ACTIVA)

    # Cancel it
    cancelar_membresia(m, admin, motivo='Cierre de cuenta')
    m.refresh_from_db()
    assert m.estado == Membresia.Estado.CANCELADA

    # Attempt further transitions → all raise ValueError
    with pytest.raises(ValueError):
        suspender_membresia(m, admin, motivo='Cualquier cosa')
    with pytest.raises(ValueError):
        reactivar_membresia(m, admin)
    with pytest.raises(ValueError):
        cancelar_membresia(m, admin, motivo='Otra vez')

    # Via API: the viewset should return 400
    client = _auth_client(admin)
    url = f'/api/memberships/membresias/{m.pk}/cancelar/'
    resp = client.post(url, {'motivo': 'intent'}, format='json')
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# Test #3: unique active membresia per socio enforced
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_unique_active_membresia_per_socio_enforced():
    """#188 — mandatory test 3."""
    from django.db import IntegrityError, transaction

    socio = _make_socio()
    plan = _make_plan()

    # Create one active membership
    make_membresia_factory(socio, plan, estado=Membresia.Estado.ACTIVA)

    # Attempt to create another active one directly → DB constraint violation
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            Membresia.objects.create(
                socio=socio,
                plan=plan,
                fecha_inicio=date.today(),
                fecha_fin=date.today() + timedelta(days=30),
                estado=Membresia.Estado.ACTIVA,
            )

    # But can have multiple non-ACTIVA memberships
    m_vencida = Membresia.objects.create(
        socio=socio,
        plan=plan,
        fecha_inicio=date.today() - timedelta(days=60),
        fecha_fin=date.today() - timedelta(days=30),
        estado=Membresia.Estado.VENCIDA,
    )
    assert m_vencida.pk is not None  # no constraint violation


# ---------------------------------------------------------------------------
# Service-level tests for reactivar (date extension)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_reactivar_extends_fecha_fin_by_suspended_days():
    """Reactivar adds the number of days suspended to fecha_fin."""
    admin = _make_admin()
    socio = _make_socio()
    plan = _make_plan()

    today = timezone.localdate()
    original_fin = today + timedelta(days=30)
    m = make_membresia_factory(socio, plan, estado=Membresia.Estado.ACTIVA, fecha_fin=original_fin)

    # Suspend with fecha_suspension = today - 5 days
    m.fecha_suspension = today - timedelta(days=5)
    m.estado = Membresia.Estado.SUSPENDIDA
    m.save(update_fields=['fecha_suspension', 'estado', 'updated_at'])

    reactivar_membresia(m, admin)
    m.refresh_from_db()

    assert m.estado == Membresia.Estado.ACTIVA
    assert m.fecha_fin == original_fin + timedelta(days=5)
    assert m.fecha_suspension is None


# ---------------------------------------------------------------------------
# dar_baja cancels active/suspended memberships
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_dar_baja_cancels_all_cancelable_membresias():
    """#188 — dar_baja must cancel active and suspended memberships."""
    from apps.members.services import dar_baja

    socio = _make_socio()
    plan = _make_plan()

    m_activa = make_membresia_factory(socio, plan, estado=Membresia.Estado.ACTIVA)
    m_vencida = Membresia.objects.create(
        socio=socio, plan=plan,
        fecha_inicio=date.today() - timedelta(days=60),
        fecha_fin=date.today() - timedelta(days=30),
        estado=Membresia.Estado.VENCIDA,
    )

    dar_baja(socio)

    m_activa.refresh_from_db()
    m_vencida.refresh_from_db()

    assert m_activa.estado == Membresia.Estado.CANCELADA
    # Vencida memberships are not in the cancelable set
    assert m_vencida.estado == Membresia.Estado.VENCIDA


# ---------------------------------------------------------------------------
# API-level tests for lifecycle actions
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_suspender_via_api_recepcionista():
    """Recepcionista can suspender."""
    recep = _make_recep()
    socio = _make_socio()
    plan = _make_plan()
    m = make_membresia_factory(socio, plan, estado=Membresia.Estado.ACTIVA)

    client = _auth_client(recep)
    resp = client.post(
        f'/api/memberships/membresias/{m.pk}/suspender/',
        {'motivo': 'Lesión'},
        format='json',
    )
    assert resp.status_code == status.HTTP_200_OK
    m.refresh_from_db()
    assert m.estado == Membresia.Estado.SUSPENDIDA


@pytest.mark.django_db
def test_reactivar_via_api():
    """Admin can reactivar a suspended membership."""
    admin = _make_admin()
    socio = _make_socio()
    plan = _make_plan()
    m = make_membresia_factory(socio, plan, estado=Membresia.Estado.SUSPENDIDA)
    m.fecha_suspension = timezone.localdate()
    m.save(update_fields=['fecha_suspension', 'updated_at'])

    client = _auth_client(admin)
    resp = client.post(
        f'/api/memberships/membresias/{m.pk}/reactivar/',
        {},
        format='json',
    )
    assert resp.status_code == status.HTTP_200_OK
    m.refresh_from_db()
    assert m.estado == Membresia.Estado.ACTIVA


@pytest.mark.django_db
def test_cancelar_via_api_only_admin():
    """Only admin can cancel a membership; recepcionista gets 403."""
    recep = _make_recep()
    admin = _make_admin()
    socio = _make_socio()
    plan = _make_plan()
    m = make_membresia_factory(socio, plan, estado=Membresia.Estado.ACTIVA)

    # Recepcionista → 403
    client_recep = _auth_client(recep)
    resp = client_recep.post(
        f'/api/memberships/membresias/{m.pk}/cancelar/',
        {'motivo': 'test'},
        format='json',
    )
    assert resp.status_code == status.HTTP_403_FORBIDDEN

    # Admin → 200
    client_admin = _auth_client(admin)
    resp = client_admin.post(
        f'/api/memberships/membresias/{m.pk}/cancelar/',
        {'motivo': 'Baja voluntaria'},
        format='json',
    )
    assert resp.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_renovar_via_api_creates_new_membership():
    """Renovar action delegates to renovar_membresia service."""
    admin = _make_admin()
    socio = _make_socio()
    plan = _make_plan()
    m = make_membresia_factory(socio, plan, estado=Membresia.Estado.ACTIVA)

    client = _auth_client(admin)
    resp = client.post(
        f'/api/memberships/membresias/{m.pk}/renovar/',
        {'plan_id': plan.pk},
        format='json',
    )
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.data['estado'] == 'activa'

    m.refresh_from_db()
    assert m.estado == Membresia.Estado.VENCIDA
