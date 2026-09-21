from django.contrib.auth import get_user_model

from dj_rest_auth.serializers import JWTSerializer
from rest_framework import serializers

from apps.members.models import Socio

User = get_user_model()

STAFF_ROLES = (User.Rol.ADMINISTRADOR, User.Rol.RECEPCIONISTA)


class UserDetailsSerializer(serializers.ModelSerializer):
    is_profile_complete = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'rol', 'foto', 'is_profile_complete')
        read_only_fields = ('id', 'email', 'rol', 'foto', 'is_profile_complete')


class CustomJWTSerializer(JWTSerializer):
    user = serializers.SerializerMethodField()

    def get_user(self, obj):
        user = obj.get('user') or self.context['request'].user
        data = dict(UserDetailsSerializer(user).data)
        if user.is_profile_complete:
            data['nombre'] = user.socio.nombre
            data['apellido'] = user.socio.apellido
        return data


class ProfileCompleteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Socio
        fields = ('dni', 'nombre', 'apellido', 'telefono')

    def validate_dni(self, value):
        if Socio.objects.filter(dni=value).exists():
            raise serializers.ValidationError('This DNI is already registered.')
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        return Socio.objects.create(usuario=user, **validated_data)


class ProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='usuario.email', read_only=True)
    foto = serializers.URLField(source='usuario.foto', read_only=True)
    rol = serializers.CharField(source='usuario.rol', read_only=True)

    class Meta:
        model = Socio
        fields = ('email', 'foto', 'rol', 'dni', 'nombre', 'apellido', 'telefono')
        read_only_fields = ('email', 'foto', 'rol', 'dni')


class StaffCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new staff user (administrador or recepcionista).

    Sets an unusable password so the account requires activation via the
    password-reset flow before the user can log in.
    """

    class Meta:
        model = User
        fields = ('id', 'email', 'rol', 'first_name', 'last_name')
        read_only_fields = ('id',)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('already exists')
        return value

    def validate_rol(self, value):
        if value not in STAFF_ROLES:
            raise serializers.ValidationError(
                f"Rol inválido. Permitidos: {', '.join(STAFF_ROLES)}."
            )
        return value

    def create(self, validated_data):
        email = validated_data['email']
        rol = validated_data['rol']
        first_name = validated_data.get('first_name', '')
        last_name = validated_data.get('last_name', '')

        is_admin = rol == User.Rol.ADMINISTRADOR
        user = User.objects.create(
            email=email,
            username=email,
            rol=rol,
            first_name=first_name,
            last_name=last_name,
            is_staff=is_admin,
            is_superuser=is_admin,
        )
        user.set_unusable_password()
        user.save(update_fields=['password'])
        return user


class StaffListSerializer(serializers.ModelSerializer):
    """Read-only serializer for listing staff members."""

    class Meta:
        model = User
        fields = ('id', 'email', 'rol', 'first_name', 'last_name', 'is_active', 'date_joined')
        read_only_fields = fields
