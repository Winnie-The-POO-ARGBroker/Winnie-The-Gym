from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.classes.models import Clase, InscripcionClase
from apps.members.models import Socio

User = get_user_model()

_counter = 0


def _make_user(email=None, rol='socio', **kwargs):
    global _counter
    _counter += 1
    if email is None:
        email = f'inscribir_user{_counter}@classes.test'
    return User.objects.create_user(
        email=email,
        password='pass1234!',
        username=email,
        rol=rol,
        **kwargs,
    )


def _make_socio(user, dni=None):
    global _counter
    _counter += 1
    if dni is None:
        dni = f'{_counter:08d}'
    return Socio.objects.create(
        usuario=user,
        dni=dni,
        nombre='Socio',
        apellido=f'Test{_counter}',
        telefono='5491100000000',
    )


def _make_clase(nombre=None, cupo_maximo=20, **kwargs):
    global _counter
    _counter += 1
    if nombre is None:
        nombre = f'Clase Inscribir {_counter}'
    return Clase.objects.create(
        nombre=nombre,
        categoria='funcional',
        cupo_maximo=cupo_maximo,
        **kwargs,
    )


def _auth_client(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def _inscribir_url(clase_pk):
    return f'/api/classes/clases/{clase_pk}/inscribir/'


class ClaseInscribirFlowTests(APITestCase):

    def test_inscribir_cupo_disponible_201(self):
        user = _make_user(rol='socio')
        socio = _make_socio(user)
        clase = _make_clase(cupo_maximo=10)
        _auth_client(self.client, user)

        response = self.client.post(_inscribir_url(clase.pk))

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['clase'], clase.pk)
        self.assertEqual(response.data['socio'], socio.pk)
        self.assertFalse(response.data['en_espera'])
        self.assertFalse(response.data['asistio'])

        # Verify DB record
        self.assertTrue(
            InscripcionClase.objects.filter(clase=clase, socio=socio, en_espera=False).exists()
        )

    def test_inscribir_cupo_lleno_en_espera_201(self):
        clase = _make_clase(cupo_maximo=1, lista_espera_max=2)

        # First socio takes the only spot
        user1 = _make_user(rol='socio')
        socio1 = _make_socio(user1)
        InscripcionClase.objects.create(clase=clase, socio=socio1, en_espera=False)

        # Second socio tries to register
        user2 = _make_user(rol='socio')
        socio2 = _make_socio(user2)
        _auth_client(self.client, user2)

        response = self.client.post(_inscribir_url(clase.pk))

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['en_espera'])

        # Verify DB record has en_espera=True
        self.assertTrue(
            InscripcionClase.objects.filter(clase=clase, socio=socio2, en_espera=True).exists()
        )

    def test_inscribir_cupo_y_espera_llenos_400(self):
        clase = _make_clase(cupo_maximo=1, lista_espera_max=1)

        # Spot 1 (Cupo principal)
        user1 = _make_user(rol='socio')
        socio1 = _make_socio(user1)
        InscripcionClase.objects.create(clase=clase, socio=socio1, en_espera=False)

        # Spot 2 (Lista de espera 1/1)
        user2 = _make_user(rol='socio')
        socio2 = _make_socio(user2)
        InscripcionClase.objects.create(clase=clase, socio=socio2, en_espera=True)

        # Spot 3 (Lista de espera desbordada)
        user3 = _make_user(rol='socio')
        _make_socio(user3)
        _auth_client(self.client, user3)

        response = self.client.post(_inscribir_url(clase.pk))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
        self.assertIn('completas', response.data['detail'])


    def test_inscribir_ya_inscripto_400(self):
        user = _make_user(rol='socio')
        socio = _make_socio(user)
        clase = _make_clase(cupo_maximo=10)
        InscripcionClase.objects.create(clase=clase, socio=socio, en_espera=False)

        _auth_client(self.client, user)
        response = self.client.post(_inscribir_url(clase.pk))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
        self.assertIn('Ya estás inscripto', response.data['detail'])

    def test_inscribir_usuario_sin_perfil_socio_400(self):
        admin_user = _make_user(rol='administrador')
        clase = _make_clase(cupo_maximo=10)
        _auth_client(self.client, admin_user)

        response = self.client.post(_inscribir_url(clase.pk))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
        self.assertIn('perfil de socio', response.data['detail'])

    def test_inscribir_unauthenticated_401(self):
        clase = _make_clase()
        response = self.client.post(_inscribir_url(clase.pk))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
