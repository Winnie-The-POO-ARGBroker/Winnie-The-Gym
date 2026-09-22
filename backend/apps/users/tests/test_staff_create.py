"""Tests for staff management endpoints.

Covers:
  - POST /api/users/staff/  (StaffCreateView)
  - GET  /api/users/staff/  (StaffListView)
  - POST /api/users/staff/{id}/resend-activation/

REQ-1.2
"""
from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User
from conftest import make_user_factory

STAFF_LIST_CREATE_URL = '/api/users/staff/'


def _staff_resend_url(pk):
    return f'/api/users/staff/{pk}/resend-activation/'


def _auth_client(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


class StaffCreateAdminTests(APITestCase):
    """POST /api/users/staff/ — admin authenticated."""

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        _auth_client(self.client, self.admin)

    @patch('apps.users.views.send_activation_email')
    def test_admin_creates_recepcionista_201(self, mock_email):
        """Admin can create a recepcionista; gets 201 with id/email/rol."""
        payload = {
            'email': 'newrecep@gym.test',
            'rol': 'recepcionista',
            'first_name': 'Ana',
            'last_name': 'García',
        }
        response = self.client.post(STAFF_LIST_CREATE_URL, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['email'], 'newrecep@gym.test')
        self.assertEqual(response.data['rol'], 'recepcionista')
        self.assertIn('id', response.data)

    @patch('apps.users.views.send_activation_email')
    def test_create_staff_triggers_activation_email(self, mock_email):
        """Creating a staff user dispatches the activation email."""
        payload = {
            'email': 'activationemail@gym.test',
            'rol': 'recepcionista',
            'first_name': 'Test',
            'last_name': 'User',
        }
        response = self.client.post(STAFF_LIST_CREATE_URL, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_email.assert_called_once()
        called_user = mock_email.call_args[0][0]
        self.assertEqual(called_user.email, 'activationemail@gym.test')

    @patch('apps.users.views.send_activation_email')
    def test_create_sets_unusable_password(self, mock_email):
        """The new staff user is created with an unusable password."""
        payload = {
            'email': 'unusable@gym.test',
            'rol': 'recepcionista',
            'first_name': 'Pass',
            'last_name': 'Less',
        }
        self.client.post(STAFF_LIST_CREATE_URL, payload, format='json')

        user = User.objects.get(email='unusable@gym.test')
        self.assertFalse(user.has_usable_password())

    @patch('apps.users.views.send_activation_email')
    def test_duplicate_email_returns_400(self, mock_email):
        """Creating a staff with a duplicate email returns 400 with email error."""
        existing = make_user_factory(email='existing@gym.test', rol='recepcionista')

        payload = {
            'email': 'existing@gym.test',
            'rol': 'recepcionista',
            'first_name': 'Dup',
            'last_name': 'Email',
        }
        response = self.client.post(STAFF_LIST_CREATE_URL, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    @patch('apps.users.views.send_activation_email')
    def test_invalid_rol_returns_400(self, mock_email):
        """Creating a staff with rol=socio returns 400."""
        payload = {
            'email': 'invalid@gym.test',
            'rol': 'socio',
            'first_name': 'Bad',
            'last_name': 'Role',
        }
        response = self.client.post(STAFF_LIST_CREATE_URL, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('rol', response.data)


class StaffCreatePermissionTests(APITestCase):
    """POST /api/users/staff/ — permission enforcement."""

    @patch('apps.users.views.send_activation_email')
    def test_recepcionista_cannot_create_staff(self, mock_email):
        """Recepcionista receives 403 when attempting to create staff."""
        recep = make_user_factory(rol='recepcionista')
        _auth_client(self.client, recep)

        payload = {
            'email': 'noallowed@gym.test',
            'rol': 'recepcionista',
            'first_name': 'X',
            'last_name': 'Y',
        }
        response = self.client.post(STAFF_LIST_CREATE_URL, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('apps.users.views.send_activation_email')
    def test_socio_cannot_create_staff(self, mock_email):
        """Socio receives 403 when attempting to create staff."""
        socio_user = make_user_factory(rol='socio')
        _auth_client(self.client, socio_user)

        payload = {
            'email': 'noallowed2@gym.test',
            'rol': 'recepcionista',
            'first_name': 'X',
            'last_name': 'Y',
        }
        response = self.client.post(STAFF_LIST_CREATE_URL, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_create_staff(self):
        """Unauthenticated request receives 401."""
        response = self.client.post(STAFF_LIST_CREATE_URL, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class StaffListTests(APITestCase):
    """GET /api/users/staff/"""

    def test_admin_can_list_staff(self):
        """Admin can list all staff users (admin + recepcionista)."""
        admin = make_user_factory(rol='administrador')
        recep = make_user_factory(rol='recepcionista')
        # Socio should NOT appear in the list
        make_user_factory(rol='socio')

        _auth_client(self.client, admin)
        response = self.client.get(STAFF_LIST_CREATE_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Handle both paginated and non-paginated responses
        data = response.data
        if isinstance(data, dict) and 'results' in data:
            data = data['results']
        emails = [u['email'] for u in data]
        self.assertIn(admin.email, emails)
        self.assertIn(recep.email, emails)

    def test_recepcionista_cannot_list_staff(self):
        """Recepcionista receives 403 for GET /api/users/staff/."""
        recep = make_user_factory(rol='recepcionista')
        _auth_client(self.client, recep)

        response = self.client.get(STAFF_LIST_CREATE_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class StaffResendActivationTests(APITestCase):
    """POST /api/users/staff/{id}/resend-activation/"""

    @patch('apps.users.views.send_activation_email')
    def test_admin_can_resend_activation(self, mock_email):
        """Admin can trigger resend of activation email for a staff user."""
        admin = make_user_factory(rol='administrador')
        target = make_user_factory(rol='recepcionista')
        _auth_client(self.client, admin)

        response = self.client.post(_staff_resend_url(target.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_email.assert_called_once()

    def test_resend_activation_for_socio_returns_404(self):
        """Resend activation for a socio user returns 404 (endpoint is staff-only)."""
        admin = make_user_factory(rol='administrador')
        socio_user = make_user_factory(rol='socio')
        _auth_client(self.client, admin)

        response = self.client.post(_staff_resend_url(socio_user.pk))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
