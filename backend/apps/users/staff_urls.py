"""URL patterns for staff management endpoints.

Mounted at /api/users/ in core/urls.py. Separated from the main users/urls.py
to avoid namespace conflicts with the /api/auth/ mount.
"""
from django.urls import path

from .views import StaffResendActivationView, StaffView

urlpatterns = [
    path('staff/', StaffView.as_view(), name='staff-list-create'),
    path('staff/<int:pk>/resend-activation/', StaffResendActivationView.as_view(), name='staff-resend-activation'),
]
