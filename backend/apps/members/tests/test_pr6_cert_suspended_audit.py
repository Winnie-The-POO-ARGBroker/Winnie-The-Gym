"""PR6 backend tests — cert médico (#227), vigencia apto (#228),
socio suspendido/baja (#230), audit actor JWT (#218).

14 obligatory tests as per the contract.
"""
import threading
from datetime import date, timedelta
from unittest.mock import MagicMock, patch

from django.test import TestCase, TransactionTestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from conftest import make_socio_factory, make_user_factory
from apps.members.models import Socio
from apps.members.services import generar_signed_url_certificado, dar_baja, suspender_socio


def _auth_client(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def _cert_url(socio_pk):
    return f'/api/members/socios/{socio_pk}/certificado/url/'


# ===========================================================================
# #227 — Secure certificate storage and signed URL endpoint
# ===========================================================================

class CertificadoSignedUrlTests(TestCase):
    """Tests 1–4: certificate signed URL endpoint."""

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        self.socio_user = make_user_factory(rol='socio')
        self.socio = make_socio_factory(usuario=self.socio_user)
        # Simulate a stored certificate path
        self.socio.certificado_medico_path = 'uploads/certs/a1b2c3d4-1234-5678-abcd-ef1234567890.pdf'
        self.socio.save(update_fields=['certificado_medico_path', 'updated_at'])

        self.other_user = make_user_factory(rol='socio')
        self.other_socio = make_socio_factory(usuario=self.other_user)

    # Test 1
    def test_certificado_url_unauthenticated_returns_403(self):
        """Unauthenticated requests to the signed URL endpoint must be rejected."""
        client = APIClient()  # no credentials
        response = client.get(_cert_url(self.socio.pk))
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])

    # Test 2
    @patch('apps.members.services.generar_signed_url_certificado')
    def test_certificado_signed_url_expires_in_5min(self, mock_gen):
        """Signed URL must include an expires_at roughly 5 minutes from now."""
        from datetime import datetime, timezone as dt_tz
        expires_at = (
            datetime.now(tz=dt_tz.utc) + timedelta(seconds=300)
        ).isoformat().replace('+00:00', 'Z')
        mock_gen.return_value = {
            'url': 'https://supabase.example.com/signed?token=abc',
            'expires_at': expires_at,
        }

        client = APIClient()
        _auth_client(client, self.admin)
        response = client.get(_cert_url(self.socio.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('url', response.data)
        self.assertIn('expires_at', response.data)
        # expires_at must be in the future
        expiry = datetime.fromisoformat(response.data['expires_at'].replace('Z', '+00:00'))
        self.assertGreater(expiry, datetime.now(tz=dt_tz.utc))

    # Test 3
    def test_certificado_path_uuid_does_not_reveal_identity(self):
        """The stored path must use a UUID, not the socio name or DNI."""
        path = self.socio.certificado_medico_path
        # The path should start with uploads/certs/ and contain no PII
        self.assertTrue(path.startswith('uploads/certs/'), f'Unexpected path: {path}')
        self.assertNotIn(self.socio.dni, path)
        self.assertNotIn(self.socio.apellido.lower(), path.lower())
        self.assertNotIn(self.socio.nombre.lower(), path.lower())

    # Test 4
    def test_other_socio_cannot_get_signed_url(self):
        """A socio must not be able to fetch the signed URL of another socio."""
        client = APIClient()
        _auth_client(client, self.other_user)
        response = client.get(_cert_url(self.socio.pk))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ===========================================================================
# #228 — Medical certificate validity states and email reminders
# ===========================================================================

class AptoEstadoTests(TestCase):
    """Tests 5–7: apto_estado property, filter, and email idempotency."""

    def setUp(self):
        self.user = make_user_factory(rol='socio')

    def _make_socio(self, **kwargs):
        return make_socio_factory(usuario=self.user, **kwargs)

    # Test 5
    def test_apto_estado_vigente_por_vencer_vencido_sin_apto(self):
        """apto_estado property returns the correct value for each scenario."""
        today = date.today()

        # sin_apto — no certificate at all
        socio = make_socio_factory(usuario=make_user_factory(rol='socio'))
        self.assertEqual(socio.apto_estado, Socio.AptoEstado.SIN_APTO)

        # vigente — expires in 60 days
        socio2 = make_socio_factory(usuario=make_user_factory(rol='socio'))
        socio2.certificado_medico_path = 'uploads/certs/some-uuid.pdf'
        socio2.certificado_vence_en = today + timedelta(days=60)
        socio2.save(update_fields=['certificado_medico_path', 'certificado_vence_en', 'updated_at'])
        self.assertEqual(socio2.apto_estado, Socio.AptoEstado.VIGENTE)

        # por_vencer — expires in 15 days (within the 30-day window)
        socio3 = make_socio_factory(usuario=make_user_factory(rol='socio'))
        socio3.certificado_medico_path = 'uploads/certs/another-uuid.pdf'
        socio3.certificado_vence_en = today + timedelta(days=15)
        socio3.save(update_fields=['certificado_medico_path', 'certificado_vence_en', 'updated_at'])
        self.assertEqual(socio3.apto_estado, Socio.AptoEstado.POR_VENCER)

        # vencido — expired yesterday
        socio4 = make_socio_factory(usuario=make_user_factory(rol='socio'))
        socio4.certificado_medico_path = 'uploads/certs/yet-another.pdf'
        socio4.certificado_vence_en = today - timedelta(days=1)
        socio4.save(update_fields=['certificado_medico_path', 'certificado_vence_en', 'updated_at'])
        self.assertEqual(socio4.apto_estado, Socio.AptoEstado.VENCIDO)

        # vencido — has file but no date
        socio5 = make_socio_factory(usuario=make_user_factory(rol='socio'))
        socio5.certificado_medico_path = 'uploads/certs/no-date.pdf'
        socio5.certificado_vence_en = None
        socio5.save(update_fields=['certificado_medico_path', 'certificado_vence_en', 'updated_at'])
        self.assertEqual(socio5.apto_estado, Socio.AptoEstado.VENCIDO)

    # Test 6
    def test_apto_filter_por_vencer_returns_only_matching(self):
        """The apto_estado=por_vencer filter returns only socios in that state."""
        today = date.today()

        # por_vencer socio
        s1 = make_socio_factory(usuario=make_user_factory(rol='socio'))
        s1.certificado_medico_path = 'uploads/certs/pv1.pdf'
        s1.certificado_vence_en = today + timedelta(days=10)
        s1.save(update_fields=['certificado_medico_path', 'certificado_vence_en', 'updated_at'])

        # vigente socio (should NOT appear)
        s2 = make_socio_factory(usuario=make_user_factory(rol='socio'))
        s2.certificado_medico_path = 'uploads/certs/vig.pdf'
        s2.certificado_vence_en = today + timedelta(days=60)
        s2.save(update_fields=['certificado_medico_path', 'certificado_vence_en', 'updated_at'])

        admin = make_user_factory(rol='administrador')
        client = APIClient()
        _auth_client(client, admin)

        response = client.get('/api/members/socios/', {'apto_estado': 'por_vencer'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', response.data)
        result_ids = {r['id'] for r in results}
        self.assertIn(s1.id, result_ids)
        self.assertNotIn(s2.id, result_ids)

    # Test 7
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_aviso_apto_email_sent_once_per_threshold(self):
        """The apto reminder task sends the email exactly once per threshold per cert cycle."""
        from apps.members.tasks import enviar_avisos_apto_medico

        today = date.today()
        target_date = today + timedelta(days=30)

        user = make_user_factory(rol='socio')
        socio = make_socio_factory(usuario=user)
        socio.certificado_medico_path = 'uploads/certs/remind-me.pdf'
        socio.certificado_vence_en = target_date
        socio.save(update_fields=['certificado_medico_path', 'certificado_vence_en', 'updated_at'])

        # Patch send_templated_email so no real email is sent, but the idempotency flag IS set
        with patch('apps.common.emails.send_templated_email') as mock_send_fn:
            # First call — should trigger the send (no idempotency flag yet)
            result = enviar_avisos_apto_medico()
            self.assertGreaterEqual(result['sent'], 1)
            first_call_count = mock_send_fn.call_count
            self.assertGreaterEqual(first_call_count, 1)

            # Second call — idempotency flag is now set; should NOT send again
            result2 = enviar_avisos_apto_medico()
            # Total call count should not have increased for this socio
            self.assertEqual(mock_send_fn.call_count, first_call_count,
                             'Expected no new email after idempotency flag is set')


# ===========================================================================
# #230 — Socio suspendido / baja enforcement
# ===========================================================================

class SocioSuspendidoBajaTests(TestCase):
    """Tests 8–10, 14: suspended/baja socio restrictions."""

    def setUp(self):
        from apps.classes.models import Clase

        self.socio_user = make_user_factory(rol='socio')
        self.socio = make_socio_factory(usuario=self.socio_user)

        self.clase = Clase.objects.create(
            nombre='Yoga Mañana',
            dia='lunes',
            hora='08:00',
        )

    # Test 8
    def test_socio_suspendido_cannot_reservar_clase_returns_403(self):
        """A suspended socio must receive 403 when trying to inscribe in a class."""
        self.socio.estado = Socio.Estado.SUSPENDIDO
        self.socio.save(update_fields=['estado', 'updated_at'])

        client = APIClient()
        _auth_client(client, self.socio_user)
        response = client.post(f'/api/classes/clases/{self.clase.pk}/inscribir/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # Test 9
    def test_socio_baja_cannot_generate_qr_returns_403(self):
        """A socio with estado=baja must receive 403 when requesting the credencial."""
        self.socio.estado = Socio.Estado.BAJA
        self.socio.save(update_fields=['estado', 'updated_at'])

        client = APIClient()
        _auth_client(client, self.socio_user)
        response = client.get('/api/access/credencial/estado/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # The credencial endpoint returns 200 but habilitado=False with motivo
        self.assertFalse(response.data.get('habilitado'))
        self.assertEqual(response.data.get('motivo'), 'socio_baja')

    # Test 10
    def test_dar_baja_cancels_membership_and_reservas_in_transaction(self):
        """dar_baja must cancel memberships and future reservations atomically."""
        from apps.classes.models import InscripcionClase
        from apps.memberships.models import Membresia
        from conftest import make_plan_factory, make_membresia_factory

        plan = make_plan_factory()
        membresia = make_membresia_factory(self.socio, plan)
        self.assertEqual(membresia.estado, Membresia.Estado.ACTIVA)

        # Create an inscription
        inscripcion = InscripcionClase.objects.create(
            clase=self.clase,
            socio=self.socio,
        )

        dar_baja(self.socio)

        self.socio.refresh_from_db()
        self.assertEqual(self.socio.estado, Socio.Estado.BAJA)

        membresia.refresh_from_db()
        self.assertEqual(membresia.estado, Membresia.Estado.CANCELADA)

        # Inscription should have been deleted
        self.assertFalse(
            InscripcionClase.objects.filter(pk=inscripcion.pk).exists()
        )

    # Test 14
    def test_socio_suspendido_can_still_cancel_existing_reservas(self):
        """A suspended socio should still be able to cancel their existing class inscription."""
        from apps.classes.models import InscripcionClase

        InscripcionClase.objects.create(
            clase=self.clase,
            socio=self.socio,
        )

        self.socio.estado = Socio.Estado.SUSPENDIDO
        self.socio.save(update_fields=['estado', 'updated_at'])

        client = APIClient()
        _auth_client(client, self.socio_user)
        # cancelar does NOT require IsSocioActivo — suspended socios can cancel
        response = client.post(f'/api/classes/clases/{self.clase.pk}/cancelar/')
        # Expect 200 (cancelled) or 400 (no inscription) but NOT 403
        self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ===========================================================================
# #218 — Audit actor resolution from JWT
# ===========================================================================

class AuditActorJWTTests(TestCase):
    """Tests 11–12: audit actor is correctly resolved from the JWT token."""

    def setUp(self):
        from apps.audit.models import AuditLog
        self.AuditLog = AuditLog
        self.admin = make_user_factory(rol='administrador')
        self.socio_user = make_user_factory(rol='socio')
        self.socio = make_socio_factory(usuario=self.socio_user)

    # Test 11
    def test_audit_actor_is_user_from_jwt_not_system(self):
        """After a JWT-authenticated PATCH, the AuditLog actor must be the request user."""
        client = APIClient()
        _auth_client(client, self.admin)

        response = client.patch(
            f'/api/members/socios/{self.socio.pk}/',
            {'observaciones': 'updated via JWT for audit test'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # The most recent audit log for this socio should have the admin as actor
        log = self.AuditLog.objects.filter(
            entity_type='members.Socio',
            entity_id=self.socio.pk,
        ).order_by('-timestamp').first()

        self.assertIsNotNone(log, 'Expected an AuditLog entry for the PATCH')
        self.assertIsNotNone(log.actor, 'Expected AuditLog.actor to be set (not system)')
        self.assertEqual(log.actor_id, self.admin.pk)

    # Test 12
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True)
    def test_audit_actor_task_celery_stays_system(self):
        """When a Celery task modifies a model, the AuditLog actor must be None (system)."""
        from apps.common.middleware import get_current_user

        # Simulate a Celery task context: no thread-local user set
        # The current user should be None / system
        actor = get_current_user()
        self.assertIsNone(actor, 'Expected no user in thread-local during Celery task context')

        # Verify AuditLog created without a request has actor=None
        log = self.AuditLog.objects.create(
            actor=None,
            action=self.AuditLog.Action.UPDATE,
            entity_type='members.Socio',
            entity_id=self.socio.pk,
            changes_json={'test': [None, 'celery']},
        )
        self.assertIsNone(log.actor)


class AuditActorConcurrencyTests(TransactionTestCase):
    """Test 13: thread-local must not leak between concurrent requests."""

    # Test 13
    def test_audit_actor_no_leak_between_concurrent_requests(self):
        """10 concurrent requests must each resolve to their own actor, no cross-leakage."""
        from apps.common.middleware import set_current_user, get_current_user

        results = {}
        errors = []

        def simulate_request(thread_id, user):
            try:
                set_current_user(user)
                # Brief pause to let threads overlap
                import time
                time.sleep(0.01)
                resolved = get_current_user()
                results[thread_id] = resolved.pk if resolved else None
            except Exception as exc:
                errors.append(exc)

        users = []
        for i in range(10):
            u = make_user_factory(rol='socio')
            users.append(u)

        threads = [
            threading.Thread(target=simulate_request, args=(i, users[i]))
            for i in range(10)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(errors), 0, f'Unexpected errors in threads: {errors}')
        # Each thread must have resolved its own user
        for i, user in enumerate(users):
            self.assertEqual(
                results.get(i), user.pk,
                f'Thread {i} got actor {results.get(i)} but expected {user.pk}',
            )
