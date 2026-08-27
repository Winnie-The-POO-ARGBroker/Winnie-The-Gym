from django.contrib.auth import get_user_model

from dj_rest_auth.serializers import JWTSerializer
from rest_framework import serializers

from apps.members.models import Socio

User = get_user_model()


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
