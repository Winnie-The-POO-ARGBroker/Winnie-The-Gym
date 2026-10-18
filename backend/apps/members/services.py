"""Member-domain service functions.

Covers: certificate upload (#227), dar_baja / suspender_socio (#230),
activation email dispatch, and signed URL generation (#227).
"""
import logging
import os
import uuid
from datetime import date, datetime, timezone as dt_timezone

import magic
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction
from botocore.exceptions import BotoCoreError, ClientError
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError

logger = logging.getLogger(__name__)


ALLOWED_CERT_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}
ALLOWED_CERT_CONTENT_TYPES = {
    'application/pdf',
    'image/jpeg',
    'image/png',
}
MAX_CERT_SIZE_BYTES = 5 * 1024 * 1024

# Signed URL TTL in seconds (#227)
SIGNED_URL_TTL = 300  # 5 minutes


def dispatch_activation_email_for_socio(usuario) -> None:
    """Trigger a set-password activation email for a socio's user account.

    Only dispatches if the user has a real email address (not a synthetic
    ``socio_<dni>@winniegym.com`` placeholder). Delegates to the users-app
    service to keep cross-app coupling minimal.
    """
    if not usuario or not usuario.email:
        return

    is_synthetic = usuario.email.endswith('@winniegym.com') and usuario.email.startswith('socio_')
    if is_synthetic:
        logger.warning(
            'dispatch_activation_email_for_socio: synthetic email %s, skipping',
            usuario.email,
        )
        return

    try:
        from apps.users.services import send_activation_email
        send_activation_email(usuario)
    except Exception as exc:
        logger.warning('dispatch_activation_email_for_socio failed for %s: %s', usuario.email, exc)


# ---------------------------------------------------------------------------
# #230 — dar_baja and suspender_socio
# ---------------------------------------------------------------------------

def dar_baja(socio):
    """Mark a Socio as given de baja.

    #230: Inside a single transaction:
    - Cancels all active/suspended memberships.
    - Cancels all future class reservations.
    - Sets estado=BAJA and fecha_baja=today.
    - Sends a branded email notification.

    Idempotent: calling on an already-baja socio is safe.
    """
    from apps.memberships.models import Membresia
    from apps.memberships.services import cancelar_membresia

    with transaction.atomic():
        socio = type(socio).objects.select_for_update().get(pk=socio.pk)

        if socio.estado == socio.Estado.BAJA:
            return socio

        # Cancel all active/suspended memberships
        cancelable_estados = [Membresia.Estado.ACTIVA, Membresia.Estado.SUSPENDIDA]
        for membresia in socio.membresias.filter(estado__in=cancelable_estados):
            try:
                cancelar_membresia(
                    membresia,
                    actor=None,
                    motivo='Baja automática por dar de baja al socio.',
                )
            except Exception:
                logger.warning(
                    'dar_baja: could not cancel membresia %s for socio %s',
                    membresia.pk, socio.pk,
                )

        # Cancel future class reservations (delete them — InscripcionClase has no estado field)
        try:
            socio.inscripciones_clases.all().delete()
        except Exception:
            logger.warning('dar_baja: could not cancel reservas for socio %s', socio.pk)

        socio.estado = socio.Estado.BAJA
        socio.fecha_baja = date.today()
        socio.save(update_fields=['estado', 'fecha_baja', 'updated_at'])

    # Send notification email outside the transaction (best-effort)
    transaction.on_commit(lambda: _send_baja_email(socio))

    return socio


def _send_baja_email(socio):
    """Send a 'given de baja' notification email to the socio."""
    try:
        from apps.common.emails import send_templated_email
        email = socio.usuario.email if socio.usuario_id else None
        if email:
            send_templated_email(
                template_base='socio_baja',
                subject='Tu cuenta en Winnie The Gym ha sido dada de baja',
                to=[email],
                context={'socio': socio},
                category='socio_baja',
            )
    except Exception as exc:
        logger.warning('_send_baja_email failed for socio %s: %s', socio.pk, exc)


def suspender_socio(socio, motivo=''):
    """Set estado='suspendido' and send a branded email with the reason.

    #230: A suspended socio can still log in, cancel existing reservations,
    and view the portal — they just cannot make new reservations, generate QR,
    or renew their membership.
    """
    socio.estado = socio.Estado.SUSPENDIDO
    socio.save(update_fields=['estado', 'updated_at'])

    transaction.on_commit(lambda: _send_suspension_email(socio, motivo))
    return socio


def _send_suspension_email(socio, motivo):
    """Send a suspension notification email to the socio."""
    try:
        from apps.common.emails import send_templated_email
        email = socio.usuario.email if socio.usuario_id else None
        if email:
            send_templated_email(
                template_base='socio_suspendido',
                subject='Tu cuenta en Winnie The Gym ha sido suspendida',
                to=[email],
                context={'socio': socio, 'motivo': motivo},
                category='socio_suspension',
            )
    except Exception as exc:
        logger.warning('_send_suspension_email failed for socio %s: %s', socio.pk, exc)


# ---------------------------------------------------------------------------
# #227 — Certificate storage and signed URL generation
# ---------------------------------------------------------------------------

