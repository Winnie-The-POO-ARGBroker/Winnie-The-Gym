"""seed_demo_catalog loads the gym catalog (disciplines, rooms, instructors,
plans and weekly classes with sessions up to a given date)."""
import datetime
from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.classes.models import Clase, Disciplina, Instructor, Sala, SesionClase
from apps.memberships.models import PlanMembresia

HASTA = datetime.date(2026, 12, 31)


def _seed(**kwargs):
    call_command('seed_demo_catalog', hasta=HASTA.isoformat(), stdout=StringIO(), **kwargs)


class SeedDemoCatalogTests(TestCase):
    def test_creates_the_catalog(self):
        _seed()

        self.assertGreaterEqual(Disciplina.objects.count(), 7)
        self.assertGreaterEqual(Sala.objects.count(), 3)
        self.assertGreaterEqual(Instructor.objects.count(), 4)
        self.assertGreaterEqual(PlanMembresia.objects.count(), 3)
        self.assertGreaterEqual(Clase.objects.count(), 12)

    def test_every_class_is_complete_and_linked_to_the_catalog(self):
        _seed()

        for clase in Clase.objects.all():
            self.assertTrue(clase.instructor, clase.nombre)
            self.assertTrue(clase.recurrencia, clase.nombre)
            self.assertTrue(clase.dias_recurrencia, clase.nombre)
            self.assertIsNotNone(clase.disciplina_fk, clase.nombre)
            self.assertIsNotNone(clase.sala_fk, clase.nombre)
            self.assertIsNotNone(clase.instructor_fk, clase.nombre)
            self.assertLessEqual(clase.cupo_maximo, clase.sala_fk.capacidad or clase.cupo_maximo)

    def test_sessions_reach_the_requested_date(self):
        _seed()

        ultima = SesionClase.objects.order_by('-fecha').first().fecha
        self.assertGreater(ultima, HASTA - datetime.timedelta(days=7))
        self.assertLessEqual(ultima, HASTA)

    def test_has_a_class_every_weekday_the_gym_opens(self):
        _seed()

        dias = {d for c in Clase.objects.all() for d in c.dias_recurrencia}
        self.assertTrue({'L', 'M', 'X', 'J', 'V'} <= dias)

    def test_is_idempotent(self):
        _seed()
        clases, sesiones, planes = Clase.objects.count(), SesionClase.objects.count(), PlanMembresia.objects.count()

        _seed()

        self.assertEqual(Clase.objects.count(), clases)
        self.assertEqual(SesionClase.objects.count(), sesiones)
        self.assertEqual(PlanMembresia.objects.count(), planes)

    def test_does_not_touch_existing_plans(self):
        PlanMembresia.objects.create(nombre='Plan Test', duracion_dias=30, precio=1, beneficios=[])

        _seed()

        plan = PlanMembresia.objects.get(nombre='Plan Test')
        self.assertEqual(float(plan.precio), 1.0)

    def test_creates_no_users(self):
        from django.contrib.auth import get_user_model

        antes = get_user_model().objects.count()

        _seed()

        self.assertEqual(get_user_model().objects.count(), antes)

    def test_plan_benefits_are_plain_non_empty_strings(self):
        _seed()

        for plan in PlanMembresia.objects.all():
            self.assertTrue(plan.beneficios, plan.nombre)
            self.assertTrue(all(isinstance(b, str) and b.strip() for b in plan.beneficios), plan.nombre)

    def test_the_schedule_has_no_room_or_instructor_conflicts(self):
        from apps.classes.serializers import ClaseSerializer

        _seed()

        for clase in Clase.objects.all():
            serializer = ClaseSerializer(clase, data={'nombre': clase.nombre}, partial=True)
            self.assertTrue(serializer.is_valid(), f'{clase.nombre}: {serializer.errors}')
