import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.classes.models import Clase, InscripcionClase
from apps.members.models import Socio

User = get_user_model()

_counter = 0

LIST_URL = "/api/classes/clases/"
INSCRIPCIONES_URL = "/api/classes/inscripciones/"


def _detail_url(pk):
    return f"/api/classes/clases/{pk}/"


def _inscribir_url(pk):
    return f"/api/classes/clases/{pk}/inscribir/"


def _make_user(email=None, rol="socio", **kwargs):
    global _counter
    _counter += 1
    if email is None:
        email = f"user{_counter}@classes.test"
    return User.objects.create_user(
        email=email,
        password="pass1234!",
        rol=rol,
        **kwargs,
    )


def _make_socio(user, dni=None):
    global _counter
    _counter += 1
    if dni is None:
        dni = f"{_counter:08d}"
    return Socio.objects.create(
        usuario=user,
        dni=dni,
        nombre="Test",
        apellido="Socio",
        telefono="5491100000099",
    )


def _make_clase(**kwargs):
    defaults = dict(
        nombre="Yoga Matutino",
        categoria="yoga",
        cupo_maximo=2,
        lista_espera_max=1,
    )
    defaults.update(kwargs)
    return Clase.objects.create(**defaults)


def _authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


# ---------------------------------------------------------------------------
# ClaseViewSet — authentication guard
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_clase_list_unauthenticated_returns_401():
    client = APIClient()
    response = client.get(LIST_URL)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_clase_detail_unauthenticated_returns_401():
    clase = _make_clase()
    client = APIClient()
    response = client.get(_detail_url(clase.pk))
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# ClaseViewSet — read access (any authenticated user)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_clase_list_as_socio_returns_200():
    _make_clase()
    user = _make_user(rol="socio")
    client = _authed_client(user)
    response = client.get(LIST_URL)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) >= 1


@pytest.mark.django_db
def test_clase_list_as_recepcionista_returns_200():
    _make_clase()
    user = _make_user(rol="recepcionista")
    client = _authed_client(user)
    response = client.get(LIST_URL)
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_clase_detail_as_socio_returns_200():
    clase = _make_clase()
    user = _make_user(rol="socio")
    client = _authed_client(user)
    response = client.get(_detail_url(clase.pk))
    assert response.status_code == status.HTTP_200_OK
    assert response.data["id"] == clase.pk


