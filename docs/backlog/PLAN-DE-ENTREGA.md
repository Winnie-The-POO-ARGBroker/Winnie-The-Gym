# Planning de entrega — Backlog completo y Verificación & Validación

Documento pensado para copiarse. Los identificadores de fichas (`BK-XXX-NN`) están en `docs/backlog/items/`. Los PRs los hacen **Franco** y **Rodrigo**, con revisión cruzada (cada PR lo aprueba el otro).

## 0. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Frontend | React/Vite (aprobado por la cátedra; la consigna dice Angular). Dejarlo escrito en el Plan de Pruebas. |
| Storage de media en producción | **Supabase** (`apps.common.storages.SupabaseMediaStorage`), declarado en `STORAGES["default"]`. Hecho en el hotfix H1. |
| Automatización E2E | **Playwright Test en TypeScript** (`e2e/`), con Page Object Model. |
| Alcance del backlog | **Las 88 fichas.** Las 13 de prioridad P3 son ideas que necesitan decisión de producto antes de implementarse (ver sección 6). |
| Quién hace PRs | Solo Franco y Rodrigo. Magali, Gisele y Jimena trabajan la planilla y el Plan en Google Docs/Sheets. |

## 1. Resumen y capacidad

- **88 fichas** → **16 PRs** de backlog (B1–B16) + **6 PRs** de entrega (H1, D1–D5). Los PRs de backlog se **mergean con squash**: en `develop` queda **1 commit por PR**, aunque dentro del PR haya varios commits de trabajo.
- Prioridades: P0 = 19, P1 = 38, P2 = 18, P3 = 13. Tamaños: S = 12, M = 42, L = 26, XL = 8.
- **Esfuerzo estimado del backlog: 284 días-persona** (S = 0,5 · M = 2 · L = 5 · XL = 8; los XL son "más de una semana", se toma el piso). Con dos personas al 100 % son **~28 semanas**. Reparto: Rodrigo 114 d, Franco 133 d, B16 compartido 37 d.
- **Advertencia honesta:** esto no entra en el Sprint 4 (vence el 16/10). El Sprint 4 se cubre con los PRs H1 y D1–D5. El backlog es un plan de varios meses y conviene priorizar por olas: B1–B8 cubren 18 de los 19 P0 (el restante es BK-SOC-02, en B12) y todos los problemas de seguridad.
- Los PRs de backlog superan por mucho el presupuesto de 400 líneas de revisión. Recomendación: abrir cada B como rama "tracker" y entregarlo en PRs encadenados por ficha cuando el diff sea grande; el squash final sigue dejando 1 commit.

## 2. Entrega del Sprint 4 (vence el 16/10/2026)

### Estado de lo ya hecho

- [x] Backlog de 88 fichas con índice y plantilla (`docs/backlog/`).
- [x] 6 bugs reproducidos con captura y evidencia de red (`docs/qa/evidence/bugs/`, `docs/qa/bug-reports.md`, `frontend/scripts/capture-bug-evidence.mjs`).
- [x] **Hotfix de Render** (`MEDIA_URL` sin barra final → `urls.E006`) y **storage de Supabase** en `STORAGES`. 6 tests nuevos en `backend/apps/common/tests/test_production_settings.py`; suite backend completa: **401 passed, 95,48 % de cobertura**. Falta commitear, pushear y redeployar.
- [ ] En Render verificar las variables `SUPABASE_STORAGE_ACCESS_KEY`, `SUPABASE_STORAGE_SECRET_KEY`, `SUPABASE_STORAGE_ENDPOINT`, `SUPABASE_STORAGE_PUBLIC_URL_BASE` y `SUPABASE_STORAGE_BUCKET`: con `STORAGES` activo, una subida sin credenciales va a fallar.

### 2.1 Corregir lo entregado en Sprint 3

Devolución de la cátedra sobre el Plan de Pruebas y los Test Cases:

- [ ] **Plan de Pruebas** (`docs/qa/plan-de-pruebas.md`, y regenerar el PDF):
  - [ ] Completar "Historial de Versiones" y "Aprobaciones" (Magali Bechis como líder, Viviana Guillén como patrocinadora).
  - [ ] Completar "Pruebas de Regresión" (hoy solo el título).
  - [ ] Criterio de aceptación por severidad: 0 defectos bloqueantes y 0 altos sin mitigar, en lugar de "100% de 233 tests".
  - [ ] Quitar el riesgo "ausencia de CI/CD": `.github/workflows/ci.yml` existe (pytest con cobertura, lint, vitest, build).
  - [ ] Actualizar el conteo de tests: el Plan dice 233, pero `pytest` da **399 passed** con 95,26 % de cobertura (395 existentes + 4 del hotfix de Render). Falta contar los de `vitest`.
  - [ ] Dejar escrito que React/Vite fue aprobado en lugar de Angular.
- [ ] **Casos de prueba** (`docs/qa/casos-de-prueba.csv` y la planilla de Google Sheets del equipo):
  - [ ] Hacer atómicos los casos con varios escenarios (TC-ACCESS-04 y los de la misma forma): una condición variable por caso.
  - [ ] Agregar columna **HU relacionada** (US01–US09).
  - [ ] Corregir TC-MEMBERS-06 (el "Resultado Obtenido" está copiado de TC-MEMBERS-03).
  - [ ] Reemplazar la columna "Evidencia" por enlaces reales (PNG del repo o Drive), con el código del bug en los que fallan.
  - [ ] Agregar columnas del Sprint 4: tipo de testing, capa de la pirámide, ¿automatizable? (con justificación), herramienta e ID del test automatizado.
