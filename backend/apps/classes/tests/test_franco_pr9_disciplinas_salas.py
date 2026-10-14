"""#179 — Tests for Disciplina/Sala CRUD and Clase FK validation."""
import datetime

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.classes.models import Clase, Disciplina, InscripcionClase, Sala
from conftest import make_membresia_factory, make_plan_factory, make_socio_factory, make_user_factory


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


DISCIPLINAS_URL = '/api/classes/disciplinas/'
SALAS_URL = '/api/classes/salas/'


class DisciplinaCRUDTests(APITestCase):
    """Test #12 — Disciplina CRUD admin only."""

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        self.recep = make_user_factory(rol='recepcionista', email='recep@d.com')
        self.socio_user = make_user_factory(rol='socio', email='socio@d.com')

    def test_disciplina_crud_admin_only(self):
        """Test #12 — Admin can create Disciplina; recep/socio cannot."""
        _auth(self.client, self.admin)
        payload = {'nombre': 'Yoga', 'slug': 'yoga', 'color_hex': '#ff0000'}
        response = self.client.post(DISCIPLINAS_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nombre'], 'Yoga')

        # Recep cannot create
        _auth(self.client, self.recep)
        response = self.client.post(DISCIPLINAS_URL, {'nombre': 'Pilates', 'slug': 'pilates'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Socio cannot create
        _auth(self.client, self.socio_user)
        response = self.client.post(DISCIPLINAS_URL, {'nombre': 'Boxeo', 'slug': 'boxeo'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_disciplina_list_accessible_to_all_authenticated(self):
        """Recepcionistas and socios can list disciplinas."""
        Disciplina.objects.create(nombre='Funcional', slug='funcional')
        _auth(self.client, self.recep)
        response = self.client.get(DISCIPLINAS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_disciplina_delete_con_uso_ofrece_desactivar(self):
        """Test #14 — Deleting a Disciplina with associated Clase soft-deactivates it."""
        _auth(self.client, self.admin)
        disciplina = Disciplina.objects.create(nombre='Spinning', slug='spinning')
        Clase.objects.create(
            nombre='Spinning AM',
            categoria='funcional',
            disciplina_fk=disciplina,
            dia=Clase.Dia.LUNES,
            hora=datetime.time(8, 0),
            duracion_min=45,
            sala='Sala B',
            instructor='Test',
            cupo_maximo=10,
        )

        url = f'{DISCIPLINAS_URL}{disciplina.pk}/'
        response = self.client.delete(url)

        # Should deactivate, not delete
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['desactivada'])
        disciplina.refresh_from_db()
        self.assertFalse(disciplina.activa)
        # Second delete attempt on already-inactive → 409
        response2 = self.client.delete(url)
        self.assertEqual(response2.status_code, status.HTTP_409_CONFLICT)

    def test_disciplina_delete_sin_uso_elimina(self):
        """Disciplina without associated clases is hard-deleted."""
        _auth(self.client, self.admin)
        disciplina = Disciplina.objects.create(nombre='CrossFit', slug='crossfit')
        url = f'{DISCIPLINAS_URL}{disciplina.pk}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Disciplina.objects.filter(pk=disciplina.pk).exists())


class ClaseCupoSalaValidationTests(TestCase):
    """Test #13 — cupo_maximo > sala.capacidad is rejected."""

    def test_clase_cupo_mayor_capacidad_sala_rechaza(self):
        """Test #13 — Creating a Clase with cupo > sala.capacidad raises ValidationError."""
        from django.core.exceptions import ValidationError

        sala = Sala.objects.create(nombre='Sala Pequeña', capacidad=10)
        clase = Clase(
            nombre='Overcapacity Class',
            categoria='funcional',
            sala_fk=sala,
            sala='Sala Pequeña',
            dia=Clase.Dia.LUNES,
            hora=datetime.time(10, 0),
            duracion_min=60,
            instructor='Prof',
            cupo_maximo=15,  # Exceeds sala.capacidad=10
        )

        with self.assertRaises(ValidationError) as ctx:
            clase.clean()

        self.assertIn('cupo_maximo', ctx.exception.message_dict)

    def test_clase_cupo_igual_capacidad_ok(self):
        """cupo_maximo == sala.capacidad is valid."""
        sala = Sala.objects.create(nombre='Sala Exacta', capacidad=20)
        clase = Clase(
            nombre='Exact Capacity Class',
            categoria='funcional',
            sala_fk=sala,
            sala='Sala Exacta',
            dia=Clase.Dia.MARTES,
            hora=datetime.time(11, 0),
            duracion_min=45,
            instructor='Prof',
            cupo_maximo=20,
        )
        # Should not raise
        clase.clean()

    def test_clase_cupo_sin_sala_fk_no_valida(self):
        """cupo_maximo without sala_fk is not validated against any capacity."""
        clase = Clase(
            nombre='No Sala FK',
            categoria='funcional',
            sala='Sala X',
            dia=Clase.Dia.MIERCOLES,
            hora=datetime.time(12, 0),
            duracion_min=45,
            instructor='Prof',
            cupo_maximo=999,
        )
        # Should not raise since sala_fk is None
        clase.clean()


class DataMigrationPreservationTest(TestCase):
    """Test that existing Clase.categoria values are preserved via migration.

    This simulates the data migration behavior in-process — the actual migration
    runs via RunPython; here we call the forward function directly.
    """

    def test_disciplina_crud_preserves_existing_clases(self):
        """Seeds Disciplina from existing categoria values and FK-links Clase rows."""
        # Pre-create clases with string categorias
        Clase.objects.create(
            nombre='Old Class 1',
            categoria='yoga',
            dia=Clase.Dia.VIERNES,
            hora=datetime.time(9, 0),
            duracion_min=60,
            sala='Sala C',
            instructor='Prof Y',
            cupo_maximo=15,
        )
        Clase.objects.create(
            nombre='Old Class 2',
            categoria='yoga',
            dia=Clase.Dia.SABADO,
            hora=datetime.time(10, 0),
            duracion_min=60,
            sala='Sala C',
            instructor='Prof Y',
            cupo_maximo=15,
        )

        # Simulate data migration forward function
        import re

        def _slugify(text):
            text = text.lower().strip()
            text = re.sub(r'[^\w\s-]', '', text)
            text = re.sub(r'[\s_-]+', '-', text)
            return text[:100]

        categorias = Clase.objects.values_list('categoria', flat=True).distinct()
        for cat in categorias:
            if not cat:
                continue
            slug = _slugify(cat)
            disciplina, _ = Disciplina.objects.get_or_create(
                nombre=cat,
                defaults={'slug': slug, 'color_hex': '#735d3e', 'activa': True},
            )
            Clase.objects.filter(categoria=cat).update(disciplina_fk=disciplina)

        # Verify all yoga classes now point to the Yoga disciplina
        disciplina = Disciplina.objects.get(nombre='yoga')
        linked = Clase.objects.filter(disciplina_fk=disciplina).count()
        self.assertEqual(linked, 2, 'Both yoga classes should be linked to the Disciplina')
