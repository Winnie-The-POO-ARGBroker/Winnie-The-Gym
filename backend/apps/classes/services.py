import datetime as dt
from datetime import datetime, timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.common.tasks import enqueue_email

from .models import Clase, InscripcionClase, SesionClase


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

DIA_TO_WEEKDAY = {
    Clase.Dia.LUNES: 0,
    Clase.Dia.MARTES: 1,
    Clase.Dia.MIERCOLES: 2,
    Clase.Dia.JUEVES: 3,
    Clase.Dia.VIERNES: 4,
    Clase.Dia.SABADO: 5,
    Clase.Dia.DOMINGO: 6,
}

# The frontend stores `dias_recurrencia` as one-letter codes (L M X J V S D), while
# `Clase.dia` uses the full day names. Both spellings are accepted everywhere a
# schedule is expanded; ignoring the letters left every recurring class created
# from the panel without sessions.
LETRA_TO_WEEKDAY = {'L': 0, 'M': 1, 'X': 2, 'J': 3, 'V': 4, 'S': 5, 'D': 6}

# Sessions are generated for the next 60 days when a class is saved and by the
# daily beat job, so the calendar always has them ahead of time.
SESIONES_VENTANA_DIAS = 60


def weekdays_of(clase):
    """Weekday numbers (Monday=0) on which `clase` runs."""
    dias = clase.dias_recurrencia or []
    weekdays = set()
    for dia in dias:
        if dia in LETRA_TO_WEEKDAY:
            weekdays.add(LETRA_TO_WEEKDAY[dia])
        elif dia in DIA_TO_WEEKDAY:
            weekdays.add(DIA_TO_WEEKDAY[dia])
    if weekdays:
        return weekdays
    return {DIA_TO_WEEKDAY[clase.dia]}


def _next_clase_datetime(clase):
    """Return the next scheduled datetime for a recurring class in local tz.

    When `dias_recurrencia` is populated (list of Dia values), the next
    occurrence is the soonest weekday from that list that is strictly after
    now. Falls back to the single `clase.dia` field when the list is empty.
    """
    now = timezone.localtime()

    target_weekdays = sorted(weekdays_of(clase))

    best_candidate = None
    for target_weekday in target_weekdays:
        days_ahead = (target_weekday - now.weekday()) % 7
        candidate = now.replace(hour=clase.hora.hour, minute=clase.hora.minute, second=0, microsecond=0)
        candidate = candidate + timedelta(days=days_ahead)
        if candidate <= now:
            candidate = candidate + timedelta(days=7)
        if best_candidate is None or candidate < best_candidate:
            best_candidate = candidate

    return best_candidate


# ---------------------------------------------------------------------------
# Wait-list promotion (atomic, reused by all 4 paths)
# ---------------------------------------------------------------------------

def promover_de_espera(clase):
    """Promote the oldest wait-listed socio to confirmed, if any slot is free.

    Must be called inside an existing ``transaction.atomic()`` block that already
    holds a ``select_for_update`` lock on the Clase row, OR it acquires its own
    lock when called as a standalone operation.

    Sends a promotion email via ``transaction.on_commit`` so the email is only
    dispatched after the transaction successfully commits.

    Returns:
        The promoted InscripcionClase instance, or None when nobody was promoted.
    """
    with transaction.atomic():
        locked_clase = Clase.objects.select_for_update().get(pk=clase.pk)

        cupos_ocupados = locked_clase.inscripciones.filter(en_espera=False).count()
        if cupos_ocupados >= locked_clase.cupo_maximo:
            return None

        next_in_line = (
            InscripcionClase.objects
            .select_related('socio__usuario')
            .filter(clase=locked_clase, en_espera=True)
            .order_by('created_at')
            .first()
        )
        if next_in_line is None:
            return None

        next_in_line.en_espera = False
        next_in_line.save(update_fields=['en_espera', 'updated_at'])

        # Capture values for the closure before the transaction commits.
        socio = next_in_line.socio
        user = getattr(socio, 'usuario', None)
        email = getattr(user, 'email', None) if user else None

        if email:
            _email = email
            _socio = socio
            _clase = locked_clase

            def _send():
                enqueue_email(
                    template_base='promocion_espera',
                    subject=f'¡Fuiste promovido! Tenés lugar en {_clase.nombre}',
                    to=[_email],
                    context={
                        'nombre': _socio.nombre,
                        'apellido': _socio.apellido,
                        'clase_nombre': _clase.nombre,
                        'clase_dia': _clase.get_dia_display(),
                        'clase_hora': _clase.hora.strftime('%H:%M'),
                    },
                    category='promocion_espera',
                )
            transaction.on_commit(_send)

    return next_in_line


