# Socios & Membresias Specification

Change: `socios-membresias`
Related proposal: `openspec/changes/socios-membresias/proposal.md`
Related design: `openspec/changes/socios-membresias/design.md`

This change introduces three new capability domains. No existing specs are superseded (access service had no prior spec). All sections below are ADDED Requirements.

---

## Capability: members-management

### Requirement: Socio Lifecycle Fields

The `Socio` model MUST carry `numero_socio`, `estado`, `fecha_baja`, `updated_at`, and `observaciones`. The `numero_socio` field MUST be unique, auto-assigned by the system using a PostgreSQL sequence, and formatted as `S-{n:05d}`. Client requests MUST NOT supply or modify `numero_socio`. The `estado` field MUST default to `activo` on create and accept only `activo`, `suspendido`, or `baja`. Existing `Socio` rows MUST be backfilled with a `numero_socio` via a data migration without data loss.

#### Scenario: numero_socio assigned on first save

- GIVEN a new `Socio` is being created by admin/recepcionista
- WHEN the request is valid and `numero_socio` is not provided
- THEN the response includes a `numero_socio` in the format `S-NNNNN`
- AND the value is unique across all socios

#### Scenario: client-supplied numero_socio is rejected

- GIVEN an admin sends `POST /api/members/socios/` with `numero_socio` in the body
- WHEN the serializer processes the request
- THEN `numero_socio` is ignored (read-only) and the system-generated value is used instead

#### Scenario: concurrent creates produce unique values

- GIVEN two concurrent `POST /api/members/socios/` requests
- WHEN both are processed simultaneously
- THEN each response contains a distinct `numero_socio` and neither request raises an integrity error

#### Scenario: backfill migration preserves existing socios

- GIVEN a production database with existing `Socio` rows lacking `numero_socio`
- WHEN migrations `0003` through `0006` are applied
- THEN every pre-existing `Socio` row has a unique, correctly formatted `numero_socio`
- AND no rows are lost

---

### Requirement: Socio CRUD (admin/recepcionista)

Admin and recepcionista roles MUST be able to list, create, retrieve, and partially update socios. Only authenticated users with `rol=administrador` or `rol=recepcionista` MAY access these endpoints. Unauthenticated requests MUST receive `401`. Requests from `socio` role MUST receive `403`.

#### Scenario: list socios (happy path)

- GIVEN an authenticated admin or recepcionista
- WHEN `GET /api/members/socios/`
- THEN response is `200` with an array of socio objects including `id`, `numero_socio`, `nombre`, `apellido`, `dni`, `estado`

#### Scenario: create socio (happy path)

- GIVEN an authenticated admin or recepcionista
- WHEN `POST /api/members/socios/` with `{ "nombre": "…", "apellido": "…", "dni": "…", "telefono": "…", "usuario": <user_id> }`
- THEN response is `201` with the created socio object including auto-assigned `numero_socio` and `estado: "activo"`

#### Scenario: create socio with duplicate DNI

- GIVEN a socio with `dni=X` already exists
- WHEN `POST /api/members/socios/` with the same `dni`
- THEN response is `400` with a field-level error on `dni`

#### Scenario: retrieve socio detail

- GIVEN an authenticated admin or recepcionista
- WHEN `GET /api/members/socios/{id}/`
- THEN response is `200` with full socio object; non-existent `id` returns `404`

#### Scenario: partial update socio

- GIVEN an authenticated admin or recepcionista
- WHEN `PATCH /api/members/socios/{id}/` with `{ "observaciones": "…" }`
- THEN response is `200` with updated fields; `numero_socio` is not modifiable and is ignored if present

#### Scenario: unauthenticated access denied

- GIVEN no authentication token
- WHEN any request to `/api/members/socios/`
- THEN response is `401`

#### Scenario: socio role cannot access admin endpoints

- GIVEN an authenticated user with `rol=socio`
- WHEN `GET /api/members/socios/`
- THEN response is `403`

---

### Requirement: Dar de Baja (soft delete)

