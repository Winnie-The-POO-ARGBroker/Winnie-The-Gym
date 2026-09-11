from django.contrib import admin

from .models import Pago


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ('id', 'socio', 'plan', 'monto', 'moneda', 'estado', 'metodo', 'created_at', 'paid_at')
    list_filter = ('estado', 'metodo', 'moneda')
    search_fields = ('mp_payment_id', 'mp_external_reference', 'socio__dni', 'socio__apellido')
    readonly_fields = ('raw_webhook', 'created_at', 'updated_at')
