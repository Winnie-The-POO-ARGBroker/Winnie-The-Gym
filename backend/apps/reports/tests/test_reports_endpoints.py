from datetime import date, datetime, timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.access.models import AccessLog
from apps.memberships.models import Membresia
from apps.payments.models import Pago
from conftest import make_plan_factory, make_socio_factory, make_user_factory


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


MOROSIDAD_URL = '/api/reportes/morosidad/'
FACTURACION_URL = '/api/reportes/facturacion/'
ASISTENCIA_URL = '/api/reportes/asistencia/'


class MorosidadReportTests(APITestCase):

    def setUp(self):
        self.admin = make_user_factory(email='adm@rep.test', rol='administrador')
        self.socio_user = make_user_factory(email='mor@rep.test', rol='socio')
        self.socio = make_socio_factory(self.socio_user, apellido='Vencido', dni='12345678')
        self.plan = make_plan_factory(nombre='Basico', precio=Decimal('800.00'), duracion_dias=30)
        Membresia.objects.create(
            socio=self.socio, plan=self.plan,
            fecha_inicio=date.today() - timedelta(days=40),
            fecha_fin=date.today() - timedelta(days=10),
            estado=Membresia.Estado.VENCIDA,
        )
        _auth(self.client, self.admin)

    def test_csv_export_returns_delinquent_row(self):
        response = self.client.get(f'{MOROSIDAD_URL}?formato=csv')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('text/csv', response['Content-Type'])
        body = response.content.decode('utf-8')
        self.assertIn('12345678', body)
        self.assertIn('Vencido', body)
        self.assertIn('Basico', body)

    def test_xlsx_export_returns_binary(self):
        response = self.client.get(f'{MOROSIDAD_URL}?formato=xlsx')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('spreadsheetml', response['Content-Type'])
        self.assertTrue(response.content.startswith(b'PK'))  # xlsx = zip

    def test_pdf_export_returns_pdf(self):
        response = self.client.get(f'{MOROSIDAD_URL}?formato=pdf')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertTrue(response.content.startswith(b'%PDF'))

    def test_socio_cannot_access_report(self):
        _auth(self.client, self.socio_user)
        response = self.client.get(MOROSIDAD_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class FacturacionReportTests(APITestCase):

    def setUp(self):
        self.admin = make_user_factory(email='adm2@rep.test', rol='administrador')
        self.socio_user = make_user_factory(email='fac@rep.test', rol='socio')
        self.socio = make_socio_factory(self.socio_user)
        self.plan = make_plan_factory(nombre='Fac-Plan', precio=Decimal('1500.00'))
        _auth(self.client, self.admin)

    def _create_paid(self, when):
        return Pago.objects.create(
            socio=self.socio, plan=self.plan,
            monto=Decimal('1500.00'), moneda='ARS',
            metodo=Pago.Metodo.MERCADO_PAGO,
            estado=Pago.Estado.APROBADO,
            mp_external_reference=f'ref-{when.isoformat()}',
            mp_payment_id=f'PAY-{when.isoformat()}',
            paid_at=when,
        )

    def test_csv_only_includes_pagos_from_target_month(self):
        this_month = timezone.now().replace(day=15, hour=12, minute=0, second=0, microsecond=0)
        last_month = (this_month.replace(day=1) - timedelta(days=1)).replace(day=15)
        self._create_paid(this_month)
        self._create_paid(last_month)

        response = self.client.get(f'{FACTURACION_URL}?formato=csv')
        body = response.content.decode('utf-8')

        # Both may or may not appear depending on current month, but the count should be 1 (this month)
        lines = [l for l in body.splitlines() if l.strip()]
        # header + 1 row
        self.assertEqual(len(lines), 2)

    def test_defaults_to_current_month(self):
        response = self.client.get(FACTURACION_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class AsistenciaReportTests(APITestCase):

    def setUp(self):
        self.admin = make_user_factory(email='adm3@rep.test', rol='administrador')
        self.socio_user = make_user_factory(email='asi@rep.test', rol='socio')
        self.socio = make_socio_factory(self.socio_user, apellido='Asistente', dni='87654321')
        self.plan = make_plan_factory(nombre='AsistPlan')
        Membresia.objects.create(
            socio=self.socio, plan=self.plan,
            fecha_inicio=date.today(),
            fecha_fin=date.today() + timedelta(days=30),
            estado=Membresia.Estado.ACTIVA,
        )
        _auth(self.client, self.admin)

    def test_csv_includes_permanence_when_entry_and_exit_paired(self):
        entry = AccessLog.objects.create(
            user=self.socio_user, access_type='ENTRY', status='GRANTED',
        )
        exit_log = AccessLog.objects.create(
            user=self.socio_user, access_type='EXIT', status='GRANTED',
        )
        exit_log.timestamp = entry.timestamp + timedelta(minutes=45)
        exit_log.save(update_fields=['timestamp'])

        response = self.client.get(f'{ASISTENCIA_URL}?formato=csv')
        body = response.content.decode('utf-8')

        self.assertIn('87654321', body)
        self.assertIn('Asistente', body)
        self.assertIn('45', body)  # permanencia_minutos

    def test_csv_leaves_permanencia_blank_when_no_exit_matches(self):
        AccessLog.objects.create(user=self.socio_user, access_type='ENTRY', status='GRANTED')

        response = self.client.get(f'{ASISTENCIA_URL}?formato=csv')
        body = response.content.decode('utf-8')

        self.assertIn('87654321', body)
        # Last column empty on the data row
        data_line = [l for l in body.splitlines() if '87654321' in l][0]
        self.assertTrue(data_line.rstrip().endswith(','))
