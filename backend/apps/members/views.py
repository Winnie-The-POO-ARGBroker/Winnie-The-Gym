from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.access.permissions import IsAdminOnly, IsReceptionistOrAdmin

from .filters import SocioFilter
from .models import Socio
from .serializers import SocioCertificadoUploadSerializer, SocioSerializer
from .services import dar_baja, guardar_certificado_medico


@extend_schema_view(
    list=extend_schema(tags=['members'], summary='Listar socios (recep/admin)'),
    retrieve=extend_schema(tags=['members'], summary='Detalle de socio (recep/admin)'),
    create=extend_schema(tags=['members'], summary='Alta de socio (admin)'),
    update=extend_schema(tags=['members'], summary='Actualizar socio (admin)'),
    partial_update=extend_schema(tags=['members'], summary='Actualizar socio parcialmente (admin)'),
    destroy=extend_schema(tags=['members'], summary='Eliminar socio (admin)'),
)
class SocioViewSet(viewsets.ModelViewSet):
    queryset = Socio.objects.all().order_by('id')
    serializer_class = SocioSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_class = SocioFilter
    search_fields = ['nombre', 'apellido', 'dni', 'numero_socio']
    ordering_fields = ['apellido', 'nombre', 'numero_socio', 'created_at']
    ordering = ['numero_socio']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'dar_baja'):
            return [IsAdminOnly()]
        return [IsReceptionistOrAdmin()]

    @extend_schema(
        tags=['members'],
        summary='Dar de baja al socio (admin)',
        request=None,
        responses={200: SocioSerializer},
    )
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

    @extend_schema(
        tags=['members'],
        summary='Subir certificado médico del socio (RF08)',
        description=(
            'Adjunta el certificado médico digital del socio (PDF o imagen, máx. 5 MB). '
            'El archivo se persiste bajo MEDIA_ROOT/certificados_medicos/ y la URL '
            'resultante se guarda en `certificado_medico_url`. En producción este flujo '
            'delega en Supabase Storage.'
        ),
        request={'multipart/form-data': SocioCertificadoUploadSerializer},
        responses={200: SocioSerializer},
    )
    @action(
        detail=True,
        methods=['post'],
        url_path='certificado-medico',
        url_name='certificado-medico',
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def subir_certificado(self, request, pk=None):
        socio = self.get_object()

        upload_serializer = SocioCertificadoUploadSerializer(data=request.data)
        upload_serializer.is_valid(raise_exception=True)
        archivo = upload_serializer.validated_data['archivo']

        socio = guardar_certificado_medico(socio, archivo, request=request)

        return Response(SocioSerializer(socio).data, status=status.HTTP_200_OK)
