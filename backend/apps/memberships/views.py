from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.access.permissions import IsAdminOnly, IsReceptionistOrAdmin, IsSocio

from .models import Membresia, PlanMembresia
from .serializers import (
    MembresiaDetailSerializer,
    MembresiaSerializer,
    PlanMembresiaSerializer,
    SocioMeSerializer,
)
from .services import renovar_membresia


class PlanMembresiaViewSet(viewsets.ModelViewSet):
    queryset = PlanMembresia.objects.all().order_by('id')
    serializer_class = PlanMembresiaSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOnly()]
        # list and retrieve are readable by any authenticated user (including socios)
        return [IsAuthenticated()]


class MembresiaViewSet(viewsets.ModelViewSet):
    queryset = Membresia.objects.all().order_by('id')

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOnly()]
        return [IsReceptionistOrAdmin()]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MembresiaDetailSerializer
        return MembresiaSerializer


class MeView(APIView):
    permission_classes = [IsSocio]

    def get(self, request):
        socio = request.user.socio
        serializer = SocioMeSerializer(socio)
        return Response(serializer.data)


class MeRenewView(APIView):
    permission_classes = [IsSocio]

    def post(self, request):
        plan_id = request.data.get('plan_id')
        plan = get_object_or_404(PlanMembresia, pk=plan_id, activo=True)

        socio = request.user.socio
        membresia = renovar_membresia(socio, plan)

        serializer = MembresiaDetailSerializer(membresia)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
