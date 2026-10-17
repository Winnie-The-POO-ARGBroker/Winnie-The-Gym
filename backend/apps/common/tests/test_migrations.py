"""Guard against model changes that were never turned into a migration.

Render applies `migrate` on every boot, so a model edited without a migration
only shows up in production as a warning ("have changes that are not yet
reflected in a migration") and, worse, as columns that do not match the code.
"""
import pytest
from django.core.management import call_command


@pytest.mark.django_db
def test_every_model_change_has_a_migration():
    # `--check` exits with status 1 when makemigrations would create a file.
    try:
        call_command('makemigrations', check=True, dry_run=True, interactive=False, verbosity=0)
    except SystemExit as exc:
        pytest.fail(
            'Models have changes without a migration; run `python manage.py makemigrations` '
            f'(exit code {exc.code}).'
        )