# ---------------------------------------------------------------------------
# ClaseViewSet — write access (admin only)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_clase_create_as_admin_returns_201():
    admin = _make_user(rol="administrador")
    client = _authed_client(admin)
    payload = {
        "nombre": "Crossfit Tarde",
        "categoria": "crossfit",
        "cupo_maximo": 10,
        "lista_espera_max": 3,
    }
    response = client.post(LIST_URL, payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["nombre"] == "Crossfit Tarde"


@pytest.mark.django_db
def test_clase_create_as_recepcionista_returns_403():
    recep = _make_user(rol="recepcionista")
    client = _authed_client(recep)
    payload = {"nombre": "Pilates", "categoria": "pilates", "cupo_maximo": 5}
    response = client.post(LIST_URL, payload, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_clase_create_as_socio_returns_403():
    socio_user = _make_user(rol="socio")
    client = _authed_client(socio_user)
    payload = {"nombre": "Pilates", "categoria": "pilates", "cupo_maximo": 5}
    response = client.post(LIST_URL, payload, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_clase_patch_as_admin_returns_200():
    clase = _make_clase()
    admin = _make_user(rol="administrador")
    client = _authed_client(admin)
    response = client.patch(_detail_url(clase.pk), {"nombre": "Nuevo Nombre"}, format="json")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["nombre"] == "Nuevo Nombre"


@pytest.mark.django_db
def test_clase_patch_as_recepcionista_returns_403():
    clase = _make_clase()
    recep = _make_user(rol="recepcionista")
    client = _authed_client(recep)
    response = client.patch(_detail_url(clase.pk), {"nombre": "Otro"}, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_clase_patch_as_socio_returns_403():
    clase = _make_clase()
    socio_user = _make_user(rol="socio")
    client = _authed_client(socio_user)
    response = client.patch(_detail_url(clase.pk), {"nombre": "Otro"}, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_clase_delete_as_admin_returns_204():
    clase = _make_clase()
    admin = _make_user(rol="administrador")
    client = _authed_client(admin)
    response = client.delete(_detail_url(clase.pk))
    assert response.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.django_db
def test_clase_delete_as_recepcionista_returns_403():
    clase = _make_clase()
    recep = _make_user(rol="recepcionista")
    client = _authed_client(recep)
    response = client.delete(_detail_url(clase.pk))
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_clase_delete_as_socio_returns_403():
    clase = _make_clase()
    socio_user = _make_user(rol="socio")
    client = _authed_client(socio_user)
    response = client.delete(_detail_url(clase.pk))
    assert response.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# ClaseViewSet.inscribir — happy path
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_inscribir_happy_path_returns_201_not_en_espera():
    clase = _make_clase(cupo_maximo=5)
    user = _make_user(rol="socio")
    _make_socio(user)
    client = _authed_client(user)
    response = client.post(_inscribir_url(clase.pk))
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["en_espera"] is False


@pytest.mark.django_db
def test_inscribir_cupo_full_goes_to_espera_returns_201():
    clase = _make_clase(cupo_maximo=1, lista_espera_max=2)

    # Fill the only available spot
    user_first = _make_user(rol="socio")
    socio_first = _make_socio(user_first)
    InscripcionClase.objects.create(clase=clase, socio=socio_first, en_espera=False)

    # Next socio should land on waitlist
    user_second = _make_user(rol="socio")
    _make_socio(user_second)
    client = _authed_client(user_second)
    response = client.post(_inscribir_url(clase.pk))
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["en_espera"] is True


@pytest.mark.django_db
def test_inscribir_lista_espera_full_returns_400():
    clase = _make_clase(cupo_maximo=1, lista_espera_max=1)

    # Fill main spot
    user_first = _make_user(rol="socio")
    socio_first = _make_socio(user_first)
    InscripcionClase.objects.create(clase=clase, socio=socio_first, en_espera=False)

    # Fill waitlist
    user_second = _make_user(rol="socio")
    socio_second = _make_socio(user_second)
    InscripcionClase.objects.create(clase=clase, socio=socio_second, en_espera=True)

    # Third user should be rejected
    user_third = _make_user(rol="socio")
    _make_socio(user_third)
    client = _authed_client(user_third)
    response = client.post(_inscribir_url(clase.pk))
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "completas" in response.data["detail"].lower() or "completa" in response.data["detail"].lower()


@pytest.mark.django_db
def test_inscribir_already_inscribed_returns_400():
    clase = _make_clase(cupo_maximo=5)
    user = _make_user(rol="socio")
    socio = _make_socio(user)
    InscripcionClase.objects.create(clase=clase, socio=socio, en_espera=False)

    client = _authed_client(user)
    response = client.post(_inscribir_url(clase.pk))
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "inscripto" in response.data["detail"].lower()


@pytest.mark.django_db
def test_inscribir_user_without_socio_returns_400():
    clase = _make_clase()
    # admin has no linked Socio
    admin = _make_user(rol="administrador")
    client = _authed_client(admin)
    response = client.post(_inscribir_url(clase.pk))
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "socio" in response.data["detail"].lower()


@pytest.mark.django_db
def test_inscribir_unauthenticated_returns_401():
    clase = _make_clase()
    client = APIClient()
    response = client.post(_inscribir_url(clase.pk))
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# ClaseViewSet.inscribir — admin/recepcionista with socio profile can inscribe
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_inscribir_recepcionista_with_socio_profile_returns_201():
    """A recepcionista who also has a Socio record can inscribe themselves."""
    clase = _make_clase(cupo_maximo=5)
    recep = _make_user(rol="recepcionista")
    _make_socio(recep)
    client = _authed_client(recep)
    response = client.post(_inscribir_url(clase.pk))
    assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
def test_inscribir_admin_with_socio_profile_returns_201():
    """An admin who also has a Socio record can inscribe themselves."""
    clase = _make_clase(cupo_maximo=5)
    admin = _make_user(rol="administrador")
    _make_socio(admin)
    client = _authed_client(admin)
    response = client.post(_inscribir_url(clase.pk))
    assert response.status_code == status.HTTP_201_CREATED


# ---------------------------------------------------------------------------
# InscripcionClaseViewSet — permission guard
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_inscripcion_list_as_admin_returns_200():
    admin = _make_user(rol="administrador")
    client = _authed_client(admin)
    response = client.get(INSCRIPCIONES_URL)
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_inscripcion_list_as_recepcionista_returns_200():
    recep = _make_user(rol="recepcionista")
    client = _authed_client(recep)
    response = client.get(INSCRIPCIONES_URL)
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_inscripcion_list_as_socio_returns_403():
    socio_user = _make_user(rol="socio")
    client = _authed_client(socio_user)
    response = client.get(INSCRIPCIONES_URL)
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_inscripcion_list_unauthenticated_returns_401():
    client = APIClient()
    response = client.get(INSCRIPCIONES_URL)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_inscripcion_detail_as_admin_returns_200():
    clase = _make_clase()
    socio_user = _make_user(rol="socio")
    socio = _make_socio(socio_user)
    inscripcion = InscripcionClase.objects.create(clase=clase, socio=socio, en_espera=False)

    admin = _make_user(rol="administrador")
    client = _authed_client(admin)
    response = client.get(f"{INSCRIPCIONES_URL}{inscripcion.pk}/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["id"] == inscripcion.pk


@pytest.mark.django_db
def test_inscripcion_detail_as_socio_returns_403():
    clase = _make_clase()
    socio_user = _make_user(rol="socio")
    socio = _make_socio(socio_user)
    inscripcion = InscripcionClase.objects.create(clase=clase, socio=socio, en_espera=False)

    another_socio = _make_user(rol="socio")
    client = _authed_client(another_socio)
    response = client.get(f"{INSCRIPCIONES_URL}{inscripcion.pk}/")
    assert response.status_code == status.HTTP_403_FORBIDDEN
