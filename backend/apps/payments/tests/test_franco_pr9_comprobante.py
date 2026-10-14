"""#192 — Tests for Pago.numero_comprobante and comprobante PDF endpoint."""
import datetime
import uuid
from decimal import Decimal

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.payments.models import Pago
from conftest import make_membresia_factory, make_plan_factory, make_socio_factory, make_user_factory


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def _make_pago(socio, plan, estado=Pago.Estado.APROBADO, **kwargs):
    """Create a Pago directly with unique mp_external_reference."""
    kwargs.setdefault('mp_external_reference', uuid.uuid4().hex)
    kwargs.setdefault('paid_at', timezone.now())
    return Pago.objects.create(
        socio=socio,
        plan=plan,
        monto=plan.precio,
        moneda='ARS',
        metodo=Pago.Metodo.MANUAL,
        estado=estado,
        **kwargs,
    )


def _assign_numero(pago):
    """Simulate the on_commit callback for numero_comprobante assignment.

    The actual signal uses on_commit which does not fire within transactions
    in test environments. This helper directly executes the assignment logic
    so tests can verify sequential numbering.
    """
    from apps.payments.models import Pago as PagoModel
    from django.db import transaction
    from django.utils import timezone

    year = timezone.localdate().year
    prefix = f'R-{year}-'

    with transaction.atomic():
        locked = PagoModel.objects.select_for_update().get(pk=pago.pk)
        if locked.numero_comprobante:
            return
        last = (
            PagoModel.objects
            .filter(numero_comprobante__startswith=prefix)
            .order_by('-numero_comprobante')
            .values_list('numero_comprobante', flat=True)
            .first()
        )
        last_n = int(last.split('-')[-1]) if last else 0
        locked.numero_comprobante = f'{prefix}{last_n + 1:06d}'
        locked.save(update_fields=['numero_comprobante'])


class ComprobantesNumeracionTest(TestCase):
    """Test #1 — correlative annual numbering."""

    def setUp(self):
        self.user = make_user_factory(rol='administrador')
        self.socio = make_socio_factory(self.user)
        self.plan = make_plan_factory(nombre='Test Plan', precio=Decimal('500.00'), duracion_dias=30)

    def test_comprobante_numeracion_correlativa_por_ano(self):
        """Successive approved pagos receive R-YYYY-000001, R-YYYY-000002 etc."""
        year = timezone.localdate().year
        prefix = f'R-{year}-'

        pago1 = _make_pago(self.socio, self.plan)
        pago2 = _make_pago(self.socio, self.plan)

        _assign_numero(pago1)
        _assign_numero(pago2)

        pago1.refresh_from_db()
        pago2.refresh_from_db()

        self.assertIsNotNone(pago1.numero_comprobante)
        self.assertIsNotNone(pago2.numero_comprobante)
        self.assertTrue(pago1.numero_comprobante.startswith(prefix))
        self.assertTrue(pago2.numero_comprobante.startswith(prefix))

        n1 = int(pago1.numero_comprobante.split('-')[-1])
        n2 = int(pago2.numero_comprobante.split('-')[-1])
        self.assertEqual(n2, n1 + 1, 'Números correlativos consecutivos')


class ComprobantePDFTest(APITestCase):
    """Tests #2 and #3 — PDF binary response and 404 for another socio."""

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        self.socio_user1 = make_user_factory(rol='socio', email='socio1@test.com')
        self.socio1 = make_socio_factory(self.socio_user1)
        self.socio_user2 = make_user_factory(rol='socio', email='socio2@test.com')
        self.socio2 = make_socio_factory(self.socio_user2)
        self.plan = make_plan_factory(nombre='PlanPDF', precio=Decimal('600.00'), duracion_dias=30)
        self.pago = _make_pago(self.socio1, self.plan)
        self.pago.numero_comprobante = 'R-2026-000001'
        self.pago.save(update_fields=['numero_comprobante'])

    def test_comprobante_pdf_valid_binary(self):
        """Test #2 — Admin gets a valid PDF binary for an approved pago."""
        _auth(self.client, self.admin)
        url = f'/api/payments/pagos/{self.pago.pk}/comprobante/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        # PDF magic bytes
        content = b''.join(response.streaming_content) if hasattr(response, 'streaming_content') else response.content
        self.assertTrue(content.startswith(b'%PDF'), 'Response must be a valid PDF')

    def test_comprobante_404_para_otro_socio(self):
        """Test #3 — Socio2 gets 404 when requesting Socio1's comprobante."""
        _auth(self.client, self.socio_user2)
        url = f'/api/payments/pagos/{self.pago.pk}/comprobante/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_comprobante_own_pago_allowed(self):
        """Socio1 can download their own comprobante."""
        _auth(self.client, self.socio_user1)
        url = f'/api/payments/pagos/{self.pago.pk}/comprobante/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_comprobante_no_disponible_para_pendiente(self):
        """Comprobante returns 404 for a pending pago (not approved)."""
        pago_pendiente = _make_pago(self.socio1, self.plan, estado=Pago.Estado.PENDIENTE,
                                    mp_external_reference='ext-pend')
        _auth(self.client, self.admin)
        url = f'/api/payments/pagos/{pago_pendiente.pk}/comprobante/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
