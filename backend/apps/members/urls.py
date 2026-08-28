from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import SocioViewSet

app_name = 'members'

router = DefaultRouter()
router.register(r'socios', SocioViewSet, basename='socio')

urlpatterns = router.urls
