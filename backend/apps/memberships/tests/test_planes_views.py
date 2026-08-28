from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from conftest import make_plan_factory, make_user_factory


def _auth_client(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


PLANES_URL = '/api/memberships/planes/'


def _plane_detail_url(pk):
    return f'/api/memberships/planes/{pk}/'


class PlanListTests(APITestCase):

    def test_list_planes_admin_200(self):
        admin = make_user_factory(rol='administrador')
        make_plan_factory()
        _auth_client(self.client, admin)

        response = self.client.get(PLANES_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        if isinstance(data, dict):
            data = data.get('results', data)
        self.assertGreater(len(data), 0)
        first = data[0]
        for field in ('id', 'nombre', 'duracion_dias', 'precio', 'clases_asignadas', 'activo'):
            self.assertIn(field, first)

    def test_list_planes_recep_200(self):
        recep = make_user_factory(rol='recepcionista')
        make_plan_factory()
        _auth_client(self.client, recep)

        response = self.client.get(PLANES_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_planes_socio_200(self):
        socio_user = make_user_factory(rol='socio')
        make_plan_factory()
        _auth_client(self.client, socio_user)

        response = self.client.get(PLANES_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_401(self):
        response = self.client.get(PLANES_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PlanCreateTests(APITestCase):

    def test_create_plan_admin_201(self):
        admin = make_user_factory(rol='administrador')
        _auth_client(self.client, admin)

        payload = {
            'nombre': 'Mensual Test',
            'duracion_dias': 30,
            'precio': '5000.00',
            'clases_asignadas': 0,
            'activo': True,
        }
        response = self.client.post(PLANES_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_plan_recep_403(self):
        recep = make_user_factory(rol='recepcionista')
        _auth_client(self.client, recep)

        payload = {
            'nombre': 'Recep Plan',
            'duracion_dias': 30,
            'precio': '3000.00',
            'clases_asignadas': 0,
            'activo': True,
        }
        response = self.client.post(PLANES_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_plan_negative_precio_400(self):
        admin = make_user_factory(rol='administrador')
        _auth_client(self.client, admin)

        payload = {
            'nombre': 'Plan Precio Negativo',
            'duracion_dias': 30,
            'precio': '-100.00',
            'clases_asignadas': 0,
            'activo': True,
        }
        response = self.client.post(PLANES_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('precio', response.data)

    def test_create_plan_invalid_duracion_400(self):
        admin = make_user_factory(rol='administrador')
        _auth_client(self.client, admin)

        payload = {
            'nombre': 'Plan Invalido',
            'duracion_dias': 60,
            'precio': '5000.00',
            'clases_asignadas': 0,
            'activo': True,
        }
        response = self.client.post(PLANES_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('duracion_dias', response.data)


class PlanRetrieveUpdateTests(APITestCase):

    def test_retrieve_plan_200(self):
        admin = make_user_factory(rol='administrador')
        plan = make_plan_factory()
        _auth_client(self.client, admin)

        response = self.client.get(_plane_detail_url(plan.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], plan.pk)

    def test_patch_plan_admin_200(self):
        admin = make_user_factory(rol='administrador')
        plan = make_plan_factory()
        _auth_client(self.client, admin)

        response = self.client.patch(_plane_detail_url(plan.pk), {'precio': '6000.00'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['precio'], '6000.00')

    def test_patch_plan_recep_403(self):
        recep = make_user_factory(rol='recepcionista')
        plan = make_plan_factory()
        _auth_client(self.client, recep)

        response = self.client.patch(_plane_detail_url(plan.pk), {'precio': '6000.00'})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_plan_admin_204(self):
        admin = make_user_factory(rol='administrador')
        plan = make_plan_factory()
        _auth_client(self.client, admin)

        response = self.client.delete(_plane_detail_url(plan.pk))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_plan_recep_403(self):
        recep = make_user_factory(rol='recepcionista')
        plan = make_plan_factory()
        _auth_client(self.client, recep)

        response = self.client.delete(_plane_detail_url(plan.pk))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

