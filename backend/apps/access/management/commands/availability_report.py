"""RNF06 availability calculator over a rolling window of AccessLog events.

Approximates availability as:
    availability = GRANTED / (GRANTED + DENIED[reason ∈ infra])

where `infra` reasons are the ones that indicate a technical failure of the
system, not a business-legit denial:
  - TOKEN_EXPIRED (usually a slow generation → validation round-trip)

Business-legit denials (excluded from the denominator):
  - MEMBERSHIP_INACTIVE, NO_MEMBERSHIP, USER_SUSPENDED, REPLAY_ATTACK,
    INVALID_SIGNATURE, INVALID_TOKEN, UNKNOWN_USER

This is a proxy — for real production availability tracking use UptimeRobot
(external) or Sentry crons. The report is enough to defend RNF06 during the
academic presentation.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from django.utils import timezone

from apps.access.models import AccessLog


INFRA_DENIAL_REASONS = {'TOKEN_EXPIRED'}


class Command(BaseCommand):
    help = 'Report simulated availability of the QR access module (RNF06).'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=30, help='Rolling window in days (default: 30).')
        parser.add_argument('--json', action='store_true', help='Emit machine-readable JSON.')

    def handle(self, *args, **options):
        window = timedelta(days=options['days'])
        since = timezone.now() - window

        qs = AccessLog.objects.filter(timestamp__gte=since)
        totals = qs.aggregate(
            granted=Count('id', filter=Q(status='GRANTED')),
            denied_infra=Count(
                'id',
                filter=Q(status='DENIED', denial_reason__in=INFRA_DENIAL_REASONS),
            ),
            denied_business=Count(
                'id',
                filter=Q(status='DENIED') & ~Q(denial_reason__in=INFRA_DENIAL_REASONS),
            ),
        )
        granted = totals['granted'] or 0
        denied_infra = totals['denied_infra'] or 0
        denied_business = totals['denied_business'] or 0
        successful = granted
        counted = granted + denied_infra
        availability = (successful / counted * 100) if counted else 100.0

        result = {
            'window_days': options['days'],
            'since': since.isoformat(),
            'until': timezone.now().isoformat(),
            'granted': granted,
            'denied_infra': denied_infra,
            'denied_business_excluded': denied_business,
            'availability_percent': round(availability, 4),
            'target_percent': 99.9,
            'meets_target': availability >= 99.9,
        }

        if options['json']:
            import json
            self.stdout.write(json.dumps(result, indent=2))
            return

        self.stdout.write(self.style.MIGRATE_HEADING(
            f'RNF06 — Disponibilidad simulada últimos {options["days"]} días',
        ))
        self.stdout.write(f'  GRANTED:                 {granted}')
        self.stdout.write(f'  DENIED (infra):          {denied_infra}')
        self.stdout.write(f'  DENIED (business skip):  {denied_business}')
        self.stdout.write(f'  Availability:            {availability:.4f}%')
        self.stdout.write(f'  Target RNF06:            99.9%')
        style = self.style.SUCCESS if result['meets_target'] else self.style.WARNING
        self.stdout.write(style(f'  Cumple: {"SI" if result["meets_target"] else "NO"}'))
