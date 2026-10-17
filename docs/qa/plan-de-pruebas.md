# Plan de Pruebas — Winnie The Gym

## 1. Historial de Versiones

| Versión | Fecha | Autor(es) | Descripción del cambio |
|---|---|---|---|
| 1.0 | 14/09/2026 | Equipo QA (Magali Bechis, Gisele Lavisse, Jimena Gallegillo) con soporte técnico de Rodrigo Valdez | Elaboración inicial del Plan de Pruebas para la entrega de V&V del Sprint 3. |
| 1.1 | 15/09/2026 | Rodrigo Valdez | Incorporación de tests automatizados frontend (Vitest + React Testing Library) sumados en el PR #77; actualización del conteo de tests backend (229 → 233) y ampliación de las secciones de estrategia, criterios, entregables, herramientas y planificación. |
| 1.2 | 20/09/2026 | Franco Arce | Actualización post project-wide-cleanup (chore/project-wide-cleanup): refleja estado real del inventario de tests frontend post-Commits 1–4; agrega pytest-cov (backend) y @vitest/coverage-v8 (frontend); corrige conteo backend; actualiza pipeline de CI ahora existente. |
| 1.3 | 13/10/2026 | Magali Bechis | Actualización integral según devolución de cátedra (Sprint 3 / Sprint 4): 1) Completitud de circuito de firmas y aprobaciones (Líder de Proyecto y Patrocinadora). 2) Dejada constancia formal de adopción de React 18 + Vite aprobada en lugar de Angular. 3) Actualización de estrategia y conteo de pruebas de regresión (401 tests backend passed y 811 tests frontend en Vitest). 4) Redefinición de criterios de aceptación y rechazo estructurados por severidad de defectos (0 bloqueantes y 0 altos sin mitigar). 5) Supresión del riesgo técnico «ausencia de CI/CD» por puesta en marcha de GitHub Actions. |
| 1.4 | 16/10/2026 | Rodrigo Valdez | Sincronización con el estado real al cierre del Sprint 4: conteos de tests actualizados (backend 615, 614 en verde en la corrida del 16/10; frontend 1060 casos en 139 archivos), umbrales de cobertura tomados de `frontend/vite.config.js`, herramientas de automatización (Postman/Newman, Playwright, axe-core, Lighthouse), entregables y trazabilidad del Sprint 4, cronograma y aprobaciones pendientes de firma. |
| 1.5 | 16/10/2026 | Rodrigo Valdez | Reordenamiento de secciones según el índice de la plantilla de la cátedra (Recursos y Planificación con sus subsecciones, Premisas y Dependencias y Riesgos separadas) y Flujos E2E movidos a un anexo. |

## 2. Información del Proyecto

| Campo | Detalle |
|---|---|
| Nombre del Proyecto | Winnie The Gym — Sistema de gestión integral para gimnasios |
| Actividad | Verificación y Validación (V&V) — Sprint 3 |
| Fecha de elaboración | 14/09/2026 |
| Fecha de entrega de la actividad V&V | 17/09/2026 |
| Fecha de cierre del sprint del proyecto | 20/09/2026 |
| Institución | ISPC — Tecnicatura Superior en Desarrollo de Software |
| Repositorio | github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym |

Winnie The Gym es un sistema de gestión integral para gimnasios que cubre autenticación de usuarios, administración de socios, planes de membresía, control de acceso mediante credencial digital (QR dinámico), gestión y reserva de clases, monitoreo de aforo en tiempo real y generación de reportes administrativos.

**Stack tecnológico** (confirmado en `docs/architecture.md`):

- **Frontend:** React 18 (Vite) + TailwindCSS, desplegado en Vercel.  
  *(Nota de alcance y decisión arquitectónica: La adopción de React/Vite en reemplazo de la propuesta inicial de Angular fue una decisión técnica del equipo, pendiente de conformidad de la cátedra/patrocinadora (ver sección 3), priorizando la agilidad de desarrollo con Vite HMR, la robustez de React Query v5 para el manejo de estado asíncrono y la integración nativa y reactiva con WebSockets de Django Channels para el módulo de aforo en tiempo real).*
- **Backend:** Django REST Framework + Django Channels (WebSockets), desplegado en Render.
- **Base de datos transaccional:** PostgreSQL (Supabase en producción).
- **Auditoría / historial QR:** MongoDB (Atlas en producción).
- **Cache / broker / channel layer:** Redis (Upstash en producción).
- **Contenerización:** Docker / Docker Compose (5 servicios: `db`, `redis`, `mongo`, `backend`, `frontend`).
- **Integraciones externas:** MercadoPago (Checkout Pro + webhook), Google OAuth, Mailtrap (envío de emails vía Celery), Sentry (errores/performance), UptimeRobot (keep-alive).

**Alcance funcional (Product Backlog — 9 historias de usuario):** ver sección 5.2.

## 3. Aprobaciones

| Rol | Nombre | Estado | Fecha | Firma |
|---|---|---|---|---|
| Elaborado por (QA Lead / Scrum Master) | Magali Bechis | Pendiente |  |  |
| Revisado por (Referente Técnico Full-Stack) | Rodrigo Valdez | Pendiente |  |  |
| Aprobado por (Líder de Proyecto / Project Manager) | Franco Arce | Pendiente |  |  |
| Patrocinadora / Docente Evaluadora | Viviana Guillén (Cátedra ISPC) | Pendiente |  |  |

Circuito de sign-off: el plan es elaborado por la QA Lead, revisado técnicamente por el Referente Técnico y aprobado por el Líder de Proyecto. La conformidad de la Patrocinadora / Docente Evaluadora (alcance tecnológico React/Vite y criterios de severidad de defectos) se registra en la última fila. La tabla se completa con estado, fecha y firma a medida que cada rol da su conformidad.

## 4. Resumen Ejecutivo

Este Plan de Pruebas cubre la actividad de Verificación y Validación (V&V) del proyecto Winnie The Gym (Sprint 3 y Sprint 4). El backend (Django REST Framework), organizado en 9 apps (`access`, `classes`, `common`, `members`, `memberships`, `payments`, `reports`, `users`), cuenta con una suite madura de **615 tests automatizados** (pytest + pytest-django + pytest-cov), ejecutable vía `docker compose exec backend pytest -q`, que reporta un resultado de **614 passed y 1 failed** en la corrida del 16/10/2026 (ver 5.3.1). El frontend (React 18 / Vite) dispone de una suite con **1060 casos de prueba** desarrollados con Vitest + React Testing Library (139 archivos de test), con gates de cobertura enforceados en CI (Lines ≥65%, Statements ≥65%, Branches ≥60%, Functions ≥55%). La estrategia combina **regresión automatizada continua en cada PR** mediante GitHub Actions con **pruebas manuales guiadas** sobre los flujos de UI y accesibilidad.

