"""Custom JWT authentication that wires the authenticated user into thread-local
so the audit trail captures the real actor instead of 'system' (#218).
"""
from rest_framework_simplejwt.authentication import JWTAuthentication

from .middleware import set_current_user


class AuditedJWTAuthentication(JWTAuthentication):
    """JWTAuthentication subclass that populates thread-local after a successful
    token validation.

    This ensures `apps.common.middleware.get_current_user()` returns the
    authenticated user inside signals, so AuditLog entries record the correct
    actor_id/actor_email/actor_rol instead of falling back to 'system'.

    Thread-local is always cleaned up by CurrentUserMiddleware's finally block
    at the end of each request, so there is no risk of cross-request leakage.
    """

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None:
            user, _ = result
            set_current_user(user)
        return result
