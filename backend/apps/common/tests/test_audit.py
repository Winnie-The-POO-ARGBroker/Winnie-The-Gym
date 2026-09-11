from decimal import Decimal

from django.test import TestCase, override_settings

from apps.classes.models import Clase
from apps.members.models import Socio
from apps.memberships.models import Membresia, PlanMembresia
from apps.payments.models import Pago
from core.mongodb import get_collection
from conftest import make_plan_factory, make_socio_factory, make_user_factory


def _clean_audit_collection():
    col = get_collection('audit_logs')
    col.delete_many({})


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class AuditSignalsTests(TestCase):
    """CRUD signals on critical models must land in `audit_logs` (MongoDB)."""

    def setUp(self):
        _clean_audit_collection()

    def tearDown(self):
        _clean_audit_collection()

    def _last_audit(self, model):
        col = get_collection('audit_logs')
        return col.find_one({'model': model}, sort=[('timestamp', -1)])

    def test_create_socio_writes_audit_create(self):
        user = make_user_factory(email='audit-create@test.com', rol='socio')
        make_socio_factory(user)
        entry = self._last_audit('members.socio')
        self.assertIsNotNone(entry)
        self.assertEqual(entry['action'], 'create')
        self.assertEqual(entry['snapshot']['dni'], user.socio.dni)

    def test_update_membresia_writes_audit_update(self):
        user = make_user_factory(email='audit-upd@test.com', rol='socio')
        socio = make_socio_factory(user)
        plan = make_plan_factory()
        m = Membresia.objects.create(
            socio=socio, plan=plan,
            fecha_inicio='2026-01-01',
            fecha_fin='2026-02-01',
            estado=Membresia.Estado.ACTIVA,
        )
        _clean_audit_collection()  # drop the create event
        m.estado = Membresia.Estado.VENCIDA
        m.save()

        entry = self._last_audit('memberships.membresia')
        self.assertEqual(entry['action'], 'update')
        self.assertEqual(entry['snapshot']['estado'], 'vencida')

    def test_delete_clase_writes_audit_delete(self):
        clase = Clase.objects.create(nombre='Yoga a borrar')
        _clean_audit_collection()
        clase.delete()

        entry = self._last_audit('classes.clase')
        self.assertEqual(entry['action'], 'delete')
        self.assertEqual(entry['snapshot']['nombre'], 'Yoga a borrar')

    def test_create_pago_writes_audit_with_serialized_decimal(self):
        user = make_user_factory(email='audit-pag@test.com', rol='socio')
        socio = make_socio_factory(user)
        plan = make_plan_factory(precio=Decimal('1500.00'))
        Pago.objects.create(
            socio=socio, plan=plan,
            monto=Decimal('1500.00'), moneda='ARS',
            metodo=Pago.Metodo.MERCADO_PAGO, estado=Pago.Estado.PENDIENTE,
            mp_external_reference='ref-audit-1',
        )
        entry = self._last_audit('payments.pago')
        self.assertEqual(entry['action'], 'create')
        # Decimal is serialised as string so Mongo stores it losslessly.
        self.assertEqual(entry['snapshot']['monto'], '1500.00')

    def test_actor_is_system_when_no_request_active(self):
        # Signals fired outside a request/response cycle → actor is 'system'.
        make_plan_factory(nombre='Plan sin actor')
        entry = self._last_audit('memberships.planmembresia')
        self.assertEqual(entry['actor_rol'], 'system')
        self.assertIsNone(entry['actor_id'])


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class MongoIndexesCommandTests(TestCase):
    """The `create_mongo_indexes` management command must be idempotent."""

    def test_command_runs_and_creates_expected_indexes(self):
        from django.core.management import call_command
        from io import StringIO

        out = StringIO()
        call_command('create_mongo_indexes', stdout=out)
        output = out.getvalue()
        self.assertIn('qr_history_ttl', output)
        self.assertIn('audit_logs_ttl', output)

        # Second run should not fail and TTL should still be present.
        out2 = StringIO()
        call_command('create_mongo_indexes', stdout=out2)
        self.assertIn('audit_logs', out2.getvalue())

        # Verify the TTL index is registered with the right expireAfterSeconds.
        col = get_collection('qr_history')
        ttl = col.index_information().get('qr_history_ttl')
        self.assertIsNotNone(ttl)
        self.assertEqual(ttl.get('expireAfterSeconds'), 90 * 24 * 60 * 60)
