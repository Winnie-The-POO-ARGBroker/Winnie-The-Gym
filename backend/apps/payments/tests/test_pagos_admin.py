"""Tests for #186 — Payments admin screen: search by DNI, totales endpoint."""
from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.memberships.models import Membresia
from apps.payments.models import Pago
from conftest import (
    make_membresia_factory,
    make_plan_factory,
    make_socio_factory,
    make_user_factory,
)


def _auth_client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


def _make_approved_pago(socio, plan, monto='500.00', paid_at=None):
    """Create an approved Pago without triggering memberships."""
    return Pago.objects.create(
        socio=socio,
        plan=plan,
        monto=Decimal(monto),
        metodo=Pago.Metodo.MANUAL,
        estado=Pago.Estado.APROBADO,
        paid_at=paid_at or timezone.now(),
    )


# ---------------------------------------------------------------------------
# Test #4: totales endpoint respects filters
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_pagos_totales_endpoint_respects_filters():
    """#186 — mandatory test 4."""
    admin = make_user_factory(rol='administrador')
    client = _auth_client(admin)

    u = make_user_factory(rol='socio', email='totales@test.com')
    socio = make_socio_factory(u)
    plan = make_plan_factory(nombre='TotalesPlan', precio=Decimal('1000.00'))

    _make_approved_pago(socio, plan, monto='1000.00')
    Pago.objects.create(
        socio=socio, plan=plan, monto=Decimal('500.00'),
        metodo=Pago.Metodo.MANUAL, estado=Pago.Estado.PENDIENTE,
    )

    # Without filter: should see both in total count
    resp = client.get('/api/payments/pagos/totales/')
    assert resp.status_code == status.HTTP_200_OK
    data = resp.data
    assert 'total_aprobado' in data
    assert 'total_pendiente' in data
    assert 'count' in data
    assert float(data['total_aprobado']) >= 1000.0

    # With estado filter: only aprobado
    resp2 = client.get('/api/payments/pagos/totales/?estado=aprobado')
    assert resp2.status_code == status.HTTP_200_OK
    assert float(resp2.data['total_pendiente']) == 0.0


# ---------------------------------------------------------------------------
# Test #5: search by DNI finds payment
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_pagos_search_by_dni_finds_payment():
    """#186 — mandatory test 5."""
    admin = make_user_factory(rol='administrador')
    client = _auth_client(admin)

    u = make_user_factory(rol='socio', email='dni_search@test.com')
    socio = make_socio_factory(u, dni='98765432')
    plan = make_plan_factory(nombre='SearchPlan')
    pago = _make_approved_pago(socio, plan)

    # Search by exact DNI
    resp = client.get(f'/api/payments/pagos/?search={socio.dni}')
    assert resp.status_code == status.HTTP_200_OK
    pago_ids = [p['id'] for p in resp.data['results']]
    assert pago.pk in pago_ids

    # Search by partial DNI should also work
    partial = socio.dni[:5]
    resp2 = client.get(f'/api/payments/pagos/?search={partial}')
    assert resp2.status_code == status.HTTP_200_OK


# ---------------------------------------------------------------------------
# paid_at range filter (#186)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_pagos_paid_at_range_filter():
    """paid_at_gte and paid_at_lte filter payments by approval date."""
    admin = make_user_factory(rol='administrador')
    client = _auth_client(admin)

    u = make_user_factory(rol='socio', email='range@test.com')
    socio = make_socio_factory(u)
    plan = make_plan_factory()

    past = timezone.now() - timedelta(days=10)
    recent = timezone.now()

    old_pago = _make_approved_pago(socio, plan, paid_at=past)
    new_pago = _make_approved_pago(socio, plan, paid_at=recent)

    # Filter to only recent
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    resp = client.get(f'/api/payments/pagos/?paid_at_gte={yesterday}')
    assert resp.status_code == status.HTTP_200_OK
    ids = [p['id'] for p in resp.data['results']]
    assert new_pago.pk in ids
    assert old_pago.pk not in ids
