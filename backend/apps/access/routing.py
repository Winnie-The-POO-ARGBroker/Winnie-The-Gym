from django.urls import path

from .consumers import AforoConsumer


websocket_urlpatterns = [
    path('ws/aforo/', AforoConsumer.as_asgi(), name='ws-aforo'),
]