# ---------------------------------------------------------------------------
# Clase cancellation / reactivation
# ---------------------------------------------------------------------------

def cancelar_clase(clase, motivo, actor=None):
    """Soft-cancel a Clase and notify all enrolled socios.

    Transitions ``activa → cancelada`` exactly once. Subsequent saves do NOT
    re-send emails because the signal compares previous state.

    Saves ``cancelada_por``, ``fecha_cancelacion``, ``motivo_cancelacion``.

    Returns:
        dict with ``confirmados_notificados`` and ``espera_notificados`` counts.

    Raises:
        ValidationError: if already cancelled or motivo < 10 chars.
    """
    if clase.estado == Clase.Estado.CANCELADA:
        raise ValidationError({'detail': 'La clase ya está cancelada.'})
    if len((motivo or '').strip()) < 10:
        raise ValidationError({'motivo': 'El motivo debe tener al menos 10 caracteres.'})

    clase.estado = Clase.Estado.CANCELADA
    clase.fecha_cancelacion = timezone.now()
    clase.motivo_cancelacion = motivo.strip()
    clase.cancelada_por = actor
    clase.save(update_fields=['estado', 'fecha_cancelacion', 'motivo_cancelacion', 'cancelada_por'])

    # Count notified (signal fires after save, returns these counts for the view)
    confirmados = clase.inscripciones.filter(en_espera=False).count()
    espera = clase.inscripciones.filter(en_espera=True).count()
    return {
        'confirmados_notificados': confirmados,
        'espera_notificados': espera,
    }


def reactivar_clase(clase):
    """Reactivate a cancelled class back to 'activa'.

    Raises:
        ValidationError: if the class is not currently cancelled.
    """
    if clase.estado != Clase.Estado.CANCELADA:
        raise ValidationError({'detail': 'Solo se pueden reactivar clases canceladas.'})

    clase.estado = Clase.Estado.ACTIVA
    clase.fecha_cancelacion = None
    clase.motivo_cancelacion = ''
    clase.cancelada_por = None
    clase.save(update_fields=['estado', 'fecha_cancelacion', 'motivo_cancelacion', 'cancelada_por'])


# ---------------------------------------------------------------------------
# Socio enrollment
# ---------------------------------------------------------------------------

def _plan_habilitado(plan, planes_habilitados):
    """Whether `plan` is in a class's `planes_habilitados`.

    The UI, the API and the demo catalog store plan NAMES; older data may hold plan
    ids. Names are compared ignoring case and surrounding spaces. Comparing only the
    id rejected every member of every class that listed any plan.
    """
    nombre = (plan.nombre or '').strip().casefold()
    for habilitado in planes_habilitados:
        if isinstance(habilitado, int) and not isinstance(habilitado, bool):
            if habilitado == plan.pk:
                return True
        elif str(habilitado).strip().casefold() == nombre:
            return True
    return False


