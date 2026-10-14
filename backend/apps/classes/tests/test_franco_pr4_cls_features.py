"""
Tests for Franco PR4 — CLS Features P1 (backend only).

Issues covered:
  #172 — Lista de espera: promover_de_espera atomic, email, manual action
  #174 — Cancelación: emails only on transition, waitlist notif, counter, read-only estado
  #175 — Serializer: cupo >= confirmados, overlap same sala, boxeo/hiit disciplines
  #177 — GET /inscripciones/mi-posicion/?clase_id=X
"""
from contextlib import contextmanager
from datetime import date, time, timedelta
from unittest.mock import call, patch

import pytest
from django.test import TestCase, TransactionTestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.classes.models import Clase, InscripcionClase
from apps.classes.services import cancelar_clase, promover_de_espera, reactivar_clase
from conftest import (
    make_membresia_factory,
    make_plan_factory,
    make_socio_factory,
    make_user_factory,
)


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def _make_clase(**kwargs):
    defaults = dict(
        nombre='Test Clase',
        categoria=Clase.Categoria.FUNCIONAL,
        dia=Clase.Dia.LUNES,
        hora=time(9, 0),
        duracion_min=60,
        cupo_maximo=2,
        lista_espera_max=3,
        sala='Sala A',
        estado=Clase.Estado.ACTIVA,
    )
    defaults.update(kwargs)
    return Clase.objects.create(**defaults)


def _make_socio_with_membresia(**kwargs):
    user = make_user_factory(rol='socio')
    socio = make_socio_factory(usuario=user, **kwargs)
    plan = make_plan_factory()
    make_membresia_factory(
        socio, plan,
        fecha_inicio=date.today(),
        fecha_fin=date.today() + timedelta(days=30),
        estado='activa',
    )
    return user, socio


@contextmanager
def immediate_on_commit():
    """Patch transaction.on_commit to execute callbacks immediately (TestCase safe)."""
    with patch('django.db.transaction.on_commit', side_effect=lambda fn: fn()):
        yield


# ===========================================================================
# #172 — Lista de espera
# ===========================================================================

