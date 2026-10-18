"""Celery tasks for classes app.

cerrar_asistencias_vencidas: runs every hour via Celery beat.
Marks all inscriptions in classes that ended more than 3 hours ago
as absent (asistio=False) when they are still unregistered (asistio IS NULL).

generate_sesiones_rolling_window (#178): runs daily via Celery beat.
Ensures SesionClase rows exist for all active clases in the next 60 days.
"""
import datetime
import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name='classes.cerrar_asistencias_vencidas')
def cerrar_asistencias_vencidas():
    """Close attendance for all classes whose end time passed more than 3 hours ago.

    Idempotent: calling it multiple times on the same class is safe because
    ``cerrar_asistencia`` only updates rows where asistio IS NULL.

    Returns a summary dict with ``clases_procesadas`` and ``ausencias_registradas``.
    """
    from apps.classes.models import Clase, InscripcionClase  # noqa: PLC0415
    import datetime

    now = timezone.localtime()
    cutoff = now - datetime.timedelta(hours=3)

    # Find classes whose scheduled end (hora + duracion_min) is before the cutoff.
    # We compare on (hora, duracion_min) without a computed column, so we fetch
    # candidate classes (all active/finalizada with hora <= cutoff.time()) and
    # filter in Python. This is acceptable because the table is small.
    candidate_classes = Clase.objects.filter(
        estado__in=[Clase.Estado.ACTIVA, Clase.Estado.FINALIZADA],
    ).only('id', 'hora', 'duracion_min')

    clases_procesadas = 0
    ausencias_registradas = 0

    for clase in candidate_classes:
        # Compute end time (may cross midnight — keep it simple: compare on same day)
        hora_fin_minutes = clase.hora.hour * 60 + clase.hora.minute + clase.duracion_min
        hora_fin_hour = (hora_fin_minutes // 60) % 24
        hora_fin_min_part = hora_fin_minutes % 60
        hora_fin = datetime.time(hora_fin_hour, hora_fin_min_part)

        # Build the end datetime for today's scheduled slot
        clase_date = now.date()
        try:
            import zoneinfo
            tz = zoneinfo.ZoneInfo('America/Argentina/Buenos_Aires')
            end_dt = timezone.make_aware(
                timezone.datetime.combine(clase_date, hora_fin), tz
            )
        except Exception:
            end_dt = timezone.datetime.combine(clase_date, hora_fin)
            if timezone.is_naive(end_dt):
                end_dt = timezone.make_aware(end_dt)

        if end_dt > cutoff:
            continue

        # Mark unregistered inscriptions as absent
        updated = (
            InscripcionClase.objects
            .filter(clase=clase, asistio__isnull=True, en_espera=False)
            .update(asistio=False)
        )
        if updated > 0:
            clases_procesadas += 1
            ausencias_registradas += updated
            logger.info(
                'cerrar_asistencias_vencidas: clase=%s updated=%d absences',
                clase.pk, updated,
            )

    logger.info(
        'cerrar_asistencias_vencidas done: clases=%d ausencias=%d',
        clases_procesadas, ausencias_registradas,
    )
    return {
        'clases_procesadas': clases_procesadas,
        'ausencias_registradas': ausencias_registradas,
    }


@shared_task(name='classes.generate_sesiones_rolling_window')
def generate_sesiones_rolling_window():
    """#178 — Ensure SesionClase rows exist for all active clases in the next 60 days.

    Idempotent: get_or_create prevents duplicates.
    Runs daily via Celery beat.

    Returns a summary dict with ``clases_procesadas`` and ``sesiones_creadas``.
    """
    from apps.classes.models import Clase  # noqa: PLC0415
    from apps.classes.services import SESIONES_VENTANA_DIAS, generar_sesiones  # noqa: PLC0415

    today = timezone.localdate()
    hasta = today + datetime.timedelta(days=SESIONES_VENTANA_DIAS)

    clases_activas = Clase.objects.filter(estado=Clase.Estado.ACTIVA).only(
        'id', 'dia', 'dias_recurrencia', 'hora', 'cupo_maximo',
    )

    clases_procesadas = 0
    sesiones_creadas = 0

    for clase in clases_activas:
        try:
            creadas = generar_sesiones(clase, today, hasta)
            sesiones_creadas += creadas
            clases_procesadas += 1
        except Exception:
            logger.exception(
                'generate_sesiones_rolling_window: error processing clase=%s',
                clase.pk,
            )

    logger.info(
        'generate_sesiones_rolling_window done: clases=%d sesiones=%d',
        clases_procesadas, sesiones_creadas,
    )
    return {
        'clases_procesadas': clases_procesadas,
        'sesiones_creadas': sesiones_creadas,
    }