def inscribir_socio(clase, socio, *, forzar=False):
    """Enroll a socio in a clase, placing them on the wait-list when cupo is full.

    Validates:
      1. Class is active (not 'cancelada' or 'finalizada').
      2. Socio is active (not 'baja' or 'suspendido').
      3. Socio has an active membership with fecha_inicio <= today <= fecha_fin.
      4. If clase.planes_habilitados is non-empty: socio's plan must be in the list.
      5. Concurrency-safe cupo check via select_for_update inside atomic transaction.
      6. forzar=True (admin only) allows overcapacity enrollment.

    Raises:
        ValidationError: for any of the above validation failures, or when both
                         cupo and lista de espera are at capacity.

    Returns:
        The newly created InscripcionClase instance.
    """
    from datetime import date
    from apps.common.models import CierreGimnasio  # noqa: PLC0415
    from apps.memberships.models import Membresia  # noqa: PLC0415

    # 1. Class must be active
    if clase.estado in (Clase.Estado.CANCELADA, Clase.Estado.FINALIZADA):
        raise ValidationError({'detail': 'No podés inscribirte en una clase cancelada o finalizada.'})

    # 1b. #182 — Gym closure check: deny if a total closure covers the next class occurrence.
    next_dt = _next_clase_datetime(clase)
    if next_dt is not None:
        next_date = next_dt.date()
        cierre = (
            CierreGimnasio.objects
            .filter(
                afecta=CierreGimnasio.Afecta.TODO,
                fecha_desde__lte=next_date,
                fecha_hasta__gte=next_date,
            )
            .first()
        )
        if cierre is None:
            # Also check sala-specific closure if clase has a sala FK (#179 sala_fk)
            sala_fk = getattr(clase, 'sala_fk', None)
            if sala_fk is not None:
                cierre = (
                    CierreGimnasio.objects
                    .filter(
                        afecta=CierreGimnasio.Afecta.SALA,
                        sala=sala_fk,
                        fecha_desde__lte=next_date,
                        fecha_hasta__gte=next_date,
                    )
                    .first()
                )
        if cierre is not None:
            raise ValidationError({
                'detail': f'El gimnasio está cerrado en esa fecha: {cierre.motivo}',
            })

    # 2. Socio must be active
    if socio.estado in ('baja', 'suspendido'):
        raise ValidationError({'detail': 'Tu cuenta de socio no está activa.'})

    # 3. Active membership with valid dates
    today = date.today()
    membresia = (
        Membresia.objects
        .filter(socio=socio, estado=Membresia.Estado.ACTIVA)
        .select_related('plan')
        .order_by('-fecha_fin')
        .first()
    )
    if membresia is None or not (membresia.fecha_inicio <= today <= membresia.fecha_fin):
        raise ValidationError({'detail': 'No tenés una membresía activa vigente.'})

    # 4. Plan filter — empty list means all plans allowed
    planes_habilitados = clase.planes_habilitados or []
    if planes_habilitados:
        plan = membresia.plan
        if not _plan_habilitado(plan, planes_habilitados):
            raise ValidationError({
                'detail': f'Tu plan ({plan.nombre}) no incluye esta clase.',
            })

    # 5. Duplicate check + concurrency-safe cupo enforcement
    if InscripcionClase.objects.filter(clase=clase, socio=socio).exists():
        raise ValidationError({'detail': 'Ya estás inscripto en esta clase.'})

    with transaction.atomic():
        # Lock the Clase row to serialize concurrent inscriptions
        locked_clase = Clase.objects.select_for_update().get(pk=clase.pk)

        cupos_ocupados = locked_clase.inscripciones.filter(en_espera=False).count()
        cupo_lleno = cupos_ocupados >= locked_clase.cupo_maximo

        if cupo_lleno and forzar:
            en_espera = False
        elif cupo_lleno:
            en_lista = locked_clase.inscripciones.filter(en_espera=True).count()
            if locked_clase.lista_espera_max == 0:
                raise ValidationError({'detail': 'Esta clase no tiene lista de espera.'})
            if en_lista >= locked_clase.lista_espera_max:
                raise ValidationError({'detail': 'La clase y su lista de espera están completas.'})
            en_espera = True
        else:
            en_espera = False

        return InscripcionClase.objects.create(
            clase=locked_clase,
            socio=socio,
            en_espera=en_espera,
        )


