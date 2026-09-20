import hashlib
import hmac
import logging
import uuid
from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.common.tasks import enqueue_email
from apps.memberships.models import Membresia, PlanMembresia

from . import mercadopago_client
from .models import Pago


logger = logging.getLogger(__name__)


def _external_reference():
    return uuid.uuid4().hex


def _is_public_url(base):
    return bool(base) and 'localhost' not in base and '127.0.0.1' not in base


def _build_back_urls():
    base = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    return {
        'success': f'{base}/socio/credencial?pago=success',
        'failure': f'{base}/socio/credencial?pago=failure',
        'pending': f'{base}/socio/credencial?pago=pending',
    }, _is_public_url(base)


def _build_notification_url():
    """Public URL MP hits to notify us. Points to the ngrok tunnel in dev."""
    ngrok = getattr(settings, 'MP_NGROK_URL', '').rstrip('/')
    if ngrok:
        return f'{ngrok}/api/payments/webhook/'
    return None


def _send_payment_confirmation_email(pago):
    user = getattr(pago.socio, 'usuario', None)
    email = getattr(user, 'email', None)
    if not email:
        return
    enqueue_email(
        template_base='payment_confirmation',
        subject='Confirmamos tu pago en Winnie The Gym',
        to=[email],
        context={
            'nombre': pago.socio.nombre,
            'plan_nombre': pago.plan.nombre,
            'monto': f'{pago.monto:.2f}',
            'moneda': pago.moneda,
            'fecha_fin': pago.membresia.fecha_fin if pago.membresia else None,
            'mp_payment_id': pago.mp_payment_id or '',
        },
        category='payment_confirmation',
    )


def _activate_membership(pago):
    """Renew the socio's membership using the plan attached to the pago."""
    fecha_inicio = date.today()
    fecha_fin = fecha_inicio + timedelta(days=pago.plan.duracion_dias)

    with transaction.atomic():
        pago.socio.membresias.filter(
            estado=Membresia.Estado.ACTIVA,
        ).update(estado=Membresia.Estado.VENCIDA)

        membresia = pago.socio.membresias.create(
            plan=pago.plan,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            estado=Membresia.Estado.ACTIVA,
        )
        pago.membresia = membresia
        pago.save(update_fields=['membresia', 'updated_at'])
    return membresia


def crear_preferencia(socio, plan):
    """Create a Pago in `pendiente` and a MercadoPago preference for it."""
    external_reference = _external_reference()

    with transaction.atomic():
        pago = Pago.objects.create(
            socio=socio,
            plan=plan,
            monto=plan.precio,
            moneda='ARS',
            metodo=Pago.Metodo.MERCADO_PAGO,
            estado=Pago.Estado.PENDIENTE,
            mp_external_reference=external_reference,
        )

    payer_email = getattr(getattr(socio, 'usuario', None), 'email', None) or ''

    back_urls, back_urls_are_public = _build_back_urls()
    preference_payload = {
        'items': [
            {
                'title': f'Membresía {plan.nombre}',
                'quantity': 1,
                'unit_price': float(Decimal(plan.precio)),
                'currency_id': 'ARS',
            }
        ],
        'external_reference': external_reference,
        'back_urls': back_urls,
        'statement_descriptor': 'WinnieTheGym',
        'metadata': {
            'pago_id': pago.pk,
            'socio_id': socio.pk,
            'plan_id': plan.pk,
        },
    }
    # MercadoPago requires publicly reachable back_urls to enable auto_return.
    # In dev (localhost) we omit it so preferences still succeed on Sandbox.
    if back_urls_are_public:
        preference_payload['auto_return'] = 'approved'
    if payer_email:
        preference_payload['payer'] = {'email': payer_email}
    notification_url = _build_notification_url()
    if notification_url:
        preference_payload['notification_url'] = notification_url

    response = mercadopago_client.create_preference(preference_payload)

    pago.mp_preference_id = response.get('id', '')
    pago.save(update_fields=['mp_preference_id', 'updated_at'])

    return {
        'pago': pago,
        'preference_id': response.get('id', ''),
        'init_point': response.get('init_point', ''),
        'sandbox_init_point': response.get('sandbox_init_point', ''),
        'external_reference': external_reference,
    }


def cobro_manual(actor, socio, plan, monto, observacion=''):
    """Register a receptionist-triggered manual payment (PDF risk #3 fallback).

    The receptionist is trusted to decide the actual amount (partial payments,
    negotiated discounts, etc.), but we always log any drift from the plan's
    listed price so the admin has a paper trail during audit.
    """
    monto = Decimal(str(monto))
    plan_precio = Decimal(plan.precio)
    diferencia = monto - plan_precio

    metadata = {
        'source': 'manual',
        'actor_id': actor.pk if actor else None,
        'observacion': observacion,
        'plan_precio': str(plan_precio),
        'monto_cobrado': str(monto),
    }
    if diferencia != 0:
        metadata['diferencia_vs_plan'] = str(diferencia)
        logger.warning(
            'Cobro manual con diferencia vs precio del plan: socio=%s plan=%s cobrado=%s esperado=%s diff=%s',
            socio.pk, plan.pk, monto, plan_precio, diferencia,
        )

    with transaction.atomic():
        pago = Pago.objects.create(
            socio=socio,
            plan=plan,
            monto=monto,
            moneda='ARS',
            metodo=Pago.Metodo.MANUAL,
            estado=Pago.Estado.APROBADO,
            mp_external_reference=_external_reference(),
            paid_at=timezone.now(),
            raw_webhook=metadata,
        )
        _activate_membership(pago)

    _send_payment_confirmation_email(pago)
    return pago


