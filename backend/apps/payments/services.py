import hashlib
import hmac
import logging
import uuid
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
    """Public URL MP hits to notify us.

    The deployed backend URL wins over the ngrok tunnel, so a stale `MP_NGROK_URL`
    left in production cannot hijack the webhook. Local development has no public
    backend URL and falls back to the tunnel.
    """
    base = (
        getattr(settings, 'BACKEND_PUBLIC_URL', '')
        or getattr(settings, 'MP_NGROK_URL', '')
    ).rstrip('/')
    if base:
        return f'{base}/api/payments/webhook/'
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
    """Activate the socio's membership via the unified renovar_membresia service (stack policy)."""
    from apps.memberships.services import renovar_membresia
    with transaction.atomic():
        membresia = renovar_membresia(pago.socio, pago.plan, politica='stack')
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


def cobro_manual(actor, socio, plan, monto, *, medio, observacion='', motivo='', idempotency_key=None):
    """Register a receptionist-triggered manual payment (PDF risk #3 fallback).

    The receptionist is trusted to decide the actual amount (partial payments,
    negotiated discounts, etc.), but we always log any drift from the plan's
    listed price so the admin has a paper trail during audit.

    Args:
        actor: User triggering the charge.
        socio: Socio instance.
        plan: PlanMembresia instance.
        monto: Amount charged (Decimal-coercible).
        medio: Payment method (MedioManual choice). Required.
        observacion: Optional free-text note.
        motivo: Required when monto != plan.precio; documents the discount/surcharge.
        idempotency_key: Optional client-generated key; if a pago with the same
            key already exists, returns it without creating a duplicate.

    Raises:
        ValueError: When socio is not activo.
        ValueError: When monto != plan.precio but motivo is missing.

    Returns:
        Pago instance (existing if idempotency_key matched, new otherwise).
    """
    from apps.members.models import Socio as SocioModel

    if socio.estado != SocioModel.Estado.ACTIVO:
        raise ValueError('No se puede registrar un cobro para un socio inactivo.')

    monto = Decimal(str(monto))
    plan_precio = Decimal(plan.precio)
    diferencia = monto - plan_precio

    if diferencia != 0 and not (motivo and motivo.strip()):
        raise ValueError(
            'El motivo es obligatorio cuando el monto cobrado difiere del precio del plan.'
        )

    # Idempotency check
    if idempotency_key:
        existing = Pago.objects.filter(idempotency_key=idempotency_key).first()
        if existing:
            logger.info('cobro_manual idempotency hit: key=%s pago=%s', idempotency_key, existing.pk)
            return existing

    if diferencia != 0:
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
            cobrado_por=actor,
            medio_manual=medio,
            observacion=observacion or '',
            idempotency_key=idempotency_key or None,
        )
        _activate_membership(pago)

    _send_payment_confirmation_email(pago)
    return pago


def anular_pago(pago, actor, motivo):
    """Cancel an approved payment and revert the activated membership if any.

    Args:
        pago: Pago instance (must be APROBADO and not already anulado).
        actor: User triggering the cancellation (admin only; view enforces this).
        motivo: Non-empty reason string (required).

    Raises:
        ValueError: When cancellation is not allowed (already anulado, not aprobado, or no motivo).

    Returns:
        Updated Pago instance.
    """
    if not motivo or not motivo.strip():
        raise ValueError('El motivo de anulación es obligatorio.')

    if pago.anulado:
        raise ValueError('Este pago ya fue anulado.')

    if pago.estado != Pago.Estado.APROBADO:
        raise ValueError(
            f"Solo se pueden anular pagos aprobados. Estado actual: '{pago.estado}'."
        )

    with transaction.atomic():
        now = timezone.now()
        pago.anulado = True
        pago.anulado_por = actor
        pago.anulado_en = now
        pago.motivo_anulacion = motivo.strip()
        pago.estado = Pago.Estado.CANCELADO
        pago.save(update_fields=[
            'anulado', 'anulado_por', 'anulado_en', 'motivo_anulacion', 'estado', 'updated_at'
        ])

        # Cancel the activated membership if this payment created one
        if pago.membresia_id:
            from apps.memberships.models import Membresia
            from apps.memberships.services import cancelar_membresia
            try:
                membresia = pago.membresia
                if membresia.estado not in (Membresia.Estado.CANCELADA,):
                    cancelar_membresia(
                        membresia,
                        actor,
                        motivo=f'Anulación de pago #{pago.pk}: {motivo}',
                    )
            except Exception as exc:
                logger.warning(
                    'anular_pago: could not cancel membresia %s for pago %s: %s',
                    pago.membresia_id, pago.pk, exc,
                )

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


