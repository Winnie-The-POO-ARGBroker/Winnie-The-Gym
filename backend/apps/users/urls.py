from django.urls import path

from .views import CompleteProfileView, GoogleLoginView, ProfileView

urlpatterns = [
    path('google/', GoogleLoginView.as_view(), name='google-login'),
    path('complete-profile/', CompleteProfileView.as_view(), name='complete-profile'),
    path('profile/', ProfileView.as_view(), name='profile'),
]
