"""User domain services.

Business logic for user creation and role management, extracted from views so
that views remain thin and the logic is testable in isolation.
"""
import logging

from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

User = get_user_model()


def get_or_create_user_by_role(email: str, rol: str, extra_fields: dict | None = None) -> tuple:
    """Get or create a User record with the given email and role.

    Ensures ``is_staff`` and ``is_superuser`` are set correctly for the
    ``administrador`` role. Any extra fields are applied only on creation.

    Returns:
        (user, created) tuple — same semantics as ``QuerySet.get_or_create``.
    """
    if extra_fields is None:
        extra_fields = {}

    is_admin = rol == 'administrador'
    defaults = {
        'rol': rol,
        'username': email,
        'is_staff': is_admin,
        'is_superuser': is_admin,
        **extra_fields,
    }

    user, created = User.objects.get_or_create(email=email, defaults=defaults)

    if not created:
        updated = False
        if is_admin and (not user.is_staff or not user.is_superuser):
            user.is_staff = True
            user.is_superuser = True
            updated = True
        if user.rol != rol:
            user.rol = rol
            updated = True
        if updated:
            user.save()

    return user, created


def promote_to_role(user, rol: str) -> None:
    """Promote an existing user to the given role.

    Adjusts ``is_staff`` and ``is_superuser`` flags to match role semantics.
    Saves the user if any field changed.
    """
    is_admin = rol == 'administrador'
    changed = False

    if user.rol != rol:
        user.rol = rol
        changed = True
    if user.is_staff != is_admin:
        user.is_staff = is_admin
        changed = True
    if user.is_superuser != is_admin:
        user.is_superuser = is_admin
        changed = True

    if changed:
        user.save(update_fields=['rol', 'is_staff', 'is_superuser'])
        logger.info("User %s promoted to role '%s'", user.email, rol)
