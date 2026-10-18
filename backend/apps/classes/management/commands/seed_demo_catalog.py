"""Load the gym catalog: disciplines, rooms, instructors, plans and weekly classes.

Safe to run in production (it creates no users and never overwrites or deletes
anything) and idempotent: a second run only fills what is missing. Sessions are
generated from today up to `--hasta` (default: 31 December of the current year,
or of the next one when December is almost over).

    python manage.py seed_demo_catalog
    python manage.py seed_demo_catalog --hasta 2027-03-31

On Render it runs once at boot when SEED_DEMO_CATALOG=1 (see entrypoint.sh).
"""
import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify

from apps.classes.models import Clase, Disciplina, Instructor, Sala
from apps.classes.services import generar_sesiones
from apps.memberships.models import PlanMembresia

DISCIPLINAS = [
    ('Funcional', '#ff7043'),
    ('Spinning', '#29b6f6'),
    ('Crossfit', '#ef5350'),
    ('Pilates', '#ab47bc'),
    ('Yoga', '#66bb6a'),
    ('Boxeo', '#ffa726'),
    ('HIIT', '#ec407a'),
]

SALAS = [('Sala A', 30), ('Sala B', 20), ('Sala C', 15)]

# (nombre, apellido, especialidades)
INSTRUCTORES = [
    ('Carlos', 'R.', ['Funcional', 'Crossfit']),
    ('Sofia', 'L.', ['Spinning', 'Pilates']),
    ('Pedro', 'M.', ['Crossfit', 'Boxeo']),
    ('Ana', 'T.', ['Yoga', 'Pilates']),
]

# name, price (ARS), classes per month (0 = unlimited), popular, benefits
PLANES = [
    ('Básico', '18000', 8, False, [
        'Acceso a sala de musculación',
        '8 clases grupales por mes',
        'Credencial digital con QR',
    ]),
    ('Premium', '26000', 16, True, [
        'Acceso a sala de musculación',
        '16 clases grupales por mes',
        'Credencial digital con QR',
        'Reserva de clases con 7 días de anticipación',
    ]),
    ('Gold', '34000', 0, False, [
        'Acceso a sala de musculación',
        'Clases grupales ilimitadas',
        'Credencial digital con QR',
        'Reserva prioritaria y lista de espera',
        'Una evaluación física por mes',
    ]),
]

# nombre, disciplina, dias (L M X J V S D), hora, minutos, sala, instructor, cupo
CLASES = [
    ('Funcional Mañana', 'Funcional', ['L', 'X', 'V'], '07:00', 45, 'Sala A', 'Carlos R.', 25),
    ('Spinning Endurance', 'Spinning', ['M', 'J'], '08:00', 45, 'Sala B', 'Sofia L.', 18),
    ('Power Yoga', 'Yoga', ['M', 'J'], '09:30', 60, 'Sala C', 'Ana T.', 15),
    ('Pilates Reformer', 'Pilates', ['L', 'X', 'V'], '10:00', 50, 'Sala C', 'Sofia L.', 12),
    ('Funcional Mediodía', 'Funcional', ['L', 'X', 'V'], '12:30', 45, 'Sala A', 'Carlos R.', 25),
    ('Pilates Mat', 'Pilates', ['M', 'J'], '12:30', 45, 'Sala C', 'Ana T.', 15),
    ('Funcional Tarde', 'Funcional', ['L', 'M', 'J'], '17:00', 45, 'Sala A', 'Carlos R.', 25),
    ('Boxeo Técnico', 'Boxeo', ['M', 'J'], '18:00', 60, 'Sala A', 'Pedro M.', 20),
    ('HIIT Circuit', 'HIIT', ['X', 'V'], '18:30', 40, 'Sala A', 'Carlos R.', 22),
    ('Crossfit WOD', 'Crossfit', ['L', 'M', 'J'], '19:00', 60, 'Sala A', 'Pedro M.', 20),
    ('Spinning Nocturno', 'Spinning', ['L', 'X'], '20:00', 45, 'Sala B', 'Sofia L.', 18),
    ('Crossfit Sábado', 'Crossfit', ['S'], '09:00', 75, 'Sala A', 'Pedro M.', 20),
    ('Yoga Restaurativo', 'Yoga', ['S'], '10:00', 60, 'Sala C', 'Ana T.', 15),
    ('Spinning Fin de Semana', 'Spinning', ['S'], '11:00', 45, 'Sala B', 'Sofia L.', 18),
]

