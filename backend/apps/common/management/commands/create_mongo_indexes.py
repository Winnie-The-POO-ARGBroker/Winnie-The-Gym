from django.conf import settings
from django.core.management.base import BaseCommand
from pymongo import ASCENDING, DESCENDING

from core.mongodb import get_collection


DEFAULT_RETENTION_SECONDS = 90 * 24 * 60 * 60  # 90 days


class Command(BaseCommand):
    help = (
        'Create/refresh MongoDB indexes for qr_history and audit_logs '
        'collections, including TTL indexes for log retention.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--retention-days',
            type=int,
            default=None,
            help='Override retention window (default: MONGO_RETENTION_DAYS env or 90 days).',
        )

    def handle(self, *args, **options):
        retention_days = options['retention_days'] or getattr(
            settings, 'MONGO_RETENTION_DAYS', 90,
        )
        retention_seconds = retention_days * 24 * 60 * 60

        self.stdout.write(self.style.MIGRATE_HEADING(
            f'Configurando indexes MongoDB (retention: {retention_days} días)',
        ))

        self._ensure_indexes(
            'qr_history',
            performance_indexes=[
                ([('timestamp', DESCENDING)], 'qr_history_timestamp_desc'),
                ([('user_id', ASCENDING)], 'qr_history_user_id'),
                ([('qr_jti', ASCENDING)], 'qr_history_qr_jti'),
                ([('postgres_access_log_id', ASCENDING)], 'qr_history_pg_log_id'),
            ],
            ttl_field='timestamp',
            ttl_seconds=retention_seconds,
            ttl_name='qr_history_ttl',
        )

        self._ensure_indexes(
            'audit_logs',
            performance_indexes=[
                ([('timestamp', DESCENDING)], 'audit_logs_timestamp_desc'),
                ([('actor_id', ASCENDING)], 'audit_logs_actor_id'),
                ([('action', ASCENDING)], 'audit_logs_action'),
                ([('model', ASCENDING)], 'audit_logs_model'),
            ],
            ttl_field='timestamp',
            ttl_seconds=retention_seconds,
            ttl_name='audit_logs_ttl',
        )

        self.stdout.write(self.style.SUCCESS('Indexes MongoDB configurados correctamente.'))

    def _ensure_indexes(self, collection_name, performance_indexes, ttl_field, ttl_seconds, ttl_name):
        col = get_collection(collection_name)
        self.stdout.write(f'  → Coleccion: {collection_name}')

        for keys, name in performance_indexes:
            col.create_index(keys, name=name, background=True)
            self.stdout.write(f'      ✓ {name}')

        # TTL index (drop & recreate if window changed)
        existing = col.index_information().get(ttl_name)
        if existing and existing.get('expireAfterSeconds') != ttl_seconds:
            col.drop_index(ttl_name)
            existing = None
        if not existing:
            col.create_index(
                [(ttl_field, ASCENDING)],
                name=ttl_name,
                expireAfterSeconds=ttl_seconds,
                background=True,
            )
            self.stdout.write(f'      ✓ {ttl_name} (TTL {ttl_seconds}s)')
        else:
            self.stdout.write(f'      = {ttl_name} (ya existe)')
