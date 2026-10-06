from decimal import Decimal

from django.test import TestCase, override_settings

from apps.memberships.models import PlanMembresia
from core.mongodb import get_collection
from conftest import make_plan_factory


def _clean_audit_collection():
    col = get_collection('audit_logs')
    col.delete_many({})


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class AuditDiffConsecutiveUpdatesTests(TestCase):
    """Test consecutive updates capture accurate field-level diffs via deepdiff."""

    def setUp(self):
        _clean_audit_collection()

    def tearDown(self):
        _clean_audit_collection()

    def test_two_consecutive_updates_capture_correct_diffs(self):
        """Verifica dos updates seguidos generando dos audit entries con diffs correctos."""
        plan = make_plan_factory(nombre='Plan Musculacion', precio=Decimal('1500.00'))
        _clean_audit_collection()  # Limpiar el evento de create inicial

        # Primer update: precio pasa de 1500.00 a 2000.00
        plan.precio = Decimal('2000.00')
        plan.save()

        # Segundo update: precio pasa de 2000.00 a 2500.00 y cambia nombre
        plan.precio = Decimal('2500.00')
        plan.nombre = 'Plan Musculacion Pro'
        plan.save()

        col = get_collection('audit_logs')
        entries = list(col.find({'instance_id': plan.pk, 'action': 'update'}).sort('_id', 1))

        self.assertEqual(len(entries), 2)

        # Primer audit entry
        entry_1 = entries[0]
        self.assertEqual(entry_1['action'], 'update')
        self.assertEqual(entry_1['object_id'], plan.pk)
        self.assertEqual(entry_1['instance_id'], plan.pk)
        self.assertIn('diff', entry_1)
        self.assertEqual(
            entry_1['diff'],
            {'precio': {'old': '1500.00', 'new': '2000.00'}},
        )

        # Segundo audit entry
        entry_2 = entries[1]
        self.assertEqual(entry_2['action'], 'update')
        self.assertEqual(entry_2['object_id'], plan.pk)
        self.assertEqual(entry_2['instance_id'], plan.pk)
        self.assertIn('diff', entry_2)
        self.assertEqual(
            entry_2['diff'],
            {
                'precio': {'old': '2000.00', 'new': '2500.00'},
                'nombre': {'old': 'Plan Musculacion', 'new': 'Plan Musculacion Pro'},
            },
        )
