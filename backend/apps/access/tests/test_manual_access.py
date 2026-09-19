import datetime
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.access.models import AccessLog
from conftest import make_membresia_factory, make_plan_factory, make_socio_factory, make_user_factory

class ManualAccessViewTests(APITestCase):

    def setUp(self):
        self.receptionist = make_user_factory(rol='recepcionista')
        self.url = reverse('access:manual-access')

    def test_manual_access_valid_dni(self):
        self.client.force_authenticate(user=self.receptionist)
        
        user_socio = make_user_factory(rol='socio')
        socio = make_socio_factory(usuario=user_socio, estado='activo', dni='30111222')
        plan = make_plan_factory()
        today = datetime.date.today()
        make_membresia_factory(socio, plan, fecha_fin=today + datetime.timedelta(days=10))

        response = self.client.post(self.url, {'dni': '30111222', 'access_type': 'ENTRY'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'GRANTED')
        
        log = AccessLog.objects.get(id=response.data['access_log']['id'])
        self.assertEqual(log.access_type, 'ENTRY')
        self.assertEqual(log.user, user_socio)
        self.assertEqual(log.scanned_by, self.receptionist)

    def test_manual_access_invalid_dni(self):
        self.client.force_authenticate(user=self.receptionist)
        response = self.client.post(self.url, {'dni': '99999999', 'access_type': 'ENTRY'})
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['status'], 'DENIED')
        self.assertEqual(response.data['denial_reason'], 'UNKNOWN_USER')
        # user name should be None or null
        self.assertIsNone(response.data['access_log']['user_name'])
        self.assertIsNone(response.data['access_log']['user_email'])

    def test_manual_access_expired_membership(self):
        self.client.force_authenticate(user=self.receptionist)
        
        user_socio = make_user_factory(rol='socio')
        socio = make_socio_factory(usuario=user_socio, estado='activo', dni='30111222')
        plan = make_plan_factory()
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        make_membresia_factory(socio, plan, fecha_fin=yesterday)

        response = self.client.post(self.url, {'dni': '30111222', 'access_type': 'ENTRY'})
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['status'], 'DENIED')
        self.assertEqual(response.data['denial_reason'], 'MEMBERSHIP_INACTIVE')

    def test_manual_access_unauthenticated(self):
        response = self.client.post(self.url, {'dni': '30111222', 'access_type': 'ENTRY'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_manual_access_member_forbidden(self):
        user_socio = make_user_factory(rol='socio')
        self.client.force_authenticate(user=user_socio)
        response = self.client.post(self.url, {'dni': '30111222', 'access_type': 'ENTRY'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manual_access_user_suspended(self):
        self.client.force_authenticate(user=self.receptionist)
        user_socio = make_user_factory(rol='socio', is_active=False)
        make_socio_factory(usuario=user_socio, estado='inactivo', dni='30111222')
        
        response = self.client.post(self.url, {'dni': '30111222', 'access_type': 'ENTRY'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['status'], 'DENIED')
        self.assertEqual(response.data['denial_reason'], 'USER_SUSPENDED')

    def test_manual_access_empty_or_invalid_dni(self):
        self.client.force_authenticate(user=self.receptionist)
        response = self.client.post(self.url, {'dni': '', 'access_type': 'ENTRY'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        response = self.client.post(self.url, {'dni': '  ', 'access_type': 'ENTRY'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(self.url, {'dni': '123', 'access_type': 'ENTRY'}) # Less than 7
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
