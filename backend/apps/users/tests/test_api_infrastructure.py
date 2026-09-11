from datetime import timedelta

from django.conf import settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from conftest import make_user_factory


class OpenAPIEndpointsTests(APITestCase):
    """Verifies drf-spectacular exposes the schema and Swagger UI."""

    def test_schema_endpoint_returns_openapi(self):
        response = self.client.get('/api/schema/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        content_type = response.get('Content-Type', '')
        self.assertTrue('yaml' in content_type or 'json' in content_type or 'vnd.oai.openapi' in content_type)

    def test_swagger_ui_endpoint_renders(self):
        response = self.client.get('/api/docs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class SessionTimeoutSettingsTests(APITestCase):
    """RNF05 — access token lifetime must be 30 minutes."""

    def test_access_token_lifetime_is_30_minutes(self):
        self.assertEqual(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'], timedelta(minutes=30))

    def test_access_token_carries_thirty_minute_ttl(self):
        user = make_user_factory(email='session@test.com', rol='administrador')
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        lifetime_seconds = access.payload['exp'] - access.payload['iat']
        self.assertEqual(lifetime_seconds, 30 * 60)


class GlobalPaginationTests(APITestCase):
    """DRF global pagination must be enabled and cap at 10 by default."""

    def test_planes_listing_uses_pagination_envelope(self):
        admin = make_user_factory(email='pagination@test.com', rol='administrador')
        token = RefreshToken.for_user(admin).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        response = self.client.get('/api/memberships/planes/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ('count', 'next', 'previous', 'results'):
            self.assertIn(key, response.data)
