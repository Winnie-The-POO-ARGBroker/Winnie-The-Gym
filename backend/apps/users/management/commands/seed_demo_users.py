"""Management command: seed_demo_users.

Creates 6 deterministic demo users for development purposes.
Idempotent: safe to run multiple times, will not create duplicates.
Aborts if DEBUG=False to prevent accidental prod execution.

Users created:
  1. admin@winnie.local             — administrador (superuser)
  2. recepcion@winnie.local         — recepcionista
  3. socio.activo@winnie.local      — socio + Socio record + Membresia activa
  4. socio.vencido@winnie.local     — socio + Socio record + Membresia vencida
  5. socio.nuevo@winnie.local       — socio + Socio record (sin membresia)
  6. socio.pendiente@winnie.local   — socio SIN Socio record (is_profile_complete=False
                                      so /completar-perfil first-login flow is exercisable)
"""
import os
from datetime import date, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model

from apps.members.models import Socio
from apps.memberships.models import Membresia, PlanMembresia

User = get_user_model()

DEMO_USERS = [
    {
        'email': 'admin@winnie.local',
        'rol': 'administrador',
        'is_staff': True,
        'is_superuser': True,
    },
    {
        'email': 'recepcion@winnie.local',
        'rol': 'recepcionista',
        'is_staff': False,
        'is_superuser': False,
    },
    {
        'email': 'socio.activo@winnie.local',
        'rol': 'socio',
        'is_staff': False,
        'is_superuser': False,
        'socio': {
            'nombre': 'Carlos',
            'apellido': 'Activo',
            'dni': '11111111',
            'telefono': '5491100000011',
        },
        'membresia': 'activa',
    },
    {
        'email': 'socio.vencido@winnie.local',
        'rol': 'socio',
        'is_staff': False,
        'is_superuser': False,
        'socio': {
            'nombre': 'Diana',
            'apellido': 'Vencida',
            'dni': '22222222',
            'telefono': '5491100000022',
        },
        'membresia': 'vencida',
    },
    {
        'email': 'socio.nuevo@winnie.local',
        'rol': 'socio',
        'is_staff': False,
        'is_superuser': False,
        'socio': {
            'nombre': 'Eduardo',
            'apellido': 'Nuevo',
            'dni': '33333333',
            'telefono': '5491100000033',
        },
        'membresia': None,
    },
    {
        # No 'socio' key on purpose: user exists but has no Socio record,
        # so is_profile_complete returns False and the ProtectedRoute
        # redirects to /completar-perfil on first login.
        'email': 'socio.pendiente@winnie.local',
        'rol': 'socio',
        'is_staff': False,
        'is_superuser': False,
        'membresia': None,
    },
]


class Command(BaseCommand):
    help = (
        'Seed 5 demo users for development (idempotent). '
        'Aborts if DEBUG=False.'
    )

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError(
                'seed_demo_users is only allowed when DEBUG=True. '
                'Refusing to run in production.'
            )

        password = os.environ.get('DEMO_USER_PASSWORD', 'Demo1234!')

        # Ensure a demo plan exists for socio memberships
        plan, _ = PlanMembresia.objects.get_or_create(
            nombre='Plan Demo',
            defaults={
                'duracion_dias': 30,
                'precio': '0.00',
                'clases_asignadas': 0,
                'activo': True,
            },
        )

        created_count = 0
        for spec in DEMO_USERS:
            email = spec['email']
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'rol': spec['rol'],
                    'is_staff': spec['is_staff'],
                    'is_superuser': spec['is_superuser'],
                },
            )
            if created:
                user.set_password(password)
                user.save()
                created_count += 1
                self.stdout.write(f'  Created user: {email}')
            else:
                # Ensure password is always set (re-run scenario)
                user.set_password(password)
                user.is_staff = spec['is_staff']
                user.is_superuser = spec['is_superuser']
                user.rol = spec['rol']
                user.save()
                self.stdout.write(f'  Updated user: {email}')

            # Handle Socio record for socio-role users
            if spec.get('socio'):
                socio_data = spec['socio']
                socio, socio_created = Socio.objects.get_or_create(
                    usuario=user,
                    defaults=socio_data,
                )
                if socio_created:
                    self.stdout.write(f'    -> Socio record created: {socio_data["nombre"]}')

                # Handle Membresia
                membresia_estado = spec.get('membresia')
                if membresia_estado == 'activa':
                    Membresia.objects.get_or_create(
                        socio=socio,
                        plan=plan,
                        defaults={
                            'fecha_inicio': date.today() - timedelta(days=5),
                            'fecha_fin': date.today() + timedelta(days=25),
                            'estado': Membresia.Estado.ACTIVA,
                        },
                    )
                elif membresia_estado == 'vencida':
                    Membresia.objects.get_or_create(
                        socio=socio,
                        plan=plan,
                        defaults={
                            'fecha_inicio': date.today() - timedelta(days=35),
                            'fecha_fin': date.today() - timedelta(days=5),
                            'estado': Membresia.Estado.VENCIDA,
                        },
                    )

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. {created_count} user(s) newly created (others already existed). '
            f'Password for all: {password}'
        ))