Como insumo adicional, el equipo cuenta con: un reporte de requisitos no funcionales de performance/disponibilidad (`docs/reports/rnf01-rnf06.md`), un set de pruebas de carga con Locust (`backend/loadtests/`) y los reportes de bugs registrados y trazados como GitHub Issues usando la plantilla oficial del repositorio.

## 5. Alcance de las Pruebas

**Incluye:**

- Pruebas funcionales de regresión sobre los 8 módulos backend Django vía la suite pytest existente.
- Pruebas manuales funcionales y de usabilidad sobre los flujos de UI del frontend React (login, credencial digital/QR, reserva de clases, terminal de acceso de recepción, alta de socios).
- Verificación de interacción real con las bases de datos (PostgreSQL y MongoDB) en los escenarios donde el código así lo prevé (auditoría, historial QR, expiración de membresías).
- Pruebas de seguridad básicas ya cubiertas por el código (anti-replay de QR, HMAC del webhook de pagos, gating por rol/autenticación, hardening de hosts/CSRF para túneles ngrok).
- Pruebas de rendimiento/no funcionales apoyadas en el reporte RNF01/RNF06 existente y en Locust.

**No incluye:** ver sección 5.4.

### 5.1 Elementos a Probar

| Módulo | Descripción funcional | Tipo de cobertura actual |
|---|---|---|
| `access` | Generación/validación de QR dinámico, control de ingreso, aforo en tiempo real (WebSocket), reporte de disponibilidad | Automatizada (pytest) |
| `classes` | Alta/edición/baja de clases, búsqueda y filtrado, inscripción con cupo y lista de espera, cancelación, control de asistencia | Automatizada (pytest) |
| `common` | Logging estructurado (JSON), auditoría transversal en MongoDB, señal de email de bienvenida, helper de emails con plantillas | Automatizada (pytest) |
| `members` | Alta de socios, carga de certificado médico, edición/baja de socios, protección de campos inmutables | Automatizada (pytest) |
| `memberships` | Planes de membresía (CRUD admin), renovación, expiración automática (Celery Beat), endpoint "mi membresía" | Automatizada (pytest) |
| `payments` | Preferencias de pago MercadoPago, webhook de confirmación, cobro manual por recepción, diferencias de precio | Automatizada (pytest) |
| `reports` | Exportación de reportes (morosidad, facturación, asistencia) en CSV/XLSX/PDF | Automatizada (pytest) |
| `users` | Autenticación (login local + Google OAuth), perfil, infraestructura de API (paginación, docs, health check), hardening (ngrok/CSRF) | Automatizada (pytest) |
| `audit` | Auditoría de eventos (snapshots y actor de las operaciones) | 4 |
| Frontend (automatizado) | Componentes UI (`Button`, `EmptyState`) y páginas (`ClassSchedulePage`); se amplía en cada sprint | Automatizada (Vitest + React Testing Library) |
| Frontend (manual) | Pantallas React: login, credencial digital, agenda/reserva de clases, terminal de acceso de recepción, gestión de socios | Manual (complementa la automatización existente) |

### 5.2 Nuevas Funcionalidades a Probar

Descritas desde la perspectiva del usuario final, según el Product Backlog (9 historias de usuario):

- **US01 — Login:** como usuario del sistema, quiero iniciar sesión con mi cuenta local o con Google según mi rol, para acceder a las funciones que me corresponden.
- **US02 — Planes de Membresía:** como administrador, quiero crear, modificar y desactivar planes de membresía, para mantener actualizada la oferta comercial del gimnasio.
- **US03 — Alta de Socios:** como recepcionista, quiero registrar nuevos socios y subir su certificado médico, para habilitar su ingreso al gimnasio.
- **US04 — Credencial Digital:** como socio activo, quiero ver un código QR de acceso en mi celular, para ingresar al gimnasio sin credencial física (bloqueado si tengo un pago vencido).
- **US05 — Validación QR:** como recepcionista, quiero escanear la credencial del socio, para autorizar su ingreso y registrar la asistencia.
- **US06 — Gestión de Clases:** como administrador, quiero crear clases y configurar sus cupos, para ofrecer una agenda de actividades a los socios.
- **US07 — Reservas de Clases:** como socio, quiero reservar o cancelar mi lugar en una clase según el cupo disponible, para organizar mi rutina.
- **US08 — Aforo en tiempo real:** como personal del gimnasio, quiero monitorear la ocupación en vivo, para gestionar la capacidad del salón.
- **US09 — Reportes:** como administrador, quiero exportar analíticas en PDF/Excel, para tomar decisiones de negocio con datos reales.

### 5.3 Pruebas de Regresión

El sistema cuenta con una robusta suite de regresión automatizada continua que protege integralmente tanto el backend como el frontend contra defectos regresivos:


#### 5.3.1 Regresión Backend (pytest)
El backend dispone de **615 tests automatizados** (`pytest` + `pytest-django` + `pytest-asyncio` + `pytest-cov`), distribuidos en las 9 apps del sistema y validados con un gate de cobertura global del 80%:

| App / Módulo | Alcance de la suite de regresión | Tests recolectados |
|---|---|:---:|
| `access` | QR dinámico, anti-replay, escaneo, WebSockets de aforo, disponibilidad RNF06 | 90 |
| `classes` | Búsqueda, filtrado, CRUD, inscripción con cupo, lista de espera, cancelación | 121 |
| `common` | Logging JSON, auditoría MongoDB, señal de bienvenida, Celery, Supabase storage | 54 |
| `members` | Alta, DNI duplicado, protección de número de socio, baja lógica, certificados | 80 |
| `memberships` | Planes CRUD, suscripciones, expiración lazy y job diario Celery Beat | 82 |
| `payments` | Checkout MercadoPago, webhook HMAC, cobro manual, auditoría financiera | 50 |
| `reports` | Exportaciones CSV/XLSX/PDF de morosidad, facturación y asistencia | 31 |
| `users` | JWT auth, Google OAuth, perfiles, `/api/health/`, hardening ngrok/CSRF | 103 |
| **Total Backend** | **Suite completa backend (corrida del 16/10/2026)** | **615 recolectados · 614 passed · 1 failed** |