DIA_NOMBRE = {'L': 'lunes', 'M': 'martes', 'X': 'miercoles', 'J': 'jueves', 'V': 'viernes', 'S': 'sabado', 'D': 'domingo'}


def default_hasta(today):
    year = today.year if today <= datetime.date(today.year, 12, 15) else today.year + 1
    return datetime.date(year, 12, 31)


class Command(BaseCommand):
    help = 'Loads disciplines, rooms, instructors, plans and weekly classes with sessions (idempotent).'

    def add_arguments(self, parser):
        parser.add_argument('--hasta', help='Last day of generated sessions (YYYY-MM-DD).')

    def handle(self, *args, **options):
        today = timezone.localdate()
        hasta = datetime.date.fromisoformat(options['hasta']) if options.get('hasta') else default_hasta(today)

        disciplinas = {}
        for nombre, color in DISCIPLINAS:
            disciplina, _ = Disciplina.objects.get_or_create(
                slug=slugify(nombre), defaults={'nombre': nombre, 'color_hex': color},
            )
            disciplinas[nombre] = disciplina

        salas = {
            nombre: Sala.objects.get_or_create(nombre=nombre, defaults={'capacidad': capacidad})[0]
            for nombre, capacidad in SALAS
        }

        instructores = {}
        for nombre, apellido, especialidades in INSTRUCTORES:
            instructor, _ = Instructor.objects.get_or_create(
                nombre=nombre, apellido=apellido, defaults={'especialidades': especialidades},
            )
            instructores[f'{nombre} {apellido}'] = instructor

        planes_creados = 0
        for nombre, precio, clases, popular, beneficios in PLANES:
            _, created = PlanMembresia.objects.get_or_create(
                nombre=nombre,
                defaults={
                    'subtitulo': 'Membresía mensual',
                    'duracion_dias': 30,
                    'precio': Decimal(precio),
                    'clases_asignadas': clases,
                    'es_popular': popular,
                    'beneficios': beneficios,
                },
            )
            planes_creados += int(created)
        nombres_planes = [p[0] for p in PLANES]

        clases_creadas = sesiones = 0
        for nombre, disciplina, dias, hora, minutos, sala, instructor, cupo in CLASES:
            clase, created = Clase.objects.get_or_create(
                nombre=nombre,
                defaults={
                    'categoria': disciplina.lower(),
                    'disciplina_fk': disciplinas[disciplina],
                    'descripcion': f'{disciplina} grupal. Cupos limitados, reservá desde la app.',
                    'dia': DIA_NOMBRE[dias[0]],
                    'hora': datetime.time.fromisoformat(hora),
                    'duracion_min': minutos,
                    'sala': sala,
                    'sala_fk': salas[sala],
                    'instructor': instructor,
                    'instructor_fk': instructores[instructor],
                    'cupo_maximo': cupo,
                    'lista_espera_max': 5,
                    'cancelacion_horas': 2,
                    'planes_habilitados': nombres_planes,
                    'recurrencia': 'Semanal - ' + '/'.join(dias),
                    'dias_recurrencia': dias,
                },
            )
            clases_creadas += int(created)
            if clase.estado == Clase.Estado.ACTIVA:
                sesiones += generar_sesiones(clase, today, hasta)

        self.stdout.write(self.style.SUCCESS(
            f'Catálogo listo: {planes_creados} planes y {clases_creadas} clases nuevas, '
            f'{sesiones} sesiones nuevas hasta {hasta.isoformat()}.'
        ))
