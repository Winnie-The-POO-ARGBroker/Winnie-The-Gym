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
        email = f'user{_counter}@membresias.test'
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
        nombre='Test',
        apellido='Socio',
        telefono='5491100000099',
    )


def _make_plan(nombre=None, duracion_dias=30, precio='5000.00', activo=True):
    global _counter
    _counter += 1
    if nombre is None:
        nombre = f'Plan {_counter}'
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


MEMBRESIAS_URL = '/api/memberships/membresias/'


def _detail_url(pk):
    return f'/api/memberships/membresias/{pk}/'


class MembresiaCreateTests(APITestCase):

    def test_create_membresia_admin_201(self):
        admin = _make_user(rol='administrador')
        user = _make_user()
        socio = _make_socio(user)
        plan = _make_plan(duracion_dias=30)
        _auth_client(self.client, admin)

        fecha_inicio = datetime.date(2026, 8, 19)
        payload = {
            'socio': socio.pk,
            'plan': plan.pk,
            'fecha_inicio': '2026-08-19',
        }
        response = self.client.post(MEMBRESIAS_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['fecha_fin'], '2026-09-18')
        self.assertEqual(response.data['estado'], 'activa')

    def test_fecha_fin_computed_client_value_ignored(self):
        admin = _make_user(rol='administrador')
        user = _make_user()
        socio = _make_socio(user)
        plan = _make_plan(duracion_dias=30)
        _auth_client(self.client, admin)

        payload = {
            'socio': socio.pk,
            'plan': plan.pk,
            'fecha_inicio': '2026-08-19',
            'fecha_fin': '2099-12-31',
        }
        response = self.client.post(MEMBRESIAS_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['fecha_fin'], '2026-09-18')

    def test_estado_not_writable_on_create(self):
        admin = _make_user(rol='administrador')
        user = _make_user()
        socio = _make_socio(user)
        plan = _make_plan(duracion_dias=30)
        _auth_client(self.client, admin)

        payload = {
            'socio': socio.pk,
            'plan': plan.pk,
            'fecha_inicio': '2026-08-19',
            'estado': 'vencida',
        }
        response = self.client.post(MEMBRESIAS_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['estado'], 'activa')

    def test_unauthenticated_401(self):
        response = self.client.post(MEMBRESIAS_URL, {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MembresiaUpdateTests(APITestCase):

    def test_patch_estado_valid_values_200(self):
        admin = _make_user(rol='administrador')
        user = _make_user()
        socio = _make_socio(user)
        plan = _make_plan()
        membresia = _make_membresia(socio, plan)
        _auth_client(self.client, admin)

        for estado in ('vencida', 'suspendida', 'cancelada'):
            membresia.estado = 'activa'
            membresia.save()
            response = self.client.patch(_detail_url(membresia.pk), {'estado': estado})
            self.assertEqual(response.status_code, status.HTTP_200_OK, msg=f'estado={estado}')

    def test_patch_estado_pendiente_pago_400(self):
        admin = _make_user(rol='administrador')
        user = _make_user()
        socio = _make_socio(user)
        plan = _make_plan()
        membresia = _make_membresia(socio, plan)
        _auth_client(self.client, admin)

        response = self.client.patch(_detail_url(membresia.pk), {'estado': 'pendiente_pago'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('estado', response.data)


class MembresiaRetrieveTests(APITestCase):

    def test_retrieve_includes_nested_plan(self):
        admin = _make_user(rol='administrador')
        user = _make_user()
        socio = _make_socio(user)
        plan = _make_plan()
        membresia = _make_membresia(socio, plan)
        _auth_client(self.client, admin)

        response = self.client.get(_detail_url(membresia.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('plan', response.data)
        plan_data = response.data['plan']
        for field in ('nombre', 'duracion_dias', 'precio', 'clases_asignadas'):
            self.assertIn(field, plan_data)

    def test_list_membresias_admin_200(self):
        admin = _make_user(rol='administrador')
        user = _make_user()
        socio = _make_socio(user)
        plan = _make_plan()
        _make_membresia(socio, plan)
        _auth_client(self.client, admin)

        response = self.client.get(MEMBRESIAS_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_membresias_socio_403(self):
        socio_user = _make_user(rol='socio')
        _auth_client(self.client, socio_user)

        response = self.client.get(MEMBRESIAS_URL)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
