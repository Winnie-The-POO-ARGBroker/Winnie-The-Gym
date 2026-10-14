import datetime

from rest_framework import serializers

from apps.members.models import Socio
from .models import Membresia, PlanMembresia

DURACION_DIAS_MIN = 30
DURACION_DIAS_MAX = 365
WRITABLE_ESTADO_VALUES = ('activa', 'vencida', 'suspendida', 'cancelada')


class PlanMembresiaSerializer(serializers.ModelSerializer):
    socios_activos = serializers.SerializerMethodField()

    class Meta:
        model = PlanMembresia
        fields = ('id', 'nombre', 'duracion_dias', 'precio', 'clases_asignadas', 'activo', 'es_popular', 'socios_activos')

    def get_socios_activos(self, obj):
        return obj.membresias.filter(estado='activa').count()

    def validate_duracion_dias(self, value):
        if value < DURACION_DIAS_MIN or value > DURACION_DIAS_MAX:
            raise serializers.ValidationError(
                f'La duración debe estar entre {DURACION_DIAS_MIN} y {DURACION_DIAS_MAX} días.',
            )
        return value


class MembresiaSerializer(serializers.ModelSerializer):
    # Fix #187: human-readable names for list views (avoids raw FK ids in the UI)
    plan_nombre = serializers.CharField(source='plan.nombre', read_only=True)
    socio_nombre = serializers.SerializerMethodField()
    cambiado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Membresia
        fields = (
            'id', 'socio', 'socio_nombre', 'plan', 'plan_nombre',
            'fecha_inicio', 'fecha_fin', 'estado',
            'motivo_estado', 'cambiado_por', 'cambiado_por_nombre', 'cambiado_en', 'fecha_suspension',
        )
        # fecha_fin is always computed; estado is writable on PATCH but forced on create.
        read_only_fields = (
            'fecha_fin', 'plan_nombre', 'socio_nombre',
            'cambiado_por', 'cambiado_por_nombre', 'cambiado_en', 'fecha_suspension',
        )

    def get_socio_nombre(self, obj):
        socio = obj.socio
        return f'{socio.apellido}, {socio.nombre}'

    def get_cambiado_por_nombre(self, obj):
        if obj.cambiado_por_id:
            u = obj.cambiado_por
            return getattr(u, 'get_full_name', lambda: u.email)() or u.email
        return None

    def validate_estado(self, value):
        """Reject pendiente_pago as a write value (create or PATCH)."""
        if value not in WRITABLE_ESTADO_VALUES:
            raise serializers.ValidationError(
                f"'{value}' no es un estado editable. Valores permitidos: {WRITABLE_ESTADO_VALUES}."
            )
        return value

    def create(self, validated_data):
        plan = validated_data['plan']
        fecha_inicio = validated_data.get('fecha_inicio', datetime.date.today())
        validated_data['fecha_fin'] = fecha_inicio + datetime.timedelta(days=plan.duracion_dias)
        # Force estado to 'activa' regardless of what the client sent.
        validated_data['estado'] = 'activa'
        return super().create(validated_data)


class MembresiaDetailSerializer(MembresiaSerializer):
    plan = PlanMembresiaSerializer(read_only=True)


class SocioMorosoSerializer(serializers.ModelSerializer):
    """Serializer for the /morosos/ endpoint — exposes ultima_membresia details."""

    ultima_membresia = serializers.SerializerMethodField()

    class Meta:
        model = Socio
        fields = ('id', 'numero_socio', 'dni', 'nombre', 'apellido', 'estado', 'ultima_membresia')

    def get_ultima_membresia(self, obj):
        m = obj.membresias.order_by('-fecha_fin', '-created_at').first()
        if not m:
            return None
        return {
            'id': m.pk,
            'plan': m.plan.nombre,
            'fecha_fin': m.fecha_fin.isoformat(),
            'estado': m.estado,
            'dias_atraso': max(0, (datetime.date.today() - m.fecha_fin).days),
        }


class SocioMeSerializer(serializers.ModelSerializer):
    """Read-only view of the authenticated socio's own profile.

    Placement note: this serializer lives in ``apps.memberships`` rather than
    ``apps.members`` because it must embed a full ``MembresiaDetailSerializer``
    (which itself nests ``PlanMembresiaSerializer``). Placing it in
    ``apps.members`` would create a circular import: ``apps.members`` →
    ``apps.memberships`` → ``apps.members``. The memberships app already
    imports from members, so the dependency only works in one direction.
    """

    membresia_activa = serializers.SerializerMethodField()
    ultima_membresia = serializers.SerializerMethodField()
    asistencias_mes = serializers.SerializerMethodField()

    class Meta:
        model = Socio
        fields = (
            'id', 'numero_socio', 'dni', 'nombre', 'apellido', 'estado',
            'membresia_activa', 'ultima_membresia',
            'certificado_medico_url', 'asistencias_mes',
        )

    def get_membresia_activa(self, obj):
        m = obj.membresias.filter(estado='activa').order_by('-fecha_fin').first()
        return MembresiaDetailSerializer(m).data if m else None

    def get_ultima_membresia(self, obj):
        """Expose the most recent membership (any estado) so the frontend can show
        state like 'Suspendida' or 'Vencida' correctly."""
        m = obj.membresias.order_by('-fecha_fin', '-created_at').first()
        if not m:
            return None
        return {
            'id': m.pk,
            'estado': m.estado,
            'fecha_inicio': m.fecha_inicio.isoformat(),
            'fecha_fin': m.fecha_fin.isoformat(),
            'plan_nombre': m.plan.nombre,
        }

    def get_asistencias_mes(self, obj):
        if not obj.usuario_id:
            return 0
        from apps.access.models import AccessLog
        from django.utils import timezone
        start_of_month = timezone.localdate().replace(day=1)
        return AccessLog.objects.filter(
            user_id=obj.usuario_id,
            access_type=AccessLog.AccessType.ENTRY,
            status=AccessLog.AccessStatus.GRANTED,
            timestamp__date__gte=start_of_month
        ).count()
