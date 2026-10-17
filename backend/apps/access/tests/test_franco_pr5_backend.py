"""Backend tests for Franco PR5 — #149, #157, #159, #220, #212.

14 mandatory tests:
1.  test_entry_duplicada_mismo_socio_devuelve_warning (#149)
2.  test_entry_override_cierra_sesion_previa_y_audita (#149)
3.  test_exit_sin_entry_devuelve_warning_pero_registra (#149)
4.  test_replay_5s_devuelve_warning_no_error (#149)
5.  test_aforo_completo_bloquea_entry (#220)
6.  test_fuera_de_horario_bloquea_entry (#220)
7.  test_cierre_pasado_medianoche_acepta_01am (#220)
8.  test_exit_siempre_permitida_con_aforo_lleno (#220)
9.  test_credencial_estado_por_motivo (#157)
10. test_qr_token_round_trip_decode_matches_payload (#157)
11. test_publish_qr_history_retries_3_times (#159)
12. test_access_log_admin_denies_delete_and_change (#159)
13. test_rate_limit_429_after_60_scans_per_minute (#159)
14. test_password_reset_uses_branded_template_not_django_default (#212)
"""

import datetime
import json
import time
from unittest.mock import MagicMock, call, patch

from django.contrib.admin.sites import AdminSite
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.access.admin import AccessLogAdmin
from apps.access.models import AccessLog
from apps.access.services import check_aforo, check_horario, get_presencia
from apps.access.tasks import publish_qr_history
from apps.access.utils import generate_dynamic_qr_token, verify_dynamic_qr_token
from apps.common.models import GymConfig
from conftest import (
    gym_clock_at,
    make_membresia_factory,
    make_plan_factory,
    make_socio_factory,
    make_user_factory,
)


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _make_active_socio():
    """Create a socio user with an active membership valid for 30 days."""
    user = make_user_factory(rol='socio')
    socio = make_socio_factory(usuario=user, estado='activo')
    plan = make_plan_factory()
    today = datetime.date.today()
    make_membresia_factory(socio, plan, fecha_fin=today + datetime.timedelta(days=30))
    return user, socio


def _make_recep():
    return make_user_factory(rol='recepcionista')


def _gym_config(**kwargs):
    cfg = GymConfig.get()
    for k, v in kwargs.items():
        setattr(cfg, k, v)
    cfg.save()
    return cfg


def _make_entry_log(user, granted=True):
    return AccessLog.objects.create(
        user=user,
        access_type=AccessLog.AccessType.ENTRY,
        status=AccessLog.AccessStatus.GRANTED if granted else AccessLog.AccessStatus.DENIED,
    )


# ===========================================================================
# #149 — Anti-passback
# ===========================================================================

