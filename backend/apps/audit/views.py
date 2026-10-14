from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, viewsets
from rest_framework.filters import OrderingFilter
from rest_framework.pagination import PageNumberPagination

from apps.access.permissions import IsAdminOnly

from .filters import AuditLogFilter
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 200


@extend_schema_view(
    list=extend_schema(
        tags=['audit'],
        summary='Listar audit logs (admin only)',
        description=(
            'Devuelve el historial de cambios de los modelos auditados. '
            'Filtros: actor_id, entity_type, date_from, date_to.'
        ),
    ),
)
class AuditLogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Read-only, admin-only audit log endpoint."""

    queryset = AuditLog.objects.select_related('actor').order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminOnly]
    pagination_class = AuditLogPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = AuditLogFilter
    ordering_fields = ['timestamp', 'entity_type', 'action']
    ordering = ['-timestamp']
