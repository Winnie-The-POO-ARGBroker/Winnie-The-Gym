from datetime import time

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.classes.models import Clase
from conftest import make_user_factory


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


CLASES_URL = '/api/classes/clases/'


class ClaseAdvancedSearchTests(APITestCase):
    """HU06 — combined text search + multi-criteria filters over classes."""

    def setUp(self):
        self.admin = make_user_factory(email='admin@search.test', rol='administrador')
        Clase.objects.create(
            nombre='Yoga Matutino', categoria=Clase.Categoria.YOGA,
            dia=Clase.Dia.LUNES, hora=time(8, 0),
            instructor='Ana', sala='Sala A',
        )
        Clase.objects.create(
            nombre='Spinning Tarde', categoria=Clase.Categoria.SPINNING,
            dia=Clase.Dia.MARTES, hora=time(18, 0),
            instructor='Bruno', sala='Sala B',
        )
        Clase.objects.create(
            nombre='CrossFit Noche', categoria=Clase.Categoria.CROSSFIT,
            dia=Clase.Dia.MARTES, hora=time(20, 0),
            instructor='Ana', sala='Sala A',
        )
        _auth(self.client, self.admin)

    def _results(self, url):
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data.get('results', response.data)

    def test_text_search_matches_nombre(self):
        results = self._results(f'{CLASES_URL}?search=yoga')
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['nombre'], 'Yoga Matutino')

    def test_text_search_matches_instructor(self):
        results = self._results(f'{CLASES_URL}?search=Ana')
        self.assertEqual(len(results), 2)

    def test_filter_by_categoria(self):
        results = self._results(f'{CLASES_URL}?categoria=spinning')
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['categoria'], 'spinning')

    def test_filter_by_dia_and_hora_range(self):
        results = self._results(
            f'{CLASES_URL}?dia=martes&hora_desde=17:00&hora_hasta=19:00'
        )
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['nombre'], 'Spinning Tarde')

    def test_combined_search_and_filter(self):
        results = self._results(f'{CLASES_URL}?search=Ana&categoria=crossfit')
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['nombre'], 'CrossFit Noche')

    def test_pagination_metadata_present(self):
        response = self.client.get(CLASES_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ('count', 'next', 'previous', 'results'):
            self.assertIn(key, response.data)
