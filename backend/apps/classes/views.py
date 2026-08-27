from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.access.permissions import IsAdminOnly, IsReceptionistOrAdmin
from .models import Clase, InscripcionClase
from .serializers import (
    ClaseDetailSerializer,
    ClaseSerializer,
    InscripcionClaseSerializer,
)


class ClaseViewSet(viewsets.ModelViewSet):
    queryset = Clase.objects.all().order_by('id')
    serializer_class = ClaseSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOnly()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ClaseDetailSerializer
        return ClaseSerializer

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def inscribir(self, request, pk=None):
        clase = self.get_object()
        user = request.user

        if not hasattr(user, 'socio'):
            return Response(
                {'detail': 'El usuario no tiene perfil de socio.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        socio = user.socio

        if InscripcionClase.objects.filter(clase=clase, socio=socio).exists():
            return Response(
                {'detail': 'Ya estás inscripto en esta clase.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cupos_ocupados = clase.inscripciones.filter(en_espera=False).count()
        en_espera = cupos_ocupados >= clase.cupo_maximo

        inscripcion = InscripcionClase.objects.create(
            clase=clase,
            socio=socio,
            en_espera=en_espera,
        )

        return Response(
            InscripcionClaseSerializer(inscripcion).data,
            status=status.HTTP_201_CREATED,
        )


class InscripcionClaseViewSet(viewsets.ModelViewSet):
    queryset = InscripcionClase.objects.all()
    serializer_class = InscripcionClaseSerializer
    permission_classes = [IsReceptionistOrAdmin]
