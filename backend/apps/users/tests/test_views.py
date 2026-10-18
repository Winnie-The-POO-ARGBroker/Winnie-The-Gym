from unittest.mock import MagicMock, patch

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
        """A socio-role user without a Socio record returns 404 (no staff bypass)."""
        user = make_user_factory(rol='socio')
        _auth_client(self.client, user)

        response = self.client.get(PROFILE_URL)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_with_socio_returns_200_with_correct_fields(self):
        user = make_user_factory(rol='socio')
        make_socio_factory(usuario=user, dni='12345678', nombre='Jane', apellido='Doe')
        _auth_client(self.client, user)

        response = self.client.get(PROFILE_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['dni'], '12345678')
        self.assertEqual(response.data['nombre'], 'Jane')
        self.assertEqual(response.data['apellido'], 'Doe')
        self.assertEqual(response.data['email'], user.email)

    def test_patch_updates_allowed_fields(self):
        user = make_user_factory(rol='socio')
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
        user = make_user_factory(rol='socio')
        make_socio_factory(usuario=user, dni='12345678')
        _auth_client(self.client, user)

        response = self.client.patch(PROFILE_URL, {'dni': '99999999'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['dni'], '12345678')

    # --- Fix #160: staff profile tests ---

    def test_profile_get_admin_returns_200_with_staff_shape(self):
        """Admin user gets 200 with staff shape including is_staff_profile=True."""
        user = make_user_factory(rol='administrador', first_name='Carlos', last_name='Admin')
        _auth_client(self.client, user)

        response = self.client.get(PROFILE_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], user.email)
        self.assertEqual(response.data['rol'], 'administrador')
        self.assertEqual(response.data['first_name'], 'Carlos')
        self.assertEqual(response.data['last_name'], 'Admin')
        self.assertTrue(response.data['is_staff_profile'])

    def test_profile_get_recepcionista_returns_200_with_staff_shape(self):
        """Recepcionista user gets 200 with staff shape including is_staff_profile=True."""
        user = make_user_factory(rol='recepcionista', first_name='Maria', last_name='Recep')
        _auth_client(self.client, user)

        response = self.client.get(PROFILE_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], user.email)
        self.assertEqual(response.data['rol'], 'recepcionista')
        self.assertTrue(response.data['is_staff_profile'])

    def test_profile_patch_admin_updates_first_name(self):
        """Admin can PATCH first_name and last_name via staff profile endpoint."""
        user = make_user_factory(rol='administrador', first_name='Old', last_name='Name')
        _auth_client(self.client, user)

        response = self.client.patch(PROFILE_URL, {
            'first_name': 'New',
            'last_name': 'Updated',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'New')
        self.assertEqual(response.data['last_name'], 'Updated')
        self.assertTrue(response.data['is_staff_profile'])

    def test_profile_get_socio_still_returns_socio_shape(self):
        """Regression: socio users still get socio-shape response (no is_staff_profile)."""
        user = make_user_factory(rol='socio')
        make_socio_factory(usuario=user, dni='55443322', nombre='Socio', apellido='Test')
        _auth_client(self.client, user)

        response = self.client.get(PROFILE_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['dni'], '55443322')
        self.assertNotIn('is_staff_profile', response.data)

    # --- Fix #162: has_usable_password ---

    def test_staff_list_includes_has_usable_password(self):
        """GET /api/users/staff/ includes has_usable_password for each staff member."""
        admin = make_user_factory(rol='administrador', password='pass1234!')
        _auth_client(self.client, admin)

        staff_url = '/api/users/staff/'
        response = self.client.get(staff_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        if isinstance(data, dict):
            data = data.get('results', data)
        self.assertGreater(len(data), 0)
        self.assertIn('has_usable_password', data[0])
        # admin created with password='pass1234!' should have usable password
        admin_entry = next((d for d in data if d['email'] == admin.email), None)
        self.assertIsNotNone(admin_entry)
        self.assertTrue(admin_entry['has_usable_password'])

    def test_staff_list_flags_users_who_sign_in_with_google(self):
        """A Google user has no password but is not pending activation."""
        from allauth.socialaccount.models import SocialAccount

        admin = make_user_factory(rol='administrador', password='pass1234!')
        google = make_user_factory(rol='administrador', email='google.admin@test.com')
        google.set_unusable_password()
        google.save()
        SocialAccount.objects.create(user=google, provider='google', uid='g-123')
        _auth_client(self.client, admin)

        response = self.client.get('/api/users/staff/')

        data = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        by_email = {d['email']: d for d in data}
        self.assertTrue(by_email[google.email]['has_social_login'])
        self.assertFalse(by_email[admin.email]['has_social_login'])


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



class TokenBlacklistMigrationSanityTests(APITestCase):
    """Sanity check: verify that token_blacklist tables were migrated.

    If migrations were not applied (e.g. a deploy skipped RUN_MIGRATIONS=1),
    any query against these models raises django.db.OperationalError.
    This test catches that failure early — before a real logout attempt would.
    """

    def test_token_blacklist_tables_migrated(self):
        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken,
            OutstandingToken,
        )

        # If migrations did not run, these will raise OperationalError.
        blacklisted_count = BlacklistedToken.objects.count()
        outstanding_count = OutstandingToken.objects.count()

        self.assertGreaterEqual(blacklisted_count, 0)
        self.assertGreaterEqual(outstanding_count, 0)
