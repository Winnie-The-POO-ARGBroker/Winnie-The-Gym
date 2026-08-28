from django.contrib import admin
from .models import Clase, InscripcionClase


@admin.register(Clase)
class ClaseAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'categoria', 'dia', 'hora', 'sala', 'instructor', 'cupo_maximo', 'estado')
    list_filter = ('categoria', 'dia', 'estado', 'sala')
    search_fields = ('nombre', 'instructor', 'sala')


@admin.register(InscripcionClase)
class InscripcionClaseAdmin(admin.ModelAdmin):
    list_display = ('id', 'clase', 'socio', 'asistio', 'en_espera', 'created_at')
    list_filter = ('asistio', 'en_espera', 'clase')
    search_fields = ('socio__nombre', 'socio__apellido', 'socio__numero_socio', 'clase__nombre')
