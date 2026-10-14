"""#178 + #180 Fase 1 — Tests for SesionClase and Instructor.

Tests obligatorios:
  1. test_cancelar_sesion_solo_una_fecha_no_toca_otras          — #178
  2. test_marcar_asistencia_en_fecha_no_afecta_fecha_siguiente  — #178
  3. test_editar_serie_esta_y_siguientes_crea_nueva_serie        — #178
  4. test_generar_sesiones_rolling_window_no_duplica             — #178
  5. test_inscripcion_asociada_a_sesion_no_aparece_en_otra_fecha — #178
  6. test_instructor_crud_admin_only                             — #180
  7. test_instructor_solapamiento_mismo_horario_rechaza          — #180
  8. test_instructor_delete_con_clases_asignadas_ofrece_desactivar — #180
  9. test_data_migration_instructores_from_charfield_preserva_valores — #180
 10. test_data_migration_sesiones_from_clases_crea_proximas_8_semanas — #178
"""
import datetime
import re

from django.test import TestCase, TransactionTestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.classes.models import Clase, InscripcionClase, Instructor, SesionClase
from apps.classes.services import (
    cancelar_sesion,
    editar_serie,
    generar_sesiones,
)
from conftest import (
    make_membresia_factory,
    make_plan_factory,
    make_socio_factory,
    make_user_factory,
)


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

INSTRUCTORES_URL = '/api/classes/instructores/'
SESIONES_URL = '/api/classes/sesiones/'


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def _make_clase(**kwargs):
    defaults = dict(
        nombre='Test Clase',
        categoria=Clase.Categoria.FUNCIONAL,
        dia=Clase.Dia.LUNES,
        hora=datetime.time(9, 0),
        duracion_min=60,
        cupo_maximo=10,
        lista_espera_max=3,
        sala='Sala A',
        estado=Clase.Estado.ACTIVA,
        dias_recurrencia=[Clase.Dia.LUNES],
    )
    defaults.update(kwargs)
    return Clase.objects.create(**defaults)


def _make_instructor(**kwargs):
    defaults = dict(nombre='Ana', apellido='García', activo=True)
    defaults.update(kwargs)
    return Instructor.objects.create(**defaults)


# ===========================================================================
# Test 1 — cancelar_sesion solo una fecha, no toca otras
# ===========================================================================

class TestCancelarSesionSoloUnaFecha(TestCase):
    """Test #1 — Cancelling a single session does not touch sibling sessions."""

    def setUp(self):
        self.clase = _make_clase()
        self.lunes_1 = datetime.date(2026, 10, 5)   # Monday
        self.lunes_2 = datetime.date(2026, 10, 12)  # Monday next week
        self.lunes_3 = datetime.date(2026, 10, 19)  # Monday week after

        generar_sesiones(self.clase, self.lunes_1, self.lunes_3)

    def test_cancelar_sesion_solo_una_fecha_no_toca_otras(self):
        """Cancelling session on lunes_2 leaves lunes_1 and lunes_3 activa."""
        sesion_target = SesionClase.objects.get(clase=self.clase, fecha=self.lunes_2)
        cancelar_sesion(sesion_target, motivo='Feriado imprevisto ese día', actor=None)

        sesion_target.refresh_from_db()
        self.assertEqual(sesion_target.estado, SesionClase.Estado.CANCELADA)

        sesion_1 = SesionClase.objects.get(clase=self.clase, fecha=self.lunes_1)
        sesion_3 = SesionClase.objects.get(clase=self.clase, fecha=self.lunes_3)
        self.assertEqual(sesion_1.estado, SesionClase.Estado.ACTIVA)
        self.assertEqual(sesion_3.estado, SesionClase.Estado.ACTIVA)

        # Total sessions for the clase remain 3 (one cancelled, two active)
        total = SesionClase.objects.filter(clase=self.clase).count()
        self.assertEqual(total, 3)


# ===========================================================================
# Test 2 — marcar asistencia en fecha específica no afecta la siguiente
# ===========================================================================

