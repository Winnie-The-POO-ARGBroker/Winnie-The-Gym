import pytest
from datetime import date, timedelta
from apps.memberships.services import renovar_membresia
from apps.memberships.models import Membresia


@pytest.mark.django_db
def test_renovar_crea_nueva_membresia(make_socio, make_plan, make_membresia):
    socio = make_socio()
    plan = make_plan(duracion_dias=30)
    existing = make_membresia(socio=socio, plan=plan)

    new_mem = renovar_membresia(socio, plan)

    existing.refresh_from_db()
    assert existing.estado == Membresia.Estado.VENCIDA
    assert new_mem.estado == Membresia.Estado.ACTIVA
    assert new_mem.socio == socio
    assert new_mem.plan == plan


@pytest.mark.django_db
def test_renovar_calcula_fecha_fin(make_socio, make_plan):
    socio = make_socio()
    plan = make_plan(duracion_dias=365)

    new_mem = renovar_membresia(socio, plan)

    expected_fin = date.today() + timedelta(days=365)
    assert new_mem.fecha_inicio == date.today()
    assert new_mem.fecha_fin == expected_fin


@pytest.mark.django_db
def test_renovar_con_fecha_inicio_explicita(make_socio, make_plan):
    socio = make_socio()
    plan = make_plan(duracion_dias=30)
    custom_date = date.today() + timedelta(days=5)

    new_mem = renovar_membresia(socio, plan, fecha_inicio=custom_date)

    assert new_mem.fecha_inicio == custom_date
    assert new_mem.fecha_fin == custom_date + timedelta(days=30)


@pytest.mark.django_db
def test_renovar_sin_membresia_previa(make_socio, make_plan):
    socio = make_socio()
    plan = make_plan()

    new_mem = renovar_membresia(socio, plan)

    assert Membresia.objects.filter(socio=socio).count() == 1
    assert new_mem.estado == Membresia.Estado.ACTIVA


@pytest.mark.django_db
def test_renovar_atomico_vence_todas_las_activas(make_socio, make_plan, make_membresia):
    socio = make_socio()
    plan = make_plan()
    mem1 = make_membresia(socio=socio, plan=plan)
    mem2 = make_membresia(socio=socio, plan=plan)

    renovar_membresia(socio, plan)

    mem1.refresh_from_db()
    mem2.refresh_from_db()
    assert mem1.estado == Membresia.Estado.VENCIDA
    assert mem2.estado == Membresia.Estado.VENCIDA
    assert Membresia.objects.filter(socio=socio, estado=Membresia.Estado.ACTIVA).count() == 1
