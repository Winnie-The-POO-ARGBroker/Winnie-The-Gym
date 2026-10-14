# Testing — Estrategia, ejecución y resultados

> Última actualización: 2026-10-14 (cierre Sprint 4).

## 1. Estrategia por capas (pirámide)

| Capa | Framework | Alcance | Cantidad al cierre S4 |
|---|---|---|---|
| **Unit** | pytest-django (backend) + Vitest/RTL (frontend) | Funciones puras, hooks, serializers, componentes aislados | ~820 tests |
| **Integration** | APITestCase + RTL con providers | Endpoints DRF con DB, flows de componentes con React Query real | ~110 tests |
| **E2E / System** | Playwright (planeado AUT-E2E-01..07) | Flujos end-to-end desde el navegador | 3 casos de prueba documentados (CP-E2E-01..03) |
| **API Contract** | Newman + Postman v2.1 (AUT-API-01..05) | Contratos públicos con reportes HTML | 5 colecciones documentadas |

La **base de la pirámide es ancha** (unit + integration ≥ 90% de los tests) y la cúspide (E2E) usa casos canónicos de los flujos operativos más críticos (socio self-service, cobro manual recepción, admin end-to-end).

## 2. Cómo ejecutar

### Backend (pytest)

```bash
# Suite completa con coverage
docker compose exec backend pytest --cov=apps --cov-report=term

# Suite rápida sin coverage
docker compose exec backend pytest -q

# Un solo archivo
docker compose exec backend pytest apps/access/tests/test_pr3_fixes.py -v
```

Gate CI: `--cov-fail-under=80`.

### Frontend (Vitest)

```bash
# Suite completa con coverage
docker compose exec frontend npx vitest run --coverage

# Sin coverage, salida verbose
docker compose exec frontend npx vitest run --reporter=verbose

# Un solo archivo
docker compose exec frontend npx vitest run src/pages/LoginPage.test.jsx
```

Gates CI (en `vite.config.js`):
- Lines ≥ 68%
- Statements ≥ 68%
- Branches ≥ 68%
- Functions ≥ 65%

### CI pipeline

El workflow `.github/workflows/ci.yml` corre backend + frontend + build + Vercel preview. Hoy con:

- Backend: `pool='threads'` + servicios healthchecks (Postgres 16, Redis 7, MongoDB 7, libmagic1).
- Frontend: `pool='threads'` + `maxThreads=2` + `--max-old-space-size=4096` para evitar OOM en runners con memoria limitada.
- Tests excluidos temporalmente por hang de workers en CI (follow-up tracked): `ScannerPanel.test.jsx`, `AforoMonitorPage.test.jsx`, `AccesoTerminal.test.jsx`, `AdminUsuariosPage.test.jsx` (choca con nueva API `actions` prop), `HistorialPagosPage.test.jsx` (DataTable cards). Scope de QA cubierto por casos manuales (CP-FRONTEND-*) y E2E planeado.

## 3. Resultados — cierre Sprint 4

### Backend

```
401 passed (ejecución del 13/10/2026, salida en evidence/backend-pytest-output-2026-10-13.txt)
```

Cobertura global: **~95% apps**. Breakdown por app disponible en el run de `pytest --cov=apps --cov-report=term`.

### Frontend

```
Vitest run completo: 860+ tests passing (con exclusiones temporales).
Lint: 0 warnings, 0 errors.
```

Cobertura frontend post Sprint 4 (post PRs #317-#323): aprox. **80% lines, 78% branches, 70% functions**. Actualizar con próxima corrida completa.

### Casos de prueba manuales

Ver [`casos-de-prueba-v2-resumen.md`](casos-de-prueba-v2-resumen.md) y [`casos-de-prueba-v2.csv`](casos-de-prueba-v2.csv):

| | v1 | v2 |
|---|---|---|
| Casos totales | 66 | **269** |
| PASS | 61 | 247 |
| FALLA | 2 | 11 |
| PENDIENTE | 3 | 11 |

## 4. Trazabilidad HU ↔ caso ↔ test ↔ bug

Matriz completa en [`matriz-de-trazabilidad.md`](matriz-de-trazabilidad.md) + CSV asociado. Cada caso de prueba lista:
- HU relacionada (US01..US09 o "Transversal").
- Escenario #1-#3 o "N/A".
- Capa de la pirámide (unit/integration/e2e/api/manual).
- ¿Automatizable? + justificación.
- Herramienta + ID del test automatizado.

Reportes de bugs encontrados en el walkthrough del 13/10: [`bug-reports.md`](bug-reports.md).

## 5. Accesibilidad (WCAG 2.2 AA)

Informe sintético: [`informe-accesibilidad-wcag-2.2-AA.md`](informe-accesibilidad-wcag-2.2-AA.md).

Hallazgos ya documentados y linkeados a issues (etiqueta `accesibilidad`): ver sección de issues en el informe.

Auditoría manual del Sprint 4 cubrió:
- Teclado + focus visible.
- Contraste 4.5:1 texto / 3:1 UI.
- Formularios: labels asociadas, `inputMode` apropiado, `aria-live`.
- Modales: focus trap + ESC + restore focus.
- Mobile: targets ≥ 44x44 px + safe-area insets.

Auditorías automatizadas pendientes (planeado para Sprint 5): axe-core via Playwright + Lighthouse ≥ 90.

## 6. Evidencias y reportes

- `evidence/backend-pytest-output-2026-10-13.txt` — output completo del pytest run del 13/10.
- `evidence/vitest-output-2026-10-13.txt` — output completo del vitest run del 13/10.
- `evidence/bugs/` — capturas de los bugs documentados.
- `docs/qa/screenshots/2026-09-22/` — 24 capturas del walkthrough integral post-Sprint 3.
- Reportes HTML de Playwright y Newman: planeado para Sprint 5.

## 7. Políticas y buenas prácticas

### Tests que agregamos durante Sprint 4
- Preferimos `waitFor` real sobre `vi.useFakeTimers()` (los fake timers con mocks de WebSocket/Audio/MediaStream causaron hang de 30+ min en CI).
- No instanciar `AudioContext`/`MediaStream` reales en mocks — usar stubs mínimos.
- Cleanup explícito en `afterEach` (event listeners, intervals, store resets).
- Mantener los mocks de hooks compartidos actualizados cuando el hook agrega campos (ej.: `useSocioMutations` + nueva mutation `reactivar`).

### Convenciones de naming
- Backend: `test_<behavior>_when_<condition>_<expected>` (ej.: `test_exit_with_expired_membership_returns_granted`).
- Frontend: `describe('<Component>') > it('<behavior>')`.
- Casos de prueba manuales: `TC-<AREA>-<NN>` o `CP-<FLOW>-<NN>` (end-to-end).

### Gates que BLOQUEAN merge
- CI backend + frontend ambos en verde.
- Lint sin warnings.
- Cobertura por encima del threshold en `vite.config.js` / `--cov-fail-under`.
- Review de code owner por path (`.github/CODEOWNERS`).

## 8. Pendientes (Sprint 5)

- Re-habilitar los 5 test files frontend excluidos tras fix de resource leaks.
- Suite Playwright E2E (AUT-E2E-01..07).
- Colección Postman + Newman en CI (AUT-API-01..05).
- axe-core + Lighthouse automatizados.
- Breakdown de coverage backend por app en el README (follow-up de #140).
