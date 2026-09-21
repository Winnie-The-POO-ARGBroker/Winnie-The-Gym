import sys

from django.conf import settings
from django.urls import path

app_name = 'users'

from .views import (
    CompleteProfileView,
    DevLoginView,
    GoogleLoginView,
    ProfileView,
)

urlpatterns = [
    path('google/', GoogleLoginView.as_view(), name='google-login'),
    path('complete-profile/', CompleteProfileView.as_view(), name='complete-profile'),
    path('profile/', ProfileView.as_view(), name='profile'),
]

# Rutas exclusivas para desarrollo local y tests. Nunca se registran en producción.
if settings.DEBUG or 'test' in sys.argv:
    urlpatterns += [
        path('dev-login/', DevLoginView.as_view(), name='dev-login'),
    ]
