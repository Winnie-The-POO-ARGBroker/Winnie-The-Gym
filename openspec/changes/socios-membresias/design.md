# Technical Design: Socios & Membresias

Change: `socios-membresias`
Stack: Django 5, DRF, PostgreSQL, pytest + APITestCase
Related proposal: `openspec/changes/socios-membresias/proposal.md`

## 1. Architecture Overview

The change is a vertical slice across three existing Django apps (`members`, `memberships`, `access`) plus URL wiring in `core`. It follows the current codebase conventions:

- App-scoped `models.py`, `serializers.py`, `views.py`, `urls.py`, `tests/` per app.
- DRF `generics.*` for CRUD, plain `APIView` for actions.
- `IsReceptionistOrAdmin` is the reference permission (extended, not duplicated).
- Tests are `APITestCase` with `_make_user()` / `_make_socio()` helpers, no `conftest.py`, no fixtures.
- Strict TDD — tests written first, implementation follows.

### Domain diagram (ASCII)

```
                    +-------------------+
                    |  users.User       |
                    |  - rol            |
                    |  - is_active      |
                    +---------+---------+
                              | 1
                              | OneToOne
                              v 1
                    +-------------------+
                    |  members.Socio    |
                    |  - numero_socio*  |   * added by this change
                    |  - dni (unique)   |
                    |  - estado*        |
                    |  - fecha_baja*    |
                    |  - updated_at*    |
                    |  - observaciones* |
                    +---------+---------+
                              | 1
                              | ForeignKey (reverse: membresias)
                              v N
                    +-------------------+     N     +----------------------+
                    | memberships.      +---------->+ memberships.         |
                    | Membresia         |    FK     | PlanMembresia        |
                    | - fecha_inicio    |           | - nombre             |
                    | - fecha_fin       |           | - duracion_dias      |
                    | - estado          |           | - precio             |
                    +-------------------+           | - clases_asignadas   |
                              ^                     | - activo             |
                              |                     +----------------------+
                              |
                              |  read-only + lazy expiry
                              |
                    +---------+---------+
                    | access.services   |
                    | has_active_       |
                    |   membership(user)|
                    +-------------------+
```

### Import direction (must remain acyclic)

```
core.urls
   |
   v
apps.access.views  --> apps.access.services  --> apps.memberships.models
apps.memberships.views --> apps.memberships.models --> apps.members.models
apps.members.views --> apps.members.models
```

`apps.access` depends on `apps.memberships`. `apps.memberships` depends on `apps.members`. `apps.members` is a leaf (only depends on `settings.AUTH_USER_MODEL`). No back edges — safe to import directly.

## 2. Design Decisions (ADR-style)

### ADR-1: `numero_socio` generation — chosen: **PostgreSQL SEQUENCE via `RunSQL` migration + `nextval()` in `Socio.save()`**

Format: `S-{n:05d}` (e.g. `S-00001`, `S-12345`).

**Options evaluated:**

| Option | Concurrency | Complexity | Cost |
|---|---|---|---|
| A. Counter model + `select_for_update` | Safe if row lock is correctly scoped | Extra table + boilerplate; another model to migrate | Row lock held for tx |
| B. **PostgreSQL SEQUENCE (`nextval`)** | Safe by DB design; sequences are transactional but not rollback-safe (gaps allowed) | Small `RunSQL` migration | Zero contention; single roundtrip |
| C. `max(numero_socio) + 1` + `select_for_update` on `Socio` | Requires table-wide lock or unique constraint retry loop | Race conditions if lock not table-level | Locks scale poorly |

**Rationale for B:** PostgreSQL sequences are the standard concurrency-safe monotonic counter in Postgres, requiring no application-level locking. Gaps on transaction rollback are acceptable — `numero_socio` is a display identifier, not an accounting number. Option A adds an extra table for no benefit over the native primitive. Option C is a known anti-pattern under load.

**Rejected A** because it reinvents `nextval`. **Rejected C** because `max()+1` is not concurrency-safe without table-level `LOCK TABLE`, and adding retry loops on unique violation is worse ergonomics than using the sequence.

**Concrete pattern:**

Migration `apps/members/migrations/0004_socio_numero_sequence.py`:

