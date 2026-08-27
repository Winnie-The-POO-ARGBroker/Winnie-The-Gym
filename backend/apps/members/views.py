import datetime

from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.access.permissions import IsReceptionistOrAdmin

from .models import Socio
from .serializers import SocioSerializer


class SocioListCreateView(generics.ListCreateAPIView):
    queryset = Socio.objects.all().order_by('id')
    serializer_class = SocioSerializer
    permission_classes = [IsReceptionistOrAdmin]


class SocioRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    queryset = Socio.objects.all()
    serializer_class = SocioSerializer
    permission_classes = [IsReceptionistOrAdmin]
    http_method_names = ['get', 'patch', 'head', 'options']


class SocioDarBajaView(APIView):
    permission_classes = [IsReceptionistOrAdmin]

    def post(self, request, pk):
        socio = get_object_or_404(Socio, pk=pk)

        if socio.estado == 'baja':
            return Response(
                {'detail': 'El socio ya está dado de baja.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        socio.estado = 'baja'
        socio.fecha_baja = datetime.date.today()
        socio.save(update_fields=['estado', 'fecha_baja', 'updated_at'])

        serializer = SocioSerializer(socio)
        return Response(serializer.data, status=status.HTTP_200_OK)