La suite completa se ejecuta localmente vía `docker compose exec backend pytest -q` y de manera obligatoria en el pipeline de CI en cada pull request, garantizando un estado reproducible. En la corrida completa del 16/10/2026 (cobertura 92,79 %) pasaron 614 de 615: `test_pr2_fixes.py::PasswordResetEmailURLTests::test_password_reset_email_uses_frontend_url_not_example_com` falla en el entorno Docker local porque depende de `CELERY_TASK_ALWAYS_EAGER=True` (con la variable activa pasa); queda registrado como pendiente.


#### 5.3.2 Regresión Frontend (Vitest)
El frontend dispone de una suite de **1060 casos de prueba** (`it`/`test`, conteo estático del 16/10/2026) desarrollados con Vitest y React Testing Library sobre **139 archivos de test**, cubriendo componentes atómicos, layouts, hooks de lógica, servicios de API y páginas. Los gates mínimos de cobertura verificados en CI son:
- **Lines:** ≥ 65%
- **Statements:** ≥ 65%
- **Branches:** ≥ 60%
- **Functions:** ≥ 55%

Valores vigentes en `frontend/vite.config.js`. Los umbrales se ajustaron a la baja durante el Sprint 4 al sumarse pantallas administrativas nuevas (ver comentarios del archivo); la meta es volver a subirlos de forma incremental.


#### 5.3.3 Integración Continua (GitHub Actions)
La regresión mínima obligatoria ante cada cambio o adición al código base se ejecuta de manera automatizada mediante el workflow `.github/workflows/ci.yml`. Los jobs paralelos de validación (`backend-test` con servicio MongoDB adjunto y `frontend-test` con verificación de gates de cobertura) deben completarse en verde para que cualquier PR hacia `develop` pueda ser mergeado. Hoy el workflow ejecuta backend (pytest con cobertura) y frontend (lint, Vitest con cobertura y build). **Todavía no ejecuta** la colección de Postman con Newman, la suite E2E de Playwright ni la auditoría de accesibilidad (`frontend/scripts/audit-accessibility.mjs`): se corren de forma manual y sus reportes se guardan como evidencia en el repositorio. Sumarlos al pipeline es un pendiente del Sprint 5. Se complementa con la verificación manual de los flujos de UI documentados en la matriz de pruebas.

### 5.4 Funcionalidades a NO Probar

- E2E tests completos en staging/producción real: se ejecutan en entornos locales/sandbox automatizados.
- Tests de integración real contra cuentas de producción de MercadoPago, Google OAuth, Mailtrap o Sentry (se utilizan sandboxes y mocks controlados en los tests).
- Pruebas de aceptación de infraestructura de proveedores cloud (Render, Vercel, Supabase, MongoDB Atlas, Upstash) más allá del monitoreo y health check (`/api/health/`).
- Pruebas de penetración/seguridad ofensivas formales (pentesting); se validan los controles preventivos implementados en el código (anti-replay, HMAC, gating por rol, RBAC).
- Panel de administración nativo de Django (`/admin`) más allá de su disponibilidad básica.

## 6. Enfoque de Pruebas (Estrategia)

| Tipo de prueba | Enfoque | Herramientas |
|---|---|---|
| **Funcional** | Automatizada sobre los 8 módulos backend (casos de éxito, validaciones, reglas de negocio); automatizada sobre el frontend (componentes, hooks, vistas y navegación); manual sobre flujos exploratorios y de UI | pytest, pytest-django, Django REST test client, Vitest + React Testing Library, ejecución manual guiada por matriz de casos |
| **Integración** | Verificación de interacción real entre Django, PostgreSQL, MongoDB (auditoría/historial QR), Redis (channel layer WS) y Celery (tareas async) | pytest con fixtures de DB real de test, Docker Compose |
| **Usabilidad y Accesibilidad** | Revisión manual y automatizada de los flujos de socio/recepción/admin en el frontend (claridad, contraste WCAG 2.2 AA, navegación por teclado, feedback visual) | axe-core, Lighthouse, ejecución manual, navegador |
| **Seguridad** | Anti-replay y firma HMAC de tokens QR, validación de firma HMAC-SHA256 del webhook de MercadoPago, gating por rol/autenticación (401/403), hardening de `ALLOWED_HOSTS`/CSRF para túneles ngrok | pytest (`test_qr_utils.py`, `test_webhook.py`, `test_infra_hardening.py`, `test_pr2_fixes.py`) |
| **Performance / No funcional** | Latencia del endpoint de validación QR (RNF01: p95 < 2000ms bajo 50 usuarios concurrentes) y disponibilidad simulada del módulo de accesos (RNF06: ≥ 99.9%) | Locust (`backend/loadtests/locustfile.py`), comando `availability_report`, reporte en `docs/reports/rnf01-rnf06.md` |
| **API (caja negra)** | Contratos HTTP de Auth, Planes y Socios (flujo POST → GET → PUT/PATCH → DELETE) con pruebas negativas (401 sin token y 400 por payload inválido), con reportes HTML y JUnit | Postman v2.1 + Newman con `htmlextra` (`tests/api/coleccion.json`) |
| **E2E (flujos críticos)** | Autenticación (login válido e inválido parametrizado con 4 combinaciones), CRUD de planes y flujo de socio self-service, con Page Object Model y selectores `data-testid` | Playwright Test en TypeScript (`e2e/`) |

## 7. Criterios de Aceptación o Rechazo

En cumplimiento con las directivas de la cátedra evaluadora, los criterios de aceptación y rechazo se estructuran formalmente en base a la **severidad de los defectos**, priorizando el impacto en el negocio por sobre métricas porcentuales planas:

**Criterios de Aceptación:**
- **Defectos Bloqueantes / Críticos:** **0 defectos abiertos o sin mitigar.** Ningún defecto que impida un flujo esencial (login/autenticación, generación y escaneo de credencial QR, inscripción a clases, cobros o aforo en tiempo real) puede existir para dar por aceptado el entregable.
- **Defectos Altos:** **0 defectos abiertos o sin mitigar.** Cualquier defecto que afecte reglas de negocio importantes o integridad de datos sin una alternativa directa aceptada debe estar completamente resuelto.
- **Defectos Medios y Bajos:** Se tolera un máximo residual siempre que esté formalmente documentado como issue en el backlog, cuente con un plan de mitigación consensuado y no comprometa la experiencia de usuario ni la seguridad del sistema.
- **Suite de Regresión Automatizada:** Sin fallas sistemáticas en el pipeline de CI sobre la rama de entrega. Un test con falla intermitente o dependiente del entorno se registra como defecto y se evalúa por su severidad; por sí solo no tumba la aceptación.
- **Cobertura de Código:** Cumplimiento de los umbrales configurados en el CI (Backend: 80%; Frontend: Lines 65%, Statements 65%, Branches 60%, Functions 55%, según `frontend/vite.config.js`).
- **Requisitos No Funcionales (RNF):** Cumplimiento verificado de los umbrales de RNF01 (latencia QR p95 < 2000ms) y RNF06 (disponibilidad de accesos ≥ 99.9%).

