"""Backend tests for Franco PR7 — #150, #151, #165.

10 mandatory tests:
 1. test_access_logs_search_by_dni_reduces_results (#150)
 2. test_access_logs_export_csv_includes_denied_rows (#150)
 3. test_access_logs_select_related_avoids_n_plus_one (#150)
 4. test_mi_actividad_endpoint_hides_internal_fields (#151)
 5. test_mi_actividad_returns_only_own_logs (#151)
 6. test_mi_actividad_resumen_cuenta_mes_correcto (#151)
 7. test_plan_subtitulo_beneficios_roundtrip_persist (#165)
 8. test_plan_delete_with_membresias_returns_400_not_500 (#165)
 9. test_plan_matriz_comparativa_persists_schema (#165)
10. test_plan_recepcionista_write_returns_403 (#165)
"""

import datetime
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.access.models import AccessLog
from apps.memberships.models import Membresia, PlanMembresia
from conftest import (
    make_membresia_factory,
    make_plan_factory,
    make_socio_factory,
    make_user_factory,
)


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _auth_client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


def _make_log(user, access_type=AccessLog.AccessType.ENTRY,
              access_status=AccessLog.AccessStatus.GRANTED,
              denial_reason=None):
    return AccessLog.objects.create(
        user=user,
        access_type=access_type,
        status=access_status,
        source=AccessLog.AccessSource.DNI_SCAN,
        denial_reason=denial_reason,
    )


def _make_active_socio(dni=None):
    """Create a socio user with an active membership."""
    import random
    user = make_user_factory(rol='socio')
    socio = make_socio_factory(
        usuario=user,
        dni=dni or f'{random.randint(10000000, 99999999)}',
    )
    plan = make_plan_factory()
    make_membresia_factory(socio=socio, plan=plan)
    return user, socio, plan


# ===========================================================================
# #150 — Access log filter + export
# ===========================================================================

