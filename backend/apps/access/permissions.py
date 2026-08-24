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