**Criterios de Rechazo:**
- Presencia de al menos 1 defecto de severidad **Bloqueante** o **Alta** abierto o sin mitigar.
- Fallas sistemáticas (reproducibles) en la suite de pruebas automatizadas durante la ejecución en CI.
- Incumplimiento de cualquiera de los gates de cobertura de código definidos en el pipeline.
- Casos de prueba manuales de flujos críticos con resultados divergentes respecto a los criterios de aceptación de la historia de usuario.

## 8. Criterios de Suspensión

La ejecución de pruebas sobre un módulo se suspende si:
- Aparece un bug de severidad **Crítica/Bloqueante** que impide continuar ejecutando el resto de los casos planificados sobre ese módulo (ej.: un endpoint caído, un flujo de login roto).
- Más del **30% de los casos de prueba** de un mismo módulo resultan en Fallo en una misma ronda de ejecución — indica un problema sistémico que conviene resolver antes de seguir invirtiendo tiempo en testing puntual.

## 9. Criterios de Reanudación

La ejecución se reanuda cuando:
- El bug bloqueante que motivó la suspensión fue corregido (PR mergeado a `develop`) y re-verificado manualmente o vía la suite automatizada, según corresponda.
- La tasa de fallos del módulo vuelve a estar por debajo del 30% tras aplicar el/los fix(es) correspondientes.

## 10. Entregables

