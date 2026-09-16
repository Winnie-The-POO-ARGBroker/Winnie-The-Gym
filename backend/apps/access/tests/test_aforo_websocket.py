import pytest
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework_simplejwt.tokens import RefreshToken

from apps.access.models import AccessLog
from apps.access.services import invalidate_aforo_cache
from core.asgi import application


User = get_user_model()


def _make_user(email, rol='administrador', **extra):
    return User.objects.create_user(
        email=email, password='x', username=email, rol=rol, **extra,
    )


def _token_for(user):
    return str(RefreshToken.for_user(user).access_token)


async def _connect(token=None):
    path = '/ws/aforo/'
    if token:
        path = f'{path}?token={token}'
    comm = WebsocketCommunicator(application, path)
    connected, _ = await comm.connect()
    return comm, connected


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
async def test_admin_can_connect_and_receives_snapshot():
    from asgiref.sync import sync_to_async
    admin = await sync_to_async(_make_user)('admin-ws@test.com', 'administrador')
    token = await sync_to_async(_token_for)(admin)
    await sync_to_async(invalidate_aforo_cache)()

    comm, connected = await _connect(token)
    assert connected
    msg = await comm.receive_json_from(timeout=2)
    assert msg['type'] == 'aforo.snapshot'
    assert msg['aforo_actual'] == 0
    await comm.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_anonymous_is_rejected():
    comm, connected = await _connect(token=None)
    assert connected
    close_code = await comm.receive_output(timeout=1)
    assert close_code == {"type": "websocket.close", "code": 4403}


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_socio_is_rejected():
    from asgiref.sync import sync_to_async
    socio_user = await sync_to_async(_make_user)('socio-ws@test.com', 'socio')
    token = await sync_to_async(_token_for)(socio_user)

    comm, connected = await _connect(token)
    assert connected
    close_code = await comm.receive_output(timeout=1)
    assert close_code == {"type": "websocket.close", "code": 4403}


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
async def test_access_log_creation_broadcasts_update():
    from asgiref.sync import sync_to_async
    admin = await sync_to_async(_make_user)('admin-broadcast@test.com', 'administrador')
    token = await sync_to_async(_token_for)(admin)
    await sync_to_async(invalidate_aforo_cache)()

    comm, connected = await _connect(token)
    assert connected

    # Consume the initial snapshot
    snap = await comm.receive_json_from(timeout=2)
    assert snap['type'] == 'aforo.snapshot'

    # Create an ENTRY GRANTED — the signal should push the new count.
    await sync_to_async(AccessLog.objects.create)(
        user=admin, access_type='ENTRY', status='GRANTED',
    )

    update = await comm.receive_json_from(timeout=3)
    assert update['type'] == 'aforo.update'
    assert update['aforo_actual'] == 1

    await comm.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
async def test_denied_access_does_not_broadcast():
    from asgiref.sync import sync_to_async
    admin = await sync_to_async(_make_user)('admin-denied@test.com', 'administrador')
    token = await sync_to_async(_token_for)(admin)
    await sync_to_async(invalidate_aforo_cache)()

    comm, connected = await _connect(token)
    assert connected
    await comm.receive_json_from(timeout=2)  # snapshot

    await sync_to_async(AccessLog.objects.create)(
        user=admin, access_type='ENTRY', status='DENIED', denial_reason='MEMBERSHIP_INACTIVE',
    )

    assert await comm.receive_nothing(timeout=1.5)
    await comm.disconnect()
