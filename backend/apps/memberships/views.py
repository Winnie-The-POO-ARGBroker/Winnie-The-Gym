import datetime

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
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


class PlanListCreateView(generics.ListCreateAPIView):
    queryset = PlanMembresia.objects.all().order_by('id')
    serializer_class = PlanMembresiaSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOnly()]
        return [IsAuthenticated()]


class PlanRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PlanMembresia.objects.all()
    serializer_class = PlanMembresiaSerializer
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        if self.request.method in ('PATCH', 'PUT', 'DELETE'):
            return [IsAdminOnly()]
        return [IsAuthenticated()]


class MembresiaListCreateView(generics.ListCreateAPIView):
    queryset = Membresia.objects.all().order_by('id')
    serializer_class = MembresiaSerializer
    permission_classes = [IsReceptionistOrAdmin]


class MembresiaRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    queryset = Membresia.objects.all()
    permission_classes = [IsReceptionistOrAdmin]
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_serializer_class(self):
        if self.request.method == 'GET':
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

        with transaction.atomic():
            Membresia.objects.filter(socio=socio, estado='activa').update(estado='vencida')

            today = datetime.date.today()
            fecha_fin = today + datetime.timedelta(days=plan.duracion_dias)
            membresia = Membresia.objects.create(
                socio=socio,
                plan=plan,
                fecha_inicio=today,
                fecha_fin=fecha_fin,
                estado='activa',
            )

        serializer = MembresiaDetailSerializer(membresia)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
