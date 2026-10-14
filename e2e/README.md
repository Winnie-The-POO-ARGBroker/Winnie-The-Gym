# Winnie The Gym — E2E Test Suite (Playwright)

TypeScript Playwright suite covering auth, planes CRUD, and the full socio self-service flow (CP-E2E-01).

## Prerequisites

- Node.js ≥ 18
- Frontend running at `http://localhost:5173`
- Backend running at `http://localhost:8000`
- `docker compose up` with seeded data (`seed_demo_users`)

## Setup

```bash
cd e2e
npm install
npx playwright install chromium
```

## Run

```bash
# All tests (headless)
npx playwright test

# With visible browser
npx playwright test --headed

# Specific spec
npx playwright test tests/auth.spec.ts

# View last HTML report
npx playwright show-report
```

## Environment variables

| Variable          | Default                    | Purpose                        |
|-------------------|----------------------------|--------------------------------|
| `E2E_BASE_URL`    | `http://localhost:5173`    | Frontend base URL              |
| `E2E_API_URL`     | `http://localhost:8000`    | Backend base URL               |
| `E2E_ADMIN_EMAIL` | `admin@winnie.local`       | Admin login email              |
| `E2E_ADMIN_PASS`  | `admin_password_here`      | Admin login password           |
| `MAILPIT_URL`     | `http://localhost:8025`    | Mailpit API for email testing  |

## Specs

| File | Coverage |
|------|----------|
| `tests/auth.spec.ts` | Login valid, ≥4 invalid combos (parametrized), session-expired banner |
| `tests/planes-crud.spec.ts` | Create plan, read, edit, delete (fixme guard), cancel modal |
| `tests/cp-e2e-01-socio-full.spec.ts` | Full socio flow — Phases 1–5 per CP-E2E-01 |

## fixme tests

Several tests are marked `test.fixme()`. These represent real test cases that are
blocked by infrastructure dependencies:

- **Activation email** — requires Mailpit in docker compose.
- **Cert médico upload** — depends on an activated account.
- **Checkout → MercadoPago** — requires a mock/fake MP preference endpoint.
- **QR access** — requires a second context acting as the reception terminal.
- **Plan delete** — requires ≥2 seeded plans so the single-plan guard doesn't fire.

See `e2e/evidence/` for screenshots documenting the known failure states.

## Page Objects

| Class | File |
|-------|------|
| `LoginPage` | `pages/LoginPage.ts` |
| `DashboardPage` | `pages/DashboardPage.ts` |
| `PlanesAdminPage` | `pages/PlanesAdminPage.ts` |
| `PlanFormModal` | `pages/PlanFormModal.ts` |
| `SocioCheckoutPage` | `pages/SocioCheckoutPage.ts` |

## Selector strategy

1. `data-testid` — always preferred, present on all interactive elements.
2. ARIA role (`getByRole`) — accessible name matching.
3. Visible text (`getByText`) — last resort for read-only content.

Never: absolute XPath, index-based selectors, `waitForTimeout`.
