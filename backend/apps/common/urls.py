from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CierreGimnasioViewSet, GymConfigView

app_name = 'config'

router = DefaultRouter()
router.register(r'cierres', CierreGimnasioViewSet, basename='cierre')

urlpatterns = [
    path('gym/', GymConfigView.as_view(), name='gym-config'),
] + router.urls