An admin or recepcionista MUST be able to give a socio de baja via `POST /api/members/socios/{id}/dar-baja/`. This action MUST set `Socio.estado = 'baja'` and `Socio.fecha_baja = today`. The `User` account MUST remain active. The action MUST be idempotent in terms of final state but SHOULD return `400` when the socio is already `baja`. The body is empty; no input is required.

#### Scenario: dar de baja (happy path)

- GIVEN an authenticated admin or recepcionista and a socio with `estado=activo`
- WHEN `POST /api/members/socios/{id}/dar-baja/`
- THEN response is `200` with `{ "estado": "baja", "fecha_baja": "<today>" }`
- AND the socio's `User` account remains active in the database

#### Scenario: dar de baja on already-baja socio

- GIVEN a socio with `estado=baja`
- WHEN `POST /api/members/socios/{id}/dar-baja/`
- THEN response is `400` with an error indicating the socio is already de baja

#### Scenario: dar de baja blocks QR access

- GIVEN a socio with `estado=baja` and an otherwise valid active membership
- WHEN `has_active_membership(user)` is evaluated
- THEN it returns `False`

---

### Requirement: Socio Self-Service (GET /me/)

A socio MUST be able to read their own profile and current membership via `GET /api/memberships/me/`. Users with `rol != socio` MUST receive `403`. The response MUST include nested `membresia_activa` (with nested plan detail), or `null` if none exists.

#### Scenario: socio reads own profile (happy path)

- GIVEN an authenticated user with `rol=socio` linked to a `Socio` with an active membership
- WHEN `GET /api/memberships/me/`
- THEN response is `200` with `{ "id", "numero_socio", "nombre", "apellido", "estado", "membresia_activa": { "id", "fecha_inicio", "fecha_fin", "estado", "plan": { "id", "nombre", "duracion_dias", "precio", "clases_asignadas" } } }`

#### Scenario: socio reads own profile with no membership

- GIVEN an authenticated socio with no membership record
- WHEN `GET /api/memberships/me/`
- THEN response is `200` with `membresia_activa: null`

#### Scenario: non-socio cannot access /me/

- GIVEN an authenticated user with `rol=recepcionista`
- WHEN `GET /api/memberships/me/`
- THEN response is `403`

#### Scenario: socio cannot access other socios' data

- GIVEN an authenticated user with `rol=socio`
- WHEN `GET /api/members/socios/` or `GET /api/members/socios/{other_id}/`
- THEN response is `403`

---

## Capability: memberships-management

### Requirement: Plan CRUD

`PlanMembresia` MUST support list and retrieve for admin, recepcionista, and socio roles. Create and update (PATCH) MUST be restricted to `rol=administrador` only. Recepcionista MUST receive `403` on `POST /planes/` and `PATCH /planes/{id}/`. `duracion_dias` MUST be a positive integer; the serializer MUST reject values other than `30` or `365`. `precio` MUST be `>= 0`.

#### Scenario: list plans (admin, recep, socio can all read)

- GIVEN any authenticated user (admin, recepcionista, or socio)
- WHEN `GET /api/memberships/planes/`
- THEN response is `200` with an array including `id`, `nombre`, `duracion_dias`, `precio`, `clases_asignadas`, `activo`

#### Scenario: create plan (admin only — happy path)

- GIVEN an authenticated admin
- WHEN `POST /api/memberships/planes/` with `{ "nombre": "Mensual", "duracion_dias": 30, "precio": "5000.00", "clases_asignadas": 0, "activo": true }`
- THEN response is `201` with the created plan object

#### Scenario: recepcionista cannot create plan

- GIVEN an authenticated recepcionista
- WHEN `POST /api/memberships/planes/`
- THEN response is `403`

#### Scenario: invalid duracion_dias rejected

- GIVEN an authenticated admin
- WHEN `POST /api/memberships/planes/` with `duracion_dias=60`
- THEN response is `400` with a field-level error on `duracion_dias`

#### Scenario: update plan (admin only)

- GIVEN an authenticated admin
- WHEN `PATCH /api/memberships/planes/{id}/` with `{ "precio": "6000.00" }`
- THEN response is `200` with the updated plan; recepcionista receives `403` for the same request

---

### Requirement: Membresia CRUD

