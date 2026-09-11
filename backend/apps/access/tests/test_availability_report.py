import json
from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from apps.access.models import AccessLog


class AvailabilityReportCommandTests(TestCase):
    """Verifies the RNF06 availability calculation over AccessLog history."""

    def _create_log(self, status, access_type='ENTRY', denial_reason=None, when=None):
        log = AccessLog.objects.create(
            status=status,
            access_type=access_type,
            denial_reason=denial_reason,
        )
        if when is not None:
            AccessLog.objects.filter(pk=log.pk).update(timestamp=when)
        return log

    def test_all_granted_reports_100_percent(self):
        for _ in range(5):
            self._create_log('GRANTED')

        out = StringIO()
        call_command('availability_report', '--days', '30', '--json', stdout=out)
        result = json.loads(out.getvalue())

        self.assertEqual(result['granted'], 5)
        self.assertEqual(result['denied_infra'], 0)
        self.assertEqual(result['availability_percent'], 100.0)
        self.assertTrue(result['meets_target'])

    def test_business_denials_are_excluded_from_denominator(self):
        for _ in range(9):
            self._create_log('GRANTED')
        self._create_log('DENIED', denial_reason='MEMBERSHIP_INACTIVE')
        self._create_log('DENIED', denial_reason='REPLAY_ATTACK')

        out = StringIO()
        call_command('availability_report', '--days', '30', '--json', stdout=out)
        result = json.loads(out.getvalue())

        # 9 granted, 0 infra failures → 100% availability
        self.assertEqual(result['granted'], 9)
        self.assertEqual(result['denied_infra'], 0)
        self.assertEqual(result['denied_business_excluded'], 2)
        self.assertEqual(result['availability_percent'], 100.0)

    def test_infra_failure_lowers_availability(self):
        for _ in range(999):
            self._create_log('GRANTED')
        self._create_log('DENIED', denial_reason='TOKEN_EXPIRED')

        out = StringIO()
        call_command('availability_report', '--days', '30', '--json', stdout=out)
        result = json.loads(out.getvalue())

        # 999 / 1000 = 99.9% exact
        self.assertEqual(result['granted'], 999)
        self.assertEqual(result['denied_infra'], 1)
        self.assertAlmostEqual(result['availability_percent'], 99.9, places=1)
        self.assertTrue(result['meets_target'])

    def test_below_target_reports_meets_false(self):
        for _ in range(90):
            self._create_log('GRANTED')
        for _ in range(10):
            self._create_log('DENIED', denial_reason='TOKEN_EXPIRED')

        out = StringIO()
        call_command('availability_report', '--days', '30', '--json', stdout=out)
        result = json.loads(out.getvalue())

        self.assertEqual(result['availability_percent'], 90.0)
        self.assertFalse(result['meets_target'])

    def test_events_outside_window_are_ignored(self):
        old = timezone.now() - timedelta(days=45)
        self._create_log('GRANTED', when=old)
        self._create_log('GRANTED')

        out = StringIO()
        call_command('availability_report', '--days', '30', '--json', stdout=out)
        result = json.loads(out.getvalue())

        self.assertEqual(result['granted'], 1)

    def test_plain_output_prints_summary(self):
        self._create_log('GRANTED')
        out = StringIO()
        call_command('availability_report', '--days', '30', stdout=out)
        output = out.getvalue()
        self.assertIn('Availability', output)
        self.assertIn('99.9', output)
