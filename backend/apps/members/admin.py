from django.contrib import admin

from .models import Socio


@admin.register(Socio)
class SocioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'apellido', 'dni', 'usuario')
    search_fields = ('nombre', 'apellido', 'dni', 'usuario__email')
