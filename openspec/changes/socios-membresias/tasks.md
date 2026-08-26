# Implementation Tasks: socios-membresias

Change: `socios-membresias`
Delivery: single-pr (user manages git manually — no git/commit/push tasks)
TDD: Strict — every TEST task must reach RED before the paired IMPL task runs
Spec: `openspec/changes/socios-membresias/spec.md`
Design: `openspec/changes/socios-membresias/design.md`

---

## Review Workload Forecast

| Metric | Estimate |
|---|---|
| New files | ~20 |
| Modified files | ~6 |
| Estimated changed lines | ~900–1 100 |
| 400-line budget risk | **High** |
| Chained PRs recommended | No (user selected `single-pr`) |
| Decision needed before apply | No — `single-pr` + `size:exception` acknowledged |

Delivery note: this run uses `size:exception`. All tasks target a single PR.

---

## Dependency Legend

- `[TEST]` — write the test file / test cases (must be RED before paired IMPL)
- `[IMPL]` — implementation code
- `[SCHEMA]` — Django migration (schema only)
- `[DATA]` — Django data migration
- `⟶ depends on` — sequential; cannot start until listed tasks are done
- `∥ parallel with` — can run in parallel with listed tasks

---

## Phase 0 — Test Infrastructure

### T-00 [TEST] Create `backend/apps/members/tests/__init__.py`

**File:** `backend/apps/members/tests/__init__.py`
**What:** Empty init so pytest discovers the package.
**Spec:** All members test scenarios require a discoverable test package.
**Dependencies:** none
**Parallel with:** T-01

---

### T-01 [TEST] Create `backend/apps/memberships/tests/__init__.py`

**File:** `backend/apps/memberships/tests/__init__.py`
**What:** Empty init so pytest discovers the package.
**Spec:** All memberships test scenarios require a discoverable test package.
**Dependencies:** none
**Parallel with:** T-00

---

### T-02 [IMPL] Delete stub `backend/apps/members/views.py` import / `backend/apps/memberships/views.py` import

**Files:** `backend/apps/members/views.py`, `backend/apps/memberships/views.py`
**What:** Both files currently contain only `from rest_framework.viewsets import ModelViewSet` — replace with an empty module comment placeholder so imports don't fail during incremental development.
**Spec:** No ViewSets — design ADR-4.
**Dependencies:** none
**Parallel with:** T-00, T-01

---

## Phase 1 — Socio Model Extension + Migrations

### T-10 [TEST] Write `backend/apps/members/tests/test_socios_models.py` — RED

**File:** `backend/apps/members/tests/test_socios_models.py`
**What:** Write test cases that will be RED until T-14 is done:
- `test_numero_socio_auto_assigned_on_save` — create a `Socio`, assert `numero_socio` matches `S-\d{5}` regex.
- `test_numero_socio_not_overridden_if_already_set` — create two socios, assert they have distinct `numero_socio` values.
- `test_estado_defaults_to_activo` — create a `Socio`, assert `estado == 'activo'`.
- `test_socio_str` — assert `str(socio) == f'{nombre} {apellido}'` (existing behavior must not break).
- `test_fecha_baja_defaults_none` — new socio has `fecha_baja = None`.
- `test_observaciones_defaults_blank` — new socio has `observaciones == ''`.
**Helpers:** Use the existing `_make_user` pattern from `apps/users/tests/test_views.py` — define `_make_user` and `_make_socio` at the top of this file (no conftest).
**Spec:** Requirement: Socio Lifecycle Fields — all scenarios.
**Dependencies:** T-00
**Parallel with:** none (T-10 must be RED before T-14 starts)

---

### T-11 [SCHEMA] Migration `0003_socio_lifecycle_fields`

**File:** `backend/apps/members/migrations/0003_socio_lifecycle_fields.py`
**What:** Add to `Socio`:
- `numero_socio = CharField(max_length=10, unique=True, null=True, blank=True)`
- `estado = CharField(max_length=20, default='activo')` with choices `activo|suspendido|baja`
- `fecha_baja = DateField(null=True, blank=True)`
- `updated_at = DateTimeField(auto_now=True)`
- `observaciones = TextField(blank=True, default='')`
Dependencies in migration: `('members', '0002_initial')`.
**Spec:** Requirement: Socio Lifecycle Fields.
**Dependencies:** T-10 (RED established)
**Parallel with:** none

---

### T-12 [SCHEMA] Migration `0004_socio_numero_sequence`