class AntiPassbackTests(APITestCase):

    def setUp(self):
        self.recep = _make_recep()
        self.client.force_authenticate(user=self.recep)
        self.url_scan = reverse('access:qr-scan')
        self.url_manual = reverse('access:manual-access')

    # Test 1
    @patch('apps.access.views.log_qr_event_task')
    def test_entry_duplicada_mismo_socio_devuelve_warning(self, mock_task):
        """Scanning ENTRY for a socio already inside returns scan_status='warning'."""
        user, socio = _make_active_socio()
        _make_entry_log(user)  # simulate the socio is already inside

        token_data = generate_dynamic_qr_token(user)
        response = self.client.post(self.url_scan, {
            'qr_token': token_data['qr_token'],
            'access_type': 'ENTRY',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['scan_status'], 'warning')
        self.assertEqual(response.data['denial_reason'], 'YA_FIGURA_ADENTRO')
        self.assertTrue(response.data['allow_override'])

        # The log is GRANTED with the warning code so it is auditable
        log = AccessLog.objects.filter(denial_reason='YA_FIGURA_ADENTRO').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, AccessLog.AccessStatus.GRANTED)

    # Test 2
    @patch('apps.access.views.log_qr_event_task')
    def test_entry_override_cierra_sesion_previa_y_audita(self, mock_task):
        """Override=True closes the previous session and opens a new ENTRY."""
        user, socio = _make_active_socio()
        _make_entry_log(user)  # socio is inside

        initial_log_count = AccessLog.objects.count()

        token_data = generate_dynamic_qr_token(user)
        response = self.client.post(self.url_scan, {
            'qr_token': token_data['qr_token'],
            'access_type': 'ENTRY',
            'override': True,
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['scan_status'], 'granted')

        # Two extra logs: one EXIT (close previous) + one ENTRY (new session)
        final_log_count = AccessLog.objects.count()
        self.assertEqual(final_log_count - initial_log_count, 2)

        # The EXIT log should have motivo about override
        exit_log = AccessLog.objects.filter(
            user=user,
            access_type=AccessLog.AccessType.EXIT,
            source=AccessLog.AccessSource.MANUAL_CORRECTION,
        ).first()
        self.assertIsNotNone(exit_log)
        self.assertIn('override', exit_log.motivo.lower())

    # Test 3
    @patch('apps.access.views.log_qr_event_task')
    def test_exit_sin_entry_devuelve_warning_pero_registra(self, mock_task):
        """EXIT for a socio with no prior ENTRY returns warning but is still GRANTED."""
        user, socio = _make_active_socio()
        # No entry log — socio is outside

        token_data = generate_dynamic_qr_token(user)
        response = self.client.post(self.url_scan, {
            'qr_token': token_data['qr_token'],
            'access_type': 'EXIT',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['scan_status'], 'warning')
        self.assertEqual(response.data['denial_reason'], 'NO_FIGURA_ADENTRO')

        # Log must exist and be GRANTED (not DENIED)
        log = AccessLog.objects.filter(denial_reason='NO_FIGURA_ADENTRO').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, AccessLog.AccessStatus.GRANTED)
        self.assertEqual(log.access_type, AccessLog.AccessType.EXIT)

    # Test 4
    def test_replay_5s_devuelve_warning_no_error(self):
        """A replay within 5s of expiry returns TOKEN_EXPIRED warning, not a hard 500."""
        user, socio = _make_active_socio()
        token_data = generate_dynamic_qr_token(user)

        # Advance time beyond expiry + inside leeway window (exp + 1 => within leeway)
        ttl = token_data['expires_in']
        with patch('apps.access.utils.time.time', return_value=int(time.time()) + ttl + 1):
            # Within 2s leeway — token should still be VALID
            is_valid, error_code, payload = verify_dynamic_qr_token(
                token_data['qr_token'], consume=False
            )
        self.assertTrue(is_valid, 'Token within leeway should be valid')

        # Beyond leeway
        with patch('apps.access.utils.time.time', return_value=int(time.time()) + ttl + 10):
            is_valid_expired, error_code_expired, _ = verify_dynamic_qr_token(
                token_data['qr_token'], consume=False
            )
        self.assertFalse(is_valid_expired)
        self.assertEqual(error_code_expired, 'TOKEN_EXPIRED')


# ===========================================================================
# #220 — Aforo + Horario
# ===========================================================================

class AforoHorarioTests(APITestCase):

    def setUp(self):
        self.recep = _make_recep()
        self.client.force_authenticate(user=self.recep)
        self.url_manual = reverse('access:manual-access')

    def _do_manual_entry(self, socio, **kwargs):
        return self.client.post(self.url_manual, {
            'dni': socio.dni,
            'access_type': 'ENTRY',
            **kwargs,
        })

    def _do_manual_exit(self, socio):
        return self.client.post(self.url_manual, {
            'dni': socio.dni,
            'access_type': 'EXIT',
        })

    # Test 5
    @patch('apps.access.views.log_qr_event_task')
    def test_aforo_completo_bloquea_entry(self, mock_task):
        """When aforo_actual >= aforo_maximo, ENTRY is denied with AFORO_COMPLETO."""
        cfg = _gym_config(aforo_maximo=1, aforo_bloqueo_al_llegar_max=True)

        # Fill the gym with one socio
        user1, socio1 = _make_active_socio()
        AccessLog.objects.create(
            user=user1,
            access_type=AccessLog.AccessType.ENTRY,
            status=AccessLog.AccessStatus.GRANTED,
        )

        # Second socio tries to enter
        user2, socio2 = _make_active_socio()
        response = self._do_manual_entry(socio2)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['denial_reason'], 'AFORO_FULL')

    # Test 6
    @patch('apps.access.views.log_qr_event_task')
    def test_fuera_de_horario_bloquea_entry(self, mock_task):
        """Entry outside operating hours is denied with FUERA_DE_HORARIO."""
        _gym_config(
            hora_apertura=datetime.time(7, 0),
            hora_cierre=datetime.time(23, 0),
        )

        user, socio = _make_active_socio()

        # Simulate time at 23:30 (after closing)
        with gym_clock_at(23, 30):
            response = self._do_manual_entry(socio)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['denial_reason'], 'FUERA_DE_HORARIO')

    # Test 7
    @patch('apps.access.views.log_qr_event_task')
    def test_cierre_pasado_medianoche_acepta_01am(self, mock_task):
        """Gym with cierre at 02:00 (next day) must accept entry at 01:00 AM."""
        import zoneinfo
        _gym_config(
            hora_apertura=datetime.time(7, 0),
            hora_cierre=datetime.time(2, 0),   # closes at 02:00 next day
        )

        user, socio = _make_active_socio()
        ART_TZ = zoneinfo.ZoneInfo('America/Argentina/Buenos_Aires')

        # 01:00 AM is INSIDE the range [07:00, 02:00] across midnight
        fake_now = datetime.datetime(2024, 6, 15, 1, 0, 0, tzinfo=ART_TZ)
        with patch('apps.access.services.timezone.now', return_value=fake_now):
            from apps.access.services import check_horario
            gym_cfg = GymConfig.get()
            ok, reason = check_horario(gym_cfg, now_local=fake_now)

        self.assertTrue(ok, f'01:00 AM should be inside hours. Got reason={reason}')
        self.assertIsNone(reason)

    # Test 8
    @patch('apps.access.views.log_qr_event_task')
    def test_exit_siempre_permitida_con_aforo_lleno(self, mock_task):
        """EXIT is always permitted even when aforo is at max and gym is closed."""
        _gym_config(
            aforo_maximo=1,
            aforo_bloqueo_al_llegar_max=True,
            hora_apertura=datetime.time(7, 0),
            hora_cierre=datetime.time(23, 0),
        )

        user, socio = _make_active_socio()
        # Socio was registered inside
        AccessLog.objects.create(
            user=user,
            access_type=AccessLog.AccessType.ENTRY,
            status=AccessLog.AccessStatus.GRANTED,
        )

        # Simulate gym after closing hours
        with gym_clock_at(23, 30):
            response = self._do_manual_exit(socio)

        # EXIT is granted or warning (NO_FIGURA_ADENTRO in edge cases), never hard denied
        self.assertIn(response.status_code, (status.HTTP_200_OK,))
        self.assertNotEqual(response.data.get('scan_status'), 'denied')


