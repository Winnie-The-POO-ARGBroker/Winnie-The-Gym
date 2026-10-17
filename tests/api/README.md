# Winnie The Gym — API Test Suite (Newman)

Postman collection v2.1 covering Auth, Planes CRUD, Socios CRUD, and negative tests.

## Prerequisites

- Node.js ≥ 18
- newman installed: `npm install -g newman newman-reporter-htmlextra` (`newman-reporter-html` only supports Newman 4 and fails to install with Newman 6)
- Backend running at `http://localhost:8000` (via `docker compose up`)
- An admin account seeded (`python manage.py seed_demo_users`)

## Environment setup

Copy `entorno.local.json` and fill in your credentials:

```bash
cp tests/api/entorno.local.json tests/api/entorno.local.override.json
# Edit entorno.local.override.json — replace <replace-with-local-password>
```

Never commit credentials. `*.override.json` is gitignored.

## Run

```bash
npx newman run tests/api/coleccion.json \
  -e tests/api/entorno.local.json \
  -r cli,htmlextra,junit \
  --reporter-htmlextra-export tests/api/reports/newman.html \
  --reporter-htmlextra-skipSensitiveData \
  --reporter-htmlextra-skipHeaders "Authorization,Cookie,Set-Cookie" \
  --reporter-junit-export tests/api/reports/newman.xml
```

## Folder execution order

1. **Auth** — Login admin → captures `access` token.
2. **Planes CRUD** — Create → Read → Update → Delete.
3. **Socios CRUD** — Create (unique DNI) → Read → Update.
4. **Negative Tests** — 401 without token, 400 invalid payload.

## Environment variables (auto-managed)

| Variable        | Set by                          | Used by                          |
|-----------------|---------------------------------|----------------------------------|
| `access`        | Login request post-script       | All authenticated requests       |
| `plan_id`       | Crear plan post-script          | Leer / Actualizar / Eliminar plan|
| `socio_id`      | Crear socio post-script         | Leer / Actualizar socio          |
| `test_dni`      | Crear socio pre-request script  | DNI duplicate negative test      |

## Reports

HTML and JUnit XML reports are written to `tests/api/reports/` (gitignored).
