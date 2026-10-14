import datetime

from rest_framework import serializers

from .models import Clase, Disciplina, InscripcionClase, Sala


# ---------------------------------------------------------------------------
# #179 — Disciplina and Sala serializers
# ---------------------------------------------------------------------------

class DisciplinaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disciplina
        fields = ('id', 'nombre', 'color_hex', 'slug', 'activa', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class SalaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sala
        fields = ('id', 'nombre', 'capacidad', 'activa', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


DIAS_VALIDOS = {d.value for d in Clase.Dia}

# All valid overlap-check days mapped to weekday integers
_DIA_WEEKDAY = {
    Clase.Dia.LUNES: 0,
    Clase.Dia.MARTES: 1,
    Clase.Dia.MIERCOLES: 2,
    Clase.Dia.JUEVES: 3,
    Clase.Dia.VIERNES: 4,
    Clase.Dia.SABADO: 5,
    Clase.Dia.DOMINGO: 6,
}


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
    # estado is read-only: use /cancelar/ or /reactivar/ endpoints instead.
    estado = serializers.CharField(read_only=True)
    # Cancellation info fields (read-only)
    fecha_cancelacion = serializers.DateTimeField(read_only=True)
    motivo_cancelacion = serializers.CharField(read_only=True)
    cancelada_por_nombre = serializers.SerializerMethodField()
    # #179 — Disciplina and Sala FK names (read-only display)
    disciplina_nombre = serializers.SerializerMethodField()
    sala_fk_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Clase
        fields = (
            'id',
            'nombre',
            'categoria',
            'disciplina_fk',
            'disciplina_nombre',
            'descripcion',
            'dia',
            'hora',
            'duracion_min',
            'sala',
            'sala_fk',
            'sala_fk_nombre',
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
            'fecha_cancelacion',
            'motivo_cancelacion',
            'cancelada_por_nombre',
            'created_at',
            'updated_at',
            'user_inscrito',
        )

    def get_instructor_nombre(self, obj):
        """Alias for ``instructor`` field for frontend consumers expecting this key name."""
        return obj.instructor

    def get_disciplina_nombre(self, obj):
        if obj.disciplina_fk_id:
            return obj.disciplina_fk.nombre if hasattr(obj, 'disciplina_fk') and obj.disciplina_fk else None
        return None

    def get_sala_fk_nombre(self, obj):
        if obj.sala_fk_id:
            return obj.sala_fk.nombre if hasattr(obj, 'sala_fk') and obj.sala_fk else None
        return None

    def get_user_inscrito(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated or not getattr(request.user, 'is_profile_complete', False):
            return False
        try:
            return obj.inscripciones.filter(socio=request.user.socio, en_espera=False).exists()
        except Exception:
            return False

    def get_cancelada_por_nombre(self, obj):
        """Return display name of the user who cancelled, or None."""
        user = obj.cancelada_por
        if not user:
            return None
        return getattr(user, 'get_full_name', lambda: None)() or user.email or str(user)

    def validate_estado(self, value):
        """Reject any attempt to set estado directly via the serializer."""
        raise serializers.ValidationError(
            'El estado no se puede modificar directamente. '
            'Usá /cancelar-clase/ o /reactivar/.'
        )

    def validate(self, data):
        """Cross-field validations: cupo, sala capacity, dias_recurrencia, and schedule overlap."""
        instance = self.instance

        # --- cupo_maximo >= current confirmados ---
        cupo_maximo = data.get('cupo_maximo', getattr(instance, 'cupo_maximo', None))
        if cupo_maximo is not None and instance is not None:
            confirmados = instance.inscripciones.filter(en_espera=False).count()
            if cupo_maximo < confirmados:
                raise serializers.ValidationError({
                    'cupo_maximo': (
                        f'El cupo máximo no puede ser menor al número de inscriptos confirmados '
                        f'({confirmados}).'
                    )
                })

        # --- #179: cupo_maximo <= sala_fk.capacidad ---
        sala_fk = data.get('sala_fk', getattr(instance, 'sala_fk', None))
        if sala_fk is not None and cupo_maximo is not None:
            if sala_fk.capacidad > 0 and cupo_maximo > sala_fk.capacidad:
                raise serializers.ValidationError({
                    'cupo_maximo': (
                        f'El cupo máximo ({cupo_maximo}) no puede superar la capacidad '
                        f'de la sala "{sala_fk.nombre}" ({sala_fk.capacidad}).'
                    )
                })

        # --- Sala + horario overlap check ---
        sala = data.get('sala', getattr(instance, 'sala', None))
        hora = data.get('hora', getattr(instance, 'hora', None))
        duracion_min = data.get('duracion_min', getattr(instance, 'duracion_min', None))
        dia = data.get('dia', getattr(instance, 'dia', None))

        dias_recurrencia = data.get('dias_recurrencia', getattr(instance, 'dias_recurrencia', []) or [])

        if sala and hora is not None and duracion_min is not None and dia:
            self._validate_no_overlap(instance, sala, dia, hora, duracion_min, dias_recurrencia)

        return data

    def _validate_no_overlap(self, instance, sala, dia, hora, duracion_min, dias_recurrencia):
        """Raise ValidationError if another class in the same sala overlaps on any shared day."""
        # Build the set of days to check — use dias_recurrencia if populated, else dia
        dias_to_check = set(dias_recurrencia) if dias_recurrencia else {dia}

        # Convert hora (time) to minutes for arithmetic
        hora_inicio_min = hora.hour * 60 + hora.minute
        hora_fin_min = hora_inicio_min + duracion_min

        qs = Clase.objects.filter(sala=sala, dia__in=dias_to_check)
        if instance and instance.pk:
            qs = qs.exclude(pk=instance.pk)
        qs = qs.exclude(estado=Clase.Estado.CANCELADA)

        for other in qs:
            other_inicio = other.hora.hour * 60 + other.hora.minute
            other_fin = other_inicio + other.duracion_min
            # Two intervals [a, b) and [c, d) overlap iff a < d and c < b
            if hora_inicio_min < other_fin and other_inicio < hora_fin_min:
                raise serializers.ValidationError({
                    'hora': (
                        f'La sala "{sala}" ya tiene la clase "{other.nombre}" '
                        f'a las {other.hora.strftime("%H:%M")} los {other.get_dia_display()} '
                        f'(solapamiento de horario).'
                    )
                })


class ClaseDetailSerializer(ClaseSerializer):
    inscripciones = InscripcionClaseSerializer(many=True, read_only=True)

    class Meta(ClaseSerializer.Meta):
        fields = ClaseSerializer.Meta.fields + ('inscripciones',)
