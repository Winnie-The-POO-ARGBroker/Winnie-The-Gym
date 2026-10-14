"""Tests for #182 — CierreGimnasio: blocks reservations and physical access."""
import datetime

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.access.models import AccessLog
from apps.common.models import CierreGimnasio
from conftest import (
    make_membresia_factory,
    make_plan_factory,
    make_socio_factory,
    make_user_factory,
)


def _auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _make_admin():
    return make_user_factory(rol='administrador', is_staff=True)


def _make_recep():
    return make_user_factory(rol='recepcionista')


def _make_active_socio_with_membresia():
    """Return (socio_user, socio, membresia) with a valid 30-day membership."""
    u = make_user_factory(rol='socio')
    s = make_socio_factory(u)
    p = make_plan_factory()
    m = make_membresia_factory(s, p)
    return u, s, m


# ---------------------------------------------------------------------------
# Test 1: cierre bloquea inscripción en fecha cubierta
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_cierre_bloquea_inscripcion_en_fecha_cubierta():
    """A total closure covering the next class occurrence blocks enrollment."""
    from apps.classes.models import Clase
    from apps.classes.services import inscribir_socio

    admin = _make_admin()
    u, s, m = _make_active_socio_with_membresia()

    # Create a class that happens next Monday (any weekday is fine since
    # _next_clase_datetime picks the next future occurrence).
    today = datetime.date.today()
    # Build a class for tomorrow's weekday
    tomorrow = today + datetime.timedelta(days=1)
    dia_choices = {0: 'lun', 1: 'mar', 2: 'mie', 3: 'jue', 4: 'vie', 5: 'sab', 6: 'dom'}
    dia_key_map = {'lun': 'L', 'mar': 'T', 'mie': 'W', 'jue': 'R', 'vie': 'F', 'sab': 'S', 'dom': 'U'}
    # Use a simple Clase model with dia set to tomorrow's day abbreviation
    from apps.classes.models import Clase as ClaseModel
    dia_choice_map = {
        0: ClaseModel.Dia.LUNES,
        1: ClaseModel.Dia.MARTES,
        2: ClaseModel.Dia.MIERCOLES,
        3: ClaseModel.Dia.JUEVES,
        4: ClaseModel.Dia.VIERNES,
        5: ClaseModel.Dia.SABADO,
        6: ClaseModel.Dia.DOMINGO,
    }
    clase = ClaseModel.objects.create(
        nombre='Clase cierre test',
        dia=dia_choice_map[tomorrow.weekday()],
        hora=datetime.time(10, 0),
        cupo_maximo=10,
        lista_espera_max=0,
        cancelacion_horas=2,
        estado=ClaseModel.Estado.ACTIVA,
    )

    # Create a total closure covering tomorrow
    CierreGimnasio.objects.create(
        fecha_desde=tomorrow,
        fecha_hasta=tomorrow,
        motivo='Feriado nacional',
        afecta=CierreGimnasio.Afecta.TODO,
        created_by=admin,
    )

    from rest_framework.exceptions import ValidationError
    with pytest.raises(ValidationError) as exc_info:
        inscribir_socio(clase, s)

    detail = str(exc_info.value.detail)
    assert 'cerrado' in detail.lower() or 'Feriado' in detail


# ---------------------------------------------------------------------------
# Test 2: cierre bloquea access entry
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_cierre_bloquea_access_entry():
    """A total closure active today blocks physical ENTRY via DNI scan."""
    admin = _make_admin()
    recep = _make_recep()
    u, s, m = _make_active_socio_with_membresia()

    today = datetime.date.today()
    CierreGimnasio.objects.create(
        fecha_desde=today,
        fecha_hasta=today,
        motivo='Cierre de emergencia',
        afecta=CierreGimnasio.Afecta.TODO,
        created_by=admin,
    )

    client = _auth_client(recep)
    response = client.post('/api/access/manual/', {
        'dni': s.dni,
        'access_type': AccessLog.AccessType.ENTRY,
    })

    assert response.status_code == status.HTTP_403_FORBIDDEN
    data = response.json()
    assert data['denial_reason'] == 'GYM_CERRADO'


# ---------------------------------------------------------------------------
# Test 3: CRUD admin-only — recepcionista cannot create/delete
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_cierre_crud_admin_only():
    """Only admins can create or delete CierreGimnasio; recepcionistas get 403."""
    admin = _make_admin()
    recep = _make_recep()

    today = datetime.date.today()
    payload = {
        'fecha_desde': today.isoformat(),
        'fecha_hasta': (today + datetime.timedelta(days=1)).isoformat(),
        'motivo': 'Mantenimiento anual del equipo',
        'afecta': 'todo',
    }

    # Admin can create
    admin_client = _auth_client(admin)
    response = admin_client.post('/api/config/cierres/', payload, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    cierre_id = response.json()['id']

    # Recepcionista cannot create
    recep_client = _auth_client(recep)
    response = recep_client.post('/api/config/cierres/', payload, format='json')
    assert response.status_code == status.HTTP_403_FORBIDDEN

    # Recepcionista cannot delete
    response = recep_client.delete(f'/api/config/cierres/{cierre_id}/')
    assert response.status_code == status.HTTP_403_FORBIDDEN

    # Admin can delete
    response = admin_client.delete(f'/api/config/cierres/{cierre_id}/')
    assert response.status_code == status.HTTP_204_NO_CONTENT