# ---------------------------------------------------------------------------
# Socio inscription cancellation
# ---------------------------------------------------------------------------

def cancelar_inscripcion(clase, socio):
    """Cancel a socio's enrollment.

    Enforces the class's ``cancelacion_horas`` cut-off window.
    Calls ``promover_de_espera`` inside the delete transaction when a confirmed
    slot is freed, so promotion and email happen atomically.

    Raises:
        ValidationError: when the socio is not enrolled or the cancellation
                         happens inside the cut-off window.

    Returns:
        True if a wait-listed socio was promoted to a confirmed slot, else False.
    """
    try:
        inscripcion = InscripcionClase.objects.get(clase=clase, socio=socio)
    except InscripcionClase.DoesNotExist:
        raise ValidationError({'detail': 'No tenés una inscripción vigente en esta clase.'})

    next_start = _next_clase_datetime(clase)
    cutoff = next_start - timedelta(hours=clase.cancelacion_horas)
    if timezone.localtime() > cutoff:
        raise ValidationError({
            'detail': (
                f'Fuera del margen para cancelar. El límite es '
                f'{clase.cancelacion_horas} horas antes del inicio.'
            ),
        })

    was_confirmed = not inscripcion.en_espera

    with transaction.atomic():
        inscripcion.delete()

        if not was_confirmed:
            return False

        promovido = promover_de_espera(clase)
        return promovido is not None


def eliminar_inscripcion(inscripcion):
    """Staff-only hard-delete of an enrollment.

    When a confirmed slot is freed, promotes the oldest wait-listed socio.

    Returns:
        True if a wait-listed socio was promoted, else False.
    """
    was_confirmed = not inscripcion.en_espera
    clase = inscripcion.clase

    with transaction.atomic():
        inscripcion.delete()

        if not was_confirmed:
            return False

        promovido = promover_de_espera(clase)
        return promovido is not None


# ---------------------------------------------------------------------------
# #178 — SesionClase services
# ---------------------------------------------------------------------------

def generar_sesiones(clase, desde, hasta):
    """Create SesionClase rows for each matching weekday between desde and hasta.

    Uses select_for_update + atomic to prevent duplicate rows under concurrency.
    Already-existing rows are skipped (idempotent).

    Args:
        clase: Clase instance.
        desde: date — start of the window (inclusive).
        hasta: date — end of the window (inclusive).

    Returns:
        int — number of new SesionClase rows created.
    """
    target_weekdays = weekdays_of(clase)

    # Collect all candidate dates in the window that match the target weekdays
    candidate_dates = []
    current = desde
    while current <= hasta:
        if current.weekday() in target_weekdays:
            candidate_dates.append(current)
        current += dt.timedelta(days=1)

    created_count = 0

    with transaction.atomic():
        # Lock the Clase row to prevent concurrent duplicates
        Clase.objects.select_for_update().get(pk=clase.pk)

        for fecha in candidate_dates:
            _, created = SesionClase.objects.get_or_create(
                clase=clase,
                fecha=fecha,
                defaults={'estado': SesionClase.Estado.ACTIVA},
            )
            if created:
                created_count += 1

    return created_count


def generar_sesiones_ventana(clase, hasta=None):
    """Generate sessions from today up to `hasta` (default: the standard window)."""
    hoy = timezone.localdate()
    return generar_sesiones(clase, hoy, hasta or hoy + timedelta(days=SESIONES_VENTANA_DIAS))


