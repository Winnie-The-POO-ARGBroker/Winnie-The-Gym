"""The calendar asks for a whole week of sessions at once; DRF's default
pagination (10 per page, no page_size parameter) returned only the first 10 of
the ~30 sessions the seeded catalog has per week."""
import datetime

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.classes.models import Clase, SesionClase
from conftest import make_user_factory

URL = '/api/classes/sesiones/'


class SesionesPaginacionTests(APITestCase):
    def setUp(self):
        token = RefreshToken.for_user(make_user_factory(rol='administrador')).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        clase = Clase.objects.create(nombre='Funcional', categoria='funcional', cupo_maximo=20)
        self.inicio = datetime.date(2026, 11, 2)
        for offset in range(25):
            SesionClase.objects.create(clase=clase, fecha=self.inicio + datetime.timedelta(days=offset))

    def _get(self, **params):
        return self.client.get(URL, {'fecha_desde': '2026-11-01', 'fecha_hasta': '2026-12-31', **params})

    def test_page_size_lets_the_client_get_every_session_of_the_range(self):
        response = self._get(page_size=200)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()['results']), 25)

    def test_the_default_page_stays_small(self):
        response = self._get()

        self.assertEqual(len(response.json()['results']), 10)
        self.assertEqual(response.json()['count'], 25)
