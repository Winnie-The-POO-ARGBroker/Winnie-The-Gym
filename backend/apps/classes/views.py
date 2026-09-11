from drf_spectacular.utils import (
    OpenApiExample,
    OpenApiParameter,
    OpenApiTypes,
    extend_schema,
    extend_schema_view,
)
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.access.permissions import IsAdminOnly, IsReceptionistOrAdmin, IsSocio

from .filters import ClaseFilter, InscripcionClaseFilter
from .models import Clase, InscripcionClase
from .serializers import (
    ClaseDetailSerializer,
    ClaseSerializer,
    InscripcionClaseSerializer,
)
from .services import cancelar_inscripcion, inscribir_socio


@extend_schema_view(
    list=extend_schema(
        tags=['classes'],
        summary='Listar clases',
        description=(
            'Devuelve las clases del gimnasio con paginación (10 por página). '
            'Soporta búsqueda por texto (nombre, instructor, sala) y filtros '
            'combinables por categoría, día, estado y rango horario (HU06).'
        ),
        parameters=[
            OpenApiParameter('search', OpenApiTypes.STR, description='Texto libre sobre nombre, instructor y sala.'),
            OpenApiParameter('hora_desde', OpenApiTypes.TIME, description='Hora mínima (HH:MM).'),
            OpenApiParameter('hora_hasta', OpenApiTypes.TIME, description='Hora máxima (HH:MM).'),
            OpenApiParameter('cupo_disponible', OpenApiTypes.BOOL, description='Solo clases con cupos libres.'),
            OpenApiParameter('ordering', OpenApiTypes.STR, description='Campo por el cual ordenar. Prefijo "-" para desc.'),
        ],
    ),
    retrieve=extend_schema(tags=['classes'], summary='Detalle de clase con sus inscripciones'),
    create=extend_schema(tags=['classes'], summary='Crear una clase (admin)'),
    update=extend_schema(tags=['classes'], summary='Actualizar una clase (admin)'),
    partial_update=extend_schema(tags=['classes'], summary='Actualizar parcialmente una clase (admin)'),
    destroy=extend_schema(tags=['classes'], summary='Eliminar una clase (admin)'),
)
class ClaseViewSet(viewsets.ModelViewSet):
    queryset = Clase.objects.all().order_by('id')
    serializer_class = ClaseSerializer
    filterset_class = ClaseFilter
    search_fields = ['nombre', 'instructor', 'sala', 'descripcion']
    ordering_fields = ['nombre', 'hora', 'dia', 'cupo_maximo', 'created_at']
    ordering = ['id']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOnly()]
        if self.action in ('inscribir', 'cancelar'):
            return [IsSocio()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ClaseDetailSerializer
        return ClaseSerializer

    @extend_schema(
        tags=['classes'],
        summary='Inscribir al socio autenticado (HU07)',
        description=(
            'Inscribe al socio en la clase seleccionada. Si el cupo está lleno, '
            'lo coloca en lista de espera hasta el límite configurado.'
        ),
        request=None,
        responses={201: InscripcionClaseSerializer},
    )
    @action(detail=True, methods=['post'], permission_classes=[IsSocio])
    def inscribir(self, request, pk=None):
        clase = self.get_object()
        socio = request.user.socio
        inscripcion = inscribir_socio(clase, socio)
        return Response(
            InscripcionClaseSerializer(inscripcion).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        tags=['classes'],
        summary='Cancelar la inscripción del socio autenticado (HU07)',
        description=(
            'Cancela la inscripción del socio en la clase seleccionada. '
            'Rechaza cancelaciones fuera del margen `cancelacion_horas` de la clase. '
            'Al liberar un cupo, promueve automáticamente al primer socio de la lista de espera.'
        ),
        request=None,
        responses={200: OpenApiTypes.OBJECT},
        examples=[
            OpenApiExample(
                'Cancelación exitosa',
                value={'detail': 'Inscripción cancelada.', 'promovido_de_espera': True},
            ),
        ],
    )
    @action(detail=True, methods=['post'], permission_classes=[IsSocio])
    def cancelar(self, request, pk=None):
        clase = self.get_object()
        socio = request.user.socio
        promovido = cancelar_inscripcion(clase, socio)
        return Response(
            {
                'detail': 'Inscripción cancelada.',
                'promovido_de_espera': promovido,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    list=extend_schema(tags=['classes'], summary='Listar inscripciones a clases (recep/admin)'),
    retrieve=extend_schema(tags=['classes'], summary='Detalle de inscripción'),
    create=extend_schema(tags=['classes'], summary='Crear inscripción manual (recep/admin)'),
    update=extend_schema(tags=['classes'], summary='Actualizar inscripción (recep/admin)'),
    partial_update=extend_schema(tags=['classes'], summary='Actualizar parcialmente inscripción (recep/admin)'),
    destroy=extend_schema(tags=['classes'], summary='Eliminar inscripción (recep/admin)'),
)
class InscripcionClaseViewSet(viewsets.ModelViewSet):
    queryset = InscripcionClase.objects.all()
    serializer_class = InscripcionClaseSerializer
    filterset_class = InscripcionClaseFilter
    ordering_fields = ['created_at', 'clase', 'socio']
    ordering = ['-created_at']
    permission_classes = [IsReceptionistOrAdmin]
