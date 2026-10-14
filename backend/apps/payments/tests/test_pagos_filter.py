"""Tests for PagoFilter socio isolation and socio_id alias — fix #225."""
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.payments.models import Pago
from conftest import make_plan_factory, make_socio_factory, make_user_factory


PAGOS_URL = '/api/payments/pagos/'


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


class PagosFilterTests(APITestCase):

    def setUp(self):
        self.admin = make_user_factory(email='adm@filter.test', rol='administrador')
        self.plan = make_plan_factory(nombre='Filter-Plan', precio=Decimal('2000.00'))

        self.user_a = make_user_factory(email='a@filter.test', rol='socio')
        self.socio_a = make_socio_factory(self.user_a, apellido='Alpha', dni='10000001')

        self.user_b = make_user_factory(email='b@filter.test', rol='socio')
        self.socio_b = make_socio_factory(self.user_b, apellido='Beta', dni='20000002')

        self.pago_a = Pago.objects.create(
            socio=self.socio_a, plan=self.plan,
            monto=Decimal('2000.00'), moneda='ARS',
            metodo=Pago.Metodo.MANUAL, estado=Pago.Estado.APROBADO,
            mp_external_reference='ref-a',
        )
        self.pago_b = Pago.objects.create(
            socio=self.socio_b, plan=self.plan,
            monto=Decimal('2000.00'), moneda='ARS',
            metodo=Pago.Metodo.MANUAL, estado=Pago.Estado.APROBADO,
            mp_external_reference='ref-b',
        )
        _auth(self.client, self.admin)

    def test_pagos_filter_by_socio_isolates_results(self):
        """Filtering by socio=<id> must return only that socio's payments (fix #225)."""
        response = self.client.get(f'{PAGOS_URL}?socio={self.socio_a.pk}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [p['id'] for p in response.json()['results']]
        self.assertIn(self.pago_a.pk, ids)
        self.assertNotIn(self.pago_b.pk, ids)

    def test_pagos_filter_socio_id_alias_also_works(self):
        """socio_id= must behave identically to socio= (defense-in-depth fix #225)."""
        response = self.client.get(f'{PAGOS_URL}?socio_id={self.socio_b.pk}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [p['id'] for p in response.json()['results']]
        self.assertIn(self.pago_b.pk, ids)
        self.assertNotIn(self.pago_a.pk, ids)
