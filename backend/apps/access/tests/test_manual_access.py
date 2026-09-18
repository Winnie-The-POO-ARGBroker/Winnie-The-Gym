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
