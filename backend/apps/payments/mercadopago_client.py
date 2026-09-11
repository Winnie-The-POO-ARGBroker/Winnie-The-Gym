"""Thin wrapper around the MercadoPago SDK.

Isolated so it can be monkey-patched from tests without touching the network,
and so any future migration to a different SDK version (or another provider)
happens in a single file.
"""
from django.conf import settings

try:
    import mercadopago  # type: ignore
except ImportError:  # pragma: no cover — dev/test envs without the SDK still import this module.
    mercadopago = None


def get_sdk():
    if mercadopago is None:
        raise RuntimeError('mercadopago SDK is not installed.')
    token = getattr(settings, 'MP_ACCESS_TOKEN', '') or ''
    if not token:
        raise RuntimeError('MP_ACCESS_TOKEN is not configured.')
    return mercadopago.SDK(token)


def create_preference(preference_data):
    """Create a MercadoPago preference and return the API response body."""
    sdk = get_sdk()
    response = sdk.preference().create(preference_data)
    if response.get('status') and response['status'] >= 400:
        raise RuntimeError(
            f'MercadoPago preference creation failed: {response.get("response")}',
        )
    return response.get('response', {})


def fetch_payment(payment_id):
    """Fetch a MercadoPago payment resource by id."""
    sdk = get_sdk()
    response = sdk.payment().get(payment_id)
    if response.get('status') and response['status'] >= 400:
        raise RuntimeError(
            f'MercadoPago payment lookup failed: {response.get("response")}',
        )
    return response.get('response', {})
