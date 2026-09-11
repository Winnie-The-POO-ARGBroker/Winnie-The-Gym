from decimal import Decimal
from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.payments.models import Pago
from conftest import make_plan_factory, make_socio_factory, make_user_factory


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


URL = '/api/payments/preferencias/'


class CrearPreferenciaTests(APITestCase):

    def setUp(self):
        self.socio_user = make_user_factory(email='pay@test.com', rol='socio')
        self.socio = make_socio_factory(self.socio_user)
        self.plan = make_plan_factory(nombre='Gold', precio=Decimal('1500.00'), duracion_dias=30)

    @patch('apps.payments.services.mercadopago_client.create_preference')
    def test_socio_creates_preference_and_persists_pago(self, mock_create):
        mock_create.return_value = {
            'id': 'PREF-123',
            'init_point': 'https://mp.example.com/checkout/PREF-123',
            'sandbox_init_point': 'https://sandbox.mp.example.com/checkout/PREF-123',
        }
        _auth(self.client, self.socio_user)

        response = self.client.post(URL, {'plan_id': self.plan.pk}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['preference_id'], 'PREF-123')
        self.assertIn('init_point', response.data)
        self.assertIn('external_reference', response.data)

        pago = Pago.objects.get(pk=response.data['pago_id'])
        self.assertEqual(pago.estado, Pago.Estado.PENDIENTE)
        self.assertEqual(pago.mp_preference_id, 'PREF-123')
        self.assertEqual(pago.socio, self.socio)
        self.assertEqual(pago.plan, self.plan)
        self.assertEqual(pago.monto, Decimal('1500.00'))

    @patch('apps.payments.services.mercadopago_client.create_preference')
    def test_admin_cannot_create_preference(self, mock_create):
        admin = make_user_factory(email='admin@pay.test', rol='administrador')
        _auth(self.client, admin)

        response = self.client.post(URL, {'plan_id': self.plan.pk}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        mock_create.assert_not_called()

    def test_plan_inactive_returns_404(self):
        self.plan.activo = False
        self.plan.save()
        _auth(self.client, self.socio_user)

        response = self.client.post(URL, {'plan_id': self.plan.pk}, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch('apps.payments.services.mercadopago_client.create_preference')
    def test_mp_failure_returns_502(self, mock_create):
        mock_create.side_effect = RuntimeError('MP down')
        _auth(self.client, self.socio_user)

        response = self.client.post(URL, {'plan_id': self.plan.pk}, format='json')

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
