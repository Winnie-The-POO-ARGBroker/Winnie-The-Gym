from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny

from apps.access.permissions import IsAdminOnly

from .models import GymConfig
from .serializers import GymConfigSerializer


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
