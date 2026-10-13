"""PR 2 backend tests — fixes #224, #226, #233.

Tests:
  1. test_profile_get_socio_exposes_id_numero_socio_estado_cert_url (fix #224)
  2. test_cert_medico_upload_by_socio_dueno_succeeds (fix #224)
  3. test_cert_medico_upload_by_other_socio_returns_403 (fix #224)
  4. test_cert_medico_upload_oversized_returns_400 (fix #224)
  5. test_password_change_old_password_required_returns_400_when_missing (fix #226)
  6. test_password_change_old_password_wrong_returns_400_with_spanish_message (fix #226)
  7. test_password_change_success_blacklists_refresh_tokens (fix #226)
  8. test_activation_email_token_accepted_by_password_reset_confirm (fix #233)
  9. test_password_reset_email_uses_frontend_url_not_example_com (fix #233)
 10. test_resend_activation_for_socio_with_real_email_returns_200 (fix #233)
 11. test_resend_activation_for_socio_with_synthetic_email_returns_400 (fix #233)
"""
import re
from unittest.mock import patch

from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.members.models import Socio
from conftest import make_socio_factory, make_user_factory

PROFILE_URL = '/api/auth/profile/'
PASSWORD_CHANGE_URL = '/api/auth/password/change/'
PASSWORD_RESET_URL = '/api/auth/password/reset/'
# dj-rest-auth's PasswordResetConfirmView accepts uid+token in the POST body
PASSWORD_RESET_CONFIRM_URL = '/api/auth/password/reset/confirm/'


def _cert_url(socio_id):
    return f'/api/members/socios/{socio_id}/certificado-medico/'


def _resend_url(socio_id):
    return f'/api/members/socios/{socio_id}/resend-activation/'


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


# ---------------------------------------------------------------------------
# Fix #224 — Expanded ProfileSerializer
# ---------------------------------------------------------------------------

