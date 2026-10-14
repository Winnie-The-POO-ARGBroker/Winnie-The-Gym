"""Tests for #191 — Cobro manual: medio, idempotency, anular, socio inactivo."""
from decimal import Decimal
from datetime import date, timedelta

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.memberships.models import Membresia
from apps.payments.models import Pago
from apps.payments.services import cobro_manual, anular_pago
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


URL = '/api/payments/cobros-manuales/'


def _make_admin():
    return make_user_factory(rol='administrador')


def _make_recep():
    return make_user_factory(rol='recepcionista')


def _make_active_socio():
    u = make_user_factory(rol='socio')
    return make_socio_factory(u)


def _make_inactive_socio():
    from apps.members.models import Socio
    u = make_user_factory(rol='socio')
    s = make_socio_factory(u)
    s.estado = Socio.Estado.BAJA
    s.fecha_baja = date.today()
    s.save(update_fields=['estado', 'fecha_baja', 'updated_at'])
    return s


# ---------------------------------------------------------------------------
# Test #11: cobro manual requires medio
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_cobro_manual_requires_medio():
    """#191 — mandatory test 11: missing medio → 400."""
    recep = _make_recep()
    client = _auth_client(recep)
    socio = _make_active_socio()
    plan = make_plan_factory(precio=Decimal('500.00'))

    # Without medio
    resp = client.post(URL, {
        'socio_id': socio.pk,
        'plan_id': plan.pk,
        'monto': '500.00',
    }, format='json')
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert 'medio' in resp.data

    # With invalid medio
    resp2 = client.post(URL, {
        'socio_id': socio.pk,
        'plan_id': plan.pk,
        'monto': '500.00',
        'medio': 'bitcoin',
    }, format='json')
    assert resp2.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# Test #12: idempotency key prevents duplicate
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_cobro_manual_idempotency_key_prevents_duplicate(settings):
    """#191 — mandatory test 12: 2 calls with same key → 1 pago."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

    recep = _make_recep()
    socio = _make_active_socio()
    plan = make_plan_factory(precio=Decimal('500.00'))
    key = 'test-idempotency-key-abc123'

    payload = {
        'socio_id': socio.pk,
        'plan_id': plan.pk,
        'monto': '500.00',
        'medio': 'efectivo',
        'idempotency_key': key,
    }

    client = _auth_client(recep)
    resp1 = client.post(URL, payload, format='json')
    assert resp1.status_code == status.HTTP_201_CREATED
    pago_id_1 = resp1.data['id']

    # Second call with same key
    resp2 = client.post(URL, payload, format='json')
    assert resp2.status_code == status.HTTP_201_CREATED
    pago_id_2 = resp2.data['id']

    # Same pago returned
    assert pago_id_1 == pago_id_2
    # Only one pago created
    assert Pago.objects.filter(idempotency_key=key).count() == 1


# ---------------------------------------------------------------------------
# Test #13: anular_pago cancels activated membership
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_anular_pago_cancels_activated_membresia(settings):
    """#191 — mandatory test 13."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

    admin = _make_admin()
    socio = _make_active_socio()
    plan = make_plan_factory(precio=Decimal('500.00'))

    # Create approved pago via service (activates membership)
    pago = cobro_manual(admin, socio, plan, Decimal('500.00'), medio='efectivo')
    assert pago.membresia is not None
    membresia = pago.membresia
    assert membresia.estado == Membresia.Estado.ACTIVA

    # Anular via API
    client = _auth_client(admin)
    resp = client.post(
        f'/api/payments/pagos/{pago.pk}/anular/',
        {'motivo': 'Error de cobro'},
        format='json',
    )
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data['anulado'] is True

    membresia.refresh_from_db()
    assert membresia.estado == Membresia.Estado.CANCELADA


# ---------------------------------------------------------------------------
# Test #14: cobro manual rejects socio inactivo
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_cobro_manual_rejects_socio_inactivo():
    """#191 — mandatory test 14."""
    recep = _make_recep()
    client = _auth_client(recep)
    socio = _make_inactive_socio()
    plan = make_plan_factory(precio=Decimal('500.00'))

    resp = client.post(URL, {
        'socio_id': socio.pk,
        'plan_id': plan.pk,
        'monto': '500.00',
        'medio': 'efectivo',
    }, format='json')
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert 'inactivo' in resp.data.get('detail', '').lower()


# ---------------------------------------------------------------------------
# Service-level tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_cobro_manual_service_requires_motivo_when_monto_differs(settings):
    """When monto != plan.precio, motivo is mandatory."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

    admin = _make_admin()
    socio = _make_active_socio()
    plan = make_plan_factory(precio=Decimal('1000.00'))

    with pytest.raises(ValueError, match='motivo'):
        cobro_manual(admin, socio, plan, Decimal('800.00'), medio='efectivo')


@pytest.mark.django_db
def test_anular_pago_service_requires_motivo(settings):
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

    admin = _make_admin()
    socio = _make_active_socio()
    plan = make_plan_factory(precio=Decimal('500.00'))
    pago = cobro_manual(admin, socio, plan, Decimal('500.00'), medio='efectivo')

    with pytest.raises(ValueError, match='motivo'):
        anular_pago(pago, admin, motivo='')


@pytest.mark.django_db
def test_anular_already_anulado_raises(settings):
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

    admin = _make_admin()
    socio = _make_active_socio()
    plan = make_plan_factory(precio=Decimal('500.00'))
    pago = cobro_manual(admin, socio, plan, Decimal('500.00'), medio='efectivo')
    anular_pago(pago, admin, motivo='Primera anulación')

    with pytest.raises(ValueError, match='ya fue anulado'):
        anular_pago(pago, admin, motivo='Segunda intención')


@pytest.mark.django_db
def test_anular_via_api_only_admin():
    """Recepcionista cannot anular a pago."""
    recep = _make_recep()
    plan = make_plan_factory()
    u = make_user_factory(rol='socio')
    socio = make_socio_factory(u)
    pago = Pago.objects.create(
        socio=socio, plan=plan, monto=Decimal('500.00'),
        metodo=Pago.Metodo.MANUAL, estado=Pago.Estado.APROBADO,
        paid_at=timezone.now(),
    )

    client = _auth_client(recep)
    resp = client.post(
        f'/api/payments/pagos/{pago.pk}/anular/',
        {'motivo': 'test'},
        format='json',
    )
    assert resp.status_code == status.HTTP_403_FORBIDDEN
