from rest_framework import serializers
from django.core.validators import RegexValidator
from .models import AccessLog


class GenerateQRResponseSerializer(serializers.Serializer):
    qr_token = serializers.CharField()
    expires_in = serializers.IntegerField()
    expires_at = serializers.IntegerField()
    jti = serializers.CharField()


class ScanQRSerializer(serializers.Serializer):
    qr_token = serializers.CharField(required=True)
    access_type = serializers.ChoiceField(
        choices=AccessLog.AccessType.choices,
        default=AccessLog.AccessType.ENTRY
    )


class ManualAccessSerializer(serializers.Serializer):
    dni = serializers.CharField(
        required=True,
        max_length=20,
        validators=[RegexValidator(r'^\d{7,8}$')]
    )
    access_type = serializers.ChoiceField(
        choices=AccessLog.AccessType.choices,
        default=AccessLog.AccessType.ENTRY
    )


class AccessLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True, allow_null=True)
    user_nombre = serializers.SerializerMethodField()
    user_apellido = serializers.SerializerMethodField()
    user_plan_nombre = serializers.SerializerMethodField()
    scanned_by_email = serializers.EmailField(source='scanned_by.email', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    operator_name = serializers.SerializerMethodField()

    class Meta:
        model = AccessLog
        fields = [
            'id',
            'timestamp',
            'user',
            'user_email',
            'user_nombre',
            'user_apellido',
            'user_plan_nombre',
            'access_type',
            'status',
            'status_display',
            'denial_reason',
            'qr_jti',
            'scanned_by',
            'scanned_by_email',
            'source',
            'operator',
            'operator_name',
            'motivo',
        ]

    def get_user_nombre(self, obj):
        if not obj.user:
            return None
        socio = getattr(obj.user, 'socio', None)
        return socio.nombre if socio else None

    def get_user_apellido(self, obj):
        if not obj.user:
            return None
        socio = getattr(obj.user, 'socio', None)
        return socio.apellido if socio else None

    def get_user_plan_nombre(self, obj):
        if not obj.user:
            return None
        socio = getattr(obj.user, 'socio', None)
        if not socio:
            return None
        membresia = socio.membresias.filter(estado='activa').first()
        return membresia.plan.nombre if membresia else None

    def get_operator_name(self, obj):
        if not obj.operator:
            return None
        return f"{obj.operator.first_name} {obj.operator.last_name}".strip() or obj.operator.email


# ---------------------------------------------------------------------------
# Serializers for new endpoints (fix #154)
# ---------------------------------------------------------------------------

class PresenteSerializer(serializers.Serializer):
    """Shape for each socio currently inside the gym."""
    socio_id = serializers.IntegerField()
    numero_socio = serializers.CharField()
    nombre = serializers.CharField()
    apellido = serializers.CharField()
    entrada_timestamp = serializers.DateTimeField()
    estado_membresia = serializers.CharField()
    minutos_adentro = serializers.IntegerField()


class SalidaManualSerializer(serializers.Serializer):
    socio_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
    )
    motivo = serializers.CharField(required=False, allow_blank=True, default='')


class CerrarDiaSerializer(serializers.Serializer):
    confirm = serializers.BooleanField()
