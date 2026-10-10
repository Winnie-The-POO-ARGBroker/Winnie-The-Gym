"""Locust load test scenarios for RNF01 (<2s QR) and RNF06 (99.9% availability).

Run with:
    docker compose exec backend locust -f loadtests/locustfile.py --host http://localhost:8000

See loadtests/README.md for seed and execution details.
"""
import logging
import os
import random

from locust import HttpUser, between, task


logger = logging.getLogger('loadtest')

# Configuración de usuarios sintéticos alineada con seed_load_test_users
LOAD_TEST_COUNT = int(os.environ.get('LOAD_TEST_USERS_COUNT', '100'))
LOAD_TEST_PREFIX = os.environ.get('LOAD_TEST_PREFIX', 'loadtest_')
LOAD_TEST_DOMAIN = os.environ.get('LOAD_TEST_DOMAIN', 'loadtest.local')
LOAD_TEST_PASSWORD = os.environ.get('LOAD_TEST_PASSWORD', 'LoadTest123!')

# Proporciones consistentes: 2% admin, 8% recep, 90% socio
ADMIN_COUNT = int(round(LOAD_TEST_COUNT * 0.02))
RECEP_COUNT = int(round(LOAD_TEST_COUNT * 0.08))
if LOAD_TEST_COUNT >= 50 and ADMIN_COUNT == 0:
    ADMIN_COUNT = 1
if LOAD_TEST_COUNT >= 12 and RECEP_COUNT == 0:
    RECEP_COUNT = 1
SOCIO_COUNT = LOAD_TEST_COUNT - ADMIN_COUNT - RECEP_COUNT

ADMIN_RANGE = (0, max(0, ADMIN_COUNT - 1))
RECEP_RANGE = (ADMIN_COUNT, max(ADMIN_COUNT, ADMIN_COUNT + RECEP_COUNT - 1))
SOCIO_RANGE = (ADMIN_COUNT + RECEP_COUNT, max(ADMIN_COUNT + RECEP_COUNT, LOAD_TEST_COUNT - 1))


def _get_random_socio_email():
    idx = random.randint(SOCIO_RANGE[0], SOCIO_RANGE[1])
    return f'{LOAD_TEST_PREFIX}{idx:05d}@{LOAD_TEST_DOMAIN}'


def _get_random_recep_email():
    idx = random.randint(RECEP_RANGE[0], RECEP_RANGE[1])
    return f'{LOAD_TEST_PREFIX}{idx:05d}@{LOAD_TEST_DOMAIN}'


def _get_random_admin_email():
    idx = random.randint(ADMIN_RANGE[0], ADMIN_RANGE[1])
    return f'{LOAD_TEST_PREFIX}{idx:05d}@{LOAD_TEST_DOMAIN}'



def _login(client, email, password):
    """POST /api/auth/login/ and return the JWT access token, or None on failure."""
    try:
        r = client.post(
            '/api/auth/login/',
            json={'email': email, 'password': password},
            name='POST /api/auth/login/',
        )
        if r.status_code != 200:
            logger.warning('Login failed for %s: %s', email, r.status_code)
            return None
        return r.json().get('access')
    except Exception as exc:
        logger.error('Login exception for %s: %s', email, exc)
        return None


class SocioUser(HttpUser):
    """Simulates a socio browsing the app and refreshing their QR credential."""
    weight = 3
    wait_time = between(1, 4)

    def on_start(self):
        self.token = _login(self.client, 'socio1@load.test', 'loadpass!')
        self.headers = {'Authorization': f'Bearer {self.token}'} if self.token else {}

    @task(3)
    def generate_qr(self):
        self.client.get(
            '/api/access/qr/generate/',
            headers=self.headers,
            name='GET /api/access/qr/generate/',
        )

    @task(1)
    def get_membership(self):
        self.client.get(
            '/api/memberships/me/',
            headers=self.headers,
            name='GET /api/memberships/me/',
        )

    @task(1)
    def get_classes(self):
        self.client.get(
            '/api/classes/clases/',
            headers=self.headers,
            name='GET /api/classes/clases/',
        )


class RecepcionistaUser(HttpUser):
    """Simulates the QR scan terminal at the front desk."""
    weight = 1
    wait_time = between(2, 5)

    def on_start(self):
        self.token = _login(self.client, 'recep1@load.test', 'loadpass!')
        self.headers = {'Authorization': f'Bearer {self.token}'} if self.token else {}

    @task(4)
    def scan_qr(self):
        # RNF01 target: this endpoint must respond in under 2s at p95.
        fake_token = f'test-token-{random.randint(1, 999999)}'
        self.client.post(
            '/api/access/qr/scan/',
            json={'qr_token': fake_token, 'access_type': 'ENTRY'},
            headers=self.headers,
            name='POST /api/access/qr/scan/',
        )

    @task(1)
    def list_access_logs(self):
        self.client.get(
            '/api/access/logs/',
            headers=self.headers,
            name='GET /api/access/logs/',
        )


class AdminUser(HttpUser):
    """Simulates an administrator generating reports."""
    weight = 1
    wait_time = between(5, 10)

    def on_start(self):
        self.token = _login(self.client, 'admin1@load.test', 'loadpass!')
        self.headers = {'Authorization': f'Bearer {self.token}'} if self.token else {}

    @task(2)
    def get_morosidad(self):
        self.client.get(
            '/api/reportes/morosidad/?formato=csv',
            headers=self.headers,
            name='GET /api/reportes/morosidad/',
        )

    @task(1)
    def health(self):
        self.client.get('/api/health/', name='GET /api/health/')