```python
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [('members', '0003_socio_lifecycle_fields')]
    operations = [
        migrations.RunSQL(
            sql="CREATE SEQUENCE IF NOT EXISTS socio_numero_seq START WITH 1 INCREMENT BY 1;",
            reverse_sql="DROP SEQUENCE IF EXISTS socio_numero_seq;",
        ),
    ]
```

`apps/members/models.py`:

```python
from django.db import models, connection

class Socio(models.Model):
    numero_socio = models.CharField(max_length=10, unique=True, null=True, blank=True)
    # ... rest

    def save(self, *args, **kwargs):
        if not self.numero_socio:
            with connection.cursor() as cursor:
                cursor.execute("SELECT nextval('socio_numero_seq')")
                n = cursor.fetchone()[0]
            self.numero_socio = f"S-{n:05d}"
        super().save(*args, **kwargs)
```

Backfill data migration (`0005_backfill_numero_socio.py`) advances the sequence past existing rows so new inserts do not collide.

### ADR-2: Lazy expiry transaction boundary — chosen: **`transaction.atomic()` with `select_for_update(skip_locked=True)` on the specific `Membresia` row**

**Problem:** `has_active_membership(user)` reads a membership; if `fecha_fin < today` and `estado='activa'`, it must flip `estado` to `vencida`. Two concurrent QR scans on the same user must not:
- Update the row twice (idempotent write is fine, but noise in logs).
- Lock each other indefinitely (turnstile latency is user-facing).

**Chosen approach:**

```python
# apps/access/services.py
from django.db import transaction
from django.utils import timezone

def has_active_membership(user) -> bool:
    from apps.memberships.models import Membresia   # local import to avoid app-load ordering

    today = timezone.localdate()
    socio = getattr(user, 'socio', None)
    if socio is None:
        return False

    with transaction.atomic():
        qs = (
            Membresia.objects
            .select_for_update(skip_locked=True)
            .filter(socio=socio, estado='activa')
            .order_by('-fecha_fin')
        )
        membresia = qs.first()
        if membresia is None:
            return False

        if membresia.fecha_fin < today:
            membresia.estado = 'vencida'
            membresia.save(update_fields=['estado'])
            logger.info("Membresia %s marcada vencida (lazy expiry) durante scan de socio %s",
                        membresia.pk, socio.numero_socio)
            return False

        return True
```

**Why this shape:**
- `transaction.atomic()` limits the write to a short, well-defined block.
- `select_for_update(skip_locked=True)` means the second concurrent scan simply doesn't see the row (it's locked by scan #1). It then finds no `activa` row and returns `False` — but scan #1 is already updating to `vencida`, so denying access on the second scan is the *correct* outcome (the membership is expired). This is not a false negative in production terms because both scans happening within the same millisecond on an already-expired membership is a real "denied" scenario.
- For the non-expired happy path, `skip_locked` still lets a rare parallel scan miss the row and deny — this is a known and acceptable trade-off; the user retries in one second, and by then the lock is released. Log the branch to observe frequency.
- Import `Membresia` inside the function (not at module top) to keep `access.services` importable during app registry setup and avoid the theoretical circular-import risk. See ADR-7.

**Rejected:** running the read outside a transaction and writing without a lock would produce inconsistent `estado` under contention. Row-level locking without `skip_locked` risks holding the turnstile HTTP handler on lock waits.

### ADR-3: Serializer architecture — chosen: **flat foreign-key IDs for write; nested plan detail only in read for `/me/` and `/membresias/{id}/`**

**Rules:**
- List endpoints (`GET /membresias/`, `GET /socios/`) → flat: `plan` is the plan ID; consumer follows `/planes/{id}/` if needed.
- Detail endpoints (`GET /membresias/{id}/`) → nested `plan` object (read-only).
- Self-service (`GET /me/`) → nested `membresia_activa` (with nested `plan`) to save the socio a second request in the mobile flow.
- Write endpoints → always accept `plan_id` (flat).

**Rationale:** Matches the DRF convention already in use (see `ProfileSerializer` which mixes `source='usuario.email'` for reads). Nested writes are error-prone and untested here. Two serializer classes per model — `MembresiaSerializer` (list/write) and `MembresiaDetailSerializer` (retrieve). ViewSet chooses via `get_serializer_class`.