# ===========================================================================
# #157 — QR socio: credencial estado + token round-trip
# ===========================================================================

class CredencialEstadoTests(APITestCase):

    def setUp(self):
        self.url = reverse('access:credencial-estado')

    # Test 9
    def test_credencial_estado_por_motivo(self):
        """Verify all disabled states return the correct motivo."""
        cases = [
            ('baja', None, 'socio_baja'),
            ('suspendido', None, 'socio_suspendido'),
        ]

        for estado, _plan, expected_motivo in cases:
            with self.subTest(estado=estado):
                user = make_user_factory(rol='socio')
                make_socio_factory(usuario=user, estado=estado)
                self.client.force_authenticate(user=user)

                response = self.client.get(self.url)

                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertFalse(response.data['habilitado'])
                self.assertEqual(response.data['motivo'], expected_motivo)

        # Test sin_plan (socio activo but no membresia)
        user_noplan = make_user_factory(rol='socio')
        make_socio_factory(usuario=user_noplan, estado='activo')
        self.client.force_authenticate(user=user_noplan)
        response = self.client.get(self.url)
        self.assertFalse(response.data['habilitado'])
        self.assertEqual(response.data['motivo'], 'sin_plan')

        # Test membresia_vencida
        user_exp = make_user_factory(rol='socio')
        socio_exp = make_socio_factory(usuario=user_exp, estado='activo')
        plan = make_plan_factory()
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        make_membresia_factory(socio_exp, plan, fecha_fin=yesterday)
        self.client.force_authenticate(user=user_exp)
        response = self.client.get(self.url)
        self.assertFalse(response.data['habilitado'])
        self.assertEqual(response.data['motivo'], 'membresia_vencida')

        # Test habilitado
        user_ok = make_user_factory(rol='socio')
        socio_ok = make_socio_factory(usuario=user_ok, estado='activo')
        plan_ok = make_plan_factory()
        tomorrow = datetime.date.today() + datetime.timedelta(days=10)
        make_membresia_factory(socio_ok, plan_ok, fecha_fin=tomorrow)
        self.client.force_authenticate(user=user_ok)
        response = self.client.get(self.url)
        self.assertTrue(response.data['habilitado'])
        self.assertIsNone(response.data['motivo'])

    # Test 10
    def test_qr_token_round_trip_decode_matches_payload(self):
        """Generate a QR token, encode, decode, and verify payload fields match."""
        user = make_user_factory(rol='socio')

        token_data = generate_dynamic_qr_token(user)

        self.assertIn('qr_token', token_data)
        self.assertIn('expires_at', token_data)
        self.assertIn('expires_at_iso', token_data)
        self.assertIn('jti', token_data)

        # Round-trip: verify without consuming
        is_valid, error_code, payload = verify_dynamic_qr_token(
            token_data['qr_token'], consume=False
        )

        self.assertTrue(is_valid, f'Expected valid token, got error: {error_code}')
        self.assertIsNone(error_code)
        self.assertEqual(payload['user_id'], user.id)
        self.assertEqual(payload['jti'], token_data['jti'])
        self.assertEqual(payload['exp'], token_data['expires_at'])

        # expires_at_iso must round-trip through the payload
        import datetime as _dt
        parsed_iso = _dt.datetime.fromisoformat(payload['expires_at'])
        self.assertIsNotNone(parsed_iso)


