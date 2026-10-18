"""Regression tests for the production settings module.

`core.settings.production` mutates shared state from `core.settings.base` on
import (e.g. LOGGING), so it is evaluated in a subprocess to keep the test
process untouched.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[3]
PUBLIC_BASE = 'https://proj.supabase.co/storage/v1/object/public'

_SCRIPT = '''
import json, django
import core.settings.production as s
django.setup()
from django.core.files.storage import storages
print(json.dumps({
    "media_url": s.MEDIA_URL,
    "default_backend": s.STORAGES["default"]["BACKEND"],
    "staticfiles_backend": s.STORAGES["staticfiles"]["BACKEND"],
    "default_storage_class": type(storages["default"]).__name__,
    "celery_eager": s.CELERY_TASK_ALWAYS_EAGER,
    "anymail": s.ANYMAIL,
}))
'''


def _production_settings(**env_overrides):
    env = {
        **os.environ,
        'DJANGO_SETTINGS_MODULE': 'core.settings.production',
        'ALLOWED_HOSTS': 'api.example.test',
        'CORS_ALLOWED_ORIGINS': 'https://app.example.test',
        'SUPABASE_STORAGE_BUCKET': 'fichas-medicas',
    }
    env.pop('SUPABASE_STORAGE_PUBLIC_URL_BASE', None)
    env.update(env_overrides)
    result = subprocess.run(
        [sys.executable, '-c', _SCRIPT],
        cwd=BACKEND_DIR, env=env, capture_output=True, text=True, check=True,
    )
    return json.loads(result.stdout.strip().splitlines()[-1])


def test_media_url_ends_with_slash_when_public_base_has_none():
    # Arrange / Act
    media_url = _production_settings(SUPABASE_STORAGE_PUBLIC_URL_BASE=PUBLIC_BASE)['media_url']

    # Assert: Django's urls.E006 requires MEDIA_URL to end with a slash
    assert media_url.endswith('/')


@pytest.mark.parametrize('base', [PUBLIC_BASE, f'{PUBLIC_BASE}/'])
def test_media_url_points_at_the_bucket_like_the_storage_backend(base):
    media_url = _production_settings(SUPABASE_STORAGE_PUBLIC_URL_BASE=base)['media_url']

    # Same layout as SupabaseMediaStorage.url(): {base}/{bucket}/{name}
    assert media_url == f'{PUBLIC_BASE}/fichas-medicas/'


def test_media_url_keeps_local_default_when_public_base_is_not_set():
    media_url = _production_settings()['media_url']

    assert media_url == '/media/'


def test_default_file_storage_is_supabase():
    # Django >= 5.1 ignores DEFAULT_FILE_STORAGE: only STORAGES["default"] counts.
    settings = _production_settings(SUPABASE_STORAGE_PUBLIC_URL_BASE=PUBLIC_BASE)

    assert settings['default_backend'] == 'apps.common.storages.SupabaseMediaStorage'
    assert settings['default_storage_class'] == 'SupabaseMediaStorage'


def test_staticfiles_storage_is_left_unchanged():
    settings = _production_settings(SUPABASE_STORAGE_PUBLIC_URL_BASE=PUBLIC_BASE)

    assert settings['staticfiles_backend'] == 'django.contrib.staticfiles.storage.StaticFilesStorage'


def test_celery_tasks_run_eagerly_by_default_in_production():
    # The free Render plan has no background worker, and a worker polling the
    # Redis broker around the clock exhausts a free Upstash quota in a day.
    assert _production_settings()['celery_eager'] is True


def test_celery_eager_mode_can_be_turned_off_when_a_worker_exists():
    settings = _production_settings(CELERY_TASK_ALWAYS_EAGER='false')

    assert settings['celery_eager'] is False


def test_mailtrap_sandbox_is_off_by_default():
    # Without MAILTRAP_SANDBOX_ID mails are really sent
    anymail = _production_settings(MAILTRAP_SANDBOX_ID='')['anymail']

    assert 'MAILTRAP_SANDBOX_ID' not in anymail


def test_mailtrap_sandbox_id_is_read_as_an_int_when_set():
    # Anymail's Mailtrap backend switches to the sandbox API when this setting is present
    anymail = _production_settings(MAILTRAP_SANDBOX_ID='4321')['anymail']

    assert anymail['MAILTRAP_SANDBOX_ID'] == 4321
