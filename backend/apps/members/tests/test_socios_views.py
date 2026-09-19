import datetime

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from conftest import make_socio_factory, make_user_factory


def _auth_client(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


SOCIOS_URL = '/api/members/socios/'


def _detail_url(pk):
    return f'/api/members/socios/{pk}/'


def _baja_url(pk):
    return f'/api/members/socios/{pk}/dar-baja/'


class SocioListCreateTests(APITestCase):

    def test_list_socios_admin_200(self):
        admin = make_user_factory(rol='administrador')
        user = make_user_factory()
        make_socio_factory(usuario=user)
        _auth_client(self.client, admin)

        response = self.client.get(SOCIOS_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        if isinstance(data, dict):
            data = data.get('results', data)
        self.assertGreater(len(data), 0)
        first = data[0]
        for field in ('id', 'numero_socio', 'nombre', 'apellido', 'dni', 'estado'):
            self.assertIn(field, first)

    def test_list_socios_recep_200(self):
        recep = make_user_factory(rol='recepcionista')
        _auth_client(self.client, recep)

        response = self.client.get(SOCIOS_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_socio_admin_201(self):
        admin = make_user_factory(rol='administrador')
        target_user = make_user_factory()
        _auth_client(self.client, admin)

        payload = {
            'usuario': target_user.pk,
            'dni': '99887766',
            'nombre': 'Carlos',
            'apellido': 'Ruiz',
            'telefono': '5491100000002',
        }
        response = self.client.post(SOCIOS_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertRegex(response.data['numero_socio'], r'^S-\d{5}$')
        self.assertEqual(response.data['estado'], 'activo')

    def test_create_socio_duplicate_dni_400(self):
        admin = make_user_factory(rol='administrador')
        existing_user = make_user_factory()
        make_socio_factory(usuario=existing_user, dni='11223344')
        new_user = make_user_factory()
        _auth_client(self.client, admin)

        payload = {
            'usuario': new_user.pk,
            'dni': '11223344',
            'nombre': 'Pedro',
            'apellido': 'Sanchez',
            'telefono': '5491100000003',
        }
        response = self.client.post(SOCIOS_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('dni', response.data)

    def test_unauthenticated_list_401(self):
        response = self.client.get(SOCIOS_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_socio_role_list_403(self):
        socio_user = make_user_factory(rol='socio')
        _auth_client(self.client, socio_user)

        response = self.client.get(SOCIOS_URL)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_socio_role_create_403(self):
        socio_user = make_user_factory(rol='socio')
        other_user = make_user_factory()
        _auth_client(self.client, socio_user)

        payload = {
            'usuario': other_user.pk,
            'dni': '55667788',
            'nombre': 'Pedro',
            'apellido': 'Perez',
            'telefono': '5491100000004',
        }
        response = self.client.post(SOCIOS_URL, payload)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class SocioRetrieveUpdateTests(APITestCase):

    def test_retrieve_socio_200(self):
        admin = make_user_factory(rol='administrador')
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)
        _auth_client(self.client, admin)

        response = self.client.get(_detail_url(socio.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], socio.pk)

    def test_retrieve_nonexistent_404(self):
        admin = make_user_factory(rol='administrador')
        _auth_client(self.client, admin)

        response = self.client.get(_detail_url(99999))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_partial_update_observaciones_200(self):
        admin = make_user_factory(rol='administrador')
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)
        original_numero = socio.numero_socio
        _auth_client(self.client, admin)

        response = self.client.patch(_detail_url(socio.pk), {'observaciones': 'Nota importante'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['observaciones'], 'Nota importante')
        self.assertEqual(response.data['numero_socio'], original_numero)

    def test_partial_update_numero_socio_ignored(self):
        admin = make_user_factory(rol='administrador')
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)
        original_numero = socio.numero_socio
        _auth_client(self.client, admin)

        response = self.client.patch(_detail_url(socio.pk), {'numero_socio': 'S-99999'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['numero_socio'], original_numero)

    def test_create_socio_without_usuario_auto_creates_user(self):
        admin = make_user_factory(rol='administrador')
        _auth_client(self.client, admin)

        payload = {
            'dni': '77889900',
            'nombre': 'Lautaro',
            'apellido': 'Gomez',
            'telefono': '5491122334455',
            'email': 'lautaro.gomez@test.com',
        }
        response = self.client.post(SOCIOS_URL, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['dni'], '77889900')
        self.assertRegex(response.data['numero_socio'], r'^S-\d{5}$')

        from apps.users.models import User
        created_user = User.objects.get(email='lautaro.gomez@test.com')
        self.assertEqual(created_user.rol, User.Rol.SOCIO)
        self.assertEqual(created_user.socio.dni, '77889900')

    def test_create_socio_duplicate_dni_returns_400(self):
        admin = make_user_factory(rol='administrador')
        _auth_client(self.client, admin)

        payload = {
            'dni': '55667788',
            'nombre': 'Carlos',
            'apellido': 'Perez',
            'telefono': '5491122334455',
        }
        res1 = self.client.post(SOCIOS_URL, payload)
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Attempt to create another socio with identical DNI
        res2 = self.client.post(SOCIOS_URL, payload)
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('dni', res2.data)

    def test_create_socio_with_staff_email_returns_400(self):
        admin = make_user_factory(rol='administrador', email='staff.recep@winniegym.com')
        _auth_client(self.client, admin)

        payload = {
            'dni': '99887766',
            'nombre': 'Marina',
            'apellido': 'Lopez',
            'telefono': '5491122334455',
            'email': 'staff.recep@winniegym.com',
        }
        response = self.client.post(SOCIOS_URL, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_socio_model_save_syncs_fecha_baja_invariant(self):
        user = make_user_factory()
        socio = make_socio_factory(usuario=user, estado='activo')
        self.assertIsNone(socio.fecha_baja)

        # Mutate directly on model
        socio.estado = 'baja'
        socio.save()
        socio.refresh_from_db()
        self.assertEqual(socio.fecha_baja, datetime.date.today())

        # Reactivate on model
        socio.estado = 'activo'
        socio.save()
        socio.refresh_from_db()
        self.assertIsNone(socio.fecha_baja)

    def test_partial_update_estado_baja_sets_fecha_baja_and_revert(self):
        admin = make_user_factory(rol='administrador')
        user = make_user_factory()
        socio = make_socio_factory(usuario=user, estado='activo')
        _auth_client(self.client, admin)

        # Update to baja
        res = self.client.patch(_detail_url(socio.pk), {'estado': 'baja'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['estado'], 'baja')
        self.assertEqual(res.data['fecha_baja'], datetime.date.today().isoformat())

        # Revert to activo
        res2 = self.client.patch(_detail_url(socio.pk), {'estado': 'activo'})
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['estado'], 'activo')
        self.assertIsNone(res2.data['fecha_baja'])


class SocioDarBajaTests(APITestCase):

    def test_dar_baja_activo_200(self):
        admin = make_user_factory(rol='administrador')
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)
        _auth_client(self.client, admin)

        response = self.client.post(_baja_url(socio.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['estado'], 'baja')
        today = datetime.date.today().isoformat()
        self.assertEqual(response.data['fecha_baja'], today)
        # User account must remain active
        user.refresh_from_db()
        self.assertTrue(user.is_active)

    def test_dar_baja_already_baja_400(self):
        admin = make_user_factory(rol='administrador')
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)
        socio.estado = 'baja'
        socio.save()
        _auth_client(self.client, admin)

        response = self.client.post(_baja_url(socio.pk))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_dar_baja_unauthenticated_401(self):
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)

        response = self.client.post(_baja_url(socio.pk))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_dar_baja_socio_role_403(self):
        socio_user = make_user_factory(rol='socio')
        other_user = make_user_factory()
        socio = make_socio_factory(usuario=other_user)
        _auth_client(self.client, socio_user)

        response = self.client.post(_baja_url(socio.pk))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_dar_baja_response_uses_full_socio_serializer_shape(self):
        admin = make_user_factory(rol='administrador')
        user = make_user_factory()
        socio = make_socio_factory(usuario=user)
        _auth_client(self.client, admin)

        response = self.client.post(_baja_url(socio.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # SocioSerializer exposes all these fields; SocioBajaSerializer only had estado + fecha_baja
        for field in ('id', 'numero_socio', 'nombre', 'apellido', 'dni', 'telefono', 'observaciones'):
            self.assertIn(field, response.data, f"Expected field '{field}' in dar-baja response")


class SocioSearchTests(APITestCase):
    """
    Verifica que el ?search= del autocomplete aplique SearchFilter correctamente.
    Regresión del blocker: SocioViewSet no declaraba filter_backends, por lo que
    SearchFilter nunca se aplicaba aunque search_fields estuviera definido.
    """

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        _auth_client(self.client, self.admin)

        u1 = make_user_factory()
        u2 = make_user_factory()
        u3 = make_user_factory()

        self.socio_juan = make_socio_factory(usuario=u1, nombre='Juan', apellido='Perez', dni='11111111')
        self.socio_maria = make_socio_factory(usuario=u2, nombre='Maria', apellido='Juanez', dni='22222222')
        self.socio_pedro = make_socio_factory(usuario=u3, nombre='Pedro', apellido='Lopez', dni='33333333')

    def test_search_por_nombre_devuelve_solo_match(self):
        """?search=Juan devuelve socios cuyo nombre o apellido contenga 'Juan'."""
        response = self.client.get(SOCIOS_URL, {'search': 'Juan'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('results', response.data)
        ids = [s['id'] for s in data]

        self.assertIn(self.socio_juan.pk, ids, 'Debería incluir a Juan Perez')
        self.assertIn(self.socio_maria.pk, ids, 'Debería incluir a Maria Juanez (apellido contiene Juan)')
        self.assertNotIn(self.socio_pedro.pk, ids, 'No debería incluir a Pedro Lopez')

    def test_search_por_dni_devuelve_solo_match(self):
        """?search=11111111 devuelve solo el socio con ese DNI."""
        response = self.client.get(SOCIOS_URL, {'search': '11111111'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('results', response.data)
        ids = [s['id'] for s in data]

        self.assertIn(self.socio_juan.pk, ids)
        self.assertNotIn(self.socio_maria.pk, ids)
        self.assertNotIn(self.socio_pedro.pk, ids)

    def test_search_sin_resultados_devuelve_lista_vacia(self):
        """?search=zzznomatch devuelve lista vacía, no un error."""
        response = self.client.get(SOCIOS_URL, {'search': 'zzznomatch'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 0)


class SocioDarBajaAndStatsTests(APITestCase):

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        self.recep = make_user_factory(rol='recepcionista')
        self.user_socio = make_user_factory(rol='socio')
        self.socio = make_socio_factory(usuario=self.user_socio, estado='activo')

    def test_admin_can_dar_baja(self):
        _auth_client(self.client, self.admin)
        res = self.client.post(_baja_url(self.socio.pk))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.socio.refresh_from_db()
        self.assertEqual(self.socio.estado, 'baja')
        self.assertIsNotNone(self.socio.fecha_baja)

    def test_cannot_dar_baja_already_baja(self):
        self.socio.estado = 'baja'
        self.socio.save()
        _auth_client(self.client, self.admin)
        res = self.client.post(_baja_url(self.socio.pk))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_socio_stats_endpoint(self):
        _auth_client(self.client, self.admin)
        res = self.client.get(f'{SOCIOS_URL}stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('total', res.data)
        self.assertIn('activos', res.data)
        self.assertIn('con_certificado', res.data)
        self.assertIn('bajas', res.data)

    def test_custom_page_size_query_param(self):
        _auth_client(self.client, self.admin)
        res = self.client.get(SOCIOS_URL, {'page_size': 5})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('results', res.data)
