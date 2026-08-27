from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ClaseViewSet, InscripcionClaseViewSet

router = DefaultRouter()
router.register(r'clases', ClaseViewSet, basename='clase')
router.register(r'inscripciones', InscripcionClaseViewSet, basename='inscripcion-clase')

urlpatterns = [
    path('', include(router.urls)),
]
