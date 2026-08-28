import pytest
from datetime import date
from apps.members.services import dar_baja
from apps.members.models import Socio


@pytest.mark.django_db
def test_dar_baja_sets_estado_baja(make_socio):
    socio = make_socio()
    result = dar_baja(socio)
    socio.refresh_from_db()
    assert socio.estado == Socio.Estado.BAJA
    assert socio.fecha_baja == date.today()
    assert result == socio


@pytest.mark.django_db
def test_dar_baja_idempotent(make_socio):
    socio = make_socio()
    dar_baja(socio)
    result = dar_baja(socio)  # calling twice should not raise
    result.refresh_from_db()
    assert result.estado == Socio.Estado.BAJA
