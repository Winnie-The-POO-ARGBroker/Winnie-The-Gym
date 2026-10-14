from rest_framework import serializers
from .models import Clase, InscripcionClase


class InscripcionClaseSerializer(serializers.ModelSerializer):
    socio_nombre = serializers.ReadOnlyField(source='socio.nombre')
    socio_apellido = serializers.ReadOnlyField(source='socio.apellido')
    socio_numero = serializers.ReadOnlyField(source='socio.numero_socio')
    socio_dni = serializers.ReadOnlyField(source='socio.dni')
    plan_nombre = serializers.SerializerMethodField()

    class Meta:
        model = InscripcionClase
        fields = (
            'id',
            'clase',
            'socio',
            'socio_nombre',
            'socio_apellido',
            'socio_numero',
            'socio_dni',
            'plan_nombre',
            'asistio',
            'en_espera',
            'created_at',
        )

    def get_plan_nombre(self, obj):
        """Return the plan name from the socio's active membership, or None."""
        from apps.memberships.models import Membresia  # noqa: PLC0415

        try:
            membresia = (
                Membresia.objects
                .filter(socio=obj.socio, estado=Membresia.Estado.ACTIVA)
                .select_related('plan')
                .order_by('-fecha_fin')
                .first()
            )
            return membresia.plan.nombre if membresia else None
        except Exception:
            return None


class ClaseSerializer(serializers.ModelSerializer):
    cupos_reservados = serializers.IntegerField(read_only=True)
    user_inscrito = serializers.SerializerMethodField()
    instructor_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Clase
        fields = (
            'id',
            'nombre',
            'categoria',
            'descripcion',
            'dia',
            'hora',
            'duracion_min',
            'sala',
            'instructor',
            'instructor_nombre',
            'cupo_maximo',
            'cupos_reservados',
            'lista_espera_max',
            'cancelacion_horas',
            'planes_habilitados',
            'recurrencia',
            'dias_recurrencia',
            'estado',
            'created_at',
            'updated_at',
            'user_inscrito',
        )

    def get_instructor_nombre(self, obj):
        """Alias for ``instructor`` field for frontend consumers expecting this key name."""
        return obj.instructor

    def get_user_inscrito(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated or not getattr(request.user, 'is_profile_complete', False):
            return False
        # We assume `socio` exists because `is_profile_complete` is true.
        try:
            return obj.inscripciones.filter(socio=request.user.socio, en_espera=False).exists()
        except Exception:
            return False


class ClaseDetailSerializer(ClaseSerializer):
    inscripciones = InscripcionClaseSerializer(many=True, read_only=True)

    class Meta(ClaseSerializer.Meta):
        fields = ClaseSerializer.Meta.fields + ('inscripciones',)
