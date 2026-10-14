import pytest
from datetime import date, time, timedelta
from rest_framework.exceptions import ValidationError
from apps.classes.services import inscribir_socio
from apps.classes.models import Clase, InscripcionClase


@pytest.fixture
def clase(db):
    return Clase.objects.create(
        nombre='Test Class',
        dia=Clase.Dia.LUNES,
        hora=time(8, 0),
        duracion_min=60,
        cupo_maximo=2,
        lista_espera_max=1,
        estado=Clase.Estado.ACTIVA,
        categoria=Clase.Categoria.FUNCIONAL,
    )


@pytest.fixture
def socio_con_membresia(make_socio, make_plan, make_membresia):
    """Factory that produces a socio with an active membership."""
    def _make(**kwargs):
        socio = make_socio(estado='activo', **kwargs)
        plan = make_plan()
        make_membresia(
            socio=socio,
            plan=plan,
            fecha_inicio=date.today(),
            fecha_fin=date.today() + timedelta(days=30),
            estado='activa',
        )
        return socio
    return _make


@pytest.mark.django_db
def test_inscribir_exitoso(clase, socio_con_membresia):
    socio = socio_con_membresia()
    inscripcion = inscribir_socio(clase, socio)
    assert inscripcion.en_espera is False
    assert inscripcion.socio == socio
    assert inscripcion.clase == clase


@pytest.mark.django_db
def test_inscribir_en_espera_cuando_cupo_lleno(clase, socio_con_membresia):
    for _ in range(2):  # fill cupo_maximo=2
        inscribir_socio(clase, socio_con_membresia())
    socio = socio_con_membresia()
    inscripcion = inscribir_socio(clase, socio)
    assert inscripcion.en_espera is True


@pytest.mark.django_db
def test_inscribir_raise_cuando_todo_lleno(clase, socio_con_membresia):
    for _ in range(2):  # fill cupo
        inscribir_socio(clase, socio_con_membresia())
    inscribir_socio(clase, socio_con_membresia())  # fill espera (lista_espera_max=1)
    with pytest.raises(ValidationError) as exc_info:
        inscribir_socio(clase, socio_con_membresia())
    assert 'completas' in str(exc_info.value.detail['detail'])


@pytest.mark.django_db
def test_inscribir_raise_si_ya_inscripto(clase, socio_con_membresia):
    socio = socio_con_membresia()
    inscribir_socio(clase, socio)
    with pytest.raises(ValidationError) as exc_info:
        inscribir_socio(clase, socio)
    assert 'inscripto' in str(exc_info.value.detail['detail'])


@pytest.mark.django_db
def test_inscribir_crea_registro_en_db(clase, socio_con_membresia):
    socio = socio_con_membresia()
    inscribir_socio(clase, socio)
    assert InscripcionClase.objects.filter(clase=clase, socio=socio).exists()
