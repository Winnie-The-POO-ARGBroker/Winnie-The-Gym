from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import PagoViewSet, cobro_manual_view, crear_preferencia_view, webhook_view


app_name = 'payments'

router = DefaultRouter()
router.register(r'pagos', PagoViewSet, basename='pago')

urlpatterns = router.urls + [
    path('preferencias/', crear_preferencia_view, name='crear-preferencia'),
    path('cobros-manuales/', cobro_manual_view, name='cobro-manual'),
    path('webhook/', webhook_view, name='webhook'),
]
