import logging
import os
from datetime import date

import magic
from django.conf import settings
from django.core.files.storage import default_storage
from django.utils.text import slugify
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)


ALLOWED_CERT_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}
ALLOWED_CERT_CONTENT_TYPES = {
    'application/pdf',
    'image/jpeg',
    'image/png',
}
MAX_CERT_SIZE_BYTES = 5 * 1024 * 1024


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


def dar_baja(socio):
    """Mark a Socio as given de baja, setting estado=BAJA and fecha_baja=today.

    Idempotent: calling on an already-baja socio is safe.
    """
    socio.estado = socio.Estado.BAJA
    socio.fecha_baja = date.today()
    socio.save(update_fields=['estado', 'fecha_baja', 'updated_at'])
    return socio


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


def guardar_certificado_medico(socio, archivo, request=None):
    """Persist a medical certificate for a socio (RF08).

    Stores the file locally under MEDIA_ROOT/certificados_medicos/ and updates
    Socio.certificado_medico_url with an absolute URL when a request is provided,
    or a MEDIA_URL-relative path otherwise. In production this path is designed
    to be replaced by the Supabase Storage upload flow (see wiki: Despliegue).
    """
    _validate_certificado(archivo)

    extension = os.path.splitext(archivo.name)[1].lower()
    safe_name = f'{socio.numero_socio}_{slugify(socio.apellido)}{extension}'
    relative_path = f'certificados_medicos/{safe_name}'

    if default_storage.exists(relative_path):
        default_storage.delete(relative_path)

    stored_path = default_storage.save(relative_path, archivo)
    media_url = f'{settings.MEDIA_URL}{stored_path}'

    if request is not None:
        socio.certificado_medico_url = request.build_absolute_uri(media_url)
    else:
        socio.certificado_medico_url = media_url

    socio.save(update_fields=['certificado_medico_url', 'updated_at'])
    return socio
