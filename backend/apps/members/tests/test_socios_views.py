import datetime

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.members.models import Socio

User = get_user_model()

_counter = 0


def _make_user(email=None, rol='socio', **kwargs):
    global _counter
    _counter += 1
    if email is None:
        email = f'user{_counter}@test.com'
    return User.objects.create_user(
        email=email,
        password='pass1234!',
        username=email,
        rol=rol,
        **kwargs,
    )


def _make_socio(user, dni=None):
    global _counter
    if dni is None:
        _counter += 1
        dni = f'{_counter:08d}'
    return Socio.objects.create(
        usuario=user,
        dni=dni,
        nombre='Maria',
        apellido='Garcia',
        telefono='5491100000001',
    )


def _auth_client(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


SOCIOS_URL = '/api/members/socios/'


def _detail_url(pk):
    return f'/api/members/socios/{pk}/'


def _baja_url(pk):
    return f'/api/members/socios/{pk}/dar-baja/'


class SocioListCreateTests(APITestCase):

    def test_list_socios_admin_200(self):
        admin = _make_user(rol='administrador')
        user = _make_user()
        _make_socio(user)
        _auth_client(self.client, admin)

        response = self.client.get(SOCIOS_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        if isinstance(data, dict):
            data = data.get('results', data)
        self.assertGreater(len(data), 0)
        first = data[0]
        for field in ('id', 'numero_socio', 'nombre', 'apellido', 'dni', 'estado'):
            self.assertIn(field, first)

    def test_list_socios_recep_200(self):
        recep = _make_user(rol='recepcionista')
        _auth_client(self.client, recep)

        response = self.client.get(SOCIOS_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_socio_admin_201(self):
        admin = _make_user(rol='administrador')
        target_user = _make_user()
        _auth_client(self.client, admin)

        payload = {
            'usuario': target_user.pk,
            'dni': '99887766',
            'nombre': 'Carlos',
            'apellido': 'Ruiz',
            'telefono': '5491100000002',
        }
        response = self.client.post(SOCIOS_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertRegex(response.data['numero_socio'], r'^S-\d{5}$')
        self.assertEqual(response.data['estado'], 'activo')

    def test_create_socio_duplicate_dni_400(self):
        admin = _make_user(rol='administrador')
        existing_user = _make_user()
        _make_socio(existing_user, dni='11223344')
        new_user = _make_user()
        _auth_client(self.client, admin)

        payload = {
            'usuario': new_user.pk,
            'dni': '11223344',
            'nombre': 'Pedro',
            'apellido': 'Sanchez',
            'telefono': '5491100000003',
        }
        response = self.client.post(SOCIOS_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('dni', response.data)

    def test_unauthenticated_list_401(self):
        response = self.client.get(SOCIOS_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_socio_role_list_403(self):
        socio_user = _make_user(rol='socio')
        _auth_client(self.client, socio_user)

        response = self.client.get(SOCIOS_URL)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_socio_role_create_403(self):
        socio_user = _make_user(rol='socio')
        other_user = _make_user()
        _auth_client(self.client, socio_user)

        payload = {
            'usuario': other_user.pk,
            'dni': '55667788',
            'nombre': 'Pedro',
            'apellido': 'Perez',
            'telefono': '5491100000004',
        }
        response = self.client.post(SOCIOS_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class SocioRetrieveUpdateTests(APITestCase):

    def test_retrieve_socio_200(self):
        admin = _make_user(rol='administrador')
        user = _make_user()
        socio = _make_socio(user)
        _auth_client(self.client, admin)

        response = self.client.get(_detail_url(socio.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], socio.pk)

    def test_retrieve_nonexistent_404(self):
        admin = _make_user(rol='administrador')
        _auth_client(self.client, admin)

        response = self.client.get(_detail_url(99999))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_partial_update_observaciones_200(self):
        admin = _make_user(rol='administrador')
        user = _make_user()
        socio = _make_socio(user)
        original_numero = socio.numero_socio
        _auth_client(self.client, admin)

        response = self.client.patch(_detail_url(socio.pk), {'observaciones': 'Nota importante'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['observaciones'], 'Nota importante')
        self.assertEqual(response.data['numero_socio'], original_numero)

    def test_partial_update_numero_socio_ignored(self):
        admin = _make_user(rol='administrador')
        user = _make_user()
        socio = _make_socio(user)
        original_numero = socio.numero_socio
        _auth_client(self.client, admin)

        response = self.client.patch(_detail_url(socio.pk), {'numero_socio': 'S-99999'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['numero_socio'], original_numero)


class SocioDarBajaTests(APITestCase):

    def test_dar_baja_activo_200(self):
        admin = _make_user(rol='administrador')
        user = _make_user()
        socio = _make_socio(user)
        _auth_client(self.client, admin)

        response = self.client.post(_baja_url(socio.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['estado'], 'baja')
        today = datetime.date.today().isoformat()
        self.assertEqual(response.data['fecha_baja'], today)
        # User account must remain active
        user.refresh_from_db()
        self.assertTrue(user.is_active)

    def test_dar_baja_already_baja_400(self):
        admin = _make_user(rol='administrador')
        user = _make_user()
        socio = _make_socio(user)
        socio.estado = 'baja'
        socio.save()
        _auth_client(self.client, admin)

        response = self.client.post(_baja_url(socio.pk))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_dar_baja_unauthenticated_401(self):
        user = _make_user()
        socio = _make_socio(user)

        response = self.client.post(_baja_url(socio.pk))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_dar_baja_socio_role_403(self):
        socio_user = _make_user(rol='socio')
        other_user = _make_user()
        socio = _make_socio(other_user)
        _auth_client(self.client, socio_user)

        response = self.client.post(_baja_url(socio.pk))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_dar_baja_response_uses_full_socio_serializer_shape(self):
        admin = _make_user(rol='administrador')
        user = _make_user()
        socio = _make_socio(user)
        _auth_client(self.client, admin)

        response = self.client.post(_baja_url(socio.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # SocioSerializer exposes all these fields; SocioBajaSerializer only had estado + fecha_baja
        for field in ('id', 'numero_socio', 'nombre', 'apellido', 'dni', 'telefono', 'observaciones'):
            self.assertIn(field, response.data, f"Expected field '{field}' in dar-baja response")
