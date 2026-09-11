from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.access.permissions import IsAdminOnly, IsReceptionistOrAdmin, IsSocio

from .filters import MembresiaFilter, PlanMembresiaFilter
from .models import Membresia, PlanMembresia
from .serializers import (
    MembresiaDetailSerializer,
    MembresiaSerializer,
    PlanMembresiaSerializer,
    SocioMeSerializer,
)
from .services import renovar_membresia


@extend_schema_view(
    list=extend_schema(tags=['memberships'], summary='Listar planes de membresía'),
    retrieve=extend_schema(tags=['memberships'], summary='Detalle de plan de membresía'),
    create=extend_schema(tags=['memberships'], summary='Crear plan (admin)'),
    update=extend_schema(tags=['memberships'], summary='Actualizar plan (admin)'),
    partial_update=extend_schema(tags=['memberships'], summary='Actualizar plan parcialmente (admin)'),
    destroy=extend_schema(tags=['memberships'], summary='Eliminar plan (admin)'),
)
class PlanMembresiaViewSet(viewsets.ModelViewSet):
    queryset = PlanMembresia.objects.all().order_by('id')
    serializer_class = PlanMembresiaSerializer
    filterset_class = PlanMembresiaFilter
    search_fields = ['nombre']
    ordering_fields = ['nombre', 'precio', 'duracion_dias', 'created_at']
    ordering = ['id']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOnly()]
        return [IsAuthenticated()]


@extend_schema_view(
    list=extend_schema(tags=['memberships'], summary='Listar membresías (recep/admin)'),
    retrieve=extend_schema(tags=['memberships'], summary='Detalle de membresía (recep/admin)'),
    create=extend_schema(tags=['memberships'], summary='Crear membresía (admin)'),
    update=extend_schema(tags=['memberships'], summary='Actualizar membresía (admin)'),
    partial_update=extend_schema(tags=['memberships'], summary='Actualizar membresía parcialmente (admin)'),
    destroy=extend_schema(tags=['memberships'], summary='Eliminar membresía (admin)'),
)
class MembresiaViewSet(viewsets.ModelViewSet):
    queryset = Membresia.objects.all().order_by('id')
    filterset_class = MembresiaFilter
    ordering_fields = ['fecha_inicio', 'fecha_fin', 'estado', 'created_at']
    ordering = ['-fecha_inicio']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOnly()]
        return [IsReceptionistOrAdmin()]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MembresiaDetailSerializer
        return MembresiaSerializer


@extend_schema(
    tags=['memberships'],
    summary='Datos del socio autenticado (self-service)',
    responses={200: SocioMeSerializer},
)
class MeView(APIView):
    permission_classes = [IsSocio]
    serializer_class = SocioMeSerializer

    def get(self, request):
        socio = request.user.socio
        serializer = SocioMeSerializer(socio)
        return Response(serializer.data)


@extend_schema(
    tags=['memberships'],
    summary='Renovar la membresía del socio autenticado',
    request={
        'application/json': {
            'type': 'object',
            'properties': {'plan_id': {'type': 'integer'}},
            'required': ['plan_id'],
        }
    },
    responses={201: MembresiaDetailSerializer},
)
class MeRenewView(APIView):
    permission_classes = [IsSocio]

    def post(self, request):
        plan_id = request.data.get('plan_id')
        plan = get_object_or_404(PlanMembresia, pk=plan_id, activo=True)

        socio = request.user.socio
        membresia = renovar_membresia(socio, plan)

        serializer = MembresiaDetailSerializer(membresia)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
