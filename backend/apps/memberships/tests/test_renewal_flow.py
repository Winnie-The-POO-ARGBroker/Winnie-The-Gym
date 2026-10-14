import datetime

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.memberships.models import Membresia
from conftest import make_membresia_factory, make_plan_factory, make_socio_factory, make_user_factory


def _auth_client(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


RENEW_URL = '/api/memberships/me/renew/'


class RenewalHappyPathTests(APITestCase):
    """Fix #189: me/renew is deprecated (410 Gone). Renewal must go through MercadoPago."""

    def test_renewal_returns_410_gone(self):
        """Endpoint is deprecated — always returns 410 regardless of plan state."""
        user = make_user_factory(rol='socio')
        make_socio_factory(usuario=user)
        plan = make_plan_factory(duracion_dias=30)
        _auth_client(self.client, user)

        response = self.client.post(RENEW_URL, {'plan_id': plan.pk})

        self.assertEqual(response.status_code, status.HTTP_410_GONE)

    def test_renewal_does_not_create_membership_when_deprecated(self):
        """410 response must not create any Membresia (security check)."""
        user = make_user_factory(rol='socio')
        make_socio_factory(usuario=user)
        plan = make_plan_factory()
        _auth_client(self.client, user)

        self.client.post(RENEW_URL, {'plan_id': plan.pk})

        self.assertEqual(Membresia.objects.count(), 0)


class RenewalErrorTests(APITestCase):
    """Auth guards still apply even though endpoint is deprecated."""

    def test_renewal_inactive_plan_still_410(self):
        """Inactive plan used to return 404; now endpoint is deprecated — 410 before plan lookup."""
        user = make_user_factory(rol='socio')
        make_socio_factory(usuario=user)
        plan = make_plan_factory(activo=False)
        _auth_client(self.client, user)

        response = self.client.post(RENEW_URL, {'plan_id': plan.pk})

        # 410 because the endpoint is gone before it validates the plan
        self.assertEqual(response.status_code, status.HTTP_410_GONE)

    def test_renewal_nonexistent_plan_still_410(self):
        """Non-existent plan used to return 404; now 410 because endpoint is deprecated."""
        user = make_user_factory(rol='socio')
        make_socio_factory(usuario=user)
        _auth_client(self.client, user)

        response = self.client.post(RENEW_URL, {'plan_id': 999999})

        self.assertEqual(response.status_code, status.HTTP_410_GONE)

    def test_renewal_non_socio_403(self):
        recep = make_user_factory(rol='recepcionista')
        _auth_client(self.client, recep)

        response = self.client.post(RENEW_URL, {'plan_id': 1})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_renewal_unauthenticated_401(self):
        response = self.client.post(RENEW_URL, {'plan_id': 1})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
