"""REQ-3.7 — GymConfig singleton model and API view."""
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.models import GymConfig
from conftest import make_user_factory

GYM_CONFIG_URL = '/api/config/gym/'


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


class GymConfigModelTests(APITestCase):
    def test_get_creates_default_row(self):
        """GymConfig.get() creates the singleton if it does not exist."""
        GymConfig.objects.all().delete()
        cfg = GymConfig.get()
        self.assertEqual(cfg.pk, 1)
        self.assertEqual(cfg.aforo_maximo, 200)
        self.assertEqual(cfg.nombre_gym, 'Winnie The Gym')

    def test_singleton_enforcement_on_save(self):
        """Saving a second GymConfig always overwrites pk=1, not creates a new row."""
        GymConfig.objects.all().delete()
        cfg1 = GymConfig.get()
        cfg2 = GymConfig(nombre_gym='Otro Gym', aforo_maximo=100)
        cfg2.save()
        self.assertEqual(GymConfig.objects.count(), 1)
        self.assertEqual(GymConfig.objects.get(pk=1).nombre_gym, 'Otro Gym')

    def test_delete_is_noop(self):
        """Deleting the singleton is a no-op — the row must survive."""
        cfg = GymConfig.get()
        cfg.delete()
        self.assertTrue(GymConfig.objects.filter(pk=1).exists())


class GymConfigAPITests(APITestCase):
    def setUp(self):
        self.admin = make_user_factory(email='admin@gymcfg.test', rol='administrador')
        self.socio_user = make_user_factory(email='socio@gymcfg.test', rol='socio')
        # Ensure singleton exists
        GymConfig.get()

    def test_get_public_anonymous(self):
        """Anonymous users can GET gym config (no auth required)."""
        response = self.client.get(GYM_CONFIG_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('aforo_maximo', response.data)
        self.assertIn('nombre_gym', response.data)

    def test_get_public_authenticated(self):
        """Any authenticated user can GET gym config."""
        _auth(self.client, self.socio_user)
        response = self.client.get(GYM_CONFIG_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_patch_admin_ok(self):
        """Admin can PATCH the gym config."""
        _auth(self.client, self.admin)
        response = self.client.patch(GYM_CONFIG_URL, {'aforo_maximo': 150}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(GymConfig.get().aforo_maximo, 150)

    def test_patch_non_admin_403(self):
        """Non-admin gets 403 on PATCH."""
        _auth(self.client, self.socio_user)
        response = self.client.patch(GYM_CONFIG_URL, {'aforo_maximo': 500}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_anonymous_403(self):
        """Anonymous PATCH is rejected (401 or 403)."""
        response = self.client.patch(GYM_CONFIG_URL, {'aforo_maximo': 500}, format='json')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_singleton_after_patch(self):
        """After patching, still only one row exists in the DB."""
        _auth(self.client, self.admin)
        self.client.patch(GYM_CONFIG_URL, {'nombre_gym': 'WTG Actualizado'}, format='json')
        self.assertEqual(GymConfig.objects.count(), 1)
        self.assertEqual(GymConfig.objects.get(pk=1).nombre_gym, 'WTG Actualizado')
