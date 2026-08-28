import pytest
from datetime import time
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


@pytest.mark.django_db
def test_inscribir_exitoso(clase, make_socio):
    socio = make_socio()
    inscripcion = inscribir_socio(clase, socio)
    assert inscripcion.en_espera is False
    assert inscripcion.socio == socio
    assert inscripcion.clase == clase


@pytest.mark.django_db
def test_inscribir_en_espera_cuando_cupo_lleno(clase, make_socio):
    for _ in range(2):  # fill cupo_maximo=2
        inscribir_socio(clase, make_socio())
    socio = make_socio()
    inscripcion = inscribir_socio(clase, socio)
    assert inscripcion.en_espera is True


@pytest.mark.django_db
def test_inscribir_raise_cuando_todo_lleno(clase, make_socio):
    for _ in range(2):  # fill cupo
        inscribir_socio(clase, make_socio())
    inscribir_socio(clase, make_socio())  # fill espera (lista_espera_max=1)
    with pytest.raises(ValidationError) as exc_info:
        inscribir_socio(clase, make_socio())
    assert 'completas' in str(exc_info.value.detail['detail'])


@pytest.mark.django_db
def test_inscribir_raise_si_ya_inscripto(clase, make_socio):
    socio = make_socio()
    inscribir_socio(clase, socio)
    with pytest.raises(ValidationError) as exc_info:
        inscribir_socio(clase, socio)
    assert 'inscripto' in str(exc_info.value.detail['detail'])


@pytest.mark.django_db
def test_inscribir_crea_registro_en_db(clase, make_socio):
    socio = make_socio()
    inscribir_socio(clase, socio)
    assert InscripcionClase.objects.filter(clase=clase, socio=socio).exists()
