from django.urls import path

from .views import (
    AsistenciaClasesView,
    AsistenciaReportView,
    FacturacionReportView,
    MorosidadReportView,
    NoShowsClasesView,
    OcupacionClasesView,
    ReportesResumenView,
)


app_name = 'reports'

urlpatterns = [
    path('resumen/', ReportesResumenView.as_view(), name='resumen'),
    path('morosidad/', MorosidadReportView.as_view(), name='morosidad'),
    path('facturacion/', FacturacionReportView.as_view(), name='facturacion'),
    path('asistencia/', AsistenciaReportView.as_view(), name='asistencia'),
    # #181 — Class reports
    path('clases/ocupacion/', OcupacionClasesView.as_view(), name='clases-ocupacion'),
    path('clases/asistencia/', AsistenciaClasesView.as_view(), name='clases-asistencia'),
    path('clases/no_shows/', NoShowsClasesView.as_view(), name='clases-no-shows'),
]