**File:** `backend/apps/members/migrations/0004_socio_numero_sequence.py`
**What:** `RunSQL` to create `socio_numero_seq`:
```sql
CREATE SEQUENCE IF NOT EXISTS socio_numero_seq START WITH 1 INCREMENT BY 1;
```
Reverse SQL: `DROP SEQUENCE IF EXISTS socio_numero_seq;`
Dependencies in migration: `('members', '0003_socio_lifecycle_fields')`.
**Spec:** Requirement: Socio Lifecycle Fields — concurrent creates produce unique values.
**Design:** ADR-1.
**Dependencies:** T-11
**Parallel with:** none

---

### T-13 [DATA] Migration `0005_backfill_numero_socio`

**File:** `backend/apps/members/migrations/0005_backfill_numero_socio.py`
**What:** `RunPython(backfill_numero_socio, migrations.RunPython.noop)`.
- Iterate `Socio.objects.filter(numero_socio__isnull=True).order_by('id')` using `apps.get_model('members', 'Socio')`.
- For each row: `SELECT nextval('socio_numero_seq')`, assign `S-{n:05d}`, save `update_fields=['numero_socio']`.
Dependencies in migration: `('members', '0004_socio_numero_sequence')`.
**Spec:** Requirement: Socio Lifecycle Fields — backfill migration preserves existing socios.
**Design:** ADR-6, backfill pattern.
**Dependencies:** T-12
**Parallel with:** none

---

### T-14 [IMPL] Update `backend/apps/members/models.py` — add fields + `save()`

**File:** `backend/apps/members/models.py`
**What:**
- Add the five new fields matching migration T-11 field definitions.
- Add `ESTADO_CHOICES = [('activo', 'Activo'), ('suspendido', 'Suspendido'), ('baja', 'Baja')]`.
- Override `save()`: if `not self.numero_socio`, open a cursor, `SELECT nextval('socio_numero_seq')`, assign `S-{n:05d}`.
- Keep existing `__str__`, `Meta`.
**Spec:** Requirement: Socio Lifecycle Fields.
**Design:** ADR-1 (concrete pattern for `save()`), ADR-6.
**Dependencies:** T-13 (migrations applied), T-10 (tests must turn GREEN here)
**Parallel with:** none

---

### T-15 [SCHEMA] Migration `0006_socio_numero_not_null`

**File:** `backend/apps/members/migrations/0006_socio_numero_not_null.py`
**What:** `AlterField` on `numero_socio` to `null=False`, keeping `unique=True`.
Dependencies in migration: `('members', '0005_backfill_numero_socio')`.
**Spec:** Requirement: Socio Lifecycle Fields — post-backfill constraint.
**Design:** ADR-6.
**Dependencies:** T-14
**Parallel with:** none

---

## Phase 2 — Members App: Serializers, Views, URLs (TDD)

### T-20 [TEST] Write `backend/apps/members/tests/test_socios_views.py` — RED

**File:** `backend/apps/members/tests/test_socios_views.py`
**What:** Test cases (all RED until T-22/T-23 pass):

**Helpers at top of file:** `_make_user(email, rol=None, **kwargs)`, `_make_socio(user, dni)`, `_auth_client(client, user)`.

**CRUD — happy paths:**
- `test_list_socios_admin_200` — admin GET `/api/members/socios/` returns 200, response contains `id`, `numero_socio`, `nombre`, `apellido`, `dni`, `estado`.
- `test_list_socios_recep_200` — recepcionista can list.
- `test_create_socio_admin_201` — POST with valid payload returns 201, response has `numero_socio` matching `S-\d{5}` and `estado == 'activo'`.
- `test_create_socio_duplicate_dni_400` — duplicate DNI returns 400 with `dni` field error.
- `test_retrieve_socio_200` — GET `/api/members/socios/{id}/` returns 200.
- `test_retrieve_nonexistent_404` — GET missing id returns 404.
- `test_partial_update_observaciones_200` — PATCH `observaciones` returns 200; `numero_socio` unchanged.
- `test_partial_update_numero_socio_ignored` — PATCH with `numero_socio` in body: field is read-only, system value is unchanged.

**Permissions:**
- `test_unauthenticated_list_401` — no token → 401.
- `test_socio_role_list_403` — user with `rol=socio` → 403.
- `test_socio_role_create_403` — socio POST → 403.

**Dar de baja:**
- `test_dar_baja_activo_200` — POST `/api/members/socios/{id}/dar-baja/` on activo socio → 200, response `{'estado': 'baja', 'fecha_baja': '<today>'}`, user `is_active` unchanged.
- `test_dar_baja_already_baja_400` — same endpoint on already-baja socio → 400.
- `test_dar_baja_unauthenticated_401` — 401.
- `test_dar_baja_socio_role_403` — 403.

