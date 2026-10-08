"""Benchmark test for QR scan validation endpoint (RNF01 / CP-S3-03).

RNF01: El tiempo de respuesta del backend para autorizar o denegar el
acceso tras la lectura del código QR no debe ser mayor a 2 segundos.

CP-S3-03 (Matriz de Trazabilidad): "Validación de token en <2s".

This test exercises the real `/api/access/qr/scan/` endpoint through the
DRF test client, measuring end-to-end latency across multiple iterations
and asserting that the worst-case latency stays under the 2000ms SLA.

Methodology:
- 10 iterations (each generates a fresh token because tokens are
  single-use via the anti-replay consume path).
- `time.perf_counter()` wraps only the HTTP call, not setup.
- `has_active_membership` is mocked to True so each request takes the
  200 GRANTED path (production code path for a legitimate member).
- `log_qr_event` is mocked so Mongo audit I/O doesn't add
  non-deterministic latency; the metric isolates the backend compute +
  Postgres path.
- Both mean and worst-case are asserted under 2000ms. Worst-case is the
  real SLA; mean below SLA is a sanity check against regressions.

Reference: issue #105, RNF01, CP-S3-03.
"""
import time
from statistics import mean, median
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.access.utils import generate_dynamic_qr_token

User = get_user_model()

QR_SCAN_URL = '/api/access/qr/scan/'
SLA_MS = 2000  # RNF01: <2s
ITERATIONS = 10


class QRScanLatencyBenchmarkTests(TestCase):
    """RNF01 — validate the QR scan latency stays below the 2000ms SLA."""

    def setUp(self):
        self.socio = User.objects.create_user(
            username='bench_socio',
            email='bench_socio@test.local',
            password='Pass1234!',
            rol='socio',
        )
        self.recep = User.objects.create_user(
            username='bench_recep',
            email='bench_recep@test.local',
            password='Pass1234!',
            rol='recepcionista',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.recep)

    @patch('apps.access.views.has_active_membership', return_value=True)
    @patch('apps.access.tasks.log_qr_event')
    def test_qr_scan_worst_case_latency_under_2s_sla(self, mock_log, mock_has_active):
        """Worst-case latency of /qr/scan/ over ITERATIONS runs must stay
        under 2000ms (RNF01, CP-S3-03).

        If this test ever starts flaking, inspect the mean/median first — a
        sudden regression typically shows as elevated mean, while worst-case
        spikes alone are usually CI runner noise.
        """
        latencies_ms = []

        for i in range(ITERATIONS):
            token_data = generate_dynamic_qr_token(self.socio)
            payload = {
                'qr_token': token_data['qr_token'],
                'access_type': 'ENTRY',
            }

            start = time.perf_counter()
            response = self.client.post(QR_SCAN_URL, payload)
            elapsed_ms = (time.perf_counter() - start) * 1000
            latencies_ms.append(elapsed_ms)

            # Sanity: each iteration must take the production 200 path so we
            # are actually measuring the full validation + logging work, not
            # a short-circuit on error.
            self.assertEqual(
                response.status_code,
                status.HTTP_200_OK,
                msg=(
                    f'Iteration {i}: expected 200 GRANTED, got '
                    f'{response.status_code} with payload {response.data!r}. '
                    f'Benchmark results are meaningless if the request short-circuits.'
                ),
            )

        worst = max(latencies_ms)
        avg = mean(latencies_ms)
        med = median(latencies_ms)

        context = (
            f'QR scan latency over {ITERATIONS} iterations: '
            f'worst={worst:.1f}ms, median={med:.1f}ms, mean={avg:.1f}ms, '
            f'SLA={SLA_MS}ms (RNF01).'
        )

        self.assertLess(
            worst,
            SLA_MS,
            msg=f'Worst-case QR scan latency exceeded the RNF01 SLA. {context}',
        )

        self.assertLess(
            avg,
            SLA_MS,
            msg=(
                f'Mean QR scan latency exceeded the RNF01 SLA. If worst-case '
                f'is also high, this is a real regression; if only mean is '
                f'high but worst-case passes, inspect for a systemic slow-down. '
                f'{context}'
            ),
        )