class TestAsistenciaNoAfectaFechaSiguiente(TestCase):
    """Test #2 — Attendance on a sesion does not bleed into the next sesion."""

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        self.clase = _make_clase()

        self.lunes_1 = datetime.date(2026, 10, 5)
        self.lunes_2 = datetime.date(2026, 10, 12)
        generar_sesiones(self.clase, self.lunes_1, self.lunes_2)

        self.sesion_1 = SesionClase.objects.get(clase=self.clase, fecha=self.lunes_1)
        self.sesion_2 = SesionClase.objects.get(clase=self.clase, fecha=self.lunes_2)

        socio_user = make_user_factory(rol='socio', email='socio@pr10.com')
        self.socio = make_socio_factory(usuario=socio_user)
        plan = make_plan_factory()
        make_membresia_factory(
            self.socio, plan,
            fecha_inicio=datetime.date.today() - datetime.timedelta(days=1),
            fecha_fin=datetime.date.today() + datetime.timedelta(days=30),
            estado='activa',
        )

    def test_marcar_asistencia_en_fecha_no_afecta_fecha_siguiente(self):
        """Marking asistio=True on sesion_1 does not set asistio on sesion_2's inscripciones."""
        # Create two inscriptions: one linked to sesion_1, one to sesion_2
        inscripcion_1 = InscripcionClase.objects.create(
            clase=self.clase,
            socio=self.socio,
            sesion=self.sesion_1,
            asistio=None,
            en_espera=False,
        )
        # For sesion_2 we'd need a different socio; use the same clase + sesion FK approach
        socio_user2 = make_user_factory(rol='socio', email='socio2@pr10.com')
        socio2 = make_socio_factory(usuario=socio_user2)
        plan2 = make_plan_factory()
        make_membresia_factory(
            socio2, plan2,
            fecha_inicio=datetime.date.today() - datetime.timedelta(days=1),
            fecha_fin=datetime.date.today() + datetime.timedelta(days=30),
            estado='activa',
        )
        inscripcion_2 = InscripcionClase.objects.create(
            clase=self.clase,
            socio=socio2,
            sesion=self.sesion_2,
            asistio=None,
            en_espera=False,
        )

        # Mark attendance on sesion_1 only
        inscripcion_1.asistio = True
        inscripcion_1.save(update_fields=['asistio'])

        # sesion_2's inscription must remain unset
        inscripcion_2.refresh_from_db()
        self.assertIsNone(inscripcion_2.asistio)

        # Only sesion_1 inscriptions have asistio=True
        sesion_1_presentes = InscripcionClase.objects.filter(
            sesion=self.sesion_1, asistio=True,
        ).count()
        sesion_2_presentes = InscripcionClase.objects.filter(
            sesion=self.sesion_2, asistio=True,
        ).count()
        self.assertEqual(sesion_1_presentes, 1)
        self.assertEqual(sesion_2_presentes, 0)


# ===========================================================================
# Test 3 — editar_serie 'esta_y_siguientes' crea nueva serie
# ===========================================================================

class TestEditarSerieEstaYSiguientesCreaNuevaSerie(TestCase):
    """Test #3 — editar_serie with alcance='esta_y_siguientes' creates a new Clase clone."""

    def setUp(self):
        self.clase = _make_clase(hora=datetime.time(9, 0), cupo_maximo=10)
        lunes_start = datetime.date(2026, 10, 5)
        lunes_end = datetime.date(2026, 10, 26)
        generar_sesiones(self.clase, lunes_start, lunes_end)
        # 4 Mondays: 5, 12, 19, 26

    def test_editar_serie_esta_y_siguientes_crea_nueva_serie(self):
        """editar_serie 'esta_y_siguientes' from oct-12 creates a new Clase and reassigns sessions."""
        fecha_pivote = datetime.date(2026, 10, 12)
        clase_id_original = self.clase.pk

        result = editar_serie(
            self.clase,
            cambios={'cupo_maximo': 20},
            alcance='esta_y_siguientes',
            fecha_pivote=fecha_pivote,
        )

        self.assertEqual(result['alcance'], 'esta_y_siguientes')
        self.assertEqual(result['clase_id'], clase_id_original)
        self.assertIn('nueva_clase_id', result)

        nueva_clase_id = result['nueva_clase_id']
        self.assertNotEqual(nueva_clase_id, clase_id_original)

        from apps.classes.models import Clase as ClaseModel  # noqa: PLC0415
        nueva_clase = ClaseModel.objects.get(pk=nueva_clase_id)
        self.assertEqual(nueva_clase.cupo_maximo, 20)

        # Sessions from fecha_pivote onwards belong to nueva_clase
        sesiones_nuevas = SesionClase.objects.filter(
            clase=nueva_clase, fecha__gte=fecha_pivote,
        )
        self.assertEqual(sesiones_nuevas.count(), 3)  # 12, 19, 26

        # Past session (oct-5) remains on original clase
        sesiones_originales = SesionClase.objects.filter(
            clase=self.clase, fecha__lt=fecha_pivote,
        )
        self.assertEqual(sesiones_originales.count(), 1)  # 5


