from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.members.models import Socio

User = get_user_model()

COMPLETE_PROFILE_URL = reverse('users:complete-profile')
PROFILE_URL = reverse('users:profile')
LOGIN_URL = '/api/auth/login/'


def _auth_client(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def _make_user(email='test@example.com', **kwargs):
    return User.objects.create_user(email=email, password='pass', username=email, **kwargs)


def _make_socio(user, dni='12345678'):
    return Socio.objects.create(
        usuario=user,
        dni=dni,
        nombre='Jane',
        apellido='Doe',
        telefono='5491100000000',
    )


class CompleteProfileViewTests(APITestCase):

    def test_unauthenticated_returns_401(self):
        response = self.client.post(COMPLETE_PROFILE_URL, {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_already_complete_returns_400(self):
        user = _make_user()
        _make_socio(user)
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
        user = _make_user()
        _auth_client(self.client, user)

        response = self.client.post(COMPLETE_PROFILE_URL, {})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('dni', response.data)
        self.assertIn('nombre', response.data)
        self.assertIn('apellido', response.data)
        self.assertIn('telefono', response.data)

    def test_duplicate_dni_returns_400(self):
        existing_user = _make_user(email='other@example.com')
        _make_socio(existing_user, dni='11111111')

        user = _make_user()
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
        user = _make_user()
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
        user = _make_user()
        _auth_client(self.client, user)

        response = self.client.get(PROFILE_URL)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_with_socio_returns_200_with_correct_fields(self):
        user = _make_user()
        _make_socio(user, dni='12345678')
        _auth_client(self.client, user)

        response = self.client.get(PROFILE_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['dni'], '12345678')
        self.assertEqual(response.data['nombre'], 'Jane')
        self.assertEqual(response.data['apellido'], 'Doe')
        self.assertEqual(response.data['email'], user.email)

    def test_patch_updates_allowed_fields(self):
        user = _make_user()
        _make_socio(user)
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
        user = _make_user()
        _make_socio(user, dni='12345678')
        _auth_client(self.client, user)

        response = self.client.patch(PROFILE_URL, {'dni': '99999999'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['dni'], '12345678')


class CustomJWTSerializerTests(APITestCase):
    """Verify that CustomJWTSerializer.get_user returns the expected fields."""

    def test_jwt_login_response_contains_base_fields(self):
        user = _make_user(email='jwt_base@test.com')
        response = self.client.post(LOGIN_URL, {
            'email': 'jwt_base@test.com',
            'password': 'pass',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_data = response.data.get('user')
        self.assertIsNotNone(user_data, "Response should contain 'user' key")
        for field in ('id', 'email', 'rol', 'is_profile_complete'):
            self.assertIn(field, user_data, f"user dict should contain '{field}'")
        self.assertNotIn('nombre', user_data, "nombre should not appear when profile is incomplete")
        self.assertNotIn('apellido', user_data, "apellido should not appear when profile is incomplete")

    def test_jwt_login_response_includes_nombre_apellido_when_profile_complete(self):
        user = _make_user(email='jwt_complete@test.com')
        _make_socio(user, dni='44332211')
        response = self.client.post(LOGIN_URL, {
            'email': 'jwt_complete@test.com',
            'password': 'pass',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_data = response.data.get('user')
        self.assertIsNotNone(user_data)
        self.assertTrue(user_data.get('is_profile_complete'))
        self.assertIn('nombre', user_data)
        self.assertIn('apellido', user_data)