- Este documento: `docs/qa/plan-de-pruebas.md`.
- **Planilla de casos de prueba** (fuente de verdad, Google Sheets): https://docs.google.com/spreadsheets/d/1Oa1nqPkpquF49ghepLkKtoCiYtFY96BJ/edit. Una pestaña por módulo; los casos atómicos y los nuevos del Sprint 4 se agregaron resaltados en amarillo, con las columnas HU relacionada, escenario de la HU, tipo de testing, capa de la pirámide, ¿automatizable?, justificación, herramienta e ID del test automatizado. `docs/qa/casos-de-prueba.csv` es solo un espejo (snapshot).
- **Matriz de Trazabilidad** (HU → caso de prueba → test automatizado → resultado → bug): `docs/qa/matriz-de-trazabilidad.md`. Resumen de la revisión de casos: `docs/qa/casos-de-prueba-v2-resumen.md`.
- **Reportes de bugs:** Issues #78 a #85 (Sprint 3, cerrados) y los reportes QA del Sprint 4 en `docs/qa/bug-reports.md`, con capturas en `docs/qa/evidence/bugs/` y publicadas en los issues #160, #162, #163, #195, #224 y #225. Todos con la plantilla `.github/ISSUE_TEMPLATE/bug_report.md`.
- **Suite backend (AUT-BE):** `backend/apps/**/tests/`, 615 tests; corrida del 16/10/2026: 614 passed y 1 failed (ver 5.3.1), cobertura 92,79 %. Evidencia: `docs/qa/evidence/backend-pytest-output-2026-10-16.txt`.
- **Suite frontend:** `frontend/src/**/*.test.*`, 1060 casos en 139 archivos. Evidencia: `docs/qa/evidence/vitest-output-2026-10-13.txt`.
- **Colección Postman v2.1 y reportes Newman (AUT-API):** `tests/api/coleccion.json`, `tests/api/entorno.local.json` y reportes en `tests/api/reports/` (HTML y JUnit). Corrida del 16/10/2026: 13 requests, 40 aserciones, 0 fallas.
- **Suite E2E con Page Object Model (AUT-E2E):** `e2e/` (3 specs: autenticación, CRUD de planes y flujo de socio). Corrida del 16/10/2026: 11 pasan, 0 fallan y 6 están marcadas `fixme` (dependen de Mailpit, MercadoPago, escaneo de QR o de una respuesta rápida del registro). Las fallas iniciales (selectores ambiguos) se corrigieron; sus capturas quedan en `e2e/evidence/`.
- **Informe de accesibilidad WCAG 2.2 AA (ACC):** `docs/qa/informe-accesibilidad-wcag-2.2-AA.md` y evidencia en `docs/qa/evidence/accesibilidad/` (axe-core sobre 14 pantallas de los 4 roles y Lighthouse sobre login y registro). Hallazgos como Issues con etiqueta `accesibilidad` (#345 a #353).
- Reporte de requisitos no funcionales de performance/disponibilidad: `docs/reports/rnf01-rnf06.md`. Script y README de carga: `backend/loadtests/locustfile.py`, `backend/loadtests/README.md`.
- Documentación de arquitectura: `docs/architecture.md`.
- Wiki de GitHub, página Testing: https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/wiki/Testing. Milestones «Sprint 3» y «Sprint 4» y tablero «Winnie The Gym — Sprint Board».

## 11. Recursos

### 11.1 Requerimientos de Entornos – Hardware

notebooks personales de cada integrante del equipo (sin requisitos especiales de hardware; el stack corre containerizado vía Docker Desktop).

### 11.2 Requerimientos de Entornos – Software

Git ≥2.x, Docker ≥24.x, Docker Compose ≥2.x (plugin), Python 3.12 (imagen `python:3.12-slim`), Node 20 (imagen `node:20-alpine`), navegador moderno (Chrome/Edge/Firefox).

Según `docker-compose.yml` (raíz del repo) y la wiki del equipo (`Guia-de-Setup.md`, `Variables-de-Entorno.md`):

| Servicio | Imagen | Puerto local | Función |
|---|---|---|---|
| `db` (PostgreSQL) | `postgres:16-alpine` | 5432 | Fuente de verdad transaccional |
| `redis` | `redis:7-alpine` | 6379 | Broker Celery + channel layer WS + cache |
| `mongo` | `mongo:7` | 27017 | Auditoría + historial QR |
| `backend` | build local (`python:3.12-slim`) | 8000 | API REST + Channels (Django) |
| `celery-worker` | build local | — | Tareas async (emails, escrituras a Mongo) |
| `celery-beat` | build local | — | Scheduler (job diario de vencimientos, 09:00 ARG) |
| `frontend` | build local (`node:20-alpine`) | 5173 | SPA React/Vite |

**Puntos de acceso:**

| Componente | URL |
|---|---|
| Frontend (React) | http://localhost:5173 |
| API backend | http://localhost:8000/api/ |
| Panel admin Django | http://localhost:8000/admin |
| Health check | http://localhost:8000/api/health/ (verifica Postgres + Redis + Mongo) |

**Variables de entorno requeridas** (categorías confirmadas vía wiki del equipo — `Variables-de-Entorno.md` — dado que `backend/.env.example` y `frontend/.env.example` no fueron accesibles directamente desde este entorno de sandbox, ver nota al pie):

- Django core: `SECRET_KEY`, `ALLOWED_HOSTS`, `DJANGO_SETTINGS_MODULE`.
- PostgreSQL: `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`.
- Redis: `REDIS_HOST`, `REDIS_PORT`.
- MongoDB: `MONGO_URI`, `MONGO_DB_NAME`, `MONGO_USER`, `MONGO_PASSWORD`.
- CORS: `CORS_ALLOWED_ORIGINS`.
- Email (SMTP/Anymail vía Mailtrap): `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`.
- QR dinámico: `QR_SECRET_KEY`, `QR_TOKEN_EXPIRATION_SECONDS`.
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (según la wiki, no estarían documentadas todavía en `.env.example`).
- Frontend (Vite): `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`.

> Nota: el archivo `docker-compose.yml` confirma de forma directa el uso de `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `MONGO_USER`, `MONGO_PASSWORD`, `MONGO_DB_NAME` y `VITE_API_URL`. El resto de las variables de esta lista proviene de la wiki pública del equipo (`Variables-de-Entorno.md`), que sí pudo consultarse en este ciclo (ver sección "Referencias"). Se recomienda validar esta lista contra el `backend/.env.example` real antes de distribuir el plan, ya que el entorno de trabajo usado para redactar este documento tenía bloqueado el acceso de lectura a archivos `.env*` por política de sandbox.

### 11.3 Herramientas de Pruebas Requeridas

- **pytest** + **pytest-django** + **pytest-asyncio** (asyncio_mode=auto, `backend/pytest.ini`) — motor de tests automatizados backend. Configurado con `addopts = --cov=apps --cov-report=term-missing:skip-covered`.
- **pytest-cov** + **coverage.py** — cobertura de código backend. Genera `backend/.coverage` y `backend/coverage.xml` (excluidos de git).
- **Django REST Framework test client** (`APIClient`) — pruebas de endpoints HTTP.
- **Vitest** + **React Testing Library** + **jsdom** (`frontend/vite.config.js`, `frontend/setupTests.js`) — motor de tests automatizados frontend (componentes UI y páginas). Ejecutable vía `docker compose exec frontend npx vitest run`. Inventario actual: `Button`, `EmptyState`, `ClassSchedulePage`. Se amplía con cada sprint.
- **@vitest/coverage-v8** — cobertura de código frontend. Genera `frontend/coverage/` (excluida de git).
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — pipeline automático con jobs: backend (pytest + cobertura), frontend (vitest + eslint + build). Se dispara en cada PR contra `develop`.
- **Locust 2.31.5** (`backend/loadtests/locustfile.py`) — pruebas de carga para RNF01/RNF06.
- **Comando de gestión `availability_report`** — cálculo empírico de disponibilidad del módulo de accesos.
- **Docker / Docker Compose** — entorno reproducible de ejecución (db, redis, mongo, backend, frontend, celery-worker, celery-beat).
- **GitHub Issues** con plantilla `.github/ISSUE_TEMPLATE/bug_report.md` — registro y seguimiento de bugs.
- **Navegador (Chrome/Edge/Firefox)** — ejecución manual de casos de frontend.
- **Postman v2.1 + Newman 6** con el reporter `newman-reporter-htmlextra` — pruebas de API como caja negra (`tests/api/`). Se ejecutan con `--reporter-htmlextra-skipSensitiveData` para que los reportes no incluyan tokens ni contraseñas.
- **Playwright Test (TypeScript)** — automatización E2E con Page Object Model (`e2e/`).
- **axe-core** (`@axe-core/playwright`) — auditoría automatizada de accesibilidad WCAG 2.2 AA con sesión por rol (`frontend/scripts/audit-accessibility.mjs`).
- **Google Lighthouse 12** — puntaje de accesibilidad de las pantallas públicas.
- **Google Sheets** — planilla de casos de prueba y Matriz de Trazabilidad (historial de cambios por integrante).

### 11.4 Personal

Fuente: wiki del equipo, página Home, tabla "Equipo".

| Integrante | Usuario | Roles en el proyecto |
|---|---|---|
| Rodrigo Valdez | @MrForii | Dev Backend, Dev Frontend, UX/UI |
| Magali Bechis | @MagaBechis | Scrum Master, Dev Frontend, QA Tester |
| Gianna Giavarini | @giannagiava | Dev Backend, Dev Frontend, Datos |
| Franco Arce | @Franco-Arce | Dev Backend, Datos |
| Gisele Lavisse | @gigilvsarg | Dev Frontend, QA Tester |
| Jimena Gallegillo | @Jimenna | Dev Frontend, QA Tester |

### 11.5 Entrenamiento

El equipo de QA necesita la siguiente nivelación técnica para esta ronda de testing:

- Uso de Docker y Docker Compose (`docker compose up`, `docker compose ps` y `docker compose exec`) para levantar la infraestructura local.
- Manejo básico de consola para correr `pytest` y leer la salida de los tests fallidos.
- Uso de la plantilla `.github/ISSUE_TEMPLATE/bug_report.md` para unificar el criterio de reporte de incidencias.
- Uso de Postman y Newman, de Playwright y de la auditoría de accesibilidad (`audit-accessibility.mjs`), según la sección 12.1.

## 12. Planificación y Organización

La actividad de V&V se ejecuta en paralelo al cierre del Sprint 3 (que finaliza el 20/09/2026), con entrega específica de esta actividad el 17/09/2026. El trabajo se organiza en cuatro frentes:

1. **Regresión automatizada backend:** ejecución de la suite pytest completa (615 tests) sobre los 9 módulos.
2. **Regresión automatizada frontend:** ejecución de la suite Vitest (`npx vitest run` o vía CI) sobre componentes, hooks, servicios y páginas (139 archivos de test). No reemplaza al testing manual, lo complementa protegiendo contra regresiones.
3. **Testing manual frontend:** ejecución guiada de los casos definidos en la planilla (pestaña `Frontend`) para login, credencial digital, reservas de clases, terminal de acceso, alta de socios y los casos de los bugs del Sprint 4.
4. **Consolidación de hallazgos:** cualquier defecto nuevo se carga como GitHub Issue con la plantilla oficial, siguiendo el mismo formato que los issues #78-#85 ya cerrados y los reportes QA del Sprint 4 (`docs/qa/bug-reports.md`).
5. **Automatización del Sprint 4:** ejecución de la colección de Postman con Newman (API), de la suite E2E con Playwright y de la auditoría de accesibilidad (axe-core y Lighthouse), con sus reportes como evidencia.

### 12.1 Procedimientos para las Pruebas

1. Levantar el entorno con `docker compose up` (o confirmar que los contenedores ya estén corriendo con `docker compose ps`).
2. Para regresión backend: correr `docker compose exec backend pytest -q` y confirmar que todos los tests pasan (615 recolectados al 16/10/2026). Si hay fallos, registrar el módulo afectado y abrir un Issue con la plantilla de bug report.
3. Para testing manual frontend: acceder a http://localhost:5173, iniciar sesión con el rol correspondiente a cada caso. Para bootstrap de usuarios de desarrollo, correr `docker compose exec backend python manage.py seed_demo_users` (crea 1 admin, 1 recepcionista y 3 socios con `Demo1234!` como contraseña). Los socios pueden auto-registrarse vía `/registro`. Ejecutar los pasos del caso y completar `Resultado Obtenido` y `Estado` en la planilla de casos de prueba (Google Sheets).
4. Ante un resultado divergente, documentar evidencia (captura/video) y cargar un Issue con la plantilla `.github/ISSUE_TEMPLATE/bug_report.md`.
5. Para la API: `npx newman run tests/api/coleccion.json -e tests/api/entorno.local.json -r cli,htmlextra,junit --reporter-htmlextra-export tests/api/reports/newman.html --reporter-htmlextra-skipSensitiveData --reporter-junit-export tests/api/reports/newman.xml` (backend levantado y usuarios de `seed_demo_users`).
6. Para E2E: `cd e2e && npm ci && npx playwright install chromium && E2E_ADMIN_PASS=<clave del seed> npx playwright test`.
7. Para accesibilidad: `DEMO_USER_PASSWORD=<clave del seed> node frontend/scripts/audit-accessibility.mjs` (axe-core; genera `docs/qa/evidence/accesibilidad/axe-report.json`) y Lighthouse sobre `/login` y `/registro`.
8. Actualizar este plan, la planilla y la Matriz de Trazabilidad con los resultados finales antes de cada fecha de entrega (17/09/2026 para el Sprint 3 y 16/10/2026 para el Sprint 4).

### 12.2 Matriz de Responsabilidades (RACI)

| Actividad | Magali Bechis (QA/SM) | Gisele Lavisse (QA) | Jimena Gallegillo (QA) | Rodrigo Valdez (Ref. técnico) | Gianna Giavarini / Franco Arce (Dev) |
|---|---|---|---|---|---|
| Ejecutar regresión automatizada backend | R | R | R | C | I |
| Ejecutar casos manuales frontend | R | R | R | C | I |
| Redactar/actualizar Plan de Pruebas | A | R | R | C | I |
| Cargar bug reports (Issues) | R | R | R | I | I |
| Corregir defectos encontrados | I | I | I | C/A | R |
| Aprobar cierre de la ronda de V&V | A | I | I | C | I |

Referencia: **R**=Responsable/Ejecutor, **A**=Aprobador, **C**=Consultado, **I**=Informado.

### 12.3 Cronograma

| Fecha | Actividad |
|---|---|
| 14/09/2026 | Elaboración del Plan de Pruebas y la matriz de casos de prueba (este documento). |
| 15–16/09/2026 | Ejecución de la suite de regresión automatizada y de los casos manuales de frontend; carga de hallazgos como Issues. |
| 17/09/2026 | Entrega de la actividad de V&V del Sprint 3. |
| 20/09/2026 | Cierre general del Sprint 3 del proyecto. |
| 13/10/2026 | Correcciones de la devolución de la cátedra al Plan y a los casos de prueba (casos atómicos, columna HU, Matriz de Trazabilidad). |
| 14–15/10/2026 | Colección de Postman con Newman y suite E2E con Playwright (Page Object Model). |
| 16/10/2026 | Reportes de Newman, auditoría de accesibilidad (axe-core y Lighthouse), evidencias, publicación de la Wiki Testing y entrega de la actividad de V&V del Sprint 4. |

### 12.4 Premisas

- El equipo asume que la suite de regresión continua (615 tests backend y 1060 casos frontend ejecutados en CI) es representativa del estado real y estable del código en la rama de integración `develop`.
- El entorno de ejecución local containerizado refleja con fidelidad las condiciones del entorno productivo (Render/Vercel/Supabase).

### 12.5 Dependencias y Riesgos

**Riesgos identificados por el equipo** (fuente: documento de avance del proyecto):

- Fallas de sincronización de WebSocket (impacta el módulo de aforo en tiempo real, US08).
- Interrupciones del gateway de pagos MercadoPago (impacta US02/pagos; parcialmente mitigado por los tests de `test_webhook.py` y `test_crear_preferencia.py` que verifican manejo de fallas del gateway con 502).
- Compatibilidad de QR en dispositivos mobile (impacta US04/US05).

**Riesgos técnicos y estado de mitigación:**

- **Pipeline de CI/CD activo (con brechas):** La regresión automatizada se ejecuta de forma mandatoria en cada PR y push contra `develop` mediante GitHub Actions (`.github/workflows/ci.yml`), eliminando el riesgo de regresiones no detectadas y asegurando gates de cobertura (Backend ≥80%, Frontend Lines/Statements ≥65%, Branches ≥60%, Functions ≥55%). El riesgo de «ausencia de CI/CD» queda formalmente desestimado y mitigado.
- **Frontend y conectividad con APIs:** Las páginas del frontend cuentan con suites de pruebas unitarias y de integración en Vitest (1060 casos) y se conectan a los endpoints reales del backend mediante React Query v5. Las pruebas manuales de UI se enfocan en validar la experiencia de usuario, diseño responsivo y accesibilidad WCAG 2.2 AA.
- **Bugs identificados y trazabilidad:** Los defectos detectados en rondas previas cuentan con trazabilidad completa en issues de GitHub, garantizando que vulnerabilidades críticas (autenticación en rutas protegidas, validación de estado de membresías y configuraciones de entorno) están resueltas y protegidas por tests de regresión dedicados.
- **Automatización fuera del pipeline:** Newman, Playwright y la auditoría de accesibilidad todavía no corren en el CI; se ejecutan manualmente. En la corrida del 16/10/2026 el E2E dio 11 pasan, 0 fallan y 6 `fixme`; esos 6 casos requieren servicios externos (Mailpit, MercadoPago, QR). Mitigación: sumar los jobs al workflow y habilitar los casos `fixme` con mocks (Sprint 5).
- **Disponibilidad de la base en producción:** el plan gratuito de Supabase se pausa por inactividad y deja el backend caído con un error de conexión. Mitigación: ping periódico a la base y monitoreo de `/api/health/`.
- **Accesibilidad:** axe-core detectó inicialmente 4 violaciones críticas y 14 serias en las 14 pantallas auditadas. Tras los fixes de los issues #345 a #353 (PR #355) y un ajuste posterior de contraste, quedan 0 críticas y 6 serias de `color-contrast` en insignias de estado. Mitigación: ajustar esos colores en el Sprint 5.

**Dependencias:**

- Disponibilidad de servicios externos sandbox (MercadoPago, Google OAuth, Mailtrap) para las pruebas de integración.
- Entorno Docker Compose funcional con los 3 servicios de datos (Postgres, Redis, Mongo) saludables antes de correr la suite.

## 13. Referencias

- `docs/architecture.md` — Arquitectura del sistema.
- `docs/reports/rnf01-rnf06.md` — Reporte de captura y evaluación de RNF01 (latencia QR) y RNF06 (disponibilidad).
- `backend/loadtests/locustfile.py` y `backend/loadtests/README.md` — Herramienta y escenarios de carga (Locust).
- `.github/ISSUE_TEMPLATE/bug_report.md` — Plantilla de reporte de bugs usada en los Issues oficiales.
- `docker-compose.yml` (raíz del repo) — Definición de servicios de infraestructura local.
- Wiki del equipo: `Guia-de-Setup.md`, `Testing.md` y `Variables-de-Entorno.md` (github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/wiki).
- Product Backlog del proyecto (9 historias de usuario, US01-US09).
- Suite de tests: `backend/apps/{access,classes,common,members,memberships,payments,reports,users}/tests/` y `frontend/src/**/__tests__/`.

## 14. Glosario

| Término | Significado |
|---|---|
| **Socio** | Miembro/cliente del gimnasio que se autentica y accede con credencial digital. |
| **Aforo** | Cantidad de personas presentes en el gimnasio en un momento dado, monitoreada en tiempo real. |
| **Cupo** | Capacidad máxima de inscriptos permitida en una clase. |
| **RNF** | Requisito No Funcional (ej. RNF01 = latencia, RNF06 = disponibilidad). |
| **QR dinámico** | Código QR de la credencial digital, firmado con HMAC y con TTL corto (30s), de un solo uso. |
| **HMAC** | Hash-based Message Authentication Code — mecanismo de firma usada para validar tokens QR y el webhook de MercadoPago. |
| **JWT** | JSON Web Token — formato del token de sesión (access 30 min + refresh 1 día). |
| **Webhook** | Notificación HTTP asíncrona enviada por MercadoPago al backend para confirmar el estado de un pago. |
| **Celery / Celery Beat** | Sistema de tareas asíncronas y su scheduler (usado para emails, escritura a Mongo y el job diario de vencimientos). |
| **CI** | Integración Continua — pipeline automatizado de build, test y gates de cobertura implementado en GitHub Actions (`.github/workflows/ci.yml`). |
| **RACI** | Responsable, Aprobador, Consultado, Informado — matriz de responsabilidades. |
| **Locust** | Herramienta de pruebas de carga usada para validar RNF01/RNF06. |
| **Aprobado / Rechazado** | Estado de un caso de prueba tras su ejecución, según coincida o no el resultado obtenido con el esperado. |

## Anexo A. Flujos E2E de Sprint Close

Esta sección documenta tres flujos de extremo a extremo que un evaluador puede reproducir manualmente en un entorno local con `docker compose up` y `python manage.py seed_demo_users` ejecutado para disponer de usuarios demo (`Demo1234!`).

---

### Flujo E2E-01 — Nuevo socio self-service (CP-E2E-01)

**Descripción:** Un visitante no autenticado se registra de forma autónoma, sube su certificado médico, realiza el pago vía MercadoPago sandbox y valida su acceso en la terminal de recepción.

**Pre-condiciones:**
- Entorno Docker Compose levantado y saludable (`/api/health/` devuelve 200).
- MercadoPago sandbox configurado en el backend (variables `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`).
- Email no registrado previamente en la base de datos.

**Pasos:**

| # | Acción | URL / Elemento | Resultado Esperado |
|---|---|---|---|
| 1 | Abrir navegador incógnito | — | Sin sesión activa |
| 2 | Navegar a la página de registro | `/registro` | Formulario con 7 campos visibles (email, contraseña, confirmar contraseña, nombre, apellido, DNI, teléfono) |
| 3 | Completar el formulario con datos válidos y enviar | Botón "Crear cuenta" | Toast de éxito + redirección automática a `/dashboard` |
| 4 | Verificar creación de sesión | Barra lateral o header | Nombre del socio visible; rol `socio` |
| 5 | Navegar al perfil | `/perfil` | Sección "Certificado médico" visible con botón "Subir certificado" |
| 6 | Subir un archivo PDF/JPG válido (< 5 MB) | Input de archivo | Toast de éxito; thumbnail del archivo aparece en la UI |
| 7 | Navegar al checkout | `/socio/checkout` | Planes disponibles con precios; botón "Pagar con MercadoPago" |
| 8 | Seleccionar un plan y confirmar el pago | Botón de pago | Redirección a MercadoPago sandbox |
| 9 | Completar el pago sandbox usando una tarjeta de prueba (ej. Visa 4509953566233704) | Formulario MP | Redirección de vuelta al frontend con status de aprobado |
| 10 | Verificar credencial digital | `/socio/credencial` | QR dinámico visible; estado `ACTIVA` |
| 11 | Abrir terminal de recepción en otra pestaña/ventana | `/recepcion/acceso` | Terminal con escáner QR o input de DNI |
| 12 | Escanear el QR del socio o ingresar su DNI manualmente | Input o cámara | Badge `ACCESO CONCEDIDO` (GRANTED); registro de ingreso en historial |

**Resultado Esperado Global:** El socio puede completar el ciclo completo de incorporación sin asistencia del personal.

**Screenshot placeholders:**
- [ ] `/registro` con formulario completo
- [ ] Toast de éxito post-registro
- [ ] Sección certificado médico en `/perfil`
- [ ] QR válido en `/socio/credencial`
- [ ] Terminal recepción con GRANTED

---

### Flujo E2E-02 — Cobro manual + validación de acceso (CP-E2E-02)

**Descripción:** Una recepcionista registra un cobro manual para un socio existente y luego el socio verifica que su credencial y el historial de pagos están actualizados.

**Pre-condiciones:**
- Usuarios demo disponibles (`seed_demo_users` ejecutado).
- Recepcionista: `recepcion@winnie.local` / `Demo1234!`.
- Socio: `socio.vencido@winnie.local` / `Demo1234!` (membresía vencida, para que el cobro sea relevante).

**Pasos:**

| # | Acción | URL / Elemento | Resultado Esperado |
|---|---|---|---|
| 1 | Login como recepcionista | `/login` | Dashboard de recepción visible |
| 2 | Navegar a cobros manuales | `/recepcion/cobros` | Buscador de socios + listado de planes |
| 3 | Buscar al socio por nombre o DNI | Campo de búsqueda | Resultado del socio en la lista |
| 4 | Seleccionar el socio | Click en el resultado | Detalle del socio cargado; si tiene membresía activa, aparece banner de advertencia |
| 5 | Seleccionar un plan | Selector de planes | Plan seleccionado; precio visible |
| 6 | Registrar el cobro | Botón "Registrar cobro" | Toast de éxito; pago registrado en el sistema |
| 7 | Cerrar sesión de recepcionista | Botón de logout | Redirección a `/login` |
| 8 | Login como el socio | `/login` | Dashboard del socio |
| 9 | Verificar credencial actualizada | `/socio/credencial` | QR activo; fecha de vencimiento correspondiente al nuevo plan |
| 10 | Verificar historial de pagos | `/socio/pagos` | El cobro recién registrado aparece en la tabla con estado `aprobado` |

**Resultado Esperado Global:** El flujo de cobro manual es operativo y reflejado en tiempo real en la vista del socio.

**Screenshot placeholders:**
- [ ] Cobros en `/recepcion/cobros` con socio seleccionado
- [ ] Toast de éxito post-cobro
- [ ] Credencial del socio con nueva membresía activa
- [ ] Historial de pagos en `/socio/pagos`

---

### Flujo E2E-03 — Admin end-to-end (CP-E2E-03)

**Descripción:** Un administrador realiza el ciclo completo de alta de personal, creación de plan, alta de socio, cobro y revisión de reportes y configuración.

**Pre-condiciones:**
- Admin: `admin@winnie.local` / `Demo1234!`.
- Mailtrap (o similar) configurado para capturar emails de activación.

**Pasos:**

| # | Acción | URL / Elemento | Resultado Esperado |
|---|---|---|---|
| 1 | Login como admin | `/login` | Dashboard de administración |
| 2 | Navegar a gestión de usuarios | `/admin/usuarios` | Tabla de staff con botón "Crear staff" |
| 3 | Crear un nuevo recepcionista (email nuevo, nombre, apellido) | Modal "Crear staff" | Toast de éxito; nuevo recepcionista aparece en la tabla; email de activación enviado a Mailtrap |
| 4 | Navegar a planes | `/admin/planes` | Lista de planes existentes |
| 5 | Crear un nuevo plan (nombre, precio, duración entre 30-365 días) | Botón "Nuevo plan" | Toast de éxito; plan aparece en la tabla |
| 6 | Intentar crear plan con duración inválida (ej. 15 días) | Campo duración | Error inline: "La duración debe estar entre 30 y 365 días" |
| 7 | Navegar a socios | `/admin/socios` | Lista de socios |
| 8 | Crear un nuevo socio con email y subir certificado médico | Botón "Nuevo socio" + formulario | Toast de éxito; socio creado; email de activación enviado |
| 9 | Abrir el detalle del socio recién creado | Click en la fila | Modal con 3 tabs: "Datos", "Membresías", "Pagos" |
| 10 | Tab "Membresías" → verificar estado inicial (sin membresía) | Tab Membresías | Empty state "Sin membresías registradas" |
| 11 | Navegar a cobros y registrar el pago del plan al socio | `/recepcion/cobros` | Cobro registrado exitosamente |
| 12 | Volver al detalle del socio → Tab "Pagos" | Modal socio | El pago aparece en la lista |
| 13 | Navegar a reportes | `/admin/reportes` o `/recepcion/reportes` | Filtros de período y tipo de reporte |
| 14 | Exportar reporte de morosidad en PDF | Botón "Exportar PDF" | Archivo PDF descargado con los datos de socios con deuda |
| 15 | Navegar a configuración | `/admin/configuracion` | Formulario con aforo máximo, horarios y teléfono |
| 16 | Modificar el aforo máximo (ej. 150) | Campo "Aforo máximo" + guardar | Toast de éxito |
| 17 | Verificar que `AforoCard` en el dashboard refleja el nuevo aforo | `/dashboard` | AforoCard muestra el nuevo máximo (150) |

**Resultado Esperado Global:** El administrador puede gestionar personal, planes, socios, cobros, reportes y configuración del gimnasio en un solo ciclo de sesión.

**Screenshot placeholders:**
- [ ] Modal de creación de staff en `/admin/usuarios`
- [ ] Creación de plan con validación de duración inválida
- [ ] SocioDetailModal con 3 tabs
- [ ] Reporte de morosidad exportado (PDF)
- [ ] AforoCard con nuevo aforo máximo

---

### Notas de ejecución

- Los tres flujos son reproducibles de forma independiente.
- Orden recomendado para una pasada integral: E2E-01 → E2E-02 → E2E-03.
- Para flujos que requieren MercadoPago sandbox, usar las [tarjetas de prueba de MercadoPago](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards).
- Los emails de activación se capturan en Mailtrap (o el SMTP sandbox configurado en las variables de entorno de desarrollo).
- Cualquier desviación del resultado esperado debe documentarse como un GitHub Issue con la plantilla `.github/ISSUE_TEMPLATE/bug_report.md`.
