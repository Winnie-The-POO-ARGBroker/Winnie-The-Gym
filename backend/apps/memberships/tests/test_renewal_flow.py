import datetime

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.members.models import Socio
from apps.memberships.models import Membresia, PlanMembresia

User = get_user_model()

_counter = 0


def _make_user(email=None, rol='socio', **kwargs):
    global _counter
    _counter += 1
    if email is None:
        email = f'user{_counter}@renew.test'
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
        nombre='Renew',
        apellido='Socio',
        telefono='5491100000077',
    )


def _make_plan(nombre=None, duracion_dias=30, precio='5000.00', activo=True):
    global _counter
    _counter += 1
    if nombre is None:
        nombre = f'Plan Renew {_counter}'
    return PlanMembresia.objects.create(
        nombre=nombre,
        duracion_dias=duracion_dias,
        precio=precio,
        clases_asignadas=0,
        activo=activo,
    )


def _make_membresia(socio, plan, estado='activa', fecha_inicio=None):
    if fecha_inicio is None:
        fecha_inicio = datetime.date.today()
    fecha_fin = fecha_inicio + datetime.timedelta(days=plan.duracion_dias)
    return Membresia.objects.create(
        socio=socio,
        plan=plan,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        estado=estado,
    )


def _auth_client(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


RENEW_URL = '/api/memberships/me/renew/'


class RenewalHappyPathTests(APITestCase):

    def test_renewal_happy_path_201(self):
        user = _make_user(rol='socio')
        socio = _make_socio(user)
        plan_a = _make_plan(duracion_dias=30)
        plan_b = _make_plan(duracion_dias=365)
        old_membresia = _make_membresia(socio, plan_a)
        _auth_client(self.client, user)

        response = self.client.post(RENEW_URL, {'plan_id': plan_b.pk})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['estado'], 'activa')
        self.assertIn('plan', response.data)
        self.assertEqual(response.data['plan']['id'], plan_b.pk)

        old_membresia.refresh_from_db()
        self.assertEqual(old_membresia.estado, 'vencida')

        today = datetime.date.today()
        expected_fin = today + datetime.timedelta(days=365)
        self.assertEqual(response.data['fecha_inicio'], today.isoformat())
        self.assertEqual(response.data['fecha_fin'], expected_fin.isoformat())

    def test_renewal_no_prior_membership_201(self):
        user = _make_user(rol='socio')
        _make_socio(user)
        plan = _make_plan()
        _auth_client(self.client, user)

        response = self.client.post(RENEW_URL, {'plan_id': plan.pk})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['estado'], 'activa')
        self.assertEqual(Membresia.objects.count(), 1)


class RenewalErrorTests(APITestCase):

    def test_renewal_inactive_plan_404(self):
        user = _make_user(rol='socio')
        _make_socio(user)
        plan = _make_plan(activo=False)
        _auth_client(self.client, user)

        response = self.client.post(RENEW_URL, {'plan_id': plan.pk})

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_renewal_nonexistent_plan_404(self):
        user = _make_user(rol='socio')
        _make_socio(user)
        _auth_client(self.client, user)

        response = self.client.post(RENEW_URL, {'plan_id': 999999})

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_renewal_non_socio_403(self):
        recep = _make_user(rol='recepcionista')
        _auth_client(self.client, recep)

        response = self.client.post(RENEW_URL, {'plan_id': 1})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_renewal_unauthenticated_401(self):
        response = self.client.post(RENEW_URL, {'plan_id': 1})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
