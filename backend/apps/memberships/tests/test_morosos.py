"""Tests for #185 — Morosidad: selector, endpoint, expire task, reminder task."""
from datetime import date, timedelta

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.memberships.models import Membresia
from apps.memberships.selectors import socios_morosos_queryset
from apps.memberships.tasks import expire_overdue_memberships, send_morosos_reminders
from conftest import (
    make_membresia_factory,
    make_plan_factory,
    make_socio_factory,
    make_user_factory,
)


def _make_admin():
    return make_user_factory(rol='administrador')


def _auth_client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


# ---------------------------------------------------------------------------
# Test #6: socios_morosos_queryset excludes renewed socios
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_socios_morosos_queryset_excludes_renewed():
    """#185 — mandatory test 6: selector does not include socios who renewed."""
    # Socio 1: has a vencida membership → moroso
    u1 = make_user_factory(rol='socio', email='moroso1@test.com')
    socio1 = make_socio_factory(u1)
    plan1 = make_plan_factory()
    make_membresia_factory(
        socio1, plan1,
        estado=Membresia.Estado.VENCIDA,
        fecha_fin=date.today() - timedelta(days=10),
    )

    # Socio 2: had a vencida but then renewed → not moroso
    u2 = make_user_factory(rol='socio', email='renewed@test.com')
    socio2 = make_socio_factory(u2)
    plan2 = make_plan_factory()
    Membresia.objects.create(
        socio=socio2, plan=plan2,
        fecha_inicio=date.today() - timedelta(days=60),
        fecha_fin=date.today() - timedelta(days=30),
        estado=Membresia.Estado.VENCIDA,
    )
    # New active membership (renewal)
    Membresia.objects.create(
        socio=socio2, plan=plan2,
        fecha_inicio=date.today(),
        fecha_fin=date.today() + timedelta(days=30),
        estado=Membresia.Estado.ACTIVA,
    )

    # Socio 3: never had a membership → not in selector (only tracks vencida)
    u3 = make_user_factory(rol='socio', email='fresh@test.com')
    socio3 = make_socio_factory(u3)

    morosos = list(socios_morosos_queryset())
    moroso_ids = [s.pk for s in morosos]

    assert socio1.pk in moroso_ids
    assert socio2.pk not in moroso_ids
    assert socio3.pk not in moroso_ids


# ---------------------------------------------------------------------------
# Test #7: expire_overdue_memberships sets VENCIDA
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_expire_overdue_memberships_sets_vencida():
    """#185 — mandatory test 7."""
    u = make_user_factory(rol='socio', email='overdue@test.com')
    socio = make_socio_factory(u)
    plan = make_plan_factory()

    # Active membership that expired yesterday
    m = make_membresia_factory(
        socio, plan,
        estado=Membresia.Estado.ACTIVA,
        fecha_fin=date.today() - timedelta(days=1),
    )

    result = expire_overdue_memberships()

    m.refresh_from_db()
    assert m.estado == Membresia.Estado.VENCIDA
    assert result['expired'] >= 1


@pytest.mark.django_db
def test_expire_overdue_memberships_skips_future():
    """expire_overdue_memberships should NOT flip memberships with future fecha_fin."""
    u = make_user_factory(rol='socio', email='future@test.com')
    socio = make_socio_factory(u)
    plan = make_plan_factory()

    m = make_membresia_factory(
        socio, plan,
        estado=Membresia.Estado.ACTIVA,
        fecha_fin=date.today() + timedelta(days=5),
    )

    expire_overdue_memberships()

    m.refresh_from_db()
    assert m.estado == Membresia.Estado.ACTIVA


# ---------------------------------------------------------------------------
# Test #8: mora reminder sent only once per day
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_mora_reminder_sent_once_per_day(settings):
    """#185 — mandatory test 8: idempotency key prevents double reminders."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

    today = timezone.localdate()
    u = make_user_factory(rol='socio', email='mora_socio@test.com')
    socio = make_socio_factory(u)
    plan = make_plan_factory()

    # Membership vencida exactly 1 day ago (first reminder day)
    m = make_membresia_factory(
        socio, plan,
        estado=Membresia.Estado.VENCIDA,
        fecha_fin=today - timedelta(days=1),
    )

    from django.core import mail
    mail.outbox = []

    # First call: sends the reminder
    result1 = send_morosos_reminders()
    assert result1['sent'] >= 1
    emails_after_first = len(mail.outbox)

    # Second call: same day → idempotency flag prevents re-sending
    result2 = send_morosos_reminders()
    assert result2['sent'] == 0
    assert result2['skipped'] >= 1

    # Total emails unchanged after second call
    assert len(mail.outbox) == emails_after_first


# ---------------------------------------------------------------------------
# Morosos endpoint tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_morosos_endpoint_returns_vencida_socios():
    """GET /api/memberships/morosos/ returns delinquent socios."""
    admin = _make_admin()
    client = _auth_client(admin)

    u = make_user_factory(rol='socio', email='mora_endpoint@test.com')
    socio = make_socio_factory(u)
    plan = make_plan_factory()
    make_membresia_factory(
        socio, plan,
        estado=Membresia.Estado.VENCIDA,
        fecha_fin=date.today() - timedelta(days=5),
    )

    resp = client.get('/api/memberships/morosos/')
    assert resp.status_code == status.HTTP_200_OK
    ids = [s['id'] for s in resp.data['results']]
    assert socio.pk in ids


@pytest.mark.django_db
def test_morosos_endpoint_forbidden_for_socios():
    u = make_user_factory(rol='socio', email='not_allowed@test.com')
    make_socio_factory(u)
    client = _auth_client(u)
    resp = client.get('/api/memberships/morosos/')
    assert resp.status_code == status.HTTP_403_FORBIDDEN