**Spec:** Requirement: Socio CRUD, Requirement: Dar de Baja — all scenarios.
**Dependencies:** T-15, T-00
**Parallel with:** T-30 (memberships test setup can start in parallel since it has no members view dependency)

---

### T-21 [IMPL] Write `backend/apps/access/permissions.py` — add `IsSocio`

**File:** `backend/apps/access/permissions.py`
**What:** Append `IsSocio` class:
```python
class IsSocio(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and getattr(request.user, 'rol', None) == 'socio'
            and hasattr(request.user, 'socio')
        )
```
**Spec:** Requirement: Socio Self-Service — non-socio cannot access /me/.
**Design:** ADR-5.
**Dependencies:** T-15
**Parallel with:** T-22 can start in parallel (T-22 imports from permissions but the class is small)

---

### T-22 [IMPL] Write `backend/apps/members/serializers.py`

**File:** `backend/apps/members/serializers.py` (new)
**What:**
- `SocioSerializer(ModelSerializer)` — fields: `id`, `numero_socio` (read_only), `nombre`, `apellido`, `dni`, `telefono`, `estado`, `fecha_baja`, `observaciones`, `created_at`. `numero_socio` must be in `read_only_fields`.
- `SocioBajaSerializer(Serializer)` — output only: `estado`, `fecha_baja`. Used by `SocioDarBajaView` response.
**Spec:** Requirement: Socio CRUD (fields in list/create/retrieve/partial-update), Invariant: `numero_socio` never writable.
**Design:** ADR-3 (flat serializers).
**Dependencies:** T-21
**Parallel with:** none (views depend on this)

---

### T-23 [IMPL] Write `backend/apps/members/views.py`

**File:** `backend/apps/members/views.py`
**What:** Replace the stub with:
- `SocioListCreateView(ListCreateAPIView)` — queryset all socios, serializer `SocioSerializer`, permission `IsReceptionistOrAdmin` (import from `apps.access.permissions`).
- `SocioRetrieveUpdateView(RetrieveUpdateAPIView)` — same serializer and permission; `http_method_names = ['get', 'patch', 'head', 'options']` (no PUT).
- `SocioDarBajaView(APIView)` — permission `IsReceptionistOrAdmin`; `post()`: fetch socio by pk (404 if not found), if `socio.estado == 'baja'` return 400 with `{"detail": "El socio ya está de baja"}`, else set `estado='baja'`, `fecha_baja=timezone.localdate()`, save `update_fields=['estado', 'fecha_baja', 'updated_at']`, return 200 with `SocioBajaSerializer`.
**Spec:** Requirement: Socio CRUD, Requirement: Dar de Baja — all scenarios.
**Design:** ADR-4 (view class mapping).
**Dependencies:** T-22, T-20 (tests must go GREEN here)
**Parallel with:** none

---

### T-24 [IMPL] Write `backend/apps/members/urls.py`

**File:** `backend/apps/members/urls.py`
**What:** Replace empty urlpatterns with:
```python
urlpatterns = [
    path('socios/', SocioListCreateView.as_view(), name='socio-list-create'),
    path('socios/<int:pk>/', SocioRetrieveUpdateView.as_view(), name='socio-detail'),
    path('socios/<int:pk>/dar-baja/', SocioDarBajaView.as_view(), name='socio-dar-baja'),
]
```
**Spec:** Endpoint contract: `GET/POST /api/members/socios/`, `GET/PATCH /api/members/socios/{id}/`, `POST /api/members/socios/{id}/dar-baja/`.
**Dependencies:** T-23
**Parallel with:** none

---

## Phase 3 — Memberships Models + Migrations

### T-30 [TEST] Write `backend/apps/memberships/tests/test_planes_views.py` — RED (partial)

**File:** `backend/apps/memberships/tests/test_planes_views.py`
**What:** Test cases for `PlanMembresia` that will be RED until T-34:

**Helpers:** `_make_user`, `_make_plan`, `_auth_client` — defined at top of file.

