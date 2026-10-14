"""
Tests for Franco PR 2 backend fixes:
  - #170: ClasePagination (page_size param + default)
  - #171: Inscripcion tri-state asistio + cerrar-asistencia action + socio 403 on PATCH
  - #173: Reserva validations (membresía vencida, plan no habilitado, concurrencia)
"""
import threading
from datetime import date, time, timedelta

import pytest
from django.test import TestCase, TransactionTestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.classes.models import Clase, InscripcionClase
from apps.memberships.models import Membresia, PlanMembresia
from conftest import (
    make_membresia_factory,
    make_plan_factory,
    make_socio_factory,
    make_user_factory,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_clase(**kwargs):
    defaults = dict(
        nombre='Test Clase',
        categoria='funcional',
        dia=Clase.Dia.LUNES,
        hora=time(9, 0),
        cupo_maximo=20,
        lista_espera_max=5,
        estado=Clase.Estado.ACTIVA,
    )
    defaults.update(kwargs)
    return Clase.objects.create(**defaults)


def _auth_client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


def _setup_socio_with_membresia(plan=None, estado_socio='activo',
                                 fecha_fin_offset=30, estado_membresia='activa'):
    user = make_user_factory(rol='socio')
    socio = make_socio_factory(usuario=user, estado=estado_socio)
    if plan is None:
        plan = make_plan_factory()
    fecha_inicio = date.today()
    fecha_fin = fecha_inicio + timedelta(days=fecha_fin_offset)
    make_membresia_factory(
        socio, plan,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        estado=estado_membresia,
    )
    return user, socio, plan


# ===========================================================================
# Fix #170 — Pagination
# ===========================================================================

class TestClasePagination(TestCase):
    """
    Test #1: test_clases_page_size_1000_returns_all
    Test #2: test_clases_default_page_size_10
    """

    def _admin_client(self):
        user = make_user_factory(rol='administrador')
        return _auth_client(user)

    def test_clases_page_size_1000_returns_all(self):
        """#170 — ?page_size=1000 returns all 25 clases."""
        for i in range(25):
            _make_clase(nombre=f'Clase {i}')

        client = self._admin_client()
        response = client.get('/api/classes/clases/?page_size=1000')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['count'], 25)
        self.assertEqual(len(data['results']), 25)

    def test_clases_default_page_size_10(self):
        """#170 — without page_size param, response is capped at 10."""
        for i in range(15):
            _make_clase(nombre=f'Clase Pag {i}')

        client = self._admin_client()
        response = client.get('/api/classes/clases/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertGreaterEqual(data['count'], 15)
        self.assertEqual(len(data['results']), 10)


# ===========================================================================
# Fix #171 — Tri-state asistio + cerrar-asistencia + 403 for socio PATCH
# ===========================================================================

class TestInscripcionTriState(TestCase):
    """
    Test #3: test_inscripcion_tri_state_null_present_absent
    Test #4: test_cerrar_asistencia_marks_nulls_as_absent
    Test #5: test_socio_cannot_patch_inscripcion_returns_403
    """

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        self.admin_client = _auth_client(self.admin)
        self.clase = _make_clase(cupo_maximo=10)

    def test_inscripcion_tri_state_null_present_absent(self):
        """#171 — asistio persists NULL, True, and False as distinct values."""
        socio1 = make_socio_factory(usuario=make_user_factory(rol='socio'))
        socio2 = make_socio_factory(usuario=make_user_factory(rol='socio'))
        socio3 = make_socio_factory(usuario=make_user_factory(rol='socio'))

        insc_null = InscripcionClase.objects.create(clase=self.clase, socio=socio1, asistio=None)
        insc_true = InscripcionClase.objects.create(clase=self.clase, socio=socio2, asistio=True)
        insc_false = InscripcionClase.objects.create(clase=self.clase, socio=socio3, asistio=False)

        insc_null.refresh_from_db()
        insc_true.refresh_from_db()
        insc_false.refresh_from_db()

        self.assertIsNone(insc_null.asistio)
        self.assertTrue(insc_true.asistio)
        self.assertFalse(insc_false.asistio)

    def test_cerrar_asistencia_marks_nulls_as_absent(self):
        """#171 — POST cerrar-asistencia converts all NULL asistio → False, returns summary."""
        socio_presente = make_socio_factory(usuario=make_user_factory(rol='socio'))
        socio_sin_marcar = make_socio_factory(usuario=make_user_factory(rol='socio'))

        InscripcionClase.objects.create(clase=self.clase, socio=socio_presente, asistio=True)
        insc_null = InscripcionClase.objects.create(clase=self.clase, socio=socio_sin_marcar, asistio=None)

        url = f'/api/classes/clases/{self.clase.pk}/cerrar-asistencia/'
        response = self.admin_client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['presentes'], 1)
        self.assertEqual(data['sin_marcar'], 0)
        self.assertGreaterEqual(data['ausentes'], 1)

        insc_null.refresh_from_db()
        self.assertFalse(insc_null.asistio)

    def test_socio_cannot_patch_inscripcion_returns_403(self):
        """#171 — PATCH /inscripciones/{id}/ returns 403 for a socio user."""
        socio_user = make_user_factory(rol='socio')
        socio = make_socio_factory(usuario=socio_user)
        insc = InscripcionClase.objects.create(clase=self.clase, socio=socio, asistio=None)

        socio_client = _auth_client(socio_user)
        url = f'/api/classes/inscripciones/{insc.pk}/'
        response = socio_client.patch(url, {'asistio': True}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ===========================================================================
# Fix #173 — Reserva validations
# ===========================================================================

class TestInscribirValidations(TestCase):
    """
    Test #6: test_inscribir_membresia_vencida_returns_400
    Test #7: test_inscribir_plan_no_habilitado_returns_400
    """

    def setUp(self):
        self.clase = _make_clase(cupo_maximo=1, lista_espera_max=2)

    def test_inscribir_membresia_vencida_returns_400(self):
        """#173 — Enrolling with an expired membership returns 400."""
        user = make_user_factory(rol='socio')
        socio = make_socio_factory(usuario=user, estado='activo')
        plan = make_plan_factory()
        # Expired: fecha_fin in the past
        yesterday = date.today() - timedelta(days=1)
        make_membresia_factory(
            socio, plan,
            fecha_inicio=date.today() - timedelta(days=30),
            fecha_fin=yesterday,
            estado='vencida',
        )

        client = _auth_client(user)
        response = client.post(f'/api/classes/clases/{self.clase.pk}/inscribir/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        detail = response.json().get('detail', '')
        self.assertIn('membresía', detail.lower())

    def test_inscribir_plan_no_habilitado_returns_400(self):
        """#173 — Enrolling when plan is not in planes_habilitados returns 400 with plan name."""
        plan_allowed = make_plan_factory(nombre='Plan Permitido')
        plan_other = make_plan_factory(nombre='Pase x8 Clases')

        # Clase only allows plan_allowed
        self.clase.planes_habilitados = [plan_allowed.id]
        self.clase.save(update_fields=['planes_habilitados'])

        user, socio, _ = _setup_socio_with_membresia(plan=plan_other)
        client = _auth_client(user)
        response = client.post(f'/api/classes/clases/{self.clase.pk}/inscribir/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        detail = response.json().get('detail', '')
        self.assertIn('Pase x8 Clases', detail)


class TestInscribirConcurrencySelectForUpdate(TransactionTestCase):
    """
    Test #8: test_inscribir_concurrent_respects_cupo_via_select_for_update

    Uses TransactionTestCase so threads can see committed data (TestCase wraps
    everything in a single rolled-back transaction that's invisible to threads).
    """

    def test_inscribir_concurrent_respects_cupo_via_select_for_update(self):
        """#173 — Two concurrent enrollments on a cupo=1 clase produce 1 confirmado + 1 espera."""
        clase = _make_clase(cupo_maximo=1, lista_espera_max=2)

        user1, socio1, plan1 = _setup_socio_with_membresia()
        user2, socio2, _ = _setup_socio_with_membresia(plan=plan1)

        results = []
        errors = []

        def do_enroll(socio):
            from apps.classes.services import inscribir_socio  # noqa: PLC0415
            try:
                insc = inscribir_socio(clase, socio)
                results.append(insc)
            except Exception as exc:
                errors.append(exc)

        t1 = threading.Thread(target=do_enroll, args=(socio1,))
        t2 = threading.Thread(target=do_enroll, args=(socio2,))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        self.assertEqual(len(results), 2, f'Expected 2 inscriptions, errors: {errors}')
        confirmed = [r for r in results if not r.en_espera]
        waiting = [r for r in results if r.en_espera]
        self.assertEqual(len(confirmed), 1, 'Exactly one socio should be confirmed')
        self.assertEqual(len(waiting), 1, 'Exactly one socio should be on waiting list')