**Concrete pattern:**

```python
# apps/memberships/serializers.py
class PlanMembresiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanMembresia
        fields = ('id', 'nombre', 'duracion_dias', 'precio', 'clases_asignadas', 'activo')

class MembresiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Membresia
        fields = ('id', 'socio', 'plan', 'fecha_inicio', 'fecha_fin', 'estado')
        read_only_fields = ('fecha_fin', 'estado')

class MembresiaDetailSerializer(MembresiaSerializer):
    plan = PlanMembresiaSerializer(read_only=True)

class SocioMeSerializer(serializers.ModelSerializer):
    membresia_activa = serializers.SerializerMethodField()

    class Meta:
        model = Socio
        fields = ('id', 'numero_socio', 'nombre', 'apellido', 'estado', 'membresia_activa')

    def get_membresia_activa(self, obj):
        m = obj.membresias.filter(estado='activa').order_by('-fecha_fin').first()
        return MembresiaDetailSerializer(m).data if m else None
```

### ADR-4: View classes — chosen: **DRF `generics.*` for CRUD; plain `APIView` for `renew` and `dar-baja`; NO ViewSets**

**Options evaluated:**

| Option | Fits current codebase? | Wiring |
|---|---|---|
| A. `ModelViewSet` + `@action` | No — `apps.access.views` uses generics + APIView | Router-based |
| B. **Individual `generics.*` + `APIView` for actions** | Yes — matches `AccessLogListView`, `ScanQRView` | `path(...)` per endpoint |

**Rationale:** The codebase does not use routers or `ViewSet`s anywhere (see `apps/access/urls.py` and `apps/users/urls.py` patterns implied by `core/urls.py`). Introducing `ViewSet` here creates a stylistic split. Individual views are also easier to permission-scope one by one, which matters for the socio self-service endpoints.

**Endpoint → view class mapping:**

| Endpoint | View class | Permission |
|---|---|---|
| `GET/POST /api/members/socios/` | `SocioListCreateView(ListCreateAPIView)` | `IsReceptionistOrAdmin` |
| `GET/PATCH /api/members/socios/{id}/` | `SocioRetrieveUpdateView(RetrieveUpdateAPIView)` | `IsReceptionistOrAdmin` |
| `POST /api/members/socios/{id}/dar-baja/` | `SocioDarBajaView(APIView)` | `IsReceptionistOrAdmin` |
| `GET/POST /api/memberships/planes/` | `PlanListCreateView(ListCreateAPIView)` | `IsReceptionistOrAdmin` |
| `GET/PATCH /api/memberships/planes/{id}/` | `PlanRetrieveUpdateView(RetrieveUpdateAPIView)` | `IsReceptionistOrAdmin` |
| `GET/POST /api/memberships/membresias/` | `MembresiaListCreateView(ListCreateAPIView)` | `IsReceptionistOrAdmin` |
| `GET/PATCH /api/memberships/membresias/{id}/` | `MembresiaRetrieveUpdateView(RetrieveUpdateAPIView)` | `IsReceptionistOrAdmin` |
| `GET /api/memberships/me/` | `MeView(APIView)` | `IsAuthenticated` + `IsSocio` |
| `POST /api/memberships/me/renew/` | `MeRenewView(APIView)` | `IsAuthenticated` + `IsSocio` |

**Renewal pattern:**

```python
# apps/memberships/views.py
class MeRenewView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSocio]

    def post(self, request):
        socio = request.user.socio
        plan_id = request.data.get('plan_id')
        plan = get_object_or_404(PlanMembresia, pk=plan_id, activo=True)

        with transaction.atomic():
            Membresia.objects.filter(socio=socio, estado='activa').update(estado='vencida')
            today = timezone.localdate()
            nueva = Membresia.objects.create(
                socio=socio,
                plan=plan,
                fecha_inicio=today,
                fecha_fin=today + timedelta(days=plan.duracion_dias),
                estado='activa',
            )
        return Response(MembresiaDetailSerializer(nueva).data, status=status.HTTP_201_CREATED)
```

**Rejected `@action` on ViewSet** because it conflicts with the existing per-file view convention and would require adding a router to `core/urls.py` just for these apps.

