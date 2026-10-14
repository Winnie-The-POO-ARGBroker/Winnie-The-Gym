"""Backend tests for PR9 — #155 aforo historico, #158 plan horario."""
import datetime

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.access.models import AccessLog
from apps.access.services import check_horario_plan
from apps.common.models import GymConfig
from conftest import make_membresia_factory, make_plan_factory, make_socio_factory, make_user_factory


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


# ---------------------------------------------------------------------------
# #155 — Aforo histórico
# ---------------------------------------------------------------------------

class AforoHistoricoTests(APITestCase):
    """Tests #4 and #5."""

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')

    def test_aforo_historico_rango_mayor_92_dias_rechaza(self):
        """Test #4 — Request with range > 92 days returns 400."""
        _auth(self.client, self.admin)
        desde = '2026-01-01'
        hasta = '2026-05-01'  # ~120 days
        response = self.client.get(
            '/api/access/aforo/historico/',
            {'desde': desde, 'hasta': hasta, 'granularidad': 'dia'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('92', response.data['detail'])

    def test_aforo_historico_heatmap_identifica_pico(self):
        """Test #5 — Heatmap correctly identifies the hour with most traffic.

        Creates 5 ENTRY logs at hour 19 and 1 at hour 10, then asserts that the
        heatmap hour_19 bucket for that weekday has a higher value than hour_10.
        Uses Django's TIME_ZONE setting to determine expected weekday key.
        """
        user = make_user_factory(rol='socio', email='loguser@test.com')

        # Use the same timezone the view uses for heatmap bucketing
        tz = timezone.get_current_timezone()
        now_local = timezone.now().astimezone(tz)

        # We'll store logs at the exact current local hour=19 and hour=10 on today
        # This avoids day-boundary issues between UTC storage and local display.
        peak_ts = now_local.replace(hour=19, minute=30, second=0, microsecond=0)
        low_ts = now_local.replace(hour=10, minute=0, second=0, microsecond=0)

        # AccessLog.timestamp uses auto_now_add=True, which overrides any
        # timestamp passed to create(). Insert the rows and then update the
        # timestamp with queryset .update() to bypass the auto_now_add path.
        peak_ids = []
        for _ in range(5):
            log = AccessLog.objects.create(
                user=user,
                access_type=AccessLog.AccessType.ENTRY,
                status=AccessLog.AccessStatus.GRANTED,
            )
            peak_ids.append(log.id)
        AccessLog.objects.filter(id__in=peak_ids).update(timestamp=peak_ts)

        low_log = AccessLog.objects.create(
            user=user,
            access_type=AccessLog.AccessType.ENTRY,
            status=AccessLog.AccessStatus.GRANTED,
        )
        AccessLog.objects.filter(id=low_log.id).update(timestamp=low_ts)

        _auth(self.client, self.admin)
        desde = (now_local - datetime.timedelta(days=3)).date().isoformat()
        hasta = now_local.date().isoformat()
        response = self.client.get(
            '/api/access/aforo/historico/',
            {'desde': desde, 'hasta': hasta, 'granularidad': 'hora'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        heatmap = response.data['heatmap']

        # Determine expected keys from actual local weekday of stored timestamps
        day_names = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']
        peak_local = peak_ts.astimezone(tz)
        dow = peak_local.weekday()
        day_name = day_names[dow]
        peak_key = f'{day_name}_19'
        low_key = f'{day_name}_10'

        self.assertIn(peak_key, heatmap, f'Expected {peak_key} in heatmap, got: {heatmap}')
        self.assertGreater(
            heatmap.get(peak_key, 0),
            heatmap.get(low_key, 0),
            f'{peak_key} should have more entries than {low_key}',
        )


# ---------------------------------------------------------------------------
# #158 — Plan horario / día restrictions
# ---------------------------------------------------------------------------

class CheckHorarioPlanTests(TestCase):
    """Tests #6, #7, and #8."""

    def setUp(self):
        self.user = make_user_factory(rol='socio', email='plantest@test.com')
        self.socio = make_socio_factory(self.user)
        self.plan = make_plan_factory(nombre='Matutino', precio='800.00', duracion_dias=30)

    def _now_at(self, hour, minute, weekday=0):
        """Build a datetime in ART at the given hour/minute on a weekday (0=Mon)."""
        import zoneinfo
        tz = zoneinfo.ZoneInfo('America/Argentina/Buenos_Aires')
        today = datetime.date.today()
        # Move to the target weekday
        days_delta = (weekday - today.weekday()) % 7
        target_date = today + datetime.timedelta(days=days_delta)
        return datetime.datetime(
            target_date.year, target_date.month, target_date.day,
            hour, minute, tzinfo=tz,
        )

    def test_plan_fuera_de_horario_bloquea_entry(self):
        """Test #6 — Plan with franja 07-12 rejects access at 18:00."""
        self.plan.franja_desde = datetime.time(7, 0)
        self.plan.franja_hasta = datetime.time(12, 0)
        self.plan.save()

        now_18h = self._now_at(18, 0)
        ok, reason = check_horario_plan(self.socio, self.plan, now_local=now_18h)

        self.assertFalse(ok)
        self.assertEqual(reason, 'PLAN_FUERA_DE_HORARIO')

    def test_plan_dentro_de_horario_permite_entry(self):
        """Plan with franja 07-12 allows access at 09:00."""
        self.plan.franja_desde = datetime.time(7, 0)
        self.plan.franja_hasta = datetime.time(12, 0)
        self.plan.save()

        now_9h = self._now_at(9, 0)
        ok, reason = check_horario_plan(self.socio, self.plan, now_local=now_9h)

        self.assertTrue(ok)
        self.assertIsNone(reason)

    def test_plan_dia_no_habilitado_bloquea_entry(self):
        """Test #7 — Plan with only Tuesday enabled rejects Monday access."""
        self.plan.dias_habilitados = ['mar']
        self.plan.save()

        # Monday = weekday 0
        now_monday = self._now_at(10, 0, weekday=0)
        ok, reason = check_horario_plan(self.socio, self.plan, now_local=now_monday)

        self.assertFalse(ok)
        self.assertEqual(reason, 'PLAN_DIA_NO_HABILITADO')

    def test_plan_dia_habilitado_permite_entry(self):
        """Plan with only Tuesday allows Tuesday access."""
        self.plan.dias_habilitados = ['mar']
        self.plan.save()

        # Tuesday = weekday 1
        now_tuesday = self._now_at(10, 0, weekday=1)
        ok, reason = check_horario_plan(self.socio, self.plan, now_local=now_tuesday)

        self.assertTrue(ok)
        self.assertIsNone(reason)

    def test_plan_sin_restricciones_siempre_permite(self):
        """Plan without franja/dias always allows access."""
        self.plan.franja_desde = None
        self.plan.franja_hasta = None
        self.plan.dias_habilitados = None
        self.plan.save()

        for h in [0, 7, 12, 18, 23]:
            now = self._now_at(h, 0)
            ok, reason = check_horario_plan(self.socio, self.plan, now_local=now)
            self.assertTrue(ok, f'Should allow at {h}:00')


class GymConfigHorarioValidationTests(TestCase):
    """Test #8 — GymConfig validates hora_cierre."""

    def test_gym_config_hora_cierre_antes_apertura_rechaza(self):
        """Test #8 — GymConfig.save() raises ValidationError when cierre == apertura."""
        from django.core.exceptions import ValidationError

        cfg = GymConfig.get()
        cfg.hora_apertura = datetime.time(7, 0)
        cfg.hora_cierre = datetime.time(7, 0)  # Equal to apertura → invalid

        with self.assertRaises(ValidationError):
            cfg.clean()

    def test_gym_config_cross_midnight_es_valido(self):
        """Cross-midnight range (cierre < apertura) is valid."""
        cfg = GymConfig.get()
        cfg.hora_apertura = datetime.time(7, 0)
        cfg.hora_cierre = datetime.time(2, 0)  # Cross-midnight
        # Should not raise
        cfg.clean()

    def test_gym_config_normal_range_es_valido(self):
        """Normal range (cierre > apertura) is valid."""
        cfg = GymConfig.get()
        cfg.hora_apertura = datetime.time(7, 0)
        cfg.hora_cierre = datetime.time(23, 0)
        cfg.clean()  # Should not raise