class TestPromoverDeEspera(TestCase):
    """Tests for the promover_de_espera service and related paths."""

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        self.clase = _make_clase(cupo_maximo=1, lista_espera_max=2)

        _u1, self.socio1 = _make_socio_with_membresia()
        _u2, self.socio2 = _make_socio_with_membresia()

    # Test #1 — cancelación promueve + email
    def test_promover_de_espera_sends_email_on_cancel(self):
        """#172/#1 — promover_de_espera promotes next in line and enqueues promotion email."""
        # Fill cupo=1 with socio1, socio2 on wait
        InscripcionClase.objects.create(clase=self.clase, socio=self.socio1, en_espera=False)
        insc2 = InscripcionClase.objects.create(clase=self.clase, socio=self.socio2, en_espera=True)

        # Delete socio1 to free the slot
        InscripcionClase.objects.filter(clase=self.clase, socio=self.socio1).delete()

        with patch('apps.classes.services.enqueue_email') as mock_enqueue, \
             immediate_on_commit():
            promovido = promover_de_espera(self.clase)

        self.assertIsNotNone(promovido)
        self.assertEqual(promovido.socio, self.socio2)
        insc2.refresh_from_db()
        self.assertFalse(insc2.en_espera)
        mock_enqueue.assert_called_once()
        call_kwargs = mock_enqueue.call_args
        template = call_kwargs.kwargs.get('template_base') or (call_kwargs.args[0] if call_kwargs.args else None)
        self.assertEqual(template, 'promocion_espera')

    # Test #2 — action manual requires staff
    def test_promover_espera_manual_action_requires_staff(self):
        """#172/#2 — POST /clases/{id}/promover-espera/ returns 403 for socios."""
        socio_user, _ = _make_socio_with_membresia()
        client = APIClient()
        _auth(client, socio_user)

        url = f'/api/classes/clases/{self.clase.pk}/promover-espera/'
        response = client.post(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_promover_espera_manual_action_staff_ok(self):
        """#172 — Staff can call POST /clases/{id}/promover-espera/ to promote a socio."""
        insc2 = InscripcionClase.objects.create(clase=self.clase, socio=self.socio2, en_espera=True)
        # clase has cupo=1 and no confirmed — one slot free

        client = APIClient()
        _auth(client, self.admin)
        url = f'/api/classes/clases/{self.clase.pk}/promover-espera/'
        with patch('apps.classes.services.enqueue_email'), immediate_on_commit():
            response = client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['promovido'])
        insc2.refresh_from_db()
        self.assertFalse(insc2.en_espera)

    # Test #3 — PATCH cupo_maximo aumento promueve
    def test_increasing_cupo_promotes_waitlist(self):
        """#172/#3 — PATCH cupo_maximo to a larger value promotes wait-listed socios."""
        # Fill cupo=1 with socio1, socio2 on wait
        InscripcionClase.objects.create(clase=self.clase, socio=self.socio1, en_espera=False)
        insc2 = InscripcionClase.objects.create(clase=self.clase, socio=self.socio2, en_espera=True)

        client = APIClient()
        _auth(client, self.admin)
        url = f'/api/classes/clases/{self.clase.pk}/'

        with patch('apps.classes.services.enqueue_email'), immediate_on_commit():
            response = client.patch(url, {'cupo_maximo': 5}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        insc2.refresh_from_db()
        self.assertFalse(insc2.en_espera)


# ===========================================================================
# #174 — Cancelación de clase
# ===========================================================================

class TestCancelarClase(TestCase):
    """Tests for cancelar_clase service and related signal/view behavior."""

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        self.clase = _make_clase()
        _u1, self.socio1 = _make_socio_with_membresia()
        _u2, self.socio2 = _make_socio_with_membresia()

    # Test #4 — cancelar envía emails solo en transición, segundo save no envía
    def test_cancelar_clase_emits_emails_once_on_transition(self):
        """#174/#4 — Signal only sends emails on activa→cancelada; second save is idempotent."""
        InscripcionClase.objects.create(clase=self.clase, socio=self.socio1, en_espera=False)

        with patch('apps.classes.signals.enqueue_email') as mock_enqueue, \
             immediate_on_commit():
            cancelar_clase(self.clase, motivo='Motivo largo suficiente aquí.', actor=self.admin)

        first_call_count = mock_enqueue.call_count
        self.assertGreaterEqual(first_call_count, 1)

        # Second save on already-cancelled class — should NOT re-send emails
        with patch('apps.classes.signals.enqueue_email') as mock_enqueue2, \
             immediate_on_commit():
            self.clase.motivo_cancelacion = 'Actualización del motivo.'
            self.clase.save(update_fields=['motivo_cancelacion'])

        mock_enqueue2.assert_not_called()

    # Test #5 — cancelar notifica lista de espera
    def test_cancelar_clase_notifies_waitlist(self):
        """#174/#5 — Cancellation signal notifies both confirmed and wait-listed socios."""
        InscripcionClase.objects.create(clase=self.clase, socio=self.socio1, en_espera=False)
        InscripcionClase.objects.create(clase=self.clase, socio=self.socio2, en_espera=True)

        with patch('apps.classes.signals.enqueue_email') as mock_enqueue, \
             immediate_on_commit():
            cancelar_clase(self.clase, motivo='Motivo de cancelación largo y detallado.', actor=self.admin)

        # Should be called twice: once for confirmed, once for waitlist
        self.assertGreaterEqual(mock_enqueue.call_count, 2)

        templates_used = [
            (c.kwargs.get('template_base') or (c.args[0] if c.args else None))
            for c in mock_enqueue.call_args_list
        ]
        self.assertIn('clase_cancelada', templates_used)
        self.assertIn('clase_cancelada_espera', templates_used)

    # Test #6 — PUT estado=cancelada rechaza con 400
    def test_put_estado_cancelada_returns_400(self):
        """#174/#6 — PUT/PATCH with estado=cancelada returns 400."""
        client = APIClient()
        _auth(client, self.admin)
        url = f'/api/classes/clases/{self.clase.pk}/'

        # PATCH
        response = client.patch(url, {'estado': 'cancelada'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # PUT with full payload
        response = client.put(url, {
            'nombre': self.clase.nombre,
            'categoria': self.clase.categoria,
            'dia': self.clase.dia,
            'hora': '09:00',
            'duracion_min': self.clase.duracion_min,
            'sala': self.clase.sala,
            'instructor': self.clase.instructor,
            'cupo_maximo': self.clase.cupo_maximo,
            'lista_espera_max': self.clase.lista_espera_max,
            'cancelacion_horas': self.clase.cancelacion_horas,
            'estado': 'cancelada',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # Test #7 — counter retorna confirmados y espera
    def test_cancel_counter_returns_confirmados_and_espera(self):
        """#174/#7 — cancelar_clase returns correct notification counters."""
        InscripcionClase.objects.create(clase=self.clase, socio=self.socio1, en_espera=False)
        InscripcionClase.objects.create(clase=self.clase, socio=self.socio2, en_espera=True)

        with patch('apps.classes.signals.enqueue_email'), immediate_on_commit():
            counts = cancelar_clase(self.clase, motivo='Motivo de cancelación suficientemente largo.')

        self.assertEqual(counts['confirmados_notificados'], 1)
        self.assertEqual(counts['espera_notificados'], 1)

    def test_cancelar_clase_stores_cancelada_por(self):
        """#174 — cancelada_por FK is set to the actor user."""
        with patch('apps.classes.signals.enqueue_email'), immediate_on_commit():
            cancelar_clase(self.clase, motivo='El instructor está enfermo esta semana.', actor=self.admin)

        self.clase.refresh_from_db()
        self.assertEqual(self.clase.cancelada_por, self.admin)

    def test_reactivar_clase(self):
        """#174 — reactivar_clase resets estado, fecha_cancelacion, and cancelada_por."""
        with patch('apps.classes.signals.enqueue_email'), immediate_on_commit():
            cancelar_clase(self.clase, motivo='Motivo temporal de prueba aquí.', actor=self.admin)

        reactivar_clase(self.clase)
        self.clase.refresh_from_db()
        self.assertEqual(self.clase.estado, Clase.Estado.ACTIVA)
        self.assertIsNone(self.clase.fecha_cancelacion)
        self.assertIsNone(self.clase.cancelada_por)


# ===========================================================================
# #175 — Serializer validations
# ===========================================================================

class TestClaseSerializerValidations(TestCase):
    """Tests for ClaseSerializer.validate — cupo, overlap, disciplines."""

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        self.client = APIClient()
        _auth(self.client, self.admin)
        self.clase = _make_clase(cupo_maximo=5, sala='Sala B')

    def _payload(self, **overrides):
        base = {
            'nombre': 'Nueva clase',
            'categoria': 'funcional',
            'dia': 'lunes',
            'hora': '10:00',
            'duracion_min': 60,
            'sala': 'Sala C',
            'instructor': 'Test',
            'cupo_maximo': 10,
            'lista_espera_max': 2,
            'cancelacion_horas': 2,
        }
        base.update(overrides)
        return base

    # Test #8 — cupo < inscriptos rechaza
    def test_cupo_cannot_be_less_than_confirmados(self):
        """#175/#8 — PATCH cupo_maximo below confirmed count returns 400."""
        _u1, socio1 = _make_socio_with_membresia()
        _u2, socio2 = _make_socio_with_membresia()
        InscripcionClase.objects.create(clase=self.clase, socio=socio1, en_espera=False)
        InscripcionClase.objects.create(clase=self.clase, socio=socio2, en_espera=False)

        url = f'/api/classes/clases/{self.clase.pk}/'
        response = self.client.patch(url, {'cupo_maximo': 1}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cupo_maximo', response.data)

    # Test #9 — solapamiento rechaza
    def test_overlapping_classes_same_sala_rejected(self):
        """#175/#9 — Creating a class that overlaps another in the same sala returns 400."""
        # Existing class: Sala B, lunes 09:00–10:00
        _make_clase(sala='Sala B', dia='lunes', hora=time(9, 0), duracion_min=60)

        # Try to create overlapping: 09:30–10:30 in Sala B on lunes
        response = self.client.post(
            '/api/classes/clases/',
            self._payload(sala='Sala B', dia='lunes', hora='09:30', duracion_min=60),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('hora', str(response.data))

    # Test #10 — boxeo/hiit aceptan
    def test_boxeo_and_hiit_disciplines_accepted(self):
        """#175/#10 — Creating classes with boxeo and hiit categories succeeds."""
        for categoria in ('boxeo', 'hiit'):
            response = self.client.post(
                '/api/classes/clases/',
                self._payload(nombre=f'Clase {categoria}', categoria=categoria, sala=f'Sala {categoria}'),
                format='json',
            )
            self.assertEqual(
                response.status_code, status.HTTP_201_CREATED,
                f'Expected 201 for categoria={categoria}, got {response.status_code}: {response.data}',
            )


# ===========================================================================
# #177 — Posición en espera
# ===========================================================================

class TestMiPosicionEspera(TestCase):
    """Tests for GET /inscripciones/mi-posicion/?clase_id=X."""

    def setUp(self):
        self.clase = _make_clase(cupo_maximo=1, lista_espera_max=5)

        # Fill cupo with a user we don't test with
        _u0, socio0 = _make_socio_with_membresia()
        InscripcionClase.objects.create(clase=self.clase, socio=socio0, en_espera=False)

        # Three socios on waitlist in order
        self.u1, self.socio1 = _make_socio_with_membresia()
        self.u2, self.socio2 = _make_socio_with_membresia()
        self.u3, self.socio3 = _make_socio_with_membresia()

        InscripcionClase.objects.create(clase=self.clase, socio=self.socio1, en_espera=True)
        InscripcionClase.objects.create(clase=self.clase, socio=self.socio2, en_espera=True)
        InscripcionClase.objects.create(clase=self.clase, socio=self.socio3, en_espera=True)

    # Test #11 — posición correcta
    def test_mi_posicion_espera_returns_correct_number(self):
        """#177/#11 — GET mi-posicion returns the correct 1-based position for each socio."""
        url = f'/api/classes/inscripciones/mi-posicion/?clase_id={self.clase.pk}'

        # socio3 should be at position 3
        client = APIClient()
        _auth(client, self.u3)
        response = client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['posicion_en_espera'], 3)

    def test_mi_posicion_first_in_line(self):
        """#177 — First socio in wait-list returns position 1."""
        url = f'/api/classes/inscripciones/mi-posicion/?clase_id={self.clase.pk}'

        client = APIClient()
        _auth(client, self.u1)
        response = client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['posicion_en_espera'], 1)

    def test_mi_posicion_not_on_waitlist_returns_null(self):
        """#177 — Socio not on waitlist gets posicion_en_espera: null."""
        _u_new, _socio_new = _make_socio_with_membresia()
        url = f'/api/classes/inscripciones/mi-posicion/?clase_id={self.clase.pk}'

        client = APIClient()
        _auth(client, _u_new)
        response = client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['posicion_en_espera'])

    def test_mi_posicion_requires_clase_id_param(self):
        """#177 — Missing clase_id returns 400."""
        client = APIClient()
        _auth(client, self.u1)
        response = client.get('/api/classes/inscripciones/mi-posicion/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mi_posicion_requires_socio_role(self):
        """#177 — Staff cannot use mi-posicion (403)."""
        admin = make_user_factory(rol='administrador')
        client = APIClient()
        _auth(client, admin)
        response = client.get(f'/api/classes/inscripciones/mi-posicion/?clase_id={self.clase.pk}')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
