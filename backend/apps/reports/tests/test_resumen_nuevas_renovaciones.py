"""nuevas_mes counts new customers; renovaciones_mes counts later memberships (resumen)."""
from datetime import date

import pytest

from apps.memberships.models import Membresia
from apps.reports.services import build_resumen
from conftest import make_membresia_factory, make_plan_factory, make_socio_factory, make_user_factory

MES = '2026-03'


def _socio():
    return make_socio_factory(make_user_factory(rol='socio'), estado='activo')


def _m(socio, plan, inicio, estado=Membresia.Estado.ACTIVA):
    return make_membresia_factory(
        socio, plan, fecha_inicio=inicio, fecha_fin=date(inicio.year + 1, 1, 1), estado=estado,
    )


def _counts(**kwargs):
    membresias = build_resumen(mes=MES, **kwargs)['membresias']
    return membresias['nuevas_mes'], membresias['renovaciones_mes']


@pytest.mark.django_db
def test_first_membership_in_month_counts_once_as_nueva():
    _m(_socio(), make_plan_factory(), date(2026, 3, 10))
    assert _counts() == (1, 0)


@pytest.mark.django_db
def test_renewal_in_same_month_counts_as_renovacion_not_nueva():
    socio, plan = _socio(), make_plan_factory()
    _m(socio, plan, date(2026, 3, 1), Membresia.Estado.RENOVADA)
    _m(socio, plan, date(2026, 3, 20))
    assert _counts() == (1, 1)


@pytest.mark.django_db
def test_cancelled_first_membership_counts_as_neither():
    _m(_socio(), make_plan_factory(), date(2026, 3, 10), Membresia.Estado.CANCELADA)
    assert _counts() == (0, 0)


@pytest.mark.django_db
def test_socio_whose_first_was_last_month_counts_only_as_renovacion():
    socio, plan = _socio(), make_plan_factory()
    _m(socio, plan, date(2026, 2, 5), Membresia.Estado.VENCIDA)
    _m(socio, plan, date(2026, 3, 8))
    assert _counts() == (0, 1)


@pytest.mark.django_db
def test_superseded_renovada_row_does_not_double_count():
    socio, plan = _socio(), make_plan_factory()
    _m(socio, plan, date(2026, 2, 1), Membresia.Estado.RENOVADA)
    _m(socio, plan, date(2026, 3, 3), Membresia.Estado.RENOVADA)
    _m(socio, plan, date(2026, 3, 25))
    assert _counts() == (0, 2)


@pytest.mark.django_db
def test_cancelled_renewal_is_not_counted():
    socio, plan = _socio(), make_plan_factory()
    _m(socio, plan, date(2026, 2, 1), Membresia.Estado.VENCIDA)
    _m(socio, plan, date(2026, 3, 3), Membresia.Estado.CANCELADA)
    assert _counts() == (0, 0)


@pytest.mark.django_db
def test_same_day_memberships_use_pk_as_tiebreaker():
    socio, plan = _socio(), make_plan_factory()
    _m(socio, plan, date(2026, 3, 3), Membresia.Estado.RENOVADA)
    _m(socio, plan, date(2026, 3, 3))
    assert _counts() == (1, 1)


@pytest.mark.django_db
def test_plan_filter_applies_to_first_membership_and_to_renewal_plan():
    plan_a, plan_b = make_plan_factory(nombre='A'), make_plan_factory(nombre='B')
    s1, s2 = _socio(), _socio()
    _m(s1, plan_a, date(2026, 3, 2))           # nueva on A
    _m(s2, plan_a, date(2026, 2, 2), Membresia.Estado.RENOVADA)
    _m(s2, plan_b, date(2026, 3, 9))           # renovacion on B
    assert _counts() == (1, 1)
    assert _counts(plan_id=plan_a.pk) == (1, 0)
    assert _counts(plan_id=plan_b.pk) == (0, 1)


@pytest.mark.django_db
def test_first_membership_on_other_plan_is_not_nueva_for_filtered_plan():
    plan_a, plan_b = make_plan_factory(nombre='A'), make_plan_factory(nombre='B')
    socio = _socio()
    _m(socio, plan_a, date(2026, 3, 2), Membresia.Estado.RENOVADA)
    _m(socio, plan_b, date(2026, 3, 15))
    assert _counts(plan_id=plan_b.pk) == (0, 1)


@pytest.mark.django_db
def test_month_boundaries_use_fecha_inicio():
    plan = make_plan_factory()
    _m(_socio(), plan, date(2026, 2, 28))   # before
    _m(_socio(), plan, date(2026, 3, 1))    # first day
    _m(_socio(), plan, date(2026, 3, 31))   # last day
    _m(_socio(), plan, date(2026, 4, 1))    # after
    assert _counts() == (2, 0)


@pytest.mark.django_db
def test_created_at_is_irrelevant():
    """A row created today but starting last month does not count in this month."""
    _m(_socio(), make_plan_factory(), date(2026, 2, 15))
    assert _counts() == (0, 0)
