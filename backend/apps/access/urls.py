from django.urls import path
from .views import (
    AforoSnapshotView,
    AforoStatsView,
    AccessLogListView,
    CerrarDiaView,
    GenerateQRView,
    ManualAccessView,
    PresentesView,
    SalidaManualView,
    ScanQRView,
)

app_name = 'access'

urlpatterns = [
    path('qr/generate/', GenerateQRView.as_view(), name='qr-generate'),
    path('qr/scan/', ScanQRView.as_view(), name='qr-scan'),
    path('manual/', ManualAccessView.as_view(), name='manual-access'),
    path('logs/', AccessLogListView.as_view(), name='access-logs'),
    path('stats/', AforoStatsView.as_view(), name='access-stats'),
    # fix #154 — presentes, salida manual, cierre día
    path('presentes/', PresentesView.as_view(), name='presentes'),
    path('salida-manual/', SalidaManualView.as_view(), name='salida-manual'),
    path('cerrar-dia/', CerrarDiaView.as_view(), name='cerrar-dia'),
    # fix #152 — REST fallback for aforo snapshot
    path('aforo/snapshot/', AforoSnapshotView.as_view(), name='aforo-snapshot'),
]
