"""Tests for me/renew deprecation (410 Gone) and stack-days policy — fix #189."""
from datetime import date, timedelta

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.memberships.models import Membresia
from apps.memberships.services import renovar_membresia
from conftest import make_membresia_factory, make_plan_factory, make_socio_factory, make_user_factory


RENEW_URL = '/api/memberships/me/renew/'


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


class MeRenewDeprecatedTests(APITestCase):

    def setUp(self):
        self.user = make_user_factory(email='renew@test.com', rol='socio')
        self.socio = make_socio_factory(self.user)
        self.plan = make_plan_factory(nombre='RenewPlan', duracion_dias=30)
        _auth(self.client, self.user)

    def test_me_renew_returns_410_gone(self):
        """Fix #189 security: POST me/renew must return 410, never activate a membership for free."""
        response = self.client.post(RENEW_URL, {'plan_id': self.plan.pk})
        self.assertEqual(response.status_code, status.HTTP_410_GONE)
        # Must include a redirect hint
        self.assertIn('preferencias', response.json().get('detail', ''))

    def test_me_renew_does_not_create_membership(self):
        """410 must not create any Membresia — sanity check for the security fix."""
        before = Membresia.objects.count()
        self.client.post(RENEW_URL, {'plan_id': self.plan.pk})
        self.assertEqual(Membresia.objects.count(), before)


class RenovarMembresiaStackDaysTests(APITestCase):
    """Unit tests for the renovar_membresia service — fix #189 policy."""

    def setUp(self):
        self.user = make_user_factory(email='stack@test.com', rol='socio')
        self.socio = make_socio_factory(self.user)
        self.plan_30 = make_plan_factory(nombre='Stack30', duracion_dias=30)
        self.plan_60 = make_plan_factory(nombre='Stack60', duracion_dias=60)

    def test_renovar_membresia_stacks_remaining_days(self):
        """Fix #189: upgrading mid-membership should stack remaining days on top of new plan."""
        today = date.today()
        # Create an active membership that still has 10 days remaining
        active = make_membresia_factory(
            self.socio, self.plan_30,
            fecha_inicio=today - timedelta(days=20),
            fecha_fin=today + timedelta(days=10),
            estado=Membresia.Estado.ACTIVA,
        )

        new_membresia = renovar_membresia(self.socio, self.plan_60, politica='stack')

        # 60 days (new plan) + 10 days (remaining) = 70 days from today
        expected_fin = today + timedelta(days=60 + 10)
        self.assertEqual(new_membresia.fecha_fin, expected_fin)
        self.assertEqual(new_membresia.estado, Membresia.Estado.ACTIVA)

        # Old membership was superseded while still running
        active.refresh_from_db()
        self.assertEqual(active.estado, Membresia.Estado.RENOVADA)

    def test_renovar_membresia_replace_policy_ignores_remaining_days(self):
        """'replace' policy should NOT stack — used for admin overrides."""
        today = date.today()
        make_membresia_factory(
            self.socio, self.plan_30,
            fecha_inicio=today - timedelta(days=20),
            fecha_fin=today + timedelta(days=10),
            estado=Membresia.Estado.ACTIVA,
        )

        new_membresia = renovar_membresia(self.socio, self.plan_60, politica='replace')

        # Exactly 60 days, no stacking
        expected_fin = today + timedelta(days=60)
        self.assertEqual(new_membresia.fecha_fin, expected_fin)

    def test_renovar_membresia_no_active_membership_just_uses_plan_days(self):
        """When there's no active membership, stack is equivalent to replace."""
        today = date.today()
        new_membresia = renovar_membresia(self.socio, self.plan_30, politica='stack')
        expected_fin = today + timedelta(days=30)
        self.assertEqual(new_membresia.fecha_fin, expected_fin)