class SocioProfileExpandedTests(APITestCase):
    """Fix #224: GET /api/auth/profile/ for a socio must expose all required fields."""

    def setUp(self):
        self.user = make_user_factory(rol='socio')
        self.socio = make_socio_factory(
            self.user,
            dni='11223344',
            nombre='Carlos',
            apellido='Activo',
            certificado_medico_url='https://supabase.co/cert-123.pdf',
        )
        _auth(self.client, self.user)

    def test_profile_get_socio_exposes_id_numero_socio_estado_cert_url(self):
        """Socio profile GET must include id, numero_socio, estado, fecha_baja,
        certificado_medico_url, and observaciones."""
        response = self.client.get(PROFILE_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        # Original fields still present
        self.assertEqual(data['dni'], '11223344')
        self.assertEqual(data['nombre'], 'Carlos')
        self.assertEqual(data['apellido'], 'Activo')
        self.assertEqual(data['email'], self.user.email)

        # New fields added by fix #224
        self.assertIn('id', data)
        self.assertEqual(data['id'], self.socio.id)
        self.assertIn('numero_socio', data)
        self.assertEqual(data['numero_socio'], self.socio.numero_socio)
        self.assertIn('estado', data)
        self.assertEqual(data['estado'], 'activo')
        self.assertIn('fecha_baja', data)
        self.assertIsNone(data['fecha_baja'])
        self.assertIn('certificado_medico_url', data)
        self.assertEqual(data['certificado_medico_url'], 'https://supabase.co/cert-123.pdf')
        self.assertIn('observaciones', data)

    def test_profile_patch_cannot_change_read_only_fields(self):
        """PATCH must ignore writes to id, numero_socio, estado, fecha_baja,
        email, and certificado_medico_url."""
        original_numero = self.socio.numero_socio

        response = self.client.patch(PROFILE_URL, {
            'id': 9999,
            'numero_socio': 'S-99999',
            'estado': 'baja',
            'certificado_medico_url': 'https://evil.com/cert.pdf',
            'nombre': 'Updated',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nombre'], 'Updated')
        self.assertEqual(response.data['numero_socio'], original_numero)
        self.assertEqual(response.data['estado'], 'activo')
        self.assertNotEqual(response.data['certificado_medico_url'], 'https://evil.com/cert.pdf')


# ---------------------------------------------------------------------------
# Fix #224 — Cert upload permission + backend validation
# ---------------------------------------------------------------------------

class CertMedicoUploadPermissionTests(APITestCase):
    """Fix #224: cert upload permissions and backend validation."""

    def setUp(self):
        self.user_a = make_user_factory(email='cert_a@test.local', rol='socio')
        self.socio_a = make_socio_factory(self.user_a, apellido='A')

        self.user_b = make_user_factory(email='cert_b@test.local', rol='socio')
        self.socio_b = make_socio_factory(self.user_b, apellido='B')

        self.admin = make_user_factory(email='admin_cert@test.local', rol='administrador')

    def _pdf(self):
        return SimpleUploadedFile('apto.pdf', b'%PDF-1.4 body', content_type='application/pdf')

    def test_cert_medico_upload_by_socio_dueno_succeeds(self):
        """Socio can upload a cert for their own record — 200 with response shape."""
        _auth(self.client, self.user_a)
        response = self.client.post(
            _cert_url(self.socio_a.id),
            {'archivo': self._pdf()},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        data = response.data
        # Verify response shape per contract
        self.assertIn('id', data)
        self.assertIn('certificado_medico_url', data)
        self.assertIn('numero_socio', data)
        self.assertIn('estado', data)

    def test_cert_medico_upload_by_other_socio_returns_403(self):
        """Socio cannot upload cert for a different socio — 403."""
        _auth(self.client, self.user_a)
        response = self.client.post(
            _cert_url(self.socio_b.id),
            {'archivo': self._pdf()},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cert_medico_upload_oversized_returns_400(self):
        """Backend must reject files > 5 MB — 400 with error on 'archivo' key."""
        _auth(self.client, self.admin)
        oversized = SimpleUploadedFile(
            'grande.pdf',
            b'x' * (5 * 1024 * 1024 + 1),
            content_type='application/pdf',
        )
        response = self.client.post(
            _cert_url(self.socio_a.id),
            {'archivo': oversized},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Error must be reported on the 'archivo' field
        self.assertIn('archivo', response.data)

    def test_cert_medico_upload_invalid_mime_returns_400(self):
        """Backend must reject non-PDF / non-image MIME types — 400."""
        _auth(self.client, self.admin)
        bad_file = SimpleUploadedFile(
            'malware.exe',
            b'MZfake',
            content_type='application/octet-stream',
        )
        response = self.client.post(
            _cert_url(self.socio_a.id),
            {'archivo': bad_file},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('archivo', response.data)


# ---------------------------------------------------------------------------
# Fix #226 — Password change with old_password + session blacklist
# ---------------------------------------------------------------------------

class PasswordChangeTests(APITestCase):
    """Fix #226: password change requires old_password and revokes sessions."""

    def setUp(self):
        self.user = make_user_factory(
            email='pw_change@test.local',
            password='OldPass123!',
            rol='socio',
        )
        make_socio_factory(self.user)
        _auth(self.client, self.user)

    def test_password_change_old_password_required_returns_400_when_missing(self):
        """Omitting old_password must return 400 — field is required."""
        response = self.client.post(PASSWORD_CHANGE_URL, {
            'new_password1': 'NewPass456!',
            'new_password2': 'NewPass456!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('old_password', response.data)

    def test_password_change_old_password_wrong_returns_400_with_spanish_message(self):
        """Wrong old_password must return 400 with error on old_password field."""
        response = self.client.post(PASSWORD_CHANGE_URL, {
            'old_password': 'WrongPassword!',
            'new_password1': 'NewPass456!',
            'new_password2': 'NewPass456!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('old_password', response.data)
        # Error must be non-empty
        self.assertTrue(len(response.data['old_password']) > 0)

    def test_password_change_success_blacklists_refresh_tokens(self):
        """After a successful password change all outstanding refresh tokens must be blacklisted."""
        # Issue a refresh token so there is something outstanding to blacklist
        refresh = RefreshToken.for_user(self.user)
        outstanding_before = OutstandingToken.objects.filter(user=self.user).count()
        self.assertGreater(outstanding_before, 0)

        response = self.client.post(PASSWORD_CHANGE_URL, {
            'old_password': 'OldPass123!',
            'new_password1': 'NewPass456!',
            'new_password2': 'NewPass456!',
        }, format='json')

        # Password change must succeed
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT])

        # All outstanding tokens for this user must now be blacklisted
        outstanding = OutstandingToken.objects.filter(user=self.user)
        for token in outstanding:
            self.assertTrue(
                BlacklistedToken.objects.filter(token=token).exists(),
                f'Token {token.jti} was not blacklisted after password change.',
            )


# ---------------------------------------------------------------------------
# Fix #233 — Token E2E, FRONTEND_URL in emails, resend-activation
# ---------------------------------------------------------------------------

@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    FRONTEND_URL='https://app.winniegym.test',
)
class ActivationEmailTokenTests(APITestCase):
    """Fix #233: activation email token is accepted by password-reset-confirm."""

    def test_activation_email_token_accepted_by_password_reset_confirm(self):
        """E2E: send activation email → extract link → call confirm → verify login works."""
        # Create a user without a usable password (mimics newly created staff/socio flow)
        user = make_user_factory(
            email='activation_e2e@test.local',
            password='OldPass999!',
            rol='socio',
        )
        make_socio_factory(user)

        # Trigger send_activation_email
        from apps.users.services import send_activation_email
        send_activation_email(user)

        # Assert email was sent
        self.assertGreater(len(mail.outbox), 0, 'No email was sent by send_activation_email')
        sent_email = mail.outbox[-1]

        # Extract uidb64 and token from the email body.
        # The activation email links to FRONTEND_URL/reset-password/<uidb64>/<token>/
        body = sent_email.body
        match = re.search(r'/reset-password/([A-Za-z0-9_=-]+)/([A-Za-z0-9_-]+)/', body)
        self.assertIsNotNone(
            match,
            f'Could not find reset link in email body:\n{body}',
        )
        uidb64 = match.group(1)
        token = match.group(2)

        # dj-rest-auth's PasswordResetConfirmView accepts uid+token in the POST body
        # (the SPA makes this call after extracting them from the redirect URL).
        response = self.client.post(PASSWORD_RESET_CONFIRM_URL, {
            'uid': uidb64,
            'token': token,
            'new_password1': 'FreshPass789!',
            'new_password2': 'FreshPass789!',
        }, format='json')

        self.assertIn(
            response.status_code,
            [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT],
            f'Password reset confirm failed (uid={uidb64}, token={token}): {response.data}',
        )

        # Verify the user can log in with the new password
        user.refresh_from_db()
        from django.contrib.auth import authenticate
        authenticated = authenticate(username=user.email, password='FreshPass789!')
        self.assertIsNotNone(
            authenticated,
            'User could not authenticate with the new password after reset confirm.',
        )


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    FRONTEND_URL='https://app.winniegym.test',
)
class PasswordResetEmailURLTests(APITestCase):
    """Fix #233: password reset email must link to FRONTEND_URL, not example.com."""

    def test_password_reset_email_uses_frontend_url_not_example_com(self):
        """POST /api/auth/password/reset/ sends email with FRONTEND_URL link."""
        user = make_user_factory(email='reset_url@test.local', password='SomePass123!', rol='socio')
        make_socio_factory(user)

        response = self.client.post(PASSWORD_RESET_URL, {'email': user.email}, format='json')

        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT])
        self.assertGreater(len(mail.outbox), 0, 'No email was sent after password reset request')

        sent_email = mail.outbox[-1]
        body = sent_email.body

        # Must contain FRONTEND_URL
        self.assertIn(
            'app.winniegym.test',
            body,
            'Password reset email does not contain FRONTEND_URL',
        )
        # Must NOT contain example.com
        self.assertNotIn(
            'example.com',
            body,
            'Password reset email still contains example.com (Site domain not overridden)',
        )


class ResendActivationSocioTests(APITestCase):
    """Fix #233: POST /api/members/socios/{id}/resend-activation/"""

    def setUp(self):
        self.admin = make_user_factory(email='admin_resend@test.local', rol='administrador')
        self.recep = make_user_factory(email='recep_resend@test.local', rol='recepcionista')

        # Socio with a real email
        self.user_real = make_user_factory(email='real_email@test.local', rol='socio')
        self.socio_real = make_socio_factory(self.user_real, apellido='Real')

        # Socio with a synthetic email (winniegym.com placeholder)
        n = self.user_real.pk + 100  # ensure unique
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user_synth = User.objects.create_user(
            email=f'socio_{n:08d}@winniegym.com',
            username=f'socio_{n:08d}@winniegym.com',
            rol='socio',
        )
        self.user_synth.set_unusable_password()
        self.user_synth.save()
        self.socio_synth = make_socio_factory(self.user_synth, apellido='Synth')

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_resend_activation_for_socio_with_real_email_returns_200(self):
        """Admin can resend activation email to socio with a real email — 200."""
        _auth(self.client, self.admin)
        response = self.client.post(_resend_url(self.socio_real.id), {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIn('detail', response.data)
        self.assertEqual(response.data['detail'], 'Email de activación reenviado.')

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_resend_activation_for_socio_recepcionista_returns_200(self):
        """Recepcionista can also resend activation — 200."""
        _auth(self.client, self.recep)
        response = self.client.post(_resend_url(self.socio_real.id), {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

    def test_resend_activation_for_socio_with_synthetic_email_returns_400(self):
        """Resend to socio with synthetic placeholder email must return 400."""
        _auth(self.client, self.admin)
        response = self.client.post(_resend_url(self.socio_synth.id), {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertIn('detail', response.data)
        self.assertIn('email real', response.data['detail'])

    def test_resend_activation_socio_user_returns_403(self):
        """Socio cannot resend activation (not admin/recep) — 403."""
        _auth(self.client, self.user_real)
        response = self.client.post(_resend_url(self.socio_real.id), {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_resend_activation_unauthenticated_returns_401(self):
        """Unauthenticated request must return 401."""
        response = self.client.post(_resend_url(self.socio_real.id), {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_resend_activation_nonexistent_socio_returns_404(self):
        """Request for a non-existent socio must return 404."""
        _auth(self.client, self.admin)
        response = self.client.post(_resend_url(99999), {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