### ADR-5: Permission classes — chosen: **reuse `IsReceptionistOrAdmin` from `apps/access/permissions.py`; add `IsSocio` and object-level ownership check in `get_object()`**

**Rationale:** `IsReceptionistOrAdmin` already lives in `apps/access/permissions.py`. Moving it or duplicating it would break the existing `access` app. Import it from `apps.access.permissions`. Add a small `IsSocio` next to it (same file) for the self-service endpoints.

Ownership on `/me/` is enforced by construction — the view derives the socio from `request.user.socio` rather than from a URL parameter. There is no `/socios/{id}/self` variant. This avoids IDOR by design.

**Concrete pattern:**

```python
# apps/access/permissions.py (append)
class IsSocio(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and getattr(request.user, 'rol', None) == 'socio'
            and hasattr(request.user, 'socio')
        )
```

`MeView.get()`:

```python
class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSocio]

    def get(self, request):
        return Response(SocioMeSerializer(request.user.socio).data)
```

### ADR-6: Migration safety — chosen: **three separate migrations, schema → data → sequence advance**

Order and files:

1. `members/0003_socio_lifecycle_fields.py` — schema only. Adds `numero_socio` (nullable, unique constraint deferred), `estado` (default `'activo'`), `fecha_baja` (nullable), `updated_at` (`auto_now=True`), `observaciones` (blank).
2. `members/0004_socio_numero_sequence.py` — `RunSQL` creates `socio_numero_seq`.
3. `members/0005_backfill_numero_socio.py` — data migration: iterates existing `Socio` rows without `numero_socio`, calls `nextval` per row, assigns `S-{n:05d}`, then advances the sequence to `max(n)` if needed.
4. `members/0006_socio_numero_not_null.py` — flip `numero_socio` to `null=False`, unique.
5. `memberships/0001_initial.py` — creates `PlanMembresia` and `Membresia` tables.

**Why split:** Django refuses `RunPython` inside the same migration as new non-nullable schema (chicken-and-egg for the values). Splitting the not-null flip into a 4th migration guarantees the backfill has completed before the constraint tightens. This is the standard Django-safe pattern for adding a required unique field to a populated table.

**Backfill pattern:**

```python
def backfill_numero_socio(apps, schema_editor):
    Socio = apps.get_model('members', 'Socio')
    with schema_editor.connection.cursor() as cursor:
        for socio in Socio.objects.filter(numero_socio__isnull=True).order_by('id'):
            cursor.execute("SELECT nextval('socio_numero_seq')")
            n = cursor.fetchone()[0]
            socio.numero_socio = f"S-{n:05d}"
            socio.save(update_fields=['numero_socio'])

class Migration(migrations.Migration):
    dependencies = [('members', '0004_socio_numero_sequence')]
    operations = [migrations.RunPython(backfill_numero_socio, migrations.RunPython.noop)]
```

Use `apps.get_model` inside the data migration (Django-standard pattern for historical models) — do NOT import `Socio` directly.

### ADR-7: Circular-import risk — chosen: **direct imports at module top for models, local imports inside functions for services**

**Rule:** Models are safe to import at module top (Django app registry resolves them lazily via `settings.AUTH_USER_MODEL` strings only when needed for FK relations). Services that reach across apps should defer imports.

**Concrete pattern:**

- `apps/memberships/models.py`: `from apps.members.models import Socio` — safe (leaf app).
- `apps/access/services.py`: import `Membresia` **inside** `has_active_membership()` (function scope). Reason: `apps.access` is loaded by `core.urls`, and any top-level import chain that eventually re-enters `apps.access` (e.g. through admin registration) can deadlock the app registry.
- `apps/memberships/serializers.py`: top-level `from apps.members.models import Socio` — safe.
- Cross-app FK definitions use the `'app_label.ModelName'` string form to bypass import order entirely:

```python
# apps/memberships/models.py
class Membresia(models.Model):
    socio = models.ForeignKey('members.Socio', on_delete=models.CASCADE, related_name='membresias')
    plan = models.ForeignKey('memberships.PlanMembresia', on_delete=models.PROTECT, related_name='membresias')
```

