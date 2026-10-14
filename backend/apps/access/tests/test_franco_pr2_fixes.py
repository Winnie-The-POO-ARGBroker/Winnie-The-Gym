"""
Tests for Franco PR 2 backend fixes:
  - #152: AccessLogPagination (page_size param) + aforo/snapshot/ endpoint
"""
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.access.models import AccessLog
from conftest import make_socio_factory, make_user_factory


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _auth_client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


def _make_access_log(user, access_type=AccessLog.AccessType.ENTRY,
                     access_status=AccessLog.AccessStatus.GRANTED):
    return AccessLog.objects.create(
        user=user,
        access_type=access_type,
        status=access_status,
        source=AccessLog.AccessSource.DNI_SCAN,
    )


# ===========================================================================
# Fix #152 — AccessLog pagination + aforo snapshot
# ===========================================================================

class TestAccessLogPagination(TestCase):
    """
    Test #9: test_access_logs_page_size_param_respected
    """

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        make_socio_factory(usuario=self.admin)
        self.client = _auth_client(self.admin)

        # Create 10 access logs
        for _ in range(10):
            user = make_user_factory(rol='socio')
            _make_access_log(user)

    def test_access_logs_page_size_param_respected(self):
        """#152 — ?page_size=5 returns exactly 5 results."""
        response = self.client.get('/api/access/logs/?page_size=5')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertGreaterEqual(data['count'], 10)
        self.assertEqual(len(data['results']), 5)


class TestAforoSnapshotEndpoint(TestCase):
    """
    Test #10: test_aforo_snapshot_endpoint_returns_current_state
    """

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        make_socio_factory(usuario=self.admin)
        self.client = _auth_client(self.admin)

    def test_aforo_snapshot_endpoint_returns_current_state(self):
        """#152 — GET /api/access/aforo/snapshot/ returns correct shape and values."""
        # Create some access logs to have non-zero counts
        user = make_user_factory(rol='socio')
        _make_access_log(user, AccessLog.AccessType.ENTRY, AccessLog.AccessStatus.GRANTED)

        response = self.client.get('/api/access/aforo/snapshot/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Verify response shape
        self.assertIn('aforo_actual', data)
        self.assertIn('aforo_maximo', data)
        self.assertIn('ingresos_hoy', data)
        self.assertIn('egresos_hoy', data)
        self.assertIn('timestamp', data)

        # Verify types and basic constraints
        self.assertIsInstance(data['aforo_actual'], int)
        self.assertIsInstance(data['aforo_maximo'], int)
        self.assertIsInstance(data['ingresos_hoy'], int)
        self.assertIsInstance(data['egresos_hoy'], int)
        self.assertGreaterEqual(data['aforo_maximo'], 0)
        self.assertGreaterEqual(data['aforo_actual'], 0)
        self.assertGreaterEqual(data['ingresos_hoy'], 1)  # we added one ENTRY

    def test_aforo_snapshot_403_for_socio(self):
        """#152 — Socios cannot access aforo snapshot."""
        socio_user = make_user_factory(rol='socio')
        make_socio_factory(usuario=socio_user)
        socio_client = _auth_client(socio_user)

        response = socio_client.get('/api/access/aforo/snapshot/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