- [ ] **Bugs**: cargar como Issues los reportes de [`docs/qa/bug-reports.md`](../qa/bug-reports.md) (etiqueta `bug`).
- [ ] **Gestión**: crear Milestone "Sprint 3" y "Sprint 4", asociar issues, actualizar el tablero (columnas Todo / In Progress / Testing (QA) / Done / Fix ya existen).
- [x] Evidencia fotográfica de 6 bugs reproducidos (ver 2.3).

> Ojo: la consigna pide que el historial de cambios de la planilla (Google Sheets) muestre la participación de cada integrante. El CSV del repo es un espejo: cada cambio se tiene que reflejar también en la planilla.

### 2.2 Entregables del Sprint 4

| Entregable | Código | Estado |
|---|---|---|
| Planilla clasificada (tipo, capa, automatizable, herramienta, ID de test) | — | [ ] |
| Suite backend DRF + PostgreSQL con reporte de cobertura | AUT-BE-01..06 | [~] existe: 233 passed (evidencia en `docs/qa/evidence/backend-pytest-output.txt`). Falta verificar patrón AAA, 401/403/405 por verbo y uso de `reverse()`. |
| Colección Postman v2.1 + entornos + reportes HTML y JUnit de Newman | AUT-API-01..05 | [ ] no existe |
| Suite E2E Playwright con Page Object (≥3 flujos críticos) + evidencia de un fallo (screenshot, video o trace) | AUT-E2E-01..07 | [ ] no existe. Playwright 1.63 está instalado en `frontend/package.json` y los 3 flujos ya están diseñados (CP-E2E-01..03, `docs/qa/plan-de-pruebas.md` §27) |
| `data-testid` en los componentes de los flujos automatizados (Definition of Done) | AUT-E2E | [ ] solo hay 2 en `frontend/src` |
| Informe de accesibilidad: axe-core, Lighthouse ≥ 90, checklist manual, ≥ 3 bugs `accesibilidad` | ACC-01..05 | [ ] no existe. Tres hallazgos ya medidos en BK-MOB-11 |
| Matriz de Trazabilidad: HU → caso de prueba → test automatizado → resultado → bug | — | [ ] no existe. Las 27 filas (US01–US09 × 3 escenarios) salen del Product Backlog |
| Milestone Sprint 4 + página `Testing.md` de la Wiki ampliada | — | [ ] |

#### Cómo organizar la suite E2E

Decisión: **Playwright Test en TypeScript** dentro de `e2e/` (la consigna admite Python o TypeScript). Motivo: `playwright` ya es dependencia del frontend, `@axe-core/playwright` se integra directo y evitamos agregar un toolchain Python para el navegador. Contra: la consigna recomienda Python por coherencia con el backend; si prefieren Python hay que sumar `pytest-playwright`.

```
e2e/
  pages/        # un Page Object por pantalla: LoginPage, DashboardPage, CredencialPage,
                # AccesoTerminalPage, CobroManualPage, UsuariosPage, SociosPage, PlanesPage...
  tests/
    auth.spec.ts          # AUT-E2E: login exitoso + login inválido parametrizado (≥ 4 combinaciones)
    crud-planes.spec.ts   # CRUD del módulo principal (planes o socios)
    flujo-acceso.spec.ts  # CP-E2E-01/02: alta, pago, credencial QR, acceso concedido
    accesibilidad.spec.ts # axe-core por pantalla principal
  playwright.config.ts
```

Reglas de la consigna: selectores por `data-testid` → rol ARIA → texto; **sin XPath absoluto ni esperas ciegas**; cada test indica en su docstring la HU y el TC que valida; Page Objects con métodos de negocio y sin aserciones. Datos de prueba por API (no por UI) para que los tests sean herméticos. Cuentas: `seed_demo_users`.

Los 3 flujos críticos (ya diseñados, solo hay que automatizarlos):
1. **Autenticación**: login válido por rol + login inválido parametrizado.
2. **CP-E2E-01**: nuevo socio self-service hasta acceso concedido.
3. **CP-E2E-02**: cobro manual de recepcionista + verificación de credencial y del historial del socio.

#### Cómo organizar Postman + Newman

```
tests/api/
  coleccion.json         # Postman v2.1, una carpeta por recurso
  entorno.local.json     # {{baseUrl}}, {{adminEmail}}, {{adminPassword}} (sin credenciales escritas en los requests)
  reportes/              # salida de Newman: HTML + JUnit XML
```

- Recursos mínimos: **Auth** (login, refresh) y **Planes** y **Socios** (CRUD completo POST → GET → PUT/PATCH → DELETE, con el `id` creado propagado por variable de colección).
- Cada request valida con scripts: código de estado, presencia y tipo de campos del cuerpo.
- Al menos una prueba negativa por recurso: payload inválido → 400 con mensaje estructurado, y request sin token → 401.
- Newman: `newman run tests/api/coleccion.json -e tests/api/entorno.local.json -r cli,junit,html --reporter-junit-export tests/api/reportes/junit.xml --reporter-html-export tests/api/reportes/reporte.html`.
- Sumar un job a `.github/workflows/ci.yml` o documentar el comando en la Wiki (la consigna pide "ejecución en verde en el pipeline").

### 2.3 Evidencia de bugs

- [x] Script reproducible: [`frontend/scripts/capture-bug-evidence.mjs`](../../frontend/scripts/capture-bug-evidence.mjs).
- [x] 6 bugs con captura y evidencia de red en [`docs/qa/evidence/bugs/`](../qa/evidence/bugs/): BK-BUG-01, BK-BUG-03, BK-BUG-04, BK-SOC-02, BK-SOC-03, BK-MOB-02.
- [x] Reportes en formato de la consigna: [`docs/qa/bug-reports.md`](../qa/bug-reports.md).
- [ ] **Sin reproducir con la base actual**: BK-CLS-01 (la base local tiene solo 4 clases; hay que sembrar 12), BK-FIN-07 (modifica datos), BK-MOB-12 (cabecera de Vercel, solo en producción: `curl -sI <url-de-prod>`).

