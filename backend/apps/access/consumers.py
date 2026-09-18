"""WebSocket consumer for the real-time aforo monitor (HU08).

Auth model: the frontend sends the JWT access token as `?token=<jwt>` query
string (WebSockets can't set arbitrary headers reliably from browsers). Only
users with rol in ('administrador', 'recepcionista') or is_staff may connect.

Group name: 'aforo_updates'. `apps.access.signals.broadcast_aforo_on_access`
publishes to this group whenever an `AccessLog` row is created.
"""
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .services import get_aforo_actual


AFORO_GROUP = 'aforo_updates'


class AforoConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
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

    async def disconnect(self, code):
        await self.channel_layer.group_discard(AFORO_GROUP, self.channel_name)

    async def receive_json(self, content, **kwargs):
        """Support a manual refresh trigger from the client (defensive)."""
        if content.get('action') == 'refresh':
            current_data = await self._current_aforo()
            await self.send_json({
                'type': 'aforo.snapshot',
                **current_data,
            })

    async def aforo_update(self, event):
        """Handler for messages sent via `group_send(type='aforo.update', ...)`."""
        # event is expected to contain all keys
        await self.send_json(event)

    # -----------------------------------------------------------------------
    # Helpers
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
