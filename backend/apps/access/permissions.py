from rest_framework.permissions import BasePermission


class IsReceptionistOrAdmin(BasePermission):
    """
    Permiso custom para restringir el escaneo de códigos QR únicamente a
    usuarios con rol de recepcionista o administrador, o miembros de staff.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Permitir si es superuser/staff de Django
        if request.user.is_staff or request.user.is_superuser:
            return True

        # Permitir si tiene el atributo o campo rol en 'administrador' o 'recepcionista'
        user_role = getattr(request.user, 'rol', None)
        return user_role in ('administrador', 'recepcionista')


class IsSocio(BasePermission):
    """
    Grants access only to authenticated users with rol=socio and a linked Socio record.
    Used for self-service endpoints (/me/, /me/renew/).
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and getattr(request.user, 'rol', None) == 'socio'
            and hasattr(request.user, 'socio')
        )


class IsAdminOnly(BasePermission):
    """
    Grants access only to authenticated users with rol=administrador or superuser.
    Used for plan create/update endpoints.
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and (
                getattr(request.user, 'rol', None) == 'administrador'
                or request.user.is_superuser
            )
        )
