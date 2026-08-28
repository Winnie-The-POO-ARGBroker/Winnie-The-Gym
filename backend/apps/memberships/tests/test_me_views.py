from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from conftest import make_membresia_factory, make_plan_factory, make_socio_factory, make_user_factory


def _auth_client(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


ME_URL = '/api/memberships/me/'
SOCIOS_URL = '/api/members/socios/'


class MeViewTests(APITestCase):

    def test_me_unauthenticated_401(self):
        response = self.client.get(ME_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_non_socio_role_403(self):
        recep = make_user_factory(rol='recepcionista')
        _auth_client(self.client, recep)

        response = self.client.get(ME_URL)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_me_socio_with_active_membership_200(self):
        user = make_user_factory(rol='socio')
        socio = make_socio_factory(usuario=user)
        plan = make_plan_factory()
        make_membresia_factory(socio, plan)
        _auth_client(self.client, user)

        response = self.client.get(ME_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        for field in ('id', 'numero_socio', 'nombre', 'apellido', 'estado'):
            self.assertIn(field, data)
        self.assertIn('membresia_activa', data)
        mem = data['membresia_activa']
        self.assertIsNotNone(mem)
        for field in ('id', 'fecha_inicio', 'fecha_fin', 'estado'):
            self.assertIn(field, mem)
        self.assertIn('plan', mem)
        plan_data = mem['plan']
        for field in ('id', 'nombre', 'duracion_dias', 'precio', 'clases_asignadas'):
            self.assertIn(field, plan_data)

    def test_me_socio_with_no_membership_200(self):
        user = make_user_factory(rol='socio')
        make_socio_factory(usuario=user)
        _auth_client(self.client, user)

        response = self.client.get(ME_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['membresia_activa'])

    def test_me_socio_cannot_access_socios_list_403(self):
        user = make_user_factory(rol='socio')
        make_socio_factory(usuario=user)
        _auth_client(self.client, user)

        response = self.client.get(SOCIOS_URL)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class UrlSmokeTests(APITestCase):
    """T-62: Verify all named URLs resolve without NoReverseMatch."""

    def test_named_urls_resolve(self):
        from django.urls import reverse, NoReverseMatch
        names = [
            'members:socio-list',
            'memberships:plan-list',
            'memberships:me',
            'memberships:me-renew',
        ]
        for name in names:
            try:
                url = reverse(name)
                self.assertIsNotNone(url)
            except NoReverseMatch as exc:
                self.fail(f"URL '{name}' did not resolve: {exc}")
