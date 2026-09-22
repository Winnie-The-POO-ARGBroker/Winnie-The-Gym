from rest_framework.permissions import BasePermission


class IsAdminOrOwnSocio(BasePermission):
    """
    Allows access to:
    - Admin and Recepcionista users unconditionally.
    - Socio users only when the target object is their own Socio record.

    Must be used on detail actions where the view object is a Socio instance.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Admins and receptionists can act on any Socio.
        if user.is_staff or user.is_superuser:
            return True

        rol = getattr(user, 'rol', None)
        if rol in ('administrador', 'recepcionista'):
            return True

        # Socios can only act on their own record.
        return hasattr(user, 'socio') and user.socio.pk == obj.pk
