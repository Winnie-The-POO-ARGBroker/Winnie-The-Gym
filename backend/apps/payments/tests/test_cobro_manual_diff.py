import logging
from decimal import Decimal

from django.test import TestCase, override_settings

from apps.payments.models import Pago
from apps.payments.services import cobro_manual
from conftest import make_plan_factory, make_socio_factory, make_user_factory


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class CobroManualDiffTests(TestCase):

    def setUp(self):
        self.actor = make_user_factory(email='rec@diff.test', rol='recepcionista')
        self.socio_user = make_user_factory(email='socio@diff.test', rol='socio')
        self.socio = make_socio_factory(self.socio_user)
        self.plan = make_plan_factory(nombre='DiffPlan', precio=Decimal('1000.00'), duracion_dias=30)

    def test_cobro_matching_plan_price_leaves_no_diff_marker(self):
        pago = cobro_manual(self.actor, self.socio, self.plan, Decimal('1000.00'))
        self.assertNotIn('diferencia_vs_plan', pago.raw_webhook)
        self.assertEqual(pago.raw_webhook['monto_cobrado'], '1000.00')

    def test_cobro_with_discount_stores_diff_and_warns(self):
        with self.assertLogs('apps.payments.services', level='WARNING') as ctx:
            pago = cobro_manual(self.actor, self.socio, self.plan, Decimal('800.00'), observacion='descuento')
        self.assertIn('diferencia_vs_plan', pago.raw_webhook)
        self.assertEqual(pago.raw_webhook['diferencia_vs_plan'], '-200.00')
        self.assertTrue(any('diferencia' in msg.lower() for msg in ctx.output))

    def test_cobro_over_plan_price_also_recorded(self):
        pago = cobro_manual(self.actor, self.socio, self.plan, Decimal('1200.00'))
        self.assertEqual(pago.raw_webhook['diferencia_vs_plan'], '200.00')