### 2.4 PRs de entrega y calendario

| PR | Quién | Rama | Commit | Contenido | Fecha objetivo |
|---|---|---|---|---|---|
| **H1** | Rodrigo | `fix/render-media-storage` | `fix(deploy): end MEDIA_URL with a slash and use Supabase in STORAGES for production` | `backend/core/settings/production.py`, `backend/apps/common/storages.py` (docstring), `backend/apps/common/tests/test_production_settings.py` | 13/10 (hoy) |
| **D1** | Rodrigo | `docs/backlog-y-evidencia-bugs` | (a) `docs(backlog): add gap backlog with 88 sheets, index and planning` · (b) `docs(qa): add bug reports with screenshot evidence and capture script` | `docs/backlog/**`, `docs/qa/bug-reports.md`, `docs/qa/evidence/bugs/**`, `frontend/scripts/capture-bug-evidence.mjs` | 13/10 |
| **D2** | Rodrigo | `docs/qa-correcciones-sprint-3` | `docs(qa): fix sprint 3 test plan and cases and add traceability matrix` | Plan corregido, CSV atómico con columna HU y columnas del Sprint 4, Matriz de Trazabilidad (27 escenarios US01–US09) | 14/10 |
| **D3** | Franco | `test/api-postman-newman` | `test(api): add Postman v2.1 collection with Newman reports` | `tests/api/**`, comando Newman documentado y, si alcanza, job en `ci.yml` | 14/10 |
| **D4** | Franco | `test/e2e-playwright-ts` | `test(e2e): add Playwright TypeScript suite with page objects for critical flows` | `e2e/**`, `data-testid` en los componentes de los flujos, `playwright.config.ts`. Agregar `@playwright/test` y `@axe-core/playwright` | 15/10 |
| **D5** | Rodrigo | `test/accesibilidad-sprint-4` | `test(a11y): add axe-core checks and accessibility report` | `e2e/tests/accesibilidad.spec.ts` (depende de D4), informe en `docs/qa/`, issues `accesibilidad` | 16/10 |

Fuera de los PRs (Rodrigo): milestones Sprint 3 y 4, carga de issues, ampliar `Testing.md` en la Wiki (repo `Winnie-The-Gym.wiki.git`) y sincronizar la planilla de Google Sheets.

## 3. Backlog completo — 16 PRs (B1–B16)

Orden de ejecución = orden de la tabla. Las dependencias entre fichas están verificadas: cada ficha depende solo de fichas del mismo PR o de PRs anteriores. Dos PRs consecutivos de personas distintas se pueden hacer en paralelo (B1 con B2, B3 con B4, etc.).

| PR | Quién | Fichas | Días | Commit de squash |
|---|---|---|---|---|
| **B1** · Pagos: fuga de datos y cobro (P0) | Franco | 3 | 12 | `fix(payments): stop cross-member payments, free renewals and fragile MercadoPago webhook` |
| **B2** · Bugs rápidos de frontend y auditoría | Rodrigo | 6 | 4.5 | `fix(frontend): staff profile, create-staff button, attendance redirect, modal a11y and audit actor` |
| **B3** · Contratos de listados, paginación y planes | Franco | 4 | 6.5 | `fix(api): honor page_size on list contracts and remove phantom plan fields` |
| **B4** · Terminal de acceso y aforo | Rodrigo | 6 | 18 | `feat(access): exit flow, anti-passback, present list and enforced capacity` |
| **B5** · Reportes, morosidad y pagos globales | Franco | 5 | 17.5 | `feat(reports): real metrics, delinquency criteria and global payments screen` |
| **B6** · Socios: alta, ABM, estados y cuentas | Rodrigo | 7 | 15.5 | `fix(members): reception signup, admin CRUD, status enforcement, password and activation flows` |
| **B7** · Clases: modelo por fecha y reglas de reserva | Franco | 6 | 24 | `feat(classes): dated sessions, catalogs, booking rules and attendance contract` |
| **B8** · Mobile: base de navegación, modales y formularios | Rodrigo | 8 | 16 | `feat(mobile): staff More menu, member navigation, sheet modals, touch forms and safe areas` |
| **B9** · Clases: UI, lista de espera y asistencia | Franco | 4 | 8 | `feat(classes): waitlist promotion, admin calendar, member classes and real attendance actions` |
| **B10** · Mobile: tablas, calendario, tablet, a11y y PWA | Rodrigo | 6 | 21 | `feat(mobile): card tables, agenda calendar, tablet layout, accessibility and installable PWA` |
| **B11** · Acceso: historial, QR del socio y seguridad | Franco | 6 | 24 | `feat(access): history screen, member activity, analytics, schedules, QR hardening and audit` |
| **B12** · Apto médico, perfil y portal del socio | Rodrigo | 7 | 18.5 | `feat(members): medical certificate lifecycle, richer profile data, member portal states and account deletion` |
| **B13** · Membresías: ciclo de vida y cobros manuales | Franco | 4 | 23 | `feat(memberships): lifecycle actions, manual payment audit, receipts and cash close` |
| **B14** · Plataforma: estados de error, auditoría y operación | Rodrigo | 8 | 20.5 | `feat(platform): error boundary, 403/offline/session states, audit viewer, settings and backups` |
| **B15** · Clases: instructor, reportes y calendario mensual | Franco | 3 | 18 | `feat(classes): instructor entity, class reports and monthly calendar` |
| **B16** · Ideas de plataforma (requieren decisión de producto) | Franco + Rodrigo | 5 | 37 | `feat(platform): notifications, bulk communications, granular permissions, multi-branch and trainers` |

### Detalle por PR

