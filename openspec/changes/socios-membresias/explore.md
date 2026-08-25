# Exploration: socios-membresias

## Current State

### User model (`apps/users/models.py`)
- Extends `AbstractUser`, `USERNAME_FIELD = 'email'`
- Fields: `email` (unique), `google_id`, `rol` (administrador/recepcionista/socio), `foto`
- `is_profile_complete` property: checks `hasattr(self, 'socio')`

### Socio model (`apps/members/models.py`)
- `OneToOneField → AUTH_USER_MODEL`, related_name='socio', CASCADE
- Fields: `dni` (unique), `nombre`, `apellido`, `telefono`, `certificado_medico_url`, `created_at`
- **Missing**: `estado`, `fecha_baja`, `updated_at`, `numero_socio`, `observaciones`
- 2 migrations applied (0001 + 0002)

### Memberships app (`apps/memberships/`)
- `models.py` — empty
- `views.py` — stub only
- `urls.py` — empty urlpatterns
- **Zero migrations**
- No serializers, no tests

### Members app (`apps/members/`)
- Model exists and has migrations
- `views.py` — stub only
- `urls.py` — empty
- No serializers, no tests

## Critical Blocker
`has_active_membership(user)` in `apps/access/services.py` returns `False` unconditionally.
**Every QR scan results in MEMBERSHIP_INACTIVE denial. Access system is broken.**

## What's Missing
- `api/members/` and `api/memberships/` not registered in `core/urls.py`
- No serializers in either app
- No views logic in either app
- No tests in either app
- `PlanMembresia` and `Membresia` models don't exist

## Conventions to Follow
- Tests: `APITestCase` + helper functions (`_make_user`, `_make_socio`)
- Views: `generics.*` for CRUD, `APIView` for custom logic
- Permissions: extend `IsReceptionistOrAdmin` pattern
- Serializers: `ModelSerializer` + `SerializerMethodField` for computed fields

## Recommendation
Implement full scope in one pass (members CRUD + memberships models + service fix).
`apps/memberships` has zero migrations — no squash risk.

## Risks
- Production data in Socio table — new fields need `null=True` or `default`
- No conftest.py / pytest fixtures — use Django TestCase pattern
- `makemigrations` required before any memberships query
