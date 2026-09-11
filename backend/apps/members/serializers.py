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
            'certificado_medico_url',
            'estado',
            'fecha_baja',
            'observaciones',
            'created_at',
        )
        read_only_fields = ('numero_socio', 'certificado_medico_url', 'created_at')


class SocioCertificadoUploadSerializer(serializers.Serializer):
    """Payload for the medical certificate upload endpoint (RF08)."""

    archivo = serializers.FileField(
        help_text='Certificado médico en formato PDF o imagen (JPG/PNG). Máximo 5 MB.',
    )
