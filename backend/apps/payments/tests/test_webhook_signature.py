"""Webhook signature diagnostics, secret normalisation and legacy IPN handling."""
import hashlib
import hmac
import logging
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.payments.models import Pago
from apps.payments.services import verify_webhook_signature
from conftest import make_plan_factory, make_socio_factory, make_user_factory


URL = '/api/payments/webhook/'
SECRET = 'whsec-diagnostics-123'
LOGGER = 'apps.payments.services'


def _sig(secret, request_id, data_id, ts='1700000000'):
    manifest = f'id:{data_id};request-id:{request_id};ts:{ts};'
    digest = hmac.new(secret.encode('utf-8'), manifest.encode('utf-8'), hashlib.sha256).hexdigest()
    return f'ts={ts},v1={digest}'


class VerifySignatureSecretTests(APITestCase):

    def test_secret_with_surrounding_whitespace_verifies(self):
        with override_settings(MP_WEBHOOK_SECRET=f'  {SECRET}\n'):
            self.assertTrue(verify_webhook_signature(_sig(SECRET, 'r1', '123'), 'r1', '123'))

    def test_secret_with_double_quotes_verifies(self):
        with override_settings(MP_WEBHOOK_SECRET=f'"{SECRET}"'):
            self.assertTrue(verify_webhook_signature(_sig(SECRET, 'r1', '123'), 'r1', '123'))

    def test_secret_with_single_quotes_and_whitespace_verifies(self):
        with override_settings(MP_WEBHOOK_SECRET=f" '{SECRET}' "):
            self.assertTrue(verify_webhook_signature(_sig(SECRET, 'r1', '123'), 'r1', '123'))

    def test_alphanumeric_data_id_is_lowercased_in_manifest(self):
        with override_settings(MP_WEBHOOK_SECRET=SECRET):
            self.assertTrue(verify_webhook_signature(_sig(SECRET, 'r1', 'abc123'), 'r1', 'ABC123'))


class VerifySignatureLoggingTests(APITestCase):

    def _fail_log(self, caplog_ctx):
        return ' '.join(r.getMessage() for r in caplog_ctx.records if r.levelno == logging.WARNING)

    def test_logs_missing_header_and_data_id(self):
        with override_settings(MP_WEBHOOK_SECRET=SECRET):
            with self.assertLogs(LOGGER, level='WARNING') as cm:
                self.assertFalse(verify_webhook_signature('', '', ''))
        text = ' '.join(cm.output)
        self.assertIn('x-signature', text)
        self.assertIn('x-request-id', text)
        self.assertIn('data_id', text)

    def test_logs_missing_ts_or_v1(self):
        with override_settings(MP_WEBHOOK_SECRET=SECRET):
            with self.assertLogs(LOGGER, level='WARNING') as cm:
                self.assertFalse(verify_webhook_signature('v1=abc', 'r1', '123'))
        self.assertIn('ts', ' '.join(cm.output))
        self.assertIn('missing', ' '.join(cm.output))

    def test_logs_mismatch_without_leaking_secret(self):
        with override_settings(MP_WEBHOOK_SECRET=SECRET):
            with self.assertLogs(LOGGER, level='WARNING') as cm:
                self.assertFalse(verify_webhook_signature('ts=1,v1=beef', 'r1', '123'))
        text = ' '.join(cm.output)
        self.assertIn('mismatch', text)
        self.assertIn(f'secret_len={len(SECRET)}', text)
        self.assertIn('v1_len=4', text)
        self.assertNotIn(SECRET, text)

    def test_logs_when_secret_had_whitespace_or_quotes(self):
        with override_settings(MP_WEBHOOK_SECRET=f' "{SECRET}" '):
            with self.assertLogs(LOGGER, level='WARNING') as cm:
                self.assertFalse(verify_webhook_signature('ts=1,v1=beef', 'r1', '123'))
        text = ' '.join(cm.output)
        self.assertIn('secret_had_padding=True', text)
        self.assertNotIn(SECRET, text)


@override_settings(MP_WEBHOOK_SECRET=SECRET)
class WebhookQueryDataIdAndLegacyTests(APITestCase):

    def setUp(self):
        self.user = make_user_factory(email='sig@test.com', rol='socio')
        self.socio = make_socio_factory(self.user)
        self.plan = make_plan_factory(nombre='Sig-Plan', precio=Decimal('500.00'), duracion_dias=30)
        self.extref = uuid.uuid4().hex
        self.pago = Pago.objects.create(
            socio=self.socio, plan=self.plan, monto=Decimal('500.00'), moneda='ARS',
            metodo=Pago.Metodo.MERCADO_PAGO, estado=Pago.Estado.PENDIENTE,
            mp_external_reference=self.extref,
        )

    def _mp(self, data_id):
        return {'id': data_id, 'status': 'approved', 'status_detail': 'accredited',
                'external_reference': self.extref}

    def test_query_data_id_is_used_for_manifest_over_body(self):
        # Signature is built over the query data.id; body carries a different id.
        sig = _sig(SECRET, 'req-q', '777')
        with patch('apps.payments.services.mercadopago_client.fetch_payment') as fetch:
            fetch.return_value = self._mp('777')
            response = self.client.post(
                f'{URL}?data.id=777&type=payment',
                data={'type': 'payment', 'data': {'id': '999'}},
                format='json', HTTP_X_SIGNATURE=sig, HTTP_X_REQUEST_ID='req-q',
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        fetch.assert_called_once_with('777')

    def test_legacy_ipn_without_signature_returns_200_ignored(self):
        with patch('apps.payments.services.mercadopago_client.fetch_payment') as fetch:
            response = self.client.post(f'{URL}?id=123&topic=payment', data={}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()['ok'])
        self.assertIn('ignored', response.json()['detail'])
        fetch.assert_not_called()

    def test_signed_but_invalid_returns_400(self):
        with patch('apps.payments.services.mercadopago_client.fetch_payment') as fetch:
            response = self.client.post(
                f'{URL}?data.id=123&type=payment',
                data={'type': 'payment', 'data': {'id': '123'}}, format='json',
                HTTP_X_SIGNATURE='ts=1,v1=deadbeef', HTTP_X_REQUEST_ID='req-bad',
            )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()['detail'], 'invalid signature')
        fetch.assert_not_called()

    def test_unsigned_request_with_data_id_is_still_rejected(self):
        response = self.client.post(
            f'{URL}?data.id=123&type=payment',
            data={'type': 'payment', 'data': {'id': '123'}}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(MP_WEBHOOK_SECRET=SECRET)
class LogInjectionTests(APITestCase):
    """The webhook is unauthenticated: what it logs must not let a caller forge log lines."""

    FORGED = 'x\nINFO forged line'

    def _messages(self, cm):
        return [r.getMessage() for r in cm.records]

    def test_data_id_is_not_logged_raw_on_signature_mismatch(self):
        with self.assertLogs(LOGGER, level='WARNING') as cm:
            verify_webhook_signature(_sig('otra-clave', 'req', self.FORGED), 'req', self.FORGED)
        for message in self._messages(cm):
            self.assertNotIn('\n', message)

    def test_legacy_ipn_id_is_not_logged_raw(self):
        with self.assertLogs(LOGGER, level='INFO') as cm:
            self.client.post(URL + '?topic=payment&id=x%0AINFO%20forged%20line', {}, format='json')
        for message in self._messages(cm):
            self.assertNotIn('\n', message)