#### B1 · Pagos: fuga de datos y cobro (P0)  —  Franco  —  12 días

| Ficha | Título | Prio | Tam. | Estado en código | Depende de |
|---|---|---|---|---|---|
| BK-FIN-05 | Ficha de socio y "Mis pagos" - historial de otro socio, estados cancelado/reembolsado en verde y datos crudos | P0 | M | roto | — |
| BK-FIN-07 | Renovación self-service - cerrar el endpoint que activa membresías gratis y definir la política de apilado de días | P0 | M | roto | BK-FIN-08 |
| BK-FIN-08 | Pago con MercadoPago end-to-end - webhook robusto, estados completos (cancelado/reembolsado) y retorno del checkout confiable | P0 | XL | ui-parcial | BK-FIN-07, BK-FIN-05 |

#### B2 · Bugs rápidos de frontend y auditoría  —  Rodrigo  —  4.5 días

| Ficha | Título | Prio | Tam. | Estado en código | Depende de |
|---|---|---|---|---|---|
| BK-BUG-01 | El perfil de administrador/recepcionista nunca carga (GET /api/auth/profile/ devuelve 404) | P0 | M | roto | — |
| BK-BUG-03 | El botón "Crear staff" no se renderiza (prop `actions` inexistente en TopBar) y el estado "Activo/Pendiente" es falso | P0 | S | roto | — |
| BK-BUG-04 | "Abrir terminal completa de asistencia" siempre termina en "Clase no encontrada" (el redirect legacy descarta ?id=) | P0 | S | roto | — |
| BK-BUG-09 | FilterPanel se recorta en el borde derecho (desktop) y el Modal no atrapa el foco ni devuelve el foco / repite ids | P2 | S | roto | — |
| BK-BUG-10 | Deuda técnica: API de React Query v4 usada con v5 (`isLoading` de mutaciones, `keepPreviousData`) y código muerto (ComingSoonPage, rama `mock-`, rutas alias) | P2 | S | roto | BK-BUG-04 |
| BK-PLT-12 | Auditoría: el actor de los eventos de API queda como `system` (la identidad del usuario JWT no llega al middleware) | P1 | S | roto | — |

#### B3 · Contratos de listados, paginación y planes  —  Franco  —  6.5 días

| Ficha | Título | Prio | Tam. | Estado en código | Depende de |
|---|---|---|---|---|---|
| BK-CLS-01 | El listado de clases queda truncado a 10 registros (page_size ignorado) | P0 | S | roto | — |
| BK-ACC-05 | Contratos frontend/backend desalineados en aforo y logs (limit ignorado, stats sin aforo_actual, "/200" hardcodeado) | P0 | M | roto | — |
| BK-BUG-06 | Planes: subtítulo, beneficios y matriz comparativa no existen en el backend (la UI los muestra/guarda igual) y borrar un plan con membresías devuelve 500 | P1 | M | ui-parcial | — |
| BK-BUG-08 | Datos inventados en la UI: "Sede Central" en la credencial, gráfico de ingresos con curva fija, formulario de clases pre-llenado y placeholders de rol | P2 | M | ui-parcial | BK-BUG-06 |

#### B4 · Terminal de acceso y aforo  —  Rodrigo  —  18 días

| Ficha | Título | Prio | Tam. | Estado en código | Depende de |
|---|---|---|---|---|---|
| BK-ACC-01 | Terminal de acceso sin flujo de salida (todo se registra como ENTRY) y salida bloqueada por membresía vencida | P0 | M | roto | — |
| BK-ACC-02 | Anti-passback (doble entrada / salida sin entrada) y estado "Atención" en el terminal | P1 | M | ui-parcial | BK-ACC-01 |
| BK-ACC-09 | Terminal de acceso — robustez (cámara, red, DNI), feedback sonoro/háptico y accesibilidad | P1 | M | ui-parcial | BK-ACC-01 |
| BK-ACC-06 | Aforo máximo efectivo — alertas de umbral y bloqueo opcional de ingresos al llegar a capacidad | P1 | L | ui-parcial | BK-ACC-05, BK-ACC-01 |
| BK-ACC-07 | Corregir aforo desfasado — lista de presentes, salida manual y cierre automático de día | P1 | L | no-existe | BK-ACC-01, BK-ACC-02 |
| BK-PLT-14 | La configuración de aforo máximo y horarios no se aplica en el backend (solo se muestra) | P2 | M | ui-parcial | BK-ACC-06 |

#### B5 · Reportes, morosidad y pagos globales  —  Franco  —  17.5 días

| Ficha | Título | Prio | Tam. | Estado en código | Depende de |
|---|---|---|---|---|---|
| BK-FIN-03 | Morosidad y vencimientos - criterio correcto de "moroso", alertas del dashboard y recordatorios automáticos | P1 | L | ui-parcial | BK-FIN-05 |
| BK-FIN-01 | Reportes - las métricas de la pantalla salen de datos truncados y de un gráfico fijo | P0 | L | roto | BK-FIN-03, BK-FIN-05 |
| BK-FIN-02 | Exportes de reportes - validar parámetros, rangos de fechas, filtro por plan, totales y columnas numéricas | P1 | M | ui-parcial | BK-FIN-01 |
| BK-FIN-04 | Pantalla "Pagos y facturación" (listado global con filtros, totales y exporte) | P1 | L | backend-sin-ui | BK-FIN-05, BK-FIN-02 |
| BK-SOC-03 | La pestaña "Pagos" del detalle de socio lista los pagos de TODOS los socios (filtro `socio_id` inexistente) | P0 | S | roto | BK-FIN-01 |

#### B6 · Socios: alta, ABM, estados y cuentas  —  Rodrigo  —  15.5 días

