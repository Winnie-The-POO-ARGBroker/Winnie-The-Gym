from django.urls import path

from .views import AsistenciaReportView, FacturacionReportView, MorosidadReportView


app_name = 'reports'

urlpatterns = [
    path('morosidad/', MorosidadReportView.as_view(), name='morosidad'),
    path('facturacion/', FacturacionReportView.as_view(), name='facturacion'),
    path('asistencia/', AsistenciaReportView.as_view(), name='asistencia'),
]
