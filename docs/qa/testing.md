# Testing — Estrategia, ejecución y resultados

> Última actualización: 2026-10-17 (cierre Sprint 4). Esta página es el punto de entrada a toda la documentación de calidad del proyecto.

## 1. Documentación de calidad

| Documento | Dónde está |
|---|---|
| Plan de Pruebas | [`docs/qa/plan-de-pruebas.md`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/blob/develop/docs/qa/plan-de-pruebas.md) |
| Planilla de Test Cases (Google Sheets, una pestaña por módulo) | https://docs.google.com/spreadsheets/d/1Oa1nqPkpquF49ghepLkKtoCiYtFY96BJ/edit |
| Matriz de Trazabilidad (HU → caso → test automatizado → resultado → bug) | [`docs/qa/matriz-de-trazabilidad.md`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/blob/develop/docs/qa/matriz-de-trazabilidad.md) |
| Reporte de Bugs | [`docs/qa/bug-reports.md`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/blob/develop/docs/qa/bug-reports.md) y [Issues con etiqueta `bug`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/issues?q=label%3Abug) |
| Informe de Accesibilidad WCAG 2.2 AA | [`docs/qa/informe-accesibilidad-wcag-2.2-AA.md`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/blob/develop/docs/qa/informe-accesibilidad-wcag-2.2-AA.md) (ver sección 7) |
| Evidencia (capturas, reportes, salidas de ejecución) | [`docs/qa/evidence/`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/tree/develop/docs/qa/evidence), [`tests/api/reports/`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/tree/develop/tests/api/reports) y [`e2e/evidence/`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/tree/develop/e2e/evidence) |

## 2. Estrategia de automatización (pirámide)

| Capa | Códigos | Herramienta | Cantidad | Qué se prueba |
|---|---|---|---|---|
| Unitaria e integración backend | AUT-BE-01 a AUT-BE-06 | pytest + pytest-django + coverage | 615 tests en 9 apps | Modelos, serializers, vistas y permisos de DRF contra PostgreSQL |
| Frontend (unitaria e integración) | — | Vitest + React Testing Library | 1060 casos en 139 archivos | Componentes, hooks, servicios y páginas |
| API (caja negra) | AUT-API-01 a AUT-API-05 | Postman v2.1 + Newman | 13 requests, 40 aserciones | Contrato HTTP de Auth, Planes y Socios, con pruebas negativas (401 y 400) |
| UI / E2E | AUT-E2E-01 a AUT-E2E-07 | Playwright Test (TypeScript) con Page Object Model | 17 tests: 11 pasan, 6 `fixme` | Autenticación (login válido e inválido parametrizado), CRUD de planes y flujo de socio |
| Accesibilidad | ACC-01 a ACC-05 | axe-core + Lighthouse + revisión manual | 14 pantallas, 4 roles | WCAG 2.2 AA |

La base de la pirámide es ancha (más de 1600 tests rápidos) y la cúspide E2E se reserva para flujos críticos.

**Qué se automatizó y qué no.** Se automatiza lo repetitivo, determinista y de costo de automatizar menor que el de ejecutar a mano varias veces. No se automatizan las pruebas exploratorias, de usabilidad ni las de un solo uso. Los 6 casos E2E en `fixme` dependen de servicios externos (Mailpit, MercadoPago, escaneo de QR) o de una respuesta rápida del registro, y se cubren con casos manuales hasta tener mocks. La planilla de casos tiene las columnas tipo de testing, capa de la pirámide, ¿automatizable? con justificación, herramienta e ID del test automatizado.

## 3. Cómo ejecutar las pruebas

Requisitos previos: Docker Desktop (Compose ≥ 2), Node 20 y el stack levantado con `docker compose up`. Los usuarios de prueba salen de `docker compose exec backend python manage.py seed_demo_users`; su clave se toma de la variable `DEMO_USER_PASSWORD`.

**Backend (AUT-BE)**

```bash
docker compose exec backend pytest --cov=apps --cov-report=term
```

Gate de cobertura en CI: `--cov-fail-under=80`.

**Frontend**

```bash
docker compose exec frontend npx vitest run --coverage
```

Umbrales en `frontend/vite.config.js`: Lines 65 %, Statements 65 %, Branches 60 %, Functions 55 %.

**API con Newman (AUT-API)**

```bash
npx newman run tests/api/coleccion.json -e tests/api/entorno.local.json \
  -r cli,htmlextra,junit \
  --reporter-htmlextra-export tests/api/reports/newman.html \
  --reporter-htmlextra-skipSensitiveData --reporter-htmlextra-skipHeaders \
  --reporter-junit-export tests/api/reports/newman.xml
```

`skipSensitiveData` y `skipHeaders` evitan que el reporte incluya tokens y contraseñas.

**E2E con Playwright (AUT-E2E)**

```bash
cd e2e && npm ci && npx playwright install chromium
E2E_ADMIN_PASS=<clave del seed> npx playwright test
```

**Accesibilidad (ACC)**

```bash
DEMO_USER_PASSWORD=<clave del seed> node frontend/scripts/audit-accessibility.mjs
```

Genera `docs/qa/evidence/accesibilidad/axe-report.json` y sale con código 1 si hay violaciones críticas o serias.

## 4. Resultados — cierre Sprint 4

