import datetime

from django.contrib.auth import get_user_model
from django.urls import reverse
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
        email = f'user{_counter}@me.test'
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
        apellido='Me',
        telefono='5491100000088',
    )


def _make_plan(nombre=None, duracion_dias=30, precio='5000.00', activo=True):
    global _counter
    _counter += 1
    if nombre is None:
        nombre = f'Plan Me {_counter}'
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


ME_URL = '/api/memberships/me/'
SOCIOS_URL = '/api/members/socios/'


class MeViewTests(APITestCase):

    def test_me_unauthenticated_401(self):
        response = self.client.get(ME_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_non_socio_role_403(self):
        recep = _make_user(rol='recepcionista')
        _auth_client(self.client, recep)

        response = self.client.get(ME_URL)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_me_socio_with_active_membership_200(self):
        user = _make_user(rol='socio')
        socio = _make_socio(user)
        plan = _make_plan()
        _make_membresia(socio, plan)
        _auth_client(self.client, user)

        response = self.client.get(ME_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        for field in ('id', 'numero_socio', 'nombre', 'apellido', 'estado'):
            self.assertIn(field, data)
        self.assertIn('membresia_activa', data)
        mem = data['membresia_activa']
        self.assertIsNotNone(mem)
        for field in ('id', 'fecha_inicio', 'fecha_fin', 'estado'):
            self.assertIn(field, mem)
        self.assertIn('plan', mem)
        plan_data = mem['plan']
        for field in ('id', 'nombre', 'duracion_dias', 'precio', 'clases_asignadas'):
            self.assertIn(field, plan_data)

    def test_me_socio_with_no_membership_200(self):
        user = _make_user(rol='socio')
        _make_socio(user)
        _auth_client(self.client, user)

        response = self.client.get(ME_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['membresia_activa'])

    def test_me_socio_cannot_access_socios_list_403(self):
        user = _make_user(rol='socio')
        _make_socio(user)
        _auth_client(self.client, user)

        response = self.client.get(SOCIOS_URL)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class UrlSmokeTests(APITestCase):
    """T-62: Verify all named URLs resolve without NoReverseMatch."""

    def test_named_urls_resolve(self):
        from django.urls import reverse, NoReverseMatch
        names = [
            'members:socio-list-create',
            'memberships:plan-list-create',
            'memberships:me',
            'memberships:me-renew',
        ]
        for name in names:
            try:
                url = reverse(name)
                self.assertIsNotNone(url)
            except NoReverseMatch as exc:
                self.fail(f"URL '{name}' did not resolve: {exc}")
