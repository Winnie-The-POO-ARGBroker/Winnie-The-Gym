from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.access.models import AccessLog
from apps.access.utils import (
    generate_dynamic_qr_token,
    verify_and_consume_token,
    verify_dynamic_qr_token,
)
from conftest import make_user_factory

User = get_user_model()


class DynamicQRAndAccessTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='socio_test',
            email='socio@winniegym.com',
            password='Password123!',
        )
        self.staff_user = User.objects.create_user(
            username='recepcion_test',
            email='recepcion@winniegym.com',
            password='Password123!',
            rol='recepcionista',
        )
        self.client = APIClient()

    def test_generate_and_verify_qr_token_success(self):
        token_data = generate_dynamic_qr_token(self.user)
        self.assertIn('qr_token', token_data)
        self.assertEqual(token_data['expires_in'], 30)

        is_valid, error_code, payload = verify_dynamic_qr_token(token_data['qr_token'], consume=False)
        self.assertTrue(is_valid)
        self.assertIsNone(error_code)
        self.assertEqual(payload['user_id'], self.user.id)

    def test_verify_qr_token_tampered_fails(self):
        token_data = generate_dynamic_qr_token(self.user)
        tampered_token = token_data['qr_token'] + "extra_chars"
        is_valid, error_code, payload = verify_dynamic_qr_token(tampered_token, consume=False)
        self.assertFalse(is_valid)
        self.assertEqual(error_code, 'INVALID_SIGNATURE')

    def test_verify_qr_token_replay_attack_fails(self):
        token_data = generate_dynamic_qr_token(self.user)
        jti = token_data['jti']

        # First atomic use -> OK
        is_valid_use, error_code = verify_and_consume_token(jti)
        self.assertTrue(is_valid_use)
        self.assertIsNone(error_code)

        # Second atomic use -> REPLAY_ATTACK
        is_valid_use, error_code = verify_and_consume_token(jti)
        self.assertFalse(is_valid_use)
        self.assertEqual(error_code, 'REPLAY_ATTACK')

    def test_verify_and_consume_token_empty_jti_fails(self):
        """Verify that a null or empty jti is rejected with INVALID_TOKEN."""
        is_valid_use, error_code = verify_and_consume_token(None)
        self.assertFalse(is_valid_use)
        self.assertEqual(error_code, 'INVALID_TOKEN')

        is_valid_use, error_code = verify_and_consume_token("")
        self.assertFalse(is_valid_use)
        self.assertEqual(error_code, 'INVALID_TOKEN')

    def test_scan_expired_token_returns_denied(self):
        """Expired token at endpoint level returns 403 DENIED."""
        token_data = generate_dynamic_qr_token(self.user)
        self.client.force_authenticate(user=self.staff_user)

        with patch('apps.access.utils.time.time', return_value=9999999999):
            response = self.client.post('/api/access/qr/scan/', {
                'qr_token': token_data['qr_token'],
                'access_type': 'ENTRY',
            })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['denial_reason'], 'TOKEN_EXPIRED')

        log = AccessLog.objects.last()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, 'DENIED')
        self.assertEqual(log.denial_reason, 'TOKEN_EXPIRED')

    def test_member_cannot_call_scan_endpoint(self):
        """A socio attempting to authorise their own entry receives 403."""
        token_data = generate_dynamic_qr_token(self.user)
        self.client.force_authenticate(user=self.user)

        response = self.client.post('/api/access/qr/scan/', {
            'qr_token': token_data['qr_token'],
            'access_type': 'ENTRY',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('apps.access.views.has_active_membership')
    @patch('apps.access.views.log_qr_event')
    def test_replay_attack_via_endpoint(self, mock_log, mock_has_active):
        mock_has_active.return_value = True
        """End-to-end replay attack on the scan endpoint."""
        token_data = generate_dynamic_qr_token(self.user)
        self.client.force_authenticate(user=self.staff_user)

        data = {'qr_token': token_data['qr_token'], 'access_type': 'ENTRY'}

        r1 = self.client.post('/api/access/qr/scan/', data)
        r2 = self.client.post('/api/access/qr/scan/', data)

        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        self.assertEqual(r1.data['status'], 'GRANTED')

        self.assertEqual(r2.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(r2.data['status'], 'DENIED')
        self.assertEqual(r2.data['denial_reason'], 'REPLAY_ATTACK')

        self.assertEqual(AccessLog.objects.count(), 2)
        logs = AccessLog.objects.order_by('timestamp')
        self.assertEqual(logs[0].status, 'GRANTED')
        self.assertEqual(logs[1].status, 'DENIED')
        self.assertEqual(logs[1].denial_reason, 'REPLAY_ATTACK')

    @patch('apps.access.views.has_active_membership')
    @patch('apps.access.views.log_qr_event')
    def test_generate_and_scan_qr_views(self, mock_log_qr_event, mock_has_active):
        mock_log_qr_event.return_value = True
        mock_has_active.return_value = True

        # Socio requests QR
        self.client.force_authenticate(user=self.user)
        res_gen = self.client.get('/api/access/qr/generate/')
        self.assertEqual(res_gen.status_code, status.HTTP_200_OK)
        qr_token = res_gen.data['qr_token']

        # Reception scans QR
        self.client.force_authenticate(user=self.staff_user)
        res_scan = self.client.post('/api/access/qr/scan/', {
            'qr_token': qr_token,
            'access_type': 'ENTRY',
        })
        self.assertEqual(res_scan.status_code, status.HTTP_200_OK)
        self.assertEqual(res_scan.data['status'], 'GRANTED')

        # Verify persistence in DB
        log_db = AccessLog.objects.get(qr_jti=res_gen.data['jti'])
        self.assertEqual(log_db.user, self.user)
        self.assertEqual(log_db.status, 'GRANTED')


class AccessLogListViewTests(TestCase):
    """Tests for AccessLogListView permission and queryset filtering."""

    def setUp(self):
        self.client = APIClient()
        self.url = '/api/access/logs/'

    def test_unauthenticated_returns_401(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_socio_sees_only_own_logs(self):
        user = make_user_factory(email='socio1@access.test', rol='socio')
        other_user = make_user_factory(email='socio2@access.test', rol='socio')
        AccessLog.objects.create(user=user, access_type='ENTRY', status='GRANTED')
        AccessLog.objects.create(user=other_user, access_type='ENTRY', status='GRANTED')
        self.client.force_authenticate(user=user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['user'], user.id)

    def test_admin_sees_all_logs(self):
        user = make_user_factory(email='socio3@access.test', rol='socio')
        admin = make_user_factory(email='admin@access.test', rol='administrador')
        AccessLog.objects.create(user=user, access_type='ENTRY', status='GRANTED')
        self.client.force_authenticate(user=admin)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
