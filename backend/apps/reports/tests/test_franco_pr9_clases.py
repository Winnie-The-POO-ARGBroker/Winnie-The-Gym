"""#181 — Tests for class reports: ocupacion, no_shows, cerrar_asistencias_vencidas."""
import datetime

from django.test import TestCase, override_settings

from apps.classes.models import Clase, InscripcionClase
from apps.reports.services import build_no_shows, build_ocupacion_clases
from conftest import make_membresia_factory, make_plan_factory, make_socio_factory, make_user_factory


def _make_clase(**kwargs):
    defaults = dict(
        nombre='Test Class',
        categoria='funcional',
        dia=Clase.Dia.LUNES,
        hora=datetime.time(9, 0),
        duracion_min=60,
        sala='Sala A',
        instructor='Prof Test',
        cupo_maximo=10,
        estado=Clase.Estado.ACTIVA,
    )
    defaults.update(kwargs)
    return Clase.objects.create(**defaults)


def _inscribir(clase, socio, asistio=None, en_espera=False):
    return InscripcionClase.objects.create(
        clase=clase,
        socio=socio,
        asistio=asistio,
        en_espera=en_espera,
    )


class OcupacionClasesTests(TestCase):
    """Test #9 — ocupacion report by instructor returns average."""

    def setUp(self):
        self.user1 = make_user_factory(rol='socio', email='ocu1@test.com')
        self.user2 = make_user_factory(rol='socio', email='ocu2@test.com')
        self.plan = make_plan_factory(nombre='OcuPlan', precio='500.00', duracion_dias=30)
        self.socio1 = make_socio_factory(self.user1)
        self.socio2 = make_socio_factory(self.user2)
        make_membresia_factory(self.socio1, self.plan)
        make_membresia_factory(self.socio2, self.plan)

    def test_reporte_ocupacion_por_instructor_devuelve_promedio(self):
        """Test #9 — Ocupacion report filters by instructor and computes fill rate."""
        clase = _make_clase(instructor='Ana Instructora', cupo_maximo=4)
        _inscribir(clase, self.socio1)
        _inscribir(clase, self.socio2)

        headers, rows = build_ocupacion_clases(instructor='Ana Instructora')

        self.assertEqual(len(rows), 1, 'Should return exactly 1 class for Ana Instructora')
        row = rows[0]
        # row: [clase_id, nombre, disciplina, instructor, dia, hora, cupo_maximo, confirmados, tasa]
        cupo_maximo = row[6]
        confirmados = row[7]
        tasa = row[8]
        self.assertEqual(cupo_maximo, 4)
        self.assertEqual(confirmados, 2)
        self.assertAlmostEqual(tasa, 50.0, places=1)

    def test_reporte_ocupacion_filtro_instructor_vacio_si_no_existe(self):
        """Empty rows when instructor doesn't match."""
        _make_clase(instructor='Otro')
        headers, rows = build_ocupacion_clases(instructor='NoExiste')
        self.assertEqual(len(rows), 0)


class NoShowsTests(TestCase):
    """Test #10 — No-shows report lists socios with 3+ absences in 30 days."""

    def setUp(self):
        self.user = make_user_factory(rol='socio', email='noshow@test.com')
        self.plan = make_plan_factory(nombre='NSPlan', precio='500.00', duracion_dias=30)
        self.socio = make_socio_factory(self.user, apellido='NoShow', nombre='Test')
        make_membresia_factory(self.socio, self.plan)

    def test_reporte_no_shows_lista_socios_con_3_ausencias_30d(self):
        """Test #10 — Report includes socios with >= 3 absences."""
        for i in range(3):
            clase = _make_clase(nombre=f'NoShowClase{i}', instructor=f'Prof{i}')
            _inscribir(clase, self.socio, asistio=False)

        headers, rows = build_no_shows(ventana_dias=30, min_ausencias=3)

        socio_rows = [r for r in rows if str(self.socio.dni) in str(r[0])]
        self.assertTrue(len(socio_rows) >= 1, 'Socio with 3 no-shows should appear in report')
        self.assertGreaterEqual(socio_rows[0][2], 3, 'no_shows count >= 3')

    def test_reporte_no_shows_excluye_socios_con_menos_ausencias(self):
        """Socio with 2 absences does not appear when min_ausencias=3."""
        for i in range(2):
            clase = _make_clase(nombre=f'FewAbsClass{i}')
            _inscribir(clase, self.socio, asistio=False)

        headers, rows = build_no_shows(ventana_dias=30, min_ausencias=3)
        socio_rows = [r for r in rows if str(self.socio.dni) in str(r[0])]
        self.assertEqual(len(socio_rows), 0, 'Socio with 2 absences should not appear')


class CerrarAsistenciasVencidasTests(TestCase):
    """Test #11 — cerrar_asistencias_vencidas task is idempotent."""

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_cerrar_asistencias_vencidas_task_idempotent(self):
        """Test #11 — Running the task twice does not double-mark absences."""
        from apps.classes.tasks import cerrar_asistencias_vencidas

        user = make_user_factory(rol='socio', email='task@test.com')
        plan = make_plan_factory(nombre='TaskPlan', precio='500.00', duracion_dias=30)
        socio = make_socio_factory(user)
        make_membresia_factory(socio, plan)

        # Create a class that ended 4 hours ago
        now = datetime.datetime.now()
        hora_ago = (datetime.datetime.now() - datetime.timedelta(hours=5)).time()
        clase = _make_clase(
            nombre='VencidaClase',
            hora=hora_ago,
            duracion_min=60,
        )
        inscripcion = _inscribir(clase, socio, asistio=None)

        # Run task once
        result1 = cerrar_asistencias_vencidas()
        inscripcion.refresh_from_db()
        self.assertFalse(inscripcion.asistio)

        # Run task again — idempotent, asistio should still be False, count=0 for same class
        result2 = cerrar_asistencias_vencidas()
        inscripcion.refresh_from_db()
        self.assertFalse(inscripcion.asistio)

        # Second run should not register new absences for already-closed class
        self.assertEqual(result2['ausencias_registradas'], 0)
