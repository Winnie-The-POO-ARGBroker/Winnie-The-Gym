from rest_framework import serializers

from .models import GymConfig


class GymConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = GymConfig
        fields = [
            'nombre_gym',
            'aforo_maximo',
            'hora_apertura',
            'hora_cierre',
            'telefono_contacto',
        ]
