from datetime import date, timedelta
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.memberships.models import Membresia
from conftest import make_plan_factory, make_socio_factory, make_user_factory


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


class CsvBomTests(APITestCase):
    """Ensures CSV exports carry the UTF-8 BOM so Excel opens accents correctly."""

    def test_morosidad_csv_starts_with_utf8_bom(self):
        admin = make_user_factory(email='bom@test.com', rol='administrador')
        socio_user = make_user_factory(email='soc@bom.test', rol='socio')
        socio = make_socio_factory(socio_user, apellido='Peña', nombre='José')
        plan = make_plan_factory(nombre='Básico', precio=Decimal('900.00'))
        Membresia.objects.create(
            socio=socio, plan=plan,
            fecha_inicio=date.today() - timedelta(days=40),
            fecha_fin=date.today() - timedelta(days=10),
            estado=Membresia.Estado.VENCIDA,
        )
        _auth(self.client, admin)

        response = self.client.get('/api/reportes/morosidad/?formato=csv')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.content.startswith(b'\xef\xbb\xbf'))
        decoded = response.content.decode('utf-8-sig')
        self.assertIn('Peña', decoded)
        self.assertIn('José', decoded)
