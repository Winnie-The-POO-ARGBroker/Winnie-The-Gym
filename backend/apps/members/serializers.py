from rest_framework import serializers

from .models import Socio


class SocioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Socio
        fields = (
            'id',
            'usuario',
            'numero_socio',
            'nombre',
            'apellido',
            'dni',
            'telefono',
            'estado',
            'fecha_baja',
            'observaciones',
            'created_at',
        )
        read_only_fields = ('numero_socio', 'created_at')


class SocioBajaSerializer(serializers.Serializer):
    """Output-only serializer for the dar-baja action response."""
    estado = serializers.CharField()
    fecha_baja = serializers.DateField()
