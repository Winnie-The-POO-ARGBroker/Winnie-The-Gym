"""Morosos KPI / report must count socios whose LATEST membership lapsed, not superseded rows."""
from datetime import date, timedelta

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.memberships.models import Membresia
from conftest import make_membresia_factory, make_plan_factory, make_socio_factory, make_user_factory

RESUMEN_URL = '/api/reportes/resumen/'
MOROSIDAD_URL = '/api/reportes/morosidad/'


def _admin_client():
    client = APIClient()
    token = RefreshToken.for_user(make_user_factory(rol='administrador')).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


def _socio():
    return make_socio_factory(usuario=make_user_factory(rol='socio'))


def _past(plan, socio, *, estado, start_ago, end_ago):
    today = date.today()
    return make_membresia_factory(
        socio, plan, fecha_inicio=today - timedelta(days=start_ago),
        fecha_fin=today - timedelta(days=end_ago), estado=estado,
    )


@pytest.mark.django_db
def test_kpi_ignores_renovada_row_once_its_fecha_fin_passes():
    plan = make_plan_factory()
    socio = _socio()
    # Superseded early; its end date is now in the past, but the socio renewed.
    _past(plan, socio, estado=Membresia.Estado.RENOVADA, start_ago=60, end_ago=5)
    make_membresia_factory(socio, plan, fecha_inicio=date.today() - timedelta(days=30), fecha_fin=date.today() + timedelta(days=30))

    data = _admin_client().get(RESUMEN_URL).json()

    assert data['morosos']['cantidad'] == 0


@pytest.mark.django_db
def test_kpi_ignores_socio_who_bought_again_after_genuine_expiry():
    plan = make_plan_factory()
    socio = _socio()
    _past(plan, socio, estado=Membresia.Estado.VENCIDA, start_ago=90, end_ago=40)
    make_membresia_factory(socio, plan)

    data = _admin_client().get(RESUMEN_URL).json()

    assert data['morosos']['cantidad'] == 0


@pytest.mark.django_db
def test_kpi_counts_socio_whose_latest_membership_expired():
    plan = make_plan_factory()
    socio = _socio()
    _past(plan, socio, estado=Membresia.Estado.VENCIDA, start_ago=90, end_ago=40)

    data = _admin_client().get(RESUMEN_URL).json()

    assert data['morosos']['cantidad'] == 1


@pytest.mark.django_db
def test_morosidad_report_with_estado_filter_ignores_renewed_socio():
    plan = make_plan_factory()
    renewed = _socio()
    _past(plan, renewed, estado=Membresia.Estado.VENCIDA, start_ago=90, end_ago=40)
    make_membresia_factory(renewed, plan)
    lapsed = _socio()
    _past(plan, lapsed, estado=Membresia.Estado.VENCIDA, start_ago=90, end_ago=40)

    resp = _admin_client().get(f'{MOROSIDAD_URL}?formato=csv&estado=vencida')

    body = resp.content.decode('utf-8')
    assert lapsed.dni in body
    assert renewed.dni not in body


@pytest.mark.django_db
def test_morosidad_report_default_path_ignores_renovada():
    plan = make_plan_factory()
    socio = _socio()
    _past(plan, socio, estado=Membresia.Estado.RENOVADA, start_ago=60, end_ago=5)
    make_membresia_factory(socio, plan)

    resp = _admin_client().get(f'{MOROSIDAD_URL}?formato=csv')

    assert socio.dni not in resp.content.decode('utf-8')
