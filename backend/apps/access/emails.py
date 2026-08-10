from html import escape
import logging
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

logger = logging.getLogger(__name__)


def send_welcome_email(user) -> bool:
    """
    Envía un correo de bienvenida HTML al registrarse un nuevo socio.
    """
    if not user or not user.email:
        return False

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    user_name = escape(user.first_name or user.email)

    subject = "¡Bienvenido/a a Winnie Gym!"
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Winnie Gym <noreply@winniegym.com>')
    to_email = [user.email]

    text_content = f"Hola {user_name},\n\n¡Bienvenido a Winnie Gym! Tu cuenta ha sido activada correctamente.\nPodrás generar tu credencial QR dinámica desde nuestro portal de socios.\n\nSaludos,\nEl equipo de Winnie Gym."

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4F46E5; text-align: center;">¡Bienvenido/a a Winnie Gym! 🏋️‍♂️</h2>
        <p>Hola <strong>{user_name}</strong>,</p>
        <p>Tu cuenta ha sido creada exitosamente. Ya podés acceder a tu portal de socio para ver tu credencial digital con <strong>QR dinámico</strong>, consultar tus clases y estado de cuota.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{frontend_url}/login" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ingresar al Portal</a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888; text-align: center;">Este es un correo automático. Por favor no respondas a este mensaje.</p>
    </div>
    """

    try:
        msg = EmailMultiAlternatives(subject, text_content, from_email, to_email)
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info(f"Correo de bienvenida enviado exitosamente a {user.email}")
        return True
    except Exception as e:
        logger.error(f"Error al enviar correo de bienvenida a {user.email}: {e}")
        return False


def send_access_notification_email(user, access_log) -> bool:
    """
    Notifica al socio sobre un evento de ingreso o intento denegado.
    """
    if not user or not user.email:
        return False

    user_name = escape(user.first_name or user.email)
    status_str = "permitido" if access_log.status == 'GRANTED' else "DENEGADO"
    subject = f"Aviso de acceso {status_str} - Winnie Gym"
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Winnie Gym <noreply@winniegym.com>')
    to_email = [user.email]

    reason_info = f"<p style='color: red;'>Motivo de rechazo: {escape(access_log.get_denial_reason_display() or '')}</p>" if access_log.status == 'DENIED' else ""

    text_content = f"Hola {user_name},\n\nSe ha registrado un intento de ingreso ({access_log.status}) a las {access_log.timestamp.strftime('%H:%M:%S del %Y-%m-%d')}.\n"

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h3 style="color: {'#10B981' if access_log.status == 'GRANTED' else '#EF4444'};">Registro de Acceso ({escape(access_log.get_status_display())})</h3>
        <p>Hola <strong>{user_name}</strong>,</p>
        <p>Se registró un ingreso a las <strong>{access_log.timestamp.strftime('%H:%M:%S')}</strong> del día <strong>{access_log.timestamp.strftime('%d/%m/%Y')}</strong>.</p>
        {reason_info}
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888; text-align: center;">Si no reconocés esta actividad, ponete en contacto con la administración del gimnasio.</p>
    </div>
    """

    try:
        msg = EmailMultiAlternatives(subject, text_content, from_email, to_email)
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)
        return True
    except Exception as e:
        logger.error(f"Error al enviar notificación de acceso a {user.email}: {e}")
        return False


def send_membership_expiration_warning_email(user, days_left: int) -> bool:
    """
    Envía aviso preventivo de vencimiento de cuota/membresía.
    """
    if not user or not user.email:
        return False

    user_name = escape(user.first_name or user.email)
    subject = f"⚠️ Tu cuota de Winnie Gym vence en {days_left} días"
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Winnie Gym <noreply@winniegym.com>')
    to_email = [user.email]

    text_content = f"Hola {user_name},\n\nTe recordamos que tu cuota vence en {days_left} días. Acercate a la recepción para renovar tu pase.\n"

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h3 style="color: #F59E0B;">Recordatorio de Vencimiento de Cuota ⚠️</h3>
        <p>Hola <strong>{user_name}</strong>,</p>
        <p>Tu membresía actual vencerá en <strong>{days_left} días</strong>.</p>
        <p>Renová tu pase a tiempo para mantener tu acceso sin interrupciones mediante el código QR.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888; text-align: center;">Winnie Gym - Sistema de Autogestión</p>
    </div>
    """

    try:
        msg = EmailMultiAlternatives(subject, text_content, from_email, to_email)
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)
        return True
    except Exception as e:
        logger.error(f"Error al enviar correo de aviso de vencimiento a {user.email}: {e}")
        return False

