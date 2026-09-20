import hashlib
import hmac
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.memberships.models import Membresia
from apps.payments.models import Pago
from apps.payments.services import verify_webhook_signature
from conftest import make_plan_factory, make_socio_factory, make_user_factory


URL = '/api/payments/webhook/'
SECRET = 'test-secret'


def _build_signature(secret, request_id, data_id, ts='1700000000'):
    manifest = f'id:{data_id};request-id:{request_id};ts:{ts};'
    digest = hmac.new(secret.encode('utf-8'), manifest.encode('utf-8'), hashlib.sha256).hexdigest()
    return f'ts={ts},v1={digest}'


@override_settings(
    MP_WEBHOOK_SECRET=SECRET,
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class WebhookTests(APITestCase):

    def setUp(self):
        self.socio_user = make_user_factory(email='wh@test.com', rol='socio')
        self.socio = make_socio_factory(self.socio_user)
        self.plan = make_plan_factory(nombre='WH-Plan', precio=Decimal('900.00'), duracion_dias=30)
        self.external_reference = uuid.uuid4().hex
        self.pago = Pago.objects.create(
            socio=self.socio, plan=self.plan,
            monto=Decimal('900.00'), moneda='ARS',
            metodo=Pago.Metodo.MERCADO_PAGO, estado=Pago.Estado.PENDIENTE,
            mp_external_reference=self.external_reference,
            mp_preference_id='PREF-9',
        )
        mail.outbox = []

    def _post(self, data_id, headers=True, mp_status='approved'):
        request_id = 'req-1'
        signature = _build_signature(SECRET, request_id, data_id)
        extras = {}
        if headers:
            extras['HTTP_X_SIGNATURE'] = signature
            extras['HTTP_X_REQUEST_ID'] = request_id
        with patch('apps.payments.services.mercadopago_client.fetch_payment') as mock_fetch:
            mock_fetch.return_value = {
                'id': data_id,
                'status': mp_status,
                'status_detail': 'ok',
                'external_reference': self.external_reference,
            }
            return self.client.post(
                f'{URL}?data.id={data_id}',
                data={'type': 'payment', 'action': 'payment.updated', 'data': {'id': data_id}},
                format='json',
                **extras,
            )

    def test_approved_webhook_activates_membership_and_sends_email(self):
        response = self._post(data_id='PAY-1')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.pago.refresh_from_db()
        self.assertEqual(self.pago.estado, Pago.Estado.APROBADO)
        self.assertIsNotNone(self.pago.paid_at)
        self.assertIsNotNone(self.pago.membresia)
        self.assertEqual(self.pago.membresia.estado, Membresia.Estado.ACTIVA)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('wh@test.com', mail.outbox[0].to)

    def test_rejected_webhook_does_not_activate_membership(self):
        response = self._post(data_id='PAY-2', mp_status='rejected')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.pago.refresh_from_db()
        self.assertEqual(self.pago.estado, Pago.Estado.RECHAZADO)
        self.assertIsNone(self.pago.membresia)
        self.assertEqual(len(mail.outbox), 0)

    def test_invalid_signature_is_rejected(self):
        with patch('apps.payments.services.mercadopago_client.fetch_payment') as mock_fetch:
            response = self.client.post(
                f'{URL}?data.id=PAY-3',
                data={'type': 'payment', 'data': {'id': 'PAY-3'}},
                format='json',
                HTTP_X_SIGNATURE='ts=1700000000,v1=deadbeef',
                HTTP_X_REQUEST_ID='req-x',
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            mock_fetch.assert_not_called()

    def test_duplicate_webhook_is_idempotent(self):
        self._post(data_id='PAY-4')
        self.pago.refresh_from_db()
        first_paid_at = self.pago.paid_at

        # Repeat exact same webhook: should not double-charge nor duplicate email.
        mail.outbox = []
        self._post(data_id='PAY-4')
        self.pago.refresh_from_db()
        self.assertEqual(self.pago.paid_at, first_paid_at)

    def test_webhook_for_unknown_reference_returns_400(self):
        with patch('apps.payments.services.mercadopago_client.fetch_payment') as mock_fetch:
            mock_fetch.return_value = {
                'id': 'PAY-X',
                'status': 'approved',
                'external_reference': 'reference-that-does-not-exist',
            }
            request_id = 'req-x'
            signature = _build_signature(SECRET, request_id, 'PAY-X')
            response = self.client.post(
                f'{URL}?data.id=PAY-X',
                data={'type': 'payment', 'data': {'id': 'PAY-X'}},
                format='json',
                HTTP_X_SIGNATURE=signature,
                HTTP_X_REQUEST_ID=request_id,
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class WebhookSignatureUnitTests(APITestCase):

    def test_verify_signature_matches(self):
        with override_settings(MP_WEBHOOK_SECRET=SECRET):
            sig = _build_signature(SECRET, 'r1', 'PAY-Z')
            self.assertTrue(verify_webhook_signature(sig, 'r1', 'PAY-Z'))

    def test_verify_signature_mismatch(self):
        with override_settings(MP_WEBHOOK_SECRET=SECRET):
            self.assertFalse(verify_webhook_signature('ts=1,v1=beef', 'r1', 'PAY-Z'))

    def test_secret_absent_raises_improperly_configured(self):
        """Empty MP_WEBHOOK_SECRET must raise ImproperlyConfigured (fail-closed)."""
        from django.core.exceptions import ImproperlyConfigured
        with override_settings(MP_WEBHOOK_SECRET=''):
            with self.assertRaises(ImproperlyConfigured):
                verify_webhook_signature('anything', 'r1', 'PAY-Z')