Admin and recepcionista MUST be able to list, create, retrieve, and partially update memberships. On create, `fecha_fin` MUST be computed as `fecha_inicio + plan.duracion_dias`; the client MUST NOT supply `fecha_fin`. `estado` MUST NOT be writable by the client on create (it defaults to `activa`). PATCH on `estado` MUST accept `activa`, `vencida`, `suspendida`, or `cancelada`; `pendiente_pago` MUST be rejected as a write value. A socio MUST NOT have two concurrent memberships with `estado=activa`.

#### Scenario: assign membership (happy path)

- GIVEN an authenticated admin or recepcionista and an existing socio and active plan
- WHEN `POST /api/memberships/membresias/` with `{ "socio": <id>, "plan": <id>, "fecha_inicio": "2026-08-19" }`
- THEN response is `201` with `{ "id", "socio", "plan", "fecha_inicio": "2026-08-19", "fecha_fin": "2026-09-18", "estado": "activa" }` (for a 30-day plan)

#### Scenario: fecha_fin computed — client value rejected

- GIVEN an admin sends `POST /api/memberships/membresias/` with `fecha_fin` in the body
- WHEN the serializer processes the request
- THEN `fecha_fin` is computed from `fecha_inicio + plan.duracion_dias` regardless of the client-supplied value

#### Scenario: pendiente_pago rejected as write input

- GIVEN an admin sends `PATCH /api/memberships/membresias/{id}/` with `{ "estado": "pendiente_pago" }`
- WHEN the serializer validates the request
- THEN response is `400` with a field-level error on `estado`

#### Scenario: retrieve membership detail includes nested plan

- GIVEN an authenticated admin or recepcionista
- WHEN `GET /api/memberships/membresias/{id}/`
- THEN response is `200` with a `plan` object (nested) containing `nombre`, `duracion_dias`, `precio`, `clases_asignadas`

#### Scenario: socio cannot access membresias list

- GIVEN an authenticated user with `rol=socio`
- WHEN `GET /api/memberships/membresias/`
- THEN response is `403`

---

### Requirement: Socio Renewal

A socio MUST be able to renew their own membership via `POST /api/memberships/me/renew/`. The request MUST include `plan_id`. The plan MUST exist and have `activo=True`; otherwise `404` is returned. The renewal MUST atomically mark all current `activa` memberships as `vencida` and create a new `activa` membership with `fecha_inicio=today` and `fecha_fin=today + plan.duracion_dias`. The endpoint MUST be accessible only to users with `rol=socio`.

#### Scenario: renewal (happy path)

- GIVEN an authenticated socio with an existing `activa` membership (plan A)
- WHEN `POST /api/memberships/me/renew/` with `{ "plan_id": <B_id> }`
- THEN response is `201` with new membership: `{ "estado": "activa", "fecha_inicio": "<today>", "fecha_fin": "<today+plan_B.duracion_dias>", "plan": { … } }`
- AND the previous membership now has `estado: "vencida"`

#### Scenario: renewal with no prior membership

- GIVEN an authenticated socio with no membership
- WHEN `POST /api/memberships/me/renew/` with a valid `plan_id`
- THEN response is `201` with a new `activa` membership (no prior membership to mark vencida)

#### Scenario: renewal with inactive plan

- GIVEN an authenticated socio
- WHEN `POST /api/memberships/me/renew/` with a `plan_id` whose `activo=False`
- THEN response is `404`

#### Scenario: renewal with non-existent plan

- GIVEN an authenticated socio
- WHEN `POST /api/memberships/me/renew/` with a `plan_id` that does not exist
- THEN response is `404`

#### Scenario: non-socio cannot call renew

- GIVEN an authenticated recepcionista
- WHEN `POST /api/memberships/me/renew/`
- THEN response is `403`

---

## Capability: access-membership-check

### Requirement: QR Access Check (has_active_membership)

The `has_active_membership(user)` service MUST return `True` only when all of the following hold:

1. `user` has a linked `Socio` record.
2. `Socio.estado` is `activo`.
3. A `Membresia` exists with `estado=activa` and `fecha_fin >= today` for that socio.