The `'app.Model'` string form is Django-preferred for cross-app FKs; it moves resolution to app-ready time.

## 3. Data Model

### `members.Socio` (modified)

| Field | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `usuario` | `OneToOneField(User)` | No | — | existing |
| `dni` | `CharField(20)` unique | No | — | existing |
| `nombre`, `apellido`, `telefono` | `CharField` | No | — | existing |
| `certificado_medico_url` | `URLField` | Yes (blank) | `''` | existing |
| `created_at` | `DateTimeField(auto_now_add)` | No | — | existing |
| **`numero_socio`** | `CharField(10)` unique | starts nullable, ends non-null after backfill | `None` | format `S-{n:05d}` from `socio_numero_seq` |
| **`estado`** | `CharField(20)` choices | No | `'activo'` | `activo` \| `suspendido` \| `baja` |
| **`fecha_baja`** | `DateField` | Yes | `None` | set on `dar-baja` action |
| **`updated_at`** | `DateTimeField(auto_now)` | No | now | |
| **`observaciones`** | `TextField(blank=True)` | Yes (blank) | `''` | free-form admin notes |

### `memberships.PlanMembresia` (new)

| Field | Type | Constraints |
|---|---|---|
| `nombre` | `CharField(100)` | unique |
| `duracion_dias` | `PositiveIntegerField` | `> 0`; validators enforce 30 or 365 in serializer |
| `precio` | `DecimalField(10, 2)` | `>= 0` |
| `clases_asignadas` | `PositiveIntegerField` | default 0 (0 = unlimited or unused) |
| `activo` | `BooleanField` | default True |
| `created_at`, `updated_at` | auto | |

### `memberships.Membresia` (new)

| Field | Type | Constraints |
|---|---|---|
| `socio` | `FK('members.Socio')` | related_name `membresias`, on_delete CASCADE |
| `plan` | `FK('memberships.PlanMembresia')` | on_delete PROTECT |
| `fecha_inicio` | `DateField` | default today |
| `fecha_fin` | `DateField` | computed at create as `fecha_inicio + plan.duracion_dias` |
| `estado` | `CharField(20)` | `activa` \| `vencida` \| `suspendida` \| `cancelada` \| `pendiente_pago` (reserved) |
| `created_at`, `updated_at` | auto | |

Indexes:
- `Membresia`: composite index on `(socio, estado)` — this is the exact filter used by `has_active_membership`.

## 4. File Tree

### Created

```
backend/apps/members/
  serializers.py                             (new)
  views.py                                   (new)
  urls.py                                    (new)
  permissions.py                             (new — SocioOwnershipPermission if needed later)
  migrations/
    0003_socio_lifecycle_fields.py           (new)
    0004_socio_numero_sequence.py            (new)
    0005_backfill_numero_socio.py            (new)
    0006_socio_numero_not_null.py            (new)
  tests/
    __init__.py                              (new)
    test_socios_views.py                     (new)
    test_socios_models.py                    (new)

backend/apps/memberships/
  models.py                                  (new content — file exists but empty)
  serializers.py                             (new)
  views.py                                   (new)
  urls.py                                    (new)
  admin.py                                   (new)
  migrations/
    __init__.py                              (new)
    0001_initial.py                          (new)
  tests/
    __init__.py                              (new)
    test_planes_views.py                     (new)
    test_membresias_views.py                 (new)
    test_me_views.py                         (new)
    test_renewal_flow.py                     (new)
```

### Modified

```
backend/apps/members/models.py               (add fields + save())
backend/apps/members/admin.py                (register new fields)
backend/apps/access/services.py              (real has_active_membership)
backend/apps/access/permissions.py           (add IsSocio)
backend/apps/access/tests/test_services.py   (or new — cover lazy expiry)
backend/core/urls.py                         (register /api/members/, /api/memberships/)
```

## 5. URL Wiring

`backend/core/urls.py` additions:

```python
path('api/members/', include('apps.members.urls')),
path('api/memberships/', include('apps.memberships.urls')),
```

`apps/members/urls.py`:

