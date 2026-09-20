from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CobroManualView, CrearPreferenciaView, PagoViewSet, WebhookView


app_name = 'payments'

router = DefaultRouter()
router.register(r'pagos', PagoViewSet, basename='pago')

urlpatterns = router.urls + [
    path('preferencias/', CrearPreferenciaView.as_view(), name='crear-preferencia'),
    path('cobros-manuales/', CobroManualView.as_view(), name='cobro-manual'),
    path('webhook/', WebhookView.as_view(), name='webhook'),
]
