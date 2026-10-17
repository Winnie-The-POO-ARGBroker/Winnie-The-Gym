"""Public sign-up through POST /api/auth/registration/.

After the dj-rest-auth 7.2 / django-allauth 65 upgrade the endpoint answered
400 {"username": ["Este campo es requerido."]} to every request, because the
stock serializer kept `username` required while the frontend (and the project)
only use the email. Nobody could register in production.
"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

REGISTRATION_URL = '/api/auth/registration/'
STRONG_PASSWORD = 'Gimnasio-2026-Segura'


class RegistrationTests(APITestCase):
    def _register(self, **overrides):
        payload = {
            'email': 'nuevo.socio@example.test',
            'password1': STRONG_PASSWORD,
            'password2': STRONG_PASSWORD,
            **overrides,
        }
        return self.client.post(REGISTRATION_URL, payload, format='json')

    def test_registers_with_only_email_and_password(self):
        response = self._register()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.json())
        body = response.json()
        self.assertIn('access', body)
        self.assertIn('refresh', body)
        self.assertEqual(body['user']['email'], 'nuevo.socio@example.test')

    def test_the_new_user_gets_a_username_and_the_socio_role(self):
        self._register()

        user = get_user_model().objects.get(email='nuevo.socio@example.test')
        self.assertTrue(user.username)
        self.assertEqual(user.rol, 'socio')

    def test_an_explicit_username_is_still_accepted(self):
        response = self._register(username='socio_nuevo')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.json())

    def test_rejects_an_email_that_already_exists(self):
        self._register()

        response = self._register()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.json())
        self.assertNotIn('username', response.json())

    def test_rejects_passwords_that_do_not_match(self):
        response = self._register(password2='Otra-Clave-2026-Distinta')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn('username', response.json())

    def test_rejects_a_weak_password(self):
        response = self._register(password1='12345678', password2='12345678')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password1', response.json())
