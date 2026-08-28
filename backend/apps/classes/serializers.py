from rest_framework import serializers
from .models import Clase, InscripcionClase


class InscripcionClaseSerializer(serializers.ModelSerializer):
    socio_nombre = serializers.ReadOnlyField(source='socio.nombre')
    socio_apellido = serializers.ReadOnlyField(source='socio.apellido')
    socio_numero = serializers.ReadOnlyField(source='socio.numero_socio')

    class Meta:
        model = InscripcionClase
        fields = (
            'id',
            'clase',
            'socio',
            'socio_nombre',
            'socio_apellido',
            'socio_numero',
            'asistio',
            'en_espera',
            'created_at',
        )


class ClaseSerializer(serializers.ModelSerializer):
    cupos_reservados = serializers.IntegerField(read_only=True)

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
        )


class ClaseDetailSerializer(ClaseSerializer):
    inscripciones = InscripcionClaseSerializer(many=True, read_only=True)

    class Meta(ClaseSerializer.Meta):
        fields = ClaseSerializer.Meta.fields + ('inscripciones',)
