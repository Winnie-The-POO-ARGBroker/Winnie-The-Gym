from django.urls import path

from .views import SocioDarBajaView, SocioListCreateView, SocioRetrieveUpdateView

app_name = 'members'

urlpatterns = [
    path('socios/', SocioListCreateView.as_view(), name='socio-list-create'),
    path('socios/<int:pk>/', SocioRetrieveUpdateView.as_view(), name='socio-detail'),
    path('socios/<int:pk>/dar-baja/', SocioDarBajaView.as_view(), name='socio-dar-baja'),
]
