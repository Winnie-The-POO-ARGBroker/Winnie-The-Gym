"""REQ-3.1 — Socio can upload their own medical certificate."""
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from conftest import make_socio_factory, make_user_factory


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def _cert_url(socio_id):
    return f'/api/members/socios/{socio_id}/certificado-medico/'


class SocioSelfServiceCertTests(APITestCase):
    """A socio must be able to upload their own cert but not another socio's."""

    def setUp(self):
        # Socio A — the one performing the upload
        self.user_a = make_user_factory(email='socia_a@cert.test', rol='socio')
        self.socio_a = make_socio_factory(self.user_a, apellido='A')

        # Socio B — target of the malicious request
        self.user_b = make_user_factory(email='socia_b@cert.test', rol='socio')
        self.socio_b = make_socio_factory(self.user_b, apellido='B')

        self.admin = make_user_factory(email='admin@selfcert.test', rol='administrador')

    def _pdf(self):
        return SimpleUploadedFile('apto.pdf', b'%PDF-1.4 body', content_type='application/pdf')

    def test_socio_can_upload_own_cert(self):
        """Socio A can upload a cert to their own record — 200."""
        _auth(self.client, self.user_a)
        response = self.client.post(_cert_url(self.socio_a.id), {'archivo': self._pdf()}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIn('certificado_medico_url', response.data)

    def test_socio_cannot_upload_other_socio_cert(self):
        """Socio A cannot upload a cert to Socio B's record — 403."""
        _auth(self.client, self.user_a)
        response = self.client.post(_cert_url(self.socio_b.id), {'archivo': self._pdf()}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.data)

    def test_admin_can_upload_any_socio_cert(self):
        """Admin can upload to any socio's record — 200."""
        _auth(self.client, self.admin)
        response = self.client.post(_cert_url(self.socio_a.id), {'archivo': self._pdf()}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

    def test_unauthenticated_user_gets_401(self):
        """Unauthenticated requests are rejected — 401."""
        response = self.client.post(_cert_url(self.socio_a.id), {'archivo': self._pdf()}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
