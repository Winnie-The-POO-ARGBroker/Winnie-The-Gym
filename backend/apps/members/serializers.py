from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework import serializers

from .models import Socio
from .services import dispatch_activation_email_for_socio

User = get_user_model()


class SocioSerializer(serializers.ModelSerializer):
    """Serializer for Socio model.

    Read-side:
      - `email` — read from linked User.email (SerializerMethodField)
      - `usuario_id` — PK of the linked User (SerializerMethodField)
      - `membresia_activa` — current active membership or null

    Write-side:
      - `email` accepted as a plain EmailField in `to_internal_value`.
      - `usuario` accepted as a PK for explicit user assignment.
    """

    usuario_id = serializers.SerializerMethodField(read_only=True)
    email = serializers.SerializerMethodField(read_only=True)
    membresia_activa = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Socio
        fields = (
            'id',
            'usuario_id',
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
            'membresia_activa',
            'created_at',
        )
        read_only_fields = ('numero_socio', 'certificado_medico_url', 'created_at')

    def get_usuario_id(self, obj):
        return obj.usuario_id

    def get_email(self, obj):
        return obj.usuario.email if obj.usuario_id else None

    def get_membresia_activa(self, obj):
        try:
            from apps.memberships.models import Membresia
            m = obj.membresia_set.filter(
                estado=Membresia.Estado.ACTIVA,
            ).order_by('-fecha_inicio').first()
            if m is None:
                return None
            return {
                'id': m.id,
                'plan': m.plan.nombre if m.plan_id else None,
                'fecha_inicio': m.fecha_inicio.isoformat() if m.fecha_inicio else None,
                'fecha_fin': m.fecha_fin.isoformat() if m.fecha_fin else None,
                'estado': m.estado,
            }
        except Exception:
            return None

    # ------------------------------------------------------------------
    # Write-side: accept `email` and `usuario` as input fields
    # ------------------------------------------------------------------

    def to_internal_value(self, data):
        # Extract write-only fields before ModelSerializer processes them
        email = data.get('email', None)
        usuario_pk = data.get('usuario', None)

        # Let ModelSerializer handle the model fields normally
        # (email and usuario are not model fields so they won't conflict)
        ret = super().to_internal_value(data)

        if email is not None:
            ret['_email'] = email
        if usuario_pk is not None:
            ret['_usuario_pk'] = usuario_pk

        return ret

    def validate(self, attrs):
        email = attrs.get('_email')
        if email:
            # Validate: must not belong to a non-socio user
            if User.objects.filter(email=email).exclude(rol=User.Rol.SOCIO).exists():
                raise serializers.ValidationError(
                    {'email': ['Ya existe un usuario con este email.']}
                )
            # Validate uniqueness (exclude self on update)
            socio_query = Socio.objects.filter(usuario__email=email)
            if self.instance:
                socio_query = socio_query.exclude(pk=self.instance.pk)
            if socio_query.exists():
                raise serializers.ValidationError(
                    {'email': ['Ya existe un usuario con este email.']}
                )
        return attrs

    def create(self, validated_data):
        email = validated_data.pop('_email', None)
        usuario_pk = validated_data.pop('_usuario_pk', None)

        usuario = None
        if usuario_pk is not None:
            try:
                usuario = User.objects.get(pk=usuario_pk)
            except User.DoesNotExist:
                raise serializers.ValidationError({'usuario': ['Usuario no encontrado.']})

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
                        {'dni': ['Ya existe un socio con este DNI.']}
                    )
            except IntegrityError:
                raise serializers.ValidationError(
                    {'email': ['Ya existe un usuario con este email.']}
                )

        validated_data['usuario'] = usuario
        socio = super().create(validated_data)
        # REQ-1.3: dispatch activation email (service skips synthetic emails automatically)
        dispatch_activation_email_for_socio(usuario)
        return socio

    def update(self, instance, validated_data):
        # Handle email update: mutate the linked User object
        email = validated_data.pop('_email', None)
        validated_data.pop('_usuario_pk', None)
        if email is not None and email != instance.usuario.email:
            # Uniqueness was already validated in validate()
            instance.usuario.email = email
            instance.usuario.username = email
            instance.usuario.save(update_fields=['email', 'username'])
        return super().update(instance, validated_data)


class SocioCertificadoUploadSerializer(serializers.Serializer):
    """Payload for the medical certificate upload endpoint (RF08)."""

    ALLOWED_MIME_TYPES = {
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
    }
    MAX_SIZE_BYTES = 5 * 1024 * 1024

    archivo = serializers.FileField(
        help_text='Certificado médico en formato PDF o imagen (JPG/PNG/WEBP). Máximo 5 MB.',
    )

    def validate_archivo(self, value):
        if value.size > self.MAX_SIZE_BYTES:
            raise serializers.ValidationError('Archivo demasiado grande. Máximo 5 MB.')

        content_type = getattr(value, 'content_type', None) or ''
        # Normalize: strip parameters like "; charset=..."
        mime = content_type.split(';')[0].strip().lower()
        if mime not in self.ALLOWED_MIME_TYPES:
            raise serializers.ValidationError('Formato no permitido. Solo PDF o imagen.')

        return value


class SocioCertificadoResponseSerializer(serializers.ModelSerializer):
    """Minimal response shape for the certificate upload endpoint."""

    class Meta:
        model = Socio
        fields = ('id', 'certificado_medico_url', 'numero_socio', 'estado')
