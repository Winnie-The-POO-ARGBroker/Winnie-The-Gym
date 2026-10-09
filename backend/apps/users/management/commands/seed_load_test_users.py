"""Management command: seed_load_test_users.

Generates synthetic users for load testing with Faker.
Configurable volume (--count), cleanup before seeding (--purge), and custom email prefix (--prefix).
Enforces DEBUG=True guardrail to prevent accidental production execution.
"""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model

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

        if purge:
            purged_users = User.objects.filter(
                email__startswith=prefix,
                email__endswith='@loadtest.local',
            )
            deleted_count, _ = purged_users.delete()
            self.stdout.write(
                f'Purged existing load test users matching {prefix}*@loadtest.local ({deleted_count} records deleted).'
            )

        self.stdout.write(f'Ready to seed {count} load test users with prefix "{prefix}".')
