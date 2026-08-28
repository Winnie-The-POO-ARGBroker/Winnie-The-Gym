from django.test import TestCase

from apps.memberships.models import Membresia, PlanMembresia


class MembresiaTextChoicesTest(TestCase):

    def test_estado_textchoices_activa_value(self):
        self.assertEqual(Membresia.Estado.ACTIVA, 'activa')

    def test_estado_textchoices_vencida_value(self):
        self.assertEqual(Membresia.Estado.VENCIDA, 'vencida')

    def test_estado_textchoices_suspendida_value(self):
        self.assertEqual(Membresia.Estado.SUSPENDIDA, 'suspendida')

    def test_estado_textchoices_cancelada_value(self):
        self.assertEqual(Membresia.Estado.CANCELADA, 'cancelada')

    def test_estado_textchoices_pendiente_pago_value(self):
        self.assertEqual(Membresia.Estado.PENDIENTE_PAGO, 'pendiente_pago')

    def test_meta_ordering_is_minus_fecha_inicio(self):
        self.assertEqual(Membresia._meta.ordering, ['-fecha_inicio'])


class PlanMembresiaMetaOrderingTest(TestCase):

    def test_meta_ordering_is_nombre(self):
        self.assertEqual(PlanMembresia._meta.ordering, ['nombre'])
