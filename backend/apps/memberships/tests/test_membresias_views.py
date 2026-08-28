from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from conftest import make_membresia_factory, make_plan_factory, make_socio_factory, make_user_factory


def _auth_client(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


MEMBRESIAS_URL = '/api/memberships/membresias/'


def _detail_url(pk):
    return f'/api/memberships/membresias/{pk}/'


class MembresiaCreateTests(APITestCase):

    def test_create_membresia_admin_201(self):
        admin = make_user_factory(rol='administrador')
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)
        plan = make_plan_factory(duracion_dias=30)
        _auth_client(self.client, admin)

        payload = {
            'socio': socio.pk,
            'plan': plan.pk,
            'fecha_inicio': '2026-08-19',
        }
        response = self.client.post(MEMBRESIAS_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['fecha_fin'], '2026-09-18')
        self.assertEqual(response.data['estado'], 'activa')

    def test_fecha_fin_computed_client_value_ignored(self):
        admin = make_user_factory(rol='administrador')
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)
        plan = make_plan_factory(duracion_dias=30)
        _auth_client(self.client, admin)

        payload = {
            'socio': socio.pk,
            'plan': plan.pk,
            'fecha_inicio': '2026-08-19',
            'fecha_fin': '2099-12-31',
        }
        response = self.client.post(MEMBRESIAS_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['fecha_fin'], '2026-09-18')

    def test_estado_not_writable_on_create(self):
        admin = make_user_factory(rol='administrador')
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)
        plan = make_plan_factory(duracion_dias=30)
        _auth_client(self.client, admin)

        payload = {
            'socio': socio.pk,
            'plan': plan.pk,
            'fecha_inicio': '2026-08-19',
            'estado': 'vencida',
        }
        response = self.client.post(MEMBRESIAS_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['estado'], 'activa')

    def test_unauthenticated_401(self):
        response = self.client.post(MEMBRESIAS_URL, {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MembresiaUpdateTests(APITestCase):

    def test_patch_estado_valid_values_200(self):
        admin = make_user_factory(rol='administrador')
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)
        plan = make_plan_factory()
        membresia = make_membresia_factory(socio, plan)
        _auth_client(self.client, admin)

        for estado in ('vencida', 'suspendida', 'cancelada'):
            membresia.estado = 'activa'
            membresia.save()
            response = self.client.patch(_detail_url(membresia.pk), {'estado': estado})
            self.assertEqual(response.status_code, status.HTTP_200_OK, msg=f'estado={estado}')

    def test_patch_estado_pendiente_pago_400(self):
        admin = make_user_factory(rol='administrador')
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)
        plan = make_plan_factory()
        membresia = make_membresia_factory(socio, plan)
        _auth_client(self.client, admin)

        response = self.client.patch(_detail_url(membresia.pk), {'estado': 'pendiente_pago'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('estado', response.data)


class MembresiaRetrieveTests(APITestCase):

    def test_retrieve_includes_nested_plan(self):
        admin = make_user_factory(rol='administrador')
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)
        plan = make_plan_factory()
        membresia = make_membresia_factory(socio, plan)
        _auth_client(self.client, admin)

        response = self.client.get(_detail_url(membresia.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('plan', response.data)
        plan_data = response.data['plan']
        for field in ('nombre', 'duracion_dias', 'precio', 'clases_asignadas'):
            self.assertIn(field, plan_data)

    def test_list_membresias_admin_200(self):
        admin = make_user_factory(rol='administrador')
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)
        plan = make_plan_factory()
        make_membresia_factory(socio, plan)
        _auth_client(self.client, admin)

        response = self.client.get(MEMBRESIAS_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_membresias_socio_403(self):
        socio_user = make_user_factory(rol='socio')
        _auth_client(self.client, socio_user)

        response = self.client.get(MEMBRESIAS_URL)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
