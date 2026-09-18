from django.urls import path
from .views import GenerateQRView, ScanQRView, AccessLogListView, AforoStatsView

app_name = 'access'

urlpatterns = [
    path('qr/generate/', GenerateQRView.as_view(), name='qr-generate'),
    path('qr/scan/', ScanQRView.as_view(), name='qr-scan'),
    path('logs/', AccessLogListView.as_view(), name='access-logs'),
    path('stats/', AforoStatsView.as_view(), name='access-stats'),
]
