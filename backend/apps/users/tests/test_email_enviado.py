"""Activation email delivery is reported honestly to the UI.

`send_activation_email` stays non-fatal but returns whether the mail was handed
to the backend, and the endpoints that trigger it expose that as `email_enviado`.
"""
from unittest.mock import patch

from django.core import mail
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.members.services import dispatch_activation_email_for_socio
from apps.users.services import send_activation_email
from conftest import make_socio_factory, make_user_factory

STAFF_URL = '/api/users/staff/'
LOCMEM = 'django.core.mail.backends.locmem.EmailBackend'


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


@override_settings(EMAIL_BACKEND=LOCMEM, FRONTEND_URL='https://app.winniegym.test')
class SendActivationEmailReturnTests(APITestCase):

    def test_returns_true_when_the_email_was_sent(self):
        user = make_user_factory(email='real@gym.test', rol='recepcionista')

        self.assertIs(send_activation_email(user), True)
        self.assertEqual(len(mail.outbox), 1)

    def test_returns_false_when_the_backend_raises(self):
        user = make_user_factory(email='boom@gym.test', rol='recepcionista')

        with patch('dj_rest_auth.forms.AllAuthPasswordResetForm.save', side_effect=RuntimeError('403')):
            self.assertIs(send_activation_email(user), False)

    def test_returns_false_for_an_inactive_user_because_nothing_is_sent(self):
        """allauth's reset form silently skips inactive users: valid form, zero emails."""
        user = make_user_factory(email='inactive@gym.test', rol='recepcionista')
        user.is_active = False
        user.save(update_fields=['is_active'])

        self.assertIs(send_activation_email(user), False)
        self.assertEqual(len(mail.outbox), 0)

    def test_returns_false_without_email_or_pk(self):
        user = make_user_factory(email='x@gym.test', rol='recepcionista')
        user.email = ''
        self.assertIs(send_activation_email(user), False)

        user.email = 'x@gym.test'
        user.pk = None
        self.assertIs(send_activation_email(user), False)

    def test_returns_false_when_the_form_is_invalid(self):
        user = make_user_factory(email='invalid@gym.test', rol='recepcionista')

        with patch('dj_rest_auth.forms.AllAuthPasswordResetForm.is_valid', return_value=False):
            self.assertIs(send_activation_email(user), False)
        self.assertEqual(len(mail.outbox), 0)

    def test_dispatch_for_socio_returns_the_same_flag(self):
        user = make_user_factory(email='socio@gym.test', rol='socio')
        synthetic = make_user_factory(email='socio_123@winniegym.com', rol='socio')

        self.assertIs(dispatch_activation_email_for_socio(user), True)
        self.assertIs(dispatch_activation_email_for_socio(synthetic), False)
        self.assertIs(dispatch_activation_email_for_socio(None), False)


class EmailEnviadoEndpointsTests(APITestCase):

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        _auth(self.client, self.admin)

    def _create_staff(self):
        return self.client.post(STAFF_URL, {
            'email': 'nuevo@gym.test', 'rol': 'recepcionista',
            'first_name': 'Nuevo', 'last_name': 'Staff',
        }, format='json')

    @patch('apps.users.views.send_activation_email', return_value=True)
    def test_staff_create_reports_email_enviado_true(self, _mock):
        response = self._create_staff()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIs(response.data['email_enviado'], True)
        self.assertEqual(response.data['email'], 'nuevo@gym.test')

    @patch('apps.users.views.send_activation_email', return_value=False)
    def test_staff_create_reports_email_enviado_false_but_still_201(self, _mock):
        response = self._create_staff()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIs(response.data['email_enviado'], False)

    @patch('apps.users.views.send_activation_email')
    def test_staff_resend_reports_the_flag(self, mock_send):
        staff = make_user_factory(rol='recepcionista')
        url = f'/api/users/staff/{staff.pk}/resend-activation/'

        mock_send.return_value = True
        ok = self.client.post(url)
        mock_send.return_value = False
        ko = self.client.post(url)

        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        self.assertIs(ok.data['email_enviado'], True)
        self.assertIn('detail', ok.data)
        self.assertEqual(ko.status_code, status.HTTP_200_OK)
        self.assertIs(ko.data['email_enviado'], False)

    @patch('apps.members.views.send_activation_email')
    def test_socio_resend_reports_the_flag(self, mock_send):
        user = make_user_factory(email='socio.real@gym.test', rol='socio')
        socio = make_socio_factory(usuario=user)
        url = f'/api/members/socios/{socio.pk}/resend-activation/'

        mock_send.return_value = False
        ko = self.client.post(url)
        mock_send.return_value = True
        ok = self.client.post(url)

        self.assertEqual(ko.status_code, status.HTTP_200_OK)
        self.assertIs(ko.data['email_enviado'], False)
        self.assertIs(ok.data['email_enviado'], True)