| Ficha | Título | Prio | Tam. | Estado en código | Depende de |
|---|---|---|---|---|---|
| BK-SOC-07 | ABM de socios (admin): email invisible/no editable, sin "Reactivar", DELETE peligroso, validaciones inconsistentes y estados de carga rotos | P1 | M | ui-parcial | BK-SOC-08 |
| BK-SOC-01 | El "Alta en Recepción" no puede crear socios (403 para recepcionista, teléfono faltante, plan y cobro de mentira) | P0 | L | roto | BK-FIN-01 |
| BK-BUG-02 | "Alta en Recepción" no puede crear socios (falta teléfono, 403 para recepcionista) y muestra campos que no existen | P0 | M | roto | BK-FIN-01 |
| BK-SOC-08 | Un socio suspendido o dado de baja sigue reservando clases, generando QR y renovando; el portal no se lo informa | P1 | M | roto | BK-SOC-07, BK-ACC-01 |
| BK-SOC-04 | El cambio de contraseña no verifica la contraseña actual ni cierra las demás sesiones | P1 | S | roto | — |
| BK-SOC-11 | Activación de cuenta y recuperación de contraseña: link/token a validar, emails en inglés con dominio por defecto, sin reenvío para socios | P1 | M | roto | BK-SOC-01, BK-SOC-07 |
| BK-PLT-06 | Email de activación de staff y de reseteo de contraseña usan la plantilla genérica de Django (sin marca, texto inadecuado, dominio de Site sin configurar) | P1 | M | ui-parcial | — |

#### B7 · Clases: modelo por fecha y reglas de reserva  —  Franco  —  24 días

| Ficha | Título | Prio | Tam. | Estado en código | Depende de |
|---|---|---|---|---|---|
| BK-CLS-09 | Sesiones de clase por fecha (SesionClase) y edición de series recurrentes | P1 | XL | no-existe | BK-CLS-01 |
| BK-CLS-10 | Catálogo configurable de disciplinas, salas (y sedes) en lugar de listas hardcodeadas | P2 | L | no-existe | BK-CLS-06 |
| BK-CLS-06 | Formulario de clase - edición, copia y validaciones (datos demo precargados, día/recurrencia inconsistentes, sin validación backend) | P1 | M | ui-parcial | BK-CLS-01, BK-CLS-09, BK-CLS-10 |
| BK-CLS-04 | Reglas de reserva sin validar en backend (membresía, planes habilitados, estado, concurrencia, ventana de cancelación) | P0 | L | roto | BK-CLS-09, BK-CLS-10 |
| BK-CLS-02 | Pasar lista roto - modal y página de asistencia no respetan el contrato del backend | P0 | M | roto | BK-CLS-09 |
| BK-CLS-05 | Cancelación de clase - emails duplicables, bypass por PUT, sin aviso a la espera ni visibilidad posterior | P1 | M | ui-parcial | BK-CLS-09 |

#### B8 · Mobile: base de navegación, modales y formularios  —  Rodrigo  —  16 días

| Ficha | Título | Prio | Tam. | Estado en código | Depende de |
|---|---|---|---|---|---|
| BK-MOB-08 | Safe-area insets, viewport-fit=cover, unidades dvh y theme-color | P1 | S | roto | — |
| BK-MOB-12 | La cabecera Permissions-Policy de Vercel bloquea la cámara y rompe el escaneo de QR en producción | P0 | S | roto | — |
| BK-MOB-06 | Modales como bottom sheet / pantalla completa en móvil (Modal: variante, footer fijo, scroll lock, foco) | P1 | M | ui-parcial | BK-BUG-09 |
| BK-MOB-07 | Formularios y botones táctiles (alto mínimo 44 px, fuente 16 px, inputMode/autoComplete, labels asociadas) | P1 | M | ui-parcial | — |
| BK-MOB-01 | Bottom nav de staff con menú "Más" (todas las rutas + perfil, tema y logout) | P0 | L | ui-parcial | BK-MOB-06, BK-MOB-08 |
| BK-MOB-02 | Navegación móvil del socio sin callejones (Dashboard, Perfil y Mis Pagos sin nav; sin logout) | P0 | M | roto | BK-MOB-01, BK-MOB-06 |
| BK-BUG-07 | Navegación: enlaces que redirigen, ítems duplicados, bottom nav de 6 ítems en grilla de 5, socio sin menú en /dashboard y /perfil, y búsqueda del TopBar que no filtra | P1 | M | roto | BK-MOB-01 |
| BK-MOB-03 | TopBar responsive (acciones a íconos / menú, buscador colapsable, toolbar de pestañas) y fix de props ignoradas | P1 | M | roto | BK-MOB-07, BK-BUG-03 |

#### B9 · Clases: UI, lista de espera y asistencia  —  Franco  —  8 días

| Ficha | Título | Prio | Tam. | Estado en código | Depende de |
|---|---|---|---|---|---|
| BK-CLS-03 | Lista de espera - "Habilitar" es falso, promoción incompleta y sin notificación al promovido | P1 | M | roto | BK-CLS-02, BK-CLS-04 |
| BK-CLS-07 | Calendario admin - grilla de horas fija (clases a las 07:30 invisibles), sin domingo, navegación de semanas decorativa y sin mobile | P1 | M | ui-parcial | BK-CLS-01, BK-CLS-09, BK-CLS-10 |
| BK-CLS-08 | Clases del socio (mobile) - sin lista de espera, "hoy" erróneo de noche, reservas sin día y filtros incompletos | P1 | M | ui-parcial | BK-CLS-01, BK-CLS-03, BK-CLS-04, BK-CLS-09 |
| BK-BUG-05 | AttendancePage: "Habilitar" y "Cerrar asistencia" son simulados, la lista de espera muestra datos vacíos y el plan está fijo | P1 | M | ui-parcial | BK-BUG-04, BK-CLS-01 |