- `test_list_planes_admin_200` — GET `/api/memberships/planes/` returns 200 with fields `id`, `nombre`, `duracion_dias`, `precio`, `clases_asignadas`, `activo`.
- `test_list_planes_recep_200` — recepcionista can list.
- `test_list_planes_socio_200` — socio can list (read-only allowed).
- `test_create_plan_admin_201` — POST with `duracion_dias=30` returns 201.
- `test_create_plan_recep_403` — recepcionista POST → 403.
- `test_create_plan_invalid_duracion_400` — `duracion_dias=60` → 400 with `duracion_dias` field error.
- `test_retrieve_plan_200` — GET `/api/memberships/planes/{id}/` returns 200.
- `test_patch_plan_admin_200` — PATCH `precio` as admin → 200.
- `test_patch_plan_recep_403` — PATCH as recepcionista → 403.
- `test_unauthenticated_401` — no token → 401.

**Spec:** Requirement: Plan CRUD — all scenarios.
**Dependencies:** T-01
**Parallel with:** T-20

---

### T-31 [SCHEMA] Migration `memberships/0001_initial`

**File:** `backend/apps/memberships/migrations/__init__.py` (new), `backend/apps/memberships/migrations/0001_initial.py` (new)
**What:** Create `PlanMembresia` and `Membresia` tables:

**`PlanMembresia`:**
- `nombre CharField(100) unique`
- `duracion_dias PositiveIntegerField`
- `precio DecimalField(max_digits=10, decimal_places=2)`
- `clases_asignadas PositiveIntegerField(default=0)`
- `activo BooleanField(default=True)`
- `created_at DateTimeField(auto_now_add=True)`
- `updated_at DateTimeField(auto_now=True)`

**`Membresia`:**
- `socio ForeignKey('members.Socio', on_delete=CASCADE, related_name='membresias')`
- `plan ForeignKey('memberships.PlanMembresia', on_delete=PROTECT, related_name='membresias')`
- `fecha_inicio DateField(default=date.today)`
- `fecha_fin DateField`
- `estado CharField(20, default='activa')` with choices `activa|vencida|suspendida|cancelada|pendiente_pago`
- `created_at DateTimeField(auto_now_add=True)`
- `updated_at DateTimeField(auto_now=True)`
- Composite index on `(socio, estado)`.

Dependencies in migration: `('members', '0006_socio_numero_not_null')`.
**Spec:** Requirement: Plan CRUD, Requirement: Membresia CRUD.
**Design:** Section 3 Data Model.
**Dependencies:** T-15 (members migrations complete)
**Parallel with:** T-20, T-30 (the migration itself can be written; applying it requires T-15 done first)

---

### T-32 [IMPL] Write `backend/apps/memberships/models.py`

**File:** `backend/apps/memberships/models.py`
**What:** Replace the one-liner stub with:
- `PlanMembresia(Model)` — all fields from T-31, `__str__` returns `self.nombre`.
- `Membresia(Model)` — all fields from T-31, FK strings `'members.Socio'` and `'memberships.PlanMembresia'` (ADR-7 string form), `__str__` returns `f'{self.socio} - {self.plan} ({self.estado})'`.
- `class Meta` on `Membresia`: `indexes = [models.Index(fields=['socio', 'estado'])]`.
**Spec:** Requirement: Plan CRUD, Requirement: Membresia CRUD.
**Design:** ADR-7 (FK string form), Section 3 Data Model.
**Dependencies:** T-31
**Parallel with:** none

---

## Phase 4 — Memberships App: Serializers, Views, URLs (TDD)

### T-40 [TEST] Write `backend/apps/memberships/tests/test_membresias_views.py` — RED

**File:** `backend/apps/memberships/tests/test_membresias_views.py`
**What:** Test cases for `Membresia` CRUD (RED until T-43):

**Helpers:** `_make_user`, `_make_socio`, `_make_plan`, `_make_membresia`, `_auth_client`.

- `test_create_membresia_admin_201` — POST `{ "socio": id, "plan": id, "fecha_inicio": "2026-08-19" }` → 201 with `fecha_fin == "2026-09-18"` (30-day plan), `estado == "activa"`.
- `test_fecha_fin_computed_client_value_ignored` — POST with `fecha_fin` in body → 201, `fecha_fin` is computed (30 days), not the client value.
- `test_estado_not_writable_on_create` — POST without `estado` → `estado == 'activa'`; POST with `estado='vencida'` → still `activa`.
- `test_patch_estado_valid_values_200` — PATCH `estado=vencida|suspendida|cancelada` → 200.
- `test_patch_estado_pendiente_pago_400` — PATCH `estado=pendiente_pago` → 400 with `estado` field error.
- `test_retrieve_includes_nested_plan` — GET `/api/memberships/membresias/{id}/` response has `plan` as an object with `nombre`, `duracion_dias`, `precio`, `clases_asignadas`.
- `test_list_membresias_admin_200` — GET returns 200.
- `test_list_membresias_socio_403` — socio GET `/api/memberships/membresias/` → 403.
- `test_unauthenticated_401` — 401.