def cancelar_sesion(sesion, motivo, actor=None):
    """Cancel a single SesionClase occurrence without touching the series.

    Raises:
        ValidationError: if already cancelled or motivo < 10 chars.

    Returns:
        The updated SesionClase instance.
    """
    if sesion.estado == SesionClase.Estado.CANCELADA:
        raise ValidationError({'detail': 'La sesión ya está cancelada.'})
    if len((motivo or '').strip()) < 10:
        raise ValidationError({'motivo': 'El motivo debe tener al menos 10 caracteres.'})

    sesion.estado = SesionClase.Estado.CANCELADA
    sesion.motivo_cancelacion = motivo.strip()
    sesion.cancelada_por = actor
    sesion.fecha_cancelacion = timezone.now()
    sesion.save(update_fields=[
        'estado', 'motivo_cancelacion', 'cancelada_por', 'fecha_cancelacion',
    ])
    return sesion


def editar_serie(clase, cambios, alcance, fecha_pivote=None):
    """Edit a recurring class series with configurable scope.

    Args:
        clase: Clase instance — the template class being edited.
        cambios: dict of field → new value to apply.
        alcance: one of 'solo_esta' | 'esta_y_siguientes' | 'toda'.
        fecha_pivote: date — required for 'solo_esta' and 'esta_y_siguientes'.

    Alcance semantics:
        'solo_esta': apply cambios as override fields on the SesionClase
            for fecha_pivote (creates it if not present).
        'esta_y_siguientes': create a new Clase clone with cambios applied,
            re-assign future SesionClase rows (>= fecha_pivote) to the new clone.
        'toda': apply cambios directly to the Clase (legacy full-series edit).

    Returns:
        dict with keys 'alcance', 'clase_id', and optionally 'nueva_clase_id'.

    Raises:
        ValidationError: on invalid alcance or missing fecha_pivote.
    """
    VALID_ALCANCES = {'solo_esta', 'esta_y_siguientes', 'toda'}
    if alcance not in VALID_ALCANCES:
        raise ValidationError({'alcance': f'Valor inválido. Opciones: {", ".join(VALID_ALCANCES)}.'})

    if alcance in ('solo_esta', 'esta_y_siguientes') and fecha_pivote is None:
        raise ValidationError({'fecha_pivote': 'Se requiere fecha_pivote para este alcance.'})

    # Field → SesionClase override attribute mapping
    OVERRIDE_MAP = {
        'hora': 'hora_override',
        'cupo_maximo': 'cupo_override',
        'instructor_fk': 'instructor_override_fk',
    }

    with transaction.atomic():
        if alcance == 'solo_esta':
            sesion, _ = SesionClase.objects.get_or_create(
                clase=clase,
                fecha=fecha_pivote,
                defaults={'estado': SesionClase.Estado.ACTIVA},
            )
            update_fields = []
            for campo, valor in cambios.items():
                override_attr = OVERRIDE_MAP.get(campo)
                if override_attr:
                    setattr(sesion, override_attr, valor)
                    update_fields.append(override_attr)
            if update_fields:
                update_fields.append('updated_at')
                sesion.save(update_fields=update_fields)
            return {'alcance': alcance, 'clase_id': clase.pk}

        elif alcance == 'esta_y_siguientes':
            # Clone the Clase applying the changes
            nueva_clase = Clase.objects.get(pk=clase.pk)
            nueva_clase.pk = None  # force INSERT
            nueva_clase.id = None
            for campo, valor in cambios.items():
                setattr(nueva_clase, campo, valor)
            nueva_clase.save()

            # Re-assign future sesiones to the new clase
            SesionClase.objects.filter(
                clase=clase,
                fecha__gte=fecha_pivote,
                estado=SesionClase.Estado.ACTIVA,
            ).update(clase=nueva_clase)

            return {
                'alcance': alcance,
                'clase_id': clase.pk,
                'nueva_clase_id': nueva_clase.pk,
            }

        else:  # 'toda'
            for campo, valor in cambios.items():
                setattr(clase, campo, valor)
            clase.save()
            return {'alcance': alcance, 'clase_id': clase.pk}
