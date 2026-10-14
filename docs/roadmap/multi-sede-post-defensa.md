# Multi-sede — Roadmap post-defensa

**Issue:** #216 BK-PLT-10  
**Status:** DEFERRED — scope XL, requires dedicated sprints after thesis defense  
**Decision date:** 2026-10-14

---

## Why deferred

Multi-sede is categorized as scope XL because it requires:

- Migrating 5+ core models (GymConfig, Socio, Membresia, AccessLog, PlanMembresia) to carry a `sede` FK.
- Coordinating access control (recepcionistas see only their sede), analytics (per-sede aforo/stats), and billing (plans scoped to sede).
- High migration risk on tables that are hot in production (AccessLog especially).

**Decision:** postpone until owner validation is complete and two dedicated sprints are allocated. This avoids shipping a half-baked multi-tenant layer that would require a painful rollback.

---

## Phase 1 — Model + migration (Sprint ~S6)

**Goal:** introduce the `Sede` entity and wire FKs without breaking existing single-sede behavior.

### New model: `Sede`

```python
class Sede(models.Model):
    nombre = models.CharField(max_length=100)
    direccion = models.CharField(max_length=200, blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    activa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### Migration steps

1. Create `Sede` table with a default "Sede principal" row (pk=1).
2. Add nullable `sede` FK to: `GymConfig`, `AccessLog`, `CierreGimnasio`, `Clase`, `Sala`.
3. Data migration: set `sede_id=1` on all existing rows.
4. Make `sede` non-nullable where semantically required (AccessLog, Clase).
5. Update `GymConfig` singleton logic to support per-sede config (or keep a single config with sede-level overrides as a JSONField).

**Risk:** `AccessLog` is an append-heavy table. The `NOT NULL` constraint migration must be a two-step deploy (add nullable → backfill → add NOT NULL).

---

## Phase 2 — Aforo + QR per sede (Sprint ~S7)

**Goal:** enforce aforo, horario, and cierre rules per sede; generate QR tokens that carry `sede_id`.

### Changes

- `GymConfigView` → add `?sede_id=` filter; admins see all, recepcionistas see their assigned sede.
- `check_aforo`, `check_horario`, `check_cierre_gimnasio` in `access/services.py` → accept `sede` argument and filter accordingly.
- `_process_scan` in `access/views.py` → resolve `sede` from the scanned QR token or from the recepcionista's assigned sede.
- QR token payload → add `sede_id` claim; `generate_dynamic_qr_token` must sign it.
- `AccessLog` → `sede` FK is now non-nullable for new writes.
- `AforoMonitor` WebSocket group key → `aforo:{sede_id}` instead of the current global `aforo`.

### Permission changes

- `IsReceptionistOrAdmin` → add optional sede-scoping: recepcionistas only access their sede's data.
- New permission class `IsSameSede` for cross-sede guard.

---

## Phase 3 — Planes M2M sedes (Sprint ~S8)

**Goal:** allow plans to be available at specific sedes (a plan may be active at sede A but not at sede B).

### Changes

- Add `PlanMembresia.sedes` → `ManyToManyField('common.Sede', blank=True)`.
- Enrollment validation in `inscribir_socio` → check that the socio's active plan includes the class's sede.
- `PagoViewSet` / `CobroManualView` → validate that the plan being charged is available at the operador's sede.
- Admin UI → plan form gains a sede multi-select.

### Migration

- New join table `memberships_planmembresia_sedes`.
- Data migration: all existing plans get all existing sedes (no restriction by default).

---

## Pre-conditions before starting

1. Owner validation: confirm multi-sede is a real near-term need (not speculative).
2. Allocate 2 dedicated sprints (approx. 3–4 weeks).
3. Spike: evaluate whether to use row-level tenancy (FK on each table) or schema-level tenancy (separate DB schemas). Current lean: FK-based (simpler, no ORM changes needed).
4. Add sed-isolation integration tests before Phase 1 merges to `develop`.
