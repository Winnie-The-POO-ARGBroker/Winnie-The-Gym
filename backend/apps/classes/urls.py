from django.urls import include, path
from rest_framework.routers import DefaultRouter

app_name = 'classes'

from .views import (  # noqa: E402
    ClaseViewSet,
    DisciplinaViewSet,
    InscripcionClaseViewSet,
    InstructorViewSet,
    SalaViewSet,
    SesionClaseViewSet,
)

router = DefaultRouter()
router.register(r'clases', ClaseViewSet, basename='clase')
router.register(r'inscripciones', InscripcionClaseViewSet, basename='inscripcion-clase')
# #179 — Disciplina and Sala CRUD
router.register(r'disciplinas', DisciplinaViewSet, basename='disciplina')
router.register(r'salas', SalaViewSet, basename='sala')
# #178 — SesionClase (read + cancelar action)
router.register(r'sesiones', SesionClaseViewSet, basename='sesion-clase')
# #180 Fase 1 — Instructor CRUD
router.register(r'instructores', InstructorViewSet, basename='instructor')

urlpatterns = [
    path('', include(router.urls)),
]
