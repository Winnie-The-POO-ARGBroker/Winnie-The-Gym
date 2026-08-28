from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MeRenewView, MeView, MembresiaViewSet, PlanMembresiaViewSet

app_name = 'memberships'

router = DefaultRouter()
router.register(r'planes', PlanMembresiaViewSet, basename='plan')
router.register(r'membresias', MembresiaViewSet, basename='membresia')

urlpatterns = router.urls + [
    path('me/', MeView.as_view(), name='me'),
    path('me/renew/', MeRenewView.as_view(), name='me-renew'),
]
