from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.access.permissions import IsAdminOnly, IsReceptionistOrAdmin

from .models import Socio
from .serializers import SocioSerializer
from .services import dar_baja


class SocioViewSet(viewsets.ModelViewSet):
    queryset = Socio.objects.all().order_by('id')
    serializer_class = SocioSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'dar_baja'):
            return [IsAdminOnly()]
        return [IsReceptionistOrAdmin()]

    @action(detail=True, methods=['post'], url_path='dar-baja', url_name='dar-baja')
    def dar_baja(self, request, pk=None):
        socio = self.get_object()

        if socio.estado == Socio.Estado.BAJA:
            return Response(
                {'detail': 'El socio ya está dado de baja.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dar_baja(socio)

        serializer = SocioSerializer(socio)
        return Response(serializer.data, status=status.HTTP_200_OK)