If a `Membresia` has `estado=activa` but `fecha_fin < today`, the service MUST atomically update that row to `estado=vencida` (lazy expiry) and return `False`. The update MUST occur inside a `transaction.atomic()` block using `select_for_update(skip_locked=True)`. The function MUST log the state change. No Celery or scheduled job is used.

#### Scenario: access granted (happy path)

- GIVEN a user linked to a `Socio` with `estado=activo` and a `Membresia` with `estado=activa` and `fecha_fin >= today`
- WHEN `has_active_membership(user)` is called
- THEN it returns `True`

#### Scenario: access denied — membership expired, lazy flip

- GIVEN a user linked to a `Socio` with `estado=activo` and a `Membresia` with `estado=activa` but `fecha_fin < today`
- WHEN `has_active_membership(user)` is called
- THEN it returns `False`
- AND the `Membresia` row is updated to `estado=vencida` in the same transaction

#### Scenario: access denied — no membership

- GIVEN a user linked to a `Socio` with `estado=activo` but no `Membresia` record
- WHEN `has_active_membership(user)` is called
- THEN it returns `False` (no state mutation occurs)

#### Scenario: access denied — Socio.estado = suspendido

- GIVEN a user linked to a `Socio` with `estado=suspendido` and an otherwise valid active membership
- WHEN `has_active_membership(user)` is called
- THEN it returns `False`

#### Scenario: access denied — Socio.estado = baja

- GIVEN a user linked to a `Socio` with `estado=baja`
- WHEN `has_active_membership(user)` is called
- THEN it returns `False`

#### Scenario: access denied — user has no Socio record

- GIVEN a `User` with no associated `Socio` (e.g., an admin user)
- WHEN `has_active_membership(user)` is called
- THEN it returns `False` without raising an exception

#### Scenario: concurrent scan on expired membership is consistent

- GIVEN a `Membresia` with `estado=activa` and `fecha_fin < today`
- WHEN two concurrent calls to `has_active_membership(user)` are made
- THEN both return `False`
- AND the `Membresia` row ends with `estado=vencida` (not corrupted by double-write)

---

## Endpoint Contract Summary

| Method | Path | Permission | Success | Key Errors |
|--------|------|-----------|---------|------------|
| GET | `/api/members/socios/` | admin, recep | 200 | 401, 403 |
| POST | `/api/members/socios/` | admin, recep | 201 | 400 (validation), 401, 403 |
| GET | `/api/members/socios/{id}/` | admin, recep | 200 | 401, 403, 404 |
| PATCH | `/api/members/socios/{id}/` | admin, recep | 200 | 400, 401, 403, 404 |
| POST | `/api/members/socios/{id}/dar-baja/` | admin, recep | 200 | 400 (already baja), 401, 403, 404 |
| GET | `/api/memberships/planes/` | admin, recep, socio | 200 | 401 |
| POST | `/api/memberships/planes/` | admin only | 201 | 400, 401, 403 |
| GET | `/api/memberships/planes/{id}/` | admin, recep, socio | 200 | 401, 404 |
| PATCH | `/api/memberships/planes/{id}/` | admin only | 200 | 400, 401, 403, 404 |
| GET | `/api/memberships/membresias/` | admin, recep | 200 | 401, 403 |
| POST | `/api/memberships/membresias/` | admin, recep | 201 | 400, 401, 403 |
| GET | `/api/memberships/membresias/{id}/` | admin, recep | 200 | 401, 403, 404 |
| PATCH | `/api/memberships/membresias/{id}/` | admin, recep | 200 | 400, 401, 403, 404 |
| GET | `/api/memberships/me/` | socio only | 200 | 401, 403 |
| POST | `/api/memberships/me/renew/` | socio only | 201 | 400, 401, 403, 404 |

## Invariants

- `numero_socio` is NEVER accepted as a write input from any client role.
- `pendiente_pago` is NEVER accepted as a write value for `Membresia.estado`.
- `fecha_fin` on `Membresia` is NEVER supplied by the client; it is always computed.
- A socio MUST NOT have two simultaneous memberships with `estado=activa`.
- `dar-baja` is a soft delete; `User.is_active` MUST NOT be changed by this operation.
- `has_active_membership` MUST NOT return `True` when `Socio.estado` is `suspendido` or `baja`.
