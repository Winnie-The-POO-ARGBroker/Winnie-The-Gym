from django.db.models import ProtectedError
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiTypes, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.access.permissions import IsAdminOnly, IsReceptionistOrAdmin, IsSocio
from apps.common.pagination import PageSizePagination

from .filters import MembresiaFilter, PlanMembresiaFilter
from .models import Membresia, PlanMembresia
from .selectors import socios_morosos_queryset
from .serializers import (
    MembresiaDetailSerializer,
    MembresiaSerializer,
    PlanMembresiaSerializer,
    SocioMeSerializer,
    SocioMorosoSerializer,
)
from .services import (
    cancelar_membresia,
    reactivar_membresia,
    renovar_membresia,
    suspender_membresia,
)


class PlanMembresiaPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


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
    # #165 — subtitulo added to search
    search_fields = ['nombre', 'subtitulo']
    ordering_fields = ['nombre', 'precio', 'duracion_dias', 'created_at']
    ordering = ['id']
    pagination_class = PlanMembresiaPagination

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOnly()]
        return [IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        """#165 — Catch ProtectedError and return 400 instead of 500."""
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            count = instance.membresias.count()
            return Response(
                {
                    'detail': (
                        f'No se puede eliminar el plan: tiene {count} '
                        f'membresía{"s" if count != 1 else ""} asociada'
                        f'{"s" if count != 1 else ""}. '
                        'Primero cancelá o cambiá de plan a esas membresías.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    list=extend_schema(tags=['memberships'], summary='Listar membresías (recep/admin)'),
    retrieve=extend_schema(tags=['memberships'], summary='Detalle de membresía (recep/admin)'),
    create=extend_schema(tags=['memberships'], summary='Crear membresía (admin)'),
    update=extend_schema(tags=['memberships'], summary='Actualizar membresía (admin)'),
    partial_update=extend_schema(tags=['memberships'], summary='Actualizar membresía parcialmente (admin)'),
    destroy=extend_schema(tags=['memberships'], summary='Eliminar membresía (admin)'),
)
class MembresiaViewSet(viewsets.ModelViewSet):
    pagination_class = PageSizePagination
    queryset = Membresia.objects.select_related('socio', 'plan', 'cambiado_por').order_by('id')
    filterset_class = MembresiaFilter
    ordering_fields = ['fecha_inicio', 'fecha_fin', 'estado', 'created_at']
    ordering = ['-fecha_inicio']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOnly()]
        if self.action == 'cancelar':
            return [IsAdminOnly()]
        return [IsReceptionistOrAdmin()]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MembresiaDetailSerializer
        return MembresiaSerializer

    @extend_schema(
        tags=['memberships'],
        summary='Suspender membresía (recep/admin)',
        request={'application/json': {'type': 'object', 'properties': {'motivo': {'type': 'string'}}, 'required': ['motivo']}},
        responses={200: MembresiaSerializer, 400: OpenApiTypes.OBJECT},
    )
    @action(detail=True, methods=['post'], url_path='suspender', url_name='suspender')
    def suspender(self, request, pk=None):
        membresia = self.get_object()
        motivo = (request.data.get('motivo') or '').strip()

        try:
            suspender_membresia(membresia, request.user, motivo)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(MembresiaSerializer(membresia).data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['memberships'],
        summary='Reactivar membresía suspendida (recep/admin)',
        request={'application/json': {'type': 'object', 'properties': {'motivo': {'type': 'string'}}}},
        responses={200: MembresiaSerializer, 400: OpenApiTypes.OBJECT},
    )
    @action(detail=True, methods=['post'], url_path='reactivar', url_name='reactivar')
    def reactivar(self, request, pk=None):
        membresia = self.get_object()
        motivo = (request.data.get('motivo') or '').strip()

        try:
            reactivar_membresia(membresia, request.user, motivo)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(MembresiaSerializer(membresia).data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['memberships'],
        summary='Cancelar membresía (admin)',
        request={'application/json': {'type': 'object', 'properties': {'motivo': {'type': 'string'}}, 'required': ['motivo']}},
        responses={200: MembresiaSerializer, 400: OpenApiTypes.OBJECT},
    )
    @action(detail=True, methods=['post'], url_path='cancelar', url_name='cancelar')
    def cancelar(self, request, pk=None):
        membresia = self.get_object()
        motivo = (request.data.get('motivo') or '').strip()

        try:
            cancelar_membresia(membresia, request.user, motivo)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(MembresiaSerializer(membresia).data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['memberships'],
        summary='Renovar membresía (recep/admin)',
        request={'application/json': {'type': 'object', 'properties': {'plan_id': {'type': 'integer'}}, 'required': ['plan_id']}},
        responses={201: MembresiaSerializer, 400: OpenApiTypes.OBJECT},
    )
    @action(detail=True, methods=['post'], url_path='renovar', url_name='renovar')
    def renovar(self, request, pk=None):
        membresia = self.get_object()
        plan_id = request.data.get('plan_id')
        if not plan_id:
            return Response({'detail': 'plan_id es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        plan = get_object_or_404(PlanMembresia, pk=plan_id, activo=True)
        nueva = renovar_membresia(membresia.socio, plan)
        return Response(MembresiaSerializer(nueva).data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=['memberships'],
    summary='Socios en mora (recep/admin)',
    description=(
        'Lista socios cuya última membresía está vencida. '
        'Excluye socios que ya renovaron (último estado ACTIVA).'
    ),
    responses={200: SocioMorosoSerializer(many=True)},
)
class MorosidadView(APIView):
    permission_classes = [IsReceptionistOrAdmin]

    def get(self, request):
        from rest_framework.pagination import PageNumberPagination
        qs = socios_morosos_queryset()

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            serializer = SocioMorosoSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = SocioMorosoSerializer(qs, many=True)
        return Response(serializer.data)


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
    summary='[DEPRECATED] Renovar membresía — use /api/payments/preferencias/',
    description=(
        'Este endpoint fue desactivado por riesgo de seguridad (activación sin cobro). '
        'Use `POST /api/payments/preferencias/` para renovar via MercadoPago.'
    ),
    responses={410: OpenApiTypes.OBJECT},
    deprecated=True,
)
class MeRenewView(APIView):
    permission_classes = [IsSocio]

    def post(self, request):
        return Response(
            {'detail': 'Use /api/payments/preferencias/ para renovar via MercadoPago.'},
            status=status.HTTP_410_GONE,
        )