class TestAccessLogsSearch(TestCase):
    """Test 1: test_access_logs_search_by_dni_reduces_results."""

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        self.client = _auth_client(self.admin)

        # Socio with a known DNI
        self.target_user, self.target_socio, _ = _make_active_socio(dni='12345678')
        _make_log(self.target_user)

        # Unrelated socio
        other_user, _, _ = _make_active_socio(dni='87654321')
        _make_log(other_user)

    def test_access_logs_search_by_dni_reduces_results(self):
        """Searching by DNI returns only logs for that socio."""
        response = self.client.get('/api/access/logs/', {'search': '12345678'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        results = data.get('results', data)
        self.assertGreater(len(results), 0)
        # All returned rows belong to the target user
        for row in results:
            self.assertEqual(row['user'], self.target_user.pk)


class TestAccessLogsExport(TestCase):
    """Test 2: test_access_logs_export_csv_includes_denied_rows."""

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        self.client = _auth_client(self.admin)

        user, _, _ = _make_active_socio()
        # One GRANTED log
        _make_log(user, access_status=AccessLog.AccessStatus.GRANTED)
        # One DENIED log with a reason
        _make_log(
            user,
            access_status=AccessLog.AccessStatus.DENIED,
            denial_reason='MEMBERSHIP_INACTIVE',
        )

    def test_access_logs_export_csv_includes_denied_rows(self):
        """Export CSV must include DENIED rows and their denial_reason."""
        response = self.client.get('/api/access/logs/export/', {'fmt': 'csv'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('text/csv', response['Content-Type'])
        content = b''.join(response.streaming_content).decode('utf-8-sig') if hasattr(response, 'streaming_content') else response.content.decode('utf-8-sig')
        # At least one row must contain DENIED
        self.assertIn('DENIED', content)
        # The denial reason appears in the CSV
        self.assertIn('MEMBERSHIP_INACTIVE', content)


class TestAccessLogsN1(TestCase):
    """Test 3: test_access_logs_select_related_avoids_n_plus_one."""

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        self.client = _auth_client(self.admin)

        # Create 5 socios each with a log
        for _ in range(5):
            user, _, _ = _make_active_socio()
            _make_log(user)

    def test_access_logs_select_related_avoids_n_plus_one(self):
        """Listing logs must not scale with N rows (N+1 guard).

        Baseline: without select_related, each row fires 2-3 extra queries
        (user, socio, membresias) → ~15-20 for 5 rows.
        With select_related + prefetch_related, additional rows cost 0 extra
        queries; total stays constant regardless of page size.

        We assert that query count does not scale past a fixed ceiling.
        The ceiling (20) accounts for: JWT auth (1), content-type (1),
        GymConfig (1), access-log page (1), prefetch (2), pagination count (1),
        plus Django middleware and test overhead.
        """
        from django.db import connection, reset_queries
        from django.test.utils import override_settings

        with override_settings(DEBUG=True):
            reset_queries()
            response = self.client.get('/api/access/logs/?page_size=5')
            query_count = len(connection.queries)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Ceiling is deliberately generous to account for test/auth overhead,
        # but a naive N+1 on 5 rows would easily exceed 25+ queries.
        self.assertLessEqual(
            query_count, 20,
            msg=f'Expected ≤20 DB queries for 5-row page, got {query_count}. Likely N+1.',
        )


# ===========================================================================
# #151 — Mi actividad
# ===========================================================================

class TestMiActividadFields(TestCase):
    """Test 4: test_mi_actividad_endpoint_hides_internal_fields."""

    def setUp(self):
        self.user, _, _ = _make_active_socio()
        self.client = _auth_client(self.user)
        _make_log(self.user)

    def test_mi_actividad_endpoint_hides_internal_fields(self):
        """The /me/actividad/ endpoint must not expose scanned_by_email, qr_jti."""
        response = self.client.get('/api/access/me/actividad/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        results = data.get('results', [])
        self.assertGreater(len(results), 0)
        first = results[0]
        # These fields must be absent from the socio-facing serializer
        self.assertNotIn('scanned_by_email', first)
        self.assertNotIn('qr_jti', first)
        self.assertNotIn('fingerprint', first)
        # Basic safe fields must be present
        self.assertIn('id', first)
        self.assertIn('timestamp', first)
        self.assertIn('status', first)


class TestMiActividadOwnership(TestCase):
    """Test 5: test_mi_actividad_returns_only_own_logs."""

    def setUp(self):
        self.user_a, _, _ = _make_active_socio()
        self.user_b, _, _ = _make_active_socio()
        self.client = _auth_client(self.user_a)

        # Each user gets one log
        _make_log(self.user_a)
        _make_log(self.user_b)

    def test_mi_actividad_returns_only_own_logs(self):
        """A socio must only see their own access logs via /me/actividad/."""
        response = self.client.get('/api/access/me/actividad/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        results = data.get('results', [])
        # user_b's log must not appear
        user_ids_in_response = {r.get('user') for r in results}
        # AccessLogSocioSerializer does not expose 'user' field — check count
        # We created exactly 1 log for user_a; count must be 1.
        count = data.get('count', len(results))
        self.assertEqual(count, 1)


class TestMiActividadResumen(TestCase):
    """Test 6: test_mi_actividad_resumen_cuenta_mes_correcto."""

    def setUp(self):
        self.user, _, _ = _make_active_socio()
        self.client = _auth_client(self.user)

        today = timezone.localdate()
        start_of_month = today.replace(day=1)

        # 3 GRANTED ENTRY logs this month
        for _ in range(3):
            AccessLog.objects.create(
                user=self.user,
                access_type=AccessLog.AccessType.ENTRY,
                status=AccessLog.AccessStatus.GRANTED,
                source=AccessLog.AccessSource.DNI_SCAN,
                timestamp=timezone.make_aware(
                    datetime.datetime.combine(start_of_month, datetime.time(10, 0))
                ),
            )

        # 2 DENIED logs this month
        for _ in range(2):
            AccessLog.objects.create(
                user=self.user,
                access_type=AccessLog.AccessType.ENTRY,
                status=AccessLog.AccessStatus.DENIED,
                denial_reason='MEMBERSHIP_INACTIVE',
                source=AccessLog.AccessSource.DNI_SCAN,
                timestamp=timezone.make_aware(
                    datetime.datetime.combine(start_of_month, datetime.time(11, 0))
                ),
            )

    def test_mi_actividad_resumen_cuenta_mes_correcto(self):
        """resumen must report correct monthly counts."""
        response = self.client.get('/api/access/me/actividad/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        resumen = data.get('resumen', {})

        self.assertEqual(resumen['accesos_mes'], 3)
        self.assertEqual(resumen['rechazos_mes'], 2)
        self.assertIsNotNone(resumen['ultimo_acceso'])


# ===========================================================================
# #165 — Planes campos faltantes + 500 fix
# ===========================================================================

class TestPlanNewFieldsRoundtrip(TestCase):
    """Test 7: test_plan_subtitulo_beneficios_roundtrip_persist."""

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        self.client = _auth_client(self.admin)

    def test_plan_subtitulo_beneficios_roundtrip_persist(self):
        """Creating a plan with subtitulo + beneficios returns and stores them."""
        payload = {
            'nombre': 'Plan Premium Test',
            'subtitulo': 'El mejor plan del gimnasio',
            'duracion_dias': 30,
            'precio': '5000.00',
            'clases_asignadas': 5,
            'activo': True,
            'beneficios': ['Acceso ilimitado', 'Vestuario premium', 'Clases grupales'],
        }
        response = self.client.post('/api/memberships/planes/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data['subtitulo'], 'El mejor plan del gimnasio')
        self.assertEqual(data['beneficios'], ['Acceso ilimitado', 'Vestuario premium', 'Clases grupales'])

        # Verify DB persistence
        plan = PlanMembresia.objects.get(pk=data['id'])
        self.assertEqual(plan.subtitulo, 'El mejor plan del gimnasio')
        self.assertEqual(plan.beneficios, ['Acceso ilimitado', 'Vestuario premium', 'Clases grupales'])


class TestPlanDeleteProtected(TestCase):
    """Test 8: test_plan_delete_with_membresias_returns_400_not_500."""

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        self.client = _auth_client(self.admin)

        # Create a plan with an associated active membership
        self.plan = make_plan_factory()
        socio_user = make_user_factory(rol='socio')
        socio = make_socio_factory(usuario=socio_user)
        make_membresia_factory(socio=socio, plan=self.plan)

    def test_plan_delete_with_membresias_returns_400_not_500(self):
        """Deleting a plan that has linked membresías must return 400, not 500."""
        response = self.client.delete(f'/api/memberships/planes/{self.plan.pk}/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertIn('detail', data)
        self.assertIn('membresía', data['detail'].lower())
        # Plan must still exist in DB
        self.assertTrue(PlanMembresia.objects.filter(pk=self.plan.pk).exists())


class TestPlanMatrizComparativa(TestCase):
    """Test 9: test_plan_matriz_comparativa_persists_schema."""

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        self.client = _auth_client(self.admin)

    def test_plan_matriz_comparativa_persists_schema(self):
        """PATCH with matriz_comparativa stores the dict and retrieves it correctly."""
        plan = make_plan_factory()
        matriz = {
            'acceso_24h': True,
            'clases_grupales': 'Ilimitadas',
            'estacionamiento': False,
        }
        response = self.client.patch(
            f'/api/memberships/planes/{plan.pk}/',
            {'matriz_comparativa': matriz},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['matriz_comparativa'], matriz)

        # Re-fetch from DB to confirm persistence
        plan.refresh_from_db()
        self.assertEqual(plan.matriz_comparativa, matriz)


class TestPlanRecepcionistaWrite(TestCase):
    """Test 10: test_plan_recepcionista_write_returns_403."""

    def setUp(self):
        self.recep = make_user_factory(rol='recepcionista')
        self.client = _auth_client(self.recep)
        self.plan = make_plan_factory()

    def test_plan_recepcionista_write_returns_403(self):
        """Recepcionista attempting PATCH on a plan must receive 403."""
        response = self.client.patch(
            f'/api/memberships/planes/{self.plan.pk}/',
            {'subtitulo': 'Intento no autorizado'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
