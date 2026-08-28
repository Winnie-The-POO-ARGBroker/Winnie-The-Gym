import datetime

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.classes.models import Clase
from conftest import make_user_factory

_counter = 0


def _make_clase(nombre=None, categoria='funcional', cupo_maximo=20, **kwargs):
    global _counter
    _counter += 1
    if nombre is None:
        nombre = f'Clase {_counter}'
    return Clase.objects.create(
        nombre=nombre,
        categoria=categoria,
        cupo_maximo=cupo_maximo,
        **kwargs,
    )


def _auth_client(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


CLASES_URL = '/api/classes/clases/'


def _clase_detail_url(pk):
    return f'/api/classes/clases/{pk}/'


class ClaseListTests(APITestCase):

    def test_list_clases_admin_200(self):
        admin = make_user_factory(rol='administrador')
        _make_clase()
        _auth_client(self.client, admin)

        response = self.client.get(CLASES_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        if isinstance(data, dict):
            data = data.get('results', data)
        self.assertGreater(len(data), 0)
        first = data[0]
        for field in ('id', 'nombre', 'categoria', 'cupo_maximo', 'cupos_reservados', 'estado'):
            self.assertIn(field, first)

    def test_list_clases_recep_200(self):
        recep = make_user_factory(rol='recepcionista')
        _make_clase()
        _auth_client(self.client, recep)

        response = self.client.get(CLASES_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_clases_socio_200(self):
        socio_user = make_user_factory(rol='socio')
        _make_clase()
        _auth_client(self.client, socio_user)

        response = self.client.get(CLASES_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_401(self):
        response = self.client.get(CLASES_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ClaseCreateTests(APITestCase):

    def test_create_clase_admin_201(self):
        admin = make_user_factory(rol='administrador')
        _auth_client(self.client, admin)

        payload = {
            'nombre': 'Funcional Intensivo',
            'categoria': 'funcional',
            'descripcion': 'Clase funcional de alta intensidad',
            'dia': 'lunes',
            'hora': '08:00',
            'duracion_min': 45,
            'sala': 'Sala A',
            'instructor': 'Carlos R.',
            'cupo_maximo': 20,
            'lista_espera_max': 5,
            'cancelacion_horas': 2,
            'planes_habilitados': ['Premium', 'Gold'],
            'recurrencia': 'Semanal - L/M/V',
            'dias_recurrencia': ['L', 'X', 'V'],
            'estado': 'activa',
        }
        response = self.client.post(CLASES_URL, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nombre'], 'Funcional Intensivo')
        self.assertEqual(response.data['cupo_maximo'], 20)

    def test_create_clase_recep_403(self):
        recep = make_user_factory(rol='recepcionista')
        _auth_client(self.client, recep)

        payload = {
            'nombre': 'Spinning Pro',
            'categoria': 'spinning',
            'cupo_maximo': 20,
        }
        response = self.client.post(CLASES_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_clase_socio_403(self):
        socio = make_user_factory(rol='socio')
        _auth_client(self.client, socio)

        payload = {
            'nombre': 'Yoga Test',
            'categoria': 'yoga',
            'cupo_maximo': 15,
        }
        response = self.client.post(CLASES_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ClaseRetrieveUpdateTests(APITestCase):

    def test_retrieve_clase_200(self):
        admin = make_user_factory(rol='administrador')
        clase = _make_clase(nombre='Crossfit WOD')
        _auth_client(self.client, admin)

        response = self.client.get(_clase_detail_url(clase.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], clase.pk)
        self.assertEqual(response.data['nombre'], 'Crossfit WOD')
        self.assertIn('inscripciones', response.data)

    def test_patch_clase_admin_200(self):
        admin = make_user_factory(rol='administrador')
        clase = _make_clase(nombre='Pilates Mat', cupo_maximo=15)
        _auth_client(self.client, admin)

        response = self.client.patch(
            _clase_detail_url(clase.pk),
            {'cupo_maximo': 25, 'instructor': 'Sofia L.'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['cupo_maximo'], 25)
        self.assertEqual(response.data['instructor'], 'Sofia L.')

    def test_patch_clase_recep_403(self):
        recep = make_user_factory(rol='recepcionista')
        clase = _make_clase()
        _auth_client(self.client, recep)

        response = self.client.patch(
            _clase_detail_url(clase.pk),
            {'cupo_maximo': 30},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ClaseDeleteTests(APITestCase):

    def test_delete_clase_admin_204(self):
        admin = make_user_factory(rol='administrador')
        clase = _make_clase()
        _auth_client(self.client, admin)

        response = self.client.delete(_clase_detail_url(clase.pk))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Clase.objects.filter(pk=clase.pk).exists())

    def test_delete_clase_recep_403(self):
        recep = make_user_factory(rol='recepcionista')
        clase = _make_clase()
        _auth_client(self.client, recep)

        response = self.client.delete(_clase_detail_url(clase.pk))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
