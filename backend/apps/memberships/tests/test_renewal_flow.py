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

    def test_renewal_happy_path_201(self):
        user = make_user_factory(rol='socio')
        socio = make_socio_factory(usuario=user)
        plan_a = make_plan_factory(duracion_dias=30)
        plan_b = make_plan_factory(duracion_dias=365)
        old_membresia = make_membresia_factory(socio, plan_a)
        _auth_client(self.client, user)

        response = self.client.post(RENEW_URL, {'plan_id': plan_b.pk})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['estado'], 'activa')
        self.assertIn('plan', response.data)
        self.assertEqual(response.data['plan']['id'], plan_b.pk)

        old_membresia.refresh_from_db()
        self.assertEqual(old_membresia.estado, 'vencida')

        today = datetime.date.today()
        expected_fin = today + datetime.timedelta(days=365)
        self.assertEqual(response.data['fecha_inicio'], today.isoformat())
        self.assertEqual(response.data['fecha_fin'], expected_fin.isoformat())

    def test_renewal_no_prior_membership_201(self):
        user = make_user_factory(rol='socio')
        make_socio_factory(usuario=user)
        plan = make_plan_factory()
        _auth_client(self.client, user)

        response = self.client.post(RENEW_URL, {'plan_id': plan.pk})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['estado'], 'activa')
        self.assertEqual(Membresia.objects.count(), 1)


class RenewalErrorTests(APITestCase):

    def test_renewal_inactive_plan_404(self):
        user = make_user_factory(rol='socio')
        make_socio_factory(usuario=user)
        plan = make_plan_factory(activo=False)
        _auth_client(self.client, user)

        response = self.client.post(RENEW_URL, {'plan_id': plan.pk})

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_renewal_nonexistent_plan_404(self):
        user = make_user_factory(rol='socio')
        make_socio_factory(usuario=user)
        _auth_client(self.client, user)

        response = self.client.post(RENEW_URL, {'plan_id': 999999})

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_renewal_non_socio_403(self):
        recep = make_user_factory(rol='recepcionista')
        _auth_client(self.client, recep)

        response = self.client.post(RENEW_URL, {'plan_id': 1})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_renewal_unauthenticated_401(self):
        response = self.client.post(RENEW_URL, {'plan_id': 1})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
