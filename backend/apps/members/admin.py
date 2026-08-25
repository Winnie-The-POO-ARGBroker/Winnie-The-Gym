from django.contrib import admin

from .models import Socio


@admin.register(Socio)
class SocioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'apellido', 'dni', 'numero_socio', 'estado', 'usuario')
    search_fields = ('nombre', 'apellido', 'dni', 'usuario__email', 'numero_socio')
    list_filter = ('estado',)
    readonly_fields = ('numero_socio', 'created_at', 'updated_at')
    fields = (
        'usuario',
        'nombre',
        'apellido',
        'dni',
        'telefono',
        'certificado_medico_url',
        'numero_socio',
        'estado',
        'fecha_baja',
        'observaciones',
        'created_at',
        'updated_at',
    )
