"""Management command: cleanup_orphan_socios.

Detecta y elimina registros de `Socio` donde el usuario asociado (`usuario.rol`)
tiene un rol distinto a 'socio' (por ejemplo, 'administrador' o 'recepcionista').

Comportamiento:
- Por defecto opera en modo `--dry-run` (seguro), listando los registros afectados
  sin ejecutar cambios en la base de datos.
- Requiere la bandera `--force` para ejecutar el borrado efectivo de los registros.
- Al invocar `delete()` sobre cada instancia de `Socio`, se disparan las señales
  `post_delete` de Django, registrando automáticamente la baja en la colección de
  auditoría de MongoDB (`audit_logs`) para mantener la trazabilidad completa (RNF04).
- Emite un reporte final detallando: total de socios encontrados, total borrados
  y la lista de IDs eliminados.
"""
import logging

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.members.models import Socio

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        'Detecta y elimina registros de Socio cuyo usuario asociado no tiene rol de "socio". '
        'Opera en modo dry-run por defecto. Usar --force para ejecutar.'
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

        orphans_qs = Socio.objects.exclude(usuario__rol='socio').select_related('usuario')
        orphans = list(orphans_qs)
        total_found = len(orphans)

        if not total_found:
            self.stdout.write(self.style.SUCCESS('No se encontraron socios huerfanos.'))
            return

        self.stdout.write(f'Encontrados {total_found} socios huerfanos:')
        for s in orphans:
            user_email = getattr(s.usuario, 'email', 'sin-email')
            user_rol = getattr(s.usuario, 'rol', 'desconocido')
            self.stdout.write(f'  Socio #{s.id} - user {user_email} (rol={user_rol})')

        if is_dry_run:
            self.stdout.write(self.style.WARNING(
                f'Dry-run: {total_found} socios huerfanos detectados. Ninguno borrado. Usa --force para ejecutar.'
            ))
            return

        deleted_ids = []
        with transaction.atomic():
            for s in orphans:
                socio_id = s.id
                user_email = getattr(s.usuario, 'email', 'sin-email')
                user_rol = getattr(s.usuario, 'rol', 'desconocido')
                s.delete()
                deleted_ids.append(socio_id)
                logger.info('Socio huerfano eliminado: id=%s user=%s (rol=%s)', socio_id, user_email, user_rol)

        self.stdout.write(self.style.SUCCESS(
            f'Borrados {len(deleted_ids)} socios. IDs eliminados: {deleted_ids}'
        ))
