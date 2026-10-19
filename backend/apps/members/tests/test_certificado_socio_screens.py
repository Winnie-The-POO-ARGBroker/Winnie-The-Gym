"""After a socio uploads a certificate, the socio screens must reflect it."""
import datetime

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from conftest import make_socio_factory, make_user_factory

PROFILE_URL = '/api/auth/profile/'
ME_URL = '/api/memberships/me/'


class SocioCertificadoScreensTests(APITestCase):
    def setUp(self):
        self.user = make_user_factory(email='screens@cert.test', rol='socio')
        self.socio = make_socio_factory(self.user, apellido='Screens')
        token = RefreshToken.for_user(self.user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def _upload(self):
        today = datetime.date.today()
        pdf = SimpleUploadedFile('apto.pdf', b'%PDF-1.4 body', content_type='application/pdf')
        resp = self.client.post(
            f'/api/members/socios/{self.socio.id}/certificado-medico/',
            {
                'archivo': pdf,
                'emitido_en': today.isoformat(),
                'vence_en': (today + datetime.timedelta(days=365)).isoformat(),
            },
            format='multipart',
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        return today

    def test_before_upload_reports_sin_apto(self):
        for url in (PROFILE_URL, ME_URL):
            data = self.client.get(url).data
            self.assertIs(data['tiene_certificado'], False, url)
            self.assertEqual(data['apto_estado'], 'sin_apto', url)
            self.assertIsNone(data['certificado_vence_en'], url)

    def test_after_upload_both_endpoints_reflect_certificate(self):
        today = self._upload()
        for url in (PROFILE_URL, ME_URL):
            data = self.client.get(url).data
            self.assertIs(data['tiene_certificado'], True, url)
            self.assertEqual(data['apto_estado'], 'vigente', url)
            self.assertEqual(data['certificado_emitido_en'], today.isoformat(), url)
            self.assertEqual(
                data['certificado_vence_en'],
                (today + datetime.timedelta(days=365)).isoformat(),
                url,
            )

    def test_storage_path_is_never_exposed(self):
        self._upload()
        for url in (PROFILE_URL, ME_URL):
            self.assertNotIn('certificado_medico_path', self.client.get(url).data, url)