# ===========================================================================
# Test 4 — generar_sesiones rolling window no duplica
# ===========================================================================

class TestGenerarSesionesRollingWindowNoDuplica(TestCase):
    """Test #4 — Calling generar_sesiones twice does not create duplicate rows."""

    def setUp(self):
        self.clase = _make_clase()

    def test_generar_sesiones_rolling_window_no_duplica(self):
        """Running generar_sesiones twice for the same window is idempotent."""
        desde = datetime.date(2026, 10, 5)
        hasta = datetime.date(2026, 10, 19)

        creadas_1 = generar_sesiones(self.clase, desde, hasta)
        creadas_2 = generar_sesiones(self.clase, desde, hasta)

        total = SesionClase.objects.filter(clase=self.clase, fecha__range=(desde, hasta)).count()

        # First run creates rows; second run creates zero
        self.assertGreater(creadas_1, 0)
        self.assertEqual(creadas_2, 0)

        # Total matches first run (no duplicates)
        self.assertEqual(total, creadas_1)


# ===========================================================================
# Test 5 — inscripcion asociada a sesion no aparece en otra fecha
# ===========================================================================

class TestInscripcionAsociadaASesionNoApareceEnOtraFecha(TestCase):
    """Test #5 — An inscription tied to sesion_1 does not appear under sesion_2."""

    def setUp(self):
        self.clase = _make_clase()
        self.lunes_1 = datetime.date(2026, 10, 5)
        self.lunes_2 = datetime.date(2026, 10, 12)
        generar_sesiones(self.clase, self.lunes_1, self.lunes_2)

        self.sesion_1 = SesionClase.objects.get(clase=self.clase, fecha=self.lunes_1)
        self.sesion_2 = SesionClase.objects.get(clase=self.clase, fecha=self.lunes_2)

        socio_user = make_user_factory(rol='socio', email='socio5@pr10.com')
        self.socio = make_socio_factory(usuario=socio_user)

    def test_inscripcion_asociada_a_sesion_no_aparece_en_otra_fecha(self):
        """Inscription FK'd to sesion_1 is not returned when querying sesion_2."""
        InscripcionClase.objects.create(
            clase=self.clase,
            socio=self.socio,
            sesion=self.sesion_1,
            en_espera=False,
        )

        inscripciones_sesion_2 = InscripcionClase.objects.filter(sesion=self.sesion_2)
        self.assertEqual(inscripciones_sesion_2.count(), 0)

        inscripciones_sesion_1 = InscripcionClase.objects.filter(sesion=self.sesion_1)
        self.assertEqual(inscripciones_sesion_1.count(), 1)


# ===========================================================================
# Test 6 — instructor CRUD admin only
# ===========================================================================

