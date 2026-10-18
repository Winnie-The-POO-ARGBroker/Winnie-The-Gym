"""Annulling a renewal payment restores the previous (renovada) membership."""
from datetime import date, timedelta
from decimal import Decimal
from unittest import mock

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.access.services import has_active_membership
from apps.memberships.models import Membresia
from apps.payments.models import Pago
from apps.payments.services import anular_pago, cobro_manual
from conftest import make_membresia_factory, make_plan_factory, make_socio_factory, make_user_factory


def _admin():
    return make_user_factory(rol='administrador', is_staff=True)


def _socio():
    return make_socio_factory(make_user_factory(rol='socio'), estado='activo')


def _cobro(admin, socio, plan):
    return cobro_manual(
        admin, socio, plan, Decimal(plan.precio),
        medio=Pago.MedioManual.EFECTIVO, observacion='test', motivo='',
    )


def _running(socio, plan, days_left=10):
    today = date.today()
    return make_membresia_factory(
        socio, plan, fecha_inicio=today - timedelta(days=20), fecha_fin=today + timedelta(days=days_left),
    )


def _activas(socio):
    return Membresia.objects.filter(socio=socio, estado=Membresia.Estado.ACTIVA)


@pytest.mark.django_db
def test_annulling_stack_renewal_restores_previous_membership_with_its_days():
    admin, socio = _admin(), _socio()
    plan = make_plan_factory(precio='1000.00', duracion_dias=30)
    previous = _running(socio, plan, days_left=10)
    original_fin = previous.fecha_fin
    pago = _cobro(admin, socio, plan)
    nueva = pago.membresia
    previous.refresh_from_db()
    assert previous.estado == Membresia.Estado.RENOVADA

    anular_pago(pago, admin, 'Error de carga')

    previous.refresh_from_db()
    nueva.refresh_from_db()
    assert nueva.estado == Membresia.Estado.CANCELADA
    assert previous.estado == Membresia.Estado.ACTIVA
    assert previous.fecha_fin == original_fin
    assert previous.cambiado_por == admin
    assert previous.cambiado_en is not None
    assert f'#{pago.pk}' in previous.motivo_estado
    assert _activas(socio).count() == 1
    assert pago.membresia_restaurada == previous


@pytest.mark.django_db
def test_not_restored_when_previous_already_ended():
    admin, socio = _admin(), _socio()
    plan = make_plan_factory(precio='1000.00', duracion_dias=30)
    today = date.today()
    ended = make_membresia_factory(
        socio, plan, fecha_inicio=today - timedelta(days=40), fecha_fin=today - timedelta(days=1),
        estado=Membresia.Estado.RENOVADA,
    )
    nueva = make_membresia_factory(socio, plan, fecha_inicio=today, fecha_fin=today + timedelta(days=30))
    pago = Pago.objects.create(
        socio=socio, plan=plan, monto=Decimal('1000.00'), metodo=Pago.Metodo.MANUAL,
        estado=Pago.Estado.APROBADO, membresia=nueva,
    )

    anular_pago(pago, admin, 'Error')

    ended.refresh_from_db()
    assert ended.estado == Membresia.Estado.RENOVADA
    assert _activas(socio).count() == 0
    assert pago.membresia_restaurada is None


@pytest.mark.django_db
def test_not_restored_when_a_later_membership_exists():
    admin, socio = _admin(), _socio()
    plan = make_plan_factory(precio='1000.00', duracion_dias=30)
    previous = _running(socio, plan)
    pago = _cobro(admin, socio, plan)
    nueva = pago.membresia
    # A later (non-cancelled) membership exists after the one being cancelled.
    make_membresia_factory(socio, plan, estado=Membresia.Estado.PENDIENTE_PAGO)

    anular_pago(pago, admin, 'Error')

    previous.refresh_from_db()
    nueva.refresh_from_db()
    assert nueva.estado == Membresia.Estado.CANCELADA
    assert previous.estado == Membresia.Estado.RENOVADA
    assert pago.membresia_restaurada is None


