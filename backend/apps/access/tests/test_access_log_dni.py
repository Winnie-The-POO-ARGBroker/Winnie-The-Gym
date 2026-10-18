"""Staff access-log rows expose the socio's DNI; export labels the type in Spanish."""
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.access.models import AccessLog
from apps.access.serializers import AccessLogSerializer, AccessLogSocioSerializer
from conftest import make_socio_factory, make_user_factory


def _client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


def _log(user, access_type=AccessLog.AccessType.ENTRY):
    return AccessLog.objects.create(
        user=user, access_type=access_type, status=AccessLog.AccessStatus.GRANTED,
    )


@pytest.mark.django_db
def test_serializer_exposes_user_dni_from_the_socio_profile():
    user = make_user_factory(rol='socio', email='dni.socio@test.com')
    make_socio_factory(user, dni='30111222')

    data = AccessLogSerializer(_log(user)).data

    assert data['user_dni'] == '30111222'


@pytest.mark.django_db
def test_serializer_user_dni_is_null_without_socio_profile():
    staff = make_user_factory(rol='recepcionista')

    data = AccessLogSerializer(_log(staff)).data

    assert data['user_dni'] is None


@pytest.mark.django_db
def test_user_dni_costs_no_extra_query_with_select_related(django_assert_num_queries):
    user = make_user_factory(rol='socio', email='dni.nq@test.com')
    make_socio_factory(user, dni='30111333')
    _log(user)
    log = AccessLog.objects.select_related('user__socio').get()

    with django_assert_num_queries(0):
        assert AccessLogSerializer().get_user_dni(log) == '30111333'


@pytest.mark.django_db
def test_socio_facing_serializer_does_not_expose_dni():
    assert 'user_dni' not in AccessLogSocioSerializer.Meta.fields


@pytest.mark.django_db
def test_list_endpoint_returns_user_dni_to_staff():
    user = make_user_factory(rol='socio', email='dni.list@test.com')
    make_socio_factory(user, dni='30111444')
    _log(user)

    admin = make_user_factory(rol='administrador')
    results = _client(admin).get('/api/access/logs/').json()['results']

    assert results[0]['user_dni'] == '30111444'


@pytest.mark.django_db
def test_export_labels_access_type_in_spanish():
    user = make_user_factory(rol='socio', email='dni.export@test.com')
    make_socio_factory(user, dni='30111555')
    _log(user, AccessLog.AccessType.ENTRY)
    _log(user, AccessLog.AccessType.EXIT)

    admin = make_user_factory(rol='administrador')
    response = _client(admin).get('/api/access/logs/export/', {'fmt': 'csv'})
    content = response.content.decode('utf-8-sig')

    assert response.status_code == 200
    assert 'Entrada' in content and 'Salida' in content
    assert 'ENTRY' not in content and 'EXIT' not in content