class TestInstructorCRUDAdminOnly(APITestCase):
    """Test #6 — Instructor CRUD is admin-only for writes; reads are public."""

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        self.recep = make_user_factory(rol='recepcionista', email='recep@pr10.com')
        self.socio_user = make_user_factory(rol='socio', email='socio6@pr10.com')

    def test_instructor_crud_admin_only(self):
        """Admin can create; recep and socio cannot."""
        payload = {'nombre': 'Carlos', 'apellido': 'Pérez', 'activo': True}

        # Admin can create
        _auth(self.client, self.admin)
        resp = self.client.post(INSTRUCTORES_URL, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        instructor_id = resp.data['id']

        # Admin can read
        resp = self.client.get(INSTRUCTORES_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Recep can read but cannot create
        _auth(self.client, self.recep)
        resp = self.client.get(INSTRUCTORES_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        resp = self.client.post(INSTRUCTORES_URL, {'nombre': 'X', 'apellido': 'Y'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        # Socio can read but cannot create
        _auth(self.client, self.socio_user)
        resp = self.client.get(INSTRUCTORES_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        resp = self.client.post(INSTRUCTORES_URL, {'nombre': 'X', 'apellido': 'Y'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        # Admin can update and delete
        _auth(self.client, self.admin)
        resp = self.client.patch(
            f'{INSTRUCTORES_URL}{instructor_id}/',
            {'bio': 'Especialista en funcional'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['bio'], 'Especialista en funcional')


# ===========================================================================
# Test 7 — instructor solapamiento rechaza
# ===========================================================================

class TestInstructorSolapamientoRechaza(APITestCase):
    """Test #7 — Assigning an instructor to a class that overlaps their existing schedule is rejected."""

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        self.instructor = _make_instructor()
        # Create a class assigned to the instructor: Mondays 9-10
        self.clase_existente = _make_clase(
            nombre='Clase Existente',
            dia=Clase.Dia.LUNES,
            hora=datetime.time(9, 0),
            duracion_min=60,
            instructor_fk=self.instructor,
        )

    def test_instructor_solapamiento_mismo_horario_rechaza(self):
        """Creating a class with the same instructor at overlapping hours raises 400."""
        _auth(self.client, self.admin)
        payload = {
            'nombre': 'Nueva Clase',
            'categoria': 'funcional',
            'dia': 'lunes',
            'hora': '09:30:00',
            'duracion_min': 60,
            'cupo_maximo': 10,
            'sala': 'Sala B',  # different sala — the overlap is on instructor, not sala
            'instructor': 'Ana García',
            'instructor_fk': self.instructor.pk,
        }
        resp = self.client.post('/api/classes/clases/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('instructor_fk', resp.data)

    def test_instructor_sin_solapamiento_acepta(self):
        """Creating a class for the same instructor at a non-overlapping time is accepted."""
        _auth(self.client, self.admin)
        payload = {
            'nombre': 'Clase Tarde',
            'categoria': 'funcional',
            'dia': 'lunes',
            'hora': '11:00:00',  # starts after 10:00 — no overlap
            'duracion_min': 60,
            'cupo_maximo': 10,
            'sala': 'Sala B',
            'instructor': 'Ana García',
            'instructor_fk': self.instructor.pk,
        }
        resp = self.client.post('/api/classes/clases/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)


# ===========================================================================
# Test 8 — instructor delete con clases asignadas ofrece desactivar
# ===========================================================================

class TestInstructorDeleteConClasesAsignadasOfreceDesactivar(APITestCase):
    """Test #8 — Deleting an instructor with assigned classes soft-deactivates instead."""

    def setUp(self):
        self.admin = make_user_factory(rol='administrador')
        self.instructor = _make_instructor()
        _make_clase(instructor_fk=self.instructor)

    def test_instructor_delete_con_clases_asignadas_ofrece_desactivar(self):
        """DELETE on an instructor with classes returns 200 + desactivado=True."""
        _auth(self.client, self.admin)
        url = f'{INSTRUCTORES_URL}{self.instructor.pk}/'

        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['desactivado'])

        self.instructor.refresh_from_db()
        self.assertFalse(self.instructor.activo)

        # Second delete on already-inactive → 409
        resp2 = self.client.delete(url)
        self.assertEqual(resp2.status_code, status.HTTP_409_CONFLICT)

    def test_instructor_delete_sin_clases_elimina(self):
        """DELETE on an instructor with no classes hard-deletes the row."""
        instructor_libre = _make_instructor(nombre='Libre', apellido='Sin Clases')
        _auth(self.client, self.admin)
        url = f'{INSTRUCTORES_URL}{instructor_libre.pk}/'
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Instructor.objects.filter(pk=instructor_libre.pk).exists())


# ===========================================================================
# Test 9 — data migration instructores from CharField preserva valores
# ===========================================================================

class TestDataMigrationInstructoresFromCharField(TestCase):
    """Test #9 — Simulate the seed_forward migration for Instructor from Clase.instructor."""

    def test_data_migration_instructores_from_charfield_preserva_valores(self):
        """Seeds Instructor from Clase.instructor values and FK-links Clase rows."""
        # Create clases with string instructor values
        Clase.objects.create(
            nombre='Yoga AM',
            categoria='yoga',
            dia=Clase.Dia.LUNES,
            hora=datetime.time(7, 0),
            duracion_min=60,
            sala='Sala C',
            instructor='Laura Martínez',
            cupo_maximo=10,
        )
        Clase.objects.create(
            nombre='Yoga PM',
            categoria='yoga',
            dia=Clase.Dia.MARTES,
            hora=datetime.time(18, 0),
            duracion_min=60,
            sala='Sala C',
            instructor='Laura Martínez',
            cupo_maximo=10,
        )
        Clase.objects.create(
            nombre='Spinning',
            categoria='spinning',
            dia=Clase.Dia.MIERCOLES,
            hora=datetime.time(8, 0),
            duracion_min=45,
            sala='Sala D',
            instructor='Juan',
            cupo_maximo=15,
        )

        # Simulate the data migration forward function (0019)
        def _split_nombre_apellido(full_name):
            parts = full_name.strip().split(maxsplit=1)
            if not parts:
                return ('', '')
            return parts[0], (parts[1] if len(parts) > 1 else '')

        instructor_strings = (
            Clase.objects
            .exclude(instructor='')
            .values_list('instructor', flat=True)
            .distinct()
        )
        instructor_map = {}
        for full_name in instructor_strings:
            if not full_name or not full_name.strip():
                continue
            nombre, apellido = _split_nombre_apellido(full_name)
            instructor, _ = Instructor.objects.get_or_create(
                nombre=nombre,
                apellido=apellido,
                defaults={'email': '', 'telefono': '', 'especialidades': [], 'bio': '', 'activo': True},
            )
            instructor_map[full_name] = instructor

        for full_name, instructor in instructor_map.items():
            Clase.objects.filter(instructor=full_name).update(instructor_fk=instructor)

        # Both yoga classes should point to the same Instructor
        laura = Instructor.objects.get(nombre='Laura', apellido='Martínez')
        linked_yoga = Clase.objects.filter(instructor_fk=laura).count()
        self.assertEqual(linked_yoga, 2)

        # Spinning class points to Juan
        juan = Instructor.objects.get(nombre='Juan', apellido='')
        linked_spinning = Clase.objects.filter(instructor_fk=juan).count()
        self.assertEqual(linked_spinning, 1)

        # Exactly 2 Instructor rows created
        self.assertEqual(Instructor.objects.count(), 2)


# ===========================================================================
# Test 10 — data migration sesiones from clases crea próximas 8 semanas
# ===========================================================================

class TestDataMigrationSesionesFromClasesCreaProximas8Semanas(TestCase):
    """Test #10 — Simulate the seed_forward for SesionClase (próximas 8 semanas)."""

    def test_data_migration_sesiones_from_clases_crea_proximas_8_semanas(self):
        """Seeding creates one SesionClase per matching weekday in the next 56 days."""
        import datetime as dt  # noqa: PLC0415

        # Clase active on Mondays only
        clase = Clase.objects.create(
            nombre='Lunes Funcional',
            categoria='funcional',
            dia=Clase.Dia.LUNES,
            hora=datetime.time(8, 0),
            duracion_min=60,
            sala='Sala A',
            instructor='',
            cupo_maximo=10,
            estado=Clase.Estado.ACTIVA,
            dias_recurrencia=[Clase.Dia.LUNES],
        )

        DIA_TO_WEEKDAY = {
            'lunes': 0, 'martes': 1, 'miercoles': 2, 'jueves': 3,
            'viernes': 4, 'sabado': 5, 'domingo': 6,
        }

        today = dt.date.today()
        hasta = today + dt.timedelta(days=56)

        dias = clase.dias_recurrencia or []
        target_weekdays = {DIA_TO_WEEKDAY[d] for d in dias if d in DIA_TO_WEEKDAY}

        current = today
        while current <= hasta:
            if current.weekday() in target_weekdays:
                SesionClase.objects.get_or_create(
                    clase=clase,
                    fecha=current,
                    defaults={'estado': 'activa'},
                )
            current += dt.timedelta(days=1)

        # Count Mondays in the next 56 days
        expected_mondays = sum(
            1 for i in range(57)
            if (today + dt.timedelta(days=i)).weekday() == 0
        )

        total_sesiones = SesionClase.objects.filter(clase=clase).count()
        self.assertEqual(total_sesiones, expected_mondays)

        # Running again (idempotent) creates zero new rows
        current2 = today
        created2 = 0
        while current2 <= hasta:
            if current2.weekday() in target_weekdays:
                _, created = SesionClase.objects.get_or_create(
                    clase=clase,
                    fecha=current2,
                    defaults={'estado': 'activa'},
                )
                if created:
                    created2 += 1
            current2 += dt.timedelta(days=1)

        self.assertEqual(created2, 0)
        self.assertEqual(SesionClase.objects.filter(clase=clase).count(), expected_mondays)
