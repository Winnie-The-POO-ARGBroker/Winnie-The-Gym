"""User domain services.

Business logic for user creation and role management, extracted from views so
that views remain thin and the logic is testable in isolation.
"""
import logging

from django.conf import settings
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

User = get_user_model()

# Synthetic email domain patterns — socios without a real email address
SYNTHETIC_EMAIL_DOMAINS = ('@winniegym.com', '@sin-email.local', '@placeholder.local')


def is_synthetic_email(email: str) -> bool:
    """Return True if the email address is a system-generated placeholder."""
    if not email:
        return False
    lower = email.lower()
    return any(lower.endswith(domain) for domain in SYNTHETIC_EMAIL_DOMAINS)


def _make_activation_url_generator(frontend_url: str):
    """Return a url_generator that produces FRONTEND_URL-based activation links.

    fix #233: activation emails must link to FRONTEND_URL, not example.com.
    The generator is passed to AllAuthPasswordResetForm.save() as `url_generator`.
    """
    def _generator(request, user, temp_key):
        from allauth.account.utils import user_pk_to_url_str
        uid = user_pk_to_url_str(user)
        return f'{frontend_url}/reset-password/{uid}/{temp_key}/'
    return _generator


def send_activation_email(user) -> bool:
    """Send an activation (set-password) email to a newly created user.

    Uses AllAuthPasswordResetForm (dj-rest-auth default when allauth is installed)
    with a custom url_generator so the link points to FRONTEND_URL instead of
    the default Site domain (example.com).

    Email delivery failures are caught and logged rather than bubbled up, to
    keep the user-creation flow non-fatal when the email backend is unreachable.

    Returns True only when the email was handed to the backend without raising;
    False when it was skipped or failed, so callers can tell the UI the truth.
    """
    if not user.email or not user.pk:
        logger.warning('send_activation_email: user has no email or pk, skipping')
        return False

    # allauth's reset form only mails active users and reports a valid form with zero
    # recipients otherwise, which would read as "sent".
    if not user.is_active:
        logger.warning('send_activation_email: user %s is inactive, skipping', user.email)
        return False

    try:
        from dj_rest_auth.forms import AllAuthPasswordResetForm
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')

        form = AllAuthPasswordResetForm(data={'email': user.email})
        if form.is_valid():
            form.save(
                request=None,
                url_generator=_make_activation_url_generator(frontend_url),
            )
            return True
        logger.warning('send_activation_email: form invalid for %s', user.email)
    except Exception as exc:
        logger.warning('send_activation_email failed for %s: %s', user.email, exc)
    return False
