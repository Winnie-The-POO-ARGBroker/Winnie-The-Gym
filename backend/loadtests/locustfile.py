"""Locust load test scenarios for RNF01 (<2s QR) and RNF06 (99.9% availability).

Run with:
    docker compose exec backend locust -f loadtests/locustfile.py --host http://localhost:8000

See loadtests/README.md for seed and execution details.
"""
import logging
import random

from locust import HttpUser, between, task


logger = logging.getLogger('loadtest')


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
