from unittest.mock import patch, MagicMock

from django.conf import settings
from django.test import Client, TestCase, override_settings


class AllowedHostsAndCsrfTests(TestCase):
    """Guarantees the ngrok tunnel host is accepted by Django and Celery/CSRF."""

    def test_allowed_hosts_covers_ngrok_wildcards(self):
        for suffix in ('.ngrok-free.dev', '.ngrok-free.app', '.ngrok.io'):
            self.assertIn(suffix, settings.ALLOWED_HOSTS)

    def test_csrf_trusted_origins_covers_ngrok_wildcards(self):
        origins = settings.CSRF_TRUSTED_ORIGINS
        for pattern in (
            'https://*.ngrok-free.dev',
            'https://*.ngrok-free.app',
            'https://*.ngrok.io',
        ):
            self.assertIn(pattern, origins)

    def test_webhook_accepts_ngrok_host_header(self):
        # MP posts JSON without CSRF; Django would raise DisallowedHost if the
        # wildcard were missing. Success is defined as reaching the view — the
        # body returned by the view is irrelevant for this test.
        client = Client()
        response = client.post(
            '/api/payments/webhook/',
            data='{}',
            content_type='application/json',
            HTTP_HOST='courteously-proprietorial-dwayne.ngrok-free.dev',
        )
        # 400 with our JSON envelope is fine (view rejected missing data.id).
        # What we forbid here is Django's own DisallowedHost 400/500 HTML page.
        content = response.content.decode('utf-8', errors='ignore')
        self.assertNotIn('DisallowedHost', content)
        self.assertNotIn('Invalid HTTP_HOST', content)


class HealthCheckTests(TestCase):

    def test_health_includes_all_dependencies(self):
        response = self.client.get('/api/health/')
        body = response.json()
        self.assertIn('checks', body)
        self.assertIn('postgres', body['checks'])
        self.assertIn('redis', body['checks'])
        self.assertIn('mongo', body['checks'])
        # Postgres and redis must always succeed inside the test container.
        self.assertTrue(body['checks']['postgres']['ok'])

    def test_health_incluye_celery(self):
        """Verifica que la respuesta de /api/health/ contiene la clave 'celery'
        dentro de 'checks' con el campo 'ok' (booleano)."""
        response = self.client.get('/api/health/')
        body = response.json()
        self.assertIn('celery', body['checks'])
        self.assertIn('ok', body['checks']['celery'])
        self.assertIsInstance(body['checks']['celery']['ok'], bool)

    @patch('core.urls._check_celery')
    def test_health_celery_worker_activo(self, mock_check):
        """Simula que el worker Celery responde al ping correctamente.
        El chequeo debe devolver ok=True y el status general no debe
        ser 'unhealthy'."""
        mock_check.return_value = (True, None)
        response = self.client.get('/api/health/')
        body = response.json()
        self.assertTrue(body['checks']['celery']['ok'])
        self.assertIn(body['status'], ('ok', 'degraded'))

    @patch('core.urls._check_celery')
    def test_health_celery_worker_caido(self, mock_check):
        """Simula que el worker Celery no responde (caído o timeout).
        El chequeo debe devolver ok=False. Como Celery es no-crítico,
        el endpoint debe seguir devolviendo HTTP 200 (degraded),
        nunca 503."""
        mock_check.return_value = (False, 'No workers responded within 0.5s')
        response = self.client.get('/api/health/')
        body = response.json()
        self.assertFalse(body['checks']['celery']['ok'])
        # Celery no es crítico → HTTP 200, nunca 503
        self.assertEqual(response.status_code, 200)
        self.assertIn(body['status'], ('degraded',))

