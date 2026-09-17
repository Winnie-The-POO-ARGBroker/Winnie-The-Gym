from decimal import Decimal

from django.core import mail
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.memberships.models import Membresia
from apps.payments.models import Pago
from conftest import make_plan_factory, make_socio_factory, make_user_factory


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


URL = '/api/payments/cobros-manuales/'


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class CobroManualTests(APITestCase):

    def setUp(self):
        self.socio_user = make_user_factory(email='cm@test.com', rol='socio')
        self.socio = make_socio_factory(self.socio_user, apellido='Manual')
        self.plan = make_plan_factory(nombre='ManualPlan', precio=Decimal('500.00'), duracion_dias=30)
        self.recep = make_user_factory(email='rec@test.com', rol='recepcionista')
        mail.outbox = []

    def _payload(self, **overrides):
        payload = {'socio_id': self.socio.pk, 'plan_id': self.plan.pk, 'monto': '500.00'}
        payload.update(overrides)
        return payload

    def test_receptionist_charges_manually_and_activates_membership(self):
        _auth(self.client, self.recep)

        response = self.client.post(URL, self._payload(observacion='efectivo'), format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        pago = Pago.objects.get(pk=response.data['id'])
        self.assertEqual(pago.metodo, Pago.Metodo.MANUAL)
        self.assertEqual(pago.estado, Pago.Estado.APROBADO)
        self.assertIsNotNone(pago.membresia)
        self.assertEqual(pago.membresia.estado, Membresia.Estado.ACTIVA)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('cm@test.com', mail.outbox[0].to)

    def test_socio_cannot_call_manual_charge(self):
        _auth(self.client, self.socio_user)
        response = self.client.post(URL, self._payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unknown_plan_returns_404(self):
        _auth(self.client, self.recep)
        response = self.client.post(URL, self._payload(plan_id=99999), format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_monto_cero_returns_400(self):
        """Un cobro con monto=0 debe ser rechazado por el serializer (min_value=0.01)."""
        _auth(self.client, self.recep)
        response = self.client.post(URL, self._payload(monto='0.00'), format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('monto', response.data)

    def test_monto_negativo_returns_400(self):
        """Un cobro con monto negativo debe ser rechazado por el serializer."""
        _auth(self.client, self.recep)
        response = self.client.post(URL, self._payload(monto='-100.00'), format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('monto', response.data)
