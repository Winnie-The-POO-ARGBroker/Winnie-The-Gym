"""REQ-3.4 — Soft-cancel clases: state, emails, default queryset filtering."""
from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.classes.models import Clase, InscripcionClase
from conftest import make_socio_factory, make_user_factory


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def _cancelar_url(clase_id):
    return f'/api/classes/clases/{clase_id}/cancelar-clase/'


def _lista_url():
    return '/api/classes/clases/'


def _make_clase(**kwargs):
    defaults = dict(
        nombre='Funcional Mañana',
        categoria='funcional',
        dia='lunes',
        instructor='Prof. García',
    )
    defaults.update(kwargs)
    return Clase.objects.create(**defaults)


class SoftCancelClaseTests(APITestCase):
    def setUp(self):
        self.admin = make_user_factory(email='admin@cancel.test', rol='administrador')
        self.recep = make_user_factory(email='recep@cancel.test', rol='recepcionista')

        self.user_socio = make_user_factory(email='socio@cancel.test', rol='socio')
        self.socio = make_socio_factory(self.user_socio, apellido='Test')

        self.clase = _make_clase()

    # ── Soft-cancel mechanics ──

    def test_cancelar_clase_soft(self):
        """Staff can soft-cancel a class — status changes to 'cancelada'."""
        _auth(self.client, self.admin)
        response = self.client.post(
            _cancelar_url(self.clase.id),
            {'motivo': 'Instructor enfermo, se reprograma la semana que viene.'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.clase.refresh_from_db()
        self.assertEqual(self.clase.estado, Clase.Estado.CANCELADA)
        self.assertIsNotNone(self.clase.fecha_cancelacion)
        self.assertEqual(
            self.clase.motivo_cancelacion,
            'Instructor enfermo, se reprograma la semana que viene.',
        )

    def test_cancelar_motivo_too_short_returns_400(self):
        """Motivo shorter than 10 characters should return 400."""
        _auth(self.client, self.admin)
        response = self.client.post(
            _cancelar_url(self.clase.id),
            {'motivo': 'Corto'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)

    def test_socio_cannot_cancelar_clase(self):
        """Socios get 403 when trying to cancel a class."""
        _auth(self.client, self.user_socio)
        response = self.client.post(
            _cancelar_url(self.clase.id),
            {'motivo': 'No debería poder hacer esto.'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.data)

    def test_recep_can_cancelar_clase(self):
        """Recepcionista can also soft-cancel."""
        _auth(self.client, self.recep)
        response = self.client.post(
            _cancelar_url(self.clase.id),
            {'motivo': 'Mantenimiento del salón, se cancela la clase.'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

    # ── Email signal ──

    def test_cancelar_dispara_emails(self):
        """Cancelling a class with enrolled socios enqueues emails for each."""
        # Enroll the test socio
        InscripcionClase.objects.create(clase=self.clase, socio=self.socio)

        with patch('apps.classes.signals.enqueue_email') as mock_enqueue:
            _auth(self.client, self.admin)
            self.client.post(
                _cancelar_url(self.clase.id),
                {'motivo': 'Instructor enfermo, cancelación de emergencia.'},
                format='json',
            )

        mock_enqueue.assert_called_once()
        call_kwargs = mock_enqueue.call_args
        # Accept both positional and keyword style
        args, kwargs = call_kwargs
        template = kwargs.get('template_base') or (args[0] if args else None)
        self.assertEqual(template, 'clase_cancelada')

    def test_cancelar_sin_inscriptos_no_emails(self):
        """Cancelling a class with no enrollees does not enqueue any email."""
        with patch('apps.classes.signals.enqueue_email') as mock_enqueue:
            _auth(self.client, self.admin)
            self.client.post(
                _cancelar_url(self.clase.id),
                {'motivo': 'Clase vacía, se cancela preventivamente.'},
                format='json',
            )
        mock_enqueue.assert_not_called()

    # ── Queryset filtering ──

    def test_get_clases_excluye_canceladas_por_default(self):
        """Cancelled classes are hidden from the default list."""
        # Cancel the existing class first
        _auth(self.client, self.admin)
        self.client.post(
            _cancelar_url(self.clase.id),
            {'motivo': 'Cancelada para test de filtro, motivo largo suficiente.'},
            format='json',
        )

        # Create a fresh active one
        activa = _make_clase(nombre='Activa Yoga')

        response = self.client.get(_lista_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        ids = [c['id'] for c in results]
        self.assertNotIn(self.clase.id, ids, 'Cancelled class should be excluded by default')
        self.assertIn(activa.id, ids, 'Active class should be present')

    def test_get_clases_incluye_canceladas_con_param(self):
        """With ?incluir_canceladas=true, cancelled classes are included."""
        _auth(self.client, self.admin)
        self.client.post(
            _cancelar_url(self.clase.id),
            {'motivo': 'Cancelada para test de filtro con param incluir.'},
            format='json',
        )

        response = self.client.get(_lista_url() + '?incluir_canceladas=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        ids = [c['id'] for c in results]
        self.assertIn(self.clase.id, ids)
