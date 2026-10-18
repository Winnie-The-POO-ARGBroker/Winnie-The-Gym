"""The webhook URL sent to MercadoPago with every payment preference.

Without `notification_url` MercadoPago falls back to the URL configured in its
dashboard, which pointed at a dead ngrok tunnel, so approved payments never
reached the backend and memberships were not activated.
"""
from django.test import SimpleTestCase, override_settings

from apps.payments.services import _build_notification_url

WEBHOOK_PATH = '/api/payments/webhook/'


class BuildNotificationUrlTests(SimpleTestCase):
    @override_settings(BACKEND_PUBLIC_URL='https://api.example.test', MP_NGROK_URL='')
    def test_uses_the_public_backend_url(self):
        self.assertEqual(_build_notification_url(), f'https://api.example.test{WEBHOOK_PATH}')

    @override_settings(BACKEND_PUBLIC_URL='https://api.example.test/', MP_NGROK_URL='')
    def test_ignores_a_trailing_slash(self):
        self.assertEqual(_build_notification_url(), f'https://api.example.test{WEBHOOK_PATH}')

    @override_settings(BACKEND_PUBLIC_URL='https://api.example.test', MP_NGROK_URL='https://old.ngrok-free.dev')
    def test_public_backend_url_wins_over_a_stale_ngrok_tunnel(self):
        self.assertEqual(_build_notification_url(), f'https://api.example.test{WEBHOOK_PATH}')

    @override_settings(BACKEND_PUBLIC_URL='', MP_NGROK_URL='https://dev.ngrok-free.dev')
    def test_falls_back_to_ngrok_for_local_development(self):
        self.assertEqual(_build_notification_url(), f'https://dev.ngrok-free.dev{WEBHOOK_PATH}')

    @override_settings(BACKEND_PUBLIC_URL='', MP_NGROK_URL='')
    def test_returns_none_when_no_public_url_is_known(self):
        self.assertIsNone(_build_notification_url())


class BuildBackUrlsTests(SimpleTestCase):
    @override_settings(FRONTEND_URL='https://app.example.test/')
    def test_back_urls_land_on_the_payment_return_page(self):
        from apps.payments.services import _build_back_urls
        back_urls, is_public = _build_back_urls()
        for key in ('success', 'failure', 'pending'):
            self.assertEqual(back_urls[key], 'https://app.example.test/socio/pago-retorno')
        self.assertTrue(is_public)
