import datetime

from rest_framework import serializers

from apps.members.models import Socio
from .models import Membresia, PlanMembresia

VALID_DURACION_DIAS = (30, 365)
WRITABLE_ESTADO_VALUES = ('activa', 'vencida', 'suspendida', 'cancelada')


class PlanMembresiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanMembresia
        fields = ('id', 'nombre', 'duracion_dias', 'precio', 'clases_asignadas', 'activo')

    def validate_duracion_dias(self, value):
        if value not in VALID_DURACION_DIAS:
            raise serializers.ValidationError(
                f'duracion_dias debe ser uno de {VALID_DURACION_DIAS}.'
            )
        return value


class MembresiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Membresia
        fields = ('id', 'socio', 'plan', 'fecha_inicio', 'fecha_fin', 'estado')
        # fecha_fin is always computed; estado is writable on PATCH but forced on create.
        read_only_fields = ('fecha_fin',)

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


class SocioMeSerializer(serializers.ModelSerializer):
    membresia_activa = serializers.SerializerMethodField()

    class Meta:
        model = Socio
        fields = ('id', 'numero_socio', 'nombre', 'apellido', 'estado', 'membresia_activa')

    def get_membresia_activa(self, obj):
        m = obj.membresias.filter(estado='activa').order_by('-fecha_fin').first()
        return MembresiaDetailSerializer(m).data if m else None