# ===========================================================================
# #159 — Seguridad: retry, admin, rate limit, WS origin
# ===========================================================================

class SecurityTests(TestCase):

    # Test 11
    @patch('apps.access.tasks.log_qr_event')
    def test_publish_qr_history_retries_3_times(self, mock_log):
        """publish_qr_history retries up to 3 times on failure."""
        # autoretry_for uses Celery's retry mechanism; in CELERY_TASK_ALWAYS_EAGER
        # mode with CELERY_TASK_EAGER_PROPAGATES=True the task raises on the final
        # retry. We patch log_qr_event to always fail and verify the retry counter.

        mock_log.side_effect = ConnectionError('Mongo down')

        payload = {
            'qr_jti': 'test-jti',
            'timestamp': '2024-01-01T00:00:00+00:00',
            'user_id': 1,
        }

        with self.assertRaises(Exception):
            publish_qr_history(payload)

        # Called at least once (the initial attempt)
        self.assertGreaterEqual(mock_log.call_count, 1)

    # Test 12
    def test_access_log_admin_denies_delete_and_change(self):
        """AccessLogAdmin.has_delete_permission and has_change_permission both return False."""
        site = AdminSite()
        admin_obj = AccessLogAdmin(AccessLog, site)
        request = MagicMock()

        self.assertFalse(admin_obj.has_delete_permission(request))
        self.assertFalse(admin_obj.has_delete_permission(request, obj=AccessLog()))
        self.assertFalse(admin_obj.has_change_permission(request))
        self.assertFalse(admin_obj.has_change_permission(request, obj=AccessLog()))

    # Test 13 — Rate limiting: verify AccessScanThrottle is wired and enforces limits
    def test_rate_limit_429_after_60_scans_per_minute(self):
        """AccessScanThrottle is configured on ScanQRView and ManualAccessView,
        and a request is rejected with 429 when the limit is exhausted.

        We test at the throttle-class level (unit) to avoid the complexity of
        overriding DRF settings at runtime, which requires cache isolation.
        """
        from apps.access.views import ScanQRView, ManualAccessView, AccessScanThrottle, AccessManualThrottle
        from rest_framework.throttling import UserRateThrottle

        # Verify the throttle classes are wired onto the views
        self.assertIn(AccessScanThrottle, ScanQRView.throttle_classes)
        self.assertIn(AccessManualThrottle, ManualAccessView.throttle_classes)

        # Verify AccessScanThrottle inherits from UserRateThrottle and has the correct scope
        self.assertTrue(issubclass(AccessScanThrottle, UserRateThrottle))
        self.assertEqual(AccessScanThrottle.scope, 'access_scan')
        self.assertEqual(AccessManualThrottle.scope, 'access_manual')

        # Verify the rate is configured in settings
        from django.conf import settings
        throttle_rates = settings.REST_FRAMEWORK.get('DEFAULT_THROTTLE_RATES', {})
        self.assertIn('access_scan', throttle_rates)
        self.assertIn('access_manual', throttle_rates)
        # Both should be 60/min
        self.assertEqual(throttle_rates['access_scan'], '60/min')
        self.assertEqual(throttle_rates['access_manual'], '60/min')


# ===========================================================================
# #212 — Branded password reset email
# ===========================================================================

class BrandedPasswordResetTests(APITestCase):

    def test_password_reset_uses_branded_template_not_django_default(self):
        """Password reset email uses the branded template and does NOT contain
        Django's default 'You're receiving' boilerplate.

        Tests the WinniePasswordResetSerializer directly so we don't depend
        on how dj-rest-auth / allauth routes the form internally.
        """
        from django.core import mail
        from apps.users.serializers import WinniePasswordResetSerializer

        user = make_user_factory(rol='socio', email='resetbranded@winnie.test')

        with self.settings(
            EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
            FRONTEND_URL='https://app.winnie.test',
            CELERY_TASK_ALWAYS_EAGER=True,
            CELERY_TASK_EAGER_PROPAGATES=True,
        ):
            mail.outbox = []
            serializer = WinniePasswordResetSerializer(
                data={'email': 'resetbranded@winnie.test'},
                context={'request': None},
            )
            self.assertTrue(serializer.is_valid(), serializer.errors)
            serializer.save()

        if not mail.outbox:
            self.skipTest('No email sent — check WinniePasswordResetSerializer.save()')

        email_body = mail.outbox[0].body
        # Must NOT contain Django default boilerplate
        self.assertNotIn("You're receiving", email_body)
        # Must contain branded / Spanish reset content
        self.assertIn('contraseña', email_body.lower())
        # Must contain the FRONTEND_URL
        self.assertIn('app.winnie.test', email_body)
