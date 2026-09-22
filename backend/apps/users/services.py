"""User domain services.

Business logic for user creation and role management, extracted from views so
that views remain thin and the logic is testable in isolation.
"""
import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.forms import PasswordResetForm

logger = logging.getLogger(__name__)

User = get_user_model()


def send_activation_email(user) -> None:
    """Send an activation (set-password) email to a newly created user.

    Reuses Django's built-in PasswordResetForm to generate a secure uid+token
    link. The frontend ResetPasswordPage at /reset-password/:uid/:token handles
    the set-password flow — no custom email template required.

    Email delivery failures are caught and logged rather than bubbled up, to
    keep the user-creation flow non-fatal when the email backend is unreachable
    (e.g. dev without Mailtrap configured).
    """
    if not user.email or not user.pk:
        logger.warning('send_activation_email: user has no email or pk, skipping')
        return

    try:
        form = PasswordResetForm(data={'email': user.email})
        if form.is_valid():
            form.save(
                request=None,
                use_https=True,
                from_email=None,  # falls back to DEFAULT_FROM_EMAIL
                email_template_name='registration/password_reset_email.html',
                subject_template_name='registration/password_reset_subject.txt',
            )
        else:
            logger.warning('send_activation_email: form invalid for %s', user.email)
    except Exception as exc:
        logger.warning('send_activation_email failed for %s: %s', user.email, exc)
