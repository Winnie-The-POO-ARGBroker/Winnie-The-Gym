# Data / DevOps hardening

Feature branch: `feature/data-devops-hardening`
Scope: MER + Mongo schemas + architecture docs, admin audit trail in MongoDB with indexes and TTL retention, real WebSocket consumer for aforo (HU08), load tests, structured JSON logs, frontend Sentry and availability report.

## Product decisions

### D1. Real WebSocket for aforo is in scope
HU08 (aforo tiempo real) is compromised in the PDF and the ABP checklist requires "Notificaciones en tiempo real (WebSockets)". Today `AforoMonitor.jsx` uses a mock and `core/asgi.py` routes to an empty `URLRouter([])`. Delivering the consumer + broadcast in this bundle closes the gap before the demo.

### D2. Admin audit trail lives in MongoDB
`core/mongodb.py::log_audit_event` was defined in a previous iteration but never called. We wire it via `post_save` / `post_delete` signals on the CRUD-critical models: `Socio`, `PlanMembresia`, `Membresia`, `Clase`, `Pago`. Keeps Postgres transactional and Mongo as the append-only audit sink.

### D3. Log retention: 90 days via TTL index
Both `qr_history` and `audit_logs` grow linearly with usage. A MongoDB TTL index on `timestamp` with `expireAfterSeconds=7776000` auto-deletes documents older than 90 days. Aligns with the 4R commitment of the PDF (Reduce + Recuperar).

## Technical decisions

### T1. MER format — `.dbml` + exported PNG/SVG
`docs/database/schema.dbml` in [dbdiagram.io](https://dbdiagram.io) format is git-friendly (plain text), editable in the browser, and exports to PNG/SVG for reports. `django-extensions graph_models` was rejected because the auto-generated layout is unreadable with 8 models.

### T2. Mongo indexes
- `qr_history`: `timestamp` (desc), `user_id`, `qr_jti`, `postgres_access_log_id` (join key)
- `audit_logs`: `timestamp` (desc), `actor_id`, `action`, `model`
- Both collections get a TTL index on `timestamp` (90 days).

Provisioned via a Django management command `create_mongo_indexes` so the same setup runs in dev, staging and prod without manual mongosh work.

### T3. WebSocket routing lives in the app
`apps/access/routing.py` defines the `ws/aforo/` URL and points to `AforoConsumer`. `core/asgi.py` imports and wires it. Same pattern as `urls.py` per Django app — no god-router in `core`.

### T4. Broadcast on AccessLog write, not on QR scan endpoint
A `post_save` signal on `AccessLog` calls `channel_layer.group_send('aforo_updates', ...)`. Decoupled from the HTTP flow: any code path that inserts an `AccessLog` (webhook, manual entry, admin action) triggers the broadcast automatically.

### T5. Aforo counter derived from AccessLog
`aforo_actual = count(ENTRY GRANTED today) - count(EXIT GRANTED today)`. Cached in Redis under `aforo:current` with 5s TTL to keep the broadcast light. Recomputed on demand from Postgres when the cache is cold.

### T6. Load test with Locust — `backend/loadtests/locustfile.py`
Python-native so devs already familiar with pytest can extend it. Scenarios: `login`, `generate_qr`, `scan_qr`, `list_aforo`. Reports go to `docs/reports/rnf01-rnf06-<fecha>.html`. Not run in CI (would need a dedicated worker) — meant to be executed on demand for RNF validation.

### T7. Availability measured from AccessLog
Approximate availability as `GRANTED / (GRANTED + DENIED[reason ∈ infra])` over a rolling window. `infra` reasons are TOKEN_EXPIRED (bug), INVALID_SIGNATURE (bug), INVALID_TOKEN (bug), REPLAY_ATTACK (feature) — the last three are business-legit denials, the first suggests infra latency. Rough proxy for RNF06 without needing external monitoring during development.

### T8. Structured JSON logs via `python-json-logger`
Standard `logging` config swapped to output JSON. Compatible with Loki / Datadog / CloudWatch when the deploy lands. Zero code changes in modules — just a formatter switch.

### T9. Frontend Sentry as opt-in via env
`@sentry/react` initialised in `main.jsx` when `VITE_SENTRY_DSN` is set. Zero cost when unset. Matches the backend Sentry opt-in pattern (`SENTRY_DSN`).

### T10. Auth on WebSocket
`AforoConsumer` only accepts sockets from users with rol in `('administrador', 'recepcionista')` or `is_staff`. Anonymous or `socio` role → close code `4403`.

## Delivery decisions

### DE1. Four atomic commits, one per phase
Same rhythm as the previous PR. Aligns with the DoD.

Commit sequence:
1. `docs(database): add MER, Mongo schemas and architecture diagram`
2. `feat(audit): persist admin CRUD events in MongoDB with TTL retention and indexes`
3. `feat(access): real-time aforo WebSocket with Channels consumer and broadcast on access change`
4. `feat(observability): add Locust load tests, structured JSON logs, frontend Sentry and availability report`

### DE2. Author: Franco-Arce
Data/DevOps scope aligns with Franco's role in the PDF. `gh-switch Franco-Arce` before the branch was created so every commit carries his authorship (matches ABP's 20% commits-per-member audit).
