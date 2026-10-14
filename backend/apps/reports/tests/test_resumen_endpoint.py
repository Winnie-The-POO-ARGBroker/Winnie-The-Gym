"""Tests for GET /api/reportes/resumen/ — fix #183."""
import hashlib
import hmac
from datetime import date, timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.memberships.models import Membresia
from apps.payments.models import Pago
from conftest import make_membresia_factory, make_plan_factory, make_socio_factory, make_user_factory


RESUMEN_URL = '/api/reportes/resumen/'


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


class ReportesResumenTests(APITestCase):

    def setUp(self):
        self.admin = make_user_factory(email='adm@resumen.test', rol='administrador')
        self.socio_user = make_user_factory(email='soc@resumen.test', rol='socio')
        self.socio = make_socio_factory(self.socio_user)
        self.plan = make_plan_factory(nombre='Resumen-Plan', precio=Decimal('5000.00'), duracion_dias=30)
        _auth(self.client, self.admin)

    def _make_approved_pago(self, monto, paid_at=None):
        if paid_at is None:
            paid_at = timezone.now()
        return Pago.objects.create(
            socio=self.socio,
            plan=self.plan,
            monto=monto,
            moneda='ARS',
            metodo=Pago.Metodo.MERCADO_PAGO,
            estado=Pago.Estado.APROBADO,
            mp_external_reference=f'ref-{monto}-{timezone.now().timestamp()}',
            paid_at=paid_at,
        )

    def test_reportes_resumen_calculates_full_ingresos_not_truncated(self):
        """Fix #183: ingresos.mes_actual must be the true sum, not a truncated value."""
        # Create 3 pagos this month totalling 15000
        self._make_approved_pago(Decimal('5000.00'))
        self._make_approved_pago(Decimal('7000.00'))
        self._make_approved_pago(Decimal('3000.00'))

        response = self.client.get(RESUMEN_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('ingresos', data)
        # Must be full sum — 15000.0, NOT truncated to a single pago
        self.assertAlmostEqual(data['ingresos']['mes_actual'], 15000.0)

    def test_resumen_includes_all_required_sections(self):
        """Response shape matches the contract from the issue."""
        response = self.client.get(RESUMEN_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn('ingresos', data)
        self.assertIn('morosos', data)
        self.assertIn('membresias', data)
        self.assertIn('asistencia', data)

        ingresos = data['ingresos']
        self.assertIn('mes_actual', ingresos)
        self.assertIn('mes_anterior', ingresos)
        self.assertIn('serie_6_meses', ingresos)
        self.assertEqual(len(ingresos['serie_6_meses']), 6)

    def test_resumen_variacion_pct_is_correct(self):
        """variacion_pct = (mes_actual - mes_anterior) / mes_anterior * 100."""
        tz = timezone.get_current_timezone()
        now = timezone.now()

        # This month: 12000
        self._make_approved_pago(Decimal('12000.00'), paid_at=now)

        # Last month: 10000
        first_of_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_dt = first_of_this_month - timezone.timedelta(days=1)
        self._make_approved_pago(Decimal('10000.00'), paid_at=last_month_dt)

        today_str = now.strftime('%Y-%m')
        response = self.client.get(f'{RESUMEN_URL}?mes={today_str}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertAlmostEqual(data['ingresos']['mes_actual'], 12000.0)
        self.assertAlmostEqual(data['ingresos']['mes_anterior'], 10000.0)
        expected_variacion = (12000.0 - 10000.0) / 10000.0 * 100
        self.assertAlmostEqual(data['ingresos']['variacion_pct'], expected_variacion, places=0)

    def test_socio_cannot_access_resumen(self):
        """Socios must get 403 — no financial data for members."""
        _auth(self.client, self.socio_user)
        response = self.client.get(RESUMEN_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_recepcionista_can_access_resumen(self):
        recep = make_user_factory(email='rec@resumen.test', rol='recepcionista')
        _auth(self.client, recep)
        response = self.client.get(RESUMEN_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
