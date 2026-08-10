import time
from unittest.mock import patch
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.access.models import AccessLog
from apps.access.utils import (
    generate_dynamic_qr_token,
    verify_dynamic_qr_token,
    mark_qr_token_used
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

        is_valid, error_code, payload = verify_dynamic_qr_token(token_data['qr_token'])
        self.assertTrue(is_valid)
        self.assertIsNone(error_code)
        self.assertEqual(payload['user_id'], self.user.id)

    def test_verify_qr_token_tampered_fails(self):
        token_data = generate_dynamic_qr_token(self.user)
        tampered_token = token_data['qr_token'] + "extra_chars"
        is_valid, error_code, payload = verify_dynamic_qr_token(tampered_token)
        self.assertFalse(is_valid)
        self.assertEqual(error_code, 'INVALID_SIGNATURE')

    def test_verify_qr_token_replay_attack_fails(self):
        token_data = generate_dynamic_qr_token(self.user)
        jti = token_data['jti']

        # Primer uso -> OK
        is_valid, error_code, _ = verify_dynamic_qr_token(token_data['qr_token'])
        self.assertTrue(is_valid)

        # Simular consumo en cache
        mark_qr_token_used(jti)

        # Segundo uso -> REPLAY_ATTACK
        is_valid, error_code, _ = verify_dynamic_qr_token(token_data['qr_token'])
        self.assertFalse(is_valid)
        self.assertEqual(error_code, 'REPLAY_ATTACK')

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

        # Verificar que se llamó a auditoría MongoDB
        mock_log_qr_event.assert_called_once()
