from django.urls import path
from .views import GenerateQRView, ScanQRView, ManualAccessView, AccessLogListView, AforoStatsView

app_name = 'access'

urlpatterns = [
    path('qr/generate/', GenerateQRView.as_view(), name='qr-generate'),
    path('qr/scan/', ScanQRView.as_view(), name='qr-scan'),
    path('manual/', ManualAccessView.as_view(), name='manual-access'),
    path('logs/', AccessLogListView.as_view(), name='access-logs'),
    path('stats/', AforoStatsView.as_view(), name='access-stats'),
]
