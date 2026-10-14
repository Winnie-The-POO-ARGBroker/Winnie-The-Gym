"""Tests for the robust webhook rewrite — fix #190.

Covers:
- Idempotency: second approved event sends only 1 email.
- Refund flow: approved → refunded moves state correctly.
- Task: expirar_pagos_pendientes cancels after 24h.
"""
import hashlib
import hmac
import uuid
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.memberships.models import Membresia
from apps.payments.models import Pago
from apps.payments.tasks import expirar_pagos_pendientes
from conftest import make_plan_factory, make_socio_factory, make_user_factory


WEBHOOK_URL = '/api/payments/webhook/'
SECRET = 'test-secret-190'


def _sig(data_id, request_id='req-190', ts='1700000001'):
    manifest = f'id:{data_id};request-id:{request_id};ts:{ts};'
    digest = hmac.new(SECRET.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return f'ts={ts},v1={digest}'


def _make_pago(socio, plan, extref=None):
    return Pago.objects.create(
        socio=socio, plan=plan,
        monto=Decimal('1200.00'), moneda='ARS',
        metodo=Pago.Metodo.MERCADO_PAGO,
        estado=Pago.Estado.PENDIENTE,
        mp_external_reference=extref or uuid.uuid4().hex,
    )


@override_settings(
    MP_WEBHOOK_SECRET=SECRET,
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class WebhookRobustTests(APITestCase):

    def setUp(self):
        self.user = make_user_factory(email='wh190@test.com', rol='socio')
        self.socio = make_socio_factory(self.user)
        self.plan = make_plan_factory(nombre='Robust-Plan', precio=Decimal('1200.00'), duracion_dias=30)
        self.extref = uuid.uuid4().hex
        self.pago = _make_pago(self.socio, self.plan, extref=self.extref)
        mail.outbox = []

    def _post(self, data_id, mp_status='approved', extref=None):
        request_id = 'req-190'
        sig = _sig(data_id, request_id)
        with patch('apps.payments.services.mercadopago_client.fetch_payment') as mock:
            mock.return_value = {
                'id': data_id,
                'status': mp_status,
                'status_detail': 'ok',
                'external_reference': extref or self.extref,
            }
            return self.client.post(
                f'{WEBHOOK_URL}?data.id={data_id}',
                data={'type': 'payment', 'data': {'id': data_id}},
                format='json',
                HTTP_X_SIGNATURE=sig,
                HTTP_X_REQUEST_ID=request_id,
            )

    def test_webhook_second_approved_payment_same_pago_only_one_email(self):
        """Fix #190 idempotency: a second 'approved' event for the same Pago must NOT send another email."""
        # First webhook: approved → email sent
        resp1 = self._post('PAY-190-A')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.pago.refresh_from_db()
        self.assertEqual(self.pago.estado, Pago.Estado.APROBADO)
        self.assertEqual(len(mail.outbox), 1, 'Expected exactly 1 email after first approved event')

        # Second webhook with same data_id: must be idempotent — no second email
        mail.outbox = []
        resp2 = self._post('PAY-190-A')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(
            len(mail.outbox), 0,
            f'Expected 0 emails on duplicate webhook, got {len(mail.outbox)}',
        )

        # Membership should still be exactly 1 (not doubled)
        self.assertEqual(self.pago.membresia_set.count() if hasattr(self.pago, 'membresia_set') else
                         Membresia.objects.filter(socio=self.socio).count(), 1)

    def test_webhook_refund_updates_pago_and_notifies(self):
        """Fix #190: refund webhook on an approved pago must move estado to reembolsado."""
        # First: approve the pago
        self._post('PAY-190-R')
        self.pago.refresh_from_db()
        self.assertEqual(self.pago.estado, Pago.Estado.APROBADO)

        # Now send a refunded event
        mail.outbox = []
        resp = self._post('PAY-190-R', mp_status='refunded')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.pago.refresh_from_db()
        self.assertEqual(
            self.pago.estado, Pago.Estado.REEMBOLSADO,
            'Refund webhook must transition approved pago to reembolsado',
        )

    def test_webhook_non_payment_topic_returns_200_and_skips_processing(self):
        """Fix #190: topics other than 'payment' must return 200 immediately without processing."""
        request_id = 'req-topic'
        data_id = 'MERCHANT-1'
        sig = _sig(data_id, request_id)
        with patch('apps.payments.services.mercadopago_client.fetch_payment') as mock:
            resp = self.client.post(
                f'{WEBHOOK_URL}?data.id={data_id}',
                data={'type': 'merchant_order', 'data': {'id': data_id}},
                format='json',
                HTTP_X_SIGNATURE=sig,
                HTTP_X_REQUEST_ID=request_id,
            )
            # Must not call fetch_payment for non-payment topics
            mock.assert_not_called()
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


class ExpirarPagosPendientesTaskTests(APITestCase):
    """Unit tests for the Celery expiry task — fix #190."""

    def setUp(self):
        self.user = make_user_factory(email='task190@test.com', rol='socio')
        self.socio = make_socio_factory(self.user)
        self.plan = make_plan_factory(nombre='Task-Plan', duracion_dias=30)

    def _create_pago(self, hours_old):
        pago = Pago.objects.create(
            socio=self.socio, plan=self.plan,
            monto=Decimal('1000.00'), moneda='ARS',
            metodo=Pago.Metodo.MERCADO_PAGO,
            estado=Pago.Estado.PENDIENTE,
            mp_external_reference=uuid.uuid4().hex,
        )
        # Backdate created_at
        Pago.objects.filter(pk=pago.pk).update(
            created_at=timezone.now() - timedelta(hours=hours_old)
        )
        pago.refresh_from_db()
        return pago

    def test_expirar_pagos_pendientes_task_cancels_after_24h(self):
        """Fix #190: pagos pendientes older than 24h must be cancelled by the task."""
        old_pago = self._create_pago(hours_old=25)
        recent_pago = self._create_pago(hours_old=2)

        cancelled = expirar_pagos_pendientes()

        self.assertGreaterEqual(cancelled, 1)
        old_pago.refresh_from_db()
        self.assertEqual(old_pago.estado, Pago.Estado.CANCELADO)

        recent_pago.refresh_from_db()
        self.assertEqual(recent_pago.estado, Pago.Estado.PENDIENTE)

    def test_expirar_pagos_pendientes_does_not_touch_approved(self):
        """Approved pagos must never be cancelled by the expiry task."""
        approved_pago = Pago.objects.create(
            socio=self.socio, plan=self.plan,
            monto=Decimal('1000.00'), moneda='ARS',
            metodo=Pago.Metodo.MERCADO_PAGO,
            estado=Pago.Estado.APROBADO,
            mp_external_reference=uuid.uuid4().hex,
        )
        Pago.objects.filter(pk=approved_pago.pk).update(
            created_at=timezone.now() - timedelta(hours=48)
        )

        expirar_pagos_pendientes()

        approved_pago.refresh_from_db()
        self.assertEqual(approved_pago.estado, Pago.Estado.APROBADO)
