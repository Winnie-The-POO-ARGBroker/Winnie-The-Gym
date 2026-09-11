from datetime import date, timedelta

from django.core import mail
from django.test import TestCase, override_settings

from apps.memberships.models import Membresia
from apps.memberships.tasks import check_expiring_memberships
from conftest import make_plan_factory, make_socio_factory, make_user_factory


def _create_active_membership(days_until_expiration, socio_email=None):
    user = make_user_factory(
        email=socio_email or f'user{days_until_expiration}@expiration.test',
        rol='socio',
    )
    socio = make_socio_factory(user)
    plan = make_plan_factory()
    return Membresia.objects.create(
        socio=socio,
        plan=plan,
        fecha_inicio=date.today() - timedelta(days=1),
        fecha_fin=date.today() + timedelta(days=days_until_expiration),
        estado=Membresia.Estado.ACTIVA,
    )


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class ExpirationTaskTests(TestCase):

    def setUp(self):
        mail.outbox = []

    def test_alerts_are_sent_for_7_3_and_1_days(self):
        _create_active_membership(7, 'a@x.com')
        _create_active_membership(3, 'b@x.com')
        _create_active_membership(1, 'c@x.com')
        _create_active_membership(5, 'noalert@x.com')  # 5 is not on the threshold
        mail.outbox = []

        result = check_expiring_memberships()

        # 3 alerts fired (welcome emails cleared above)
        self.assertEqual(len(mail.outbox), 3)
        recipients = {msg.to[0] for msg in mail.outbox}
        self.assertEqual(recipients, {'a@x.com', 'b@x.com', 'c@x.com'})
        self.assertEqual(result['sent'], {'7': 1, '3': 1, '1': 1, '0': 0})

    def test_expiration_day_flips_estado_to_vencida(self):
        m = _create_active_membership(0, 'today@x.com')
        mail.outbox = []

        result = check_expiring_memberships()

        m.refresh_from_db()
        self.assertEqual(m.estado, Membresia.Estado.VENCIDA)
        self.assertEqual(result['expired'], 1)
        self.assertEqual(len(mail.outbox), 1)

    def test_deduplication_prevents_double_send(self):
        _create_active_membership(3, 'dup@x.com')
        mail.outbox = []

        check_expiring_memberships()
        self.assertEqual(len(mail.outbox), 1)

        # Second run on the same day must NOT re-send.
        check_expiring_memberships()
        self.assertEqual(len(mail.outbox), 1)

    def test_membership_without_user_email_is_skipped(self):
        user = make_user_factory(email='temp@x.com', rol='socio')
        socio = make_socio_factory(user)
        plan = make_plan_factory()
        Membresia.objects.create(
            socio=socio, plan=plan,
            fecha_inicio=date.today() - timedelta(days=1),
            fecha_fin=date.today() + timedelta(days=3),
            estado=Membresia.Estado.ACTIVA,
        )
        # Blank the email so the alert is skipped.
        user.email = ''
        user.save(update_fields=['email'])
        mail.outbox = []

        result = check_expiring_memberships()

        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(result['sent']['3'], 0)