@pytest.mark.django_db
def test_chain_annulling_the_older_renewal_cancels_it_and_it_is_never_restored():
    """A -> B -> C. Annulling B's payment cancels B (a reversed sale); annulling C's later
    must not bring B back (its payment is annulled) but the last valid one, A."""
    admin, socio = _admin(), _socio()
    plan = make_plan_factory(precio='1000.00', duracion_dias=30)
    first = _running(socio, plan)
    pago1 = _cobro(admin, socio, plan)
    pago2 = _cobro(admin, socio, plan)
    second = pago1.membresia

    # B is already renovada (superseded by C), but its own payment is reversed: it becomes cancelada.
    anular_pago(pago1, admin, 'Error')
    second.refresh_from_db()
    assert second.estado == Membresia.Estado.CANCELADA
    assert pago1.membresia_restaurada is None

    # Annulling C restores A, never B.
    anular_pago(pago2, admin, 'Error')
    first.refresh_from_db()
    second.refresh_from_db()
    assert second.estado == Membresia.Estado.CANCELADA
    assert first.estado == Membresia.Estado.ACTIVA
    assert _activas(socio).count() == 1
    assert pago2.membresia_restaurada == first


@pytest.mark.django_db
def test_chain_annulling_the_latest_first_restores_the_immediate_previous():
    admin, socio = _admin(), _socio()
    plan = make_plan_factory(precio='1000.00', duracion_dias=30)
    first = _running(socio, plan)
    pago1 = _cobro(admin, socio, plan)
    pago2 = _cobro(admin, socio, plan)
    second = pago1.membresia

    anular_pago(pago2, admin, 'Error')

    first.refresh_from_db()
    second.refresh_from_db()
    assert second.estado == Membresia.Estado.ACTIVA
    assert first.estado == Membresia.Estado.RENOVADA
    assert pago2.membresia_restaurada == second


@pytest.mark.django_db
def test_a_renovada_membership_whose_payment_is_annulled_stops_counting_as_active_history():
    """Cancelled (reversed sale), so reports ignore it and access never uses it."""
    admin, socio = _admin(), _socio()
    plan = make_plan_factory(precio='1000.00', duracion_dias=30)
    _running(socio, plan)
    pago1 = _cobro(admin, socio, plan)
    _cobro(admin, socio, plan)

    anular_pago(pago1, admin, 'Error')

    pago1.membresia.refresh_from_db()
    assert pago1.membresia.estado == Membresia.Estado.CANCELADA
    assert 'Anulación de pago' in pago1.membresia.motivo_estado


@pytest.mark.django_db
def test_restoring_twice_never_leaves_two_active_memberships():
    from apps.memberships.services import restaurar_membresia_renovada

    admin, socio = _admin(), _socio()
    plan = make_plan_factory(precio='1000.00', duracion_dias=30)
    previous = _running(socio, plan)
    pago = _cobro(admin, socio, plan)
    nueva = pago.membresia
    nueva.estado = Membresia.Estado.CANCELADA
    nueva.save(update_fields=['estado'])

    first_call = restaurar_membresia_renovada(nueva, admin, 'Restaurada')
    second_call = restaurar_membresia_renovada(nueva, admin, 'Restaurada')

    previous.refresh_from_db()
    assert first_call == previous
    assert second_call is None
    assert _activas(socio).count() == 1


@pytest.mark.django_db
def test_first_purchase_annulled_leaves_no_active_membership():
    admin, socio = _admin(), _socio()
    plan = make_plan_factory(precio='1000.00', duracion_dias=30)
    pago = _cobro(admin, socio, plan)

    anular_pago(pago, admin, 'Error')

    assert _activas(socio).count() == 0
    pago.membresia.refresh_from_db()
    assert pago.membresia.estado == Membresia.Estado.CANCELADA
    assert pago.membresia_restaurada is None


@pytest.mark.django_db
def test_not_restored_when_socio_has_another_active_membership():
    admin, socio = _admin(), _socio()
    plan = make_plan_factory(precio='1000.00', duracion_dias=30)
    previous = _running(socio, plan)
    pago = _cobro(admin, socio, plan)
    other = Membresia.objects.create(
        socio=socio, plan=plan, fecha_inicio=date.today(), fecha_fin=date.today() + timedelta(days=5),
        estado=Membresia.Estado.SUSPENDIDA,
    )
    # Cancelling pago.membresia leaves "other" (suspendida, newer) as the latest -> rule 1 blocks.
    anular_pago(pago, admin, 'Error')
    previous.refresh_from_db()
    assert previous.estado == Membresia.Estado.RENOVADA
    assert other.pk > pago.membresia.pk
    assert pago.membresia_restaurada is None


