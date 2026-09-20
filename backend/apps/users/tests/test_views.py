from unittest.mock import MagicMock, patch

from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.members.models import Socio
from conftest import make_socio_factory, make_user_factory

COMPLETE_PROFILE_URL = reverse('users:complete-profile')
PROFILE_URL = reverse('users:profile')
GOOGLE_LOGIN_URL = reverse('users:google-login')
LOGIN_URL = '/api/auth/login/'


def _auth_client(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


class GoogleLoginViewTests(APITestCase):
    """Tests for GoogleLoginView.

    The Google OAuth adapter makes real network calls to exchange the
    authorization code for user info.  We therefore test:
      - Input validation (no token, empty token) — fails before any adapter call
      - Endpoint existence + method routing (GET must return 405)

    Full happy-path tests belong in integration/e2e suites that can provide
    a real or sandboxed Google token.
    """

    def test_missing_token_returns_400(self):
        """No access_token field at all — serializer validation rejects it."""
        response = self.client.post(GOOGLE_LOGIN_URL, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_token_returns_400(self):
        """Empty string access_token — serializer validation rejects it."""
        response = self.client.post(GOOGLE_LOGIN_URL, {'access_token': ''}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_method_not_allowed(self):
        """GoogleLoginView is POST-only; GET must return 405."""
        response = self.client.get(GOOGLE_LOGIN_URL)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_url_is_registered(self):
        """The google-login URL must resolve to the expected view."""
        from django.urls import resolve
        match = resolve(GOOGLE_LOGIN_URL)
        self.assertEqual(match.view_name, 'users:google-login')


class CompleteProfileViewTests(APITestCase):

    def test_unauthenticated_returns_401(self):
        response = self.client.post(COMPLETE_PROFILE_URL, {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_returns_403(self):
        user = make_user_factory(rol='administrador')
        _auth_client(self.client, user)
        response = self.client.post(COMPLETE_PROFILE_URL, {
            'dni': '99999901',
            'nombre': 'Admin',
            'apellido': 'Test',
            'telefono': '123',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)

    def test_recepcionista_returns_403(self):
        user = make_user_factory(rol='recepcionista')
        _auth_client(self.client, user)
        response = self.client.post(COMPLETE_PROFILE_URL, {
            'dni': '99999902',
            'nombre': 'Recep',
            'apellido': 'Test',
            'telefono': '123',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)

    def test_already_complete_returns_400(self):
        user = make_user_factory(rol='socio')
        make_socio_factory(usuario=user)
        _auth_client(self.client, user)

        response = self.client.post(COMPLETE_PROFILE_URL, {
            'dni': '99999999',
            'nombre': 'Another',
            'apellido': 'Name',
            'telefono': '123',
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)

    def test_missing_required_fields_returns_400(self):
        user = make_user_factory(rol='socio')
        _auth_client(self.client, user)

        response = self.client.post(COMPLETE_PROFILE_URL, {})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('dni', response.data)
        self.assertIn('nombre', response.data)
        self.assertIn('apellido', response.data)
        self.assertIn('telefono', response.data)

    def test_duplicate_dni_returns_400(self):
        existing_user = make_user_factory(email='other@example.com', rol='socio')
        make_socio_factory(usuario=existing_user, dni='11111111')

        user = make_user_factory(rol='socio')
        _auth_client(self.client, user)

        response = self.client.post(COMPLETE_PROFILE_URL, {
            'dni': '11111111',
            'nombre': 'Jane',
            'apellido': 'Doe',
            'telefono': '5491100000000',
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('dni', response.data)

    def test_valid_request_creates_socio_and_returns_201(self):
        user = make_user_factory(rol='socio')
        _auth_client(self.client, user)

        response = self.client.post(COMPLETE_PROFILE_URL, {
            'dni': '87654321',
            'nombre': 'Jane',
            'apellido': 'Doe',
            'telefono': '5491100000000',
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Socio.objects.filter(usuario=user, dni='87654321').exists())


class ProfileViewTests(APITestCase):

    def test_unauthenticated_get_returns_401(self):
        response = self.client.get(PROFILE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_without_socio_returns_404(self):
        user = make_user_factory()
        _auth_client(self.client, user)

        response = self.client.get(PROFILE_URL)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_with_socio_returns_200_with_correct_fields(self):
        user = make_user_factory()
        make_socio_factory(usuario=user, dni='12345678', nombre='Jane', apellido='Doe')
        _auth_client(self.client, user)

        response = self.client.get(PROFILE_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['dni'], '12345678')
        self.assertEqual(response.data['nombre'], 'Jane')
        self.assertEqual(response.data['apellido'], 'Doe')
        self.assertEqual(response.data['email'], user.email)

    def test_patch_updates_allowed_fields(self):
        user = make_user_factory()
        make_socio_factory(usuario=user)
        _auth_client(self.client, user)

        response = self.client.patch(PROFILE_URL, {
            'nombre': 'Updated',
            'apellido': 'Name',
            'telefono': '5490000000001',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nombre'], 'Updated')
        self.assertEqual(response.data['apellido'], 'Name')
        self.assertEqual(response.data['telefono'], '5490000000001')

    def test_patch_ignores_dni_change(self):
        user = make_user_factory()
        make_socio_factory(usuario=user, dni='12345678')
        _auth_client(self.client, user)

        response = self.client.patch(PROFILE_URL, {'dni': '99999999'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['dni'], '12345678')


class CustomJWTSerializerTests(APITestCase):
    """Verify that CustomJWTSerializer.get_user returns the expected fields."""

    def test_jwt_login_response_contains_base_fields(self):
        make_user_factory(email='jwt_base@test.com', password='pass1234!')
        response = self.client.post(LOGIN_URL, {
            'email': 'jwt_base@test.com',
            'password': 'pass1234!',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_data = response.data.get('user')
        self.assertIsNotNone(user_data, "Response should contain 'user' key")
        for field in ('id', 'email', 'rol', 'is_profile_complete'):
            self.assertIn(field, user_data, f"user dict should contain '{field}'")
        self.assertNotIn('nombre', user_data, "nombre should not appear when profile is incomplete")
        self.assertNotIn('apellido', user_data, "apellido should not appear when profile is incomplete")

    def test_jwt_login_response_includes_nombre_apellido_when_profile_complete(self):
        user = make_user_factory(email='jwt_complete@test.com', password='pass1234!')
        make_socio_factory(usuario=user, dni='44332211')
        response = self.client.post(LOGIN_URL, {
            'email': 'jwt_complete@test.com',
            'password': 'pass1234!',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_data = response.data.get('user')
        self.assertIsNotNone(user_data)
        self.assertTrue(user_data.get('is_profile_complete'))
        self.assertIn('nombre', user_data)
        self.assertIn('apellido', user_data)


@override_settings(DEBUG=True)
class DevLoginTests(APITestCase):
    DEV_LOGIN_URL = '/api/auth/dev-login/'

    def test_dev_login_admin_generates_valid_jwt(self):
        response = self.client.post(self.DEV_LOGIN_URL, {'rol': 'administrador'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['rol'], 'administrador')
        self.assertEqual(response.data['user']['email'], 'admin@winniegym.com')

    def test_dev_login_recepcionista_generates_valid_jwt(self):
        response = self.client.post(self.DEV_LOGIN_URL, {'rol': 'recepcionista'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['rol'], 'recepcionista')
        self.assertEqual(response.data['user']['email'], 'recepcionista@winniegym.com')

    def test_dev_login_invalid_rol_returns_400(self):
        response = self.client.post(self.DEV_LOGIN_URL, {'rol': 'superhacker'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn('access', response.data)

    def test_dev_login_promotes_existing_admin_flags(self):
        from apps.users.models import User
        user, _ = User.objects.get_or_create(
            email='admin@winniegym.com',
            defaults={'rol': 'administrador', 'username': 'admin@winniegym.com', 'is_superuser': False},
        )
        user.is_superuser = False
        user.save()

        response = self.client.post(self.DEV_LOGIN_URL, {'rol': 'administrador'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)

    @override_settings(DEBUG=False)
    def test_dev_login_returns_403_in_production(self):
        response = self.client.post(self.DEV_LOGIN_URL, {'rol': 'administrador'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn('access', response.data)
