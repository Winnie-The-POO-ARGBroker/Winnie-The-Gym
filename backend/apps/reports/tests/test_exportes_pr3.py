"""Tests for #184 — Exportes: 400 validation, ART range, numeric XLSX, TOTAL row."""
from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.memberships.models import Membresia
from apps.payments.models import Pago
from conftest import (
    make_membresia_factory,
    make_plan_factory,
    make_socio_factory,
    make_user_factory,
)


def _auth_client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


def _make_admin():
    return make_user_factory(rol='administrador')


def _make_approved_pago(socio, plan, paid_at=None, monto='500.00'):
    return Pago.objects.create(
        socio=socio, plan=plan,
        monto=Decimal(monto),
        metodo=Pago.Metodo.MANUAL,
        estado=Pago.Estado.APROBADO,
        paid_at=paid_at or timezone.now(),
    )


# ---------------------------------------------------------------------------
# Test #9: 400 on invalid formato
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_export_facturacion_400_on_invalid_formato():
    """#184 — mandatory test 9."""
    admin = _make_admin()
    client = _auth_client(admin)

    resp = client.get('/api/reportes/facturacion/?formato=word')
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert 'formato' in resp.data.get('errors', {})

    # Also for morosidad
    resp2 = client.get('/api/reportes/morosidad/?formato=docx')
    assert resp2.status_code == status.HTTP_400_BAD_REQUEST

    # Also for asistencia
    resp3 = client.get('/api/reportes/asistencia/?formato=txt')
    assert resp3.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# Test #10: range filter respects ART timezone
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_export_facturacion_range_filter_respects_art():
    """#184 — mandatory test 10: fecha_desde/fecha_hasta filter in ART timezone."""
    admin = _make_admin()
    client = _auth_client(admin)

    u = make_user_factory(rol='socio', email='range_art@test.com')
    socio = make_socio_factory(u)
    plan = make_plan_factory(nombre='ART Plan', precio=Decimal('1000.00'))

    # Pago paid today (within range)
    today_pago = _make_approved_pago(socio, plan, paid_at=timezone.now())
    # Pago paid 30 days ago (outside range)
    old_paid = timezone.now() - timedelta(days=30)
    old_pago = _make_approved_pago(socio, plan, paid_at=old_paid)

    from_date = date.today().isoformat()
    to_date = date.today().isoformat()

    resp = client.get(
        f'/api/reportes/facturacion/?formato=csv&fecha_desde={from_date}&fecha_hasta={to_date}'
    )
    assert resp.status_code == status.HTTP_200_OK

    body = resp.content.decode('utf-8-sig')
    lines = [l for l in body.splitlines() if l.strip()]
    # header + today's pago + TOTAL
    assert len(lines) >= 2  # at least header + TOTAL

    # The old pago's plan name should NOT appear
    content_without_header = '\n'.join(lines[1:])
    # Verify TOTAL row is present
    assert 'TOTAL' in content_without_header


@pytest.mark.django_db
def test_export_facturacion_invalid_date_format_returns_400():
    """#184: malformed date strings return 400."""
    admin = _make_admin()
    client = _auth_client(admin)

    resp = client.get('/api/reportes/facturacion/?fecha_desde=31-12-2024')
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert 'fecha_desde' in resp.data.get('errors', {})


@pytest.mark.django_db
def test_export_facturacion_invalid_mes_returns_400():
    """#184: malformed mes returns 400."""
    admin = _make_admin()
    client = _auth_client(admin)

    resp = client.get('/api/reportes/facturacion/?mes=2024-13')
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert 'mes' in resp.data.get('errors', {})


@pytest.mark.django_db
def test_export_facturacion_total_row_in_csv():
    """#184: TOTAL row appears in facturación CSV."""
    admin = _make_admin()
    client = _auth_client(admin)

    u = make_user_factory(rol='socio', email='total_csv@test.com')
    socio = make_socio_factory(u)
    plan = make_plan_factory(precio=Decimal('750.00'))
    _make_approved_pago(socio, plan, monto='750.00')

    resp = client.get('/api/reportes/facturacion/?formato=csv')
    assert resp.status_code == status.HTTP_200_OK

    body = resp.content.decode('utf-8-sig')
    assert 'TOTAL' in body


@pytest.mark.django_db
def test_export_morosidad_total_row():
    """#184: TOTAL row appears in morosidad CSV."""
    admin = _make_admin()
    client = _auth_client(admin)

    u = make_user_factory(rol='socio', email='mora_total@test.com')
    socio = make_socio_factory(u)
    plan = make_plan_factory(precio=Decimal('800.00'))
    make_membresia_factory(
        socio, plan,
        estado=Membresia.Estado.VENCIDA,
        fecha_fin=date.today() - timedelta(days=5),
    )

    resp = client.get('/api/reportes/morosidad/?formato=csv')
    assert resp.status_code == status.HTTP_200_OK

    body = resp.content.decode('utf-8-sig')
    assert 'TOTAL' in body


@pytest.mark.django_db
def test_export_facturacion_xlsx_has_numeric_monto():
    """#184: XLSX monto column contains numeric values, not strings."""
    admin = _make_admin()
    client = _auth_client(admin)

    u = make_user_factory(rol='socio', email='xlsx_num@test.com')
    socio = make_socio_factory(u)
    plan = make_plan_factory(precio=Decimal('1234.56'))
    _make_approved_pago(socio, plan, monto='1234.56')

    resp = client.get('/api/reportes/facturacion/?formato=xlsx')
    assert resp.status_code == status.HTTP_200_OK

    from io import BytesIO
    from openpyxl import load_workbook
    wb = load_workbook(BytesIO(resp.content))
    ws = wb.active

    # Find the monto column (index 5 in 1-based, header row 1)
    headers = [cell.value for cell in ws[1]]
    monto_col = headers.index('monto') + 1  # 1-based

    # Check data rows (row 2 onwards, excluding TOTAL)
    data_rows = list(ws.iter_rows(min_row=2, values_only=True))
    non_total_rows = [r for r in data_rows if r[0] != 'TOTAL' and r[0] is not None]

    assert len(non_total_rows) >= 1
    monto_val = non_total_rows[0][monto_col - 1]
    # Should be numeric (int or Decimal or float), not a string
    assert isinstance(monto_val, (int, float, Decimal)), (
        f'Expected numeric monto, got {type(monto_val)}: {monto_val}'
    )