#### B10 · Mobile: tablas, calendario, tablet, a11y y PWA  —  Rodrigo  —  21 días

| Ficha | Título | Prio | Tam. | Estado en código | Depende de |
|---|---|---|---|---|---|
| BK-MOB-04 | DataTable con modo cards en móvil (+ hook useMediaQuery y helper de viewport para tests) | P1 | L | ui-parcial | BK-MOB-07 |
| BK-MOB-05 | Calendario de clases (staff) como agenda por día en móvil y tablet | P1 | M | roto | BK-MOB-04, BK-MOB-03, BK-CLS-07 |
| BK-MOB-09 | Layout de tablet (768–1024 px) y orientación landscape | P2 | L | no-existe | BK-MOB-01, BK-MOB-04, BK-MOB-05, BK-MOB-08 |
| BK-MOB-11 | Accesibilidad móvil (contraste de tokens, foco visible, targets de 44 px, landmarks y elementos clickeables) | P2 | M | ui-parcial | BK-MOB-07 |
| BK-MOB-13 | Rendimiento percibido en móvil (code-splitting por ruta, fuentes sin @import bloqueante, skeletons de carga) | P3 | M | ui-parcial | — |
| BK-MOB-10 | PWA instalable (manifest, service worker de shell, íconos) y ampliar Wake Lock más allá de la credencial | P2 | L | ui-parcial | BK-MOB-08, BK-MOB-12 |

#### B11 · Acceso: historial, QR del socio y seguridad  —  Franco  —  24 días

| Ficha | Título | Prio | Tam. | Estado en código | Depende de |
|---|---|---|---|---|---|
| BK-ACC-03 | Pantalla de historial de accesos (filtros, búsqueda por socio, rango, motivo, exportación) | P1 | L | backend-sin-ui | BK-ACC-05 |
| BK-ACC-04 | Pestaña "Actividad" en el detalle del socio (staff) y "Mi actividad" para el socio | P1 | M | backend-sin-ui | BK-ACC-03, BK-ACC-05 |
| BK-ACC-08 | Analítica histórica de aforo (por hora y por día, horas pico, permanencia promedio) | P2 | L | no-existe | BK-ACC-05, BK-ACC-01 |
| BK-ACC-11 | Horarios de apertura/cierre efectivos y reglas de acceso por plan o por clase | P2 | L | ui-parcial | BK-ACC-01 |
| BK-ACC-10 | QR del socio — renovación confiable del token, estados bloqueado/suspendido y cierre de RNF07 (legibilidad y luminosidad) | P1 | L | ui-parcial | — |
| BK-ACC-12 | Seguridad y auditoría del acceso (logs inmutables, auditoría Mongo que no reintenta ni expira, rate limiting, WebSocket) | P1 | M | roto | — |

#### B12 · Apto médico, perfil y portal del socio  —  Rodrigo  —  18.5 días

| Ficha | Título | Prio | Tam. | Estado en código | Depende de |
|---|---|---|---|---|---|
| BK-SOC-05 | Apto médico: bucket público con nombres predecibles y almacenamiento de producción que probablemente no se aplica | P1 | M | roto | BK-SOC-02 |
| BK-SOC-02 | La subida del apto médico desde "Mi Perfil" (RF08 self-service) no hace nada | P0 | S | roto | BK-SOC-05, BK-SOC-06 |
| BK-SOC-06 | Vigencia del apto médico (fecha de vencimiento, estados y avisos) — hoy "tiene archivo = vigente" | P1 | L | ui-parcial | BK-SOC-02, BK-SOC-05 |
| BK-SOC-09 | Portal del socio (dashboard, credencial, pagos): datos faltantes, fechas crudas, "próximas clases" truncadas y sin estados de error | P2 | M | ui-parcial | BK-SOC-06, BK-SOC-08, BK-CLS-01 |
| BK-SOC-10 | Datos personales ampliados del socio (fecha de nacimiento, género, contacto de emergencia) y saludo de cumpleaños | P2 | M | ui-parcial | BK-SOC-01, BK-SOC-07 |
| BK-SOC-12 | Detalle de socio para staff: pestaña Actividad, notas internas con autor e historial de cambios | P2 | L | backend-sin-ui | BK-ACC-01, BK-SOC-03, BK-SOC-07 |
| BK-SOC-13 | El socio puede pedir su baja y la supresión de sus datos desde "Mi Perfil" | P3 | M | solo-idea | BK-SOC-08, BK-SOC-07 |

#### B13 · Membresías: ciclo de vida y cobros manuales  —  Franco  —  23 días

| Ficha | Título | Prio | Tam. | Estado en código | Depende de |
|---|---|---|---|---|---|
| BK-FIN-06 | Gestión del ciclo de vida de membresías desde la UI (suspender, reactivar, cancelar, renovar, congelar) | P1 | XL | backend-sin-ui | BK-FIN-05, BK-FIN-07, BK-FIN-09 |
| BK-FIN-09 | Cobro manual - registrar quién cobró y con qué medio, anular/corregir cobros y evitar duplicados | P1 | L | ui-parcial | BK-FIN-06, BK-FIN-07, BK-FIN-05 |
| BK-FIN-10 | Comprobantes / recibos de pago (número, PDF descargable y envío por email) | P2 | L | no-existe | BK-FIN-05, BK-FIN-08, BK-FIN-09 |
| BK-FIN-11 | Caja diaria y cierre de turno para cobros manuales (idea a validar) | P3 | L | solo-idea | BK-FIN-09, BK-FIN-04 |

#### B14 · Plataforma: estados de error, auditoría y operación  —  Rodrigo  —  20.5 días

