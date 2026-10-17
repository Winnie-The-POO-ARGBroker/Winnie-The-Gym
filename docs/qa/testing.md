# Testing — Estrategia, ejecución y resultados

> Última actualización: 2026-10-16 (cierre Sprint 4).

**Documentos y evidencia**

- Plan de Pruebas: [`docs/qa/plan-de-pruebas.md`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/blob/develop/docs/qa/plan-de-pruebas.md)
- Planilla de casos de prueba (Google Sheets, una pestaña por módulo): https://docs.google.com/spreadsheets/d/1Oa1nqPkpquF49ghepLkKtoCiYtFY96BJ/edit
- Matriz de trazabilidad: [`docs/qa/matriz-de-trazabilidad.md`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/blob/develop/docs/qa/matriz-de-trazabilidad.md)
- Reportes de bugs: [`docs/qa/bug-reports.md`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/blob/develop/docs/qa/bug-reports.md)
- Informe de accesibilidad WCAG 2.2 AA: [`docs/qa/informe-accesibilidad-wcag-2.2-AA.md`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/blob/develop/docs/qa/informe-accesibilidad-wcag-2.2-AA.md)
- Evidencia: [`docs/qa/evidence/`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/tree/develop/docs/qa/evidence) y [`tests/api/reports/`](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/tree/develop/tests/api/reports)

## 1. Estrategia por capas

| Capa | Herramienta | Alcance | Estado al cierre del Sprint 4 |
|---|---|---|---|
| **Backend (unit e integración)** | pytest + pytest-django | Modelos, serializers, endpoints DRF con base real | 615 tests recolectados, 9 apps |
| **Frontend (unit e integración)** | Vitest + React Testing Library | Componentes, hooks, servicios y páginas | 1060 casos en 139 archivos |
| **API (caja negra)** | Postman v2.1 + Newman | Auth, Planes y Socios: flujo completo y pruebas negativas | 13 requests, 40 aserciones |
| **E2E** | Playwright Test (TypeScript, Page Object Model) | Autenticación, CRUD de planes, flujo de socio | 17 tests: 9 pasan, 3 fallan, 5 `fixme` |
| **Accesibilidad** | axe-core + Lighthouse | WCAG 2.2 AA en 14 pantallas de los 4 roles | Ver sección 4 |
| **Manual** | Casos en la planilla | Flujos de UI y casos de los bugs | Ver el Sheet |

## 2. Cómo ejecutar

### Backend

```bash
docker compose exec backend pytest --cov=apps --cov-report=term
```

Gate de cobertura en CI: `--cov-fail-under=80`.

### Frontend

```bash
docker compose exec frontend npx vitest run --coverage
```

Umbrales en `frontend/vite.config.js`: Lines 65 %, Statements 65 %, Branches 60 %, Functions 55 %.

### API con Newman

Con el backend levantado y los usuarios de `seed_demo_users`:

```bash
npx newman run tests/api/coleccion.json -e tests/api/entorno.local.json \
  -r cli,htmlextra,junit \
  --reporter-htmlextra-export tests/api/reports/newman.html \
  --reporter-htmlextra-skipSensitiveData --reporter-htmlextra-skipHeaders \
  --reporter-junit-export tests/api/reports/newman.xml
```

`skipSensitiveData` y `skipHeaders` evitan que el reporte incluya tokens y contraseñas.

### E2E con Playwright

```bash
cd e2e && npm ci && npx playwright install chromium
E2E_ADMIN_PASS=<clave del seed> npx playwright test
```

### Accesibilidad

```bash
DEMO_USER_PASSWORD=<clave del seed> node frontend/scripts/audit-accessibility.mjs
```

Genera `docs/qa/evidence/accesibilidad/axe-report.json` y sale con código 1 si hay violaciones críticas o serias.

## 3. Resultados — cierre Sprint 4

| Suite | Resultado (16/10/2026) | Evidencia |
|---|---|---|
| Backend | 615 recolectados, **614 passed, 1 failed**. Cobertura 92,79 % | `docs/qa/evidence/backend-pytest-output-2026-10-16.txt` |
| Frontend | Última corrida reportada en el PR #355: 1047 pasan y 1 falla (`agenda.test.js`, falla igual en `develop`) | PR #355, `vitest-output-2026-10-13.txt` |
| API (Newman) | 13 requests, 40 aserciones, **0 fallas** | `tests/api/reports/newman.html` y `newman.xml` |
| E2E (Playwright) | **9 pasan, 3 fallan, 5 `fixme`**. Las fallas son selectores frágiles y etiquetas de formulario sin asociar | `e2e/evidence/` |

El test de backend que falla depende de Celery en modo eager; se registra como defecto de bajo impacto. En E2E, las fallas están documentadas y su corrección queda para el Sprint 5.

## 4. Accesibilidad

| Métrica | Antes de #355 | Después de #355 |
|---|:---:|:---:|
| Violaciones axe (14 pantallas) | 18 | 11 |
| Críticas | 4 | 0 |
| Serias | 14 | 11 |
| Lighthouse `/login` | 95 | 100 |
| Lighthouse `/registro` | 95 | 100 |

Los issues #345 a #353 se cerraron con el PR #355. Queda un problema de `color-contrast` en el layout compartido de las pantallas autenticadas, para el Sprint 5. Detalle en el informe de accesibilidad.

## 5. Bugs y trazabilidad

Los defectos se cargan como Issues con la plantilla `bug_report.md`: Sprint 3 (#78 a #85, cerrados) y Sprint 4 (reportes en `docs/qa/bug-reports.md`, con capturas en `docs/qa/evidence/bugs/`). La matriz de trazabilidad relaciona cada historia de usuario con sus casos, sus tests automatizados, el resultado y el bug asociado.

## 6. CI y brechas conocidas

El workflow `.github/workflows/ci.yml` corre backend, frontend, build y Vercel preview en cada PR.

- Newman, Playwright y axe **no corren todavía en el CI**; se ejecutan a mano. Está planificado para el Sprint 5.
- Hay tests de frontend excluidos temporalmente por cuelgues de workers en CI (`ScannerPanel`, `AforoMonitorPage`, `AccesoTerminal`, `AdminUsuariosPage`, `HistorialPagosPage`). Su alcance se cubre con casos manuales.
- La suite E2E es de apoyo hasta estabilizar los selectores.