# ---------------------------------------------------------------------------
# Webhook processing
# ---------------------------------------------------------------------------

STATUS_MAP = {
    'approved': Pago.Estado.APROBADO,
    'rejected': Pago.Estado.RECHAZADO,
    'cancelled': Pago.Estado.CANCELADO,
    'refunded': Pago.Estado.REEMBOLSADO,
    'in_process': Pago.Estado.PENDIENTE,
    'pending': Pago.Estado.PENDIENTE,
    'authorized': Pago.Estado.PENDIENTE,
    'charged_back': Pago.Estado.REEMBOLSADO,
}


def verify_webhook_signature(x_signature, x_request_id, data_id):
    """Validate MercadoPago's HMAC-SHA256 signature (v1).

    Raises ImproperlyConfigured at call time if MP_WEBHOOK_SECRET is not set,
    so webhook requests are never silently accepted without a verified signature.
    """
    from django.core.exceptions import ImproperlyConfigured
    secret = getattr(settings, 'MP_WEBHOOK_SECRET', '') or ''
    if not secret:
        raise ImproperlyConfigured(
            "MP_WEBHOOK_SECRET is required for webhook signature verification. "
            "Set it in your .env file. Without it all webhook calls are rejected."
        )

    if not x_signature or not x_request_id or not data_id:
        return False

    parts = dict(part.strip().split('=', 1) for part in x_signature.split(',') if '=' in part)
    ts = parts.get('ts')
    v1 = parts.get('v1')
    if not ts or not v1:
        return False

    manifest = f'id:{data_id};request-id:{x_request_id};ts:{ts};'
    expected = hmac.new(
        secret.encode('utf-8'),
        manifest.encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, v1)


def _extract_data_id(payload, query_params):
    """MercadoPago sometimes sends the id in ?data.id=... and sometimes in body."""
    if isinstance(payload, dict):
        data = payload.get('data') or {}
        if isinstance(data, dict) and data.get('id'):
            return str(data['id'])
        if payload.get('id') and payload.get('type') == 'payment':
            return str(payload['id'])
    if query_params:
        candidate = query_params.get('data.id') or query_params.get('id')
        if candidate:
            return str(candidate)
    return None


def procesar_webhook(payload, query_params, x_signature, x_request_id):
    """Main webhook processor.

    Returns a tuple (ok: bool, message: str, pago: Optional[Pago]).
    """
    data_id = _extract_data_id(payload, query_params)
    if not data_id:
        return False, 'missing data.id', None

    if not verify_webhook_signature(x_signature, x_request_id, data_id):
        return False, 'invalid signature', None

    try:
        mp_payment = mercadopago_client.fetch_payment(data_id)
    except Exception as exc:  # network / API failure
        logger.error('Failed to fetch MP payment %s: %s', data_id, exc, exc_info=True)
        return False, 'failed to fetch payment', None

    external_reference = mp_payment.get('external_reference', '')
    mp_status = mp_payment.get('status', '')
    mp_status_detail = mp_payment.get('status_detail', '')

    pago = None
    if external_reference:
        pago = Pago.objects.filter(mp_external_reference=external_reference).first()
    if pago is None and mp_payment.get('metadata', {}).get('pago_id'):
        pago = Pago.objects.filter(pk=mp_payment['metadata']['pago_id']).first()
    if pago is None:
        logger.warning('Webhook received for unknown external_reference=%s', external_reference)
        return False, 'unknown pago', None

    new_estado = STATUS_MAP.get(mp_status, Pago.Estado.PENDIENTE)

    with transaction.atomic():
        # Idempotency by mp_payment_id UNIQUE — do not overwrite once terminal.
        if pago.mp_payment_id and pago.mp_payment_id != str(data_id):
            logger.info('Ignoring duplicate webhook for pago %s', pago.pk)
            return True, 'duplicate ignored', pago

        pago.mp_payment_id = str(data_id)
        pago.mp_status_detail = mp_status_detail
        pago.estado = new_estado
        pago.raw_webhook = mp_payment
        if new_estado == Pago.Estado.APROBADO and pago.paid_at is None:
            pago.paid_at = timezone.now()
        pago.save()

        if new_estado == Pago.Estado.APROBADO and pago.membresia is None:
            _activate_membership(pago)

    if new_estado == Pago.Estado.APROBADO:
        _send_payment_confirmation_email(pago)

    return True, f'processed ({new_estado})', pago
