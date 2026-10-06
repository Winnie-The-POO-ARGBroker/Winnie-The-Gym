from decimal import Decimal

from django.test import TestCase, override_settings

from apps.classes.models import Clase
from apps.members.models import Socio
from apps.memberships.models import Membresia, PlanMembresia
from apps.users.models import User
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


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class AuditDiffCriticalModelsTests(TestCase):
    """Test diff capture across critical audited models: User, Socio, Membresia, Clase."""

    def setUp(self):
        _clean_audit_collection()

    def tearDown(self):
        _clean_audit_collection()

    def test_audit_diff_user_update(self):
        """Verifica captura de diff al actualizar el modelo User."""
        user = make_user_factory(email='user-audit-diff@test.com', rol='socio', first_name='Juan')
        _clean_audit_collection()

        user.first_name = 'Carlos'
        user.save()

        col = get_collection('audit_logs')
        entry = col.find_one({'instance_id': user.pk, 'action': 'update'})
        self.assertIsNotNone(entry)
        self.assertEqual(entry['model'], 'users.user')
        self.assertIn('first_name', entry['diff'])
        self.assertEqual(entry['diff']['first_name'], {'old': 'Juan', 'new': 'Carlos'})

    def test_audit_diff_socio_update(self):
        """Verifica captura de diff al actualizar el modelo Socio."""
        user = make_user_factory(email='socio-diff@test.com', rol='socio')
        socio = make_socio_factory(user, telefono='11111111')
        _clean_audit_collection()

        socio.telefono = '99999999'
        socio.save()

        col = get_collection('audit_logs')
        entry = col.find_one({'instance_id': socio.pk, 'action': 'update'})
        self.assertIsNotNone(entry)
        self.assertEqual(entry['model'], 'members.socio')
        self.assertIn('telefono', entry['diff'])
        self.assertEqual(entry['diff']['telefono'], {'old': '11111111', 'new': '99999999'})

    def test_audit_diff_membresia_update(self):
        """Verifica captura de diff al actualizar el modelo Membresia."""
        user = make_user_factory(email='memb-diff@test.com', rol='socio')
        socio = make_socio_factory(user)
        plan = make_plan_factory()
        m = Membresia.objects.create(
            socio=socio, plan=plan,
            fecha_inicio='2026-01-01',
            fecha_fin='2026-02-01',
            estado=Membresia.Estado.ACTIVA,
        )
        _clean_audit_collection()

        m.estado = Membresia.Estado.VENCIDA
        m.save()

        col = get_collection('audit_logs')
        entry = col.find_one({'instance_id': m.pk, 'action': 'update'})
        self.assertIsNotNone(entry)
        self.assertEqual(entry['model'], 'memberships.membresia')
        self.assertIn('estado', entry['diff'])
        self.assertEqual(entry['diff']['estado'], {'old': 'activa', 'new': 'vencida'})

    def test_audit_diff_clase_update(self):
        """Verifica captura de diff al actualizar el modelo Clase."""
        clase = Clase.objects.create(nombre='Pilates Mat', cupo_maximo=15)
        _clean_audit_collection()

        clase.cupo_maximo = 25
        clase.save()

        col = get_collection('audit_logs')
        entry = col.find_one({'instance_id': clase.pk, 'action': 'update'})
        self.assertIsNotNone(entry)
        self.assertEqual(entry['model'], 'classes.clase')
        self.assertIn('cupo_maximo', entry['diff'])
        self.assertEqual(entry['diff']['cupo_maximo'], {'old': 15, 'new': 25})

    def test_audit_diff_no_changes_yields_empty_diff(self):
        """Guardar sin modificar campos debe registrar action update con diff vacio."""
        plan = make_plan_factory(nombre='Plan Sin Cambios')
        _clean_audit_collection()

        plan.save()

        col = get_collection('audit_logs')
        entry = col.find_one({'instance_id': plan.pk, 'action': 'update'})
        self.assertIsNotNone(entry)
        self.assertEqual(entry['diff'], {})

    def test_audit_entry_structure_matches_specification(self):
        """Verifica que la estructura guardada en MongoDB coincida con la requerida."""
        plan = make_plan_factory(nombre='Plan Crossfit Test', precio=Decimal('1500.00'))
        _clean_audit_collection()

        plan.precio = Decimal('2000.00')
        plan.save()

        col = get_collection('audit_logs')
        entry = col.find_one({'instance_id': plan.pk, 'action': 'update'})
        self.assertIsNotNone(entry)

        # Verificar todos los campos requeridos por la issue #55
        self.assertIn('timestamp', entry)
        self.assertIn('actor_user_id', entry)
        self.assertIn('actor_email', entry)
        self.assertEqual(entry['action'], 'update')
        self.assertIn('model', entry)
        self.assertEqual(entry['object_id'], plan.pk)
        self.assertEqual(entry['diff'], {'precio': {'old': '1500.00', 'new': '2000.00'}})

    def test_audit_entry_includes_request_id_when_set_in_context(self):
        """La correlacion request_id (issue #58) debe reflejarse en el payload del audit cuando se setea en el ContextVar antes del save."""
        from core.middleware.request_id import request_id_var

        test_request_id = 'test-trace-abc-123'
        token = request_id_var.set(test_request_id)
        try:
            plan = make_plan_factory(nombre='Plan Trace Test', precio=Decimal('1500.00'))
            _clean_audit_collection()
            plan.precio = Decimal('1800.00')
            plan.save()

            col = get_collection('audit_logs')
            entry = col.find_one({'instance_id': plan.pk, 'action': 'update'})
            self.assertIsNotNone(entry)
            self.assertEqual(entry['request_id'], test_request_id)
        finally:
            request_id_var.reset(token)

    def test_audit_entry_request_id_is_none_outside_request_context(self):
        """Fuera de un request HTTP, request_id debe ser None (no romper el save)."""
        plan = make_plan_factory(nombre='Plan Sin Request')
        _clean_audit_collection()
        plan.precio = Decimal('2000.00')
        plan.save()

        col = get_collection('audit_logs')
        entry = col.find_one({'instance_id': plan.pk, 'action': 'update'})
        self.assertIsNotNone(entry)
        self.assertIsNone(entry['request_id'])
