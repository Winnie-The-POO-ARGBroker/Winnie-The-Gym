"""Tests for REQ-2.2 (instructor_nombre) and REQ-2.3 (recepcionista permissions)."""
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.classes.models import Clase
from conftest import make_user_factory

CLASES_URL = '/api/classes/clases/'

_counter = 0


def _make_clase(**kwargs):
    global _counter
    _counter += 1
    defaults = dict(
        nombre=f'Clase Contract {_counter}',
        categoria='funcional',
        cupo_maximo=20,
        instructor='Juan Pérez',
    )
    defaults.update(kwargs)
    return Clase.objects.create(**defaults)


def _auth_client(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def _clase_detail_url(pk):
    return f'/api/classes/clases/{pk}/'


class ClaseInstructorNombreTests(APITestCase):
    """REQ-2.2: ClaseSerializer must expose instructor_nombre as alias of instructor."""

    def test_instructor_nombre_present_in_list_response(self):
        admin = make_user_factory(rol='administrador')
        _make_clase(instructor='Ana García')
        _auth_client(self.client, admin)

        response = self.client.get(CLASES_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        if isinstance(data, dict):
            data = data.get('results', data)
        self.assertGreater(len(data), 0)
        first = data[0]
        self.assertIn('instructor_nombre', first)
        self.assertEqual(first['instructor_nombre'], first['instructor'])

    def test_instructor_nombre_matches_instructor_value(self):
        admin = make_user_factory(rol='administrador')
        clase = _make_clase(instructor='Carlos Rodríguez')
        _auth_client(self.client, admin)

        response = self.client.get(_clase_detail_url(clase.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['instructor_nombre'], 'Carlos Rodríguez')
        self.assertEqual(response.data['instructor'], 'Carlos Rodríguez')

    def test_instructor_nombre_empty_when_instructor_empty(self):
        admin = make_user_factory(rol='administrador')
        clase = _make_clase(instructor='')
        _auth_client(self.client, admin)

        response = self.client.get(_clase_detail_url(clase.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['instructor_nombre'], '')


class ClaseRecepcionistaPermissionTests(APITestCase):
    """REQ-2.3: Recepcionista can create and update classes, but not delete them."""

    def test_recepcionista_can_create_clase(self):
        recep = make_user_factory(rol='recepcionista')
        _auth_client(self.client, recep)

        payload = {
            'nombre': 'Yoga por Recep',
            'categoria': 'yoga',
            'descripcion': 'Clase de yoga',
            'dia': 'martes',
            'hora': '09:00',
            'duracion_min': 60,
            'sala': 'Sala B',
            'instructor': 'Sofia L.',
            'cupo_maximo': 15,
            'lista_espera_max': 3,
            'cancelacion_horas': 1,
            'planes_habilitados': [],
            'recurrencia': 'Semanal',
            'dias_recurrencia': ['M'],
            'estado': 'activa',
        }
        response = self.client.post(CLASES_URL, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nombre'], 'Yoga por Recep')

    def test_recepcionista_can_update_clase(self):
        recep = make_user_factory(rol='recepcionista')
        clase = _make_clase()
        _auth_client(self.client, recep)

        response = self.client.patch(
            _clase_detail_url(clase.pk),
            {'cupo_maximo': 30},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['cupo_maximo'], 30)

    def test_recepcionista_cannot_delete_clase(self):
        recep = make_user_factory(rol='recepcionista')
        clase = _make_clase()
        _auth_client(self.client, recep)

        response = self.client.delete(_clase_detail_url(clase.pk))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_still_create_clase(self):
        admin = make_user_factory(rol='administrador')
        _auth_client(self.client, admin)

        payload = {
            'nombre': 'Crossfit Admin',
            'categoria': 'funcional',
            'cupo_maximo': 20,
            'estado': 'activa',
        }
        response = self.client.post(CLASES_URL, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_can_delete_clase(self):
        admin = make_user_factory(rol='administrador')
        clase = _make_clase()
        _auth_client(self.client, admin)

        response = self.client.delete(_clase_detail_url(clase.pk))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_socio_cannot_create_clase(self):
        socio = make_user_factory(rol='socio')
        _auth_client(self.client, socio)

        payload = {
            'nombre': 'Clase Socio Illegal',
            'categoria': 'yoga',
            'cupo_maximo': 10,
        }
        response = self.client.post(CLASES_URL, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
