"""Management command: seed_load_test_users.

Generates synthetic users for load testing with Faker.
Configurable volume (--count), cleanup before seeding (--purge), and custom email prefix (--prefix).
Enforces DEBUG=True guardrail to prevent accidental production execution.
Idempotent: safe to run multiple times with the same count without duplicates.
"""
from datetime import date, timedelta
from decimal import Decimal
import os
import random

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from faker import Faker

from apps.members.models import Socio
from apps.memberships.models import Membresia, PlanMembresia

User = get_user_model()


class Command(BaseCommand):
    help = (
        'Seed synthetic users for load testing using Faker. '
        'Aborts if DEBUG=False.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=100,
            help='Number of load test users to generate (default: 100).',
        )
        parser.add_argument(
            '--purge',
            action='store_true',
            default=False,
            help='Delete existing load test users matching prefix before seeding.',
        )
        parser.add_argument(
            '--prefix',
            type=str,
            default='loadtest_',
            help='Prefix for load test user emails (default: "loadtest_").',
        )

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError(
                'seed_load_test_users is only allowed when DEBUG=True. '
                'Refusing to run in production.'
            )

        count = options['count']
        if count < 1:
            raise CommandError('--count must be at least 1.')

        purge = options['purge']
        prefix = options['prefix']
        password = os.environ.get('LOAD_TEST_PASSWORD', 'LoadTest123!')

        if purge:
            purged_users = User.objects.filter(
                email__startswith=prefix,
                email__endswith='@loadtest.local',
            )
            deleted_count, _ = purged_users.delete()
            self.stdout.write(
                f'Purged existing load test users matching {prefix}*@loadtest.local ({deleted_count} records deleted).'
            )

        try:
            fake = Faker(['es_AR', 'es_ES'])
        except Exception:
            fake = Faker()

        # Ensure active membership plans exist for socio accounts
        planes = list(PlanMembresia.objects.filter(activo=True))
        if not planes:
            default_plan, _ = PlanMembresia.objects.get_or_create(
                nombre='Plan Load Test',
                defaults={
                    'duracion_dias': 30,
                    'precio': Decimal('15000.00'),
                    'clases_asignadas': 12,
                    'activo': True,
                },
            )
            planes = [default_plan]

        # Calculate role distribution: 90% socio, 8% recepcionista, 2% administrador
        admin_count = int(round(count * 0.02))
        recep_count = int(round(count * 0.08))
        if count >= 50 and admin_count == 0:
            admin_count = 1
        if count >= 12 and recep_count == 0:
            recep_count = 1

        users_created = 0
        socios_created = 0
        membresias_created = 0

        for i in range(count):
            if i < admin_count:
                rol = User.Rol.ADMINISTRADOR
                is_staff = True
                is_superuser = True
            elif i < admin_count + recep_count:
                rol = User.Rol.RECEPCIONISTA
                is_staff = False
                is_superuser = False
            else:
                rol = User.Rol.SOCIO
                is_staff = False
                is_superuser = False

            email = f'{prefix}{i:05d}@loadtest.local'
            first_name = fake.first_name()
            last_name = fake.last_name()

            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'rol': rol,
                    'is_staff': is_staff,
                    'is_superuser': is_superuser,
                },
            )

            if created:
                user.set_password(password)
                user.save()
                users_created += 1
            else:
                user.set_password(password)
                user.first_name = first_name
                user.last_name = last_name
                user.rol = rol
                user.is_staff = is_staff
                user.is_superuser = is_superuser
                user.save()

            if rol == User.Rol.SOCIO:
                dni = f'{40000000 + i}'
                telefono = f'54911{40000000 + i}'

                socio, socio_created = Socio.objects.get_or_create(
                    usuario=user,
                    defaults={
                        'nombre': first_name,
                        'apellido': last_name,
                        'dni': dni,
                        'telefono': telefono,
                    },
                )
                if socio_created:
                    socios_created += 1

                # Ensure active membership exists
                if not Membresia.objects.filter(socio=socio, estado=Membresia.Estado.ACTIVA).exists():
                    plan = random.choice(planes)
                    start_offset = random.randint(1, 15)
                    fecha_inicio = date.today() - timedelta(days=start_offset)
                    fecha_fin = fecha_inicio + timedelta(days=plan.duracion_dias)
                    if fecha_fin <= date.today():
                        fecha_fin = date.today() + timedelta(days=15)

                    Membresia.objects.create(
                        socio=socio,
                        plan=plan,
                        fecha_inicio=fecha_inicio,
                        fecha_fin=fecha_fin,
                        estado=Membresia.Estado.ACTIVA,
                    )
                    membresias_created += 1

        self.stdout.write(self.style.SUCCESS(
            f'Successfully seeded load test users.\n'
            f'Total targeted: {count} (Admins: {admin_count}, Recepcionistas: {recep_count}, Socios: {count - admin_count - recep_count})\n'
            f'New users created: {users_created} | New socios created: {socios_created} | New memberships: {membresias_created}\n'
            f'Password for all: {password}'
        ))
