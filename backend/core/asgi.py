import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.development')

# `django_asgi_app` must be built BEFORE importing anything that touches models
# so the app registry finishes loading first (avoids AppRegistryNotReady).
django_asgi_app = get_asgi_application()

from apps.access.routing import websocket_urlpatterns as access_ws_routes  # noqa: E402
from core.ws_auth import JWTAuthMiddlewareStack  # noqa: E402


application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': JWTAuthMiddlewareStack(
        URLRouter(access_ws_routes),
    ),
})