| Ficha | Título | Prio | Tam. | Estado en código | Depende de |
|---|---|---|---|---|---|
| BK-PLT-01 | Error Boundary global y página de error inesperado (500) | P1 | M | no-existe | — |
| BK-PLT-02 | Pantalla 403 "Sin permisos" y manejo correcto de 403 de la API | P2 | M | no-existe | — |
| BK-PLT-03 | Banner de sin conexión y manejo global de errores de red / servidor dormido | P2 | M | ui-parcial | — |
| BK-PLT-04 | Sesión expirada: mensaje contextual en el login y retorno a la ruta original (`next`) | P1 | M | ui-parcial | — |
| BK-PLT-05 | ComingSoonPage sin uso: decidir entre eliminarla o usarla para secciones planificadas | P3 | S | ui-parcial | — |
| BK-PLT-13 | Visor de auditoría para administradores (quién cambió qué) | P2 | L | backend-sin-ui | BK-PLT-12 |
| BK-PLT-15 | Configuración ampliada: horarios por día, feriados, política de cancelación global y aforo por sala | P3 | L | solo-idea | BK-PLT-14 |
| BK-PLT-16 | Operación: sin backups de MongoDB y sin monitoreo de las tareas programadas (vencimientos) | P3 | M | no-existe | — |

#### B15 · Clases: instructor, reportes y calendario mensual  —  Franco  —  18 días

| Ficha | Título | Prio | Tam. | Estado en código | Depende de |
|---|---|---|---|---|---|
| BK-CLS-11 | Instructor como entidad (y rol Instructor) en lugar de texto libre | P3 | XL | solo-idea | BK-CLS-09, BK-CLS-10 |
| BK-CLS-12 | Reportes de clases (ocupación y asistencia por clase/instructor), no-shows y cierre automático | P2 | L | no-existe | BK-CLS-09, BK-CLS-02, BK-CLS-11 |
| BK-CLS-13 | Vista mensual del calendario y gestión de feriados / cierres del gimnasio | P3 | L | solo-idea | BK-CLS-09, BK-CLS-07 |

#### B16 · Ideas de plataforma (requieren decisión de producto)  —  Franco + Rodrigo  —  37 días

| Ficha | Título | Prio | Tam. | Estado en código | Depende de |
|---|---|---|---|---|---|
| BK-PLT-07 | Bandeja de notificaciones in-app (campana con leídas / no leídas) | P3 | L | solo-idea | BK-PLT-08 |
| BK-PLT-08 | Comunicaciones: envío masivo por segmento y canales (email / push / WhatsApp) | P3 | XL | solo-idea | BK-PLT-06 |
| BK-PLT-09 | Permisos granulares por rol (matriz editable) sobre los 3 roles fijos | P3 | XL | solo-idea | BK-PLT-02, BK-PLT-12 |
| BK-PLT-10 | Multi-sede: modelo Sede y su impacto en QR, aforo, planes, clases y reportes | P3 | XL | solo-idea | BK-PLT-14 |
| BK-PLT-11 | Rol Instructor, entrenador asignado y rutinas personalizadas | P3 | XL | solo-idea | BK-PLT-09 |

### Nota sobre BK-SOC-03
BK-SOC-03 y BK-FIN-05 comparten causa (el hook manda `socio_id` y el filtro es `socio`). El arreglo del filtro entra con FIN-05 en B1; SOC-03 queda en B5 porque su ficha declara depender de BK-FIN-01, y ahí se cierra con su test de UI.

### Puntos de conflicto entre PRs paralelos
`TopBar`, `Modal`, `Sidebar` y `App.jsx` los tocan B2, B8, B10 y B14. `useClases` / `AdminSociosPage` / `PlanFormModal` los tocan B3, B7, B9 y B12. Mergear en el orden de la tabla y rebasar `develop` antes de abrir cada PR.

### Reglas de cada PR de backlog
1. **TDD**: primero los tests de la sección 9 de la ficha; deben fallar. Si un test que debería fallar pasa (p. ej. BK-PLT-12), se frena y se reporta.
2. Lo marcado "No verificado" o "a confirmar" en la ficha se confirma con el primer test antes de tocar código.
3. Backend: `cd backend && pytest` (cobertura mínima 80). Frontend: `cd frontend && npm test && npm run lint` (`--max-warnings 0`). El CI corre ambos.
4. Commits convencionales, sin atribución de IA. Squash al mergear.
5. Cada ficha cerrada → issue enlazado cerrado y su caso de prueba en la planilla pasa a PASS.

## 4. Issues: cuáles se cargan

| Qué | Se carga como Issue | Dónde vive el detalle |
|---|---|---|
| 6 bugs de `docs/qa/bug-reports.md` (la consigna pide ≥ 3) | Sí, etiqueta `bug`, con la evidencia adjunta | `docs/qa/bug-reports.md` |
| Casos de prueba a ejecutar y requisitos AUT-BE/API/E2E y ACC | Sí, dentro del Milestone de Sprint 3 / 4 | Planilla de casos |
| 19 fichas P0 | Sí, etiqueta `backlog` + `bug`/`feature`, con link a la ficha | `docs/backlog/items/` |
| Resto de las fichas (69) | No: se cargan al empezar su PR (una por PR) | `docs/backlog/items/` |

Las issues se pueden generar por script con `gh` desde el frontmatter de las fichas. Crear issues publica en el repositorio: se hace solo con confirmación.

## 5. Matriz de trazabilidad (ficha → PR)

