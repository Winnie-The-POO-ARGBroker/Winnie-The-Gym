from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework import serializers

from .models import Socio
from .services import dispatch_activation_email_for_socio

User = get_user_model()


class SocioSerializer(serializers.ModelSerializer):
    usuario = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
    )
    email = serializers.EmailField(
        write_only=True,
        required=False,
    )

    class Meta:
        model = Socio
        fields = (
            'id',
            'usuario',
            'email',
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

    def validate_email(self, value):
        if not value:
            return value

        # Prevent assigning emails of admin/staff users to a socio
        if User.objects.filter(email=value).exclude(rol=User.Rol.SOCIO).exists():
            raise serializers.ValidationError(
                'Este email pertenece a un usuario de administración o staff.'
            )

        # Prevent duplicate socio email
        socio_query = Socio.objects.filter(usuario__email=value)
        if self.instance:
            socio_query = socio_query.exclude(pk=self.instance.pk)
        if socio_query.exists():
            raise serializers.ValidationError(
                'Este email ya está asociado a otro socio.'
            )

        return value

    def create(self, validated_data):
        email = validated_data.pop('email', None)
        usuario = validated_data.get('usuario')
        if not usuario:
            dni = validated_data.get('dni')
            user_email = email or f'socio_{dni}@winniegym.com'
            try:
                usuario, created = User.objects.get_or_create(
                    email=user_email,
                    defaults={
                        'username': user_email,
                        'rol': User.Rol.SOCIO,
                    },
                )
                if not created and Socio.objects.filter(usuario=usuario).exists():
                    raise serializers.ValidationError(
                        {'dni': 'Ya existe un socio con este DNI o email.'}
                    )
                validated_data['usuario'] = usuario
                socio = super().create(validated_data)
                # REQ-1.3: dispatch activation email so the socio can set a password
                dispatch_activation_email_for_socio(usuario)
                return socio
            except IntegrityError:
                raise serializers.ValidationError(
                    {'email': 'Este email ya está asociado a otro socio.'}
                )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('email', None)
        return super().update(instance, validated_data)


class SocioCertificadoUploadSerializer(serializers.Serializer):
    """Payload for the medical certificate upload endpoint (RF08)."""

    archivo = serializers.FileField(
        help_text='Certificado médico en formato PDF o imagen (JPG/PNG). Máximo 5 MB.',
    )
