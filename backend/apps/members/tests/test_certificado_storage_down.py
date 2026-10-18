"""When the file storage cannot be reached the upload must say so (503), not
crash with an opaque 500.

In production the private bucket did not exist, Supabase answered with a
non-S3 body and boto3 raised `ClientError: An error occurred () when calling
the PutObject operation`, which reached the user as "Internal Server Error".
"""
from unittest.mock import MagicMock, patch

from botocore.exceptions import ClientError
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.members.models import Socio
from conftest import make_socio_factory, make_user_factory


class CertificadoStorageDownTests(APITestCase):
    def setUp(self):
        admin = make_user_factory(email='admin@storage.test', rol='administrador')
        token = RefreshToken.for_user(admin).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.socio = make_socio_factory(make_user_factory(email='socio@storage.test', rol='socio'))
        self.url = f'/api/members/socios/{self.socio.id}/certificado-medico/'

    def _upload(self):
        pdf = SimpleUploadedFile('apto.pdf', b'%PDF-1.4 body', content_type='application/pdf')
        return self.client.post(self.url, {'archivo': pdf}, format='multipart')

    def _broken_storage(self):
        storage = MagicMock()
        storage.save.side_effect = ClientError({'Error': {}}, 'PutObject')
        return storage

    def test_a_storage_failure_answers_503_with_a_clear_message(self):
        with patch('apps.members.services._get_cert_storage', return_value=self._broken_storage()):
            response = self._upload()

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn('almacenamiento', response.json()['detail'].lower())

    def test_nothing_is_saved_on_the_socio_when_the_upload_fails(self):
        with patch('apps.members.services._get_cert_storage', return_value=self._broken_storage()):
            self._upload()

        self.assertFalse(Socio.objects.get(pk=self.socio.pk).certificado_medico_path)
