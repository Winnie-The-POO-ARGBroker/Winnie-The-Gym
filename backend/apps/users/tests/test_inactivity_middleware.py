import json
import os
from unittest.mock import MagicMock, patch
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.test')
django.setup()

from django.core.cache import cache
from django.http import HttpResponse
from django.test import RequestFactory, SimpleTestCase
from django.utils import timezone

from apps.users.middleware import (
    DEFAULT_INACTIVITY_TIMEOUT_SECONDS,
    StaffInactivityMiddleware,
    get_staff_last_activity,
)


class MockUser:
    """Mock user para pruebas de middleware sin requerir base de datos."""

    def __init__(self, user_id=1, email='staff@test.com', rol='administrador', is_authenticated=True):
        self.id = user_id
        self.pk = user_id
        self.email = email
        self.rol = rol
        self.is_authenticated = is_authenticated


class StaffInactivityMiddlewareTests(SimpleTestCase):
    """RNF05 — Pruebas de timeout de inactividad de 30 minutos para usuarios staff."""

    def setUp(self):
        super().setUp()
        cache.clear()
        self.factory = RequestFactory()
        self.dummy_response = HttpResponse('OK', status=200)
        self.middleware = StaffInactivityMiddleware(lambda req: self.dummy_response)

    def tearDown(self):
        cache.clear()
        super().tearDown()

    def test_active_staff_updates_activity_and_passes(self):
        """Staff activo (< 30 min) actualiza last_activity y continúa con la petición."""
        user = MockUser(user_id=10, rol='administrador')
        past_time = timezone.now().timestamp() - 300  # Hace 5 minutos
        cache.set(f'staff_last_activity_{user.id}', past_time)

        request = self.factory.get('/api/users/')
        request.user = user

        response = self.middleware(request)

        self.assertEqual(response.status_code, 200)
        updated_activity = get_staff_last_activity(user.id)
        self.assertIsNotNone(updated_activity)
        self.assertGreater(updated_activity, past_time)

    def test_inactive_staff_over_30_minutes_returns_401(self):
        """Staff inactivo (> 30 min) es invalidado con 401 y código session_inactive."""
        user = MockUser(user_id=20, rol='recepcionista')
        inactivity_seconds = DEFAULT_INACTIVITY_TIMEOUT_SECONDS + 60  # 31 minutos
        past_time = timezone.now().timestamp() - inactivity_seconds
        cache.set(f'staff_last_activity_{user.id}', past_time)

        request = self.factory.get('/api/access/monitor/')
        request.user = user

        response = self.middleware(request)

        self.assertEqual(response.status_code, 401)
        data = json.loads(response.content.decode('utf-8'))
        self.assertEqual(data.get('code'), 'session_inactive')
        self.assertIn('inactividad', data.get('detail', '').lower())
        self.assertIsNone(get_staff_last_activity(user.id))

    def test_socio_user_is_not_subject_to_inactivity_timeout(self):
        """Usuarios con rol socio NO están sujetos al timeout de inactividad (portal móvil)."""
        user = MockUser(user_id=30, rol='socio')
        past_time = timezone.now().timestamp() - 3600  # Hace 1 hora
        cache.set(f'staff_last_activity_{user.id}', past_time)

        request = self.factory.get('/api/classes/mis-reservas/')
        request.user = user

        response = self.middleware(request)

        self.assertEqual(response.status_code, 200)

    def test_unauthenticated_request_is_not_blocked(self):
        """Peticiones sin autenticar pasan sin chequeo de inactividad."""
        request = self.factory.get('/api/classes/')
        request.user = MockUser(is_authenticated=False)

        response = self.middleware(request)
        self.assertEqual(response.status_code, 200)

    def test_exempt_paths_are_skipped(self):
        """Rutas públicas y de autenticación no son interceptadas."""
        user = MockUser(user_id=40, rol='administrador')
        past_time = timezone.now().timestamp() - 3600
        cache.set(f'staff_last_activity_{user.id}', past_time)

        request = self.factory.get('/health/')
        request.user = user

        response = self.middleware(request)
        self.assertEqual(response.status_code, 200)

    def test_first_request_establishes_activity_timestamp(self):
        """Primera petición de un staff sin registro previo establece last_activity."""
        user = MockUser(user_id=50, rol='administrador')
        request = self.factory.get('/api/reports/')
        request.user = user

        response = self.middleware(request)

        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(get_staff_last_activity(user.id))

    def test_token_refresh_rejected_when_staff_inactive(self):
        """Token refresh en /api/auth/token/refresh/ rechaza a staff inactivo > 30 min."""
        user = MockUser(user_id=60, rol='administrador')
        past_time = timezone.now().timestamp() - 2000
        cache.set(f'staff_last_activity_{user.id}', past_time)

        with patch('rest_framework_simplejwt.tokens.RefreshToken') as mock_refresh_class, \
             patch('django.contrib.auth.get_user_model') as mock_get_user_model:
            mock_refresh_instance = MagicMock()
            mock_refresh_instance.get.return_value = user.id
            mock_refresh_class.return_value = mock_refresh_instance

            mock_user_model = MagicMock()
            mock_user_model.objects.filter.return_value.first.return_value = user
            mock_get_user_model.return_value = mock_user_model

            body = json.dumps({'refresh': 'fake-refresh-token'}).encode('utf-8')
            request = self.factory.post(
                '/api/auth/token/refresh/',
                data=body,
                content_type='application/json',
            )

            response = self.middleware(request)

            self.assertEqual(response.status_code, 401)
            data = json.loads(response.content.decode('utf-8'))
            self.assertEqual(data.get('code'), 'session_inactive')
