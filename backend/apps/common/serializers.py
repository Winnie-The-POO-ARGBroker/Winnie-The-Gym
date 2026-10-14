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
            'cierre_gracia_minutos',
            'telefono_contacto',
            'aforo_umbral_alerta_pct',
            'aforo_bloqueo_al_llegar_max',
        ]
