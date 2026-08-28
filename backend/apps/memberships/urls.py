from django.urls import path

from .views import (
    MeRenewView,
    MeView,
    MembresiaListCreateView,
    MembresiaRetrieveUpdateView,
    PlanListCreateView,
    PlanRetrieveUpdateDestroyView,
)

urlpatterns = [
    path('planes/', PlanListCreateView.as_view(), name='plan-list-create'),
    path('planes/<int:pk>/', PlanRetrieveUpdateDestroyView.as_view(), name='plan-detail'),
    path('membresias/', MembresiaListCreateView.as_view(), name='membresia-list-create'),
    path('membresias/<int:pk>/', MembresiaRetrieveUpdateView.as_view(), name='membresia-detail'),
    path('me/', MeView.as_view(), name='me'),
    path('me/renew/', MeRenewView.as_view(), name='me-renew'),
]
