"""WebSocket consumer for the real-time aforo monitor (HU08).

Auth model: the frontend sends the JWT access token as `?token=<jwt>` query
string (WebSockets can't set arbitrary headers reliably from browsers). Only
users with rol in ('administrador', 'recepcionista') or is_staff may connect.

Group name: 'aforo_updates'. `apps.access.signals.broadcast_aforo_on_access`
publishes to this group whenever an `AccessLog` row is created.

#159 — Security hardening:
- Origin header is validated against ALLOWED_HOSTS / FRONTEND_URL on connect.
- Connections that are inactive for > 300 s are closed automatically.
"""
import asyncio
import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.conf import settings

from .services import get_aforo_actual

logger = logging.getLogger(__name__)

AFORO_GROUP = 'aforo_updates'
WS_INACTIVITY_TIMEOUT = 300  # seconds (#159)


class AforoConsumer(AsyncJsonWebsocketConsumer):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._inactivity_task: asyncio.Task | None = None

    async def connect(self):
        # #159 — Validate Origin header before accepting the connection.
        if not self._is_origin_allowed():
            logger.warning(
                'AforoConsumer: rejected connection from invalid origin %s',
                self._get_origin(),
            )
            await self.close(code=4403)
            return

        await self.accept()
        user = self.scope.get('user')
        if user is None or not getattr(user, 'is_authenticated', False):
            await self.close(code=4401)  # Unauthorized (needs refresh)
            return
        if not self._is_authorized(user):
            await self.close(code=4403)  # Forbidden (wrong role, do not refresh)
            return

        await self.channel_layer.group_add(AFORO_GROUP, self.channel_name)

        # Send the initial snapshot immediately so the client renders on connect.
        current_data = await self._current_aforo()
        await self.send_json({
            'type': 'aforo.snapshot',
            **current_data,
        })

        # #159 — Start inactivity watchdog.
        self._reset_inactivity_timer()

    async def disconnect(self, code):
        self._cancel_inactivity_timer()
        await self.channel_layer.group_discard(AFORO_GROUP, self.channel_name)

    async def receive_json(self, content, **kwargs):
        """Support a manual refresh trigger from the client (defensive)."""
        # #159 — Reset inactivity timer on any incoming message.
        self._reset_inactivity_timer()

        if content.get('action') == 'refresh':
            current_data = await self._current_aforo()
            await self.send_json({
                'type': 'aforo.snapshot',
                **current_data,
            })

    async def aforo_update(self, event):
        """Handler for messages sent via `group_send(type='aforo.update', ...)`."""
        await self.send_json(event)

    async def aforo_alert(self, event):
        """Handler for aforo threshold alert messages (fix #153)."""
        await self.send_json(event)

    # -----------------------------------------------------------------------
    # Inactivity timeout (#159)
    # -----------------------------------------------------------------------

    def _reset_inactivity_timer(self):
        self._cancel_inactivity_timer()
        self._inactivity_task = asyncio.ensure_future(self._inactivity_watchdog())

    def _cancel_inactivity_timer(self):
        if self._inactivity_task is not None and not self._inactivity_task.done():
            self._inactivity_task.cancel()
        self._inactivity_task = None

    async def _inactivity_watchdog(self):
        try:
            await asyncio.sleep(WS_INACTIVITY_TIMEOUT)
            logger.info('AforoConsumer: closing due to %ds inactivity', WS_INACTIVITY_TIMEOUT)
            await self.close(code=4408)
        except asyncio.CancelledError:
            pass

    # -----------------------------------------------------------------------
    # Origin validation (#159)
    # -----------------------------------------------------------------------

    def _get_origin(self) -> str:
        """Extract the Origin header from the ASGI scope headers."""
        headers = dict(self.scope.get('headers', []))
        return headers.get(b'origin', b'').decode('utf-8', errors='replace')

    def _is_origin_allowed(self) -> bool:
        """Return True when Origin is in the set of permitted origins.

        Permitted origins are built from ALLOWED_HOSTS and FRONTEND_URL.
        An absent Origin header is allowed (e.g. curl / native clients) unless
        settings.WS_REQUIRE_ORIGIN is explicitly set to True.
        """
        origin = self._get_origin()
        if not origin:
            return not getattr(settings, 'WS_REQUIRE_ORIGIN', False)

        # Build the allowed origins set from ALLOWED_HOSTS + FRONTEND_URL
        allowed = set()
        frontend_url = getattr(settings, 'FRONTEND_URL', '').rstrip('/')
        if frontend_url:
            allowed.add(frontend_url)

        for host in getattr(settings, 'ALLOWED_HOSTS', []):
            if host.startswith('*') or host == '':
                # Wildcard — allow any origin (dev only)
                return True
            allowed.add(f'http://{host}')
            allowed.add(f'https://{host}')

        return origin in allowed

    # -----------------------------------------------------------------------
    # Auth helpers
    # -----------------------------------------------------------------------

    @staticmethod
    def _is_authorized(user):
        if user is None or not getattr(user, 'is_authenticated', False):
            return False
        if getattr(user, 'is_staff', False):
            return True
        return getattr(user, 'rol', None) in ('administrador', 'recepcionista')

    @staticmethod
    async def _current_aforo():
        from asgiref.sync import sync_to_async
        return await sync_to_async(get_aforo_actual)()
