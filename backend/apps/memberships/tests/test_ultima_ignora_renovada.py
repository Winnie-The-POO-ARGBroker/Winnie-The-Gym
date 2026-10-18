"""A renovada row is never the socio's current membership, even if it ends later."""
from datetime import date

import pytest

from apps.memberships.models import Membresia
from apps.memberships.selectors import socios_morosos_queryset, ultimas_membresias
from conftest import make_plan_factory, make_socio_factory, make_user_factory


@pytest.mark.django_db
def test_replace_renewal_whose_old_row_ends_later_does_not_hide_the_socio():
    """With 'replace' the superseded row can end AFTER the new one: it must not count as latest."""
    socio = make_socio_factory(make_user_factory(rol='socio'))
    plan = make_plan_factory()
    reemplazada = Membresia.objects.create(
        socio=socio, plan=plan, fecha_inicio=date(2026, 9, 1), fecha_fin=date(2026, 12, 31),
        estado=Membresia.Estado.RENOVADA,
    )
    ultima = Membresia.objects.create(
        socio=socio, plan=plan, fecha_inicio=date(2026, 10, 1), fecha_fin=date(2026, 10, 31),
        estado=Membresia.Estado.VENCIDA,
    )

    assert list(ultimas_membresias()) == [ultima]
    assert reemplazada not in ultimas_membresias()
    assert socio in socios_morosos_queryset()


@pytest.mark.django_db
def test_socio_with_only_renovada_rows_has_no_latest_membership():
    socio = make_socio_factory(make_user_factory(rol='socio'))
    Membresia.objects.create(
        socio=socio, plan=make_plan_factory(), fecha_inicio=date(2026, 9, 1), fecha_fin=date(2026, 12, 31),
        estado=Membresia.Estado.RENOVADA,
    )

    assert list(ultimas_membresias()) == []