| Ficha | PR | Prio | Tam. |
|---|---|---|---|
| BK-ACC-01 | B4 | P0 | M |
| BK-ACC-02 | B4 | P1 | M |
| BK-ACC-03 | B11 | P1 | L |
| BK-ACC-04 | B11 | P1 | M |
| BK-ACC-05 | B3 | P0 | M |
| BK-ACC-06 | B4 | P1 | L |
| BK-ACC-07 | B4 | P1 | L |
| BK-ACC-08 | B11 | P2 | L |
| BK-ACC-09 | B4 | P1 | M |
| BK-ACC-10 | B11 | P1 | L |
| BK-ACC-11 | B11 | P2 | L |
| BK-ACC-12 | B11 | P1 | M |
| BK-BUG-01 | B2 | P0 | M |
| BK-BUG-02 | B6 | P0 | M |
| BK-BUG-03 | B2 | P0 | S |
| BK-BUG-04 | B2 | P0 | S |
| BK-BUG-05 | B9 | P1 | M |
| BK-BUG-06 | B3 | P1 | M |
| BK-BUG-07 | B8 | P1 | M |
| BK-BUG-08 | B3 | P2 | M |
| BK-BUG-09 | B2 | P2 | S |
| BK-BUG-10 | B2 | P2 | S |
| BK-CLS-01 | B3 | P0 | S |
| BK-CLS-02 | B7 | P0 | M |
| BK-CLS-03 | B9 | P1 | M |
| BK-CLS-04 | B7 | P0 | L |
| BK-CLS-05 | B7 | P1 | M |
| BK-CLS-06 | B7 | P1 | M |
| BK-CLS-07 | B9 | P1 | M |
| BK-CLS-08 | B9 | P1 | M |
| BK-CLS-09 | B7 | P1 | XL |
| BK-CLS-10 | B7 | P2 | L |
| BK-CLS-11 | B15 | P3 | XL |
| BK-CLS-12 | B15 | P2 | L |
| BK-CLS-13 | B15 | P3 | L |
| BK-FIN-01 | B5 | P0 | L |
| BK-FIN-02 | B5 | P1 | M |
| BK-FIN-03 | B5 | P1 | L |
| BK-FIN-04 | B5 | P1 | L |
| BK-FIN-05 | B1 | P0 | M |
| BK-FIN-06 | B13 | P1 | XL |
| BK-FIN-07 | B1 | P0 | M |
| BK-FIN-08 | B1 | P0 | XL |
| BK-FIN-09 | B13 | P1 | L |
| BK-FIN-10 | B13 | P2 | L |
| BK-FIN-11 | B13 | P3 | L |
| BK-MOB-01 | B8 | P0 | L |
| BK-MOB-02 | B8 | P0 | M |
| BK-MOB-03 | B8 | P1 | M |
| BK-MOB-04 | B10 | P1 | L |
| BK-MOB-05 | B10 | P1 | M |
| BK-MOB-06 | B8 | P1 | M |
| BK-MOB-07 | B8 | P1 | M |
| BK-MOB-08 | B8 | P1 | S |
| BK-MOB-09 | B10 | P2 | L |
| BK-MOB-10 | B10 | P2 | L |
| BK-MOB-11 | B10 | P2 | M |
| BK-MOB-12 | B8 | P0 | S |
| BK-MOB-13 | B10 | P3 | M |
| BK-PLT-01 | B14 | P1 | M |
| BK-PLT-02 | B14 | P2 | M |
| BK-PLT-03 | B14 | P2 | M |
| BK-PLT-04 | B14 | P1 | M |
| BK-PLT-05 | B14 | P3 | S |
| BK-PLT-06 | B6 | P1 | M |
| BK-PLT-07 | B16 | P3 | L |
| BK-PLT-08 | B16 | P3 | XL |
| BK-PLT-09 | B16 | P3 | XL |
| BK-PLT-10 | B16 | P3 | XL |
| BK-PLT-11 | B16 | P3 | XL |
| BK-PLT-12 | B2 | P1 | S |
| BK-PLT-13 | B14 | P2 | L |
| BK-PLT-14 | B4 | P2 | M |
| BK-PLT-15 | B14 | P3 | L |
| BK-PLT-16 | B14 | P3 | M |
| BK-SOC-01 | B6 | P0 | L |
| BK-SOC-02 | B12 | P0 | S |
| BK-SOC-03 | B5 | P0 | S |
| BK-SOC-04 | B6 | P1 | S |
| BK-SOC-05 | B12 | P1 | M |
| BK-SOC-06 | B12 | P1 | L |
| BK-SOC-07 | B6 | P1 | M |
| BK-SOC-08 | B6 | P1 | M |
| BK-SOC-09 | B12 | P2 | M |
| BK-SOC-10 | B12 | P2 | M |
| BK-SOC-11 | B6 | P1 | M |
| BK-SOC-12 | B12 | P2 | L |
| BK-SOC-13 | B12 | P3 | M |

## 6. Decisiones abiertas (bloquean PRs concretos)

| Decisión | Bloquea | Recomendación |
|---|---|---|
| ¿Paginación configurable global o endpoints de agregación para reportes? | B3, B5 | Paginación con `page_size_query_param` + endpoint `GET /api/reportes/resumen/` (BK-FIN-01). |
| Modelo de clases por fecha (`SesionClase`) | B7, B9, B15 | Aprobar el modelo de BK-CLS-09 antes de empezar: es XL y condiciona 8 fichas. |
| Política de apilado de días al renovar membresía | B1, B13 | Definir en BK-FIN-07 (hoy se pierden los días restantes). |
| ¿`/admin/socios` y `/recepcion/socios` siguen separados? | B6, B8 | Unificar con un guard por rol. |
| Ideas P3 (notificaciones, comunicaciones masivas, permisos granulares, multi-sede, entrenador/rutinas, instructor como rol) | B15, B16 | No implementar sin definición de producto: cada ficha trae su propuesta mínima y preguntas abiertas. |
| Hash de contraseña en la auditoría Mongo, privacidad de inscriptos en `GET /classes/clases/{id}/`, throttling de DRF, permiso de recepción para asignar plan | Sin ficha propia | Crear fichas antes de B2/B6 o absorberlas en ellos. |
