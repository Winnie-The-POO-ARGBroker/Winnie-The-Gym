from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.classes.models import Clase, InscripcionClase
from conftest import make_socio_factory, make_user_factory

_counter = 0


def _make_clase(nombre=None, cupo_maximo=20, **kwargs):
    global _counter
    _counter += 1
    if nombre is None:
        nombre = f'Clase ViewSet {_counter}'
    return Clase.objects.create(
        nombre=nombre,
        categoria='funcional',
        cupo_maximo=cupo_maximo,
        **kwargs,
    )


def _auth_client(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


INSCRIPCIONES_URL = '/api/classes/inscripciones/'


def _inscripcion_detail_url(pk):
    return f'/api/classes/inscripciones/{pk}/'


class InscripcionClaseViewSetTests(APITestCase):

    def test_list_inscripciones_admin_200(self):
        admin = make_user_factory(rol='administrador')
        user = make_user_factory(rol='socio')
        socio = make_socio_factory(usuario=user)
        clase = _make_clase()
        InscripcionClase.objects.create(clase=clase, socio=socio)

        _auth_client(self.client, admin)
        response = self.client.get(INSCRIPCIONES_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        if isinstance(data, dict):
            data = data.get('results', data)
        self.assertGreater(len(data), 0)
        first = data[0]
        for field in ('id', 'clase', 'socio', 'socio_nombre', 'asistio', 'en_espera'):
            self.assertIn(field, first)

    def test_list_inscripciones_recepcionista_200(self):
        recep = make_user_factory(rol='recepcionista')
        user = make_user_factory(rol='socio')
        socio = make_socio_factory(usuario=user)
        clase = _make_clase()
        InscripcionClase.objects.create(clase=clase, socio=socio)

        _auth_client(self.client, recep)
        response = self.client.get(INSCRIPCIONES_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_inscripciones_socio_403(self):
        socio_user = make_user_factory(rol='socio')
        _auth_client(self.client, socio_user)

        response = self.client.get(INSCRIPCIONES_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_marcar_asistencia_recep_200(self):
        recep = make_user_factory(rol='recepcionista')
        user = make_user_factory(rol='socio')
        socio = make_socio_factory(usuario=user)
        clase = _make_clase()
        inscripcion = InscripcionClase.objects.create(clase=clase, socio=socio, asistio=False)

        _auth_client(self.client, recep)
        response = self.client.patch(
            _inscripcion_detail_url(inscripcion.pk),
            {'asistio': True},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['asistio'])

        inscripcion.refresh_from_db()
        self.assertTrue(inscripcion.asistio)

    def test_marcar_asistencia_socio_403(self):
        socio_user = make_user_factory(rol='socio')
        socio = make_socio_factory(usuario=socio_user)
        clase = _make_clase()
        inscripcion = InscripcionClase.objects.create(clase=clase, socio=socio, asistio=False)

        _auth_client(self.client, socio_user)
        response = self.client.patch(
            _inscripcion_detail_url(inscripcion.pk),
            {'asistio': True},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_401(self):
        response = self.client.get(INSCRIPCIONES_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