**Spec:** Requirement: Membresia CRUD — all scenarios.
**Dependencies:** T-32, T-01
**Parallel with:** T-41 (can draft test file while T-32 is being written, but must run RED against T-32)

---

### T-41 [TEST] Write `backend/apps/memberships/tests/test_me_views.py` — RED

**File:** `backend/apps/memberships/tests/test_me_views.py`
**What:** Test cases for self-service `/me/` (RED until T-43):

**Helpers:** shared helpers at top of file.

- `test_me_unauthenticated_401` — 401.
- `test_me_non_socio_role_403` — recepcionista GET `/api/memberships/me/` → 403.
- `test_me_socio_with_active_membership_200` — 200 with shape `{ id, numero_socio, nombre, apellido, estado, membresia_activa: { id, fecha_inicio, fecha_fin, estado, plan: { id, nombre, duracion_dias, precio, clases_asignadas } } }`.
- `test_me_socio_with_no_membership_200` — 200 with `membresia_activa: null`.
- `test_me_socio_cannot_access_socios_list_403` — GET `/api/members/socios/` as socio → 403.

**Spec:** Requirement: Socio Self-Service — all scenarios.
**Dependencies:** T-32, T-01
**Parallel with:** T-40

---

### T-42 [TEST] Write `backend/apps/memberships/tests/test_renewal_flow.py` — RED

**File:** `backend/apps/memberships/tests/test_renewal_flow.py`
**What:** Test cases for `POST /api/memberships/me/renew/` (RED until T-43):

- `test_renewal_happy_path_201` — socio with activa membership renews: response 201 with new activa membership, previous membership now `estado=vencida`, `plan` nested in response.
- `test_renewal_no_prior_membership_201` — socio with no membership: 201, new activa membership created.
- `test_renewal_inactive_plan_404` — `activo=False` plan → 404.
- `test_renewal_nonexistent_plan_404` — nonexistent plan_id → 404.
- `test_renewal_non_socio_403` — recepcionista POST → 403.
- `test_renewal_unauthenticated_401` — 401.

**Spec:** Requirement: Socio Renewal — all scenarios.
**Dependencies:** T-32, T-01
**Parallel with:** T-40, T-41

---

### T-43 [IMPL] Write `backend/apps/memberships/serializers.py`

**File:** `backend/apps/memberships/serializers.py` (new)
**What:**
- `PlanMembresiaSerializer(ModelSerializer)` — fields: `id`, `nombre`, `duracion_dias`, `precio`, `clases_asignadas`, `activo`. Validate `duracion_dias`: must be 30 or 365, else raise `ValidationError`.
- `PlanWriteSerializer(ModelSerializer)` — same fields; for admin-only writes; no validation difference (duracion_dias validated via `PlanMembresiaSerializer`).
- `MembresiaSerializer(ModelSerializer)` — fields: `id`, `socio`, `plan`, `fecha_inicio`, `fecha_fin`, `estado`. `read_only_fields = ('fecha_fin', 'estado')`. Override `create()` to compute `fecha_fin = fecha_inicio + timedelta(days=plan.duracion_dias)` and force `estado='activa'`. Validate `estado` on PATCH: reject `pendiente_pago`.
- `MembresiaDetailSerializer(MembresiaSerializer)` — override `plan = PlanMembresiaSerializer(read_only=True)`.
- `SocioMeSerializer(ModelSerializer)` — fields: `id`, `numero_socio`, `nombre`, `apellido`, `estado`, `membresia_activa`. `membresia_activa` is a `SerializerMethodField` returning `MembresiaDetailSerializer(m).data` for the latest `activa` membership, else `None`.
**Spec:** Requirement: Plan CRUD (duracion_dias validation), Requirement: Membresia CRUD (fecha_fin computed, pendiente_pago rejected), Requirement: Socio Self-Service (nested shape).
**Design:** ADR-3.
**Dependencies:** T-32, T-40, T-41, T-42 (tests RED)
**Parallel with:** none

---

### T-44 [IMPL] Write `backend/apps/memberships/views.py`

**File:** `backend/apps/memberships/views.py`
**What:** Replace stub with:

- `PlanListCreateView(ListCreateAPIView)`:
  - `get_permissions()`: `GET` → `[IsAuthenticated]`; `POST` → `[IsReceptionistOrAdmin]` but further restrict to admin-only by checking `rol == 'administrador'` in the permission or via a custom `IsAdminRole` permission (one-liner, add to `apps/access/permissions.py`).
  - Alternatively (simpler, per design): use `IsReceptionistOrAdmin` for both but override `get_permissions()` or add an inline check in `perform_create()` that raises `PermissionDenied` for recepcionista. **Preferred approach per spec:** define `IsAdminOnly(BasePermission)` in `apps/access/permissions.py` and use `[IsAuthenticated]` for GET, `[IsAuthenticated, IsAdminOnly]` for POST.

- `PlanRetrieveUpdateView(RetrieveUpdateAPIView)`:
  - GET: `[IsAuthenticated]`; PATCH: `[IsAuthenticated, IsAdminOnly]`.
  - `http_method_names = ['get', 'patch', 'head', 'options']`.

- `MembresiaListCreateView(ListCreateAPIView)`: `[IsReceptionistOrAdmin]`. `get_serializer_class()`: returns `MembresiaDetailSerializer` for GET, `MembresiaSerializer` for POST (or just use `MembresiaSerializer` for write and return detail in response by re-serializing).

- `MembresiaRetrieveUpdateView(RetrieveUpdateAPIView)`: `[IsReceptionistOrAdmin]`. `get_serializer_class()`: `MembresiaDetailSerializer` for GET, `MembresiaSerializer` for PATCH.

- `MeView(APIView)`: `[IsAuthenticated, IsSocio]`. `get()`: `return Response(SocioMeSerializer(request.user.socio).data)`.

- `MeRenewView(APIView)`: `[IsAuthenticated, IsSocio]`. `post()`: get `plan_id`, `get_object_or_404(PlanMembresia, pk=plan_id, activo=True)`, inside `transaction.atomic()` mark existing `activa` memberships `vencida`, create new `Membresia` with `fecha_inicio=today`, `fecha_fin=today + timedelta(days=plan.duracion_dias)`, `estado='activa'`. Return 201 with `MembresiaDetailSerializer`.

**Spec:** Requirement: Plan CRUD, Requirement: Membresia CRUD, Requirement: Socio Self-Service, Requirement: Socio Renewal.
**Design:** ADR-4.
**Dependencies:** T-43
**Parallel with:** none

---

### T-45 [IMPL] Add `IsAdminOnly` to `backend/apps/access/permissions.py`

**File:** `backend/apps/access/permissions.py`
**What:** Append:
```python
class IsAdminOnly(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and (
                getattr(request.user, 'rol', None) == 'administrador'
                or request.user.is_superuser
            )
        )
```
**Spec:** Requirement: Plan CRUD — recepcionista cannot create/update plans.
**Design:** ADR-5.
**Dependencies:** T-21 (extends same file)
**Parallel with:** T-43 (can be done alongside serializers)

---

### T-46 [IMPL] Write `backend/apps/memberships/urls.py`

**File:** `backend/apps/memberships/urls.py`
**What:**
```python
urlpatterns = [
    path('planes/', PlanListCreateView.as_view(), name='plan-list-create'),
    path('planes/<int:pk>/', PlanRetrieveUpdateView.as_view(), name='plan-detail'),
    path('membresias/', MembresiaListCreateView.as_view(), name='membresia-list-create'),
    path('membresias/<int:pk>/', MembresiaRetrieveUpdateView.as_view(), name='membresia-detail'),
    path('me/', MeView.as_view(), name='me'),
    path('me/renew/', MeRenewView.as_view(), name='me-renew'),
]
```
**Spec:** Endpoint contract — all `/api/memberships/*` routes.
**Design:** Section 5 URL Wiring.
**Dependencies:** T-44
**Parallel with:** none

---

### T-47 [IMPL] Register `memberships` in `INSTALLED_APPS` (if not already present) and update `backend/apps/memberships/admin.py`

**File:** `backend/apps/memberships/admin.py`, `backend/core/settings.py` (verify `apps.memberships` is listed)
**What:**
- `admin.py`: register `PlanMembresia` and `Membresia` with `admin.site.register`.
- `settings.py`: confirm `'apps.memberships'` is in `INSTALLED_APPS` — add it if missing.
**Spec:** Supporting requirement for all memberships endpoints to function.
**Dependencies:** T-32
**Parallel with:** T-43

---

## Phase 5 — Fix `has_active_membership` in `access/services.py`

### T-50 [TEST] Write / expand `backend/apps/access/tests/test_services.py` — RED

**File:** `backend/apps/access/tests/test_services.py` (new file — current `tests.py` stays; new file goes in a `tests/` package)

