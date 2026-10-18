"""Data migration 0009: superseded `vencida` rows become `renovada` (and back on reverse)."""
from datetime import date, timedelta

import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor

def _targets(memberships_leaf):
    # Pin memberships only; every other app stays at its latest migration so the
    # historical models (Socio, User) match the real DB schema.
    leaves = MigrationExecutor(connection).loader.graph.leaf_nodes()
    return [n for n in leaves if n[0] != 'memberships'] + [('memberships', memberships_leaf)]


BEFORE = '0008_plan_franja_horaria_dias_habilitados'
AFTER = '0009_membresia_estado_renovada'


def _migrate(memberships_leaf):
    targets = _targets(memberships_leaf)
    executor = MigrationExecutor(connection)
    executor.migrate(targets)
    return executor.loader.project_state(targets).apps


@pytest.fixture
def migrated_back():
    """Yield the app registry at 0008; restore the latest state afterwards."""
    apps = _migrate(BEFORE)
    yield apps
    executor = MigrationExecutor(connection)
    executor.migrate(executor.loader.graph.leaf_nodes())


def _seed(apps):
    User = apps.get_model('users', 'User')
    Socio = apps.get_model('members', 'Socio')
    Plan = apps.get_model('memberships', 'PlanMembresia')
    Membresia = apps.get_model('memberships', 'Membresia')
    today = date.today()
    plan = Plan.objects.create(nombre='Mig', duracion_dias=30, precio='100.00')

    def socio(n):
        user = User.objects.create(email=f'mig{n}@test.com', username=f'mig{n}')
        return Socio.objects.create(usuario=user, dni=f'9000000{n}', nombre='A', apellido='B', numero_socio=f'M-{n}')

    def mem(s, estado, start, end):
        return Membresia.objects.create(
            socio=s, plan=plan, estado=estado,
            fecha_inicio=today + timedelta(days=start), fecha_fin=today + timedelta(days=end),
        )

    s1, s2 = socio(1), socio(2)
    return {
        # s1: superseded early (new one starts before the old one ends) -> renovada
        'superseded': mem(s1, 'vencida', -20, 10),
        'latest': mem(s1, 'activa', -5, 35),
        # s2: genuinely expired, then bought again after the gap -> stays vencida
        'expired': mem(s2, 'vencida', -90, -60),
        'repurchase': mem(s2, 'activa', -10, 20),
    }


@pytest.mark.django_db(transaction=True)
def test_forward_marks_only_overlapping_vencida_as_renovada(migrated_back):
    rows = _seed(migrated_back)

    apps = _migrate(AFTER)
    Membresia = apps.get_model('memberships', 'Membresia')
    estado = {k: Membresia.objects.get(pk=v.pk).estado for k, v in rows.items()}

    assert estado == {
        'superseded': 'renovada',
        'latest': 'activa',
        'expired': 'vencida',
        'repurchase': 'activa',
    }


@pytest.mark.django_db(transaction=True)
def test_forward_is_idempotent_and_reverse_restores_vencida(migrated_back):
    rows = _seed(migrated_back)
    apps = _migrate(AFTER)
    Membresia = apps.get_model('memberships', 'Membresia')

    # Re-running the RunPython directly must not change anything.
    import importlib
    mod = importlib.import_module('apps.memberships.migrations.0009_membresia_estado_renovada')
    mod.mark_superseded_as_renovada(apps, None)
    assert Membresia.objects.get(pk=rows['superseded'].pk).estado == 'renovada'

    apps = _migrate(BEFORE)
    Membresia = apps.get_model('memberships', 'Membresia')
    assert Membresia.objects.get(pk=rows['superseded'].pk).estado == 'vencida'
    assert Membresia.objects.get(pk=rows['expired'].pk).estado == 'vencida'
    assert Membresia.objects.get(pk=rows['latest'].pk).estado == 'activa'
