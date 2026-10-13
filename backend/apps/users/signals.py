"""User-app signals.

Connects Django/allauth signals to domain side-effects that should not live
inside views or serializers.
"""
import logging

from allauth.account.signals import password_changed
from django.dispatch import receiver
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

logger = logging.getLogger(__name__)


@receiver(password_changed)
def blacklist_refresh_tokens_on_password_change(sender, request, user, **kwargs):
    """Invalidate all outstanding refresh tokens for the user after a password change.

    This ensures all other active sessions are revoked when the user changes
    their password, closing the window where an attacker who obtained a refresh
    token could continue to impersonate the user.
    """
    try:
        outstanding = OutstandingToken.objects.filter(user=user)
        for token in outstanding:
            BlacklistedToken.objects.get_or_create(token=token)
        logger.info(
            'blacklist_refresh_tokens_on_password_change: blacklisted %d token(s) for user %s',
            outstanding.count(),
            user.pk,
        )
    except Exception as exc:
        logger.warning(
            'blacklist_refresh_tokens_on_password_change: failed for user %s: %s',
            user.pk,
            exc,
        )