**Note on existing tests:** `backend/apps/access/tests.py` already exists as a flat file. Add a `tests/` directory alongside it and put the new service tests there. Alternatively — if the project prefers a single file — append to the existing `tests.py`. **Decision: create `backend/apps/access/tests/__init__.py` and `backend/apps/access/tests/test_services.py` for separation.**

**What:** Test cases (all RED until T-51):

**Helpers:** `_make_user`, `_make_socio`, `_make_plan`, `_make_membresia`.

- `test_no_socio_returns_false` — user with no linked `Socio` → `False`, no exception.
- `test_no_membership_returns_false` — socio with no memberships → `False`.
- `test_active_non_expired_returns_true` — socio activo + Membresia activa + `fecha_fin >= today` → `True`.
- `test_expired_membership_returns_false_and_marks_vencida` — socio activo + Membresia activa + `fecha_fin < today` → `False`; then reload from DB and assert `estado == 'vencida'`.
- `test_socio_suspendido_returns_false` — socio `estado=suspendido` + valid active membership → `False`.
- `test_socio_baja_returns_false` — socio `estado=baja` → `False`.
- `test_concurrent_lazy_expiry_consistent` — create one expired Membresia; call `has_active_membership` twice sequentially (simulating serialized concurrent scans); both return `False`, membership ends as `vencida` (not duplicated).

**Spec:** Requirement: QR Access Check — all scenarios.
**Design:** ADR-2.
**Dependencies:** T-32 (`Membresia` model must exist), T-14 (`Socio` fields must exist)
**Parallel with:** T-40, T-41, T-42

---

### T-51 [IMPL] Rewrite `backend/apps/access/services.py`

**File:** `backend/apps/access/services.py`
**What:** Replace stub with the full `has_active_membership(user)` implementation:
- `socio = getattr(user, 'socio', None)` — return `False` if None.
- Check `socio.estado in ('activo',)` — return `False` otherwise.
- Inside `transaction.atomic()`: `select_for_update(skip_locked=True)` on `Membresia.objects.filter(socio=socio, estado='activa').order_by('-fecha_fin')`, get `.first()`.
- If no row: return `False`.
- If `membresia.fecha_fin < today`: set `estado='vencida'`, `save(update_fields=['estado'])`, log, return `False`.
- Else: return `True`.
- Import `Membresia` inside the function (local import — ADR-7).
- Use `logger = logging.getLogger(__name__)` at module top.
**Spec:** Requirement: QR Access Check — all scenarios including lazy expiry and concurrent scan.
**Design:** ADR-2 (full code pattern provided).
**Dependencies:** T-50 (tests RED), T-32 (`Membresia` model), T-14 (`Socio` fields)
**Parallel with:** none

---

## Phase 6 — Wire `core/urls.py` + Members Admin Update

### T-60 [IMPL] Register new app URLs in `backend/core/urls.py`

**File:** `backend/core/urls.py`
**What:** Add two `path()` includes:
```python
path('api/members/', include('apps.members.urls')),
path('api/memberships/', include('apps.memberships.urls')),
```
Place them after existing `api/access/` and `api/users/` entries (or wherever the api block is grouped).
**Spec:** Endpoint contract — all new routes must be reachable.
**Design:** Section 5 URL Wiring.
**Dependencies:** T-24, T-46, T-51
**Parallel with:** none

---

### T-61 [IMPL] Update `backend/apps/members/admin.py` — register new Socio fields

**File:** `backend/apps/members/admin.py`
**What:** Update the `SocioAdmin` (or register if not present) to include `numero_socio`, `estado`, `fecha_baja`, `observaciones` in `list_display` and/or `fields`.
**Spec:** Supporting — admin visibility for new fields.
**Dependencies:** T-14
**Parallel with:** T-60

---

### T-62 [TEST] Smoke test — confirm all routes resolve (no import error)

**File:** `backend/apps/memberships/tests/test_me_views.py` or a dedicated `test_url_smoke.py`
**What:** Add one test asserting `reverse('socio-list-create')`, `reverse('plan-list-create')`, `reverse('me')`, `reverse('me-renew')` all resolve without raising `NoReverseMatch`. This catches URL wiring regressions.
**Spec:** All endpoint contract rows.
**Dependencies:** T-60
**Parallel with:** none

---

## Execution Order Summary