| Suite | Resultado (16/10/2026) | Evidencia |
|---|---|---|
| Backend | 615 recolectados: **614 passed, 1 failed**. Cobertura 92,79 % | [`backend-pytest-output-2026-10-16.txt`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/blob/develop/docs/qa/evidence/backend-pytest-output-2026-10-16.txt) |
| Frontend | Última corrida reportada en el PR #355: 1047 pasan y 1 falla (`agenda.test.js`, falla igual en `develop` por un cálculo en UTC) | PR #355 y `vitest-output-2026-10-13.txt` |
| API (Newman) | 13 requests, 40 aserciones, **0 fallas** | [`newman.html`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/blob/develop/tests/api/reports/newman.html) y `newman.xml` |
| E2E (Playwright) | **11 pasan, 0 fallan, 6 `fixme`** | [`e2e/evidence/`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/tree/develop/e2e/evidence) |

La suite E2E detectó, en su primera corrida, fallas por selectores ambiguos (strict mode violation) en el login y en el CRUD de planes, y un formulario de registro con etiquetas sin asociar a sus campos. Sus capturas están en `e2e/evidence/` y se corrigieron en los PRs #355 y #357.

El test de backend que falla depende de Celery en modo eager y se registra como defecto de bajo impacto.

## 5. Trazabilidad con las Historias de Usuario

Cada caso de prueba de la planilla tiene la columna **HU relacionada** y el escenario de la HU que valida. El detalle criterio por criterio (27 escenarios de aceptación) está en la [Matriz de Trazabilidad](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/blob/develop/docs/qa/matriz-de-trazabilidad.md).

| HU | Tema | Casos de prueba (prefijo en la planilla) |
|---|---|---|
| US01 | Autenticación (local y Google OAuth) | TC-USERS, TC-LOGIN, TC-FRONTEND |
| US02 | Planes de membresía | TC-MEMBERSHIPS, TC-PLANES-UI |
| US03 | Socios y certificado médico | TC-MEMBERS, TC-FRONTEND (alta de socios) |
| US04 y US05 | Credencial QR y control de acceso | TC-ACCESS, TC-CREDENCIAL, TC-FRONTEND |
| US06 y US07 | Agenda y reservas de clases | TC-CLASSES, TC-FRONTEND |
| US08 | Aforo en tiempo real | TC-ACCESS (aforo) |
| US09 | Reportes administrativos | TC-REPORTS, TC-REPORTES-UI |
| Transversal | Pagos, auditoría, permisos, salud del sistema y flujos E2E | TC-PAYMENTS, TC-COMMON, CP-E2E |

Los casos del Sprint 4 se agregaron a la planilla resaltados en amarillo, y cada test automatizado se puede rastrear con `archivo::nombre` hasta su caso y su HU.

## 6. Gestión ágil: Milestones, Issues y Kanban

- **Tablero Kanban:** [Winnie The Gym — Sprint Board](https://github.com/orgs/Winnie-The-POO-ARGBroker/projects/7), con las columnas Product Backlog, To Do (Sprint Backlog), In Progress, Testing (QA) y Done.
- **Milestones:** [Sprint 3 — Verificación y Validación](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/milestone/1) y [Sprint 4 — Automatización y accesibilidad](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/milestone/2).
- **Issues por requerimiento:** [#305](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/issues/305) (AUT-API-01 a 05), [#306](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/issues/306) (AUT-E2E) y [#307](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/issues/307) (ACC-01 a 05). Cada caso de prueba tiene su Issue (`TC-<MÓDULO>-NN`).
- **Bugs:** [Issues con etiqueta `bug`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/issues?q=label%3Abug), con la plantilla `bug_report.md`, y capturas en `docs/qa/evidence/bugs/`.

## 7. Accesibilidad

Informe completo: [`informe-accesibilidad-wcag-2.2-AA.md`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/blob/develop/docs/qa/informe-accesibilidad-wcag-2.2-AA.md). Auditoría automatizada con axe-core sobre 14 pantallas de los 4 roles, Lighthouse sobre las pantallas públicas y checklist manual.

| Métrica | Antes de #355 | Después |
|---|:---:|:---:|
| Violaciones axe (14 pantallas) | 18 | 6 |
| Críticas | 4 | 0 |
| Serias | 14 | 6 |
| Lighthouse `/login` | 95 | 100 |
| Lighthouse `/registro` | 95 | 100 |

Los hallazgos se reportaron como Issues con la etiqueta [`accesibilidad`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/issues?q=label%3Aaccesibilidad): #345 a #353, todos cerrados con el PR #355. Las 6 violaciones que quedan son de `color-contrast` en insignias de estado (apto médico, pagos, accesos y credencial).

Reportes de evidencia: [`docs/qa/evidence/accesibilidad/`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/tree/develop/docs/qa/evidence/accesibilidad).

## 8. CI y brechas conocidas

El workflow `.github/workflows/ci.yml` corre backend, frontend, build y Vercel preview en cada PR.

- Newman, Playwright y axe **no corren todavía en el CI**; se ejecutan a mano. Está planificado para el Sprint 5.
- Hay tests de frontend excluidos temporalmente por cuelgues de workers en CI (`ScannerPanel`, `AforoMonitorPage`, `AccesoTerminal`, `AdminUsuariosPage`, `HistorialPagosPage`). Su alcance se cubre con casos manuales.
- Los 6 casos E2E en `fixme` requieren servicios externos y quedan para el Sprint 5.
