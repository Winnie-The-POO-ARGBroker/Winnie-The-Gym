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
from apps.members.permissions import IsSocioActivo

from .filters import ClaseFilter, InscripcionClaseFilter
from .models import Clase, Disciplina, InscripcionClase, Instructor, Sala, SesionClase
from .pagination import ClasePagination
from .serializers import (
    ClaseDetailSerializer,
    ClaseSerializer,
    DisciplinaSerializer,
    InscripcionClaseSerializer,
    InstructorSerializer,
    SalaSerializer,
    SesionClaseSerializer,
)
from .services import cancelar_clase as service_cancelar_clase
from .services import (
    cancelar_inscripcion,
    cancelar_sesion,
    editar_serie,
    generar_sesiones,
    generar_sesiones_ventana,
    inscribir_socio,
    promover_de_espera,
    reactivar_clase,
)


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
    pagination_class = ClasePagination
    search_fields = ['nombre', 'instructor', 'sala', 'descripcion']
    ordering_fields = ['nombre', 'hora', 'dia', 'cupo_maximo', 'created_at']
    ordering = ['id']

    def get_queryset(self):
        qs = Clase.objects.all().order_by('id')
        incluir = self.request.query_params.get('incluir_canceladas', 'false').lower()
        if incluir != 'true':
            qs = qs.exclude(estado=Clase.Estado.CANCELADA)
        return qs

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAdminOnly()]
        if self.action in (
            'create', 'update', 'partial_update', 'cancelar_clase',
            'cerrar_asistencia', 'inscribir_manual', 'promover_espera', 'reactivar',
            'editar_serie',
        ):
            return [IsReceptionistOrAdmin()]
        if self.action == 'cancelar':
            # Suspended socios CAN cancel existing reservations (#230)
            return [IsSocio()]
        if self.action == 'inscribir':
            # Suspended/baja socios CANNOT inscribe (#230)
            return [IsSocio(), IsSocioActivo()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ClaseDetailSerializer
        return ClaseSerializer

    def perform_create(self, serializer):
        clase = serializer.save()
        # Show the new class in the calendar right away instead of waiting for the
        # daily job.
        generar_sesiones_ventana(clase)

    def perform_update(self, serializer):
        clase = serializer.save()
        # Idempotent: adds sessions for days that were just enabled.
        if clase.estado == Clase.Estado.ACTIVA:
            generar_sesiones_ventana(clase)

    def partial_update(self, request, *args, **kwargs):
        """PATCH — reject estado field with a clear 400 message."""
        if 'estado' in request.data:
            return Response(
                {'estado': 'El estado no se puede modificar directamente. Usá /cancelar-clase/ o /reactivar/.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # After PATCH raises cupo promotion if cupo_maximo increased
        response = super().partial_update(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK and 'cupo_maximo' in request.data:
            clase = self.get_object()
            promover_de_espera(clase)
        return response

    def update(self, request, *args, **kwargs):
        """PUT — reject estado field with a clear 400 message."""
        if 'estado' in request.data:
            return Response(
                {'estado': 'El estado no se puede modificar directamente. Usá /cancelar-clase/ o /reactivar/.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        response = super().update(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK and 'cupo_maximo' in request.data:
            clase = self.get_object()
            promover_de_espera(clase)
        return response

    @extend_schema(
        tags=['classes'],
        summary='Inscribir al socio autenticado (HU07)',
        description=(
            'Inscribe al socio en la clase seleccionada. Si el cupo está lleno, '
            'lo coloca en lista de espera hasta el límite configurado. '
            'Socios suspendidos o dados de baja reciben HTTP 403 (#230).'
        ),
        request=None,
        responses={201: InscripcionClaseSerializer},
    )
    @action(detail=True, methods=['post'], permission_classes=[IsSocio, IsSocioActivo])
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

    @extend_schema(
        tags=['classes'],
        summary='Cancelar una clase (staff) — soft cancel con notificación (REQ-3.4)',
        request={'application/json': {'type': 'object', 'properties': {'motivo': {'type': 'string', 'minLength': 10}}}},
        responses={200: {
            'type': 'object',
            'properties': {
                'detail': {'type': 'string'},
                'confirmados_notificados': {'type': 'integer'},
                'espera_notificados': {'type': 'integer'},
            },
        }},
    )
    @action(
        detail=True,
        methods=['post'],
        url_path='cancelar-clase',
        url_name='cancelar-clase',
        permission_classes=[IsReceptionistOrAdmin],
    )
    def cancelar_clase(self, request, pk=None):
        clase = self.get_object()
        motivo = request.data.get('motivo', '')
        counts = service_cancelar_clase(clase, motivo, actor=request.user)
        return Response(
            {
                'detail': 'Clase cancelada correctamente.',
                **counts,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        tags=['classes'],
        summary='Reactivar una clase cancelada (staff)',
        request=None,
        responses={200: {'type': 'object', 'properties': {'detail': {'type': 'string'}}}},
    )
    @action(
        detail=True,
        methods=['post'],
        url_path='reactivar',
        url_name='reactivar',
        permission_classes=[IsReceptionistOrAdmin],
    )
    def reactivar(self, request, pk=None):
        clase = self.get_object()
        reactivar_clase(clase)
        return Response({'detail': 'Clase reactivada correctamente.'}, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['classes'],
        summary='Promover manualmente al primer socio de la lista de espera (staff)',
        request=None,
        responses={200: {'type': 'object', 'properties': {
            'detail': {'type': 'string'},
            'promovido': {'type': 'boolean'},
        }}},
    )
    @action(
        detail=True,
        methods=['post'],
        url_path='promover-espera',
        url_name='promover-espera',
        permission_classes=[IsReceptionistOrAdmin],
    )
    def promover_espera(self, request, pk=None):
        clase = self.get_object()
        promovido = promover_de_espera(clase)
        if promovido is None:
            return Response(
                {'detail': 'No hay nadie en lista de espera o no hay cupo disponible.', 'promovido': False},
                status=status.HTTP_200_OK,
            )
        return Response(
            {'detail': f'Socio {promovido.socio} promovido a confirmado.', 'promovido': True},
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        tags=['classes'],
        summary='Cerrar asistencia de una clase (staff)',
        description=(
            'Marca como ausentes (asistio=False) a todos los inscriptos cuya asistencia '
            'todavía no fue registrada (asistio IS NULL). Retorna resumen de presentes, '
            'ausentes y sin_marcar.'
        ),
        request=None,
        responses={200: {
            'type': 'object',
            'properties': {
                'presentes': {'type': 'integer'},
                'ausentes': {'type': 'integer'},
                'sin_marcar': {'type': 'integer'},
            },
        }},
    )
    @action(
        detail=True,
        methods=['post'],
        url_path='cerrar-asistencia',
        url_name='cerrar-asistencia',
        permission_classes=[IsReceptionistOrAdmin],
    )
    def cerrar_asistencia(self, request, pk=None):
        clase = self.get_object()
        inscripciones = clase.inscripciones.all()

        presentes = inscripciones.filter(asistio=True).count()
        inscripciones.filter(asistio__isnull=True).update(asistio=False)
        ausentes = inscripciones.filter(asistio=False).count()

        return Response({
            'presentes': presentes,
            'ausentes': ausentes,
            'sin_marcar': 0,
        }, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['classes'],
        summary='Editar una serie recurrente (staff) — #178',
        request={'application/json': {'type': 'object', 'properties': {
            'cambios': {'type': 'object'},
            'alcance': {'type': 'string', 'enum': ['solo_esta', 'esta_y_siguientes', 'toda']},
            'fecha_pivote': {'type': 'string', 'format': 'date'},
        }, 'required': ['cambios', 'alcance']}},
        responses={200: {'type': 'object'}},
    )
    @action(
        detail=True,
        methods=['post'],
        url_path='editar-serie',
        url_name='editar-serie',
        permission_classes=[IsReceptionistOrAdmin],
    )
    def editar_serie(self, request, pk=None):
        from datetime import date  # noqa: PLC0415

        clase = self.get_object()
        cambios = request.data.get('cambios', {})
        alcance = request.data.get('alcance', '')
        fecha_pivote_str = request.data.get('fecha_pivote')
        fecha_pivote = None
        if fecha_pivote_str:
            try:
                fecha_pivote = date.fromisoformat(fecha_pivote_str)
            except ValueError:
                return Response(
                    {'fecha_pivote': 'Formato inválido. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        result = editar_serie(clase, cambios, alcance, fecha_pivote=fecha_pivote)
        return Response(result, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['classes'],
        summary='Inscribir un socio manualmente (recep/admin)',
        description=(
            'Staff puede inscribir cualquier socio pasando su ID en el body. '
            'Usa las mismas validaciones que la inscripción propia del socio. '
            'forzar=true permite sobrecupo (admin only).'
        ),
        request={'application/json': {'type': 'object', 'properties': {
            'socio': {'type': 'integer'},
            'forzar': {'type': 'boolean'},
        }, 'required': ['socio']}},
        responses={201: InscripcionClaseSerializer},
    )
    @action(
        detail=True,
        methods=['post'],
        url_path='inscribir-manual',
        url_name='inscribir-manual',
        permission_classes=[IsReceptionistOrAdmin],
    )
    def inscribir_manual(self, request, pk=None):
        from apps.members.models import Socio  # noqa: PLC0415

        clase = self.get_object()
        socio_id = request.data.get('socio')
        forzar = bool(request.data.get('forzar', False))

        if not socio_id:
            return Response({'detail': 'Se requiere el campo socio.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            socio = Socio.objects.get(pk=socio_id)
        except Socio.DoesNotExist:
            return Response({'detail': 'Socio no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if forzar and not (request.user.is_staff or getattr(request.user, 'rol', '') == 'administrador'):
            forzar = False

        inscripcion = inscribir_socio(clase, socio, forzar=forzar)
        return Response(
            InscripcionClaseSerializer(inscripcion).data,
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------------------------
# #179 — Disciplina and Sala CRUD ViewSets
# ---------------------------------------------------------------------------

@extend_schema_view(
    list=extend_schema(tags=['classes'], summary='Listar disciplinas'),
    retrieve=extend_schema(tags=['classes'], summary='Detalle de disciplina'),
    create=extend_schema(tags=['classes'], summary='Crear disciplina (admin)'),
    update=extend_schema(tags=['classes'], summary='Actualizar disciplina (admin)'),
    partial_update=extend_schema(tags=['classes'], summary='Actualizar parcialmente disciplina (admin)'),
    destroy=extend_schema(tags=['classes'], summary='Eliminar o desactivar disciplina (admin)'),
)
class DisciplinaViewSet(viewsets.ModelViewSet):
    """CRUD for Disciplina catalog. Admin write, staff/socio read.

    DELETE with active Clases → offers soft-deactivation (activa=False) instead.
    """
    queryset = Disciplina.objects.all().order_by('nombre')
    serializer_class = DisciplinaSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOnly()]
        return [permissions.IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        """#179 — Soft-delete: if Disciplina has associated clases, deactivate instead."""
        disciplina = self.get_object()
        if disciplina.clases.exists():
            if disciplina.activa:
                disciplina.activa = False
                disciplina.save(update_fields=['activa'])
                return Response(
                    {
                        'detail': (
                            f'La disciplina "{disciplina.nombre}" tiene clases asociadas y fue desactivada '
                            'en lugar de eliminada. Reasigná o eliminá las clases primero para poder '
                            'eliminarla definitivamente.'
                        ),
                        'desactivada': True,
                    },
                    status=status.HTTP_200_OK,
                )
            return Response(
                {
                    'detail': (
                        f'La disciplina "{disciplina.nombre}" tiene clases asociadas. '
                        'Reasigná o eliminá las clases primero.'
                    ),
                    'desactivada': False,
                },
                status=status.HTTP_409_CONFLICT,
            )
        disciplina.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    list=extend_schema(tags=['classes'], summary='Listar salas'),
    retrieve=extend_schema(tags=['classes'], summary='Detalle de sala'),
    create=extend_schema(tags=['classes'], summary='Crear sala (admin)'),
    update=extend_schema(tags=['classes'], summary='Actualizar sala (admin)'),
    partial_update=extend_schema(tags=['classes'], summary='Actualizar parcialmente sala (admin)'),
    destroy=extend_schema(tags=['classes'], summary='Eliminar o desactivar sala (admin)'),
)
class SalaViewSet(viewsets.ModelViewSet):
    """CRUD for Sala catalog. Admin write, staff/socio read.

    DELETE with active Clases → offers soft-deactivation (activa=False) instead.
    """
    queryset = Sala.objects.all().order_by('nombre')
    serializer_class = SalaSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOnly()]
        return [permissions.IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        """#179 — Soft-delete: if Sala has associated clases, deactivate instead."""
        sala = self.get_object()
        if sala.clases.exists():
            if sala.activa:
                sala.activa = False
                sala.save(update_fields=['activa'])
                return Response(
                    {
                        'detail': (
                            f'La sala "{sala.nombre}" tiene clases asociadas y fue desactivada '
                            'en lugar de eliminada. Reasigná o eliminá las clases primero para poder '
                            'eliminarla definitivamente.'
                        ),
                        'desactivada': True,
                    },
                    status=status.HTTP_200_OK,
                )
            return Response(
                {
                    'detail': (
                        f'La sala "{sala.nombre}" tiene clases asociadas. '
                        'Reasigná o eliminá las clases primero.'
                    ),
                    'desactivada': False,
                },
                status=status.HTTP_409_CONFLICT,
            )
        sala.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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
    # All inscripcion mutations are staff-only (#171 — socios get 403 on PATCH)
    permission_classes = [IsReceptionistOrAdmin]

    @extend_schema(
        tags=['classes'],
        summary='Posición del socio autenticado en la lista de espera',
        parameters=[
            OpenApiParameter('clase_id', OpenApiTypes.INT, location=OpenApiParameter.QUERY, required=True,
                             description='ID de la clase para consultar la posición en espera.'),
        ],
        responses={200: {
            'type': 'object',
            'properties': {'posicion_en_espera': {'type': 'integer', 'nullable': True}},
        }},
    )
    @action(
        detail=False,
        methods=['get'],
        url_path='mi-posicion',
        url_name='mi-posicion',
        permission_classes=[IsSocio],
    )
    def mi_posicion(self, request):
        """Return the authenticated socio's position in the wait-list for a class.

        Query param: ``clase_id`` (required).
        Returns ``posicion_en_espera: null`` if the socio is not in the wait-list.
        """
        clase_id = request.query_params.get('clase_id')
        if not clase_id:
            return Response(
                {'detail': 'El parámetro clase_id es requerido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            clase_id = int(clase_id)
            clase = Clase.objects.get(pk=clase_id)
        except (ValueError, Clase.DoesNotExist):
            return Response(
                {'detail': 'Clase no encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        socio = request.user.socio

        try:
            inscripcion = InscripcionClase.objects.get(clase=clase, socio=socio, en_espera=True)
        except InscripcionClase.DoesNotExist:
            return Response({'posicion_en_espera': None}, status=status.HTTP_200_OK)

        # Count how many wait-listed inscriptions were created before this one
        posicion = (
            InscripcionClase.objects
            .filter(clase=clase, en_espera=True, created_at__lt=inscripcion.created_at)
            .count()
        ) + 1

        return Response({'posicion_en_espera': posicion}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# #178 — SesionClase ViewSet
# ---------------------------------------------------------------------------

@extend_schema_view(
    list=extend_schema(
        tags=['classes'],
        summary='Listar sesiones de clase por rango de fechas (#178)',
        parameters=[
            OpenApiParameter('fecha_desde', OpenApiTypes.DATE, description='Fecha inicio del rango (YYYY-MM-DD).'),
            OpenApiParameter('fecha_hasta', OpenApiTypes.DATE, description='Fecha fin del rango (YYYY-MM-DD).'),
            OpenApiParameter('clase_id', OpenApiTypes.INT, description='Filtrar por clase.'),
        ],
    ),
    retrieve=extend_schema(tags=['classes'], summary='Detalle de sesión'),
)
class SesionClaseViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only list/retrieve for SesionClase + cancelar action (staff).

    Supports filtering by ?fecha_desde=, ?fecha_hasta=, ?clase_id=.
    """
    serializer_class = SesionClaseSerializer
    permission_classes = [permissions.IsAuthenticated]
    # Same paginator as the class list: honours ?page_size= (up to 1000) so the
    # calendar can load a whole week; the default page stays at 10.
    pagination_class = ClasePagination

    def get_queryset(self):
        qs = SesionClase.objects.select_related(
            'clase', 'cancelada_por', 'instructor_override_fk',
        ).order_by('fecha', 'clase')

        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        clase_id = self.request.query_params.get('clase_id')

        if fecha_desde:
            qs = qs.filter(fecha__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha__lte=fecha_hasta)
        if clase_id:
            qs = qs.filter(clase_id=clase_id)

        return qs

    @extend_schema(
        tags=['classes'],
        summary='Cancelar una sesión específica (staff) — #178',
        request={'application/json': {'type': 'object', 'properties': {
            'motivo': {'type': 'string', 'minLength': 10},
        }, 'required': ['motivo']}},
        responses={200: {'type': 'object', 'properties': {'detail': {'type': 'string'}}}},
    )
    @action(
        detail=True,
        methods=['post'],
        url_path='cancelar',
        url_name='cancelar',
        permission_classes=[IsReceptionistOrAdmin],
    )
    def cancelar(self, request, pk=None):
        sesion = self.get_object()
        motivo = request.data.get('motivo', '')
        cancelar_sesion(sesion, motivo, actor=request.user)
        return Response({'detail': 'Sesión cancelada correctamente.'}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# #180 Fase 1 — Instructor ViewSet
# ---------------------------------------------------------------------------

@extend_schema_view(
    list=extend_schema(tags=['classes'], summary='Listar instructores'),
    retrieve=extend_schema(tags=['classes'], summary='Detalle de instructor'),
    create=extend_schema(tags=['classes'], summary='Crear instructor (admin)'),
    update=extend_schema(tags=['classes'], summary='Actualizar instructor (admin)'),
    partial_update=extend_schema(tags=['classes'], summary='Actualizar parcialmente instructor (admin)'),
    destroy=extend_schema(tags=['classes'], summary='Eliminar o desactivar instructor (admin)'),
)
class InstructorViewSet(viewsets.ModelViewSet):
    """CRUD for Instructor catalog. Admin write, staff/socio read.

    DELETE with assigned Clases → offers soft-deactivation (activo=False) instead
    of raising a ProtectedError.
    """
    queryset = Instructor.objects.all().order_by('apellido', 'nombre')
    serializer_class = InstructorSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOnly()]
        return [permissions.IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        """#180 Fase 1 — Soft-delete: if Instructor has assigned Clases, deactivate instead."""
        instructor = self.get_object()
        has_clases = instructor.clases.exists()

        if has_clases:
            if instructor.activo:
                instructor.activo = False
                instructor.save(update_fields=['activo'])
                return Response(
                    {
                        'detail': (
                            f'El instructor "{instructor.nombre} {instructor.apellido}" tiene '
                            'clases asignadas y fue desactivado en lugar de eliminado. '
                            'Reasigná o eliminá las clases primero para poder eliminarlo definitivamente.'
                        ),
                        'desactivado': True,
                    },
                    status=status.HTTP_200_OK,
                )
            return Response(
                {
                    'detail': (
                        f'El instructor "{instructor.nombre} {instructor.apellido}" tiene '
                        'clases asignadas. Reasigná o eliminá las clases primero.'
                    ),
                    'desactivado': False,
                },
                status=status.HTTP_409_CONFLICT,
            )

        instructor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
