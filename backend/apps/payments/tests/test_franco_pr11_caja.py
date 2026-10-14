"""Tests for #193 — GET /api/payments/caja/ daily cash register summary."""
import datetime
from decimal import Decimal

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.payments.models import Pago
from apps.payments.services import cobro_manual
from conftest import (
    make_membresia_factory,
    make_plan_factory,
    make_socio_factory,
    make_user_factory,
)

CAJA_URL = '/api/payments/caja/'


def _auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _make_admin():
    return make_user_factory(rol='administrador', is_staff=True)


def _make_recep():
    return make_user_factory(rol='recepcionista')


def _make_active_socio():
    u = make_user_factory(rol='socio')
    s = make_socio_factory(u)
    return s


def _make_cobro(operador, socio, medio, monto='1000.00'):
    """Create an approved manual payment via cobro_manual service."""
    plan = make_plan_factory(precio=monto)
    make_membresia_factory(socio, plan)
    return cobro_manual(
        operador, socio, plan, Decimal(monto),
        medio=medio,
        observacion='test',
        motivo='',
    )


# ---------------------------------------------------------------------------
# Test 4: recepcionista solo ve propia caja
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_caja_recepcionista_solo_ve_propia():
    """A recepcionista calling /caja/ only sees their own payments."""
    recep1 = _make_recep()
    recep2 = _make_recep()
    socio1 = _make_active_socio()
    socio2 = _make_active_socio()

    _make_cobro(recep1, socio1, Pago.MedioManual.EFECTIVO, '500.00')
    _make_cobro(recep2, socio2, Pago.MedioManual.EFECTIVO, '800.00')

    today = datetime.date.today().isoformat()
    client = _auth_client(recep1)
    response = client.get(CAJA_URL, {'fecha': today})

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data['operador']['id'] == recep1.pk
    efectivo = data['cobros_por_medio']['efectivo']
    assert efectivo['count'] == 1
    assert efectivo['total'] == 500.0
    assert data['total_cobros'] == 500.0


# ---------------------------------------------------------------------------
# Test 5: admin ve todas las cajas
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_caja_admin_ve_todas():
    """An admin can query any operator's caja via ?operador_id=."""
    admin = _make_admin()
    recep = _make_recep()
    socio = _make_active_socio()

    _make_cobro(recep, socio, Pago.MedioManual.TRANSFERENCIA, '1200.00')

    today = datetime.date.today().isoformat()
    client = _auth_client(admin)
    response = client.get(CAJA_URL, {'fecha': today, 'operador_id': recep.pk})

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data['operador']['id'] == recep.pk
    transf = data['cobros_por_medio']['transferencia']
    assert transf['count'] == 1
    assert transf['total'] == 1200.0


# ---------------------------------------------------------------------------
# Test 6: totales correctos por medio
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_caja_totales_por_medio_correctos():
    """Totals are correctly grouped by medio_manual."""
    recep = _make_recep()
    socio_a = _make_active_socio()
    socio_b = _make_active_socio()
    socio_c = _make_active_socio()

    _make_cobro(recep, socio_a, Pago.MedioManual.EFECTIVO, '300.00')
    _make_cobro(recep, socio_b, Pago.MedioManual.EFECTIVO, '200.00')
    _make_cobro(recep, socio_c, Pago.MedioManual.DEBITO, '400.00')

    today = datetime.date.today().isoformat()
    client = _auth_client(recep)
    response = client.get(CAJA_URL, {'fecha': today})

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    efectivo = data['cobros_por_medio']['efectivo']
    assert efectivo['count'] == 2
    assert efectivo['total'] == 500.0

    debito = data['cobros_por_medio']['debito']
    assert debito['count'] == 1
    assert debito['total'] == 400.0

    transferencia = data['cobros_por_medio']['transferencia']
    assert transferencia['count'] == 0
    assert transferencia['total'] == 0.0

    assert data['total_cobros'] == 900.0
    assert data['diferencia'] is None  # deferred
