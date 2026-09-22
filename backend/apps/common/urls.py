from django.urls import path

from .views import GymConfigView

app_name = 'config'

urlpatterns = [
    path('gym/', GymConfigView.as_view(), name='gym-config'),
]
