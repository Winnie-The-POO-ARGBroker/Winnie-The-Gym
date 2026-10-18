"""List endpoints used by "show everything" screens honour ?page_size= (DRF default is 10)."""
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.classes.views import DisciplinaViewSet, InstructorViewSet, SalaViewSet
from apps.common.pagination import PageSizePagination
from apps.common.views import CierreGimnasioViewSet
from apps.memberships.views import MembresiaViewSet
from apps.payments.views import PagoViewSet
from apps.users.views import StaffView
from conftest import make_user_factory


def _client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


def test_paginator_defaults_and_cap():
    paginator = PageSizePagination()

    assert paginator.page_size == 10
    assert paginator.page_size_query_param == 'page_size'
    assert paginator.max_page_size == 1000


@pytest.mark.parametrize('view', [
    PagoViewSet, MembresiaViewSet, StaffView, InstructorViewSet,
    DisciplinaViewSet, SalaViewSet, CierreGimnasioViewSet,
])
def test_list_views_use_the_page_size_paginator(view):
    assert view.pagination_class is PageSizePagination


@pytest.mark.django_db
def test_staff_list_honours_page_size():
    admin = make_user_factory(rol='administrador')
    for i in range(12):
        make_user_factory(rol='recepcionista', email=f'recep{i}@gym.test')
    client = _client(admin)

    default = client.get('/api/users/staff/').json()
    full = client.get('/api/users/staff/', {'page_size': 1000}).json()

    assert len(default['results']) == 10
    assert default['count'] == 13
    assert len(full['results']) == 13
