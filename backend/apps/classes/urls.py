from django.urls import include, path
from rest_framework.routers import DefaultRouter

app_name = 'classes'

from .views import ClaseViewSet, DisciplinaViewSet, InscripcionClaseViewSet, SalaViewSet

router = DefaultRouter()
router.register(r'clases', ClaseViewSet, basename='clase')
router.register(r'inscripciones', InscripcionClaseViewSet, basename='inscripcion-clase')
# #179 — Disciplina and Sala CRUD
router.register(r'disciplinas', DisciplinaViewSet, basename='disciplina')
router.register(r'salas', SalaViewSet, basename='sala')

urlpatterns = [
    path('', include(router.urls)),
]
