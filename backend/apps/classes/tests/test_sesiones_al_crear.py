"""A class created from the admin panel must show up in the calendar right away.

Sessions used to be generated only by the daily Celery beat job, so a class
published today had no SesionClase rows (and no calendar entry or booking for
members) until the next run.
"""
import datetime

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.classes.models import Clase, SesionClase
from apps.classes.services import SESIONES_VENTANA_DIAS
from conftest import make_user_factory

CLASES_URL = '/api/classes/clases/'


def _login(client, rol='administrador'):
    token = RefreshToken.for_user(make_user_factory(rol=rol)).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def _payload(**overrides):
    return {
        'nombre': 'Funcional Mañana',
        'categoria': 'funcional',
        'dia': 'lunes',
        'hora': '08:00',
        'duracion_min': 45,
        'sala': 'Sala A',
        'instructor': 'Carlos R.',
        'recurrencia': 'Semanal - L/M',
        'dias_recurrencia': ['L', 'M'],
        'cupo_maximo': 20,
        **overrides,
    }


class SesionesAlCrearTests(APITestCase):
    def setUp(self):
        _login(self.client)

    def _fechas(self, clase_id):
        return sorted(SesionClase.objects.filter(clase_id=clase_id).values_list('fecha', flat=True))

    def test_creating_a_class_generates_its_sessions_for_the_window(self):
        response = self.client.post(CLASES_URL, _payload(), format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.json())
        fechas = self._fechas(response.json()['id'])
        self.assertTrue(fechas, 'no sessions were generated')
        hoy = timezone.localdate()
        limite = hoy + datetime.timedelta(days=SESIONES_VENTANA_DIAS)
        self.assertTrue(all(hoy <= f <= limite for f in fechas))
        self.assertTrue(all(f.weekday() in (0, 1) for f in fechas), 'only Monday and Tuesday expected')

    def test_a_class_with_no_recurrence_days_uses_its_main_day(self):
        response = self.client.post(
            CLASES_URL,
            _payload(dia='viernes', dias_recurrencia=[], recurrencia='Semanal - V'),
            format='json',
        )

        fechas = self._fechas(response.json()['id'])
        self.assertTrue(fechas)
        self.assertTrue(all(f.weekday() == 4 for f in fechas))

    def test_adding_a_day_to_an_existing_class_adds_its_sessions(self):
        creada = self.client.post(CLASES_URL, _payload(dias_recurrencia=['L']), format='json').json()
        antes = len(self._fechas(creada['id']))

        response = self.client.patch(
            f"{CLASES_URL}{creada['id']}/", {'dias_recurrencia': ['L', 'V']}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.json())
        fechas = self._fechas(creada['id'])
        self.assertGreater(len(fechas), antes)
        self.assertIn(4, {f.weekday() for f in fechas})

    def test_a_failed_creation_generates_nothing(self):
        total = SesionClase.objects.count()

        response = self.client.post(CLASES_URL, _payload(instructor=''), format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(SesionClase.objects.count(), total)
        self.assertFalse(Clase.objects.filter(nombre='Funcional Mañana').exists())
