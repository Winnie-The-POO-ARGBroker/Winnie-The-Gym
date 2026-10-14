from rest_framework import serializers

from .models import CierreGimnasio, GymConfig


class GymConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = GymConfig
        fields = [
            'nombre_gym',
            'aforo_maximo',
            'hora_apertura',
            'hora_cierre',
            'cierre_gracia_minutos',
            'telefono_contacto',
            'aforo_umbral_alerta_pct',
            'aforo_bloqueo_al_llegar_max',
        ]


class CierreGimnasioSerializer(serializers.ModelSerializer):
    created_by_email = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CierreGimnasio
        fields = [
            'id',
            'fecha_desde',
            'fecha_hasta',
            'motivo',
            'afecta',
            'sala',
            'created_by',
            'created_by_email',
            'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'created_by_email']

    def get_created_by_email(self, obj):
        if obj.created_by_id is None:
            return None
        return obj.created_by.email

    def validate(self, data):
        fecha_desde = data.get('fecha_desde')
        fecha_hasta = data.get('fecha_hasta')
        if fecha_desde and fecha_hasta and fecha_hasta < fecha_desde:
            raise serializers.ValidationError(
                {'fecha_hasta': 'La fecha de fin no puede ser anterior a la fecha de inicio.'}
            )
        afecta = data.get('afecta', CierreGimnasio.Afecta.TODO)
        sala = data.get('sala')
        if afecta == CierreGimnasio.Afecta.SALA and sala is None:
            raise serializers.ValidationError(
                {'sala': 'Debe indicar la sala cuando el cierre afecta solo una sala.'}
            )
        return data
