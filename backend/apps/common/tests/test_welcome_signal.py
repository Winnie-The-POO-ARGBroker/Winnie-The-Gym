from django.core import mail
from django.test import TestCase, override_settings

from conftest import make_socio_factory, make_user_factory


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class WelcomeEmailSignalTests(TestCase):

    def setUp(self):
        mail.outbox = []

    def test_creating_socio_enqueues_welcome_email(self):
        user = make_user_factory(email='welcome@test.com', rol='socio')
        make_socio_factory(user, nombre='Ana', apellido='Ramirez')

        self.assertEqual(len(mail.outbox), 1)
        msg = mail.outbox[0]
        self.assertIn('welcome@test.com', msg.to)
        self.assertIn('Bienvenido', msg.subject)
        self.assertIn('Ana', msg.body)

    def test_updating_socio_does_not_resend_welcome(self):
        user = make_user_factory(email='update@test.com', rol='socio')
        socio = make_socio_factory(user, nombre='Bruno', apellido='Duarte')
        mail.outbox = []

        socio.telefono = '+5491199999999'
        socio.save(update_fields=['telefono', 'updated_at'])

        self.assertEqual(len(mail.outbox), 0)
