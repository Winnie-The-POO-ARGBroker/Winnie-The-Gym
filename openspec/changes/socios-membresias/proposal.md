# Proposal: Socios & Membresias Management

## Intent

The gym access system is currently broken: `has_active_membership(user)` in `apps/access/services.py` returns `False` unconditionally, so every QR scan denies entry with `MEMBERSHIP_INACTIVE`. There is no backend to manage members (socios), plans, or memberships — the `memberships` app is empty (no models, no migrations, no views) and `members` has a bare `Socio` model without lifecycle state. This change delivers the backend needed to onboard socios, sell/renew memberships, and grant real access at the door.

## Scope

### In Scope
- `Socio` model extension: `numero_socio` (auto-generated sequence, e.g. `S-00001`), `estado` (`activo`/`suspendido`/`baja`), `fecha_baja`, `updated_at`, `observaciones`.
- `PlanMembresia` model: `nombre`, `duracion_dias` (30/365), `precio`, `clases_asignadas`, `activo`.
- `Membresia` model: `socio`, `plan`, `fecha_inicio`, `fecha_fin`, `estado` (`activa`/`vencida`/`suspendida`/`cancelada`; `pendiente_pago` hook reserved).
- Fix `has_active_membership(user)` — lazy expiry check at scan time; no Celery.
- REST endpoints (DRF): CRUD for socios, plans, memberships; self-service `GET /me` + `POST /me/renew` for socio role.
- Permission matrix: admin/recepcionista full CRUD; socio read-own + renew-own.
- Safe additive migrations for the existing `Socio` production data.
- pytest `APITestCase` coverage (Strict TDD — tests first).

### Out of Scope
- Payment gateway integration (`pendiente_pago` is a schema hook only).
- Celery / scheduled jobs for auto-suspension (mora suspension is manual by admin/recep).
- Frontend UI (consumed by another team).
- Class enrollment logic itself (this change only exposes `clases_asignadas` on the plan).
- Notifications (email/SMS on expiry).

## Capabilities

### New Capabilities
- `members-management`: CRUD and lifecycle for `Socio` (numero_socio, estado, baja).
- `memberships-management`: CRUD for `PlanMembresia` and `Membresia`, renewal flow, socio self-service.
- `access-membership-check`: real `has_active_membership` used by QR scan.

### Modified Capabilities
- None (access service exists but has no spec yet; treated as new capability spec).

## Approach

1. Extend `Socio` with additive nullable/default fields; data migration to backfill `numero_socio` and set `estado='activo'`.
2. Create `PlanMembresia` and `Membresia` models in `apps/memberships/` with first migration.
3. Serializers + `generics.*` views per convention; custom `APIView` for `/me/renew`.
4. Register `api/members/` and `api/memberships/` in `core/urls.py`.
5. Rewrite `has_active_membership` to query `Membresia.objects.filter(socio__user=user, estado='activa', fecha_fin__gte=today)`, marking expired rows `vencida` on read (lazy).
6. Renewal: mark previous membership `vencida`, create new `activa` with `fecha_fin = today + plan.duracion_dias`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/members/models.py` | Modified | New fields on `Socio`; auto-sequence for `numero_socio`. |
| `apps/members/{serializers,views,urls,tests}.py` | New | CRUD + permissions + tests. |
| `apps/memberships/models.py` | New | `PlanMembresia`, `Membresia`. |
| `apps/memberships/{serializers,views,urls,tests}.py` | New | CRUD, `/me`, `/me/renew`. |
| `apps/access/services.py` | Modified | Real `has_active_membership` implementation. |
| `core/urls.py` | Modified | Register `api/members/` and `api/memberships/`. |
| Migrations | New | `members/0003_*`, `memberships/0001_initial`. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Production `Socio` rows break on migration | Med | Additive-only, `null=True`/`default`, data migration to backfill `numero_socio` and `estado`. |
| `pendiente_pago` state hardcoded before gateway exists | Low | Include value in `estado` choices but do not use it in flows; document as reserved. |
| Race on `numero_socio` sequence under concurrent creates | Low | Use DB sequence or `select_for_update` on a counter row. |
| Lazy expiry silently mutates rows during a GET | Low | Perform expiry marking inside a small transaction; log the state change. |

## Rollback Plan

- Revert `core/urls.py` to unregister the new API roots.
- `migrate members 0002` and `migrate memberships zero` (memberships has no prior state).
- Restore prior stub of `has_active_membership` (returns `False`) — QR access returns to its current broken-but-known behavior.
- New fields on `Socio` are additive with defaults, so rollback does not require data loss beyond the new fields.

## Dependencies

- Existing `users.User` (rol field already supports `administrador`/`recepcionista`/`socio`).
- Existing `IsReceptionistOrAdmin` permission pattern to extend for socio self-service.

## Success Criteria

- [ ] QR scan for a socio with an `activa`, non-expired `Membresia` returns access granted.
- [ ] Admin/recepcionista can create, list, retrieve, update, and soft-baja a `Socio` via API.
- [ ] Admin/recepcionista can CRUD `PlanMembresia` and `Membresia`.
- [ ] A socio can `GET /me` and `POST /me/renew`; renewal activates immediately and marks previous membership `vencida`.
- [ ] All new endpoints covered by `APITestCase` tests written before implementation (Strict TDD).
- [ ] Migrations apply cleanly against a copy of production data with no row loss.
