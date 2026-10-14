from rest_framework.exceptions import PermissionDenied
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


class IsSocioActivo(BasePermission):
    """Reusable permission that grants access only to socios whose estado='activo'.

    Suspended (suspendido) and cancelled (baja) socios receive HTTP 403 with a
    machine-readable 'motivo' so the frontend can display the appropriate banner.

    #230 — applied to: inscribir clase, crear preferencia MP, credencial/estado,
    renovar membresía.

    A suspended socio CAN cancel existing reservations and log in — this
    permission should NOT be applied to cancelar or login endpoints.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        socio = getattr(user, 'socio', None)
        if socio is None:
            # Non-socio users (staff) pass through — they are not socios.
            return True

        if socio.estado == 'activo':
            return True

        # Provide a detailed error response
        motivo_map = {
            'suspendido': 'Tu cuenta está suspendida. Contactá recepción para más información.',
            'baja': 'Tu cuenta está dada de baja. Contactá recepción para más información.',
        }
        motivo = motivo_map.get(socio.estado, f'Estado de cuenta no habilitado: {socio.estado}.')
        raise PermissionDenied({'detail': motivo, 'motivo': socio.estado})
