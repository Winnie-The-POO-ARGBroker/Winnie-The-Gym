from rest_framework import viewsets
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.access.permissions import IsAdminOnly, IsReceptionistOrAdmin
from apps.common.pagination import PageSizePagination

from .models import CierreGimnasio, GymConfig
from .serializers import CierreGimnasioSerializer, GymConfigSerializer


class GymConfigView(RetrieveUpdateAPIView):
    """
    GET  /api/config/gym/  — publicly readable (used by all frontend consumers)
    PATCH /api/config/gym/  — admin-only (update gym configuration)
    PUT is disabled; only partial updates (PATCH) are allowed.
    """

    serializer_class = GymConfigSerializer
    # Disable the default PUT method — only PATCH makes sense for a singleton.
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_object(self):
        return GymConfig.get()

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminOnly()]


class CierreGimnasioViewSet(viewsets.ModelViewSet):
    """CRUD for gym closures and holidays (#182).

    Permissions:
      - list / retrieve: any authenticated staff (recep or admin) and socios (read-only).
      - create / update / partial_update / destroy: admin only.
    """
    pagination_class = PageSizePagination

    queryset = CierreGimnasio.objects.select_related('sala', 'created_by').all()
    serializer_class = CierreGimnasioSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAdminOnly()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