```python
from django.urls import path
from . import views

urlpatterns = [
    path('socios/', views.SocioListCreateView.as_view(), name='socio-list-create'),
    path('socios/<int:pk>/', views.SocioRetrieveUpdateView.as_view(), name='socio-detail'),
    path('socios/<int:pk>/dar-baja/', views.SocioDarBajaView.as_view(), name='socio-dar-baja'),
]
```

`apps/memberships/urls.py`:

```python
from django.urls import path
from . import views

urlpatterns = [
    path('planes/', views.PlanListCreateView.as_view(), name='plan-list-create'),
    path('planes/<int:pk>/', views.PlanRetrieveUpdateView.as_view(), name='plan-detail'),
    path('membresias/', views.MembresiaListCreateView.as_view(), name='membresia-list-create'),
    path('membresias/<int:pk>/', views.MembresiaRetrieveUpdateView.as_view(), name='membresia-detail'),
    path('me/', views.MeView.as_view(), name='me'),
    path('me/renew/', views.MeRenewView.as_view(), name='me-renew'),
]
```

## 6. Test Strategy (Strict TDD)

All tests are `APITestCase` with `_make_user()` / `_make_socio()` / `_make_plan()` / `_make_membresia()` helpers defined at the top of each test module (no `conftest.py`, no fixtures — per convention seen in `apps/users/tests/test_views.py`).

**Test files and coverage focus:**

- `members/tests/test_socios_models.py` — `numero_socio` autogen, uniqueness under concurrent create (simulated with `transaction.on_commit` + threading probe), `estado` default, `__str__`.
- `members/tests/test_socios_views.py` — CRUD, permissions (401 unauth, 403 socio, 200 admin/recep), `dar-baja` sets `estado=baja` and `fecha_baja`, cannot re-baja.
- `memberships/tests/test_planes_views.py` — CRUD, permissions, `activo=False` plans still listable but not usable for renewal.
- `memberships/tests/test_membresias_views.py` — CRUD, permissions, `fecha_fin` auto-computed on create, cannot have two `activa` memberships for the same socio.
- `memberships/tests/test_me_views.py` — 401 unauth, 403 for non-socio users, 200 returns nested `membresia_activa` shape.
- `memberships/tests/test_renewal_flow.py` — happy path (previous `activa` → `vencida`, new `activa` created), plan not found → 404, inactive plan → 400.
- `access/tests/test_services.py` — real `has_active_membership`: no socio → False, no membership → False, `activa` and non-expired → True, `activa` but expired → returns False *and* row is now `vencida`, concurrent scan simulation returns consistent result (integration-style; not a true race test but a determinism check).

TDD sequencing: each module's tests are committed red first, then implementation is added until green. Order: models → serializers → views → services rewrite.

## 7. Risks and Open Questions

- **Sequence gaps under transaction rollback.** Acceptable — `numero_socio` is display-only.
- **`skip_locked` on lazy expiry** can produce a rare false-negative (deny) on the exact millisecond of a concurrent scan on a valid membership. Mitigated by client retry; logged for observability. If frequency proves annoying, revisit with a Redis-based short-lived cache of "user X is valid until Y" (out of scope now).
- **`pendiente_pago` state** is included in the `estado` choices for `Membresia` but never assigned by any flow in this change. Guarded by documentation and a code comment. No serializer accepts it as write input.
- **Admin registration** for the new models is not covered by tests — visual smoke check post-migrate is required.
- **Backfill migration performance** on large existing `Socio` tables is O(N) with one SQL roundtrip per row. Assumption: current production `Socio` count is small (< 10k). If wrong, the migration should batch via a single `UPDATE ... FROM (SELECT id, row_number()...)` — flagged as follow-up if row count exceeds 5k.
- **Time zone:** `timezone.localdate()` uses `TIME_ZONE` setting. All date comparisons for expiry must be date-only (`fecha_fin__gte=today`), not datetime, to avoid off-by-one across midnight.

## 8. Rollback

Design supports the proposal's rollback plan without additions:
- All new fields on `Socio` are nullable-with-defaults after migration 0003 and only become `not null` after 0006. Rolling back past 0006 makes them nullable again; rolling back to 0002 drops them entirely without data loss for pre-existing columns.
- `memberships` app has no prior state — `migrate memberships zero` fully removes it.
- `has_active_membership` reverts to `return False` — the currently-broken behavior, which the QR flow already handles.
