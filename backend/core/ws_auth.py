"""JWT auth for Django Channels WebSocket connections.

Browsers can't reliably set custom headers on WebSocket handshakes, so the
frontend passes the access token as `?token=<jwt>`. This middleware parses it,
resolves the user and attaches it to `scope['user']`.
"""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser


User = get_user_model()


@database_sync_to_async
def _resolve_user(token):
    if not token:
        return AnonymousUser()
    # Imported lazily so Django app registry is loaded before we touch models.
    from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
    from rest_framework_simplejwt.tokens import AccessToken

    try:
        access = AccessToken(token)
        user_id = access['user_id']
    except (InvalidToken, TokenError, KeyError):
        return AnonymousUser()

    try:
        return User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query = parse_qs(scope.get('query_string', b'').decode(errors='ignore'))
        token = query.get('token', [None])[0]
        scope['user'] = await _resolve_user(token)
        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)
