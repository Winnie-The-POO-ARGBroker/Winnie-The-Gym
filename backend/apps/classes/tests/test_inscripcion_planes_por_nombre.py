"""Enrolling checks `planes_habilitados` against plan NAMES, as the UI and the API store them."""
from datetime import date, time, timedelta

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.classes.models import Clase, InscripcionClase
from conftest import (
    make_membresia_factory,
    make_plan_factory,
    make_socio_factory,
    make_user_factory,
)


def _clase(planes):
    return Clase.objects.create(
        nombre='Funcional Test', categoria='funcional', dia=Clase.Dia.LUNES, hora=time(9, 0),
        cupo_maximo=20, lista_espera_max=5, estado=Clase.Estado.ACTIVA, planes_habilitados=planes,
    )


def _socio_con_plan(plan):
    user = make_user_factory(rol='socio')
    socio = make_socio_factory(usuario=user)
    make_membresia_factory(
        socio, plan, fecha_inicio=date.today(), fecha_fin=date.today() + timedelta(days=30), estado='activa',
    )
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return client, socio


def _inscribir(client, clase):
    return client.post(f'/api/classes/clases/{clase.pk}/inscribir/')


class InscripcionPlanesPorNombreTests(TestCase):

    def setUp(self):
        self.basico = make_plan_factory(nombre='Básico')
        self.otro = make_plan_factory(nombre='Plan test 2')

    def test_plan_habilitado_por_nombre_puede_inscribirse(self):
        clase = _clase(['Básico', 'Premium'])
        client, socio = _socio_con_plan(self.basico)

        response = _inscribir(client, clase)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertTrue(InscripcionClase.objects.filter(clase=clase, socio=socio).exists())

    def test_el_nombre_se_compara_sin_importar_mayusculas_ni_espacios(self):
        clase = _clase(['  básico '])
        client, _ = _socio_con_plan(self.basico)

        self.assertEqual(_inscribir(client, clase).status_code, status.HTTP_201_CREATED)

    def test_plan_que_no_esta_en_la_lista_sigue_rechazado_con_su_nombre(self):
        clase = _clase(['Básico', 'Premium'])
        client, _ = _socio_con_plan(self.otro)

        response = _inscribir(client, clase)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Plan test 2', response.json()['detail'])

    def test_lista_vacia_permite_todos_los_planes(self):
        client, _ = _socio_con_plan(self.otro)

        self.assertEqual(_inscribir(client, _clase([])).status_code, status.HTTP_201_CREATED)

    def test_sigue_aceptando_ids_de_plan_por_compatibilidad(self):
        clase = _clase([self.basico.id])
        client, _ = _socio_con_plan(self.basico)

        self.assertEqual(_inscribir(client, clase).status_code, status.HTTP_201_CREATED)

    def test_id_de_otro_plan_no_habilita(self):
        clase = _clase([self.basico.id])
        client, _ = _socio_con_plan(self.otro)

        self.assertEqual(_inscribir(client, clase).status_code, status.HTTP_400_BAD_REQUEST)

    def test_lista_mixta_de_ids_y_nombres(self):
        clase = _clase([self.basico.id, 'Plan test 2'])
        client, _ = _socio_con_plan(self.otro)

        self.assertEqual(_inscribir(client, clase).status_code, status.HTTP_201_CREATED)

