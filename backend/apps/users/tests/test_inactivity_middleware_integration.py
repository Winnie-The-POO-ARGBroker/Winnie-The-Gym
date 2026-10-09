import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.test')
django.setup()

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.middleware import (
    clear_staff_activity,
    get_staff_last_activity,
    record_staff_activity,
)

User = get_user_model()


class StaffInactivityJWTIntegrationTests(APITestCase):
    """RNF05: Pruebas de integración del camino real de producción con JWT y middleware."""

    def setUp(self):
        super().setUp()
        cache.clear()

    def tearDown(self):
        cache.clear()
        super().tearDown()

    def test_staff_jwt_request_tracks_activity(self):
        """Request de staff con token JWT Bearer actualiza last_activity en caché."""
        user = User.objects.create_user(
            email='admin_jwt_integration@gym.test',
            password='testpassword123',
            rol=User.Rol.ADMINISTRADOR,
        )
        # En login real, CustomJWTSerializer registra actividad inicial en caché
        past_time = timezone.now().timestamp() - 300
        cache.set(f'staff_last_activity_{user.id}', past_time)

        token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        response = self.client.get('/api/auth/user/')
        self.assertEqual(response.status_code, 200)

        updated_activity = get_staff_last_activity(user.id)
        self.assertIsNotNone(updated_activity)
        self.assertGreater(updated_activity, past_time)

    def test_staff_jwt_request_blocked_after_inactivity(self):
        """Staff con más de 30 minutos de inactividad es bloqueado con 401 y code session_inactive."""
        user = User.objects.create_user(
            email='recep_inactive_integration@gym.test',
            password='testpassword123',
            rol=User.Rol.RECEPCIONISTA,
        )
        # Simular inactividad de 33 minutos
        cache.set(
            f'staff_last_activity_{user.id}',
            timezone.now().timestamp() - 2000,
        )

        token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        response = self.client.get('/api/auth/user/')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json().get('code'), 'session_inactive')
        self.assertIsNone(get_staff_last_activity(user.id))

    def test_socio_jwt_request_not_blocked_by_inactivity(self):
        """Socios no son trackeados ni bloqueados por el middleware de inactividad."""
        user = User.objects.create_user(
            email='socio_jwt_integration@gym.test',
            password='testpassword123',
            rol=User.Rol.SOCIO,
        )
        token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        response = self.client.get('/api/auth/user/')
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(get_staff_last_activity(user.id))
