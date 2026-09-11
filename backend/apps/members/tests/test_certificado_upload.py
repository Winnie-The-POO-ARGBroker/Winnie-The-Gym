import io

from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.members.models import Socio
from conftest import make_socio_factory, make_user_factory


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def _cert_url(socio_id):
    return f'/api/members/socios/{socio_id}/certificado-medico/'


class SubirCertificadoMedicoTests(APITestCase):
    """RF08 — medical certificate upload endpoint."""

    def setUp(self):
        self.admin = make_user_factory(email='admin@cert.test', rol='administrador')
        socio_user = make_user_factory(email='socio@cert.test', rol='socio')
        self.socio = make_socio_factory(socio_user, apellido='Perez')

    def _cleanup(self, socio):
        socio.refresh_from_db()
        if socio.certificado_medico_url:
            path = socio.certificado_medico_url.split('/media/')[-1]
            if default_storage.exists(path):
                default_storage.delete(path)

    def test_admin_uploads_pdf_successfully(self):
        _auth(self.client, self.admin)
        pdf = SimpleUploadedFile(
            'apto.pdf',
            b'%PDF-1.4 fake body',
            content_type='application/pdf',
        )

        response = self.client.post(_cert_url(self.socio.id), {'archivo': pdf}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('/media/certificados_medicos/', response.data['certificado_medico_url'])
        self.assertTrue(response.data['certificado_medico_url'].endswith('.pdf'))
        self._cleanup(self.socio)

    def test_admin_uploads_image_successfully(self):
        _auth(self.client, self.admin)
        img = SimpleUploadedFile('apto.jpg', b'fakejpgbytes', content_type='image/jpeg')

        response = self.client.post(_cert_url(self.socio.id), {'archivo': img}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['certificado_medico_url'].endswith('.jpg'))
        self._cleanup(self.socio)

    def test_upload_rejects_unsupported_extension(self):
        _auth(self.client, self.admin)
        bad = SimpleUploadedFile('malicioso.exe', b'MZfake', content_type='application/octet-stream')

        response = self.client.post(_cert_url(self.socio.id), {'archivo': bad}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_rejects_oversize(self):
        _auth(self.client, self.admin)
        big = SimpleUploadedFile('grande.pdf', b'x' * (5 * 1024 * 1024 + 1), content_type='application/pdf')

        response = self.client.post(_cert_url(self.socio.id), {'archivo': big}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_socio_cannot_upload_via_admin_endpoint(self):
        socio_user = make_user_factory(email='autoupload@cert.test', rol='socio')
        _auth(self.client, socio_user)
        pdf = SimpleUploadedFile('apto.pdf', b'%PDF-1.4', content_type='application/pdf')

        response = self.client.post(_cert_url(self.socio.id), {'archivo': pdf}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