@pytest.mark.django_db
def test_annulling_payment_without_membresia():
    admin, socio = _admin(), _socio()
    plan = make_plan_factory(precio='1000.00')
    pago = Pago.objects.create(
        socio=socio, plan=plan, monto=Decimal('1000.00'), metodo=Pago.Metodo.MANUAL,
        estado=Pago.Estado.APROBADO,
    )

    result = anular_pago(pago, admin, 'Error')

    assert result.anulado is True
    assert result.membresia_restaurada is None


@pytest.mark.django_db
def test_restore_failure_never_breaks_annulment():
    admin, socio = _admin(), _socio()
    plan = make_plan_factory(precio='1000.00', duracion_dias=30)
    previous = _running(socio, plan)
    pago = _cobro(admin, socio, plan)

    with mock.patch(
        'apps.memberships.services.restaurar_membresia_renovada', side_effect=RuntimeError('boom'),
    ):
        result = anular_pago(pago, admin, 'Error')

    pago.refresh_from_db()
    previous.refresh_from_db()
    assert pago.anulado is True
    pago.membresia.refresh_from_db()
    assert pago.membresia.estado == Membresia.Estado.CANCELADA
    assert previous.estado == Membresia.Estado.RENOVADA
    assert result.membresia_restaurada is None


@pytest.mark.django_db
def test_mercadopago_payment_behaves_like_manual():
    admin, socio = _admin(), _socio()
    plan = make_plan_factory(precio='1000.00', duracion_dias=30)
    previous = _running(socio, plan)
    pago = Pago.objects.create(
        socio=socio, plan=plan, monto=Decimal('1000.00'), metodo=Pago.Metodo.MERCADO_PAGO,
        estado=Pago.Estado.APROBADO, mp_external_reference='ref-mp-restore',
    )
    from apps.payments.services import _activate_membership
    _activate_membership(pago)

    anular_pago(pago, admin, 'Error')

    previous.refresh_from_db()
    assert previous.estado == Membresia.Estado.ACTIVA
    assert _activas(socio).count() == 1


@pytest.mark.django_db
def test_api_response_exposes_membresia_restaurada():
    admin, socio = _admin(), _socio()
    plan = make_plan_factory(precio='1000.00', duracion_dias=30)
    previous = _running(socio, plan)
    pago = _cobro(admin, socio, plan)
    client = APIClient()
    client.force_authenticate(user=admin)

    response = client.post(f'/api/payments/pagos/{pago.pk}/anular/', {'motivo': 'Error'}, format='json')

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data['membresia_restaurada'] == {'id': previous.pk, 'fecha_fin': previous.fecha_fin.isoformat()}
    assert data['anulado'] is True


@pytest.mark.django_db
def test_api_response_membresia_restaurada_null_when_nothing_restored():
    admin, socio = _admin(), _socio()
    plan = make_plan_factory(precio='1000.00', duracion_dias=30)
    pago = _cobro(admin, socio, plan)
    client = APIClient()
    client.force_authenticate(user=admin)

    response = client.post(f'/api/payments/pagos/{pago.pk}/anular/', {'motivo': 'Error'}, format='json')

    assert response.status_code == status.HTTP_200_OK
    assert response.json()['membresia_restaurada'] is None


@pytest.mark.django_db
def test_access_granted_right_after_annulment_with_restored_membership():
    admin = _admin()
    user = make_user_factory(rol='socio')
    socio = make_socio_factory(user, estado='activo', dni='30999888')
    plan = make_plan_factory(precio='1000.00', duracion_dias=30)
    _running(socio, plan)
    pago = _cobro(admin, socio, plan)
    anular_pago(pago, admin, 'Error')

    assert has_active_membership(user) is True
    client = APIClient()
    client.force_authenticate(user=make_user_factory(rol='recepcionista'))
    response = client.post('/api/access/manual/', {'dni': '30999888', 'access_type': 'ENTRY'})
    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == 'GRANTED'
