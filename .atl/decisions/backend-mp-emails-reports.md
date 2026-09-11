# Backend — MercadoPago + Emails + Reports

Feature branch: `feature/backend-mp-emails-reports`
Scope: MercadoPago Checkout Pro integration, transactional emails via Anymail/Mailtrap, scheduled expiration jobs, report exports (CSV/PDF/XLSX), API documentation and hardening.

## Product decisions

### D1. Payment model — single manual monthly charge
The socio triggers each payment manually from the app. No automatic recurring debit. Chosen because it fits the MVP scope, is simpler to demo in the ABP defense, and does not require MP `Preapproval Plan`.

Alternatives discarded:
- MP automatic subscriptions (`Preapproval`) — heavier to implement, harder to test end-to-end within the deadline.

### D2. Checkout Pro over Checkout API
Chosen because it delegates card entry, 3DS and PCI to MP, cuts frontend complexity by ~5 days, and still counts as "external API with real value" for the ABP requirement.

Alternatives discarded:
- Checkout API / API Orders — overkill for MVP; newer API with less community coverage.

### D3. Payment state semantics
- `pendiente` → membership stays in `pendiente_pago`, no access granted.
- `aprobado` → membership becomes `activa` with `fecha_vencimiento = today + plan.duracion_dias`.
- `rechazado`, `cancelado`, `reembolsado` → membership goes back to (or stays in) `pendiente_pago`.
- Only `aprobado` activates the membership. `pendiente` never activates.

### D4. Expiration alerts cadence
Celery Beat runs a daily job that checks memberships and emails the socio:
- 7 days before `fecha_vencimiento`
- 3 days before `fecha_vencimiento`
- 1 day before `fecha_vencimiento`
- On the vencimiento day → also flips `estado` to `vencida`

Deduplication: `Membresia.avisos_enviados` (JSONField) records which alerts were fired so the job never sends the same alert twice.

### D5. Session timeout — 30 min uniform across roles
RNF05 requires 30 min for admin/receptionist. Applying it uniformly to socios too keeps `SIMPLE_JWT` config trivial and improves the security posture without hurting UX (frontend can silently refresh with the refresh token).

### D6. Email sender identity
- `DEFAULT_FROM_EMAIL = "Winnie The Gym <hello@demomailtrap.co>"` — Mailtrap-owned domain (no ownership needed).
- Global reply-to: `fodrii2001@gmail.com`.
- Friendly name "Winnie The Gym" carries the brand; the address is invisible in most clients.

Alternatives discarded:
- Buying a proper domain — out of MVP scope.
- Using `fodrii2001@gmail.com` as sender — personal email exposure.

### D7. Report columns
- **Morosidad**: `dni, apellido, nombre, plan, fecha_vencimiento, dias_atraso, monto_adeudado, telefono, email`
- **Facturación mensual**: `fecha_pago, socio_dni, socio_nombre, plan, monto, metodo_pago, estado, mp_payment_id`
- **Asistencia**: `fecha, hora_ingreso, hora_egreso, socio_dni, socio_nombre, plan, permanencia_minutos`

All three respect any active filter passed via query string.

## Technical decisions

### T1. Anymail HTTP over raw SMTP
`django-anymail[mailtrap]` uses Mailtrap's HTTP API. Simpler config (1 env var vs 5), faster than SMTP handshake, and lets us swap providers by flipping `EMAIL_BACKEND` in env only.

Alternatives discarded:
- Raw SMTP — more env variables, slower, harder to swap providers.

### D8. Manual charge is trusted
The manual charge endpoint (recepcionista contingency for MP outages, PDF risk #3) does not call MP. It records a `Pago(metodo='manual', estado='aprobado')` and activates the membership right away. Only receptionists and admins can call it.

### T2. Webhook — HMAC signature + idempotency
- Every incoming webhook validates the `x-signature` header against `MP_WEBHOOK_SECRET` (HMAC-SHA256) before touching the DB.
- Idempotency guaranteed by `Pago.mp_payment_id UNIQUE`. Replays are safely no-ops.
- Endpoint is unauthenticated (MP does not send auth headers) but signature-locked.

### T3. Async emails by default, sync fallback
`send_templated_email(...)` enqueues via Celery when the broker is reachable and falls back to synchronous send otherwise. Prevents dev environments without workers from silently dropping emails.

### T4. Naming — Spanish for domain, English for infra
- Models, fields, endpoints, state values → Spanish (project convention, e.g. `Pago`, `monto`, `aprobado`).
- Test files, factories, docstrings → English (project convention).
- New app is named `payments` (English) to match `apps.access`, `apps.members`, etc.

### T5. Cross-app FKs use string form (ADR-7)
`Pago.membresia` is declared as `'memberships.Membresia'`. Same for `socio` and `plan`. Aligns with the pre-existing ADR-7 comment in `apps/memberships/models.py`.

### T6. Pagination — global PageNumberPagination
`page_size=10`, `page_size_query_param='page_size'`, `max_page_size=100`. Applied via `REST_FRAMEWORK['DEFAULT_PAGINATION_CLASS']` so every ViewSet inherits it without changes.

### T7. Filters — django-filter
Filter classes live next to the ViewSet (`apps/{app}/filters.py`). Search fields defined via `filterset_class`. Text search uses DRF's `SearchFilter` on top for HU06.

### T8. Endpoint naming
```
POST   /api/payments/preferencias/         (socio → creates MP preference)
POST   /api/payments/webhook/              (MP → notifies, no auth, signature-locked)
POST   /api/payments/cobros-manuales/      (recepcionista → manual charge)
GET    /api/payments/pagos/                (list w/ filters)

GET    /api/reportes/morosidad/?format=csv|pdf|xlsx
GET    /api/reportes/facturacion/?format=csv|pdf|xlsx&mes=YYYY-MM
GET    /api/reportes/asistencia/?format=csv|pdf|xlsx

POST   /api/auth/password-reset/
POST   /api/auth/password-reset/confirm/

GET    /api/schema/     (OpenAPI JSON)
GET    /api/docs/       (Swagger UI)
```

### T9. Celery broker/backend on Redis (already in stack)
- `CELERY_BROKER_URL = redis://redis:6379/1`
- `CELERY_RESULT_BACKEND = redis://redis:6379/2`

Reuses the existing Redis container. No new external dependency.

### T10. Celery Beat scheduler — DatabaseScheduler
`django_celery_beat.schedulers:DatabaseScheduler` lets admins edit the cron from Django admin. Default schedule: expiration check runs daily at 09:00 America/Argentina/Buenos_Aires.

### T11. Local development uses ngrok tunnel
- Fixed reserved domain: `https://courteously-proprietorial-dwayne.ngrok-free.dev`
- MP webhook URL registered on the MP panel points to this domain.
- Vite `allowedHosts` already updated to accept the tunnel hostname.

## Delivery decisions

### DE1. Four atomic commits, one per phase
Each commit is a self-contained, reviewable slice. Aligns with the DoD from the PDF ("PR reviewed by another dev"), enables partial revert, and cuts the review load compared to a single mega commit.

Commit sequence:
1. `feat(backend): add API docs, pagination, filters, advanced search and session hardening`
2. `feat(backend): add async email delivery via Anymail/Mailtrap with Celery scheduled jobs`
3. `feat(payments): integrate MercadoPago Checkout Pro with webhook and manual charge`
4. `feat(reports): add CSV/PDF/XLSX exports for morosidad, facturación and asistencia`

### DE2. Pragmatic testing style
Tests are written right after each functional module, then the full pytest suite is run before the phase commit. No strict TDD (writing tests first) — pragmatic to keep the pace of the automatic run.
