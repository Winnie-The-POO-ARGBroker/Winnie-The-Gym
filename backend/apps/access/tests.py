from unittest.mock import patch
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.access.models import AccessLog
from apps.access.utils import (
    generate_dynamic_qr_token,
    verify_dynamic_qr_token,
    verify_and_consume_token
)

User = get_user_model()


class DynamicQRAndAccessTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='socio_test',
            email='socio@winniegym.com',
            password='Password123!'
        )
        self.staff_user = User.objects.create_user(
            username='recepcion_test',
            email='recepcion@winniegym.com',
            password='Password123!',
            is_staff=True
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

        # Primer uso atómico -> OK
        is_valid_use, error_code = verify_and_consume_token(jti)
        self.assertTrue(is_valid_use)
        self.assertIsNone(error_code)

        # Segundo uso atómico -> REPLAY_ATTACK
        is_valid_use, error_code = verify_and_consume_token(jti)
        self.assertFalse(is_valid_use)
        self.assertEqual(error_code, 'REPLAY_ATTACK')

    def test_verify_and_consume_token_empty_jti_fails(self):
        """[NUEVO]: Test que verifica que un jti nulo o vacío es rechazado con INVALID_TOKEN"""
        is_valid_use, error_code = verify_and_consume_token(None)
        self.assertFalse(is_valid_use)
        self.assertEqual(error_code, 'INVALID_TOKEN')

        is_valid_use, error_code = verify_and_consume_token("")
        self.assertFalse(is_valid_use)
        self.assertEqual(error_code, 'INVALID_TOKEN')

    def test_scan_expired_token_returns_denied(self):
        """[TEST-1]: Test de token expirado a nivel de endpoint"""
        # 1. Generar token con tiempo real
        token_data = generate_dynamic_qr_token(self.user)
        self.client.force_authenticate(user=self.staff_user)

        # 2. Parchear time.time sólo durante la verificación (scan)
        with patch('apps.access.utils.time.time', return_value=9999999999):
            response = self.client.post('/api/access/qr/scan/', {
                'qr_token': token_data['qr_token'],
                'access_type': 'ENTRY'
            })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['denial_reason'], 'TOKEN_EXPIRED')

        log = AccessLog.objects.last()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, 'DENIED')
        self.assertEqual(log.denial_reason, 'TOKEN_EXPIRED')

    def test_member_cannot_call_scan_endpoint(self):
        """[TEST-2 & BLOCKER-1]: Test de rechazo 403 cuando un socio intenta autorizarse su propia entrada"""
        token_data = generate_dynamic_qr_token(self.user)
        self.client.force_authenticate(user=self.user)  # Socio común (sin is_staff)
        
        response = self.client.post('/api/access/qr/scan/', {
            'qr_token': token_data['qr_token'],
            'access_type': 'ENTRY'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('apps.access.views.log_qr_event')
    def test_replay_attack_via_endpoint(self, mock_log):
        """[TEST-3]: Test de ataque de re-uso end-to-end sobre el endpoint"""
        token_data = generate_dynamic_qr_token(self.user)
        self.client.force_authenticate(user=self.staff_user)
        
        data = {'qr_token': token_data['qr_token'], 'access_type': 'ENTRY'}
        
        r1 = self.client.post('/api/access/qr/scan/', data)
        r2 = self.client.post('/api/access/qr/scan/', data)  # segundo escaneo del mismo token
        
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

    @patch('apps.access.views.log_qr_event')
    def test_generate_and_scan_qr_views(self, mock_log_qr_event):
        mock_log_qr_event.return_value = True

        # 1. Socio solicita QR
        self.client.force_authenticate(user=self.user)
        res_gen = self.client.get('/api/access/qr/generate/')
        self.assertEqual(res_gen.status_code, status.HTTP_200_OK)
        qr_token = res_gen.data['qr_token']

        # 2. Recepción escanea QR
        self.client.force_authenticate(user=self.staff_user)
        res_scan = self.client.post('/api/access/qr/scan/', {
            'qr_token': qr_token,
            'access_type': 'ENTRY'
        })
        self.assertEqual(res_scan.status_code, status.HTTP_200_OK)
        self.assertEqual(res_scan.data['status'], 'GRANTED')

        # Verificar persistencia en PostgreSQL
        log_db = AccessLog.objects.get(qr_jti=res_gen.data['jti'])
        self.assertEqual(log_db.user, self.user)
        self.assertEqual(log_db.status, 'GRANTED')