# States that are considered terminal — only explicit refund/chargeback can move out of APROBADO.
TERMINAL_STATES = {Pago.Estado.REEMBOLSADO, Pago.Estado.CANCELADO}
# States that allow progression (non-terminal, non-approved)
REFUND_TRIGGERS = {'refunded', 'charged_back'}


def procesar_webhook(payload, query_params, x_signature, x_request_id):
    """Main webhook processor — robust idempotent version (fix #190).

    Logic:
    - Only process ``topic=payment`` / ``type=payment``; respond 200 immediately for others.
    - Lookup Pago by mp_payment_id first (tightest), then external_reference, then metadata.pago_id.
    - Terminal-state protection: once APROBADO, only refund/chargeback can change the state.
    - Accept re-attempts on the same Pago while it is not yet APROBADO (in_process → approved).
    - Confirmation email sent exactly once, guarded by ``email_enviado`` flag.
    - Duplicate-approved events (double charge) are logged as warnings.

    Returns a tuple (ok: bool, message: str, pago: Optional[Pago]).
    """
    # Topic filter: only handle payment notifications
    topic = payload.get('type') or payload.get('topic') or ''
    if topic and topic != 'payment':
        logger.info('Webhook topic=%s ignored (non-payment)', topic)
        return True, f'topic {topic} ignored', None

    data_id = _extract_data_id(payload, query_params)
    if not data_id:
        return False, 'missing data.id', None

    if not verify_webhook_signature(x_signature, x_request_id, data_id):
        return False, 'invalid signature', None

    try:
        mp_payment = mercadopago_client.fetch_payment(data_id)
    except Exception as exc:
        logger.error('Failed to fetch MP payment %s: %s', data_id, exc, exc_info=True)
        return False, 'failed to fetch payment', None

    external_reference = mp_payment.get('external_reference', '') or ''
    mp_status = mp_payment.get('status', '')
    mp_status_detail = mp_payment.get('status_detail', '')

    # Lookup: by mp_payment_id (already assigned) → external_reference → metadata.pago_id
    pago = Pago.objects.filter(mp_payment_id=str(data_id)).first()
    if pago is None and external_reference:
        pago = Pago.objects.filter(mp_external_reference=external_reference).first()
    if pago is None:
        meta_pago_id = (mp_payment.get('metadata') or {}).get('pago_id')
        if meta_pago_id:
            pago = Pago.objects.filter(pk=meta_pago_id).first()
    if pago is None:
        logger.warning('Webhook received for unknown external_reference=%s data_id=%s', external_reference, data_id)
        return False, 'unknown pago', None

    new_estado = STATUS_MAP.get(mp_status, Pago.Estado.PENDIENTE)

    with transaction.atomic():
        # Select for update to serialize concurrent webhook deliveries
        pago = Pago.objects.select_for_update().get(pk=pago.pk)

        # Terminal-state protection: APROBADO can only move to REEMBOLSADO/CANCELADO
        if pago.estado == Pago.Estado.APROBADO:
            if mp_status not in REFUND_TRIGGERS:
                # Duplicate approved event — potential double charge, log and return idempotent
                logger.warning(
                    'Duplicate approved webhook for pago %s (mp_payment_id=%s). Possible double charge.',
                    pago.pk, data_id,
                )
                return True, 'already approved', pago
            # Genuine refund/chargeback: allow state transition
            new_estado = Pago.Estado.REEMBOLSADO

        # Protect fully terminal states (reembolsado/cancelado) from further changes
        if pago.estado in TERMINAL_STATES and pago.estado != Pago.Estado.APROBADO:
            logger.info('Webhook ignored: pago %s already in terminal state %s', pago.pk, pago.estado)
            return True, 'already terminal', pago

        pago.mp_payment_id = str(data_id)
        pago.mp_status_detail = mp_status_detail
        pago.estado = new_estado
        pago.raw_webhook = mp_payment
        if new_estado == Pago.Estado.APROBADO and pago.paid_at is None:
            pago.paid_at = timezone.now()
        pago.save()

        if new_estado == Pago.Estado.APROBADO and pago.membresia is None:
            _activate_membership(pago)

    # Send confirmation email exactly once, outside the transaction to avoid holding the lock
    if new_estado == Pago.Estado.APROBADO and not pago.email_enviado:
        _send_payment_confirmation_email(pago)
        Pago.objects.filter(pk=pago.pk).update(email_enviado=True)
        pago.email_enviado = True

    return True, f'processed ({new_estado})', pago