def _validate_certificado(archivo):
    if archivo.size > MAX_CERT_SIZE_BYTES:
        raise ValidationError({'archivo': 'El archivo supera el tamaño máximo permitido (5 MB).'})

    extension = os.path.splitext(archivo.name)[1].lower()
    if extension not in ALLOWED_CERT_EXTENSIONS:
        raise ValidationError({
            'archivo': f'Extensión no permitida ({extension}). Aceptadas: PDF, JPG, PNG.',
        })

    content_type = getattr(archivo, 'content_type', None)
    if not content_type or content_type not in ALLOWED_CERT_CONTENT_TYPES:
        raise ValidationError({
            'archivo': f'Tipo de contenido no permitido o no especificado ({content_type}). Aceptados: application/pdf, image/jpeg, image/png.',
        })

    # Magic-byte sniffing: verify the actual file content matches the declared type.
    mime_detected = magic.from_buffer(archivo.read(2048), mime=True)
    archivo.seek(0)
    if mime_detected not in ALLOWED_CERT_CONTENT_TYPES:
        raise ValidationError({
            'archivo': f'El contenido real del archivo ({mime_detected}) no coincide con los tipos permitidos.',
        })


def _get_cert_storage():
    """Return the private certificate storage backend.

    In production, returns SupabasePrivateCertStorage (writes to the private
    bucket). In dev/test (no SUPABASE_STORAGE_ENDPOINT configured), falls back
    to the default FileSystemStorage so tests run without Supabase credentials.
    """
    endpoint = getattr(settings, 'SUPABASE_STORAGE_ENDPOINT', '')
    if endpoint:
        try:
            from apps.common.storages import SupabasePrivateCertStorage
            return SupabasePrivateCertStorage()
        except Exception as exc:
            logger.warning('Could not init SupabasePrivateCertStorage: %s — falling back to default', exc)
    return default_storage


class AlmacenamientoNoDisponible(APIException):
    """The file storage (Supabase) rejected or could not complete the request."""

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = (
        'No se pudo guardar el archivo: el almacenamiento no está disponible. '
        'Intentá de nuevo en unos minutos.'
    )
    default_code = 'storage_unavailable'


def guardar_certificado_medico(socio, archivo, emitido_en=None, vence_en=None, request=None):
    """Persist a medical certificate for a socio (#227 + #228).

    - Validates the file (size, extension, MIME).
    - Stores the file under `uploads/certs/{uuid}.{ext}` with a UUID filename
      to avoid revealing the socio's identity via the URL.
    - Deletes the previous certificate from storage if one existed.
    - Updates Socio.certificado_medico_path with the new object key.
    - Updates Socio.certificado_emitido_en and certificado_vence_en when provided.
    - Keeps Socio.certificado_medico_url for backward compat (set to '').

    Returns the updated socio instance.
    """
    _validate_certificado(archivo)

    extension = os.path.splitext(archivo.name)[1].lower()
    object_key = f'uploads/certs/{uuid.uuid4()}{extension}'

    storage = _get_cert_storage()

    # Delete the previous certificate if one exists
    old_path = socio.certificado_medico_path
    if old_path:
        try:
            storage.delete(old_path)
        except Exception as exc:
            logger.warning(
                'guardar_certificado_medico: could not delete old cert %s for socio %s: %s',
                old_path, socio.pk, exc,
            )

    # Save the new file
    try:
        stored_key = storage.save(object_key, archivo)
    except (ClientError, BotoCoreError) as exc:
        logger.error(
            'guardar_certificado_medico: storage rejected the upload for socio %s (bucket missing or bad credentials?): %s',
            socio.pk, exc,
        )
        raise AlmacenamientoNoDisponible() from exc

    update_fields = ['certificado_medico_path', 'certificado_medico_url', 'updated_at']
    socio.certificado_medico_path = stored_key
    socio.certificado_medico_url = ''  # deprecated — no longer used for certs

    if emitido_en is not None:
        socio.certificado_emitido_en = emitido_en
        update_fields.append('certificado_emitido_en')
    if vence_en is not None:
        socio.certificado_vence_en = vence_en
        update_fields.append('certificado_vence_en')

    socio.save(update_fields=update_fields)
    return socio


def generar_signed_url_certificado(socio, *, expires=SIGNED_URL_TTL):
    """Generate a short-lived signed URL for the socio's medical certificate (#227).

    Returns a dict: {url: str, expires_at: str (ISO 8601 UTC)}.
    Raises ValidationError if the socio has no certificate on file.

    In dev (no Supabase endpoint), falls back to returning the MEDIA_URL path
    directly so tests and local development work without credentials.
    """
    if not socio.certificado_medico_path:
        raise ValidationError({'detail': 'El socio no tiene certificado médico registrado.'})

    storage = _get_cert_storage()
    endpoint = getattr(settings, 'SUPABASE_STORAGE_ENDPOINT', '')

    if endpoint:
        # S3/Supabase pre-signed URL
        url = storage.url(socio.certificado_medico_path, expire=expires)
    else:
        # Dev fallback: build a MEDIA_URL path (not a real signed URL)
        url = f'{settings.MEDIA_URL}{socio.certificado_medico_path}'

    from datetime import timedelta
    expires_at = (
        datetime.now(tz=dt_timezone.utc) + timedelta(seconds=expires)
    ).isoformat().replace('+00:00', 'Z')

    return {'url': url, 'expires_at': expires_at}
