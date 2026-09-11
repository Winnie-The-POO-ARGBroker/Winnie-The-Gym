import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


logger = logging.getLogger(__name__)


def _render_body(template_base, context):
    """Render a matched pair of templates: `<name>.html` and optional `<name>.txt`."""
    html_body = render_to_string(f'emails/{template_base}.html', context)
    try:
        text_body = render_to_string(f'emails/{template_base}.txt', context)
    except Exception:
        # Fall back to a stripped copy of the HTML if the plain-text template is missing.
        from html import unescape
        import re

        text_body = unescape(re.sub(r'<[^>]+>', '', html_body)).strip()
    return html_body, text_body


def send_templated_email(template_base, subject, to, context=None, category=None):
    """Render and send an HTML+text email using the configured Anymail backend.

    template_base: base filename under `templates/emails/` (without extension).
    subject: subject line already formatted for the recipient.
    to: iterable of recipient addresses.
    context: template context dictionary.
    category: optional Mailtrap category tag for the sent log.

    Returns the number of successfully delivered messages (0 or 1) so callers
    can log without exceptions. Never raises — email failures MUST NOT break
    the surrounding business flow.
    """
    if not to:
        return 0

    context = context or {}
    context.setdefault('brand_name', 'Winnie The Gym')
    context.setdefault('frontend_url', settings.FRONTEND_URL)

    html_body, text_body = _render_body(template_base, context)

    reply_to = []
    if settings.EMAIL_REPLY_TO:
        reply_to = [settings.EMAIL_REPLY_TO]

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=list(to),
        reply_to=reply_to,
    )
    message.attach_alternative(html_body, 'text/html')

    if category:
        # Anymail-specific extra: tags the message on the Mailtrap dashboard.
        message.esp_extra = {'category': category}

    try:
        return message.send(fail_silently=False)
    except Exception as exc:
        logger.error(
            'Failed to send templated email %s to %s: %s',
            template_base, to, exc, exc_info=True,
        )
        return 0
