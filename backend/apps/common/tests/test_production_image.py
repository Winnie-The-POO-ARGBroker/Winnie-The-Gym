"""Static checks that the production image ships what it starts.

Render deploys failed at container start with `exec: honcho: not found`: the
CMD in Dockerfile.prod runs honcho, but only requirements/base.txt was
installed and honcho lives in requirements/production.txt. These tests read
the Dockerfile, the Procfile and the requirement files and compare them, so a
missing runtime dependency is caught in CI instead of in a failed deploy.
"""
import json
import re
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[3]
REQUIREMENTS_DIR = BACKEND_DIR / 'requirements'
DOCKERFILE = BACKEND_DIR / 'Dockerfile.prod'
PROCFILE = BACKEND_DIR / 'Procfile'


def _packages_in(requirements_file: Path, seen=None) -> set:
    """Package names declared in a requirements file, following `-r` includes."""
    seen = seen if seen is not None else set()
    if requirements_file in seen:
        return set()
    seen.add(requirements_file)
    names = set()
    for raw in requirements_file.read_text().splitlines():
        line = raw.split('#', 1)[0].strip()
        if not line:
            continue
        include = re.match(r'-r\s+(\S+)', line)
        if include:
            names |= _packages_in(requirements_file.parent / include.group(1), seen)
            continue
        names.add(re.split(r'[=<>!~\[; ]', line, maxsplit=1)[0].lower())
    return names


def _installed_by_dockerfile() -> set:
    """Packages installed by the `pip install -r <file>` steps of Dockerfile.prod."""
    installed = set()
    for requirements_path in re.findall(r'pip install[^\n]*?-r\s+(\S+)', DOCKERFILE.read_text()):
        installed |= _packages_in(BACKEND_DIR / requirements_path)
    return installed


def _dockerfile_cmd_executable() -> str:
    match = re.search(r'^CMD\s+(\[.*\])\s*$', DOCKERFILE.read_text(), re.M)
    return json.loads(match.group(1))[0]


def _procfile_executables() -> set:
    commands = {}
    for line in PROCFILE.read_text().splitlines():
        if line.strip() and not line.lstrip().startswith('#'):
            name, command = line.split(':', 1)
            commands[name.strip()] = command.split()[0]
    return set(commands.values())


def test_dockerfile_installs_the_executable_its_cmd_starts():
    # Arrange
    executable = _dockerfile_cmd_executable()

    # Act
    installed = _installed_by_dockerfile()

    # Assert
    assert executable in installed, (
        f'Dockerfile.prod CMD starts "{executable}" but the packages it installs '
        f'do not include it: {sorted(installed)[:5]}...'
    )


def test_dockerfile_installs_every_process_listed_in_the_procfile():
    # Arrange
    executables = _procfile_executables()

    # Act
    installed = _installed_by_dockerfile()

    # Assert: daphne and celery are published under the same name as their binary
    missing = sorted(executables - installed)
    assert not missing, f'Procfile starts {missing} but Dockerfile.prod does not install them'


def test_procfile_does_not_start_a_celery_worker():
    # A worker polls the Redis broker nonstop (about 8 commands per second) and
    # drained the free Upstash quota in under a day, which then crashed the
    # whole container. Tasks run eagerly instead: the beat executes the periodic
    # ones in its own process and the web process runs the rest.
    started = {
        line.split(':', 1)[0].strip()
        for line in PROCFILE.read_text().splitlines()
        if line.strip() and not line.lstrip().startswith('#')
    }

    assert started == {'web', 'beat'}


def test_render_health_check_uses_the_lightweight_probe():
    # /api/health/ pings Redis and Celery on every call; Render polls the health
    # check path continuously, which would burn the free Redis quota.
    blueprint_path = BACKEND_DIR.parent / 'render.yaml'
    if not blueprint_path.exists():
        pytest.skip('render.yaml is outside the backend build context (Docker mount)')
    blueprint = blueprint_path.read_text()
    match = re.search(r'^\s*healthCheckPath:\s*(\S+)', blueprint, re.M)

    assert match and match.group(1) == '/healthz'
