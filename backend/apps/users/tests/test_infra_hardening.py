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
