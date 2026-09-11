from django.urls import path

from .views import asistencia_view, facturacion_view, morosidad_view


app_name = 'reports'

urlpatterns = [
    path('morosidad/', morosidad_view, name='morosidad'),
    path('facturacion/', facturacion_view, name='facturacion'),
    path('asistencia/', asistencia_view, name='asistencia'),
]
