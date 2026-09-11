from django.core import mail
from django.test import TestCase, override_settings

from apps.common.emails import send_templated_email


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='Winnie The Gym <hello@demomailtrap.co>',
    EMAIL_REPLY_TO='support@winniethegym.local',
)
class SendTemplatedEmailTests(TestCase):

    def setUp(self):
        mail.outbox = []

    def test_renders_html_and_text_bodies(self):
        sent = send_templated_email(
            template_base='welcome',
            subject='Bienvenido de prueba',
            to=['nuevo@test.com'],
            context={'nombre': 'Rodrigo', 'numero_socio': 'S-00042'},
        )

        self.assertEqual(sent, 1)
        self.assertEqual(len(mail.outbox), 1)
        msg = mail.outbox[0]
        self.assertEqual(msg.subject, 'Bienvenido de prueba')
        self.assertEqual(msg.to, ['nuevo@test.com'])
        self.assertIn('S-00042', msg.body)  # text body renders
        alternatives = {mime for _, mime in msg.alternatives}
        self.assertIn('text/html', alternatives)
        html_body = msg.alternatives[0][0]
        self.assertIn('S-00042', html_body)
        self.assertIn('Winnie The Gym', html_body)

    def test_sets_reply_to_when_configured(self):
        send_templated_email(
            template_base='welcome',
            subject='X',
            to=['x@test.com'],
            context={'nombre': 'x', 'numero_socio': 'S-00001'},
        )
        self.assertEqual(mail.outbox[0].reply_to, ['support@winniethegym.local'])

    def test_empty_recipient_list_returns_zero(self):
        sent = send_templated_email(
            template_base='welcome',
            subject='X',
            to=[],
            context={'nombre': 'x', 'numero_socio': 'S-00001'},
        )
        self.assertEqual(sent, 0)
        self.assertEqual(len(mail.outbox), 0)
