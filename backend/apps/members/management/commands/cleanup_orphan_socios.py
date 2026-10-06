import logging

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        'Detecta y elimina registros de Socio cuyo usuario asociado no tiene rol de "socio". '
        'Opera en modo dry-run por defecto.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            default=False,
            help='Ejecuta el borrado real de los socios huerfanos. Si no se especifica, corre en modo dry-run.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            default=False,
            help='Fuerza la simulacion del borrado sin modificar la base de datos (comportamiento por defecto).',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        dry_run_flag = options.get('dry_run', False)
        is_dry_run = not force or dry_run_flag

        self.stdout.write(f'Iniciando cleanup_orphan_socios (modo: {"dry-run" if is_dry_run else "force"})...')