```
T-00, T-01, T-02  (parallel — Phase 0)
       |
T-10 [RED]
       |
T-11 → T-12 → T-13 → T-14 [GREEN on T-10] → T-15
                                 |
              ┌──────────────────┤
              ↓                  ↓
T-20 [RED]  T-21            T-31 (∥ T-20, T-30)
              |                  |
T-30 [RED]  T-22            T-32
(∥ T-20)     |                  |
             T-23        T-40, T-41, T-42 (parallel)
              |           T-45 (∥ T-43)
             T-24              |
                              T-43
                               |
                              T-44
                               |
                           T-46, T-47
                               |
                         T-50 [RED]
                               |
                              T-51
                               |
                         T-60, T-61 (∥)
                               |
                              T-62
```

---

## Checklist (ordered for execution)

- [ ] **T-00** [TEST] `backend/apps/members/tests/__init__.py` — create empty init
- [ ] **T-01** [TEST] `backend/apps/memberships/tests/__init__.py` — create empty init
- [ ] **T-02** [IMPL] Clear stubs in `members/views.py` and `memberships/views.py`
- [ ] **T-10** [TEST] `members/tests/test_socios_models.py` — write RED model tests
- [ ] **T-11** [SCHEMA] `members/migrations/0003_socio_lifecycle_fields.py`
- [ ] **T-12** [SCHEMA] `members/migrations/0004_socio_numero_sequence.py`
- [ ] **T-13** [DATA] `members/migrations/0005_backfill_numero_socio.py`
- [ ] **T-14** [IMPL] `members/models.py` — add fields + `save()` → T-10 turns GREEN
- [ ] **T-15** [SCHEMA] `members/migrations/0006_socio_numero_not_null.py`
- [ ] **T-20** [TEST] `members/tests/test_socios_views.py` — write RED view tests
- [ ] **T-21** [IMPL] `access/permissions.py` — add `IsSocio`
- [ ] **T-22** [IMPL] `members/serializers.py` — create
- [ ] **T-23** [IMPL] `members/views.py` — create → T-20 turns GREEN
- [ ] **T-24** [IMPL] `members/urls.py` — wire routes
- [ ] **T-30** [TEST] `memberships/tests/test_planes_views.py` — write RED plan tests
- [ ] **T-31** [SCHEMA] `memberships/migrations/__init__.py` + `0001_initial.py`
- [ ] **T-32** [IMPL] `memberships/models.py` — `PlanMembresia` + `Membresia`
- [ ] **T-40** [TEST] `memberships/tests/test_membresias_views.py` — write RED membresia tests
- [ ] **T-41** [TEST] `memberships/tests/test_me_views.py` — write RED /me/ tests
- [ ] **T-42** [TEST] `memberships/tests/test_renewal_flow.py` — write RED renewal tests
- [ ] **T-45** [IMPL] `access/permissions.py` — add `IsAdminOnly`
- [ ] **T-43** [IMPL] `memberships/serializers.py` — create
- [ ] **T-44** [IMPL] `memberships/views.py` — create → T-30/T-40/T-41/T-42 turn GREEN
- [ ] **T-46** [IMPL] `memberships/urls.py` — wire routes
- [ ] **T-47** [IMPL] `memberships/admin.py` + verify `INSTALLED_APPS`
- [ ] **T-50** [TEST] `access/tests/__init__.py` + `access/tests/test_services.py` — write RED service tests
- [ ] **T-51** [IMPL] `access/services.py` — rewrite `has_active_membership` → T-50 turns GREEN
- [ ] **T-60** [IMPL] `core/urls.py` — register `api/members/` and `api/memberships/`
- [ ] **T-61** [IMPL] `members/admin.py` — update `SocioAdmin` for new fields
- [ ] **T-62** [TEST] Smoke test URL resolution

---

## Critical Path

`T-10 → T-11 → T-12 → T-13 → T-14 → T-15 → T-31 → T-32 → T-43 → T-44 → T-51 → T-60`

This chain cannot be parallelized. Everything else can be drafted in parallel once its direct dependency is met.

## Risks

1. **`access/tests.py` vs `access/tests/` package conflict** — if Django or pytest discovers both `tests.py` and `tests/`, the flat file takes precedence or causes an import error. Resolution in T-50: confirm whether to convert the existing flat `tests.py` to a package or keep them separate and import-safe.
2. **`memberships` INSTALLED_APPS** — T-47 must verify this before `makemigrations`; if the app is missing, migration generation will fail silently.
3. **`PlanListCreateView` permission split (GET vs POST)** — DRF `ListCreateAPIView` uses a single `permission_classes`; to split by method, override `get_permissions()`. This is a non-trivial pattern; implementer must test both GET (socio allowed) and POST (recepcionista blocked) explicitly.
