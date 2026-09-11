from datetime import datetime, time, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.classes.models import Clase, InscripcionClase
from conftest import make_socio_factory, make_user_factory


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def _cancel_url(clase_id):
    return f'/api/classes/clases/{clase_id}/cancelar/'


def _future_day_of_week(days_ahead=1):
    target = (timezone.localtime() + timedelta(days=days_ahead)).weekday()
    return [
        Clase.Dia.LUNES, Clase.Dia.MARTES, Clase.Dia.MIERCOLES, Clase.Dia.JUEVES,
        Clase.Dia.VIERNES, Clase.Dia.SABADO, Clase.Dia.DOMINGO,
    ][target]


class CancelInscripcionTests(APITestCase):
    """HU07 — cancelation flow: cutoff enforcement, refund of slot, wait-list promotion."""

    def setUp(self):
        self.socio_user = make_user_factory(email='cancelsocio@test.com', rol='socio')
        self.socio = make_socio_factory(self.socio_user)

    def _clase(self, **kwargs):
        defaults = dict(
            nombre='Yoga cancelable',
            dia=_future_day_of_week(2),
            hora=time(9, 0),
            cupo_maximo=1,
            lista_espera_max=2,
            cancelacion_horas=2,
        )
        defaults.update(kwargs)
        return Clase.objects.create(**defaults)

    def test_socio_cancels_own_reservation_successfully(self):
        clase = self._clase()
        InscripcionClase.objects.create(clase=clase, socio=self.socio, en_espera=False)
        _auth(self.client, self.socio_user)

        response = self.client.post(_cancel_url(clase.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['detail'], 'Inscripción cancelada.')
        self.assertFalse(
            InscripcionClase.objects.filter(clase=clase, socio=self.socio).exists()
        )

    def test_cancel_without_reservation_returns_400(self):
        clase = self._clase()
        _auth(self.client, self.socio_user)

        response = self.client.post(_cancel_url(clase.id))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancel_promotes_first_wait_listed_socio(self):
        clase = self._clase()
        other_user = make_user_factory(email='next@test.com', rol='socio')
        other_socio = make_socio_factory(other_user, dni='99999999')

        InscripcionClase.objects.create(clase=clase, socio=self.socio, en_espera=False)
        wait = InscripcionClase.objects.create(clase=clase, socio=other_socio, en_espera=True)
        _auth(self.client, self.socio_user)

        response = self.client.post(_cancel_url(clase.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['promovido_de_espera'])
        wait.refresh_from_db()
        self.assertFalse(wait.en_espera)

    def test_cancel_inside_cutoff_window_returns_400(self):
        # class starts very soon: schedule for today+1h, cancelacion_horas=48 (huge cutoff)
        now = timezone.localtime()
        tomorrow = now + timedelta(hours=1)
        clase = self._clase(
            dia=[
                Clase.Dia.LUNES, Clase.Dia.MARTES, Clase.Dia.MIERCOLES,
                Clase.Dia.JUEVES, Clase.Dia.VIERNES, Clase.Dia.SABADO, Clase.Dia.DOMINGO,
            ][tomorrow.weekday()],
            hora=time(tomorrow.hour, tomorrow.minute),
            cancelacion_horas=48,
        )
        InscripcionClase.objects.create(clase=clase, socio=self.socio, en_espera=False)
        _auth(self.client, self.socio_user)

        response = self.client.post(_cancel_url(clase.id))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('margen', str(response.data).lower())
