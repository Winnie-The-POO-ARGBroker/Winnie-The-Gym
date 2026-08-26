from django.contrib import admin

from .models import Membresia, PlanMembresia


@admin.register(PlanMembresia)
class PlanMembresiaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'duracion_dias', 'precio', 'clases_asignadas', 'activo')
    list_filter = ('activo', 'duracion_dias')
    search_fields = ('nombre',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Membresia)
class MembresiaAdmin(admin.ModelAdmin):
    list_display = ('socio', 'plan', 'fecha_inicio', 'fecha_fin', 'estado')
    list_filter = ('estado',)
    search_fields = ('socio__nombre', 'socio__apellido', 'socio__numero_socio')
    readonly_fields = ('created_at', 'updated_at')
