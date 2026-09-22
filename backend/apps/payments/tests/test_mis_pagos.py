"""REQ-3.3 — mis_pagos action: socios see only their own payments."""
from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.members.models import Socio
from apps.memberships.models import Membresia, PlanMembresia
from apps.payments.models import Pago
from conftest import make_plan_factory, make_socio_factory, make_user_factory

MIS_PAGOS_URL = '/api/payments/pagos/mis-pagos/'


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def _make_pago(socio, plan):
    return Pago.objects.create(
        socio=socio,
        plan=plan,
        monto=plan.precio,
        estado='aprobado',
        metodo='manual',
    )


class MisPagosTests(APITestCase):
    def setUp(self):
        # Socio A — owns payments
        self.user_a = make_user_factory(email='socio_a@pagos.test', rol='socio')
        self.socio_a = make_socio_factory(self.user_a, apellido='A')

        # Socio B — unrelated
        self.user_b = make_user_factory(email='socio_b@pagos.test', rol='socio')
        self.socio_b = make_socio_factory(self.user_b, apellido='B')

        self.plan = make_plan_factory(nombre='Plan Test', duracion_dias=30)

        # Payments: 2 for A, 1 for B
        self.pago_a1 = _make_pago(self.socio_a, self.plan)
        self.pago_a2 = _make_pago(self.socio_a, self.plan)
        self.pago_b1 = _make_pago(self.socio_b, self.plan)

        self.admin = make_user_factory(email='admin@pagos.test', rol='administrador')
        self.recep = make_user_factory(email='recep@pagos.test', rol='recepcionista')

    def test_socio_ve_solo_los_suyos(self):
        """Socio A sees exactly their 2 payments."""
        _auth(self.client, self.user_a)
        response = self.client.get(MIS_PAGOS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # handle paginated vs non-paginated responses
        results = response.data.get('results', response.data)
        ids = [p['id'] for p in results]
        self.assertIn(self.pago_a1.id, ids)
        self.assertIn(self.pago_a2.id, ids)
        self.assertNotIn(self.pago_b1.id, ids)
        self.assertEqual(len(ids), 2)

    def test_staff_403_on_mis_pagos(self):
        """Staff/recepcionista cannot use the mis-pagos action (403)."""
        _auth(self.client, self.recep)
        response = self.client.get(MIS_PAGOS_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_403_on_mis_pagos(self):
        """Admin cannot use the mis-pagos action — it is socio-only (403)."""
        _auth(self.client, self.admin)
        response = self.client.get(MIS_PAGOS_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_401(self):
        """Unauthenticated users get 401."""
        response = self.client.get(MIS_PAGOS_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
