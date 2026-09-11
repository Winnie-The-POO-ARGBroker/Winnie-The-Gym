from rest_framework import serializers

from .models import Pago


class PagoSerializer(serializers.ModelSerializer):
    socio_nombre = serializers.CharField(source='socio.__str__', read_only=True)
    plan_nombre = serializers.CharField(source='plan.nombre', read_only=True)

    class Meta:
        model = Pago
        fields = (
            'id',
            'socio',
            'socio_nombre',
            'plan',
            'plan_nombre',
            'membresia',
            'monto',
            'moneda',
            'metodo',
            'estado',
            'mp_preference_id',
            'mp_payment_id',
            'mp_external_reference',
            'mp_status_detail',
            'paid_at',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class CrearPreferenciaSerializer(serializers.Serializer):
    """Payload for the socio-facing endpoint that opens MercadoPago Checkout Pro."""
    plan_id = serializers.IntegerField()


class CrearPreferenciaResponseSerializer(serializers.Serializer):
    pago_id = serializers.IntegerField()
    preference_id = serializers.CharField()
    init_point = serializers.URLField()
    sandbox_init_point = serializers.URLField(required=False)
    external_reference = serializers.CharField()


class CobroManualSerializer(serializers.Serializer):
    """Payload for the receptionist-only manual charge endpoint (PDF risk #3)."""
    socio_id = serializers.IntegerField()
    plan_id = serializers.IntegerField()
    monto = serializers.DecimalField(max_digits=10, decimal_places=2)
    observacion = serializers.CharField(required=False, allow_blank=True, max_length=200)
