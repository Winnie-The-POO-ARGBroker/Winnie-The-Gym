"""POST /api/payments/pagos/confirmar/ — socio-driven payment confirmation after MP return."""
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.core import mail
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.memberships.models import Membresia
from apps.payments.models import Pago
from conftest import make_plan_factory, make_socio_factory, make_user_factory


URL = '/api/payments/pagos/confirmar/'
FETCH = 'apps.payments.services.mercadopago_client.fetch_payment'


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class ConfirmarPagoTests(APITestCase):

    def setUp(self):
        self.user = make_user_factory(email='conf@test.com', rol='socio')
        self.socio = make_socio_factory(self.user)
        self.other_user = make_user_factory(email='other@test.com', rol='socio')
        self.other_socio = make_socio_factory(self.other_user, apellido='Other')
        self.plan = make_plan_factory(nombre='Conf-Plan', precio=Decimal('800.00'), duracion_dias=30)
        self.extref = uuid.uuid4().hex
        self.pago = Pago.objects.create(
            socio=self.socio, plan=self.plan, monto=Decimal('800.00'), moneda='ARS',
            metodo=Pago.Metodo.MERCADO_PAGO, estado=Pago.Estado.PENDIENTE,
            mp_external_reference=self.extref,
        )
        _auth(self.client, self.user)
        mail.outbox = []

    def _mp(self, mp_status='approved', extref=None):
        return {'id': 555, 'status': mp_status, 'status_detail': 'accredited',
                'external_reference': extref or self.extref}

    def _confirm(self, mp_status='approved', payment_id='555', extref=None):
        with patch(FETCH) as fetch:
            fetch.return_value = self._mp(mp_status, extref)
            return self.client.post(URL, {'payment_id': payment_id}, format='json'), fetch

    def test_approved_marks_aprobado_and_activates_membership(self):
        response, fetch = self._confirm()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        fetch.assert_called_once_with('555')
        body = response.json()
        self.assertEqual(body['id'], self.pago.pk)
        self.assertEqual(body['estado'], 'aprobado')
        self.assertEqual(body['mp_payment_id'], '555')

        self.pago.refresh_from_db()
        self.assertEqual(self.pago.estado, Pago.Estado.APROBADO)
        self.assertIsNotNone(self.pago.paid_at)
        self.assertEqual(self.pago.membresia.estado, Membresia.Estado.ACTIVA)
        self.assertEqual(len(mail.outbox), 1)

    def test_second_call_is_idempotent(self):
        self._confirm()
        self.pago.refresh_from_db()
        membresia_id, paid_at = self.pago.membresia_id, self.pago.paid_at
        mail.outbox = []

        response, _ = self._confirm()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['estado'], 'aprobado')
        self.pago.refresh_from_db()
        self.assertEqual(self.pago.membresia_id, membresia_id)
        self.assertEqual(self.pago.paid_at, paid_at)
        self.assertEqual(Membresia.objects.filter(socio=self.socio).count(), 1)
        self.assertEqual(len(mail.outbox), 0)

    def test_after_webhook_already_approved_has_no_side_effects(self):
        self._confirm()
        mail.outbox = []
        with self.assertNoLogs('apps.payments.services', level='WARNING'):
            self._confirm()

    def test_rejected_does_not_activate_membership(self):
        response, _ = self._confirm(mp_status='rejected')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['estado'], 'rechazado')
        self.pago.refresh_from_db()
        self.assertEqual(self.pago.estado, Pago.Estado.RECHAZADO)
        self.assertIsNone(self.pago.membresia)
        self.assertEqual(len(mail.outbox), 0)

    def test_in_process_stays_pendiente(self):
        response, _ = self._confirm(mp_status='in_process')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['estado'], 'pendiente')
        self.pago.refresh_from_db()
        self.assertIsNone(self.pago.membresia)

    def test_cancelled_is_terminal_and_not_reactivated(self):
        self.pago.estado = Pago.Estado.CANCELADO
        self.pago.save()
        response, _ = self._confirm(mp_status='approved')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['estado'], 'cancelado')
        self.pago.refresh_from_db()
        self.assertIsNone(self.pago.membresia)

    def test_other_socios_pago_returns_404_without_changes(self):
        other_ref = uuid.uuid4().hex
        other_pago = Pago.objects.create(
            socio=self.other_socio, plan=self.plan, monto=Decimal('800.00'), moneda='ARS',
            metodo=Pago.Metodo.MERCADO_PAGO, estado=Pago.Estado.PENDIENTE,
            mp_external_reference=other_ref,
        )
        response, _ = self._confirm(extref=other_ref)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        other_pago.refresh_from_db()
        self.assertEqual(other_pago.estado, Pago.Estado.PENDIENTE)
        self.assertIsNone(other_pago.membresia)

    def test_unknown_external_reference_returns_404(self):
        response, _ = self._confirm(extref='does-not-exist')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_pago_resolved_through_metadata_pago_id(self):
        with patch(FETCH) as fetch:
            fetch.return_value = {'id': 555, 'status': 'approved', 'external_reference': '',
                                  'metadata': {'pago_id': self.pago.pk}}
            response = self.client.post(URL, {'payment_id': '555'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['estado'], 'aprobado')

    def test_mercadopago_failure_returns_502(self):
        with patch(FETCH, side_effect=RuntimeError('boom')):
            response = self.client.post(URL, {'payment_id': '555'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertIn('detail', response.json())
        self.pago.refresh_from_db()
        self.assertEqual(self.pago.estado, Pago.Estado.PENDIENTE)

    def test_missing_payment_id_returns_400(self):
        response = self.client.post(URL, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_numeric_payment_id_returns_400_without_calling_mp(self):
        with patch(FETCH) as fetch:
            response = self.client.post(URL, {'payment_id': '../x'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        fetch.assert_not_called()

    def test_unauthenticated_returns_401(self):
        self.client.credentials()
        response = self.client.post(URL, {'payment_id': '555'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_socio_is_forbidden(self):
        admin = make_user_factory(email='adm@test.com', rol='administrador')
        _auth(self.client, admin)
        response = self.client.post(URL, {'payment_id': '555'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
