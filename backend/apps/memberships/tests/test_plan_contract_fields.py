"""Tests for REQ-2.1: PlanMembresia.socios_activos and es_popular contract fields."""
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.memberships.models import Membresia, PlanMembresia
from conftest import make_membresia_factory, make_plan_factory, make_socio_factory, make_user_factory

PLANES_URL = '/api/memberships/planes/'


def _auth_client(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def _plane_detail_url(pk):
    return f'/api/memberships/planes/{pk}/'


class PlanSociosActivosTests(APITestCase):
    """socios_activos computed field returns count of active Membresias for a plan."""

    def test_plan_has_socios_activos_field(self):
        admin = make_user_factory(rol='administrador')
        plan = make_plan_factory()
        _auth_client(self.client, admin)

        response = self.client.get(PLANES_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        if isinstance(data, dict):
            data = data.get('results', data)
        self.assertTrue(any('socios_activos' in p for p in data))

    def test_socios_activos_counts_only_active_membresias(self):
        admin = make_user_factory(rol='administrador')
        plan = make_plan_factory()

        # 2 active membresias
        for _ in range(2):
            user = make_user_factory(rol='socio')
            socio = make_socio_factory(usuario=user)
            make_membresia_factory(socio=socio, plan=plan, estado=Membresia.Estado.ACTIVA)

        # 1 vencida — should not be counted
        user_v = make_user_factory(rol='socio')
        socio_v = make_socio_factory(usuario=user_v)
        make_membresia_factory(socio=socio_v, plan=plan, estado=Membresia.Estado.VENCIDA)

        _auth_client(self.client, admin)
        response = self.client.get(_plane_detail_url(plan.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['socios_activos'], 2)

    def test_socios_activos_zero_when_no_membresias(self):
        admin = make_user_factory(rol='administrador')
        plan = make_plan_factory()
        _auth_client(self.client, admin)

        response = self.client.get(_plane_detail_url(plan.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['socios_activos'], 0)


class PlanEsPopularTests(APITestCase):
    """es_popular BooleanField — default False, writable by admin."""

    def test_plan_es_popular_default_false(self):
        admin = make_user_factory(rol='administrador')
        plan = make_plan_factory()
        _auth_client(self.client, admin)

        response = self.client.get(_plane_detail_url(plan.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('es_popular', response.data)
        self.assertFalse(response.data['es_popular'])

    def test_plan_es_popular_can_be_set_true(self):
        admin = make_user_factory(rol='administrador')
        plan = make_plan_factory(es_popular=True)
        _auth_client(self.client, admin)

        response = self.client.get(_plane_detail_url(plan.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['es_popular'])

    def test_plan_create_sets_es_popular(self):
        admin = make_user_factory(rol='administrador')
        _auth_client(self.client, admin)

        payload = {
            'nombre': 'Plan Popular Test',
            'duracion_dias': 30,
            'precio': '5000.00',
            'clases_asignadas': 0,
            'activo': True,
            'es_popular': True,
        }
        response = self.client.post(PLANES_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['es_popular'])

    def test_plan_patch_es_popular(self):
        admin = make_user_factory(rol='administrador')
        plan = make_plan_factory(es_popular=False)
        _auth_client(self.client, admin)

        response = self.client.patch(_plane_detail_url(plan.pk), {'es_popular': True})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['es_popular'])


class PlanDuracionDiasValidationTests(APITestCase):
    """REQ-2.4: duracion_dias validated as range [30, 365] with Spanish error messages."""

    def test_duracion_dias_below_30_returns_400(self):
        admin = make_user_factory(rol='administrador')
        _auth_client(self.client, admin)

        payload = {
            'nombre': 'Plan Too Short',
            'duracion_dias': 10,
            'precio': '5000.00',
        }
        response = self.client.post(PLANES_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('duracion_dias', response.data)
        error_text = str(response.data['duracion_dias'])
        self.assertIn('30', error_text)
        self.assertIn('365', error_text)

    def test_duracion_dias_above_365_returns_400(self):
        admin = make_user_factory(rol='administrador')
        _auth_client(self.client, admin)

        payload = {
            'nombre': 'Plan Too Long',
            'duracion_dias': 400,
            'precio': '5000.00',
        }
        response = self.client.post(PLANES_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('duracion_dias', response.data)

    def test_duracion_dias_90_is_valid(self):
        """90 days (quarterly) should now be accepted — not restricted to (30, 365) tuple."""
        admin = make_user_factory(rol='administrador')
        _auth_client(self.client, admin)

        payload = {
            'nombre': 'Plan Trimestral',
            'duracion_dias': 90,
            'precio': '12000.00',
            'clases_asignadas': 0,
            'activo': True,
        }
        response = self.client.post(PLANES_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_duracion_dias_180_is_valid(self):
        """180 days (semester) should be accepted."""
        admin = make_user_factory(rol='administrador')
        _auth_client(self.client, admin)

        payload = {
            'nombre': 'Plan Semestral',
            'duracion_dias': 180,
            'precio': '18000.00',
            'clases_asignadas': 0,
            'activo': True,
        }
        response = self.client.post(PLANES_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_duracion_dias_365_is_valid(self):
        """365 days (annual) should be accepted."""
        admin = make_user_factory(rol='administrador')
        _auth_client(self.client, admin)

        payload = {
            'nombre': 'Plan Anual',
            'duracion_dias': 365,
            'precio': '50000.00',
            'clases_asignadas': 0,
            'activo': True,
        }
        response = self.client.post(PLANES_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
