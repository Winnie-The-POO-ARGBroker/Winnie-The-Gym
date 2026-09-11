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
        user = self.scope.get('user')
        if not self._is_authorized(user):
            await self.close(code=4403)
            return
        await self.channel_layer.group_add(AFORO_GROUP, self.channel_name)
        await self.accept()
        # Send the initial snapshot immediately so the client renders on connect.
        await self.send_json({
            'type': 'aforo.snapshot',
            'aforo_actual': await self._current_aforo(),
        })

    async def disconnect(self, code):
        await self.channel_layer.group_discard(AFORO_GROUP, self.channel_name)

    async def receive_json(self, content, **kwargs):
        """Support a manual refresh trigger from the client (defensive)."""
        if content.get('action') == 'refresh':
            await self.send_json({
                'type': 'aforo.snapshot',
                'aforo_actual': await self._current_aforo(),
            })

    async def aforo_update(self, event):
        """Handler for messages sent via `group_send(type='aforo.update', ...)`."""
        await self.send_json({
            'type': 'aforo.update',
            'aforo_actual': event['aforo_actual'],
        })

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
