from decimal import Decimal

from rest_framework import serializers

from .models import Pago


class PagoSerializer(serializers.ModelSerializer):
    socio_nombre = serializers.CharField(source='socio.__str__', read_only=True)
    socio_dni = serializers.CharField(source='socio.dni', read_only=True)
    socio_numero = serializers.CharField(source='socio.numero_socio', read_only=True)
    plan_nombre = serializers.CharField(source='plan.nombre', read_only=True)
    cobrado_por_nombre = serializers.SerializerMethodField()
    anulado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Pago
        fields = (
            'id',
            'socio',
            'socio_nombre',
            'socio_dni',
            'socio_numero',
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
            # #191 audit fields
            'cobrado_por',
            'cobrado_por_nombre',
            'medio_manual',
            'observacion',
            'anulado',
            'anulado_por',
            'anulado_por_nombre',
            'anulado_en',
            'motivo_anulacion',
            'idempotency_key',
        )
        read_only_fields = fields

    def get_cobrado_por_nombre(self, obj):
        if obj.cobrado_por_id:
            u = obj.cobrado_por
            return getattr(u, 'get_full_name', lambda: u.email)() or u.email
        return None

    def get_anulado_por_nombre(self, obj):
        if obj.anulado_por_id:
            u = obj.anulado_por
            return getattr(u, 'get_full_name', lambda: u.email)() or u.email
        return None


class CrearPreferenciaSerializer(serializers.Serializer):
    """Payload for the socio-facing endpoint that opens MercadoPago Checkout Pro."""
    plan_id = serializers.IntegerField()


class ConfirmarPagoSerializer(serializers.Serializer):
    """MercadoPago payment id the socio was returned with (numeric; also guards the SDK URL)."""
    payment_id = serializers.RegexField(r'^\d{1,32}$')


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
    monto = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    # #191: medio is now required for manual charges
    medio = serializers.ChoiceField(choices=[(c.value, c.label) for c in Pago.MedioManual])
    observacion = serializers.CharField(required=False, allow_blank=True, max_length=500)
    # #191: optional motivo when monto != plan.precio (validated in view/service)
    motivo = serializers.CharField(required=False, allow_blank=True, max_length=500)
    # #191: client-generated idempotency key
    idempotency_key = serializers.CharField(required=False, allow_blank=True, max_length=128)


class AnularPagoSerializer(serializers.Serializer):
    """Payload for the admin-only cancel payment endpoint (#191)."""
    motivo = serializers.CharField(min_length=1, max_length=500)
