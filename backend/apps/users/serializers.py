from datetime import date, timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import PasswordResetForm

from dj_rest_auth.serializers import (
    JWTSerializer,
    PasswordChangeSerializer as BasePasswordChangeSerializer,
    PasswordResetSerializer as BasePasswordResetSerializer,
)
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

        # RNF05: Inicializar marca de actividad en login para usuarios staff
        if getattr(user, 'rol', None) in STAFF_ROLES:
            from .middleware import record_staff_activity
            record_staff_activity(user.id)

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


def _vencimiento_relativo(fecha_fin) -> str | None:
    """Return a human-readable relative date string for a membership expiry."""
    if not fecha_fin:
        return None
    today = date.today()
    delta = (fecha_fin - today).days
    if delta < 0:
        return 'vencida'
    if delta == 0:
        return 'vence hoy'
    if delta == 1:
        return 'en 1 día'
    return f'en {delta} días'


class ProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='usuario.email', read_only=True)
    foto = serializers.URLField(source='usuario.foto', read_only=True)
    rol = serializers.CharField(source='usuario.rol', read_only=True)
    # #231 — proximas clases (next 3 confirmed reservations)
    proximas_clases = serializers.SerializerMethodField(read_only=True)
    # #231 — relative expiry label for active membership
    vencimiento_formato_relativo = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Socio
        fields = (
            'id',
            'email',
            'foto',
            'rol',
            'dni',
            'nombre',
            'apellido',
            'telefono',
            'numero_socio',
            'estado',
            'fecha_baja',
            'certificado_medico_url',
            'observaciones',
            # #232 — extended fields
            'fecha_nacimiento',
            'genero',
            'contacto_emergencia_nombre',
            'contacto_emergencia_telefono',
            # #231 — computed
            'proximas_clases',
            'vencimiento_formato_relativo',
        )
        read_only_fields = (
            'id',
            'email',
            'foto',
            'rol',
            'dni',
            'numero_socio',
            'estado',
            'fecha_baja',
            'certificado_medico_url',
            'proximas_clases',
            'vencimiento_formato_relativo',
        )

    def get_proximas_clases(self, obj):
        """Return the next 3 confirmed (non-waitlisted) class reservations."""
        try:
            from django.utils import timezone
            now = timezone.now()
            inscripciones = (
                obj.inscripciones_clases
                .filter(en_espera=False, clase__estado='activa')
                .select_related('clase')
                .order_by('clase__hora')
            )
            result = []
            for ins in inscripciones:
                clase = ins.clase
                result.append({
                    'clase_id': clase.id,
                    'nombre': clase.nombre,
                    'dia': clase.dia,
                    'hora': clase.hora.strftime('%H:%M') if clase.hora else None,
                    'instructor': clase.instructor,
                    'sala': clase.sala,
                })
                if len(result) >= 3:
                    break
            return result
        except Exception:
            return []

    def get_vencimiento_formato_relativo(self, obj):
        """Return relative expiry label for the active membership."""
        try:
            from apps.memberships.models import Membresia
            m = obj.membresias.filter(
                estado=Membresia.Estado.ACTIVA,
            ).order_by('-fecha_inicio').first()
            if m is None:
                return None
            return _vencimiento_relativo(m.fecha_fin)
        except Exception:
            return None


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


class StaffProfileSerializer(serializers.ModelSerializer):
    """Serializer for GET/PATCH /api/auth/profile/ when the user is staff (admin or receptionist).

    Exposes staff-specific fields and adds `is_staff_profile: True` as a discriminator
    so the frontend can distinguish this shape from the socio shape without checking `rol`.
    """

    is_staff_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('email', 'rol', 'first_name', 'last_name', 'foto', 'is_staff_profile')
        read_only_fields = ('email', 'rol', 'is_staff_profile')

    def get_is_staff_profile(self, obj):
        return True


class WinniePasswordChangeSerializer(BasePasswordChangeSerializer):
    """Override dj-rest-auth's PasswordChangeSerializer to blacklist all outstanding
    refresh tokens after a successful password change.

    fix #226: invalidate all active sessions on password change.
    """

    def save(self):
        super().save()
        # Blacklist all outstanding refresh tokens for this user so other sessions
        # (e.g. other devices) are immediately invalidated.
        try:
            from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
            user = self.user
            outstanding = OutstandingToken.objects.filter(user=user)
            for token in outstanding:
                BlacklistedToken.objects.get_or_create(token=token)
        except Exception:
            import logging
            logging.getLogger(__name__).warning(
                'WinniePasswordChangeSerializer: failed to blacklist tokens for user %s',
                getattr(self, 'user', None),
            )


def _make_frontend_url_generator(frontend_url: str):
    """Return a url_generator that produces FRONTEND_URL-based reset links.

    fix #233: password reset emails must link to FRONTEND_URL, not example.com.
    The generator is passed to AllAuthPasswordResetForm.save() as `url_generator`.
    """
    def _generator(request, user, temp_key):
        from allauth.account.utils import user_pk_to_url_str
        uid = user_pk_to_url_str(user)
        return f'{frontend_url}/reset-password/{uid}/{temp_key}/'
    return _generator


class WinniePasswordResetSerializer(BasePasswordResetSerializer):
    """Override dj-rest-auth's PasswordResetSerializer to link to FRONTEND_URL.

    fix #233: password reset emails must link to FRONTEND_URL (not example.com).
    fix #212: sends the branded password_reset email template via enqueue_email
    (Celery with retries) instead of the allauth default template.
    """

    def save(self):
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode
        from apps.common.tasks import enqueue_email

        # Use allauth's default_token_generator (same as the parent serializer).
        if 'allauth' in settings.INSTALLED_APPS:
            from allauth.account.forms import default_token_generator
        else:
            from django.contrib.auth.tokens import default_token_generator

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
        brand_name = getattr(settings, 'BRAND_NAME', 'Winnie The Gym')

        # reset_form is an AllAuthPasswordResetForm; after is_valid() its .users
        # attribute holds the matched User queryset (may be empty list on no match).
        users = getattr(self.reset_form, 'users', [])
        for user in users:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f'{frontend_url}/reset-password/{uid}/{token}/'

            context = {
                'brand_name': brand_name,
                'frontend_url': frontend_url,
                'reset_url': reset_url,
            }
            enqueue_email(
                template_base='password_reset',
                subject=f'Recuperación de contraseña — {brand_name}',
                to=[user.email],
                context=context,
                category='password_reset',
            )


class StaffListSerializer(serializers.ModelSerializer):
    """Read-only serializer for listing staff members."""

    has_usable_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'rol', 'first_name', 'last_name', 'has_usable_password', 'date_joined')
        read_only_fields = fields

    def get_has_usable_password(self, obj):
        return obj.has_usable_password()
