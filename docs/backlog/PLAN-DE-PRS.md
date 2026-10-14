# Plan de PRs — qué hay que hacer en cada uno

Guía paso a paso. **22 PRs, 1 commit cada uno** (los de backlog se mergean con *squash*: dentro del PR podés hacer los commits que quieras, en `develop` queda 1). Los hacen **Franco** (`Franco-Arce`) y **Rodrigo** (`MrForii`); cada PR lo revisa y aprueba el otro. Los issues ya están creados en GitHub: en cada PR va la línea `Closes #N`.

## Cómo hacer cualquier PR (receta única)

1. `git checkout develop && git pull && git checkout -b <rama-del-PR>`
2. Leer la ficha de cada tarea (`docs/backlog/items/BK-XXX-NN-*.md`). Ahí está el código a tocar con `archivo:línea`, el contrato de API y los tests.
3. **Tests primero**: escribí los de la sección 9 de la ficha y verificá que **fallan**. Si uno que debería fallar pasa, frená y avisá (no hay nada que arreglar).
4. Programar hasta que pasen. Correr: `cd backend && pytest` y `cd frontend && npm test && npm run lint`.
5. Un commit con el mensaje indicado en el PR (convencional, **sin** «Co-Authored-By» ni atribución de IA).
6. `git push -u origin <rama>` y abrir el PR contra `develop`. En la descripción: qué cambia, `Closes #N` por cada ficha, y cómo se probó.
7. La otra persona revisa. Merge con **Squash and merge**. Mover las tarjetas del tablero a *Done*.

**Orden:** respetá el orden de la tabla: cada PR depende solo de los anteriores. Dos PRs seguidos de personas distintas se pueden hacer en paralelo.

## Resumen

| PR | Quién | Qué | Rama | Issues |
|---|---|---|---|---|
| **H1** | Rodrigo | Hotfix Render: MEDIA_URL y storage Supabase | `fix/render-media-storage` | #302 |
| **D1** | Rodrigo | Backlog (88 fichas) y evidencia de bugs | `docs/backlog-y-evidencia-bugs` | #303 |
| **D2** | Rodrigo | Plan y casos corregidos + Matriz de Trazabilidad | `docs/qa-correcciones-sprint-3` | #304 |
| **D3** | Franco | Postman + Newman | `test/api-postman-newman` | #305 |
| **D4** | Franco | E2E Playwright TypeScript | `test/e2e-playwright-ts` | #306 |
| **D5** | Rodrigo | Accesibilidad (axe + Lighthouse) | `test/accesibilidad-sprint-4` | #307 |
| **B1** | Franco | Pagos: fuga de datos y cobro (P0) | `fix/pagos-fuga-y-cobro` | #187, #189, #190 |
| **B2** | Rodrigo | Bugs rápidos de frontend y auditoría | `fix/frontend-bugs-rapidos` | #160, #162, #163, #168, #169, #218 |
| **B3** | Franco | Contratos de listados, paginación y planes | `fix/contratos-paginacion` | #170, #152, #165, #167 |
| **B4** | Rodrigo | Terminal de acceso y aforo | `feat/acceso-terminal-aforo` | #148, #149, #156, #153, #154, #220 |
| **B5** | Franco | Reportes, morosidad y pagos globales | `feat/reportes-morosidad` | #185, #183, #184, #186, #225 |
| **B6** | Rodrigo | Socios: alta, ABM, estados y cuentas | `fix/socios-alta-abm-estados` | #229, #223, #161, #230, #226, #233, #212 |
| **B7** | Franco | Clases: modelo por fecha y reglas de reserva | `feat/clases-sesiones-reglas` | #178, #179, #175, #173, #171, #174 |
| **B8** | Rodrigo | Mobile: base de navegación, modales y formularios | `feat/mobile-navegacion-base` | #201, #205, #199, #200, #194, #195, #166, #196 |
| **B9** | Franco | Clases: UI, lista de espera y asistencia | `feat/clases-ui-asistencia` | #172, #176, #177, #164 |
| **B10** | Rodrigo | Mobile: tablas, calendario, tablet, a11y y PWA | `feat/mobile-tablas-pwa` | #197, #198, #202, #204, #206, #203 |
| **B11** | Franco | Acceso: historial, QR del socio y seguridad | `feat/acceso-historial-qr` | #150, #151, #155, #158, #157, #159 |
| **B12** | Rodrigo | Apto médico, perfil y portal del socio | `feat/apto-perfil-portal` | #227, #224, #228, #231, #232, #234, #235 |
| **B13** | Franco | Membresías: ciclo de vida y cobros manuales | `feat/membresias-ciclo-cobros` | #188, #191, #192, #193 |
| **B14** | Rodrigo | Plataforma: estados de error, auditoría y operación | `feat/plataforma-estados` | #207, #208, #209, #210, #211, #219, #221, #222 |
| **B15** | Franco | Clases: instructor, reportes y calendario mensual | `feat/clases-instructor-reportes` | #180, #181, #182 |
| **B16** | Franco + Rodrigo | Ideas de plataforma (requieren decisión de producto) | `feat/plataforma-ideas` | #213, #214, #215, #216, #217 |

---

# Parte 1 — Entrega (vence el 16/10)

## H1 — Hotfix de Render · Rodrigo · rama `fix/render-media-storage` · #302

**Contexto.** El deploy de Render falla (`urls.E006`: *The MEDIA_URL setting must end with a slash*). `MEDIA_URL` se tomaba de `SUPABASE_STORAGE_PUBLIC_URL_BASE`, que no lleva barra final. Además Django 5.1 ignora `DEFAULT_FILE_STORAGE`, así que producción habría guardado los certificados en el disco efímero de Render.

**Ya está hecho en tu carpeta (sin commitear):**
- `backend/core/settings/production.py` — `MEDIA_URL = {base}/{bucket}/` y `STORAGES['default']` = `SupabaseMediaStorage`.
- `backend/apps/common/storages.py` — docstring.
- `backend/apps/common/tests/test_production_settings.py` — 6 tests. Suite backend: 401 passed, 95,48 %.

**Qué hacés vos:**
1. `git checkout -b fix/render-media-storage develop` (llevá los 3 archivos; no incluyas el resto).
2. `git add backend/core/settings/production.py backend/apps/common/storages.py backend/apps/common/tests/test_production_settings.py`
3. Commit: `fix(deploy): end MEDIA_URL with a slash and use Supabase in STORAGES for production`
4. Push, PR a `develop`, `Closes #302`, Franco aprueba, merge.
5. Render redeploya solo (rama `develop`). Si no, **Manual Deploy → Deploy latest commit**.
6. Verificar en *Logs* que arranca y en la URL del servicio que responde.
7. Probar una subida de certificado y confirmar que aparece en el bucket de Supabase.

**Variables de Render ya verificadas** (solo nombres; los valores están enmascarados): están las 3 obligatorias (`SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`), las 6 de Supabase, base de datos, Mongo, Redis, Celery, Google, MercadoPago, Mailtrap y Sentry. **Revisá a mano:** que `SUPABASE_STORAGE_PUBLIC_URL_BASE` sea `https://<proyecto>.supabase.co/storage/v1/object/public`, que `DJANGO_SETTINGS_MODULE` sea `core.settings.production`, y que exista `QR_SECRET_KEY` con un valor propio (si no, el código usa uno por defecto). `MP_NGROK_URL` es de desarrollo: sacala de producción si no se usa.

---

## D1 — Backlog y evidencia · Rodrigo · rama `docs/backlog-y-evidencia-bugs` · #303

**Contexto.** Publica el relevamiento: 88 fichas de lo que falta o está roto, los reportes de bugs con capturas y el script que las genera.

**Qué hacés:**
1. Rama desde `develop`. Agregar `docs/backlog/` (88 fichas, README, plantilla, `PLAN-DE-ENTREGA.md`, `PLAN-DE-PRS.md`).
2. Agregar `docs/qa/bug-reports.md`, `docs/qa/evidence/bugs/` (PNG + `api-evidence.json`) y `frontend/scripts/capture-bug-evidence.mjs`.
3. **Dos commits** (es el único PR con dos):
   - `docs(backlog): add gap backlog with 88 sheets, index and planning`
   - `docs(qa): add bug reports with screenshot evidence and capture script`
4. PR a `develop`, `Closes #303`, Franco aprueba.
5. Después del merge, adjuntar las capturas a los 6 issues `[BUG]` (arrastrarlas al comentario) con los links `blob/develop`.

---

## D2 — Plan y casos corregidos + Matriz · Rodrigo (con el equipo QA) · rama `docs/qa-correcciones-sprint-3` · #304

**Contexto.** La cátedra devolvió observaciones sobre el Plan de Pruebas y los Test Cases (secciones vacías, criterio de aceptación rígido, falta columna HU, casos no atómicos, un copy-paste, falta la Matriz). Se corrige en el repo y **también en las planillas de Google** (ver issues hijos).

**Qué hacés:**
1. Editar `docs/qa/plan-de-pruebas.md`: completar Historial de Versiones, Aprobaciones y Pruebas de Regresión; criterio de aceptación por severidad (0 bloqueantes, 0 altos sin mitigar); quitar el riesgo «sin CI/CD» (existe `.github/workflows/ci.yml`); actualizar conteo (backend **401** tests, no 233); aclarar que React/Vite fue aprobado.
2. Editar `docs/qa/casos-de-prueba.csv`: dividir los no atómicos (TC-ACCESS-04 → 04-A a 04-E), columna **HU**, corregir **TC-MEMBERS-06**, columnas del Sprint 4 (tipo, capa, ¿automatizable?, herramienta, ID del test) y enlaces de evidencia.
3. Crear `docs/qa/matriz-de-trazabilidad.md` (27 filas: US01–US09 × 3 escenarios).
4. Commit: `docs(qa): fix sprint 3 test plan and cases and add traceability matrix`
5. PR, `Closes #304`, #308, #309, #310, #311, #312. Franco aprueba.

Hijos asignados: Plan → Magali (#308), casos atómicos y TC-MEMBERS-06 → Gisele (#309, #310), Matriz → Jimena (#311), sincronizar planillas → todas (#312).

---

## D3 — Postman + Newman · Franco · rama `test/api-postman-newman` · #305

**Contexto.** La consigna del Sprint 4 pide una colección Postman v2.1 que pruebe la API como caja negra, con reportes de Newman. Hoy no existe nada.

**Qué hace Franco:**
1. Crear `tests/api/coleccion.json` (exportar en formato **v2.1**) con una carpeta por recurso: **Auth** (login, refresh), **Planes** y **Socios** (CRUD completo `POST → GET → PUT/PATCH → DELETE`, propagando el `id` con una variable de colección).
2. Crear `tests/api/entorno.local.json` con `{{baseUrl}}`, `{{adminEmail}}`, `{{adminPassword}}`. **Ninguna URL, credencial ni token escrito a mano** en los requests.
3. En cada request, scripts de test: código de estado, presencia y tipo de campos del cuerpo.
4. Al menos **una prueba negativa por recurso**: payload inválido → `400` con mensaje estructurado, y request sin token → `401`.
5. Ejecutar: `npx newman run tests/api/coleccion.json -e tests/api/entorno.local.json -r cli,junit,html --reporter-junit-export tests/api/reportes/junit.xml --reporter-html-export tests/api/reportes/reporte.html` (con `docker compose up` y los datos de `seed_demo_users`).
6. Documentar el comando en la Wiki y, si alcanza, sumar un job a `.github/workflows/ci.yml`.
7. Commit: `test(api): add Postman v2.1 collection with Newman reports`
8. PR, `Closes #305`. Rodrigo aprueba.

---

## D4 — E2E Playwright en TypeScript · Franco · rama `test/e2e-playwright-ts` · #306

**Contexto.** Hoy no hay E2E. Playwright ya está instalado en el frontend y los flujos CP-E2E-01..03 están diseñados en `docs/qa/plan-de-pruebas.md` §27. Hay que automatizarlos con Page Object Model.

**Qué hace Franco:**
1. `cd frontend && npm i -D @playwright/test @axe-core/playwright && npx playwright install chromium`.
2. Estructura en la raíz del repo: `e2e/pages/` (un Page Object por pantalla: Login, Dashboard, Credencial, AccesoTerminal, CobroManual, Usuarios, Socios, Planes), `e2e/tests/`, `e2e/playwright.config.ts`.
3. Agregar `data-testid` en los componentes de los flujos (hoy hay solo 2 en `frontend/src`).
4. Tres flujos: (a) **autenticación**: login válido y login inválido parametrizado (≥ 4 combinaciones); (b) **CRUD** del módulo principal; (c) **flujo de negocio** CP-E2E-01 (nuevo socio → pago → credencial → acceso concedido) o CP-E2E-02 (cobro manual → credencial e historial).
5. Reglas: selectores `data-testid` → rol ARIA → texto; **prohibido XPath absoluto y esperas ciegas**; Page Objects sin aserciones; cada test indica la HU y el TC que valida en su comentario; datos de prueba por API para que sean herméticos.
6. Guardar evidencia (screenshot/video/trace) de al menos un fallo real.
7. Commit: `test(e2e): add Playwright TypeScript suite with page objects for critical flows`
8. PR, `Closes #306`. Rodrigo aprueba.

Referencia: `frontend/scripts/capture-bug-evidence.mjs` ya hace login por rol con Playwright.

---

## D5 — Accesibilidad · Rodrigo (con Magali) · rama `test/accesibilidad-sprint-4` · #307

**Contexto.** La consigna pide evaluar WCAG 2.2 AA con herramientas automáticas **y** revisión manual, y reportar al menos 3 bugs de accesibilidad. Depende de D4 (axe corre dentro de Playwright).

**Qué hacés:**
1. `e2e/tests/accesibilidad.spec.ts`: axe-core sobre login, dashboard, listado de socios, formulario de alta, detalle y flujo de negocio. Criterio: **0 violaciones críticas o serias**.
2. Lighthouse (Chrome DevTools, categoría Accesibilidad) en las mismas pantallas, meta ≥ 90, con capturas de los reportes.
3. Checklist manual (teclado, formularios, contraste 4.5:1 / 3:1, imágenes e íconos, estructura semántica, SPA, zoom 200 % y reflow 320 px, lector de pantalla en un flujo crítico).
4. Crear ≥ 3 issues con etiqueta `accesibilidad` (criterio WCAG, severidad, pantalla, componente, evidencia). Candidatos ya medidos (BK-MOB-11): `text-tertiary` con contraste 2,61:1 (claro) y 3,54:1 (oscuro), blanco sobre `primary` 3,10:1, 55 usos de `outline-none`, filas clickeables sin teclado.
5. Informe en `docs/qa/informe-accesibilidad.md`.
6. Commit: `test(a11y): add axe-core checks and accessibility report`
7. PR, `Closes #307`. Franco aprueba.

**Fuera de PR (Rodrigo):** ampliar `Testing.md` en la Wiki (#313) y actualizar el tablero (#314).

---

# Parte 2 — Backlog completo (16 PRs)

## B1 — Pagos: fuga de datos y cobro (P0) · Franco · ~12 días · rama `fix/pagos-fuga-y-cobro`

**Commit (squash):** `fix(payments): stop cross-member payments, free renewals and fragile MercadoPago webhook`

**En la descripción del PR:** Closes #187 · Closes #189 · Closes #190

**Contexto.** 3 fichas agrupadas por zona de código. Hacelas en el orden de la lista.

### BK-FIN-05 · Ficha de socio y "Mis pagos" - historial de otro socio, estados cancelado/reembolsado en verde y datos crudos
_Prioridad P0 · Tamaño M · Estado en código: roto · Depende de: — · Issue #187 · Ficha: `docs/backlog/items/BK-FIN-05-pagos-membresias-ui-filtros-estados-bugs.md`_

**Contexto:** Varias pantallas de pagos/membresías muestran datos equivocados: la pestaña "Pagos" de la ficha del socio trae pagos de **todos** los socios porque el hook manda el filtro con un nombre que el backend no reconoce; los estados `cancelado`, `reembolsado`, `suspendida` y `cancelada` se pintan en **verde** porque `Badge` no tiene variante `neutral`; y se muestran valores crudos (`mercado_pago`, ids de plan). Son correcciones chicas que además desbloquean BK-FIN-04, BK-FIN-06 y BK-FIN-08.

**Qué hacer:**
- Corregir `usePagosPorSocio` (`socio`), el test que lo fija y `page_size` (agregar paginación configurable en `PagoViewSet`, ver BK-FIN-04).
- `Badge`: agregar variantes `neutral` e `info` y que una variante desconocida **no** caiga en `success` (usar `neutral`).
- Mapa único de estados de pago y de membresía (label + variante + icono) en `frontend/src/constants/pagos.js` y `frontend/src/constants/membresias.js` (nuevo), consumido por `HistorialPagosPage`, `SocioDetailModal`, `HistorialPagosCard`, `SocioDashboardView`.
- `MembresiaSerializer`: `plan_nombre` y `socio_nombre` read-only; `select_related`.
- Corregir `AdminDashboardView` para usar `socio_nombre` (ver BK-FIN-03).

**Archivos:**
- `frontend/src/components/ui/Badge.jsx` (+ test nuevo `Badge.test.jsx`), `frontend/src/constants/pagos.js`, `frontend/src/constants/membresias.js` (nuevo).
- `frontend/src/hooks/queries/usePagos.js` y `usePagos.test.jsx` (línea 40: cambiar a `socio`).
- `frontend/src/components/pagos/HistorialPagosCard.jsx` (usar constantes compartidas; tests en `components/pagos/__tests__/HistorialPagosCard.test.jsx`).
- `frontend/src/pages/socio/HistorialPagosPage.jsx` (+ `pages/socio/__tests__/HistorialPagosPage.test.jsx`).
- `frontend/src/components/admin/SocioDetailModal.jsx` (+ `SocioDetailModal.test.jsx`), `frontend/src/components/dashboard/views/SocioDashboardView.jsx`.
- `backend/apps/memberships/serializers.py`, `backend/apps/memberships/views.py` (`select_related('socio','plan')`), `backend/apps/memberships/tests/test_membresias_views.py` (ampliar).

**Tests primero:**
**Backend** (`cd backend && pytest -q apps/memberships/tests/test_membresias_views.py apps/payments/tests`; `APITestCase` + `RefreshToken`, factories `conftest.py:23-75`):
1. `GET /api/memberships/membresias/` incluye `socio_nombre` y `plan_nombre`; `GET .../membresias/{id}/` mantiene `plan` anidado.
2. Con 3 socios y pagos de cada uno, `GET /api/payments/pagos/?socio=<A>` devuelve solo los de A (test de regresión de contrato, en `apps/payments/tests`).
3. Query count constante en el listado de membresías.
**Frontend** (`npx vitest run`; mocks como en `usePagos.test.jsx:12-24`):
1. `usePagosPorSocio(10)` llama con `params: expect.objectContaining({ socio: 10 })` y **no** con `socio_id`.
2. `Badge` con variante desconocida usa estilos `neutral` (no `success`); `neutral` e `info` renderizan colores distintos.
3. `HistorialPagosPage`: un pago `reembolsado` muestra "Reembolsado" y ícono (no badge verde); método "MercadoPago"/"Cobro manual".
4. `SocioDetailModal`: pestaña Membresías muestra `plan_nombre`; suspendida/cancelada con etiqueta correcta.
5. Accesibilidad básica: `getByText('Cancelado')` presente (el estado no se comunica solo por color).
**Manual:** con `recepcion@winnie.local` abrir la ficha de `socio.activo@winnie.local` y comprobar que solo aparecen sus pagos.

### BK-FIN-07 · Renovación self-service - cerrar el endpoint que activa membresías gratis y definir la política de apilado de días
_Prioridad P0 · Tamaño M · Estado en código: roto · Depende de: BK-FIN-08 · Issue #189 · Ficha: `docs/backlog/items/BK-FIN-07-renovacion-self-service-me-renew-y-politica-de-apilado.md`_

**Contexto:** Existe `POST /api/memberships/me/renew/` que cualquier socio autenticado puede llamar para obtener una membresía **activa sin pagar**; el frontend no lo usa (renueva por MercadoPago), pero la ruta está expuesta y testeada como flujo feliz. Además, tanto la renovación como el cobro manual y el webhook **descartan los días restantes** de la membresía vigente, aunque la UI de recepción promete lo contrario. Hay que cerrar el agujero, unificar la lógica de renovación y definir la política de apilado.

**Qué hacer:**
- Cerrar `POST /api/memberships/me/renew/`: eliminar la ruta (recomendado) o responder `410 Gone` con mensaje apuntando al checkout; actualizar/eliminar los tests que lo consagran.
- Servicio único `renovar_membresia(socio, plan, *, fecha_inicio=None, politica=...)` en `memberships/services.py`, usado por webhook, cobro manual y renovación admin (BK-FIN-06); eliminar `_activate_membership` duplicado.
- Política de apilado (ver decisión 1): por defecto **acumular los días restantes**.
- Corregir el aviso de `CobroManualPage` para que describa la política real y muestre la nueva fecha de vencimiento estimada.
- CTA "Renovar" en la credencial y en el email; checkout con "Tu plan actual", vencimiento y preselección por `?plan=<id>`.
- Mostrar nuevo vencimiento en la confirmación y en el email de pago (`payment_confirmation`).

**Archivos:**
- Backend: `memberships/views.py` + `urls.py` (quitar `MeRenewView`/`me-renew`), `memberships/services.py` (servicio unificado), `payments/services.py` (reemplazar `_activate_membership` por `renovar_membresia`), `memberships/serializers.py` (`ultima_membresia`, `dias_restantes`), plantillas `expiration_alert.*` y `payment_confirmation.*` (link y nuevo vencimiento).
- Tests backend: reescribir `memberships/tests/test_renewal_flow.py` (ahora prueba el servicio y que la ruta ya no activa), `payments/tests/test_cobro_manual.py`, `test_webhook.py`, `memberships/tests/test_memberships_services.py`.
- Frontend: `CheckoutPage.jsx` (+ `CheckoutPage.test.jsx`), `CredencialDigitalPage.jsx`, `MembershipExpiredAlert.jsx`, `CobroManualPage.jsx` (+ tests en `pages/recepcion/__tests__/CobroManualPage.test.jsx` y `CobroManualPage.handlers.test.jsx`), `docs/architecture.md` (corregir el flujo).

**Tests primero:**
**Backend** (`cd backend && pytest -q apps/memberships/tests apps/payments/tests`; `TestCase`/`APITestCase`, factories `conftest.py:23-75`):
1. `POST /api/memberships/me/renew/` por un socio **no** crea ni activa membresía (`404`/`410`); no existe efecto en DB.
2. Servicio con acumulación: membresía vigente con 5 días restantes + plan de 30 -> nueva `fecha_fin = hoy + 35`; anterior queda `vencida`/`renovada`.
3. Servicio sin vigente (vencida): `fecha_fin = hoy + duracion_dias`.
4. Webhook `approved` y cobro manual aplican la misma política (tests que comparan `fecha_fin`).
5. Concurrencia: dos llamadas seguidas no dejan dos `activa` (con el constraint de BK-FIN-06 o por `select_for_update`).
6. `GET /api/memberships/me/` devuelve `ultima_membresia` y `dias_restantes` para vencida y para vigente.
**Frontend** (`npx vitest run src/pages/socio src/pages/recepcion src/components/socio`): checkout muestra plan actual y nueva fecha estimada; alerta de vencida tiene botón a `/socio/checkout`; `CobroManualPage` muestra el texto real del apilado y la nueva fecha.
**Manual:** `socio.vencido@winnie.local` abre credencial -> "Renovar ahora" -> checkout (sandbox MP, ver BK-FIN-08); como `recepcion@winnie.local` cobrar a `socio.activo@winnie.local` y verificar que el vencimiento suma los días restantes.

### BK-FIN-08 · Pago con MercadoPago end-to-end - webhook robusto, estados completos (cancelado/reembolsado) y retorno del checkout confiable
_Prioridad P0 · Tamaño XL · Estado en código: ui-parcial · Depende de: BK-FIN-07, BK-FIN-05 · Issue #190 · Ficha: `docs/backlog/items/BK-FIN-08-pago-mercadopago-estados-webhook-retorno.md`_

**Contexto:** El flujo feliz (crear preferencia -> pagar en MP -> webhook -> activar membresía -> email) existe y está testeado, pero tiene huecos que pueden dejar a un socio **pagado sin membresía**, activar de más o dejarla activa tras un reembolso: el webhook ignora como "duplicado" un segundo intento de pago aprobado sobre la misma preferencia, no protege estados terminales, reenvía el email en cada notificación, no revoca nada ante reembolso/contracargo, nunca vence los pagos pendientes abandonados y la pantalla de retorno confía en un parámetro de URL en lugar del estado real del pago.

**Qué hacer:**
- Reescribir `procesar_webhook` con: lookup por `mp_payment_id` y por `external_reference`, aceptación de nuevos intentos sobre el mismo `Pago` mientras no esté aprobado, protección de estados terminales (un `aprobado` solo pasa a `reembolsado`/`cancelado` por refund/chargeback), un único email de confirmación por `Pago`, y registro de pagos aprobados duplicados (doble cobro) para revisión.
- Política y efecto de reembolso/contracargo sobre la membresía y notificación al staff (ver decisión 1).
- Expiración de pagos pendientes (tarea Celery + `expiration_date_to` en la preferencia).
- Endpoint de estado de pago para el socio y pantalla de retorno que consulta el estado real (con polling corto) y muestra los 5 estados con mensajes.
- Filtrar por `topic/type` de la notificación y responder códigos que no provoquen reintentos inútiles.
- "Reintentar pago" para pagos `pendiente`/`rechazado`.

**Archivos:**
- Backend: `payments/services.py` (webhook, preferencia con expiración, política de reembolso), `payments/views.py` (códigos de respuesta, filtro `mis-pagos`), `payments/models.py` + migración `0002`, `payments/tasks.py` (nuevo, `expire_pending_pagos`), migración de datos de schedule, plantillas `emails/` (aviso de reembolso al socio), `payments/serializers.py`, `docs/architecture.md` (corregir idempotencia/flujo).
- Tests backend: ampliar `payments/tests/test_webhook.py`, `test_mis_pagos.py`, nuevo `test_expire_pending.py`.
- Frontend: `CredencialDigitalPage.jsx`, `components/socio/PagoResultadoBanner.jsx`, `hooks/queries/useMisPagos.js`, `HistorialPagosPage.jsx`, `CheckoutPage.jsx`, `constants/pagos.js`; tests `PagoResultadoBanner.test.jsx`, `CheckoutPage.test.jsx`, `useMisPagos.test.jsx`, `HistorialPagosPage.test.jsx`.

**Tests primero:**
**Backend** (`cd backend && pytest -q apps/payments/tests`; molde `test_webhook.py`: `APITestCase`, `override_settings(MP_WEBHOOK_SECRET=..., EMAIL_BACKEND=locmem, CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True)`, helper `_build_signature` (`:23-26`), `patch('apps.payments.services.mercadopago_client.fetch_payment')`; factories `conftest.py:23-75`):
1. **Reintento:** `Pago` con `mp_payment_id='A'` y estado `rechazado`; webhook `approved` con `data.id='B'` y misma referencia -> `Pago` `aprobado`, `mp_payment_id='B'`, membresía activa, 1 mail. (Hoy falla: devuelve `duplicate ignored`.)
2. **Email único:** dos webhooks `approved` idénticos -> `len(mail.outbox) == 1` (asserta de verdad).
3. **Orden:** `aprobado` + webhook posterior `in_process`/`rejected` (otro estado de la misma sucesión) no degrada el estado.
4. **Reembolso:** `aprobado` + `refunded` -> `reembolsado`, `reembolsado_at` seteado, membresía según política (cancelada/vencida), mail de aviso; `charged_back` igual.
5. **Doble cobro:** `aprobado` con id A + `approved` con id B -> estado sin cambios y `raw_webhook['doble_cobro']=='B'`.
6. **Topic:** payload `type='merchant_order'` -> `200 ignored`, sin `fetch_payment`.
7. **Sin secreto:** `MP_WEBHOOK_SECRET=''` -> `503` (no 500).
8. `mis-pagos?external_reference=<ref>` devuelve solo el pago propio; de otro socio -> vacío/`404`.
9. `expire_pending_pagos` cancela pendientes viejos sin `mp_payment_id` y no toca los recientes ni los manuales.
10. Preferenc

## B2 — Bugs rápidos de frontend y auditoría · Rodrigo · ~4.5 días · rama `fix/frontend-bugs-rapidos`

**Commit (squash):** `fix(frontend): staff profile, create-staff button, attendance redirect, modal a11y and audit actor`

**En la descripción del PR:** Closes #160 · Closes #162 · Closes #163 · Closes #168 · Closes #169 · Closes #218

**Contexto.** 6 fichas agrupadas por zona de código. Hacelas en el orden de la lista.

### BK-BUG-01 · El perfil de administrador/recepcionista nunca carga (GET /api/auth/profile/ devuelve 404)
_Prioridad P0 · Tamaño M · Estado en código: roto · Depende de: — · Issue #160 · Ficha: `docs/backlog/items/BK-BUG-01-perfil-staff-devuelve-404.md`_

**Contexto:** `ProfileView` resuelve el objeto con `get_object_or_404(Socio, usuario=request.user)`. Admin y recepcionista no tienen `Socio` (así lo asume el propio `ProtectedRoute`), por lo que `GET /api/auth/profile/` responde 404 siempre. La página `/perfil` (accesible desde "Ver perfil" del Sidebar) muestra skeleton ~1–2 s (reintento de React Query) y después un formulario vacío sin error. Además hay un test backend que **codifica el bug como comportamiento esperado**.

**Qué hacer:**
que `GET/PATCH /api/auth/profile/` funcione para staff; página `/perfil` apta para staff (nombre, apellido, email, rol, cambio de contraseña); mostrar nombre de staff en Sidebar/Dashboard tras login; estado de error visible en `ProfilePage`; corregir el test que fija el 404.

**Archivos:**
- `backend/apps/users/serializers.py` — agregar `StaffProfileSerializer`; en `CustomJWTSerializer.get_user` incluir `nombre`/`apellido` de staff.
- `backend/apps/users/views.py` — `ProfileView.get_object()` y `get_serializer_class()` por rol.
- `backend/apps/users/tests/test_views.py` — reemplazar `test_user_without_socio_returns_404` y agregar tests de staff.
- `frontend/src/pages/ProfilePage.jsx` — rama staff, schema por rol, estado de error.
- `frontend/src/pages/ProfilePage.test.jsx` — casos staff/error.
- (opcional) `frontend/src/hooks/queries/useProfile.js` — `retry` condicional.

**Tests primero:**
Convención backend: `backend/apps/users/tests/test_views.py` usa `APITestCase`, `make_user_factory(rol=...)` y `make_socio_factory(usuario, ...)` de `backend/conftest.py`, y helper `_auth_client(self.client, user)` (JWT). Correr: `cd backend && pytest apps/users -q` (CI corre `pytest -q`; `pytest.ini` exige `--cov-fail-under=80`).

Backend (escribir primero, en `ProfileViewTests`):
- `test_staff_get_returns_200` para `administrador` y `recepcionista`: 200 con `nombre`==`first_name`, `apellido`==`last_name`, `email`, `rol`; sin `dni`/`telefono`.
- `test_staff_patch_updates_first_last_name`: PATCH `{nombre,apellido}` persiste en `User.first_name/last_name`.
- `test_staff_patch_ignores_email_and_rol`: PATCH `{email:'x@y.z', rol:'administrador'}` no cambia `email` ni `rol`.
- `test_socio_without_socio_record_returns_404`: usuario `rol='socio'` sin `Socio` → 404 (sustituye al test actual).
- `test_login_response_includes_nombre_apellido_for_staff` en `CustomJWTSerializerTests`.
- Los tests existentes de socio (200/PATCH/DNI inmutable) deben seguir en verde.

Frontend (vitest + RTL; mocks de `../hooks/queries/useProfile` y `useAuth` como en `ProfilePage.test.jsx:15`; utilidades en `frontend/src/test/test-utils.jsx`: `renderWithProviders`, `createTestQueryClient`): staff no ve campos DNI/Teléfono y puede guardar con nombre/apellido; `isError` muestra EmptyState + "Reintentar"; socio mantiene comportamiento. Correr: `cd frontend && npx vitest run src/pages/ProfilePage.test.jsx`; lint

### BK-BUG-03 · El botón "Crear staff" no se renderiza (prop `actions` inexistente en TopBar) y el estado "Activo/Pendiente" es falso
_Prioridad P0 · Tamaño S · Estado en código: roto · Depende de: — · Issue #162 · Ficha: `docs/backlog/items/BK-BUG-03-crear-staff-boton-invisible-y-estado-activacion-falso.md`_

**Contexto:** En `/admin/usuarios` el único acceso para crear staff está en `<TopBar actions={...}/>`, pero `TopBar` no tiene prop `actions` (solo `rightContent`), así que el botón **nunca se dibuja** y no hay forma de crear usuarios de staff desde la UI. El test existente lo oculta porque mockea `TopBar` con una prop `actions`. Además la columna "Estado" siempre muestra "Activo" porque el backend no expone si la contraseña es utilizable.

**Qué hacer:**
renderizar el botón en `TopBar` vía `rightContent`; exponer `has_usable_password` en `StaffListSerializer` y usarlo en `StatusBadge`; corregir el test para usar el `TopBar` real (o un mock con `rightContent`); estados de carga/vacío/error del listado.

**Archivos:**
- `frontend/src/pages/admin/AdminUsuariosPage.jsx` — `rightContent`, `has_usable_password`, estados.
- `frontend/src/pages/admin/__tests__/AdminUsuariosPage.test.jsx` — mock de `TopBar` con `rightContent` (o sin mock) y casos nuevos.
- `backend/apps/users/serializers.py` — `has_usable_password` en `StaffListSerializer`.
- `backend/apps/users/tests/test_staff_create.py` — caso de listado con el campo nuevo.

**Tests primero:**
Frontend (vitest + RTL, `renderWithProviders` de `frontend/src/test/test-utils.jsx`): **primero** hacer rojo el test: sin mockear `TopBar` (ni mockeando `actions`), `screen.getByRole('button',{name:/crear staff/i})` debe existir; click abre `StaffFormModal`; usuario con `has_usable_password:false` muestra "Pendiente activación" y con `true` "Activo"; `isError` muestra "Reintentar". Correr `cd frontend && npx vitest run src/pages/admin/__tests__/AdminUsuariosPage.test.jsx`; lint `npm run lint`.
Backend (`backend/apps/users/tests/test_staff_create.py`, mismo estilo `APITestCase` + `make_user_factory`/`_auth_client`): `GET /api/users/staff/` como admin incluye `has_usable_password` `False` para un usuario recién creado por `POST` y `True` para uno con `set_password`; recepcionista y socio → 403. `cd backend && pytest apps/users -q`.
Manual: `admin@winnie.local` → Sidebar "Usuarios" → ver botón "Crear staff" arriba a la derecha → crear → aparece con "Pendiente activación".

### BK-BUG-04 · "Abrir terminal completa de asistencia" siempre termina en "Clase no encontrada" (el redirect legacy descarta ?id=)
_Prioridad P0 · Tamaño S · Estado en código: roto · Depende de: — · Issue #163 · Ficha: `docs/backlog/items/BK-BUG-04-redirect-legacy-pierde-query-asistencia-clase-no-encontrada.md`_

**Contexto:** `ClassAttendeesModal` navega a `/clases/asistencia?id=<id>`. En `App.jsx` esa ruta es `<Navigate to="/admin/clases/asistencia" replace />`, y `Navigate` con un `to` sin query **descarta el search string**. `AttendancePage` lee la clase de `useSearchParams().get('id')`, no de `location.state`, así que llega sin `id`, dispara `toast.error('Clase no encontrada')` y vuelve a `/admin/clases`. Resultado: la terminal completa de asistencia es inalcanzable desde la UI (la hipótesis previa "se entra sin `state`" no es la causa: la página nunca usó `state`). El mismo patrón de redirect legacy existe en otras rutas.

**Qué hacer:**
(a) apuntar el modal a la ruta canónica `/admin/clases/asistencia?id=`; (b) hacer que los redirects legacy conserven `search`/`hash`; (c) mover el toast/redirect de "Clase no encontrada" a un `useEffect` (hoy se ejecuta en cada render, y con `StrictMode` doble); (d) mostrar estado de error cuando la clase no existe (404 del detalle).

**Archivos:**
- `frontend/src/App.jsx` — `RedirectPreservingSearch` y uso en rutas legacy.
- `frontend/src/components/classes/ClassAttendeesModal.jsx` — ruta canónica.
- `frontend/src/pages/AttendancePage.jsx` — `useEffect` para validación + estado de error.
- `frontend/src/pages/AttendancePage.test.jsx` y `frontend/src/components/classes/*.test.jsx` (si existe el de `ClassAttendeesModal`) — casos nuevos; `frontend/src/App.test.jsx` si existe (no verificado) o un test nuevo de routing.

**Tests primero:**
Frontend (vitest + RTL + `MemoryRouter`; `renderWithProviders({route})` de `frontend/src/test/test-utils.jsx` acepta `route` inicial): **primero** un test de routing que renderice `<App/>` (o un `<Routes>` mínimo con las rutas legacy) en `/clases/asistencia?id=42` con usuario `recepcionista` y espere que `useLocation().search === '?id=42'` y `pathname === '/admin/clases/asistencia'`; idem `/clases/crear?id=7`. Test del modal: click en "Abrir terminal completa de asistencia" → `navigate` llamado con `/admin/clases/asistencia?id=<id>`. Test de página: sin `id` → un solo `toast.error` (no uno por render). `cd frontend && npx vitest run src/pages/AttendancePage.test.jsx src/components/classes`; `npm run lint`.
Manual: `recepcion@winnie.local` → Clases → abrir una clase con inscriptos → "Abrir terminal completa de asistencia" → debe cargar la clase.

### BK-BUG-09 · FilterPanel se recorta en el borde derecho (desktop) y el Modal no atrapa el foco ni devuelve el foco / repite ids
_Prioridad P2 · Tamaño S · Estado en código: roto · Depende de: — · Issue #168 · Ficha: `docs/backlog/items/BK-BUG-09-filterpanel-recortado-y-accesibilidad-de-modal.md`_

**Contexto:** El popover de `FilterPanel` se ancla con `left-0` y mide `w-80` (320 px), pero el botón vive en el extremo **derecho** de una fila `justify-between` dentro de un contenedor `overflow-auto`: el panel se extiende hacia la derecha, se recorta o provoca scroll horizontal. Además, `FilterPanel` no cierra con Escape ni expone estado ARIA, y `Modal` anuncia "focus trap" pero solo enfoca el primer elemento (el foco puede escapar con Tab, no se restaura al cerrar y los ids `modal-title`/`modal-desc` son fijos).

**Descartado tras revisar el código:** (a) "el modal de Plan no cerró con Escape": `Modal` registra `keydown` en `window` (`Modal.jsx:29-40`), `PlanFormModal` usa ese `Modal` y `Modal.test.jsx:41-55` ya prueba el cierre con Escape → no hay defecto reproducible por lectura (la falla observada fue de la automatización; si reaparece, abrir con DevTools y verificar que el foco no esté en un i

**Qué hacer:**
anclar el popover a la derecha en desktop (`right-0`, y `max-w-[calc(100vw-2rem)]`), cierre con Escape, atributos ARIA, `type="button"`; en `Modal`: ids únicos (`useId`), trampa de foco real (Tab/Shift+Tab), restauración de foco, `aria-label` fallback.

**Archivos:**
- `frontend/src/components/ui/FilterPanel.jsx`, `frontend/src/components/ui/Modal.jsx`.
- `frontend/src/components/ui/__tests__/FilterPanel.test.jsx`, `Modal.test.jsx`.

**Tests primero:**
Vitest + RTL (`@testing-library/react`, ``fireEvent` (`@testing-library/user-event` no está en `package.json`)); correr `cd frontend && npx vitest run src/components/ui`:
- `FilterPanel`: el panel abierto tiene la clase `right-0` (y no `left-0`); `fireEvent.keyDown(window,{key:'Escape'})` lo cierra; el toggle tiene `aria-expanded` que alterna.
- `Modal`: con dos `Modal` abiertos los ids de título son distintos; Tab desde el último focusable vuelve al primero; al cerrar, el foco vuelve al botón que lo abrió; sin `title` el diálogo tiene nombre accesible.
- Regresión: los tests existentes siguen verdes.
Manual (1440 px y 375 px): `admin@winnie.local` → `/admin/socios` → "Filtros": el panel no se corta; Escape lo cierra; abrir/cerrar un modal con teclado.

### BK-BUG-10 · Deuda técnica: API de React Query v4 usada con v5 (`isLoading` de mutaciones, `keepPreviousData`) y código muerto (ComingSoonPage, rama `mock-`, rutas alias)
_Prioridad P2 · Tamaño S · Estado en código: roto · Depende de: BK-BUG-04 · Issue #169 · Ficha: `docs/backlog/items/BK-BUG-10-deuda-tecnica-react-query-v5-y-codigo-muerto.md`_

**Contexto:** `package.json` declara `@tanstack/react-query ^5`. En v5 las mutaciones **no tienen `isLoading`** (es `isPending`) y la opción `keepPreviousData` fue reemplazada por `placeholderData: keepPreviousData`. El código sigue usando la API de v4: los botones de baja/alta nunca se deshabilitan durante la petición (doble envío) y el listado de socios parpadea al paginar. Además hay código que ya no se usa: `ComingSoonPage` (la lista `COMING_SOON_PATHS` está vacía), la rama de tokens `mock-` en el interceptor de axios, el hook `saveAttendees`/mutación `remove` obsoletos y rutas alias duplicadas.

**Qué hacer:**
reemplazar `isLoading` por `isPending` en mutaciones; `placeholderData: keepPreviousData`; auditoría (`rg`) de otros usos de la API v4 (`onSuccess` de `useQuery`, `cacheTime`, `isInitialLoading` no verificado); eliminar `ComingSoonPage` + test + `COMING_SOON_PATHS`; eliminar la rama `mock-`; decidir qué rutas alias se mantienen (conservar los redirects legacy **con** `search`, ver BK-BUG-04) y fusionar duplicados con un único path canónico.

**Archivos:**
- `frontend/src/pages/admin/AdminSociosPage.jsx`, `frontend/src/hooks/queries/useSociosData.js`.
- Borrar: `frontend/src/pages/ComingSoonPage.jsx`, `frontend/src/pages/ComingSoonPage.test.jsx`; editar `frontend/src/App.jsx` (import, constante y bloque `COMING_SOON_PATHS.map`).
- `frontend/src/services/api.js` (rama `mock-`) y su test si existe (`frontend/src/services/__tests__` — verificar).
- `frontend/src/hooks/queries/useClassAttendees.js` (`saveAttendees`) y `ClassAttendeesModal.jsx` si lo consume.

**Tests primero:**
Vitest + RTL (`cd frontend && npx vitest run`; coverage gates en CI: `npx vitest run --coverage`, umbrales lines/branches/statements 68 y functions 65 en `frontend/vite.config.js:19-23`; el lint corre con `--max-warnings 0`):
- `AdminSociosPage`: con la mutación `baja` en `isPending`, el botón "Confirmar Baja" está `disabled` y muestra "Procesando..." (mockear `useSocioMutations` devolviendo `{ baja: { isPending: true, mutateAsync } , ...}`); el modal de socio recibe `isLoading` verdadero durante `create/patch`.
- `useSociosList`: al cambiar de página, `data` previa se mantiene (`isPlaceholderData === true`) hasta que llega la nueva.
- Tras borrar `ComingSoonPage`, la suite y `npm run build` siguen verdes; `rg ComingSoon frontend/src` sin resultados.
- Interceptor `api.js`: un 401 con token que empieza con `mock-` ya no se trata distinto (test que lo documente o eliminar el caso).
Manual: `admin@winnie.local` → Socios → dar de baja a uno → el botón queda deshabilitado hasta la respuesta; paginar sin parpadeo del listado.

### BK-PLT-12 · Auditoría: el actor de los eventos de API queda como `system` (la identidad del usuario JWT no llega al middleware)
_Prioridad P1 · Tamaño S · Estado en código: roto · Depende de: — · Issue #218 · Ficha: `docs/backlog/items/BK-PLT-12-auditoria-actor-siempre-system.md`_

**Contexto:** El trail de auditoría en MongoDB (RNF04, "quién cambió qué") obtiene el actor con un middleware de Django que lee `request.user` ANTES de que DRF autentique el JWT. En una API con `JWTAuthentication` ese `request.user` es anónimo en ese punto, así que los eventos creados desde la API se registran con `actor_rol='system'`. **Esto se deduce leyendo el código; ningún test lo contradice ni lo prueba**, por eso el primer paso del ítem es un test que lo confirme.

**Qué hacer:**
test de regresión que haga una petición API autenticada con JWT, modifique un `PlanMembresia` y verifique que el evento tenga `actor_id`/`actor_email`/`actor_rol` correctos; corrección: fijar el usuario en el thread-local desde DRF (opción recomendada: clase base `AuditedAPIView`/mixin o sobreescribir `perform_authentication` — o un `JWTAuthentication` subclase que además llame a un setter `set_current_user(user)` en `apps/common/middleware.py`); limpiar el thread-local al finalizar.

**Archivos:**
- Modificar `backend/apps/common/middleware.py`: agregar `set_current_user(user)` (setter) y mantener el reset en `finally`.
- Crear `backend/apps/common/authentication.py`: `class AuditJWTAuthentication(JWTAuthentication)` que tras autenticar llame `set_current_user(user)`; apuntar `DEFAULT_AUTHENTICATION_CLASSES` (`base.py:175`) a ella. **Cuidado:** el middleware limpia en `finally` en el mismo hilo (sincrónico); en consumers ASGI/Celery no aplica.
- Agregar `('common', 'GymConfig')` a `_AUDITED_MODELS` (`audit.py:164`) si el dueño lo aprueba.
- Tests nuevos en `backend/apps/common/tests/test_audit_actor.py`.

**Tests primero:**
Convención: pytest + `APITestCase`; `core.settings.test`; helper de auth usado en `apps/common/tests/test_gym_config.py:12-14` (`RefreshToken.for_user(user).access_token` + `client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')`); los tests de auditoría usan Mongo real (`get_collection('audit_logs')`, helpers `_clean_audit_collection()` y `_last_audit(model)` en `apps/common/tests/test_audit.py:14-35`; el CI levanta `mongo:7`), por lo que el nuevo test debe seguir ese patrón con `TestCase`/`APITestCase` + `setUp/tearDown` que limpian la colección. Correr: `cd backend && pytest apps/common/tests -q`.
Escribir primero (deben FALLAR hoy):
- Admin con JWT hace `PATCH /api/memberships/planes/{id}/` (ruta verificada en `memberships/urls.py`: router `planes`) → el payload enviado a `log_audit_event` tiene `actor_email == admin.email` y `actor_rol == 'administrador'`.
- Request sin autenticar (rechazada) no deja usuario en el thread-local.
- Tras la respuesta, `get_current_user()` es `None` (sin fuga entre requests).
- Evento disparado desde una tarea Celery (`CELERY_TASK_ALWAYS_EAGER`) sigue como `system`.
- Manual: cambiar el precio de un plan con el admin de `seed_demo_users` y consultar `audit_logs` en Mongo (solo lectura).

## B3 — Contratos de listados, paginación y planes · Franco · ~6.5 días · rama `fix/contratos-paginacion`

**Commit (squash):** `fix(api): honor page_size on list contracts and remove phantom plan fields`

**En la descripción del PR:** Closes #170 · Closes #152 · Closes #165 · Closes #167

**Contexto.** 4 fichas agrupadas por zona de código. Hacelas en el orden de la lista.

### BK-CLS-01 · El listado de clases queda truncado a 10 registros (page_size ignorado)
_Prioridad P0 · Tamaño S · Estado en código: roto · Depende de: — · Issue #170 · Ficha: `docs/backlog/items/BK-CLS-01-clases-truncadas-a-10-por-paginacion.md`_

**Contexto:** El frontend pide "todas las clases" con `?page_size=1000`, pero el backend usa `PageNumberPagination` de DRF sin `page_size_query_param`, así que ignora el parámetro y devuelve solo la primera página (10 clases ordenadas por `id`). Apenas el gimnasio tenga más de 10 clases, el calendario, la lista, el catálogo del socio, "Mis reservas" y el dashboard dejan de mostrar las demás sin ningún aviso. Es un bug latente (hoy el seed solo crea 3 clases) que rompe el flujo completo en producción real.

**Qué hacer:**
- Clase `ClasePagination` con `page_size_query_param = 'page_size'` y `max_page_size = 1000`, asignada a `ClaseViewSet`.
- Test de regresión backend (25 clases, `?page_size=1000` devuelve 25).
- Ajustar `handleDuplicateFromExisting` solo en lo que toca a paginación (se rediseña en BK-CLS-06).

**Archivos:**
- `backend/apps/classes/pagination.py` (nuevo): `ClasePagination(PageNumberPagination)`.
- `backend/apps/classes/views.py`: `pagination_class = ClasePagination` en `ClaseViewSet` (y evaluar lo mismo en `InscripcionClaseViewSet`).
- `backend/apps/classes/tests/test_classes_pagination.py` (nuevo).

**Tests primero:**
Convención backend: tests por app en `backend/apps/classes/tests/`, `APITestCase` + `make_user_factory`/`make_socio_factory` de `backend/conftest.py`, auth con `RefreshToken.for_user(user).access_token` (ver `test_soft_cancel.py:10-12`). Correr: `cd backend && pytest apps/classes -q` (usa `core.settings.test`, `--cov-fail-under=80` en `pytest.ini`).
1. (rojo primero) Crear 25 clases; `GET /api/classes/clases/?page_size=1000` como recepcionista → `len(results) == 25`.
2. `GET /api/classes/clases/` sin `page_size` → `len(results) == 10` y `next` no nulo.
3. `?page_size=5000` → máximo 1000 (o 25 si hay 25).
4. Socio autenticado también puede listar (200).
Frontend: sin tests nuevos obligatorios; `useClases.test.jsx` ya mockea `api.get`.
Manual: sembrar 12 clases (shell Django), entrar como `recepcion@winnie.local` a `/admin/clases` y verificar que aparecen las 12 en la vista Lista y en el calendario.

### BK-ACC-05 · Contratos frontend/backend desalineados en aforo y logs (limit ignorado, stats sin aforo_actual, "/200" hardcodeado)
_Prioridad P0 · Tamaño M · Estado en código: roto · Depende de: — · Issue #152 · Ficha: `docs/backlog/items/BK-ACC-05-contratos-rotos-aforo-y-logs.md`_

**Contexto:** Varias pantallas de acceso/aforo dependen de contratos que el backend **no cumple**, y los tests del frontend los enmascaran con mocks "felices". Efectos visibles hoy: "últimos 5 movimientos" muestra 10, el gráfico de asistencia semanal se calcula con 10 logs (no con la semana), el dashboard muestra aforo 0 / ingresos 0 si el WebSocket no conecta, y el terminal dice "Aforo N/200" aunque el aforo máximo configurado sea otro.

**Qué hacer:**
(A) soporte real de `page_size` en `/access/logs/` y que `useAccessLogs`/`useReportMetrics` lo usen bien; (B) corregir el cálculo de "Asistencia semanal"; (C) endpoint de snapshot de aforo para el fallback REST; (D) máximo real en el terminal; (E) invalidar el cache de stats; (F) actualizar los tests que enmascaran el contrato.

**Archivos:**
- `backend/apps/access/views.py`, `urls.py`, `services.py` (invalidar stats en el signal), `ws_signals.py` (llamar `invalidate_aforo_stats_cache()`), `tests/test_aforo_endpoints.py` (nuevo).
- `frontend/src/hooks/queries/useDashboardData.js`, `useReportes.js`, `components/dashboard/views/{Admin,Recepcionista}DashboardView.jsx`, `pages/recepcion/AccesoTerminalPage.jsx`, `constants/pagination.js` (borrar `GYM_MAX_CAPACITY` si no se usa) y los tests asociados.

**Tests primero:**
Backend (pytest; `APITestCase`; `cache.clear()` o `invalidate_aforo_cache()` en `setUp` porque en test se usa `LocMemCache`, `core/settings/test.py:7-11`):
1. `GET /api/access/aforo/` con 3 ENTRY y 1 EXIT GRANTED → `{aforo_actual:2, ingresos_hoy:3, egresos_hoy:1, aforo_maximo:200}`; con `GymConfig` en 150 → `aforo_maximo:150`.
2. Socio → 403; sin token → 401.
3. `GET /api/access/logs/?page_size=5` con 12 logs → `len(results)==5`, `count==12`; `page_size=500` → máx 200.
4. Creación de un `AccessLog` GRANTED invalida `aforo:stats` (llamar a `get_aforo_stats()`, crear log, volver a llamar → refleja el nuevo ingreso sin esperar 30 s).
5. (si se crea) `/api/access/stats/semanal/` agrupa por día local y devuelve 7 días con ceros.
Frontend (Vitest; mockear `../../services/api` como `useGymConfig.test.jsx`; los tests de vistas ya mockean hooks, ver `AforoMonitorPage.test.jsx:10-17`):
1. `useAccessLogs(5)` llama `api.get('/access/logs/', { params: { page_size: 5 } })`.
2. `AdminDashboardView` sin mensaje WS usa el valor de `useAforoActual` (no 0) — **reescribir el mock** de `useAforoStats` en `AdminDashboardView.test.jsx`/`RecepcionistaDashboardView.test.jsx` para que devuelva la forma real (`promedioHoy…`) y el aforo salga de `useAforoActual`.
3. Terminal: con `useGymConfig` mockeado `{aforo_maximo: 150}` muestra `Aforo 150/150` (actualizar el test de `AccesoTerminal.test.jsx:41-44`).
Manual: bajar Redis/WS (o bloquear `ws://` en DevTools) y verificar que el dashboard sigue mostrando

### BK-BUG-06 · Planes: subtítulo, beneficios y matriz comparativa no existen en el backend (la UI los muestra/guarda igual) y borrar un plan con membresías devuelve 500
_Prioridad P1 · Tamaño M · Estado en código: ui-parcial · Depende de: — · Issue #165 · Ficha: `docs/backlog/items/BK-BUG-06-planes-admin-campos-fantasma-y-matriz-comparativa-falsa.md`_

**Contexto:** El formulario de plan (`PlanFormModal`) envía `subtitulo`, `beneficios`, `matriz_comparativa` y `socios_activos`, pero `PlanMembresia` solo tiene `nombre, duracion_dias, precio, clases_asignadas, activo, es_popular`. DRF ignora lo demás: lo que el admin carga **se pierde al recargar**. Las tarjetas muestran "Membresía estándar" y ninguna lista de beneficios; la pestaña "Comparativa" se rellena con valores inventados según el **nombre** del plan (`Básico`/`Premium`/`Gold`). Además: el modal se cierra antes de saber si el guardado funcionó, el recepcionista ve botones de edición que el backend rechaza con 403, borrar un plan con membresías produce 500 y el listado ignora la paginación (PAGE_SIZE 10).

**Qué hacer:**
decidir y ejecutar la fuente de verdad de beneficios/matriz (ver 11.1), quitar valores inventados (`15`, fallbacks por nombre), cerrar el modal solo en éxito, manejar `ProtectedError` (400 con mensaje claro), paginación/`page_size` del listado admin, restringir las acciones de escritura a administrador en UI.

**Archivos:**
- `backend/apps/memberships/models.py`, `serializers.py`, `views.py` (destroy), nueva migración y tests en `backend/apps/memberships/tests/`.
- `frontend/src/components/admin/PlanFormModal.jsx`, `PlanCard.jsx`, `PlanComparativeTable.jsx`, `PlanDistributionChart.jsx`, `frontend/src/pages/admin/AdminPlanesPage.jsx`, `frontend/src/hooks/queries/usePlanesAdmin.js`.
- Tests existentes a adaptar: `frontend/src/pages/admin/AdminPlanesPage.test.jsx`, `AdminPlanesPage.handlers.test.jsx`, `frontend/src/hooks/queries/usePlanes.test.jsx` (este último tiene cambios sin commitear del dueño: **no tocarlo**).

**Tests primero:**
Backend (`cd backend && pytest apps/memberships -q`; fixtures `auth_client`, `make_plan`, `make_membresia`): `DELETE` de plan con membresía → 400 (no 500) con mensaje; `DELETE` sin membresías → 204; `POST/PATCH` con `beneficios` válido persiste y se devuelve (opción A); recepcionista y socio → 403 en escritura, 200 en lectura; `socios_activos` no es escribible.
Frontend (vitest + RTL, `renderWithProviders`): `PlanFormModal` no llama `onClose` al enviar, no envía `socios_activos`; la tabla comparativa no contiene valores sin origen en la API (render con planes sin `beneficios` → celdas vacías o estado "Sin datos"); recepcionista no ve botones de escritura. `cd frontend && npx vitest run src/pages/admin src/components/admin`.
Manual: `admin@winnie.local` → Planes → crear plan con 2 beneficios → recargar → siguen ahí; intentar borrar un plan con socios activos → mensaje claro.

### BK-BUG-08 · Datos inventados en la UI: "Sede Central" en la credencial, gráfico de ingresos con curva fija, formulario de clases pre-llenado y placeholders de rol
_Prioridad P2 · Tamaño M · Estado en código: ui-parcial · Depende de: BK-BUG-06 · Issue #167 · Ficha: `docs/backlog/items/BK-BUG-08-datos-hardcodeados-en-ui-sede-central-grafico-reportes-y-form-clases.md`_

**Contexto:** Hay valores fijos en pantalla que el usuario interpreta como datos reales: la credencial dice "Sede Habilitada: Sede Central" para todos (el modelo no tiene sedes); el gráfico "Evolución de ingresos" dibuja siempre la misma curva; el formulario "Crear clase" arranca con "Funcional Intensivo / Carlos R. / Sala A…" y planes `['Premium','Gold']` (si el admin no los edita, se publican); la credencial muestra "Vista de Administrador" como estado vacío. Se agrupan acá porque comparten solución (leer del backend u ocultar). Los hardcodes de planes están en BK-BUG-06 y los del alta en recepción en BK-BUG-02.

**Qué hacer:**
quitar "Sede Central" (ocultar la tarjeta o mostrar el nombre del gimnasio desde configuración si existe); calcular `chartPath` a partir de datos reales o ocultar el gráfico cuando no haya serie; estado vacío explícito ("Sin datos de ingresos aún"); formulario de clases con valores iniciales vacíos y validación (nombre, día, hora, cupo obligatorios) y planes habilitados leídos de la API; textos de estado vacío de la credencial correctos por rol; mover `refreshQR` fuera del updater.

**Archivos:**
- `frontend/src/pages/socio/CredencialDigitalPage.jsx`, `frontend/src/hooks/queries/useReportes.js`, `frontend/src/pages/recepcion/ReportesPage.jsx`, `frontend/src/components/recepcion/EvolucionIngresosCard.jsx`, `frontend/src/pages/CreateClassPage.jsx`.
- Tests: `frontend/src/pages/CreateClassPage.test.jsx`, `CreateClassPage.handlers.test.jsx`, `frontend/src/pages/socio/CredencialDigitalPage.test.jsx`, `frontend/src/hooks/queries/useReportes.test.jsx`. Backend solo si se crea el endpoint de ingresos.

**Tests primero:**
Frontend (vitest + RTL, `renderWithProviders`): credencial no contiene el texto "Sede Central"; admin sin membresía ve "Esta vista es para socios"; con fake timers el `GET /access/qr/generate/` se llama **una vez** por ciclo de 30 s también bajo `<StrictMode>`; `CreateClassPage` arranca con campos vacíos, el submit con campos vacíos no llama a `createClase`, y el payload no incluye `cupos_reservados`/`id`; `EvolucionIngresosCard` con `chartPoints=null` muestra el estado vacío; `buildChartPath([])` devuelve `null`. `cd frontend && npx vitest run src/pages src/hooks`; `npm run lint`.
Manual: `socio.activo@winnie.local` en `/socio/credencial`; `admin@winnie.local` en `/admin/clases/crear` y `/recepcion/reportes` (con y sin pagos cargados).

## B4 — Terminal de acceso y aforo · Rodrigo · ~18 días · rama `feat/acceso-terminal-aforo`

**Commit (squash):** `feat(access): exit flow, anti-passback, present list and enforced capacity`

**En la descripción del PR:** Closes #148 · Closes #149 · Closes #156 · Closes #153 · Closes #154 · Closes #220

**Contexto.** 6 fichas agrupadas por zona de código. Hacelas en el orden de la lista.

### BK-ACC-01 · Terminal de acceso sin flujo de salida (todo se registra como ENTRY) y salida bloqueada por membresía vencida
_Prioridad P0 · Tamaño M · Estado en código: roto · Depende de: — · Issue #148 · Ficha: `docs/backlog/items/BK-ACC-01-terminal-registrar-salida.md`_

**Contexto:** El backend soporta `access_type = 'EXIT'`, pero la pantalla `AccesoTerminalPage` manda siempre `'ENTRY'` (hardcodeado) y no ofrece ningún control de "Registrar salida". Resultado: desde la UI el aforo solo sube (nunca baja) y el monitor de aforo, los dashboards y el reporte de permanencia quedan inflados. Además, si se enviara una salida de un socio con membresía vencida, el backend la **deniega** (valida membresía también en EXIT), dejando al socio "adentro" para siempre.

**Qué hacer:**
- Selector de modo en el terminal: "Entrada" / "Salida" (segmented control) que se aplica tanto al escaneo QR como al DNI manual.
- Que `ValidationResult` muestre "Salida registrada" / "Entrada registrada" según `log.access_type` (hoy el rótulo "Tipo de Ingreso" es fijo, `ValidationResult.jsx:80`).
- Regla de backend: en `EXIT` **no** se exige membresía activa (sí se exige token válido/anti-replay y que el usuario exista). Un socio con membresía vencida o suspendido que está adentro debe poder salir.
- Tests de ambos lados.

**Archivos:**
- `backend/apps/access/services.py` — nueva `evaluate_access(user, access_type)`.
- `backend/apps/access/views.py` — usar `evaluate_access` en `ScanQRView` y `ManualAccessView`.
- `backend/apps/access/tests/test_manual_access.py` y `test_qr_utils.py` — casos nuevos.
- `frontend/src/components/recepcion/AccessTypeToggle.jsx` (+ `.test.jsx`) — nuevo.
- `frontend/src/pages/recepcion/AccesoTerminalPage.jsx` — estado `accessType`, pasarlo a `scanQR`/`manualAccess`.
- `frontend/src/components/recepcion/ValidationResult.jsx` — rótulos por tipo de movimiento.
- `frontend/src/pages/recepcion/__tests__/AccesoTerminal.test.jsx` — nuevos casos.

**Tests primero:**
**Convención backend:** pytest + pytest-django, config `backend/pytest.ini` (`DJANGO_SETTINGS_MODULE=core.settings.test`, cobertura mínima 80 %). Los tests de `apps/access/tests/` usan `APITestCase`/`TestCase` y las factories de `backend/conftest.py` (`make_user_factory`, `make_socio_factory`, `make_plan_factory`, `make_membresia_factory`); también hay fixtures pytest (`make_user`, `make_socio`, `auth_client`). Correr: `cd backend && pytest apps/access -q`. El Celery corre en modo eager en tests; el modelo Mongo se mockea con `@patch('apps.access.tasks.log_qr_event')` (patrón en `test_qr_utils.py:105-107`).

Primero escribir (rojo):
1. `test_manual_exit_with_expired_membership_is_granted`: socio con membresía `fecha_fin` vencida, POST `/api/access/manual/` `{dni, access_type:'EXIT'}` → 200, `status=GRANTED`, `AccessLog.access_type == 'EXIT'`.
2. `test_manual_exit_suspended_user_is_granted` (usuario `is_active=False` con EXIT) → 200.
3. `test_manual_entry_expired_still_denied` (regresión): ENTRY con membresía vencida → 403 `MEMBERSHIP_INACTIVE`.
4. `test_scan_exit_token_expired_denied`: EXIT con token expirado → 403 `TOKEN_EXPIRED` (la salida sigue exigiendo token válido).
5. `test_exit_unknown_dni_denied` → 403 `UNKNOWN_USER`.
6. `test_aforo_decrements_on_exit`: ENTRY + EXIT GRANTED → `compute_aforo_actual()['aforo_actual'] == 0`.

**Convención frontend:** Vitest + React Testing Library (`frontend/package.json:11` `vitest run`; CI: `npx vitest run --coverage`, umbral 68 % en 

### BK-ACC-02 · Anti-passback (doble entrada / salida sin entrada) y estado "Atención" en el terminal
_Prioridad P1 · Tamaño M · Estado en código: ui-parcial · Depende de: BK-ACC-01 · Issue #149 · Ficha: `docs/backlog/items/BK-ACC-02-anti-passback-y-estado-atencion.md`_

**Contexto:** Hoy el backend acepta cualquier secuencia de movimientos: dos `ENTRY` seguidos del mismo socio (con dos QR distintos o por DNI), o un `EXIT` sin `ENTRY`. Cada ENTRY duplicado suma al aforo y a `asistencias_mes`. La UI ya tiene un tercer estado visual "Atención" (`warning`) en `ValidationResult`, pero la página nunca lo emite (solo `success`/`error`). Esta ficha agrega la regla de presencia ("¿está adentro?") y usa ese estado.

**Qué hacer:**
- Función de presencia: "último movimiento GRANTED del usuario en el día local" → `inside` / `outside`.
- Regla ENTRY con presencia `inside` → respuesta de "Atención" (ya figura adentro) con acción explícita de recepción "Registrar igual" (override auditado).
- Regla EXIT con presencia `outside` → "Atención" (no figura adentro) pero se permite registrar.
- Mensaje claro cuando se re-escanea un QR ya consumido hace pocos segundos (hoy es un `REPLAY_ATTACK` rojo; se trata como advertencia "Ya registrado hace N s").
- Completar `DENIAL_REASONS` del front.

**Archivos:**
- `backend/apps/access/models.py` (+ migración `0004`) — `source`, nuevos `DenialReason`.
- `backend/apps/access/services.py` — `get_presence(user) -> 'inside'|'outside'` y `evaluate_antipassback(...)`.
- `backend/apps/access/views.py`, `serializers.py` — `override`, `warning`.
- `backend/core/settings/base.py` — `ACCESS_ANTIPASSBACK_MODE = config('ACCESS_ANTIPASSBACK_MODE', default='block')`.
- `backend/apps/access/tests/test_antipassback.py` — nuevo.
- `frontend/src/pages/recepcion/AccesoTerminalPage.jsx`, `components/recepcion/ValidationResult.jsx`, `services/accessService.js` y sus tests.

**Tests primero:**
Convenciones: igual que BK-ACC-01 (`pytest apps/access -q`, `APITestCase`, factories de `backend/conftest.py`, `@patch('apps.access.tasks.log_qr_event')`; frontend `npx vitest run`, mocks del `AccesoTerminal.test.jsx`).
Backend (rojo primero):
1. ENTRY → ENTRY mismo socio (2 tokens distintos) → 2º `403 ALREADY_INSIDE`, 2 logs, aforo = 1.
2. ENTRY → EXIT → ENTRY → 3º `200` (presencia volvió a `outside`).
3. ENTRY duplicado con `override=true` → `200`, se crean EXIT sintético (`source='OVERRIDE'`) + ENTRY, aforo = 1.
4. EXIT sin ENTRY → `200` con `warning == 'NOT_INSIDE'`.
5. Modo `off` (`@override_settings(ACCESS_ANTIPASSBACK_MODE='off')`) conserva el comportamiento viejo.
6. Presencia ignora logs del día anterior (no hay `freezegun` en `backend/requirements/`; crear los logs y retrocederles el `timestamp` con `AccessLog.objects.filter(...).update(timestamp=...)`, porque es `auto_now_add`).
7. Re-escaneo del mismo QR a los 10 s → `403 REPLAY_ATTACK` con mensaje "Ya registrado hace…".
8. Roles: socio → 403 al endpoint (`IsReceptionistOrAdmin`).
Frontend: `warning` se pinta ámbar; botón "Registrar igual" llama a `manualAccess(dni,'ENTRY',{override:true})`; `DENIAL_REASONS` cubre todos los valores de `AccessLog.DenialReason`.
Manual: con `recepcion@winnie.local` validar dos veces el DNI del socio demo activo.

### BK-ACC-09 · Terminal de acceso — robustez (cámara, red, DNI), feedback sonoro/háptico y accesibilidad
_Prioridad P1 · Tamaño M · Estado en código: ui-parcial · Depende de: BK-ACC-01 · Issue #156 · Ficha: `docs/backlog/items/BK-ACC-09-terminal-robustez-y-accesibilidad.md`_

**Contexto:** El terminal funciona en el camino feliz pero falla de forma poco clara cuando la cámara se deniega, la red se cuelga o el DNI está mal tipeado, destruye y recrea la cámara después de cada escaneo, no da feedback sonoro diferenciado entre permitido/denegado y no avisa a lectores de pantalla. Hay además un bug de temporizadores que borra resultados nuevos antes de tiempo.

**Qué hacer:**
(a) mensajes de cámara por `error.kind` + botón "Reintentar cámara"; (b) `paused` en vez de desmontar; (c) `formats={['qr_code']}`, `constraints={{ facingMode: 'environment' }}`, linterna; (d) timeout y mensaje de "Sin conexión" + indicador de estado de conexión; (e) formulario de DNI con Enter, `inputMode`, normalización y validación 7-8 dígitos; (f) beeps distintos (Web Audio) y vibración según resultado, silenciables; (g) `aria-live` y foco; (h) arreglar el temporizador; (i) debounce por token.

**Archivos:**
`frontend/src/components/recepcion/ScannerPanel.jsx`, `pages/recepcion/AccesoTerminalPage.jsx`, `components/recepcion/ValidationResult.jsx`, `services/accessService.js` (timeout), `hooks/useOnlineStatus.js` (nuevo), `utils/feedback.js` (nuevo) y sus tests (`ScannerPanel.test.jsx` nuevo, ampliar `AccesoTerminal.test.jsx`).

**Tests primero:**
Convención: Vitest + RTL, mocks como en `__tests__/AccesoTerminal.test.jsx:1-34` (el mock de `Scanner` debe exponer `onError`/`onScan` para dispararlos desde el test, p. ej. `Scanner: ({ onError, onScan }) => <button onClick={() => onError({ kind: 'permission-denied' })}>err</button>`). Comando: `cd frontend && npx vitest run src/pages/recepcion src/components/recepcion && npm run lint`.
1. `onError({kind:'permission-denied'})` → texto de permisos y botón "Reintentar cámara" que limpia el error y vuelve a modo cámara; `kind:'no-camera'` → copy de no cámara.
2. `Scanner` recibe `paused={true}` mientras se procesa y **sigue montado** (el mock recibe la prop).
3. `manualAccess` rechaza con `{ code: 'ECONNABORTED' }` → banner "No hay conexión…" y **no** `ValidationResult` rojo ni consumo de DNI (campo conserva el valor).
4. DNI: Enter envía; "30.111.222" se normaliza a `30111222`; "123" muestra error inline y no llama al servicio.
5. Timer: dos resultados seguidos (`vi.useFakeTimers`) — el segundo permanece 8 s completos.
6. Debounce por token: dos tokens distintos en < 5 s se procesan ambos; el mismo token una sola vez.
7. `feedback.playTone` se llama con `'success'`/`'denied'` según el resultado (mock de `AudioContext`/`navigator.vibrate`).
8. `ValidationResult` tiene `role="status"`; `aria-live` cambia a `assertive` en error.
Backend: sin tests nuevos (salvo `health` si se usa).
Manual: Chrome → bloquear cámara en el candado; DevTools → Network → Offline/Slow 3G; escanear dos 

### BK-ACC-06 · Aforo máximo efectivo — alertas de umbral y bloqueo opcional de ingresos al llegar a capacidad
_Prioridad P1 · Tamaño L · Estado en código: ui-parcial · Depende de: BK-ACC-05, BK-ACC-01 · Issue #153 · Ficha: `docs/backlog/items/BK-ACC-06-aforo-maximo-bloqueo-y-alertas.md`_

**Contexto:** `GymConfig.aforo_maximo` existe, se edita desde Configuración y se usa **solo para dibujar** barras/anillos en el frontend. El backend nunca lo lee: no hay alerta al acercarse al tope ni forma de impedir ingresos cuando el gimnasio está lleno. Los colores de umbral están además duplicados e inconsistentes (70/90 % en un componente, 85 % en otro).

**Qué hacer:**
validación de `aforo_maximo`; dos campos de configuración nuevos (umbral de alerta %, bloqueo al llegar al máximo); motivo de denegación `AFORO_FULL`; mensaje WS `aforo.alert`; aviso en Monitor, Terminal y toast; (opcional) email a administradores; unificación de umbrales en el frontend.

**Archivos:**
Backend: `apps/common/{models,serializers}.py` + migración; `apps/access/{models,services,ws_signals,consumers,views}.py` + migración; `apps/common/tasks.py`/template (opcional); tests `apps/common/tests/test_gym_config.py`, `apps/access/tests/test_aforo_alert.py` (nuevo), `test_aforo_websocket.py` (ampliar).
Frontend: `AdminConfiguracionPage.jsx`, `hooks/useAforoAlert.js` (+test), `utils/aforo.js` (+test), `AforoCard.jsx`, `OccupancyCard.jsx`, `AforoMonitorPage.jsx`, `AccesoTerminalPage.jsx`, `ValidationResult.jsx`.

**Tests primero:**
Backend (pytest; los tests WS usan `pytest.mark.django_db(transaction=True)` + `pytest.mark.asyncio` + `WebsocketCommunicator(application, '/ws/aforo/?token=...')`, ver `apps/access/tests/test_aforo_websocket.py:1-36,78-103`):
1. PATCH `aforo_maximo=0` → 400; `aforo_alerta_pct=101` → 400; no-admin → 403 (ya cubierto en `test_gym_config.py`).
2. Con `aforo_maximo=2`, `aforo_bloqueo_activo=True`, dos entradas GRANTED → la 3ª ENTRY por DNI es `403 AFORO_FULL`; un EXIT sigue permitido; con bloqueo apagado la 3ª es 200.
3. WS: al cruzar de 89 % a 90 % llega un `aforo.alert` `nivel='warning'` (y solo uno si entran más personas sin cambiar de nivel); al llegar a 100 % `nivel='full'`; bajando de 85 % `nivel='ok'`.
4. (opcional) email encolado una vez por cooldown (`mail.outbox` con `EMAIL_BACKEND` locmem en `core/settings/test.py`).
Frontend (Vitest): `getAforoLevel` (tabla de casos); `useAforoAlert` dispara un toast por cambio de nivel (mock de `sonner`); `AdminConfiguracionPage` valida 1-100 y muestra el error del servidor; `OccupancyCard`/`AforoCard` usan el mismo nivel; el terminal muestra el banner y el motivo `AFORO_FULL`.
Manual: configurar aforo 3 / umbral 66 % / bloqueo ON en `/admin/configuracion` (cuenta `admin@winnie.local`), registrar 3 ingresos con DNIs demo y ver aviso y rechazo.

### BK-ACC-07 · Corregir aforo desfasado — lista de presentes, salida manual y cierre automático de día
_Prioridad P1 · Tamaño L · Estado en código: no-existe · Depende de: BK-ACC-01, BK-ACC-02 · Issue #154 · Ficha: `docs/backlog/items/BK-ACC-07-aforo-desfasado-presentes-y-cierre-de-dia.md`_

**Contexto:** El aforo se calcula como `ENTRY − EXIT` de los movimientos GRANTED **del día local**. Cada salida que no se registra (socio que se va sin escanear, salida denegada por membresía vencida, entrada duplicada) deja el aforo inflado hasta la medianoche, y no existe ninguna herramienta para corregirlo: ni lista de "quién está adentro", ni salida manual, ni cierre al cerrar el gimnasio.

**Qué hacer:**
endpoint de presentes; salida manual individual y masiva (con auditoría); tarea de cierre automático del día; panel "Presentes ahora" en el Monitor de Aforo; marca `source` de los logs correctivos.

**Archivos:**
Backend: `apps/access/{models,services,views,urls,tasks,serializers}.py`, migraciones (modelo + seed beat `access/migrations/0005_seed_autoclose_schedule.py`), `core/settings/base.py` (`ACCESS_AUTOCLOSE_GRACE_MINUTES`), tests `apps/access/tests/test_presentes.py` y `test_auto_close.py`.
Frontend: `components/recepcion/PresentesPanel.jsx` (+test), `hooks/queries/useAccessPresentes.js` (+test), `services/accessService.js`, `pages/recepcion/AforoMonitorPage.jsx` (+ `AforoMonitorPage.test.jsx`).

**Tests primero:**
Backend (pytest, `APITestCase`; para tareas llamar directamente `auto_close_day()` — Celery corre eager en tests, `core/settings/test.py`; para fijar la hora usar `unittest.mock.patch('django.utils.timezone.now')`, no hay `freezegun` en `requirements/`):
1. `GET /presentes/`: A entra, B entra y sale, C entra → `[A, C]`; entradas de ayer no aparecen.
2. Roles: socio 403, anónimo 401; `cerrar/` con recepcionista → 403 (solo admin).
3. `POST /presentes/<id>/salida/` crea EXIT GRANTED con `source='MANUAL_CORRECTION'`, `scanned_by` correcto y baja `compute_aforo_actual`; usuario que no está adentro → 404.
4. `cerrar/` sin `confirmar` → 400; con `confirmar` cierra a todos y el aforo queda en 0.
5. `auto_close_day`: antes de `hora_cierre + gracia` no hace nada; después cierra, deja `timestamp == hora_cierre` y `source='AUTO_CLOSE'`; segunda corrida cerrada → `cerrados == 0` (idempotente).
6. WS: la salida manual emite `aforo.update` (patrón `test_aforo_websocket.py:78-103`).
Frontend (Vitest/RTL; mock de `../../services/api` o de los hooks): render skeleton/vacío/lista; clic en "Registrar salida" llama a la mutation y muestra el toast; "Cerrar día" abre el modal y solo existe para administrador; error → toast.
Manual: con `admin@winnie.local` registrar 2 ingresos por DNI desde el terminal, abrir el Monitor, sacar a uno desde "Presentes ahora" y confirmar que el aforo baja a 1 en otra pestaña (WS).

### BK-PLT-14 · La configuración de aforo máximo y horarios no se aplica en el backend (solo se muestra)
_Prioridad P2 · Tamaño M · Estado en código: ui-parcial · Depende de: BK-ACC-06 · Issue #220 · Ficha: `docs/backlog/items/BK-PLT-14-config-aforo-y-horarios-no-se-aplican.md`_

**Contexto:** `AdminConfiguracionPage` permite editar `aforo_maximo`, `hora_apertura` y `hora_cierre` y se guardan en `GymConfig`, pero ninguna regla del backend los usa: el escaneo de QR y el acceso manual no rechazan por aforo completo ni por fuera de horario. El único uso real de `aforo_maximo` es mostrar la barra de ocupación en el frontend. El admin cree que está configurando un límite que no existe.

**Qué hacer:**
**Coordinación:** el bloqueo/alertas por aforo lo detalla BK-ACC-06 (área ACC); implementar UNA sola vez. Esta ficha es dueña de la regla de HORARIO (`FUERA_DE_HORARIO`) y de las validaciones del serializer; el punto de `AFORO_COMPLETO` se documenta acá solo para dejar consistentes los códigos de rechazo.
**Incluye (decisión por defecto a confirmar):** en `ScanQRView` y `ManualAccessView` (`access/views.py:~156`), para accesos de tipo entrada: denegar con `denial_reason='AFORO_COMPLETO'` si `aforo_actual >= aforo_maximo`, y con `'FUERA_DE_HORARIO'` si la hora local (`America/Argentina/Buenos_Aires`, `TIME_ZONE`, `base.py:121`) está fuera de `[hora_apertura, hora_cierre]` (considerar cierre pasado medianoche); mostrar los nuevos motivos en la UI de acceso; aclaración en la página de configuración ("El aforo máximo bloquea nuevas entradas").

**Archivos:**
- Modificar `backend/apps/access/services.py` (nueva función `check_gym_open_and_capacity(now)` que lee `GymConfig.get()` y `get_aforo_actual()`), `backend/apps/access/views.py` (ambas vistas), `backend/apps/common/serializers.py` (validaciones), tests.
- Frontend: `components/recepcion/ValidationResult.jsx` (mapeo de motivos), `AdminConfiguracionPage.jsx` (textos de ayuda); test del mapeo. Backend: `apps/access/models.py` (`DenialReason`) + migración.

**Tests primero:**
Backend (pytest + `APITestCase`, factories de `backend/conftest.py`; ver tests de access en `backend/apps/access/tests/`): fijar la hora con `unittest.mock.patch` sobre `django.utils.timezone.now` (`freezegun` no está en `backend/requirements/`: verificado).
- Entrada con aforo = máximo → 403 `AFORO_COMPLETO` y `AccessLog` DENIED registrado.
- Entrada a las 06:59 con apertura 07:00 → 403 `FUERA_DE_HORARIO`; a las 07:00 → 200.
- Cierre pasada medianoche (apertura 20:00, cierre 02:00) funciona.
- Salida (`access_type` de salida) nunca se bloquea por aforo.
- `PATCH` con `aforo_maximo=0` → 400.
Frontend (Vitest): el mapeo de motivos devuelve el texto en voseo.
Manual: bajar `aforo_maximo` a 1 en `/configuracion` con admin, ingresar dos socios por la terminal.
Comandos: `cd backend && pytest apps/access apps/common -q`; `cd frontend && npx vitest run`.

## B5 — Reportes, morosidad y pagos globales · Franco · ~17.5 días · rama `feat/reportes-morosidad`

**Commit (squash):** `feat(reports): real metrics, delinquency criteria and global payments screen`

**En la descripción del PR:** Closes #185 · Closes #183 · Closes #184 · Closes #186 · Closes #225

**Contexto.** 5 fichas agrupadas por zona de código. Hacelas en el orden de la lista.

### BK-FIN-03 · Morosidad y vencimientos - criterio correcto de "moroso", alertas del dashboard y recordatorios automáticos
_Prioridad P1 · Tamaño L · Estado en código: ui-parcial · Depende de: BK-FIN-05 · Issue #185 · Ficha: `docs/backlog/items/BK-FIN-03-morosidad-calculo-alertas-recordatorios.md`_

**Contexto:** El reporte de morosidad lista como "moroso" a todo socio que alguna vez tuvo una membresía vencida, aunque ya la haya renovado; el dashboard muestra "Desconocido" en las alertas; el job diario solo actúa el día exacto del vencimiento (si falla un día, la membresía queda `activa` vencida) y no hay recordatorios posteriores al vencimiento. Hay que definir un único criterio de morosidad, corregir el cálculo y completar el ciclo de avisos.

**Qué hacer:**
- Definición única y selector compartido `socios_morosos_queryset` (último estado del socio, no filas históricas).
- Endpoint JSON paginado de morosos para la UI (`GET /api/memberships/morosos/`) y reutilización en el exporte `/reportes/morosidad/`.
- Corregir las alertas del dashboard (nombre real, solo morosos actuales, cantidad real).
- Job de barrido `expire_overdue_memberships` (todas las `activa` con `fecha_fin < hoy`) y recordatorios de mora (+1, +7, +15 días; configurables) con plantilla propia y link a `/socio/checkout`.
- Asunto correcto para el aviso del día de vencimiento; link directo a checkout en los emails.
- En la credencial del socio: mostrar fecha de vencimiento y botón "Renovar ahora" (detalle de pago en BK-FIN-07/08).

**Archivos:**
- `backend/apps/memberships/services.py`: `socios_morosos_queryset`.
- `backend/apps/memberships/views.py` + `urls.py`: `MorososView` (`ListAPIView`, `pagination` global) y `serializers.py`: `MorosoSerializer`.
- `backend/apps/reports/services.py`: `build_morosidad` usa el selector.
- `backend/apps/memberships/tasks.py`: `expire_overdue_memberships`, `send_overdue_reminders`; corregir asunto para `delta=0`.
- `backend/apps/memberships/migrations/0006_seed_overdue_schedules.py` (numeración: la última existente es `0005_add_es_popular.py`).
- Plantillas de email (`overdue_notice.*`) y link `{{ frontend_url }}/socio/checkout` en `expiration_alert.*`.
- Frontend: `useMembresias.js`, `useDashboardData.js`, `AdminDashboardView.jsx`, `MorosidadCard.jsx`/`ReportesPage.jsx`, `MembershipExpiredAlert.jsx`, `CobroManualPage.jsx` (preselección por query).
- Tests: `backend/apps/memberships/tests/test_morosos_view.py`, `test_overdue_tasks.py`; `backend/apps/reports/tests/test_reports_endpoints.py`; frontend `useMembresias.test.jsx`, `AdminDashboardView` tests (**No verificado** el nombre exacto del test existente; ubicarlo con `fd AdminDashboard frontend/src`).

**Tests primero:**
**Backend** (`cd backend && pytest -q apps/memberships/tests apps/reports/tests`; ver `test_expiration_task.py` como molde: `TestCase` + `override_settings(EMAIL_BACKEND=locmem, CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True)`, `mail.outbox`; factories `conftest.py:23-75`):
1. Socio con membresía vencida y otra `activa` posterior **no** aparece en morosos ni en el exporte (regresión del bug principal).
2. Socio `baja` o `suspendido` no aparece.
3. `activa` con `fecha_fin = hoy - 3` (job caído): `expire_overdue_memberships` la pasa a `vencida` y no envía "por vencer".
4. `send_overdue_reminders`: a +1/+7/+15 manda un mail cada uno, no repite (`avisos_enviados`), no manda si el socio renovó.
5. `GET /api/memberships/morosos/`: paginación, filtros `plan_id`/`search`, orden por `dias_atraso`, `403` socio, `401` anónimo.
6. Asunto del aviso `delta=0` contiene "venció".
**Frontend** (`npx vitest run`): alertas del dashboard muestran el nombre y los días; `MembershipExpiredAlert` renderiza botón "Renovar ahora" con `href`/navegación a `/socio/checkout`; tabla de morosos: loading, vacío, error, acción "Cobrar".
**Manual:** `socio.vencido@winnie.local` (seed) debe aparecer; renovar con cobro manual desde `/recepcion/cobros` y verificar que desaparece de la lista.

### BK-FIN-01 · Reportes - las métricas de la pantalla salen de datos truncados y de un gráfico fijo
_Prioridad P0 · Tamaño L · Estado en código: roto · Depende de: BK-FIN-03, BK-FIN-05 · Issue #183 · Ficha: `docs/backlog/items/BK-FIN-01-reportes-metricas-reales.md`_

**Contexto:** `ReportesPage` calcula sus tarjetas (Evolución de ingresos, Morosidad, Membresías activas, Asistencia semanal) en el navegador, a partir de listados paginados que el backend corta en 10 filas, y con el campo `plan` que el serializer devuelve como id (no como objeto). Resultado: los números son parciales o en cero y el gráfico de ingresos es una línea fija. Hay que reemplazarlo por un endpoint de resumen calculado en el servidor. Es P0 porque la pantalla muestra cifras financieras incorrectas sin avisar.

**Qué hacer:**
- Endpoint `GET /api/reportes/resumen/` con ingresos del mes actual, mes anterior, variación y serie de los últimos N meses; morosos (cantidad, monto, tasa); membresías (activas, por vencer en 7 días, nuevas del mes); asistencia por día de la semana.
- Reemplazar `useReportMetrics` por una única llamada y construir el gráfico con la serie real (SVG propio, sin sumar dependencias).
- Estado de error visible con botón "Reintentar" (sin `catch` silenciado).
- Que los filtros de rango (`mes`) y `plan_id` afecten también a las tarjetas.

**Archivos:**
- `backend/apps/reports/services.py`: `build_resumen(meses, plan_id)` (función pura, usa `Pago`, `Membresia`, `AccessLog`).
- `backend/apps/reports/views.py`: `ResumenReportView` (`APIView`, `permission_classes=[IsReceptionistOrAdmin]`).
- `backend/apps/reports/urls.py`: `path('resumen/', ResumenReportView.as_view(), name='resumen')`.
- `backend/apps/reports/serializers.py`: `ResumenSerializer` (+ validación de query con un `Serializer`).
- `backend/apps/reports/tests/test_resumen_endpoint.py` (nuevo).
- `frontend/src/hooks/queries/useReportes.js` + `useReportes.test.jsx` (existe: actualizar).
- `frontend/src/utils/sparkline.js` + test.
- `frontend/src/components/recepcion/EvolucionIngresosCard.jsx`, `frontend/src/pages/recepcion/ReportesPage.jsx` (+ sus tests `__tests__/ReportesPage.test.jsx`, `ReportesPage.handlers.test.jsx`).

**Tests primero:**
**Backend** (`cd backend && pytest -q apps/reports/tests/test_resumen_endpoint.py`; pytest.ini usa `core.settings.test` y `--cov-fail-under=80`; estilo `APITestCase` + `RefreshToken.for_user(user).access_token` en `HTTP_AUTHORIZATION`, ver `backend/apps/reports/tests/test_reports_endpoints.py`; factories `make_user_factory`, `make_socio_factory`, `make_plan_factory`, `make_membresia_factory` de `backend/conftest.py:23-75`):
1. Con 12 pagos aprobados en el mes actual (más de una página) `ingresos.mes_actual` es la suma exacta (regresión del límite de 10 filas).
2. Pagos `pendiente`, `rechazado`, `cancelado`, `reembolsado` no suman.
3. Pago aprobado con `paid_at` el último segundo del mes anterior (hora ART) no suma al actual (borde de zona horaria).
4. `variacion_pct` es `null` si el mes anterior es 0.
5. Morosidad: 2 socios con membresía vencida sin renovación suman `monto_adeudado = precio del plan`; un socio renovado no cuenta.
6. `meses=0`, `meses=abc`, `plan_id=x` -> `400`.
7. Rol `socio` -> `403`; sin token -> `401`.

**Frontend** (`cd frontend && npx vitest run src/hooks/queries/useReportes.test.jsx src/pages/recepcion/__tests__/ReportesPage.test.jsx`; helpers `renderWithProviders`/`renderHookWithProviders` de `frontend/src/test/test-utils.jsx`; mocks `vi.mock('../../services/api')` como en `usePagos.test.jsx:12-24`):
1. `useReportMetrics` llama a `/reportes/resumen/` con los params y mapea la respuesta a las props de las tarjetas.
2. Error 500 -> la página muestra "No 

### BK-FIN-02 · Exportes de reportes - validar parámetros, rangos de fechas, filtro por plan, totales y columnas numéricas
_Prioridad P1 · Tamaño M · Estado en código: ui-parcial · Depende de: BK-FIN-01 · Issue #184 · Ficha: `docs/backlog/items/BK-FIN-02-reportes-exportes-validacion-rangos-totales.md`_

**Contexto:** Los exportes CSV/XLSX/PDF de morosidad, facturación y asistencia existen y están cableados al frontend, pero: un `formato` o `mes` inválido produce un `500`; facturación solo admite un mes completo (los presets de rango de la UI no tienen efecto); no se puede filtrar por plan, estado ni socio; no hay fila de totales; y los importes salen como texto, por lo que en Excel no se pueden sumar.

**Qué hacer:**
- Validación de query params con `400` y mensajes en español (`formato`, `mes`, `fecha_desde`, `fecha_hasta`, `plan_id`, `metodo`, `estado`).
- Facturación por rango `fecha_desde`/`fecha_hasta` (tiene prioridad sobre `mes`), filtro `plan_id` y `estado` (lista, default `aprobado`).
- Columnas de importe numéricas en XLSX y CSV con punto decimal; fila "TOTAL" al final de facturación (y de morosidad: total adeudado).
- Encabezado del PDF con rango/filtros aplicados y fecha de generación.
- Frontend: enviar el rango y el plan; habilitar selector de rango en facturación.

**Archivos:**
- `backend/apps/reports/serializers.py`: serializers de query (`FacturacionQuerySerializer`, `MorosidadQuerySerializer`, `AsistenciaQuerySerializer`).
- `backend/apps/reports/views.py`: usar los serializers antes de llamar a `build_*`.
- `backend/apps/reports/services.py`: `build_facturacion(mes, metodo, fecha_desde, fecha_hasta, plan_id, estados)`; importes como `Decimal` y fila `TOTAL`.
- `backend/apps/reports/exporters.py`: tipos numéricos en XLSX (`cell.number_format = '#,##0.00'`), CSV con `Decimal` en texto plano, encabezado con filtros en PDF.
- `backend/apps/reports/tests/test_reports_endpoints.py` + nuevo `test_reports_validation.py`.
- `frontend/src/services/reportsService.js` (+ `__tests__/reportsService.test.js`), `frontend/src/components/recepcion/ReportFilters.jsx`, `frontend/src/pages/recepcion/ReportesPage.jsx` (+ tests existentes en `__tests__/`).

**Tests primero:**
**Backend** (`cd backend && pytest -q apps/reports/tests/`; patrón `APITestCase` + `_auth` de `test_reports_endpoints.py:15-17`; factories `conftest.py:23-75`):
1. `GET .../facturacion/?formato=docx` -> `400` con clave `formato`.
2. `?mes=2026-13`, `?mes=abc` -> `400` con clave `mes`.
3. `?fecha_desde=2026-10-10&fecha_hasta=2026-10-01` -> `400`.
4. Rango: pagos el 09/10 23:59 ART y 10/10 00:00 ART; exportar `10/10` incluye solo el segundo.
5. `plan_id` filtra; `estado=aprobado&estado=reembolsado` incluye ambos.
6. XLSX: abrir con `openpyxl.load_workbook` y comprobar `isinstance(cell.value, (int, float, Decimal))` en la columna `monto` y que la fila `TOTAL` es la suma.
7. CSV: el `monto` usa punto decimal; BOM se mantiene (`test_csv_bom.py`).
8. Roles: `socio` -> `403`.
**Frontend** (`npx vitest run src/services/__tests__/reportsService.test.js src/pages/recepcion/__tests__/ReportesPage.test.jsx`; mocks de `api` como en `usePagos.test.jsx:12-24`): `exportFacturacion` envía `fecha_desde/fecha_hasta/plan_id`; con `fecha_desde > fecha_hasta` el botón queda deshabilitado; un `400` en blob muestra el `detail` en `toast.error`.
**Manual:** con `admin@winnie.local`, exportar facturación del mes en XLSX y verificar que `SUM` funciona sobre la columna de monto.

### BK-FIN-04 · Pantalla "Pagos y facturación" (listado global con filtros, totales y exporte)
_Prioridad P1 · Tamaño L · Estado en código: backend-sin-ui · Depende de: BK-FIN-05, BK-FIN-02 · Issue #186 · Ficha: `docs/backlog/items/BK-FIN-04-pagos-listado-global-admin.md`_

**Contexto:** El backend ya expone `GET /api/payments/pagos/` (listado global con filtros por estado, método, socio, plan, fechas y monto), pero ninguna pantalla lo usa como listado: solo se consume por socio dentro de la ficha y en la página de cobro manual. Falta una pantalla de administración para auditar todos los cobros, ver totales y exportar, además de pequeños cambios de backend (búsqueda, tamaño de página, totales, N+1).

**Qué hacer:**
- Backend: `select_related`, `search_fields`, paginación con `page_size`, serializer enriquecido (DNI, N° de socio), endpoint de totales con los mismos filtros, filtro de fecha por `paid_at` opcional.
- Pantalla `/admin/pagos` (y alias `/recepcion/pagos`) con filtros, tabla, totales, detalle en modal y exporte reutilizando BK-FIN-02.
- Entrada de menú "Pagos" para administrador y recepcionista.

**Archivos:**
- Backend: `payments/views.py` (queryset con `select_related('socio','plan')`, `search_fields`, `PagoPagination`, action `resumen`), `payments/filters.py` (`paid_desde/hasta`), `payments/serializers.py` (`socio_dni`, `numero_socio`), `payments/tests/test_pagos_list.py` (nuevo).
- Frontend: `pages/admin/AdminPagosPage.jsx` (+ test), `hooks/queries/usePagos.js`, `services/pagosService.js`, `App.jsx`, `components/layout/Sidebar.jsx` (+ `Sidebar` tests si afectan snapshots), `constants/pagos.js` (mapa de estados, ver BK-FIN-05).

**Tests primero:**
**Backend** (`cd backend && pytest -q apps/payments/tests/test_pagos_list.py`; `APITestCase` + `_auth` como `apps/payments/tests/test_cobro_manual.py:14-16`; crear `Pago` directos como `test_webhook.py:42-48`):
1. Recepcionista y admin listan; `socio` -> `403`; anónimo -> `401`.
2. Cada filtro (`estado`, `metodo`, `socio`, `plan`, `fecha_desde/hasta`, `monto_min/max`) devuelve solo lo esperado.
3. `search` por apellido, DNI y `mp_payment_id`.
4. `page_size=5` devuelve 5 y `count` total; `page_size=1000` se limita a 100.
5. `resumen` con mismos filtros: sumas por estado y método correctas; pagos `pendiente` no suman en `total_aprobado`.
6. Número de queries del listado constante (usar `assertNumQueries` o `django_assert_max_num_queries`) para evitar N+1.
**Frontend** (`npx vitest run src/pages/admin/AdminPagosPage.test.jsx src/hooks/queries/usePagos.test.jsx`): render con datos, estado vacío, error, cambio de filtro dispara request con params, paginación, modal de detalle, badges de los 5 estados con colores distintos, rol recepcionista ve la ruta y `socio` es redirigido (`ProtectedRoute`).
**Manual:** `recepcion@winnie.local` y `admin@winnie.local` abren `/admin/pagos`; hacer un cobro manual y ver la fila aparecer.

### BK-SOC-03 · La pestaña "Pagos" del detalle de socio lista los pagos de TODOS los socios (filtro `socio_id` inexistente)
_Prioridad P0 · Tamaño S · Estado en código: roto · Depende de: BK-FIN-01 · Issue #225 · Ficha: `docs/backlog/items/BK-SOC-03-detalle-socio-pagos-de-otros-socios.md`_

**Contexto:** `SocioDetailModal` pide `GET /api/payments/pagos/?socio_id=<id>`, pero el `PagoFilter` solo conoce el parámetro `socio`. `django-filter` ignora los parámetros desconocidos, así que el backend devuelve **la primera página de todos los pagos del sistema** (más recientes primero). Staff ve pagos (montos, planes, métodos) atribuidos al socio equivocado: error funcional y fuga de datos entre socios. La spec y el test lo "bendijeron" con el nombre equivocado.

**Qué hacer:**
corregir el parámetro a `socio`; aceptar además `socio_id` como alias en el backend (defensa; ver §5); test de backend que garantice el aislamiento; paginación/"ver más" en la pestaña; test frontend actualizado.

**Archivos:**
- `backend/apps/payments/filters.py` — alias `socio_id` (opcional, defensa).
- `backend/apps/payments/tests/test_pagos_list.py` (nuevo) — aislamiento por socio.
- `frontend/src/hooks/queries/usePagos.js` — `params: { socio }` (+ paginación).
- `frontend/src/hooks/queries/usePagos.test.jsx` — corregir la aserción de la línea 40.
- `frontend/src/components/admin/SocioDetailModal.jsx` (+ `.test.jsx`) — error state, método legible, "Ver más".
- Corregir `speckit/spec.md` REQ-3.5 (documentación).

**Tests primero:**
**Backend** (nuevo `test_pagos_list.py`, `APITestCase` + `make_user_factory`, `make_socio_factory`, `make_plan_factory`, creación directa de `Pago` como en `test_mis_pagos.py:23`):
- `test_list_filtra_por_socio`: 2 socios con pagos; `GET /api/payments/pagos/?socio=<A>` ⇒ solo pagos de A.
- `test_list_socio_id_alias` (si se agrega el alias): `?socio_id=<A>` ⇒ solo A.
- `test_list_sin_filtro_devuelve_todos_para_staff` y `test_list_rol_socio_403`.
Comando: `cd backend && pytest -q apps/payments/tests/test_pagos_list.py`.
**Frontend** (`usePagos.test.jsx`, `SocioDetailModal.test.jsx`, Vitest + RTL, `vi.mock('../../hooks/queries/usePagos')` como ya hace el test del modal):
- Hook: `api.get` llamado con `{ params: { socio: 10 } }`.
- Modal: `isError` ⇒ mensaje de error (no "No hay pagos"); `next` presente ⇒ botón "Ver más pagos"; método `mercado_pago` ⇒ "MercadoPago".
Comando: `cd frontend && npx vitest run src/hooks/queries/usePagos.test.jsx src/components/admin/SocioDetailModal.test.jsx`.
**Manual:** admin → `/admin/socios` → abrir dos socios distintos con pagos → la pestaña "Pagos" muestra solo los de cada uno; un socio sin pagos muestra el vacío (hoy mostraría pagos ajenos).

## B6 — Socios: alta, ABM, estados y cuentas · Rodrigo · ~15.5 días · rama `fix/socios-alta-abm-estados`

**Commit (squash):** `fix(members): reception signup, admin CRUD, status enforcement, password and activation flows`

**En la descripción del PR:** Closes #229 · Closes #223 · Closes #161 · Closes #230 · Closes #226 · Closes #233 · Closes #212

**Contexto.** 7 fichas agrupadas por zona de código. Hacelas en el orden de la lista.

### BK-SOC-07 · ABM de socios (admin): email invisible/no editable, sin "Reactivar", DELETE peligroso, validaciones inconsistentes y estados de carga rotos
_Prioridad P1 · Tamaño M · Estado en código: ui-parcial · Depende de: BK-SOC-08 · Issue #229 · Ficha: `docs/backlog/items/BK-SOC-07-abm-admin-socios-contrato-email-reactivar-validaciones.md`_

**Contexto:** El ABM de `/admin/socios` funciona en el camino feliz (listar, buscar, filtrar por estado/certificado, ordenar, crear, editar, dar de baja) pero tiene huecos concretos: el **email** del socio no se devuelve ni se puede corregir; no hay forma explícita de **reactivar** un socio dado de baja (solo editando el select de estado); el endpoint `DELETE` borra en duro y puede devolver 500; las reglas de **DNI/teléfono** difieren en cuatro lugares; y los hooks usan APIs de react-query v4 que en la v5 instalada no existen (los botones nunca se deshabilitan "procesando").

**Qué hacer:**
exponer y permitir corregir `email` (con validación de unicidad y rol); acción `reactivar` (endpoint + botón); inhabilitar `DELETE` físico; unificar validación de DNI/teléfono en un único módulo frontend y en backend; `suspendidos` en stats; buscar por email/teléfono; arreglar `isLoading/keepPreviousData` para v5; columna/Badge de membresía en el listado (usa `?` ver §5); mensajes en español.

**Archivos:**
- `backend/apps/members/{serializers,views,services,filters}.py`, `backend/apps/users/serializers.py` (mensaje DNI), tests nuevos en `backend/apps/members/tests/`.
- `frontend/src/{services/sociosService.js,hooks/queries/useSociosData.js,pages/admin/AdminSociosPage.jsx,components/admin/{SocioFormModal,SocioDetailModal}.jsx,constants/validation.js,pages/{CompleteProfilePage,RegisterPage,ProfilePage}.jsx,pages/recepcion/gestionSocios.schema.js}` y sus tests.

**Tests primero:**
**Backend** (`test_socios_views.py`, `APITestCase`, `make_user_factory`/`make_socio_factory`, helper `_auth_client`): 
- `test_get_devuelve_email`; `test_patch_email_actualiza_user_y_username`; `test_patch_email_de_staff_400`; `test_patch_email_duplicado_400`; `test_patch_email_google_400` (user con `google_id`).
- `test_reactivar_baja_200_limpia_fecha_baja`; `test_reactivar_activo_400`; `test_reactivar_recep_403`; `test_reactivar_sin_auth_401`.
- `test_delete_socio_405` (y no existe borrado en cascada).
- `test_dni_no_numerico_400`, `test_telefono_invalido_400`; `test_stats_incluye_suspendidos`; `test_search_por_email`.
Comando: `cd backend && pytest -q apps/members`.
**Frontend** (`SocioFormModal.test.jsx`, `SocioColumns.test.jsx`, `useSociosData.test.jsx` en `hooks/__tests__/`, nueva `AdminSociosPage.test.jsx`; `vi.mock('../hooks/queries/useSociosData')`): precarga de email; botón Reactivar solo en filas `baja` y llama la mutation; botón "Confirmar Baja" `disabled` mientras `isPending`; DNI inválido muestra el mensaje compartido; `placeholderData` evita el skeleton al cambiar de página (verificar que `isPlaceholderData` mantiene filas).
Comando: `cd frontend && npx vitest run src/components/admin src/hooks src/pages && npm run lint`.
**Manual:** admin (`admin@winnie.local`, seed) → dar de baja a `socio.nuevo@winnie.local` → fila con "Reactivar" → reactivar → estado Activo y `fecha_baja` vacía; editar email y verificar login con el nuevo.

### BK-SOC-01 · El "Alta en Recepción" no puede crear socios (403 para recepcionista, teléfono faltante, plan y cobro de mentira)
_Prioridad P0 · Tamaño L · Estado en código: roto · Depende de: BK-FIN-01 · Issue #223 · Ficha: `docs/backlog/items/BK-SOC-01-alta-recepcion-rota-sin-plan-ni-cobro.md`_

**Contexto:** La pestaña "Alta en Recepción" de `/recepcion/socios` es una maqueta: el recepcionista (rol para el que está pensada) recibe **403** porque `POST /api/members/socios/` es solo-admin; aun siendo admin, el body no incluye `telefono` (campo obligatorio del modelo) y el plan/cuota/cobro/renovación son valores hardcodeados que el backend ignora. Nunca se crea membresía ni cobro, y el texto promete "generar QR y enviarlo al email" (no ocurre). Es el flujo central de la HU03 / US03 del plan de pruebas.

**Qué hacer:**
- Permitir `create` de socio al recepcionista (backend) y test que lo fije.
- Reescribir el formulario de la pestaña "Alta en Recepción" para que envíe el contrato real: `nombre, apellido, dni, telefono, email(opcional), observaciones`.
- Plan elegido desde `GET /api/memberships/planes/` (solo `activo=true`), monto prellenado con `plan.precio` y editable (igual que `CobroManualPage`).
- Secuencia: crear socio → (opcional) subir apto → registrar primer cobro manual con `POST /api/payments/cobros-manuales/` (activa membresía).
- Resumen lateral con datos reales y texto de ayuda veraz.
- Manejo de falla parcial (socio creado pero cobro/apto falló).

**Archivos:**
- `backend/apps/members/views.py` — `create` → `IsReceptionistOrAdmin` (líneas 43-48).
- `backend/apps/members/tests/test_socios_views.py` — nuevos tests (ver §9).
- `frontend/src/pages/recepcion/gestionSocios.schema.js` — schema nuevo.
- `frontend/src/pages/recepcion/GestionSociosPage.jsx` — `onSubmit` secuencial, estado del archivo, errores por campo.
- `frontend/src/components/recepcion/{DatosPersonalesCard,PlanPagoCard,SaludCard,SocioResumenSidebar}.jsx` — ver §7.
- Tests existentes a actualizar: `DatosPersonalesCard.test.jsx`, `PlanPagoCard.test.jsx`, `SaludCard.test.jsx`, `SocioResumenSidebar.test.jsx` (en la misma carpeta) y un nuevo `GestionSociosPage.test.jsx`.

**Tests primero:**
**Convención backend:** `APITestCase` + `make_user_factory`/`make_socio_factory` (`backend/conftest.py:23-46`), helper `_auth_client` por archivo (JWT con `RefreshToken.for_user`). Comando: `cd backend && pytest -q apps/members/tests/test_socios_views.py` (requiere Postgres con la sequence `socio_numero_seq`, Redis y Mongo: en CI vía `services:`; local `docker compose exec backend pytest -q ...`; `pytest.ini` exige 80 % de cobertura solo en la corrida completa).
Casos (escribir primero):
- `test_create_socio_recepcionista_201`: recepcionista crea con `telefono`; 201 y `numero_socio` `S-xxxxx`.
- `test_create_socio_sin_telefono_400`: body sin `telefono` → 400 `{"telefono":[...]}`.
- `test_update_socio_recepcionista_403` y `test_dar_baja_recepcionista_403` (se mantienen admin-only).
- `test_create_socio_dni_duplicado_400`, `test_create_socio_socio_role_403` (ya existe, mantener).
**Convención frontend:** Vitest 4 + RTL + `@testing-library/jest-dom` (`frontend/setupTests.js`), `vi.mock` de hooks/servicios; tests colocados junto al componente. Comando: `cd frontend && npx vitest run src/pages/recepcion src/components/recepcion`; lint: `npm run lint` (CI usa `--max-warnings 0`).
- `GestionSociosPage.test.jsx`: completar formulario válido → se llama `create` con `{nombre,apellido,dni,telefono,email,observaciones}` (sin `plan/cuota/cobro/renovacion`), luego `cobrarManual` con `{socio_id, plan_id, monto}`.
- Con archivo adjunto: se llama `certificado` entre ambos pasos.
- Falla de co

### BK-BUG-02 · "Alta en Recepción" no puede crear socios (falta teléfono, 403 para recepcionista) y muestra campos que no existen
_Prioridad P0 · Tamaño M · Estado en código: roto · Depende de: BK-FIN-01 · Issue #161 · Ficha: `docs/backlog/items/BK-BUG-02-alta-socio-recepcion-falla-y-campos-falsos.md`_

**Contexto:** La pestaña "Alta en Recepción" (`/recepcion/socios`) arma un formulario que (a) nunca envía `telefono`, campo **obligatorio** en `Socio`, por lo que el POST falla con 400; (b) para un recepcionista falla igual con 403 porque `create` es `IsAdminOnly`; y (c) muestra "Fecha nacimiento", "Género", "Vence", plan/cuota/cobro/renovación que no existen en el modelo o no se persisten. Los datos de Plan están fijos en el código ("Premium · $ 12.000/mes").

**Qué hacer:**
corregir el payload (enviar `telefono`, `observaciones`, `email`), validación zod alineada con el serializer, resolver el permiso del recepcionista, quitar/ocultar campos que no existen, subir el apto médico si se adjunta, texto honesto en el resumen.

**Archivos:**
- `frontend/src/pages/recepcion/gestionSocios.schema.js` — schema y defaults reales.
- `frontend/src/pages/recepcion/GestionSociosPage.jsx` — estado del archivo de certificado, subida post-create, payload.
- `frontend/src/components/recepcion/DatosPersonalesCard.jsx`, `PlanPagoCard.jsx`, `SaludCard.jsx`, `SocioResumenSidebar.jsx` — quitar campos falsos / textos.
- `backend/apps/members/views.py` — `get_permissions` (si se aprueba 11.1).
- Tests: `frontend/src/pages/recepcion/GestionSociosPage.test.jsx`, `frontend/src/components/recepcion/DatosPersonalesCard.test.jsx` (existente), `backend/apps/members/tests/` (permisos).

**Tests primero:**
Backend (pytest; `backend/pytest.ini`, fixtures `auth_client`, `make_user`, `make_socio` en `backend/conftest.py`; `cd backend && pytest apps/members -q`):
- `POST /api/members/socios/` como recepcionista con payload completo → 201 (si se aprueba 11.1) o 403 (si no); como administrador → 201 y `numero_socio` con formato `S-NNNNN`.
- Sin `telefono` → 400 con clave `telefono` (documenta el contrato).
- Email de usuario staff → 400; email duplicado → 400.
- `socio` autenticado → 403.
Frontend (vitest + RTL, `renderWithProviders` de `src/test/test-utils.jsx`; `GestionSociosPage.test.jsx` ya existe): llenar nombre/apellido/dni/teléfono/email y enviar → `createSocio` recibe exactamente `{nombre, apellido, dni, telefono, email, observaciones}`; sin teléfono muestra "Teléfono inválido" y no llama al servicio; no hay inputs de fecha de nacimiento/género; con archivo adjunto se llama `uploadCertificado`. `cd frontend && npx vitest run src/pages/recepcion`.
Manual: `recepcion@winnie.local` (seed `seed_demo_users`) → `/recepcion/socios` → "Alta en Recepción" → crear socio; verificar fila en el listado y mail de activación en Mailtrap/consola.

### BK-SOC-08 · Un socio suspendido o dado de baja sigue reservando clases, generando QR y renovando; el portal no se lo informa
_Prioridad P1 · Tamaño M · Estado en código: roto · Depende de: BK-SOC-07, BK-ACC-01 · Issue #230 · Ficha: `docs/backlog/items/BK-SOC-08-socio-suspendido-o-baja-sigue-operando-en-portal.md`_

**Contexto:** `Socio.estado` (`activo | suspendido | baja`) únicamente se consulta al validar el ingreso (`has_active_membership`). En el resto del backend (reservas de clases, generación de QR, renovación, preferencia de pago) un socio dado de baja o suspendido se comporta como uno activo, y en el portal (dashboard, credencial) ni siquiera se le avisa de su estado. `dar_baja` tampoco cancela su membresía ni sus reservas futuras. Resultado: un socio de baja puede seguir ocupando cupos de clases y comprando planes sin que recepción lo note.

**Qué hacer:**
permiso `IsSocioActivo` reutilizable aplicado a reservar/cancelar clases, generar QR, preferencia de pago y renovación (según política §11); efectos de `dar_baja` (cancelar membresía activa y reservas futuras, en una transacción); banner de estado en dashboard/credencial; email de aviso al cambiar a `suspendido`/`baja`; mensajes de error claros.

**Archivos:**
- Backend: `access/permissions.py`, `classes/views.py`, `access/views.py`, `payments/views.py`, `memberships/views.py`, `members/services.py` (`dar_baja` transaccional), `common/templates/emails/estado_socio.{html,txt}` + envío desde `members/services.py`/`views.py`, tests en `members/tests`, `classes/tests`, `access/tests`, `memberships/tests`.
- Frontend: `components/socio/EstadoSocioBanner.jsx` (+test), `SocioDashboardView.jsx`, `CredencialDigitalPage.jsx`, `ClasesPage.jsx` y sus tests.

**Tests primero:**
**Backend** (`APITestCase`; `make_user_factory(rol='socio')`, `make_socio_factory(user, estado='suspendido')`, `make_plan_factory`, `make_membresia_factory` de `backend/conftest.py`; auth con `RefreshToken.for_user`):
- `classes/tests`: `test_inscribir_socio_suspendido_403`, `test_inscribir_socio_baja_403`, `test_cancelar_socio_suspendido_200` (puede liberar cupo).
- `access/tests`: `test_qr_generate_socio_baja_403`; `test_qr_generate_socio_activo_200` (regresión).
- `memberships/tests/test_me_views.py`: `test_renew_socio_baja_403`.
- `payments/tests/test_crear_preferencia.py`: `test_preferencia_socio_baja_403`.
- `members/tests/test_members_services.py`: `test_dar_baja_cancela_membresia_activa_y_reservas_futuras` (con promoción de lista de espera) y `test_dar_baja_atomica` (si falla una parte, no queda a medias).
- `members/tests/test_estado_email.py`: `outbox` recibe un mail al pasar a `baja`/`suspendido` (con `CELERY_TASK_ALWAYS_EAGER=True`, `core/settings/test.py:16`).
Comando: `cd backend && pytest -q apps/members apps/classes apps/access apps/memberships apps/payments`.
**Frontend** (Vitest + RTL): `EstadoSocioBanner.test.jsx` (3 estados); `CredencialDigitalPage.test.jsx` (con `estado:'baja'` no se llama `api.get('/access/qr/generate/')` y se ve el banner); `SocioDashboardView.test.jsx` y `ClasesPage.test.jsx` (botón Reservar deshabilitado).
Comando: `cd frontend && npx vitest run src/components/socio src/pages/socio src/components/dashboard && npm run lint`.
**Manual:*

### BK-SOC-04 · El cambio de contraseña no verifica la contraseña actual ni cierra las demás sesiones
_Prioridad P1 · Tamaño S · Estado en código: roto · Depende de: — · Issue #226 · Ficha: `docs/backlog/items/BK-SOC-04-cambio-password-no-verifica-password-actual.md`_

**Contexto:** `ChangePasswordModal` pide "Contraseña actual" y la envía como `old_password`, pero `REST_AUTH` no activa `OLD_PASSWORD_FIELD_ENABLED`, que en dj-rest-auth viene en `False` por defecto: el endpoint `POST /api/auth/password/change/` **no valida `old_password`**. Con un access token robado (o una sesión abierta en un equipo compartido) se puede fijar una contraseña nueva sin conocer la anterior. Tampoco se invalidan los refresh tokens existentes. No hay tests backend del flujo.

**Qué hacer:**
activar `OLD_PASSWORD_FIELD_ENABLED=True`; decidir/activar `LOGOUT_ON_PASSWORD_CHANGE`; blacklist de refresh tokens del usuario al cambiar contraseña; tests backend; mensajes de error en español y por campo en el modal.

**Archivos:**
- `backend/core/settings/base.py` — `REST_AUTH['OLD_PASSWORD_FIELD_ENABLED']=True` (+ opcional `LOGOUT_ON_PASSWORD_CHANGE`).
- `backend/apps/users/views.py` + `core/urls.py` — (si se decide blacklist global) vista `PasswordChangeView` propia que, tras `super().post`, blacklistea `OutstandingToken` del usuario excepto el actual.
- `backend/apps/users/tests/test_password_change.py` (nuevo).
- `frontend/src/components/auth/ChangePasswordModal.jsx` y su test en `__tests__/`.

**Tests primero:**
**Backend** (`APITestCase`, `make_user_factory(email=..., password='Vieja123!')`, auth con `RefreshToken.for_user(user).access_token` como en otros tests de `users/tests`): 
- `test_password_change_old_incorrecta_400` (hoy da 200 ⇒ test rojo).
- `test_password_change_ok_200_y_login_con_nueva` (`POST /api/auth/login/` con la nueva).
- `test_password_change_nueva_debil_400` (numérica / común / similar al email).
- `test_password_change_sin_auth_401`.
- (si se implementa) `test_refresh_token_previo_invalidado_tras_cambio`.
Comando: `cd backend && pytest -q apps/users/tests/test_password_change.py`.
**Frontend:** `ChangePasswordModal.test.jsx` (Vitest + RTL, `vi.mock('../../../services/api')`): 400 con `{old_password:[...]}` ⇒ error bajo el campo "Contraseña actual"; éxito ⇒ `toast.success` + `onClose`.
Comando: `cd frontend && npx vitest run src/components/auth && npm run lint`.
**Manual:** `socio.activo@winnie.local` (seed) → `/perfil` → "Cambiar contraseña" con actual incorrecta ⇒ error; con actual correcta ⇒ éxito y el login con la nueva funciona.

### BK-SOC-11 · Activación de cuenta y recuperación de contraseña: link/token a validar, emails en inglés con dominio por defecto, sin reenvío para socios
_Prioridad P1 · Tamaño M · Estado en código: roto · Depende de: BK-SOC-01, BK-SOC-07 · Issue #233 · Ficha: `docs/backlog/items/BK-SOC-11-activacion-y-recuperacion-de-contrasena.md`_

**Contexto:** Tanto el alta de staff como el alta de socio con email real dependen de un email "poné tu contraseña" que se genera con el `PasswordResetForm` de Django, mientras que el endpoint que lo consume (`/api/auth/password/reset/confirm/`) es el de dj-rest-auth + allauth. Nada en los tests recorre el flujo completo (todos mockean `send_activation_email`), así que **hay un riesgo alto, a confirmar con un test de ida y vuelta, de que el token del email no sea aceptado por el confirm (generadores de token distintos)**. Además: el dominio del link sale de la tabla `Site` (por defecto `example.com`), los textos del email son los de Django admin en inglés, el link vence en 3 días, el front muestra "Invalid value" crudo cuando el token es inválido, los socios no tienen reenvío de activación y el panel de staff no distingue "pendiente de activación".

**Qué hacer:**
test de ida y vuelta activación→confirm (y recuperación→confirm); corregir el generador de tokens/forma de envío para que sean compatibles; plantillas de email en español (activación vs. recuperación) con dominio del frontend; `PASSWORD_RESET_TIMEOUT` explícito; pantalla de "enlace inválido o vencido" con CTA; reenvío de activación para socios (admin/recepción); guardia de email sintético en la bienvenida; `has_usable_password` en el listado de staff y badge real.

**Archivos:**
- Backend: `users/services.py` (envío con plantilla propia), `common/templates/emails/{password_reset,account_activation}.{html,txt}`, `core/settings/base.py` (`PASSWORD_RESET_TIMEOUT`), `users/serializers.py` (`StaffListSerializer`), `members/views.py` + `services.py` (reenvío), `common/signals.py` (guardia sintético), tests nuevos.
- Frontend: `ResetPasswordPage.jsx` (+test), `AdminUsuariosPage.jsx`, `SocioDetailModal.jsx`, `services/sociosService.js`, `hooks/queries/useSociosData.js`, `App.jsx` (si se saca de `PublicRoute`).

**Tests primero:**
**Backend** (`backend/apps/users/tests/test_activation_flow.py`, `APITestCase`, `django.core.mail.outbox` con `core/settings/test.py:13` locmem; `CELERY_TASK_ALWAYS_EAGER=True`): 
- **Paso 1 (confirmar la hipótesis):** `test_activacion_staff_roundtrip`: admin crea staff por `POST /api/users/staff/` **sin mockear** el email; parsear `uid` y `token` del cuerpo de `mail.outbox[0]`; `POST /api/auth/password/reset/confirm/` con una contraseña válida ⇒ debe ser 200 y `POST /api/auth/login/` funcionar. Si hoy da 400 `{"token":["Invalid value"]}`, el bug está confirmado.
- `test_recuperacion_roundtrip`: `POST /api/auth/password/reset/` → outbox → confirm → login.
- `test_token_vencido_400` (con `PASSWORD_RESET_TIMEOUT` mínimo o `freeze` manual del generador).
- `test_email_en_espanol_y_link_al_frontend`: asunto y cuerpo en español; el link empieza con `settings.FRONTEND_URL`.
- `test_reenviar_activacion_socio_ok/400_sintetico/403_socio`.
- `test_welcome_no_se_envia_a_email_sintetico` (`apps/common/tests/test_welcome_signal.py`).
- `test_staff_list_expone_has_usable_password`.
Comando: `cd backend && pytest -q apps/users apps/members apps/common`.
**Frontend** (`ResetPasswordPage.test.jsx`, Vitest + RTL, `vi.mock('../services/api')`): 400 `{token:['Invalid value']}` ⇒ pantalla "enlace vencido" con link a `/forgot-password`; 400 `{new_password2:[...]}` ⇒ error bajo el campo; éxito ⇒ `toast.success` + navegación a `/login`. `AdminUsuariosPage.test.jsx`: badge "Pendiente activación" cuan

### BK-PLT-06 · Email de activación de staff y de reseteo de contraseña usan la plantilla genérica de Django (sin marca, texto inadecuado, dominio de Site sin configurar)
_Prioridad P1 · Tamaño M · Estado en código: ui-parcial · Depende de: — · Issue #212 · Ficha: `docs/backlog/items/BK-PLT-06-email-activacion-staff-y-reset-sin-marca.md`_

**Contexto:** Los 4 emails transaccionales de negocio (bienvenida, alerta de vencimiento, confirmación de pago, clase cancelada) usan plantillas HTML con marca bajo `backend/apps/common/templates/emails/`. El email de **activación de cuenta de staff** y el de **reseteo de contraseña** NO: reutilizan la plantilla de texto plano de `django.contrib.admin` ("You're receiving this email because you requested a password reset…"), que habla de un reset que el usuario no pidió cuando se trata de una activación y usa `{{ site_name }}`/`{{ domain }}` del framework `django.contrib.sites`, que ningún código del repo configura.

**Qué hacer:**
(1) plantillas propias `emails/staff_activation.html/.txt` y `emails/password_reset.html/.txt` basadas en `_base.html`; (2) construir el link directamente con `FRONTEND_URL` (`{{ frontend_url }}/reset-password/{uid}/{token}`) generado con `default_token_generator` + `urlsafe_base64_encode`, sin depender de `Site`; (3) enviar por `enqueue_email` (reintentos Celery); (4) sobreescribir el email de reset de dj-rest-auth con un `PasswordResetSerializer` propio (`REST_AUTH['PASSWORD_RESET_SERIALIZER']`) para usar la misma plantilla; (5) tests del contenido y del link.

**Archivos:**
- Crear `backend/apps/common/templates/emails/staff_activation.html` y `.txt`, `password_reset.html` y `.txt` (extienden `_base.html`, bloques `subject`/`content` como las plantillas existentes).
- Modificar `backend/apps/users/services.py`: reescribir `send_activation_email` para generar `uid`/`token` y llamar `enqueue_email(template_base='staff_activation', subject='Activá tu cuenta en Winnie The Gym', to=[user.email], context={'nombre', 'rol', 'activation_url'}, category='staff_activation')`.
- Crear `backend/apps/users/serializers.py::BrandedPasswordResetSerializer` (subclase de `dj_rest_auth.serializers.PasswordResetSerializer`; No verificado el nombre exacto de la clase en la versión instalada) y registrarlo en `REST_AUTH` (`core/settings/base.py:~232`).
- Tests nuevos en `backend/apps/users/tests/test_activation_email.py`.

**Tests primero:**
Convención: pytest + `APITestCase`/`TestCase`; `core.settings.test` usa `EMAIL_BACKEND` locmem y `CELERY_TASK_ALWAYS_EAGER=True` (`core/settings/test.py:13-17`); fixtures `make_user_factory`, etc. en `backend/conftest.py`. Patrón: `apps/common/tests/test_welcome_signal.py` (usa `mail.outbox`). Correr: `cd backend && pytest apps/users -q` (requiere Postgres/Redis/Mongo como en CI) o `docker compose exec backend pytest -q`; el CI exige cobertura global >= 80 (`pytest.ini`).
Casos primero:
- Crear staff por API (admin autenticado) → `mail.outbox` con 1 mensaje, asunto en español, cuerpo con `settings.FRONTEND_URL + '/reset-password/'` y sin la cadena "requested a password reset".
- `resend-activation` por recepcionista → 403 (ya cubierto; mantener) y por admin → 200 + email.
- El `uid` y `token` del link validan con `default_token_generator.check_token`.
- Fallo de `send_templated_email` no rompe la creación del usuario (ya hoy es no fatal).
- Reset por `POST /api/auth/password/reset/` con email existente → email con plantilla de marca; email inexistente → 200 sin email.
- Manual: crear staff desde `/admin/usuarios` (admin) y abrir el email en Mailtrap; abrir el link en ventana privada.

## B7 — Clases: modelo por fecha y reglas de reserva · Franco · ~24 días · rama `feat/clases-sesiones-reglas`

**Commit (squash):** `feat(classes): dated sessions, catalogs, booking rules and attendance contract`

**En la descripción del PR:** Closes #178 · Closes #179 · Closes #175 · Closes #173 · Closes #171 · Closes #174

**Contexto.** 6 fichas agrupadas por zona de código. Hacelas en el orden de la lista.

### BK-CLS-09 · Sesiones de clase por fecha (SesionClase) y edición de series recurrentes
_Prioridad P1 · Tamaño XL · Estado en código: no-existe · Depende de: BK-CLS-01 · Issue #178 · Ficha: `docs/backlog/items/BK-CLS-09-sesiones-por-fecha-y-edicion-de-series.md`_

**Contexto:** Hoy `Clase` es una plantilla semanal ("Yoga, lunes 08:00") que mezcla la definición recurrente con las ocurrencias. No existe ninguna entidad por fecha, entonces: cupo, lista de espera, reservas, asistencia y cancelación son únicos para todas las semanas; cancelar "la clase del lunes 13" cancela la serie entera para siempre; la asistencia marcada hoy se arrastra a la semana siguiente; no se puede editar "solo esta fecha" ni "esta y siguientes". Es la deuda estructural de la que dependen casi todos los demás ítems del área.

**Qué hacer:**
**Incluye (propuesta de diseño, a validar):**
- Nuevo modelo `SesionClase` (una fila por fecha de la serie) y migración de datos desde `Clase`/`InscripcionClase`.
- Generación de sesiones por ventana móvil (tarea Celery beat) y bajo demanda al crear/editar.
- Inscripción, lista de espera, asistencia y cancelación por sesión.
- Edición de serie con alcance `solo_esta | esta_y_siguientes | toda`.
- Nuevos endpoints de rango de fechas para calendario y agenda del socio.
- Adaptación de frontend (calendario, lista, asistencia, agenda del socio).

**Archivos:**
- Backend: `models.py`, `migrations/0011+` (esquema y datos), `services.py` (generación, inscripción por sesión, edición por alcance), `serializers.py`, `views.py` (`SesionClaseViewSet`), `urls.py`, `tasks.py` (nuevo), `admin.py`, tests nuevos.
- Frontend: `hooks/queries/useSesiones.js`, `ClassCalendarView.jsx`, `ClassSchedulePage.jsx`, `ClassListDetailView.jsx`, `AttendancePage.jsx`, `ClassAttendeesModal.jsx`, `CreateClassPage.jsx`, `pages/socio/ClasesPage.jsx`, `components/socio/ClassCard.jsx`.
- Docs: `speckit/class-model-architecture-decision/{proposal,design,tasks}.md` (SDD) y ADR en `docs/architecture.md`.

**Tests primero:**
Backend (`backend/apps/classes/tests/test_sesiones.py`, `test_series_edit.py`; pytest + `make_*` fixtures de `backend/conftest.py`; `cd backend && pytest apps/classes -q`):
- Generación idempotente (dos corridas no duplican `(clase, fecha)`), respeta `dias_recurrencia` y `vigente_*`.
- Inscribir en una fecha no afecta otra; cupo y espera por sesión; cancelación con corte `fecha+hora-cancelacion_horas` (sin `freezegun` en `backend/requirements`: mockear `django.utils.timezone.now` con `unittest.mock.patch`).
- `cancelar-sesion` cancela solo esa fecha, notifica, el resto sigue activa.
- Alcance `solo_esta`, `esta_y_siguientes`, `toda` con reservas existentes; sesiones pasadas inmutables.
- Migración de datos: fixtures con `Clase` + inscripciones pasan a sesiones sin pérdida (test de migración con `MigrationExecutor` (no hay `django_test_migrations` en requirements)).
- Permisos por rol (403 socio en endpoints de staff).
Frontend (vitest/RTL): calendario pide el rango correcto por semana; modal de alcance envía `alcance`; asistencia usa `sesion`.
Manual: con `recepcion@winnie.local` cancelar solo el lunes 13 y verificar que el 20 sigue activo.

### BK-CLS-10 · Catálogo configurable de disciplinas, salas (y sedes) en lugar de listas hardcodeadas
_Prioridad P2 · Tamaño L · Estado en código: no-existe · Depende de: BK-CLS-06 · Issue #179 · Ficha: `docs/backlog/items/BK-CLS-10-catalogo-de-disciplinas-salas-y-sedes.md`_

**Contexto:** Las disciplinas son un `TextChoices` del backend replicado a mano en cuatro lugares del frontend (con 5, 5, 6 y 8 ítems distintos); las salas son texto libre en la base y un `<select>` fijo "Sala A/B/C" en el formulario; las sedes no existen (solo aparecen como texto en planes y en la matriz comparativa). Agregar una disciplina o sala requiere deploy, el seed y la UI ya están desalineados y no hay capacidad por sala para validar el cupo.

**Qué hacer:**
- Modelos `Disciplina` y `Sala` administrables (CRUD admin, lectura para staff y socios) y migración de datos desde `categoria`/`sala` actuales.
- `Clase.disciplina` FK (conservando `categoria` en la API durante la transición) y `Clase.sala` FK; validar `cupo_maximo <= Sala.capacidad`.
- Selects del formulario y filtros alimentados por API; colores de disciplina configurables (token o hex).
- Sección "Clases" en Configuración para administrar ambos catálogos.

**Archivos:**
- Backend: `models.py`, `serializers.py`, `views.py`, `urls.py`, `admin.py`, migraciones, `seed_data.py` (alinear), tests.
- Frontend: `constants/disciplinas.js` y `constants/clases.js` (eliminar listas), `hooks/queries/useCatalogoClases.js`, `CreateClassPage.jsx`, `ClassListDetailView.jsx`, `ClassCalendarView.jsx`, `ClasesPage.jsx`, `ClassCard.jsx`, `AdminConfiguracionPage.jsx`.

**Tests primero:**
Backend (`backend/apps/classes/tests/test_catalogo.py`; `APITestCase`; `cd backend && pytest apps/classes -q`):
- CRUD de disciplinas y salas: admin 2xx; recepcionista 403 en escritura y 200 en lectura; socio 200 en lectura, 403 en escritura.
- No se puede borrar una disciplina/sala en uso.
- `cupo_maximo > capacidad` -> 400.
- Migración de datos: clases existentes conservan su disciplina y sala.
- Compatibilidad: respuesta de `ClaseSerializer` mantiene `categoria` y `sala`.
Frontend (vitest/RTL; `npx vitest run src/pages src/components src/hooks`): formulario carga opciones por API; filtros de socio y admin usan el catálogo; la sección de Configuración crea/edita.
Manual: `admin@winnie.local` -> `/configuracion` -> crear "Boxeo" y sala "Box 2 (cap. 12)" -> crear clase con ambas.

### BK-CLS-06 · Formulario de clase - edición, copia y validaciones (datos demo precargados, día/recurrencia inconsistentes, sin validación backend)
_Prioridad P1 · Tamaño M · Estado en código: ui-parcial · Depende de: BK-CLS-01, BK-CLS-09, BK-CLS-10 · Issue #175 · Ficha: `docs/backlog/items/BK-CLS-06-formulario-de-clase-edicion-copia-y-validaciones.md`_

**Contexto:** Sí existe un modo "Editar clase" (`/admin/clases/crear?id=<id>`, botón "Editar" en la vista Lista y Detalle), pero el formulario: arranca con datos de demo precargados, ignora el "Día principal" cuando hay recurrencia, ofrece solo 5 de las 7 disciplinas y sin Domingo, usa listas hardcodeadas de instructor/sala/planes que no coinciden con los datos reales, esconde los errores de validación de DRF y "Copiar de clase existente" es un atajo solo-DEV que copia siempre la primera clase. El backend no valida nada de negocio (cupo vs inscriptos, horarios, solapamientos). Editar una serie recurrente siempre modifica "toda la serie"; no hay otras opciones.

**Qué hacer:**
- Alta sin datos de demo (estado inicial vacío con placeholders) y edición sin campos de solo lectura en el payload (usar `PATCH` con solo los campos modificados).
- `dia` derivado: el "Día principal" se elimina o se deriva siempre de `dias_recurrencia` ordenado (lunes primero); `recurrencia` pasa a ser calculado en el backend.
- 7 disciplinas y 7 días en selects/config (hasta que BK-CLS-10 los vuelva configurables).
- Validaciones de backend (serializer `validate`) con mensajes por campo, y mostrar errores por campo en el formulario.
- "Copiar de clase existente" real (selector) disponible en todos los entornos + acción "Duplicar" en la lista.
- Reglas de edición de serie para el modelo actual: documentadas en UI ("Los cambios aplican a todas las fechas").

**Archivos:**
- `backend/apps/classes/serializers.py`: `validate()` + `recurrencia` derivada; tests nuevos.
- `backend/apps/classes/services.py`: `validar_solapamiento(clase_data, instance=None)` (reutilizable).
- `frontend/src/pages/CreateClassPage.jsx`, `frontend/src/hooks/queries/useClases.js`, `frontend/src/constants/clases.js`, `frontend/src/constants/disciplinas.js` (agregar `boxeo`, `hiit` y colores CSS `--color-disciplina-boxeo/hiit` en el tema), `frontend/src/components/classes/ClassListDetailView.jsx` (acción Duplicar y filtros de categorías).
- Nuevo `frontend/src/components/classes/CopiarClaseModal.jsx` + test.

**Tests primero:**
Backend (`backend/apps/classes/tests/test_classes_crud.py` o nuevo `test_classes_validation.py`; `APITestCase`, `make_user_factory(rol='recepcionista')`, `RefreshToken`):
- `cupo_maximo=0` -> 400 campo `cupo_maximo`; `cupo_maximo` menor a inscriptos en PATCH -> 400.
- `dias_recurrencia=['Z']` -> 400; duplicados -> 400; `recurrencia` se devuelve calculada.
- `hora=06:00` con apertura 07:00 -> 400; `hora=22:30` + 60 min con cierre 23:00 -> 400.
- Solapamiento sala/instructor mismo día -> 400; PATCH de la misma clase sin cambios -> 200 (excluye a sí misma).
- Socio -> 403.
Frontend (vitest + RTL, `renderWithProviders`; archivos `CreateClassPage.test.jsx`, `CreateClassPage.handlers.test.jsx`; `npx vitest run src/pages/CreateClassPage*.test.jsx`):
- Alta arranca con campos vacíos; no se puede publicar sin nombre.
- Edición precarga; el PATCH solo incluye campos modificados y no incluye `cupos_reservados`/`inscripciones`.
- Los 7 días y 7 disciplinas aparecen; clase `boxeo` se muestra seleccionada.
- Error 400 por campo aparece bajo el input correcto.
- "Copiar de clase existente" visible sin `DEV`, precarga la clase elegida con nombre "(Copia)".
Manual: `admin@winnie.local` -> `/admin/clases` -> Lista -> Editar una clase del seed (salas "Box Principal" etc.) y verificar que sala/instructor se ven correctos.

### BK-CLS-04 · Reglas de reserva sin validar en backend (membresía, planes habilitados, estado, concurrencia, ventana de cancelación)
_Prioridad P0 · Tamaño L · Estado en código: roto · Depende de: BK-CLS-09, BK-CLS-10 · Issue #173 · Ficha: `docs/backlog/items/BK-CLS-04-reglas-de-reserva-sin-validar-en-backend.md`_

**Contexto:** `inscribir_socio` solo controla duplicado y cupo. Cualquier socio, incluso con membresía vencida, suspendido o de baja, puede reservar cualquier clase; el campo "Planes habilitados para reservar esta clase" que el staff configura es puramente decorativo; se puede reservar una clase cancelada pasando `?incluir_canceladas=true`; el alta manual por staff saltea todas las reglas; dos reservas simultáneas pueden superar el cupo; y el corte de cancelación (`cancelacion_horas`) se calcula mal para clases con varios días. Son datos inconsistentes que hoy no hay forma de detectar.

**Qué hacer:**
- Validar en `inscribir_socio`: estado de la clase (`activa`), socio `activo`, membresía `activa` con `fecha_inicio <= hoy <= fecha_fin`, plan habilitado para la clase.
- Convertir `planes_habilitados` en relación real (propuesta: `ManyToManyField` a `PlanMembresia`; lista vacía = todos los planes).
- Bloqueo `select_for_update` + `transaction.atomic` para cupo y espera.
- Corregir cálculo de próxima ocurrencia considerando `dias_recurrencia` (interino hasta BK-CLS-09).
- Hacer que el alta manual por staff use el mismo servicio (con `forzar` para sobrecupo solo admin).
- Ignorar `incluir_canceladas` en acciones de escritura.
- Que el frontend use `cancelacion_horas` real y muestre el motivo del rechazo.

**Archivos:**
- `backend/apps/classes/services.py`: `inscribir_socio` (validaciones + atomic), `_next_clase_datetime` (usar `dias_recurrencia`), nuevo helper `plan_activo_del_socio(socio)`.
- `backend/apps/classes/views.py`: `inscribir`/`cancelar` ignoran `incluir_canceladas`; `InscripcionClaseViewSet.perform_create` delega al servicio.
- `backend/apps/classes/models.py` + migraciones `0011/0012` para `planes`.
- `backend/apps/classes/serializers.py`.
- `frontend/src/pages/CreateClassPage.jsx`, `frontend/src/pages/socio/ClasesPage.jsx`, `frontend/src/components/socio/ClassCard.jsx`.
- Tests (sección 9).

**Tests primero:**
Backend (`backend/apps/classes/tests/`; patrón de `test_classes_services.py`: pytest con `make_socio`, y de `test_inscribir_flow.py`: `APITestCase`; fixtures `make_plan`, `make_membresia` en `backend/conftest.py:82-113`; correr `cd backend && pytest apps/classes -q`):
- socio sin membresía -> 400 mensaje de renovar; con membresía `vencida`/`suspendida`/`cancelada` -> 400; con `fecha_fin` ayer -> 400.
- socio `suspendido`/`baja` -> 400.
- clase con planes `[A]` y socio con plan `B` -> 400; plan `A` -> 201; lista vacía -> 201 para cualquier plan.
- clase `cancelada` + `?incluir_canceladas=true` -> 400/404 (no 201).
- alta manual por staff respeta cupo (sin `forzar`).
- concurrencia: 2 hilos con 1 cupo -> exactamente 1 confirmado y 1 en espera (`TransactionTestCase`).
- `cancelar_inscripcion` con clase L/X/V: el corte se calcula contra la próxima ocurrencia real (miércoles) y no el lunes; no permite cancelar si la ocurrencia de hoy ya empezó.
- permisos: recepcionista/admin -> 403 en `inscribir`.
Frontend (`frontend/src/pages/socio/ClasesPage.test.jsx`, `ClassCard.test.jsx`, `CreateClassPage.test.jsx`; vitest + RTL): `ClassCard` muestra `cancelacionHoras`; toast de error con el `detail`; `CreateClassPage` renderiza planes devueltos por el hook y envía ids.
Manual: con `socio.vencido@winnie.local` (seed demo) intentar reservar -> debe fallar con mensaje; con `socio.activo@winnie.local` reservar una clase de un plan habilitado.

### BK-CLS-02 · Pasar lista roto - modal y página de asistencia no respetan el contrato del backend
_Prioridad P0 · Tamaño M · Estado en código: roto · Depende de: BK-CLS-09 · Issue #171 · Ficha: `docs/backlog/items/BK-CLS-02-pasar-lista-roto-contrato-y-estado.md`_

**Contexto:** El flujo "pasar lista" persiste `asistio` por PATCH, pero la UI lee campos que el serializer no devuelve (`estado`, `nombre`, `dni`, `plan`, `hora_reserva`), por lo que el modal muestra filas vacías y nunca marca presente/ausente; `asistio` es `False` por defecto, así que en la página completa todos los inscriptos aparecen como "ausentes" desde el inicio; el link "Abrir terminal completa de asistencia" pierde el `?id=`; "Cerrar asistencia" es solo un toast. Hoy el staff no puede tomar asistencia de forma confiable.

**Qué hacer:**
- Alinear el contrato: agregar `socio_dni` y `plan_nombre` (plan de la membresía activa) al serializer; el frontend usa `socio_nombre`, `socio_apellido`, `socio_dni`, `plan_nombre`, `asistio`, `created_at`.
- Estado tri-estado de asistencia: `asistio` pasa a `BooleanField(null=True, blank=True, default=None)` (`None` = sin marcar, `True` presente, `False` ausente) con migración `0011`.
- Arreglar el redirect legacy para conservar el query string y el link del modal (usar directamente `/admin/clases/asistencia?id=`).
- Hacer reales "Guardar asistencia" y "Cerrar asistencia" (interino hasta BK-CLS-09): endpoint `POST /api/classes/clases/{id}/cerrar-asistencia/`.
- Mover la redirección por `!classId` a un `useEffect`/`<Navigate>`.
- Export CSV con BOM, escape correcto (Blob en lugar de `encodeURI`) y columnas reales.

**Archivos:**
- `backend/apps/classes/models.py`, nueva migración `0011_...`: `asistio` nullable.
- `backend/apps/classes/serializers.py`: `socio_dni`, `plan_nombre`; `read_only_fields` en update.
- `backend/apps/classes/services.py`: `cerrar_asistencia(clase, actor)`.
- `backend/apps/classes/views.py`: `@action cerrar_asistencia`.
- `frontend/src/App.jsx`: redirect legacy con query string.
- `frontend/src/components/classes/ClassAttendeesModal.jsx`: usar campos reales.
- `frontend/src/pages/AttendancePage.jsx`: tri-estado, columnas reales, close real, redirect por `useEffect`, CSV por Blob con BOM.
- `frontend/src/hooks/queries/useClassAttendees.js`, `useClases.js`.
- Tests: ver sección 9.

**Tests primero:**
**Backend** (`backend/apps/classes/tests/`, `APITestCase`, `make_user_factory`/`make_socio_factory`, `_auth` con `RefreshToken`; correr `cd backend && pytest apps/classes -q`):
- Nuevo `test_asistencia.py`: PATCH `asistio=true/false/null` como recepcionista -> 200 y persiste; como socio -> 403; PATCH con `clase`/`socio` distintos no los cambia.
- Serializer: `GET /api/classes/clases/{id}/` incluye `socio_dni` y `plan_nombre` (con y sin membresía activa).
- `cerrar-asistencia`: marca `None` -> `False`, no toca `True`; clase cancelada -> 400; socio -> 403; idempotente.
- Migración: inscripción nueva arranca con `asistio is None`.
**Frontend** (vitest + RTL; `renderWithProviders`, `resetAllStores` de `frontend/src/test/test-utils.jsx`; correr `cd frontend && npx vitest run src/pages/AttendancePage.test.jsx src/components/classes`):
- Actualizar `AttendancePage.test.jsx` y agregar test del modal con fixtures REALES de la API (`socio_nombre`, `asistio: null`): una fila con `asistio:null` NO se pinta como ausente; "sin marcar" cuenta correctamente.
- Test del redirect: `MemoryRouter initialEntries={['/clases/asistencia?id=7']}` termina en `/admin/clases/asistencia?id=7`.
- Test del cierre: click en "Cerrar y guardar asistencia" llama `POST .../cerrar-asistencia/`.
- Export: el Blob contiene BOM y escapa comillas.
**Manual:** entrar como `recepcion@winnie.local` (seed `seed_demo_users`), `/admin/clases` -> "Lista" de una clase con inscriptos -> marcar, cerrar, recargar y verificar p

### BK-CLS-05 · Cancelación de clase - emails duplicables, bypass por PUT, sin aviso a la espera ni visibilidad posterior
_Prioridad P1 · Tamaño M · Estado en código: ui-parcial · Depende de: BK-CLS-09 · Issue #174 · Ficha: `docs/backlog/items/BK-CLS-05-cancelacion-de-clase-notificacion-y-consistencia.md`_

**Contexto:** La cancelación con motivo (mínimo 10 caracteres) existe y SÍ envía emails reales (vía Celery) a los inscriptos confirmados. Pero: la señal vuelve a mandar emails en cualquier `save()` posterior de una clase cancelada; el staff puede cancelar con un `PUT estado=cancelada` salteando el motivo; los que están en lista de espera no se enteran; el motivo no se expone en la API ni se ve en ninguna pantalla; las clases canceladas desaparecen del calendario y de "Mis reservas" sin rastro; y se cancela la clase completa (toda la serie recurrente para siempre) aunque la UI dice "cancelar la clase".

**Qué hacer:**
- Disparar emails solo en la transición a cancelada (mover el envío al servicio con `transaction.on_commit`, o mantener señal comparando estado previo).
- Notificar también a los de lista de espera (texto distinto: "La clase a la que estabas en lista de espera fue cancelada").
- Bloquear cambios de `estado` por `PUT/PATCH` (read-only; solo servicio `cancelar_clase`) y registrar `cancelada_por`.
- Exponer `fecha_cancelacion` y `motivo_cancelacion` en la API y mostrarlos al staff y al socio.
- Mostrar clases canceladas con estado visible (staff: toggle "Ver canceladas"; socio: aviso en "Mis reservas").
- Corregir el ícono/rótulo ("Cancelar clase") y devolver cuántos fueron notificados.
- Reactivar una clase cancelada (acción explícita) - ver decisión abierta.

**Archivos:**
- `backend/apps/classes/services.py`: `cancelar_clase` guarda `cancelada_por`, envía emails en `transaction.on_commit`, devuelve conteos; nuevo `reactivar_clase`.
- `backend/apps/classes/signals.py`: eliminar o reducir a guard de transición (comparar con valor previo).
- `backend/apps/classes/serializers.py`, `views.py`, `models.py`, migración `0011_...`.
- `backend/apps/common/templates/emails/clase_cancelada.html` (variante para espera) o `clase_cancelada_espera.html`.
- `frontend/src/pages/ClassSchedulePage.jsx`, `components/classes/ClassListDetailView.jsx`, `components/classes/CancelarClaseModal.jsx`, `components/socio/ClassCard.jsx`, `hooks/queries/useClases.js`.

**Tests primero:**
Backend (`backend/apps/classes/tests/test_soft_cancel.py` ampliado; patrón `patch('apps.classes.signals.enqueue_email')` o `patch('apps.classes.services.enqueue_email')`; correr `cd backend && pytest apps/classes -q`):
- Re-guardar una clase cancelada (`clase.save()` y `PATCH nombre`) NO vuelve a encolar emails.
- `PUT/PATCH {"estado": "cancelada"}` por recepción -> 400/ignorado y no se encola nada.
- Se encola email a confirmados y otro (template de espera) a `en_espera=True`.
- Socio sin email no rompe y no cuenta como notificado.
- Respuesta incluye `notificados`/`en_espera_notificados`.
- `reactivar`: 200 y estado `activa`; en clase activa 400; socio 403.
- `GET` expone `motivo_cancelacion` solo con `incluir_canceladas`; el motivo >500 -> 400.
- `cancelada_por` queda seteado al usuario que ejecutó.
Frontend (vitest/RTL; actualizar `components/classes/__tests__/CancelarClaseModal.test.jsx`, `pages/__tests__/ClassSchedulePage.test.jsx`, `ClassCard.test.jsx`): copy nuevo, toggle de canceladas, badge de estado, tarjeta del socio con motivo.
Manual: con `recepcion@winnie.local` cancelar una clase con 1 inscripto y 1 en espera (cuentas del seed); verificar 2 emails (consola/Mailtrap); recargar `/admin/clases` con "Mostrar canceladas".

## B8 — Mobile: base de navegación, modales y formularios · Rodrigo · ~16 días · rama `feat/mobile-navegacion-base`

**Commit (squash):** `feat(mobile): staff More menu, member navigation, sheet modals, touch forms and safe areas`

**En la descripción del PR:** Closes #201 · Closes #205 · Closes #199 · Closes #200 · Closes #194 · Closes #195 · Closes #166 · Closes #196

**Contexto.** 8 fichas agrupadas por zona de código. Hacelas en el orden de la lista.

### BK-MOB-08 · Safe-area insets, viewport-fit=cover, unidades dvh y theme-color
_Prioridad P1 · Tamaño S · Estado en código: roto · Depende de: — · Issue #201 · Ficha: `docs/backlog/items/BK-MOB-08-safe-area-viewport-dvh.md`_

**Contexto:** El código ya intenta respetar el notch/home-indicator con `env(safe-area-inset-bottom)` en las dos bottom navs, pero `index.html` declara el viewport **sin `viewport-fit=cover`**, por lo que esas variables valen 0 en iOS (el padding nunca se aplica). Además los layouts usan `h-screen`/`min-h-screen` (100vh), que en navegadores móviles incluye la zona tapada por la barra del navegador, y las navs fijas calculan su alto con `h-14` en `box-sizing: border-box`, de modo que aun con inset el contenido se comprime.

**Qué hacer:**
(a) `viewport-fit=cover` y `theme-color` dinámico; (b) reemplazar `h-screen`/`min-h-screen` por `h-dvh`/`min-h-dvh` (con fallback); (c) navs con alto `min-h` + padding-bottom por clase Tailwind y `pb` del contenido que suma el inset; (d) insets laterales para landscape; (e) inset superior para cabeceras fijas/pantalla completa; (f) utilidades CSS reutilizables.

**Archivos:**
- Modificar `frontend/index.html`, `frontend/src/App.jsx`, `frontend/src/index.css`, `components/layout/{AppLayout,AppBottomNav,MemberLayout,Sidebar}.jsx`, `components/socio/QRFullscreenModal.jsx`, `pages/{LoginPage,RegisterPage,ForgotPasswordPage,ResetPasswordPage,CompleteProfilePage,NotFoundPage,AuthCallback}.jsx` (solo `min-h-screen`).
- Crear tests: `components/layout/AppBottomNav.test.jsx` (si no lo crea BK-MOB-01), ampliar `MemberLayout.test.jsx`.

**Tests primero:**
Convención y comandos: ver BK-MOB-01 §9. jsdom no evalúa `env()`/`dvh`: se asertan clases y atributos; la verificación real es manual/Playwright.
1. Test de contenido de `index.html` (Vitest con `fs.readFileSync('index.html')`): contiene `viewport-fit=cover`, `name="theme-color"` y **no** contiene `user-scalable=no` ni `maximum-scale`.
2. `AppBottomNav.test.jsx`: el `nav` tiene la clase `pb-safe` (o `pb-[env(safe-area-inset-bottom)]`) y ya no tiene `style` con `paddingBottom`; el contenedor interno mantiene `h-14`.
3. `MemberLayout.test.jsx`: idem para su `nav`; el `main` usa `pb-[calc(5rem+env(safe-area-inset-bottom))]`.
4. `AppLayout`: la raíz usa `h-dvh` y no `h-screen`.
5. Test de tema (`App`): al cambiar `theme` en `themeStore`, `meta[name="theme-color"]` cambia de `#121212` a `#F5F5F4`.
6. Playwright (ampliar `frontend/scripts/mobile-walkthrough.mjs` con `devices['iPhone 14']` y `devices['Pixel 7']`): `getComputedStyle(nav).paddingBottom` y que el último elemento del contenido sea alcanzable por scroll (`scrollTop + clientHeight >= scrollHeight - 1`) sin quedar bajo la nav.
Manual: iPhone con home-indicator (Safari y modo "Agregar a inicio"), Android con navegación por gestos y por botones; rotar a landscape con notch.

### BK-MOB-12 · La cabecera Permissions-Policy de Vercel bloquea la cámara y rompe el escaneo de QR en producción
_Prioridad P0 · Tamaño S · Estado en código: roto · Depende de: — · Issue #205 · Ficha: `docs/backlog/items/BK-MOB-12-permissions-policy-bloquea-camara-en-produccion.md`_

**Contexto:** `frontend/vercel.json` envía en todas las respuestas `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Con una lista vacía, la función `camera` queda deshabilitada **para el propio origen** (no solo para iframes de terceros), por lo que `getUserMedia` del escáner de la terminal de accesos (`@yudiel/react-qr-scanner`) falla con `NotAllowedError` y la app cae siempre al modo "DNI manual". Impacta directamente el flujo móvil/tablet de recepción (validar QR en menos de 2 s es un requisito del producto). La cabecera se verificó leyendo la configuración; **no se verificó contra el despliegue real** (ver §9, paso manual).

**Qué hacer:**
cambiar la cabecera a `camera=(self)`, test que impida la regresión, verificación en el despliegue y mensaje de error más específico en el escáner.

**Archivos:**
- Modificar `frontend/vercel.json`, `frontend/src/components/recepcion/ScannerPanel.jsx` o `AccesoTerminalPage.jsx` (mensaje).
- Crear `frontend/src/__tests__/vercelConfig.test.js` y `frontend/src/components/recepcion/ScannerPanel.test.jsx`.

**Tests primero:**
Convención y comandos: ver BK-MOB-01 §9 (vitest + RTL; `cd frontend && npx vitest run <ruta>`).
1. `vercelConfig.test.js` (rojo hoy): lee `frontend/vercel.json` con `fs`/`import`, busca el header `Permissions-Policy` y verifica con regex que `camera` incluye `self` y que `microphone` y `geolocation` siguen vacíos.
2. `ScannerPanel.test.jsx`: mockear `@yudiel/react-qr-scanner` (`vi.mock`) para invocar `onError({ name: 'NotAllowedError' })` y comprobar que se llama `onCameraError` y que `AccesoTerminalPage` muestra el mensaje de permisos; con otro error, el mensaje genérico.
3. Manual en producción: `curl -sI https://<dominio-del-frontend>/ | rg -i permissions-policy` debe mostrar `camera=(self)`; abrir `/recepcion/acceso` en Android Chrome (HTTPS) con cuenta de recepción (seed `recepcion`, ver `seed_demo_users`; no imprimir contraseñas), aceptar el permiso y escanear un QR de `/socio/credencial`. En iOS Safari idem.
4. Verificar en DevTools > Application > Permissions Policy que `camera` figura como permitida.

### BK-MOB-06 · Modales como bottom sheet / pantalla completa en móvil (Modal: variante, footer fijo, scroll lock, foco)
_Prioridad P1 · Tamaño M · Estado en código: ui-parcial · Depende de: BK-BUG-09 · Issue #199 · Ficha: `docs/backlog/items/BK-MOB-06-modal-sheet-movil.md`_

**Contexto:** `Modal` es un diálogo centrado de `max-w-lg` con `p-6`, `my-8` y scroll del overlay entero: en 375 px ocupa casi todo el ancho pero deja los botones de acción al final de un contenido largo (formularios de socio, plan, staff), no bloquea el scroll del fondo, no restaura el foco y usa clases de animación (`animate-in fade-in zoom-in-95`) que **no existen** porque `tailwindcss-animate` no está instalado. Es además la base necesaria para el sheet "Más" (BK-MOB-01) y los filtros en móvil (BK-MOB-04).

**Qué hacer:**
(a) prop `mobileVariant` (`'sheet'` default | `'fullscreen'` | `'dialog'`) con clases responsive; (b) prop `footer` fijo con safe-area; (c) scroll lock; (d) foco: trap + restauración y (e) `useId` para IDs — **estos dos puntos son el alcance de BK-BUG-09**: si ese ítem ya se implementó, reutilizarlo; si no, hacerlo acá y cerrar BK-BUG-09; (f) animaciones propias (`slideUp`) respetando `prefers-reduced-motion`; (g) botón cerrar de 44 px; (h) migrar `PlanFormModal`, `SocioFormModal`, `StaffFormModal`, `ClassAttendeesModal` a `footer`/`fullscreen` donde corresponda; (i) ajustar `QRFullscreenModal`.

**Archivos:**
- Modificar `components/ui/Modal.jsx`, `index.css`, los 8 consumidores listados y `components/socio/QRFullscreenModal.jsx`.
- Tests: ampliar `components/ui/__tests__/Modal.test.jsx`; revisar los tests de cada modal por cambios de estructura (`SocioFormModal.test.jsx`, `__tests__/PlanFormModal.test.jsx`, `__tests__/StaffFormModal.test.jsx`, `__tests__/ChangePasswordModal.test.jsx`, `__tests__/CancelarClaseModal.test.jsx`, `QRFullscreenModal.test.jsx`).

**Tests primero:**
Convención y comandos: ver BK-MOB-01 §9. Primero, en rojo (`Modal.test.jsx`):
1. Panel con `role="dialog"` y clases `rounded-t-2xl`/`max-h-[92dvh]` en `mobileVariant="sheet"`; `h-dvh` en `fullscreen`.
2. `footer` se renderiza fuera del contenedor de scroll (contenedor del body distinto del footer) y el botón submit con `form="id"` envía el formulario.
3. Al abrir: `document.body.style.overflow === 'hidden'`; al cerrar o desmontar, vuelve al valor previo; con dos modales apilados solo se restaura al cerrar el último.
4. Foco: tras abrir, `document.activeElement` es el panel (o dentro del diálogo); Tab desde el último elemento vuelve al primero; al cerrar, el foco regresa al botón que abrió el modal.
5. Dos modales a la vez tienen IDs distintos (`aria-labelledby` apunta al `h3` correcto).
6. Regresión: los 4 casos actuales siguen verdes.
7. `QRFullscreenModal`: Escape cierra.
8. Playwright (ampliar `mobile-walkthrough.mjs`): abrir "Nuevo plan"/"Nuevo socio" a 375×667; el botón de guardar está dentro del viewport sin scrollear y `document.body` no scrollea.
Manual: Safari iOS real o emulación (abrir teclado en un campo, verificar que el footer y el campo enfocado queden visibles).

### BK-MOB-07 · Formularios y botones táctiles (alto mínimo 44 px, fuente 16 px, inputMode/autoComplete, labels asociadas)
_Prioridad P1 · Tamaño M · Estado en código: ui-parcial · Depende de: — · Issue #200 · Ficha: `docs/backlog/items/BK-MOB-07-formularios-botones-tactiles-inputmode.md`_

**Contexto:** Casi todos los campos de la app usan `text-sm`/`text-xs` (12–14 px): iOS Safari hace zoom automático al enfocar cualquier `input`/`select`/`textarea` con fuente < 16 px y deja la pantalla ampliada. Ningún campo declara `inputMode` (DNI, teléfono, monto y cupos abren el teclado alfabético o el `number` genérico con flechas), los botones `md` miden ~40 px y los `sm` ~28 px, y varias etiquetas no están asociadas a su `input`. Son mejoras de bajo riesgo con alto impacto en el uso real desde el celular.

**Qué hacer:**
(a) `Input`: `id` automático con `useId`, `label htmlFor`, prop `inputClassName`, `inputMode`/`enterKeyHint` pass-through, `text-base md:text-sm` y `min-h-11`; (b) `Select`/`SearchBar` con `text-base md:text-sm` y `min-h-11`; (c) `Button` con `min-h-11` en móvil; (d) `inputMode` + `autoComplete` + `maxLength` en DNI, teléfono, montos y cupos; (e) reemplazar los `<input>` crudos de Registro, Completar perfil, Perfil y CreateClass por `Input`; (f) botones de ícono de 44 px; (g) barra de acción primaria fija al pie en formularios largos (CreateClass, alta de socio); (h) test que impida regresiones.

**Archivos:**
- Modificar `components/ui/{Input,Select,SearchBar,Button}.jsx`, `components/layout/TopBar.jsx` (campo de búsqueda), `pages/{RegisterPage,CompleteProfilePage,ProfilePage,CreateClassPage}.jsx`, `pages/admin/AdminConfiguracionPage.jsx`, `pages/recepcion/CobroManualPage.jsx`, `components/recepcion/{DatosPersonalesCard,ScannerPanel}.jsx`, `components/admin/{SocioFormModal,StaffFormModal}.jsx`, `pages/socio/ClasesPage.jsx`, `index.css` (opcional).
- Crear `components/ui/__tests__/Input.test.jsx` (y `Select.test.jsx`); ampliar los existentes `Button.test.jsx` y `SearchBar.test.jsx`.

**Tests primero:**
Convención y comandos: ver BK-MOB-01 §9. Primero, en rojo:
1. `Input.test.jsx`: `getByLabelText('Nombre')` encuentra el `<input>` (label asociada por `useId`); `inputClassName` se aplica al `<input>`; `inputMode`/`enterKeyHint` pasan al DOM; clases `text-base` y `min-h-11` presentes.
2. `Button.test.jsx`: `size="md"` incluye `min-h-11`; `size="icon"` incluye `h-11 w-11`.
3. `SearchBar.test.jsx`: `type="search"` y `text-base`.
4. `RegisterPage` (ya existe `pages/__tests__/RegisterPage.test.jsx`): el campo DNI tiene `inputMode="numeric"` y `maxLength=8`; el campo teléfono `type="tel"`; `getByLabelText('DNI')` funciona.
5. `CompleteProfilePage.test.jsx`, `ProfilePage.test.jsx`, `CobroManualPage` (monto `inputMode="decimal"`), `CreateClassPage.test.jsx` (cupos `inputMode="numeric"`), `ScannerPanel` (DNI `inputMode="numeric"`): un caso por página.
6. Test "sin regresión": `rg`-style en Vitest que recorre `src/**/*.jsx` con `fs` y falla si encuentra `<input` sin `inputMode`/`type` conocido (opcional; evaluar costo de mantenimiento).
7. Playwright (ampliar `scripts/mobile-walkthrough.mjs`): en `/registro`, `/completar-perfil`, `/recepcion/acceso`, para cada `input` visible `getComputedStyle(el).fontSize >= 16` y `getBoundingClientRect().height >= 44` a 375 px.
Manual: iPhone real o Safari responsive: enfocar DNI y teléfono (teclado numérico/telefónico, sin zoom), enviar con "Ir/Buscar".

### BK-MOB-01 · Bottom nav de staff con menú "Más" (todas las rutas + perfil, tema y logout)
_Prioridad P0 · Tamaño L · Estado en código: ui-parcial · Depende de: BK-MOB-06, BK-MOB-08 · Issue #194 · Ficha: `docs/backlog/items/BK-MOB-01-bottom-nav-staff-menu-mas.md`_

**Contexto:** Bajo `md` (<768 px) el `Sidebar` desaparece y lo único que queda es `AppBottomNav`, que expone 5 (admin) o 6 (recepcionista) ítems fijos. Resultado verificado en código: el admin NO llega a Planes, Clases, Usuarios, Cobros ni Aforo; el recepcionista tiene 6 ítems en una grilla de 5 columnas; y **nadie puede cerrar sesión, ver el perfil ni cambiar el tema en móvil** porque esas tres acciones viven solo en el `Sidebar` oculto. Hay que rediseñar la nav móvil con un ítem "Más" que abre un sheet con el resto de las rutas del rol y las acciones de cuenta.

**Qué hacer:**
(a) una única fuente de verdad `navConfig` consumida por `Sidebar` y `AppBottomNav`; (b) 4 ítems primarios + "Más" por rol; (c) sheet "Más" con el resto de las rutas del rol agrupadas, "Mi perfil", toggle de tema y "Cerrar sesión"; (d) corregir los destinos inconsistentes (`/admin/socios`, `/admin/planes`); (e) tests.

**Archivos:**
- Crear `frontend/src/constants/navConfig.js`, `frontend/src/components/layout/MoreSheet.jsx`, `frontend/src/hooks/useLogout.js`.
- Modificar `Sidebar.jsx` (consumir `navConfig`, `useLogout`, corregir `/membresias`), `AppBottomNav.jsx`, `AppLayout.jsx`.
- Crear tests: `AppBottomNav.test.jsx`, `MoreSheet.test.jsx`, `Sidebar.test.jsx` (hoy inexistentes), `navConfig.test.js`.

**Tests primero:**
Convención: tests co-ubicados `*.test.jsx`, vitest 4 + RTL 16 + jest-dom, `vite.config.js` (`environment: 'jsdom'`, `setupFiles: ./setupTests.js` que solo importa jest-dom). Helpers en `frontend/src/test/test-utils.jsx`: `renderWithProviders(ui, { route, authState })`, `makeAuthedUser('admin' | 'recepcion' | 'socio')`, `resetAllStores()`. Comandos: `cd frontend && npx vitest run src/components/layout`; CI corre `npm run lint` (`--max-warnings 0`), `npx vitest run --coverage` (umbrales 68/68/65/68) y `npm run build`. jsdom no carga Tailwind: no se puede verificar `md:hidden` por layout; se asertan clases y estructura.
Primero escribir (rojo):
1. `navConfig.test.js`: para cada rol, todas las rutas de `NAV_BY_ROLE[rol]` existen en una lista de rutas permitidas para ese rol (copiar la tabla de §7 como fixture) → impide que se liste una ruta que el guard rechaza. Exactamente 4 ítems `mobile: 'primary'` por rol de staff; sin `path` duplicados; ninguna ruta `/membresias`.
2. `AppBottomNav.test.jsx` (admin): renderiza 4 links + botón "Más"; no renderiza Planes/Usuarios hasta abrir "Más"; al abrir, el diálogo contiene links a `/admin/planes`, `/admin/usuarios`, `/recepcion/cobros`, `/recepcion/aforo`, `/configuracion`.
3. Ídem recepcionista: 4 + Más; sin ítem `/admin/usuarios` ni `/configuracion`.
4. Cerrar sesión: click → `useAuthStore.getState().accessToken === null` y navegación a `/login` (usar `MemoryRouter` con `Routes`).
5. Toggle de tema cambia `themeStore.theme`.
6. `rol` des

### BK-MOB-02 · Navegación móvil del socio sin callejones (Dashboard, Perfil y Mis Pagos sin nav; sin logout)
_Prioridad P0 · Tamaño M · Estado en código: roto · Depende de: BK-MOB-01, BK-MOB-06 · Issue #195 · Ficha: `docs/backlog/items/BK-MOB-02-navegacion-movil-socio.md`_

**Contexto:** El socio usa dos layouts distintos: `MemberLayout` (con su propia bottom nav) en Credencial, Clases y Checkout, y `AppLayout` en `/dashboard`, `/perfil` y `/socio/pagos`. En `AppLayout` el `Sidebar` está oculto bajo `md` y `AppBottomNav` devuelve `null` para el rol socio, así que **en esas tres pantallas el socio no tiene ninguna navegación en el celular**. Además "Mis Pagos" (`/socio/pagos`) solo se enlaza desde el Sidebar, o sea que es inalcanzable por UI en móvil, y no existe "Cerrar sesión" para el socio móvil.

**Qué hacer:**
unificar la nav móvil del socio en un único componente usado por `MemberLayout` y por `AppLayout`; agregar acceso a Mis Pagos, Perfil, tema y Cerrar sesión; eliminar la duplicación Inicio/QR; que el admin no vea "Pagar".

**Archivos:**
- Crear `frontend/src/components/layout/SocioBottomNav.jsx` (+ test).
- Modificar `AppBottomNav.jsx` (rama socio), `MemberLayout.jsx` (usar `SocioBottomNav`, quitar nav inline, ajustar padding), `navConfig.js`.
- Tests: ampliar `MemberLayout.test.jsx`; nuevos `SocioBottomNav.test.jsx` y caso socio en `AppBottomNav.test.jsx`.

**Tests primero:**
Convención y comandos: ver BK-MOB-01 §9 (vitest + RTL + `renderWithProviders`, `makeAuthedUser('socio')`; `cd frontend && npx vitest run src/components/layout`). jsdom no aplica Tailwind.
1. `SocioBottomNav.test.jsx`: rol socio → links a `/dashboard`, `/socio/clases`, `/socio/credencial`, `/socio/checkout`, botón "Más"; "Más" abre sheet con `/socio/pagos`, `/perfil`, "Cerrar sesión".
2. Cerrar sesión limpia el store y navega a `/login`.
3. `AppBottomNav.test.jsx` con socio: ya no devuelve `null`.
4. Render de `DashboardPage`/`ProfilePage`/`HistorialPagosPage` con socio incluye `navigation` (landmark `nav`).
5. Admin dentro de `MemberLayout`: no existe link a `/socio/checkout`.
6. `MemberLayout.test.jsx` existente sigue verde (mockea `Sidebar`).
Manual: login como socio → aterriza en `/dashboard` y se ve la nav; entrar a Mis pagos y Perfil y volver; cerrar sesión; a 768 px aparece el Sidebar.

### BK-BUG-07 · Navegación: enlaces que redirigen, ítems duplicados, bottom nav de 6 ítems en grilla de 5, socio sin menú en /dashboard y /perfil, y búsqueda del TopBar que no filtra
_Prioridad P1 · Tamaño M · Estado en código: roto · Depende de: BK-MOB-01 · Issue #166 · Ficha: `docs/backlog/items/BK-BUG-07-navegacion-enlaces-rotos-y-duplicados.md`_

**Contexto:** Solo se documentan defectos de **ruteo/enlaces**; el rediseño del bottom nav (p. ej. menú "Más") pertenece a BK-MOB-01. Hallazgos verificados: el sidebar de admin enlaza `/membresias` (que redirige a `/admin/planes`, por lo que el ítem nunca queda activo); el bottom nav del socio tiene "Inicio" y "QR" apuntando a la misma ruta; el bottom nav del recepcionista tiene 6 ítems en una grilla de 5 columnas; el socio **no tiene ningún menú** en `/dashboard`, `/perfil` ni `/socio/pagos` en mobile; admin y recepcionista usan páginas distintas para "Socios"; la búsqueda del TopBar navega a `/recepcion/socios?search=` pero la página ignora el parámetro. (Lo que NO es un defecto: `/recepcion/socios` y `/recepcion/reportes` sí existen como rutas reales; la hipótesis de que "el nav mobile de admin apunta a rutas que no existen" quedó descartada.)

**Qué hacer:**
apuntar "Membresías" a `/admin/planes` (y renombrar "Planes" o mantener el label); match de ruta activo por prefijo; iconos distintos; unificar el destino de "Socios" por rol; "Inicio" del socio → `/dashboard`; quitar el ítem QR duplicado o diferenciarlo (`/socio/credencial#qr` no es necesario: basta una sola entrada); dar navegación al socio en `AppLayout` (usar `MemberLayout` o mostrar bottom nav de socio) ; que la búsqueda del TopBar filtre; resolver el 6.º ítem del recepcionista (mínimo: 5 ítems; el menú "Más" lo define BK-MOB-01).

**Archivos:**
- `frontend/src/components/layout/Sidebar.jsx`, `AppBottomNav.jsx`, `MemberLayout.jsx`, `frontend/src/constants/navIcons.js`.
- `frontend/src/components/layout/TopBar.jsx` (sin cambios si la página lee el parámetro), `frontend/src/pages/recepcion/GestionSociosPage.jsx`.
- Tests: `frontend/src/components/layout/MemberLayout.test.jsx` (existente) y nuevos `Sidebar.test.jsx`/`AppBottomNav.test.jsx` (no existen: verificado con `fd -i "sidebar|bottomnav"`); `frontend/src/components/ui/SearchBar.jsx`.

**Tests primero:**
Frontend (vitest + RTL; `renderWithProviders({ route, authState })` de `frontend/src/test/test-utils.jsx` siembra el store de auth): `Sidebar` rol admin en `/admin/planes` marca activo el ítem de planes y no hay `href="/membresias"`; en `/admin/clases/crear` queda activo "Clases"; `AppBottomNav` rol recepcionista renderiza ≤ 5 ítems (o el menú Más de BK-MOB-01), rol socio renderiza Inicio/Clases/QR/Pagos/Perfil con `href` únicos (sin duplicados); `DashboardPage` como socio muestra navegación; `GestionSociosPage` en `/recepcion/socios?search=ana` llama `useSociosList` con `search:'ana'`. `cd frontend && npx vitest run src/components/layout src/pages/recepcion`; `npm run lint`.
Manual (375 px, devtools): `socio.activo@winnie.local` → login → `/dashboard` → debe haber forma de llegar a Clases/QR/Perfil; `recepcion@winnie.local` → barra inferior sin ítems cortados; `admin@winnie.local` → buscar "ana" en el TopBar → listado filtrado.

### BK-MOB-03 · TopBar responsive (acciones a íconos / menú, buscador colapsable, toolbar de pestañas) y fix de props ignoradas
_Prioridad P1 · Tamaño M · Estado en código: roto · Depende de: BK-MOB-07, BK-BUG-03 · Issue #196 · Ficha: `docs/backlog/items/BK-MOB-03-topbar-responsive-acciones.md`_

**Contexto:** `TopBar` es una fila `flex justify-between px-6 py-4` sin `flex-wrap`, sin truncado y con `h1` en `text-2xl`. Las páginas le inyectan 2-3 botones con texto, toggles de pestañas y un buscador, por lo que a 375 px el contenido se desborda, se corta o empuja el título. Además dos páginas le pasan props que `TopBar` no soporta (`actions`, `icon`), lo que deja **sin renderizar el botón "Crear staff"** de Usuarios (también en escritorio).

**Qué hacer:**
(a) `TopBar` responsive (padding, truncado, `flex-wrap`, sticky opcional); (b) nueva prop `actions` con modo ícono/menú en móvil; (c) slot `toolbar` para toggles y navegación de semana; (d) buscador colapsable; (e) migrar las páginas listadas; (f) migrar el botón "Crear staff" de `AdminUsuariosPage` al contrato `actions` (el fix funcional de que hoy no se renderiza es BK-BUG-03; coordinar para no duplicar); (g) tests.

**Archivos:**
- Modificar `components/layout/TopBar.jsx` (+ `ActionsMenu` interno o `components/layout/TopBarActions.jsx`).
- Modificar `components/recepcion/ReportExportButtons.jsx` (prop `compact`).
- Modificar las 9 páginas listadas en §7 (solo la llamada a `TopBar`).
- Crear `components/layout/TopBar.test.jsx` (hoy inexistente). Actualizar tests de páginas que dependen del texto de los botones (`ClassSchedulePage.handlers.test.jsx`, `AdminPlanesPage.handlers.test.jsx`, `ReportesPage.handlers.test.jsx`, `CreateClassPage.handlers.test.jsx`, `AdminSociosPage.handlers.test.jsx`, `GestionSociosPage.test.jsx`): como en jsdom no hay CSS, tanto el botón-ícono como el de texto existirían → asegurar un único elemento accesible por `name` (usar `aria-label` en el botón-ícono y `hidden md:inline` en el texto sin duplicar nodos).

**Tests primero:**
Convención y comandos: ver BK-MOB-01 §9 (vitest + RTL, `renderWithProviders`; `cd frontend && npx vitest run src/components/layout/TopBar.test.jsx`). jsdom no aplica CSS → se testea estructura/atributos y se complementa con Playwright.
1. `TopBar.test.jsx`: renderiza `title`, `subtitle`, `Badge` "En Vivo" con `showLive`; `h1` tiene clases `truncate` y `text-lg md:text-2xl`.
2. Con `actions`, cada acción aparece como botón accesible por `name` (`getByRole('button', { name: 'Nuevo plan' })`) y dispara `onClick`.
3. `mobile: 'menu'`: el botón "Más acciones" existe y al hacer click lista la acción; `mobile: 'hidden'` no aparece en el menú.
4. `showSearch`: botón "Buscar socio" alterna el form; submit navega a `/recepcion/socios?search=...` (comportamiento actual de `TopBar.jsx:25-31`).
5. **Regresión del bug (BK-BUG-03 señala que el test existente lo oculta porque mockea `TopBar`: NO mockear `TopBar` acá):** `AdminUsuariosPage` (con `renderWithProviders` y auth admin, mockeando `useStaffList`/`useResendActivation` de `hooks/queries/useStaff`) → `getByRole('button', { name: /crear staff/i })` existe y al click abre `StaffFormModal`.
6. Playwright (extender `frontend/scripts/mobile-walkthrough.mjs`, hoy solo rutas socio con `devices['iPhone SE']`): para admin/recepcionista en `/dashboard`, `/admin/planes`, `/admin/clases`, `/recepcion/reportes` a 375, 768 y 1024: `document.documentElement.scrollWidth <= window.innerWidth` y cada botón del header con `getBoundingClientRect()` ≥ 44×4

## B9 — Clases: UI, lista de espera y asistencia · Franco · ~8 días · rama `feat/clases-ui-asistencia`

**Commit (squash):** `feat(classes): waitlist promotion, admin calendar, member classes and real attendance actions`

**En la descripción del PR:** Closes #172 · Closes #176 · Closes #177 · Closes #164

**Contexto.** 4 fichas agrupadas por zona de código. Hacelas en el orden de la lista.

### BK-CLS-03 · Lista de espera - "Habilitar" es falso, promoción incompleta y sin notificación al promovido
_Prioridad P1 · Tamaño M · Estado en código: roto · Depende de: BK-CLS-02, BK-CLS-04 · Issue #172 · Ficha: `docs/backlog/items/BK-CLS-03-lista-de-espera-promocion-y-notificacion.md`_

**Contexto:** El backend sabe poner socios en lista de espera y promover automáticamente al primero cuando un socio cancela, pero: (a) el botón "Habilitar" de la pantalla de asistencia solo muestra un toast de éxito sin llamar a ningún endpoint; (b) la promoción automática solo ocurre en un camino (cancelación del socio) y no en otros que liberan lugar; (c) el socio promovido nunca se entera (no hay email ni push); (d) la UI del staff muestra datos inexistentes de los anotados. Se genera una falsa sensación de que se habilitó a alguien.

**Qué hacer:**
- Servicio único `promover_de_espera(clase)` (atómico) usado por: cancelación del socio, borrado de inscripción por staff, aumento de `cupo_maximo` y acción manual.
- Endpoint de promoción manual por staff.
- Email al socio promovido (template + `enqueue_email`).
- UI de "Habilitar" real con estados de loading/error y posición en la fila.
- Corregir `lista_espera_max || 5`.

**Archivos:**
- `backend/apps/classes/services.py`: `promover_de_espera(clase, *, forzar=False)` con `transaction.atomic()` + `select_for_update()`; refactor de `cancelar_inscripcion` para usarla.
- `backend/apps/classes/views.py`: `@action(detail=True, methods=['post'], url_path='promover')` en `InscripcionClaseViewSet`; `perform_destroy` que promueve si la baja era confirmada.
- `backend/apps/classes/signals.py` (o servicio): al subir `cupo_maximo` en update de `Clase`, promover hasta llenar.
- `backend/apps/common/templates/emails/clase_promovida.html` (extiende `emails/_base.html`, como `clase_cancelada.html`).
- `backend/apps/classes/serializers.py`: `posicion_espera`.
- `frontend/src/hooks/queries/useClassAttendees.js`, `frontend/src/pages/AttendancePage.jsx`, `frontend/src/components/classes/ClassListDetailView.jsx:269`.

**Tests primero:**
Backend (`backend/apps/classes/tests/test_waitlist.py`, `APITestCase`, `make_user_factory`/`make_socio_factory`; `core.settings.test` usa `CELERY_TASK_ALWAYS_EAGER=True` y `EmailBackend` locmem, así que se verifica con `django.core.mail.outbox` o `patch('apps.classes.services.enqueue_email')` como en `test_soft_cancel.py`):
- Promover manual: en espera + cupo libre -> 200 y `en_espera=False`; sin cupo -> 400; ya confirmado -> 400; clase cancelada -> 400; socio -> 403.
- Borrar inscripción confirmada por staff promueve a la más antigua.
- Subir `cupo_maximo` de 2 a 4 con 3 en espera promueve 2.
- Se encola email al promovido (`category='clase_promovida'`); sin email del usuario no rompe (`socio.usuario.email` vacío).
- Concurrencia: dos `inscribir` simultáneos con 1 cupo no superan `cupo_maximo` (test con `TransactionTestCase` o verificación de lock).
- Orden FIFO por `created_at`.
Frontend (`frontend/src/pages/AttendancePage.test.jsx`, vitest + RTL): click en "Habilitar" llama al POST (mock de `api.post`), muestra toast, deshabilita sin cupo, muestra error del backend.
Manual: crear clase con cupo 1, anotar 2 socios (`socio.activo@winnie.local` + otro del seed), el segundo queda en espera; staff marca/cancela y "Habilita"; verificar email en Mailtrap/consola.

### BK-CLS-07 · Calendario admin - grilla de horas fija (clases a las 07:30 invisibles), sin domingo, navegación de semanas decorativa y sin mobile
_Prioridad P1 · Tamaño M · Estado en código: ui-parcial · Depende de: BK-CLS-01, BK-CLS-09, BK-CLS-10 · Issue #176 · Ficha: `docs/backlog/items/BK-CLS-07-calendario-admin-horario-fijo-domingo-y-semanas.md`_

**Contexto:** La vista "Calendario" de `/admin/clases` tiene la grilla 08:00-22:00 hardcodeada y solo columnas lunes-sábado. Las clases fuera de ese rango (por ejemplo la "CrossFit WOD Pro" del seed, a las 07:30) o en domingo no se dibujan nunca, aunque el backend las acepta y cuentan en el subtítulo "N clases programadas". Los botones "Sem ant./Sem sig." solo cambian los rótulos de fecha: como `Clase` es una plantilla semanal, todas las semanas muestran lo mismo. La grilla de 7 columnas no tiene variante mobile.

**Qué hacer:**
- Rango de horas derivado de `GymConfig` (`hora_apertura`-`hora_cierre`) y ampliado automáticamente si hay una clase fuera de rango.
- Posicionar por minuto (clase 08:45 con offset) o, mínimo, agrupar por hora mostrando `HH:MM`.
- Mostrar domingo cuando exista al menos una clase en domingo (o siempre, configurable).
- Normalizar la hora a `HH:MM` en la UI.
- Navegación de semanas honesta: etiquetas correctas (mes de inicio/fin), botón "Hoy", y mientras no exista BK-CLS-09, rotular "Plantilla semanal" (sin fechas) o no ofrecer navegación.
- Variante mobile (< md): selector de día + lista del día (como `ClasesPage`).
- Agregar `boxeo` y `hiit` a `DISCIPLINAS_CONFIG` y `index.css`.

**Archivos:**
- `frontend/src/components/classes/ClassCalendarView.jsx`: rango dinámico, domingo, minutos, responsive.
- `frontend/src/pages/ClassSchedulePage.jsx`: `diasSemana` incluye domingo condicional, etiqueta de semana, botón "Hoy", `isError`.
- `frontend/src/constants/disciplinas.js`, `frontend/src/index.css`: `boxeo`, `hiit`.
- `frontend/src/utils/clases.js` (nuevo) + tests.
- `backend/apps/classes/serializers.py`: `hora_fin` (opcional).

**Tests primero:**
Frontend (vitest + RTL; `frontend/src/components/classes/ClassCalendarView.test.jsx`, `frontend/src/pages/__tests__/ClassSchedulePage.test.jsx`, nuevo `frontend/src/utils/clases.test.js`; correr `cd frontend && npx vitest run src/components/classes src/pages src/utils`):
- Clase a las `07:30:00` con `GymConfig` 07:00-23:00 aparece en la fila 07:00; clase a las `23:15` extiende el rango.
- Clase en domingo muestra columna Domingo; sin clases en domingo, no se muestra (según decisión).
- `formatHora('07:30:00') === '07:30'`.
- `getWeekDays` cruzando fin de mes y de año, etiqueta correcta.
- `weekOffset` y botón "Hoy" vuelven a 0.
- `boxeo`/`hiit` usan su color.
- Mobile: con viewport 375 renderiza selector de día (mock de `matchMedia`).
Backend: `hora_fin` en el serializer (en `test_class_contract_fields.py`).
Manual: `admin@winnie.local` -> `/admin/clases` con el seed (la clase de 07:30 debe verse); redimensionar a 375 px y a 768 px.

### BK-CLS-08 · Clases del socio (mobile) - sin lista de espera, "hoy" erróneo de noche, reservas sin día y filtros incompletos
_Prioridad P1 · Tamaño M · Estado en código: ui-parcial · Depende de: BK-CLS-01, BK-CLS-03, BK-CLS-04, BK-CLS-09 · Issue #177 · Ficha: `docs/backlog/items/BK-CLS-08-clases-del-socio-movil-espera-fecha-y-filtros.md`_

**Contexto:** `/socio/clases` ("Agenda y Reservas") permite filtrar por día, turno, disciplina y texto, reservar y cancelar. Pero: cuando una clase se llena el botón se deshabilita ("Sin cupos disponibles") y el socio nunca puede anotarse en lista de espera aunque el backend lo soporta; después de las 21:00 (hora Argentina) el chip "Hoy" muestra las clases de mañana por un bug de UTC; "Mis reservas" no dice qué día es cada clase; el aviso "se reservó con éxito" aparece incluso si el backend lo dejó en espera; y falta el filtro por sala/instructor/"con cupo".

**Qué hacer:**
- Fechas locales (zona `America/Argentina/Buenos_Aires`) en `generateDaysAgenda` y `selectedDay`.
- Estado de lista de espera en la tarjeta ("Anotarme en lista de espera (2/5)", "Estás #2 en lista de espera", "Salir de la lista").
- Toasts correctos según `en_espera` y `promovido_de_espera`.
- Mostrar día de la semana (y próxima fecha) en "Mis reservas".
- Texto de cancelación basado en `cancelacion_horas`.
- Filtros extra: "Solo con lugar", sala, instructor (chips/`Select`), turno "Noche".
- Rótulos de disciplina alineados al backend.
- Ocultar/deshabilitar reserva para `administrador`.

**Archivos:**
- `frontend/src/utils/agenda.js` (+ test), `frontend/src/pages/socio/ClasesPage.jsx`, `frontend/src/components/socio/ClassCard.jsx`, `frontend/src/hooks/queries/useInscripciones.js`, `frontend/src/constants/clases.js`.
- `backend/apps/classes/serializers.py`: `user_en_espera`, `user_posicion_espera`, `en_lista_espera`.
- Tests correspondientes.

**Tests primero:**
Frontend (vitest + RTL; `renderWithProviders`, `resetAllStores`, `seedAuthStore`, `makeAuthedUser('socio')` de `frontend/src/test/test-utils.jsx`; `cd frontend && npx vitest run src/pages/socio src/components/socio src/utils src/hooks`):
- `generateDaysAgenda` con `vi.setSystemTime('2026-10-13T01:30:00Z')` (22:30 ART del 12/10): el primer chip es 12/10 "Hoy" y `selectedDay` es 12/10 (no 13/10).
- `ClassCard`: llena con espera libre muestra "Anotarme en lista de espera"; con `isWaitlisted` muestra "Estás #2..." y "Salir"; llena y espera llena muestra mensaje sin botón.
- `useInscripciones`: `inscribir` con `en_espera:true` dispara el toast de lista de espera.
- "Mis reservas" muestra el día; el texto de cancelación usa `cancelacion_horas`.
- Filtro "Solo con lugar" envía `cupo_disponible=true`.
Backend (`backend/apps/classes/tests/test_class_contract_fields.py`): `GET` como socio en espera devuelve `user_en_espera=true` y `user_posicion_espera=1`; `en_lista_espera` correcto.
Manual (Chrome DevTools, viewport 375x812): `socio.activo@winnie.local`; llenar una clase con cupo 1 y ver el botón de espera.

### BK-BUG-05 · AttendancePage: "Habilitar" y "Cerrar asistencia" son simulados, la lista de espera muestra datos vacíos y el plan está fijo
_Prioridad P1 · Tamaño M · Estado en código: ui-parcial · Depende de: BK-BUG-04, BK-CLS-01 · Issue #164 · Ficha: `docs/backlog/items/BK-BUG-05-asistencia-acciones-simuladas-y-lista-espera-vacia.md`_

**Contexto:** Una vez que se llega a la página (ver BK-BUG-04), varias acciones solo muestran toasts de éxito sin llamar al backend ("Habilitar" de la lista de espera, "Cerrar asistencia"), la lista de espera lee campos que el serializer no devuelve (`nombre`, `plan`), la columna "DNI" muestra el número de socio y la columna "Plan" siempre dice "Pase". El usuario cree que guardó/promovió cuando no pasó nada.

**Qué hacer:**
quitar/implementar "Habilitar" (PATCH `en_espera:false` con validación de cupo en backend), corregir nombres de campos de la lista de espera, columna "Nº socio" honesta, quitar "Pase" fijo (mostrar plan solo si el backend lo devuelve), "Cerrar asistencia" → navegar a `/admin/clases` sin toast engañoso (o implementar cierre real si el negocio lo define).

**Archivos:**
- `frontend/src/pages/AttendancePage.jsx`, `frontend/src/hooks/queries/useClassAttendees.js`, `frontend/src/pages/AttendancePage.test.jsx`.
- `backend/apps/classes/serializers.py` (campos de lectura), `backend/apps/classes/views.py`/`serializers.py` (validación de cupo), `backend/apps/classes/tests/`.

**Tests primero:**
Backend (pytest; `auth_client`, `make_socio`, `make_plan`, `make_membresia` de `backend/conftest.py`; `cd backend && pytest apps/classes -q`): PATCH `en_espera:false` con cupo libre → 200; con cupo lleno → 400; `socio` → 403; serializer incluye `socio_dni`/`plan_nombre` (si se aprueba).
Frontend (vitest + RTL, mocks de hooks como en `AttendancePage.test.jsx`): lista de espera muestra nombre real (`socio_nombre socio_apellido`); "Habilitar" llama a la mutación (no hay toast hasta `onSuccess`); "Cerrar asistencia" ya no muestra el toast falso; CSV no contiene "Pase" fijo. `cd frontend && npx vitest run src/pages/AttendancePage.test.jsx`.
Manual: clase con cupo lleno y un socio en espera → cancelar una inscripción → "Habilitar".

## B10 — Mobile: tablas, calendario, tablet, a11y y PWA · Rodrigo · ~21 días · rama `feat/mobile-tablas-pwa`

**Commit (squash):** `feat(mobile): card tables, agenda calendar, tablet layout, accessibility and installable PWA`

**En la descripción del PR:** Closes #197 · Closes #198 · Closes #202 · Closes #204 · Closes #206 · Closes #203

**Contexto.** 6 fichas agrupadas por zona de código. Hacelas en el orden de la lista.

### BK-MOB-04 · DataTable con modo cards en móvil (+ hook useMediaQuery y helper de viewport para tests)
_Prioridad P1 · Tamaño L · Estado en código: ui-parcial · Depende de: BK-MOB-07 · Issue #197 · Ficha: `docs/backlog/items/BK-MOB-04-datatable-modo-cards-movil.md`_

**Contexto:** Todas las tablas de la app son `<table>` dentro de un `overflow-x-auto`: a 375 px el usuario tiene que hacer scroll horizontal para ver columnas (Socios tiene 6 + acciones) y los botones de acción de la última columna quedan fuera de pantalla. No existe vista de cards. Esta ficha propone un modo `cards` en `DataTable` y migrar los tres consumidores que hoy no lo usan o no pueden adaptarse.

**Qué hacer:**
(a) hook `useMediaQuery`; (b) modo cards en `DataTable` (prop `mobileMode`, `col.mobile`); (c) control de ordenamiento móvil; (d) skeleton de cards; (e) migrar `AdminUsuariosPage` y `HistorialPagosPage` a `DataTable`; (f) `Pagination` compacta; (g) helper de tests de viewport.

**Archivos:**
- Crear `frontend/src/hooks/useMediaQuery.js` (+ test), `frontend/src/test/viewport.js` (helper), `frontend/src/components/ui/DataCardList.jsx` (interno).
- Modificar `ui/DataTable.jsx`, `ui/Pagination.jsx`, `ui/FilterPanel.jsx`, `ui/SearchBar.jsx`, `admin/SocioColumns.jsx` (agregar `mobile`), `pages/admin/AdminSociosPage.jsx` y `pages/recepcion/GestionSociosPage.jsx` (botones de acción 44 px), `pages/admin/AdminUsuariosPage.jsx`, `pages/socio/HistorialPagosPage.jsx`.
- Ampliar `DataTable.test.jsx`; crear tests de `Pagination`/`useMediaQuery`.

**Tests primero:**
Convención y comandos: ver BK-MOB-01 §9. Helper nuevo `frontend/src/test/viewport.js`:
```js
export function setViewport(width) {
  window.innerWidth = width
  window.matchMedia = vi.fn().mockImplementation((query) => {
    const max = /max-width:\s*(\d+)px/.exec(query)
    const min = /min-width:\s*(\d+)px/.exec(query)
    const matches = (max ? width <= +max[1] : true) && (min ? width >= +min[1] : true)
    return { matches, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
             addListener: vi.fn(), removeListener: vi.fn(), onchange: null, dispatchEvent: vi.fn() }
  })
}
```
(restaurar en `afterEach`). Primero, en rojo:
1. `useMediaQuery.test.js`: sin `matchMedia` devuelve `defaultValue`; con `setViewport(375)` y query `(max-width: 767px)` → `true`; reacciona al evento `change`.
2. `DataTable.test.jsx` (nuevo `describe('mobile cards')` con `setViewport(375)`): no existe `<table>`; hay una card por fila con `title` y `badge`; las columnas `hidden` no se muestran; `meta` muestra etiqueta y valor; `onRowClick` se dispara al click en el cuerpo; `renderActions` se renderiza una vez por fila y el click en acción **no** dispara `onRowClick`.
3. Orden móvil: cambiar el `select` llama `onSort('nombre')`; botón de dirección alterna `'-nombre'`.
4. `mobileMode="scroll"` mantiene la tabla a 375 px.
5. Con `setViewport(1024)` o sin `matchMedia`: los 11 tests actuales siguen verdes (regresión).
6. `AdminUsuariosPage`: a 375 px la card de un staff muestra ema

### BK-MOB-05 · Calendario de clases (staff) como agenda por día en móvil y tablet
_Prioridad P1 · Tamaño M · Estado en código: roto · Depende de: BK-MOB-04, BK-MOB-03, BK-CLS-07 · Issue #198 · Ficha: `docs/backlog/items/BK-MOB-05-calendario-clases-agenda-movil.md`_

**Contexto:** El calendario semanal de staff (`ClassCalendarView`) es una grilla fija de **7 columnas** (hora + 6 días) y 15 filas de `min-h-[110px]`, sin scroll horizontal ni variante móvil: a 375 px cada columna mide ~46 px y las tarjetas de clase (texto de 9–11 px) quedan ilegibles; a 768–1023 px, con el Sidebar de 16 rem ocupando 256 px, cada columna mide ~60 px. El socio, en cambio, ya tiene una agenda por día (`socio/ClasesPage`). Falta lo equivalente para staff.

**Qué hacer:**
(a) `ClassAgendaView` para < `lg` (1024 px) con selector de día y lista vertical; (b) extraer la lógica de "clases de un día" a una util compartida; (c) mover navegación de semana al toolbar (BK-MOB-03); (d) targets táctiles y tipografía mínima en las tarjetas; (e) tests.

**Archivos:**
- Crear `utils/classSchedule.js`, `components/classes/ClassAgendaView.jsx` (+ `.test.jsx`), opcional `components/ui/DaySelector.jsx`.
- Modificar `components/classes/ClassCalendarView.jsx` (usar la util; hacer la tarjeta un `button`), `pages/ClassSchedulePage.jsx`.
- Tests: `utils/classSchedule.test.js`; ampliar `ClassSchedulePage` tests (`pages/__tests__/ClassSchedulePage.test.jsx`, `pages/ClassSchedulePage.handlers.test.jsx`).

**Tests primero:**
Convención y comandos: ver BK-MOB-01 §9; helper de viewport `setViewport(width)` y `useMediaQuery` de BK-MOB-04 (`frontend/src/test/viewport.js`).
1. `classSchedule.test.js`: `getClassesForDay` devuelve clases por `dias_recurrencia` y por `dia` con acentos ("Miércoles"/"miercoles"); ignora el resto; `sortByHora` ordena.
2. `ClassAgendaView.test.jsx`: con 2 clases el lunes y 1 el martes, por defecto muestra el día seleccionado; click en la pestaña "Mar" cambia la lista; `role="tab"` con `aria-selected`; botón "Lista" llama `onOpenAttendees` y **no** `onSelectClass`; clase llena muestra "LLENO"; día vacío muestra el mensaje.
3. `ClassSchedulePage`: con `setViewport(375)` renderiza agenda (no existe `grid-cols-7`), con `setViewport(1280)` o sin `matchMedia` renderiza `ClassCalendarView` (los tests actuales no cambian).
4. `ClassCalendarView.test.jsx` sigue verde tras el refactor a la util.
5. Playwright (ampliar `scripts/mobile-walkthrough.mjs`): `/admin/clases` a 375 y 768: sin overflow horizontal y las tarjetas con texto ≥ 14 px (`getComputedStyle`).
Manual: seed admin; a 375 px elegir distintos días, abrir "Lista" y tocar una clase (pasa a Lista y Detalle).

### BK-MOB-09 · Layout de tablet (768–1024 px) y orientación landscape
_Prioridad P2 · Tamaño L · Estado en código: no-existe · Depende de: BK-MOB-01, BK-MOB-04, BK-MOB-05, BK-MOB-08 · Issue #202 · Ficha: `docs/backlog/items/BK-MOB-09-tablet-landscape-breakpoints.md`_

**Contexto:** La app solo distingue dos estados: móvil (< 768 px: sin Sidebar, bottom nav) y escritorio (≥ 768 px: Sidebar fijo de 256 px). No hay variante de tablet ni tratamiento de orientación. Consecuencias verificadas en el código: a 768 px el contenido útil mide 512 px (el Sidebar se come un tercio), a 1024 px 768 px; y un teléfono en landscape (p. ej. 812×375) cumple `min-width: 768px` y recibe el layout de escritorio con un Sidebar de pantalla completa y apenas ~300 px de alto útil. La tablet es además el dispositivo natural de la estación de recepción (`AccesoTerminalPage`).

**Qué hacer:**
(a) estrategia de layout para 768–1023 px: Sidebar compacto (rail de íconos) o mantener la bottom nav hasta `lg`; (b) variante de orientación: un teléfono en landscape no debe recibir el layout de escritorio; (c) ajuste de grillas por ancho disponible; (d) layout de dos paneles para la terminal de accesos en tablet; (e) quitar el marco `sm:max-w-sm` del socio; (f) tests y Playwright a 375/768/1024.

**Archivos:**
- Modificar `tailwind.config.js` (`screens.desk`, `spacing.sidebar-rail`), `components/layout/{Sidebar,AppLayout,AppBottomNav,MemberLayout}.jsx`, `pages/recepcion/{AccesoTerminalPage,AforoMonitorPage,GestionSociosPage,CobroManualPage}.jsx`, `components/recepcion/ValidationResult.jsx`.
- Ampliar `frontend/scripts/mobile-walkthrough.mjs` (viewports y roles) y crear `Sidebar.test.jsx` si no lo crea BK-MOB-01.

**Tests primero:**
Convención y comandos: ver BK-MOB-01 §9; jsdom no aplica media queries → RTL asserta clases; el comportamiento real se verifica con Playwright.
1. `Sidebar.test.jsx`: `aside` con clases `md:w-sidebar-rail lg:w-sidebar`; cada `NavLink` expone `aria-label`/`title` con su label aun cuando el texto se oculta con `lg:inline`.
2. Tests de clase en `AppBottomNav`/`MemberLayout`/`AppLayout`: usan `desk:hidden`/`hidden desk:flex`/`pb-14 desk:pb-0`.
3. Test de configuración: importar `tailwind.config.js` y comprobar `theme.extend.screens.desk.raw` y `spacing['sidebar-rail']`.
4. Playwright (`npm run mobile:check`, ampliado): para `/dashboard`, `/recepcion/acceso`, `/recepcion/aforo`, `/admin/clases`, `/admin/socios` con admin y recepcionista y `/socio/credencial`, `/socio/clases` con socio, en `375×812`, `812×375`, `768×1024`, `1024×768`: sin overflow horizontal (`scrollWidth <= innerWidth`), nav esperada visible (`aside` o `nav`), y a 812×375 el área de contenido ≥ 250 px de alto. Guardar capturas en `docs/qa/screenshots/mobile/` (ruta ya usada por el script).
Manual: tablet o emulación iPad (768×1024 y 1024×768), rotación en teléfono.

### BK-MOB-11 · Accesibilidad móvil (contraste de tokens, foco visible, targets de 44 px, landmarks y elementos clickeables)
_Prioridad P2 · Tamaño M · Estado en código: ui-parcial · Depende de: BK-MOB-07 · Issue #204 · Ficha: `docs/backlog/items/BK-MOB-11-accesibilidad-movil-contraste-foco-targets.md`_

**Contexto:** La base ya tiene buenas prácticas puntuales (roles ARIA en pestañas de `GestionSociosPage`, `aria-sort` en `DataTable`, `role="alert"` en avisos de pago, modo de alto contraste para la credencial), pero hay brechas sistemáticas que pegan más en el celular: el color terciario del tema claro y oscuro no llega al contraste mínimo, el blanco sobre `primary` (`#ff5a36`) mide 3,1:1, hay 55 usos de `outline-none` frente a 39 estilos de foco, varios elementos clickeables son `div`/`tr` sin teclado, los targets táctiles son de 28–36 px, y no hay landmarks ni nombres accesibles consistentes en las navegaciones.

**Qué hacer:**
(a) corregir tokens de color (terciario, primario con texto, error) o su uso; (b) regla global de foco visible; (c) targets de 44 px (con BK-MOB-04/07); (d) semántica de filas/tarjetas clickeables; (e) `aria-label` en navegaciones y acciones de ícono, textos en español; (f) skip link; (g) anunciar resultados del escáner con `role="status"`/`aria-live`; (h) `prefers-reduced-motion`; (i) toggle de alto contraste accesible desde "Más"/Perfil; (j) tests con `jest-axe` en componentes clave.

**Archivos:**
- Modificar `index.css`, `tailwind.config.js` (token primario), `components/ui/{Button,Pagination,Modal,DataTable}.jsx`, `components/layout/{AppLayout,AppBottomNav,MemberLayout,Sidebar,TopBar}.jsx`, `components/classes/ClassCalendarView.jsx`, `components/recepcion/ValidationResult.jsx`, `pages/socio/CredencialDigitalPage.jsx`, `pages/{RegisterPage,CompleteProfilePage,ProfilePage}.jsx`.
- `package.json`: devDependency `jest-axe` (propuesta; versión a confirmar compatible con vitest 4: No verificado) y `vitest.d.ts`/setup (`expect.extend(toHaveNoViolations)` en `setupTests.js`).
- Tests nuevos: `a11y.test.jsx` por componente clave; `contrast.test.js` (ver §9).

**Tests primero:**
Convención y comandos: ver BK-MOB-01 §9 (vitest + RTL; `renderWithProviders`; `cd frontend && npx vitest run <ruta>`).
1. `contrast.test.js`: lee `index.css` (regex sobre las variables `--color-*`), mezcla alfa sobre el fondo y calcula la razón WCAG; falla si `text-secondary` o `text-tertiary` < 4,5:1 sobre `bg-surface`/`bg-base` en `:root` y `.dark`. Funciona sin jsdom CSS.
2. `Button.test.jsx`: variante `primary` usa la clase aprobada de contraste (la que se decida) y `size="icon"` mide `h-11 w-11`.
3. `AppBottomNav`/`MemberLayout`/`Sidebar` tests: `getByRole('navigation', { name: 'Navegación principal' })`; el botón de usuario expone `aria-expanded` que alterna.
4. `DataTable.test.jsx`: con `onRowClick`, la fila es alcanzable con Tab y Enter dispara el callback; las acciones internas no.
5. `ClassCalendarView.test.jsx`: cada clase es un `button` con nombre accesible (`nombre`, hora).
6. `ValidationResult` test: `getByRole('status')` en éxito/aviso y `getByRole('alert')` en error.
7. `jest-axe` en `Modal`, `DataTable`, `AppBottomNav`, `TopBar`: `expect(await axe(container)).toHaveNoViolations()`.
8. Manual: VoiceOver (iOS) y TalkBack (Android) recorriendo Login → Dashboard → Socios → un modal; teclado externo (Tab/Shift+Tab, Enter/Espacio, Escape); Lighthouse Accessibility ≥ 95 en `/login`, `/dashboard`, `/admin/socios`; probar a pleno sol con alto contraste.

### BK-MOB-13 · Rendimiento percibido en móvil (code-splitting por ruta, fuentes sin @import bloqueante, skeletons de carga)
_Prioridad P3 · Tamaño M · Estado en código: ui-parcial · Depende de: — · Issue #206 · Ficha: `docs/backlog/items/BK-MOB-13-rendimiento-percibido-lazy-routes-fuentes-skeletons.md`_

**Contexto:** Hay evidencia concreta de tres costos para el primer render en un teléfono con red media: (1) todas las páginas se importan de forma estática en `App.jsx` salvo una, así que el socio descarga también el código de reportes, planes, usuarios, etc.; (2) la tipografía se pide con un `@import url(...)` dentro de `index.css`, que bloquea el render y encadena peticiones; (3) varias pantallas muestran texto "Cargando..." en vez de skeletons. La ficha es P3 porque **no hay métricas medidas todavía** (ver §9): el primer paso es medir.

**Qué hacer:**
(a) medir (Lighthouse móvil + analizador de bundle) y fijar un presupuesto; (b) `React.lazy` por grupo de rutas (admin/recepción vs socio) con `Suspense`; (c) `manualChunks` de vendors; (d) fuentes con `<link rel="preconnect">` + `<link rel="stylesheet">` en `index.html` (y/o autoalojadas); (e) skeletons para calendario, clases del socio, credencial, usuarios y reportes; (f) tests.

**Archivos:**
- Modificar `src/App.jsx`, `vite.config.js`, `index.html`, `src/index.css`, `pages/ClassSchedulePage.jsx`, `pages/socio/{ClasesPage,CredencialDigitalPage}.jsx`, `pages/admin/AdminUsuariosPage.jsx`, `package.json`.
- Crear `components/ui/RouteSkeleton.jsx` (+ test), informe de línea base en `docs/qa/` (opcional).

**Tests primero:**
Convención y comandos: ver BK-MOB-01 §9.
1. Línea base (manual, previa): Lighthouse móvil en `/login`, `/socio/credencial`, `/dashboard` + reporte del visualizador; guardar números.
2. `RouteSkeleton.test.jsx`: renderiza ≥ 3 `Skeleton` y es estable (sin texto "Cargando").
3. `App.test.jsx` (nuevo; no existe hoy): con `renderWithProviders(<App/>, { route: '/admin/socios', authState: { accessToken: 't', user: makeAuthedUser('admin') } })` (mockeando la página con `vi.mock`) se ve primero el fallback y luego la página (`findByText`); con rol socio en `/admin/socios` redirige sin cargar el chunk de admin.
4. Tests de páginas: `ClassSchedulePage` con query en `isLoading` renderiza skeletons (`getAllByTestId('skeleton')` si se agrega `data-testid`, o por clase `animate-pulse`) en lugar de "Cargando calendario...". Actualizar los tests existentes que busquen ese texto (`pages/__tests__/ClassSchedulePage.test.jsx`, `pages/socio/ClasesPage.test.jsx`, `pages/socio/CredencialDigitalPage.test.jsx`).
5. Test estático de `index.html`: contiene `rel="preconnect"` a `fonts.googleapis.com` y `index.css` ya no contiene `@import url(`.
6. Presupuesto en CI (opcional): script que falle si `dist/assets/index-*.js` supera el umbral definido tras la medición inicial (No definido: decidir con los números de la línea base).
7. Después de cambiar: repetir Lighthouse y comparar; verificar con la pestaña Network (throttling "Slow 4G") que el socio no descarga los chunks de admin.

### BK-MOB-10 · PWA instalable (manifest, service worker de shell, íconos) y ampliar Wake Lock más allá de la credencial
_Prioridad P2 · Tamaño L · Estado en código: ui-parcial · Depende de: BK-MOB-08, BK-MOB-12 · Issue #203 · Ficha: `docs/backlog/items/BK-MOB-10-pwa-instalable-y-wake-lock.md`_

**Contexto:** La app se usa como web móvil (la credencial QR del socio es el caso estrella) pero no es instalable: no hay `manifest`, ni service worker, ni íconos, y `index.html` apunta a un `/vite.svg` que no existe (no hay carpeta `frontend/public`). El PR #110 implementó Wake Lock + "brillo" + Fullscreen para la credencial; esta ficha documenta sus límites reales y propone extender el uso a la terminal de accesos y al monitor de aforo, además de la instalabilidad.

**Qué hacer:**
(a) `manifest.webmanifest` + íconos (192/512/maskable, apple-touch-icon 180) en `frontend/public/`; (b) service worker solo de *app shell* con actualización por aviso; (c) UI de instalación (Android `beforeinstallprompt` + instrucciones iOS); (d) Wake Lock en la terminal de accesos y opcionalmente en el monitor de aforo; (e) indicador discreto del estado del Wake Lock en la credencial; (f) cabeceras de Vercel para `sw.js`/manifest; (g) tests y checklist de Lighthouse/dispositivos.

**Archivos:**
- Crear `frontend/public/icons/*` (favicon, 192, 512, maskable, apple-touch), `frontend/pwa-manifest.js`, `frontend/src/hooks/usePwaInstall.js` (+ test), componente `InstallAppButton.jsx`.
- Modificar `frontend/index.html`, `frontend/vite.config.js` (plugin PWA), `frontend/package.json`, `frontend/vercel.json`, `pages/recepcion/AccesoTerminalPage.jsx`, `pages/recepcion/AforoMonitorPage.jsx`, `pages/socio/CredencialDigitalPage.jsx`, `pages/ProfilePage.jsx`, `components/layout/MoreSheet.jsx` (BK-MOB-01).

**Tests primero:**
Convención y comandos: ver BK-MOB-01 §9.
1. `pwa-manifest.test.js`: campos obligatorios (`name`, `short_name`, `start_url`, `display: 'standalone'`, `icons` con 192 y 512 y uno `maskable`); cada `src` existe en `frontend/public/` (`fs.existsSync`).
2. `index.html`: contiene `rel="manifest"`, `apple-touch-icon` y ya no `/vite.svg`.
3. `usePwaInstall.test.jsx`: sin evento → `canInstall=false`; tras `window.dispatchEvent(new Event('beforeinstallprompt'))` con `prompt` mockeado → `canInstall=true` y `install()` llama `prompt()`; `isStandalone` con `matchMedia` stub (ver `setViewport`/mock de BK-MOB-04).
4. `AccesoTerminalPage`: con cámara activa, se invoca `useScreenWakeLock({ enabled: true })`; en modo manual `enabled: false` (mock del hook con `vi.mock('../../hooks/useScreenWakeLock')`, patrón ya usado en el repo para hooks).
5. `CredencialDigitalPage`: con `isSupported=false` aparece el aviso; con `isActive=true` no.
6. `vercel.json`: test que lee el JSON y verifica que el header de `/sw.js` tiene `no-cache` y que el rewrite sigue excluyendo `api`.
7. Build: `npm run build` genera `dist/manifest.webmanifest` y `dist/sw.js` (`fd` en un paso de CI o test manual).
8. Manual: Lighthouse (categoría PWA) sobre `npm run build && npm run preview`; Android Chrome (instalar y abrir en `standalone`), iPhone Safari (Agregar a inicio), verificar que `/api` nunca se sirve desde caché y que tras un deploy aparece el toast de actualización. Probar Wake Lock en Android Chrome (HTTPS) y iOS ≥ 1

## B11 — Acceso: historial, QR del socio y seguridad · Franco · ~24 días · rama `feat/acceso-historial-qr`

**Commit (squash):** `feat(access): history screen, member activity, analytics, schedules, QR hardening and audit`

**En la descripción del PR:** Closes #150 · Closes #151 · Closes #155 · Closes #158 · Closes #157 · Closes #159

**Contexto.** 6 fichas agrupadas por zona de código. Hacelas en el orden de la lista.

### BK-ACC-03 · Pantalla de historial de accesos (filtros, búsqueda por socio, rango, motivo, exportación)
_Prioridad P1 · Tamaño L · Estado en código: backend-sin-ui · Depende de: BK-ACC-05 · Issue #150 · Ficha: `docs/backlog/items/BK-ACC-03-historial-de-accesos.md`_

**Contexto:** `GET /api/access/logs/` ya existe, está paginado, filtra por fecha/tipo/estado/motivo/usuario y respeta ownership, pero **no hay ninguna pantalla** que lo consuma como listado: solo se lo usa para "últimos 5 movimientos" del dashboard y el monitor, y para un gráfico de reportes. Recepción no puede responder "¿entró Juan ayer? ¿por qué lo rechazaron?" ni exportar los accesos. Además al endpoint le faltan búsqueda por texto, tamaño de página configurable y filtro por socio.

**Qué hacer:**
- Backend: `search`, `page_size`, filtro `socio` (id de Socio), filtro por rango horario opcional, orden por `status`/`access_type`; nuevo reporte de accesos exportable (incluye denegados y motivo).
- Frontend: página "Historial de accesos" para admin y recepción con tabla, filtros, buscador, paginación y exportación CSV/XLSX/PDF.
- Corregir el N+1 de `user_plan_nombre`.

**Archivos:**
- `backend/apps/access/views.py` (`search_fields`, `pagination_class`), `filters.py` (`socio`), `serializers.py` (campos `*_display`, `user_dni`; corregir N+1 con `Prefetch(..., queryset=Membresia.objects.filter(estado='activa'), to_attr='membresias_activas')`).
- `backend/apps/reports/{views,services,urls}.py` — reporte de accesos.
- `backend/apps/access/tests/test_access_log_list.py` (nuevo), `backend/apps/reports/tests/test_reports_endpoints.py` (ampliar).
- Frontend: `App.jsx`, `Sidebar.jsx`, `pages/recepcion/AccesosHistorialPage.jsx`, `components/recepcion/AccessLogFilters.jsx`, `hooks/queries/useAccessLogsList.js`, `services/accessService.js`, y tests.

**Tests primero:**
Backend (pytest, `APITestCase`/`TestCase`, factories de `backend/conftest.py`; hoy `AccessLogListViewTests` en `apps/access/tests/test_qr_utils.py:157-190` cubre solo 401 / socio ve lo propio / admin ve todo):
1. `?search=<apellido>` y `?search=<dni>` devuelven solo ese socio.
2. `?page_size=25` devuelve 25 filas; `?page_size=1000` se recorta a 200.
3. `?socio=<socio.id>` filtra; `?status=DENIED&denial_reason=MEMBERSHIP_INACTIVE` filtra.
4. `?fecha_desde=2026-10-01&fecha_hasta=2026-10-02` (crear logs y retrocederles `timestamp` con `.update()`, es `auto_now_add`).
5. Socio con `?search=` ajeno sigue viendo solo lo propio (no se filtra por búsqueda lo que ownership oculta).
6. `django_assert_max_num_queries` (fixture de pytest-django) sobre 30 logs: no debe crecer con N (N+1 resuelto).
7. Reporte: `GET /api/reportes/accesos/?formato=csv` → 200 `text/csv`, incluye filas DENIED con motivo; 403 para socio; 400 al pasar el tope.
Frontend (Vitest + RTL; mockear `../../services/api` como `useGymConfig.test.jsx`, wrapper `QueryClientProvider`):
1. Render con loading → skeleton; con datos → filas; sin datos → vacío.
2. Escribir en el buscador (debounce 400 ms, `vi.useFakeTimers`) dispara `api.get('/access/logs/', { params: { search, page: 1, page_size: 25 } })`.
3. Cambiar filtro "Resultado" → vuelve a página 1.
4. Exportar CSV llama a `GET /reportes/accesos/` con `responseType: 'blob'`.
5. `ProtectedRoute`: un socio es redirigido.
Manual: `recepcion@winnie.local` → `/recepcion/acceso

### BK-ACC-04 · Pestaña "Actividad" en el detalle del socio (staff) y "Mi actividad" para el socio
_Prioridad P1 · Tamaño M · Estado en código: backend-sin-ui · Depende de: BK-ACC-03, BK-ACC-05 · Issue #151 · Ficha: `docs/backlog/items/BK-ACC-04-actividad-del-socio.md`_

**Contexto:** `SocioDetailModal` tiene pestañas Datos / Membresías / Pagos pero nada de asistencias, aunque el backend ya guarda cada acceso y ya filtra por usuario. El socio, por su parte, solo ve un número ("Asistencias este mes") en su dashboard, sin detalle ni historial, y el endpoint de logs que podría servirle le devuelve datos internos (`scanned_by_email`, `qr_jti`).

**Qué hacer:**
- Staff: pestaña "Actividad" en `SocioDetailModal` con resumen (accesos del mes, último acceso, rechazos del mes) y lista paginada de los últimos movimientos con resultado y motivo.
- Socio: endpoint propio sin datos internos y página `/socio/actividad` con la misma lista y el resumen mensual; entrada desde el dashboard.
- Serializer reducido para el socio.

**Archivos:**
- `backend/apps/access/{views,serializers,urls}.py` — `MyAccessLogListView`, `MyAccessLogSerializer`.
- `backend/apps/access/tests/test_my_access.py` — nuevo.
- `frontend/src/components/admin/SocioDetailModal.jsx` (+ `SocioDetailModal.test.jsx`) — pestaña.
- `frontend/src/hooks/queries/useAccessLogsList.js` — `useMyAccessLogs`.
- `frontend/src/pages/socio/MiActividadPage.jsx` (+ test), `App.jsx`, `Sidebar.jsx`, `SocioDashboardView.jsx`.

**Tests primero:**
Backend (`pytest apps/access -q`; `APITestCase`; factories `make_user_factory/make_socio_factory`):
1. Socio A pide `/api/access/me/` y solo ve sus logs; no aparece `scanned_by_email` ni `qr_jti` en el JSON.
2. Rol recepcionista/administrador → 403 en `/api/access/me/`; sin token → 401.
3. Incluye DENIED con `denial_reason_display` ("Membresía inactiva o cuota vencida").
4. `?fecha_desde=` filtra.
5. Staff: `GET /api/access/logs/?user=<id>` solo trae ese usuario (regresión del filtro existente).
Frontend (Vitest/RTL; `SocioDetailModal.test.jsx` ya existe — ver cómo mockea hooks `useMembresiasPorSocio`/`usePagosPorSocio`):
0. Helpers de test del repo: `renderWithProviders`/`resetAllStores` de `frontend/src/test/test-utils`; el test del modal mockea `../../hooks/queries/useMembresias`, `usePagos` y `../ui/Modal` con `vi.mock` (`SocioDetailModal.test.jsx:9-30`): agregar un `vi.mock` equivalente para `useAccessLogsList`.
1. Al hacer clic en la pestaña "Actividad" se llama a `api.get('/access/logs/', { params: expect.objectContaining({ user: socio.usuario }) })` y no con `socio.id`.
2. Estados skeleton / vacío / lista / error.
3. `MiActividadPage`: renderiza lista y el estado vacío con el copy de arriba; un rol no-socio es redirigido por `ProtectedRoute`.
Manual: `recepcion@winnie.local` → Socios → "Carlos Activo" → Actividad; `socio.activo@winnie.local` → Dashboard → tarjeta de asistencias.

### BK-ACC-08 · Analítica histórica de aforo (por hora y por día, horas pico, permanencia promedio)
_Prioridad P2 · Tamaño L · Estado en código: no-existe · Depende de: BK-ACC-05, BK-ACC-01 · Issue #155 · Ficha: `docs/backlog/items/BK-ACC-08-analitica-historica-de-aforo.md`_

**Contexto:** Todo el análisis de aforo es "de hoy": promedio, pico y movimientos de la última hora. No se puede ver cómo se comporta el gimnasio por hora del día, por día de la semana ni en el tiempo (¿cuál es la hora pico? ¿cuánto se queda la gente?). Los datos están (cada `AccessLog` tiene timestamp y tipo), pero no hay endpoint ni pantalla. Además el "promedio de hoy" actual está sesgado hacia abajo.

**Qué hacer:**
endpoint de serie histórica agregada (por hora y por día) con pico y permanencia promedio; heatmap día-de-semana × hora; vista "Histórico" en el Monitor de Aforo (o pestaña en Reportes) con selector de rango; corrección del promedio de hoy.

**Archivos:**
Backend: `apps/access/{services,views,urls}.py` (+ `AforoHistoricoQuerySerializer` para validar `desde/hasta/granularidad`), migración de índice, tests `apps/access/tests/test_aforo_historico.py` y corrección en `test_services.py`.
Frontend: `AforoMonitorPage.jsx`, `useDashboardData.js`, 4 componentes nuevos + tests, `AforoMonitorPage.test.jsx` (hoy mockea `useAforoStats`/`useAccessLogs`, líneas 10-17).

**Tests primero:**
Backend (pytest, `APITestCase`; crear logs y mover `timestamp` con `.update()` porque es `auto_now_add`; fechas fijas en hora local):
1. Rango de 3 días con ingresos conocidos → `puntos[*].ingresos` exactos; `egresos` correctos; `ocupacion_pico` y `hora_pico` esperados.
2. Permanencia: par ENTRY 18:00 / EXIT 19:15 → 75 min; entrada sin salida no entra al promedio.
3. `granularidad=hora` agrupa en hora local (evento a las 23:30 -03:00 no cae en el día siguiente UTC).
4. Validaciones: `desde>hasta` → 400; rango 93 días → 400; fecha inválida → 400; socio → 403; anónimo → 401.
5. Solo cuenta `status=GRANTED`.
6. Regresión `compute_aforo_stats`: promedio calculado desde apertura (caso con eventos 10:00-12:00 y "ahora" 13:00).
7. `django_assert_max_num_queries(5)` para 5.000 logs.
Frontend (Vitest/RTL; `renderWithProviders` de `frontend/src/test/test-utils`): selector de rango dispara el hook con los parámetros; estados loading/vacío/error; el chart expone `aria-label` con el pico; heatmap renderiza 7×24 celdas.
Manual: `admin@winnie.local` → Aforo → Histórico; generar ingresos desde el terminal y verificar que el día actual cambia (cache 60 s).

### BK-ACC-11 · Horarios de apertura/cierre efectivos y reglas de acceso por plan o por clase
_Prioridad P2 · Tamaño L · Estado en código: ui-parcial · Depende de: BK-ACC-01 · Issue #158 · Ficha: `docs/backlog/items/BK-ACC-11-horarios-y-reglas-de-acceso.md`_

**Contexto:** `GymConfig.hora_apertura` y `hora_cierre` se guardan y se editan desde Configuración, pero **ningún código las usa**: el acceso se permite a cualquier hora, el socio no ve el horario y ningún job de cierre las lee. No existe ninguna regla de acceso por plan (p. ej. plan "mañana") ni por clase (acceder solo con reserva). Es una brecha entre lo que la pantalla de configuración promete y lo que el sistema hace.

**Qué hacer:**
**Incluye (fases):**
1. *Fase A — horario del gimnasio (P1 dentro de la ficha):* validar `hora_cierre` vs `hora_apertura`, mostrar el horario al socio y, opcionalmente, rechazar ENTRY fuera de horario (`OUTSIDE_HOURS`).
2. *Fase B — franja horaria por plan:* campos opcionales en `PlanMembresia` (`franja_desde`, `franja_hasta`, `dias_habilitados`) y regla `PLAN_OUT_OF_SCHEDULE`.
3. *Fase C (idea, validar con producto):* acceso condicionado a reserva de clase (`solo-idea`).

**Archivos:**
Backend: `apps/common/{models,serializers}.py` + migración; `apps/access/{models,services,views}.py` + migración; `apps/memberships/{models,serializers}.py` + migración (Fase B); tests `apps/common/tests/test_gym_config.py`, `apps/access/tests/test_access_hours.py` (nuevo), `apps/memberships/tests/` (planes).
Frontend: `AdminConfiguracionPage.jsx`, `CredencialDigitalPage.jsx`, `ValidationResult.jsx`, `PlanFormModal.jsx`, `PlanCard.jsx`, y tests (`CredencialDigitalPage.test.jsx`, etc.).

**Tests primero:**
Backend (pytest; no hay `freezegun`: fijar la hora con `unittest.mock.patch('django.utils.timezone.localtime')` o `patch('django.utils.timezone.now')`; hora local `America/Argentina/Buenos_Aires`):
1. PATCH `hora_cierre=06:00` con apertura `07:00` → 400.
2. Estricto ON, 06:00 con apertura 07:00 y tolerancia 15 → ENTRY por DNI `403 OUTSIDE_HOURS`; 06:50 → 200; EXIT a cualquier hora → 200; estricto OFF → 200.
3. Con `override=true` (si BK-ACC-02 está) → 200.
4. Fase B: plan con franja 07:00-12:00 Lun-Vie: socio ENTRY sábado o 15:00 → `PLAN_OUT_OF_SCHEDULE`; dentro de franja → 200; plan sin franja → siempre 200.
5. Validaciones del serializer de plan (solo uno de los dos horarios → 400).
6. Permisos: recepcionista no puede `PATCH /api/config/gym/` (403, ya cubierto) ni crear planes.
Frontend (Vitest/RTL; patrón de `useGymConfig.test.jsx`): el form de config muestra el error de cierre ≤ apertura; la credencial muestra "Horario: 07:00 a 23:00" y el banner de "cerrado" con la hora simulada (`vi.setSystemTime`); `PlanFormModal` valida el par de horarios.
Manual: `admin@winnie.local` → Configuración: apertura 07:00/cierre 23:00, activar "Rechazar fuera de horario" y probar un ingreso cambiando la hora del servidor de pruebas.

### BK-ACC-10 · QR del socio — renovación confiable del token, estados bloqueado/suspendido y cierre de RNF07 (legibilidad y luminosidad)
_Prioridad P1 · Tamaño L · Estado en código: ui-parcial · Depende de: — · Issue #157 · Ficha: `docs/backlog/items/BK-ACC-10-qr-socio-expiracion-estados-y-rnf07.md`_

**Contexto:** La credencial digital ya rota el token cada 30 s, tiene alto contraste, pantalla completa y Wake Lock (PR #110). Pero la cuenta regresiva es un contador local de 30 s que se desincroniza en segundo plano o con el teléfono bloqueado, una falla de red deja un QR vencido a la vista con el contador reiniciado, el estado "bloqueado" solo contempla membresía vencida (no socio suspendido/de baja ni sin plan), y el QR resultante es denso (≈ 53×53 módulos a 170 px) y el "boost de brillo" depende de APIs que no existen en navegadores estándar. RNF07 sigue sin cerrarse.

**Qué hacer:**
(a) countdown y refresh basados en `expires_at` + `visibilitychange` + estado de fallo; (b) estado de credencial derivado del servidor (`habilitado`/motivo) con copy por motivo; (c) legibilidad: tamaño responsivo del QR, `#000` en alto contraste, token más corto (opcional), test de ida y vuelta con decodificador; (d) honestidad en luminosidad: quitar el falso boost y reemplazarlo por pantalla completa blanca + aviso "Subí el brillo"; (e) tolerancia (leeway) en la verificación.

**Archivos:**
Backend: `apps/access/{utils,serializers,views}.py`, `core/settings/base.py` (`QR_TOKEN_LEEWAY_SECONDS`), tests `apps/access/tests/test_qr_utils.py` (ampliar).
Frontend: `hooks/useDynamicQr.js` (+test), `pages/socio/CredencialDigitalPage.jsx`, `components/socio/{QRDisplay,QRCode,QRFullscreenModal}.jsx`, `lib/qr.js`, `hooks/useScreenWakeLock.js` (coordinar con el dueño: tiene cambios sin commitear), tests existentes `CredencialDigitalPage.test.jsx`, `__tests__/CredencialDispositivos.test.jsx`, `QRDisplay.test.jsx`, `QRFullscreenModal.test.jsx`, `QRCode.test.jsx`.

**Tests primero:**
Backend (pytest, `TestCase`/`APITestCase`; patrón de `test_qr_utils.py`: `generate_dynamic_qr_token`, `verify_dynamic_qr_token`, `@patch('apps.access.tasks.log_qr_event')`):
1. `GET /qr/generate/` incluye `server_time` y `acceso_habilitado=True` para socio activo; `False` + `motivo='MEMBERSHIP_INACTIVE'` con membresía vencida; `USER_SUSPENDED` si `is_active=False`... (un usuario inactivo no puede loguearse: usar `socio.estado='suspendido'` → motivo `MEMBERSHIP_INACTIVE`/nuevo `SOCIO_SUSPENDED` según decisión).
2. Leeway: token con `exp = now-2` y `QR_TOKEN_LEEWAY_SECONDS=3` → válido; con `exp = now-5` → `TOKEN_EXPIRED`.
3. (opcional) token compacto y formato viejo conviven.
Frontend (Vitest + RTL + `vi.useFakeTimers`; mocks como `CredencialDispositivos.test.jsx:1-25`: `useSocioMembresiaMe`, `useAuth`, `../../../services/api`, `sonner`):
1. `useDynamicQr`: con `expires_at = now+30` refresca cuando faltan ≤ 5 s (no a los 30).
2. Simular `document.visibilityState='visible'` tras avanzar 40 s → refresca de inmediato.
3. Fallo de `api.get` → `status='stale'`, **un** solo toast, reintentos con backoff, el QR no se muestra como válido.
4. Overlay por motivo (`MEMBERSHIP_INACTIVE`, `USER_SUSPENDED`, `NO_MEMBERSHIP`) con su copy y CTA.
5. `QRCode` expone `role="img"` y `aria-label`; con `isHighContrast` usa `#000000`.
6. **Round-trip de decodificación:** generar el SVG/matriz de un token real de 168 caracteres y decodificar la matriz con `barcode-detector` o `jsqr` (dependencia de dev

### BK-ACC-12 · Seguridad y auditoría del acceso (logs inmutables, auditoría Mongo que no reintenta ni expira, rate limiting, WebSocket)
_Prioridad P1 · Tamaño M · Estado en código: roto · Depende de: — · Issue #159 · Ficha: `docs/backlog/items/BK-ACC-12-seguridad-y-auditoria-del-acceso.md`_

**Contexto:** El módulo de acceso tiene buenas bases (HMAC, anti-replay atómico, ownership en logs, permisos por rol), pero la auditoría tiene huecos que se descubren leyendo el código: los reintentos de Celery nunca se disparan, la retención de 90 días en Mongo no funciona con el tipo de dato que se guarda, los logs de Postgres se pueden borrar desde el admin de Django, no hay rate limiting en ningún endpoint y el WebSocket tiene detalles de autenticación mejorables.

**Qué hacer:**
(1) retry real de auditoría Mongo; (2) TTL funcional (guardar `datetime` UTC, no string) + migración de datos; (3) inmutabilidad de `AccessLog` (admin read-only, sin delete; `PROTECT`/`DO_NOTHING` de atribución según decisión); (4) rate limiting por scope; (5) `REDIS_UNAVAILABLE` como motivo y marca de modo degradado; (6) hardening del WebSocket (inactivo + Origin); (7) request id en logs.

**Archivos:**
Backend: `apps/access/{tasks,admin,models,views}.py`, `core/mongodb.py` (que `log_qr_event` re-lance la excepción o devuelva/propague el error para que Celery reintente), `core/ws_auth.py`, `apps/access/consumers.py`, `core/asgi.py`, `core/settings/base.py` (throttles, `ACCESS_ANTIREPLAY_FAIL_OPEN = config(..., cast=bool, default=False)`), `apps/common/management/commands/create_mongo_indexes.py` (verificar tipo), migración, tests.
Frontend: `components/recepcion/ValidationResult.jsx`, `pages/recepcion/AccesoTerminalPage.jsx`.

**Tests primero:**
Convención: pytest + pytest-django, `APITestCase`, `core.settings.test` (LocMemCache, Celery eager, Mongo de prueba `winnie_gym_logs_test`).
1. **Retry:** parchear `core.mongodb.get_collection` para lanzar `ConnectionFailure` y verificar que `log_qr_event_task` reintenta (`task.retry` llamado / `Retry` propagado con `CELERY_TASK_EAGER_PROPAGATES=True`, `test.py:14-16`). Hoy este test fallaría (la excepción se traga).
2. **TTL/tipo:** `mongo_payload['timestamp']` es `datetime` aware (no `str`); test del comando `create_mongo_indexes` + inserción real en Mongo de prueba y `index_information()` (saltar si no hay Mongo disponible).
3. **Admin inmutable:** con `AdminSite`/cliente superuser, `AccessLogAdmin().has_delete_permission(request)`/`has_add_permission`/`has_change_permission` → `False`; `POST` de la acción `delete_selected` no borra.
4. **Throttle:** con `@override_settings(REST_FRAMEWORK={..., 'DEFAULT_THROTTLE_RATES': {'qr_scan': '2/min', ...}})` la 3ª llamada a `/api/access/qr/scan/` → 429; limpiar `cache.clear()` en `setUp` (los contadores viven en el cache).
5. **Redis caído:** `@patch('apps.access.utils.cache.add', side_effect=Exception)` → `403`, `denial_reason == 'REDIS_UNAVAILABLE'` y el log se persiste; con `ACCESS_ANTIREPLAY_FAIL_OPEN=True` → 200 y el log queda marcado (campo `source`/nota de modo degradado).
6. **WS inactivo:** usuario `is_active=False` con token válido → cierre 4401/4403 (extender `test_aforo_websocket.py`, que ya tiene los helpers `_make_user

## B12 — Apto médico, perfil y portal del socio · Rodrigo · ~18.5 días · rama `feat/apto-perfil-portal`

**Commit (squash):** `feat(members): medical certificate lifecycle, richer profile data, member portal states and account deletion`

**En la descripción del PR:** Closes #227 · Closes #224 · Closes #228 · Closes #231 · Closes #232 · Closes #234 · Closes #235

**Contexto.** 7 fichas agrupadas por zona de código. Hacelas en el orden de la lista.

### BK-SOC-05 · Apto médico: bucket público con nombres predecibles y almacenamiento de producción que probablemente no se aplica
_Prioridad P1 · Tamaño M · Estado en código: roto · Depende de: BK-SOC-02 · Issue #227 · Ficha: `docs/backlog/items/BK-SOC-05-apto-medico-almacenamiento-publico-y-url-produccion.md`_

**Contexto:** El certificado médico es un dato de salud (sensible). Hoy se guarda en un bucket **público** de Supabase con un nombre derivado del número de socio y el apellido (`S-00012_gonzalez.pdf`), por lo que cualquiera que adivine el patrón lo descarga sin autenticarse. Además hay tres indicios, a confirmar en producción, de que la persistencia ni siquiera funciona como se documentó: (a) `DEFAULT_FILE_STORAGE` fue **eliminado en Django 5.1** y el proyecto usa 5.1.4; (b) la URL guardada se arma con `MEDIA_URL + path`, sin pasar por `storage.url()` (falta `/` y el nombre del bucket); (c) en producción el `DEBUG` es `False` y `static(MEDIA_URL)` solo se monta con `DEBUG`.

**Qué hacer:**
configurar `STORAGES` (Django 5.1) para media y static; test/verificación del backend de storage activo; guardar en el modelo la **clave del objeto** (no la URL pública) y generar URLs firmadas de corta vida bajo demanda; bucket privado; nombres de archivo no predecibles (UUID); limpieza de archivos al reemplazar; migración de datos existentes.

**Archivos:**
- `backend/core/settings/base.py` / `production.py` — migrar a `STORAGES = {'default': {'BACKEND': 'apps.common.storages.SupabaseMediaStorage'}, 'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'}}`.
- `backend/apps/common/storages.py` — `querystring_auth=True`, `default_acl='private'` si el proveedor lo soporta, `custom_domain=None`, expiración configurable.
- `backend/apps/members/services.py` — nombre `certificados_medicos/{uuid4}{ext}`, guardar `key`, borrar el objeto anterior, no armar URL con `MEDIA_URL`.
- `backend/apps/members/views.py` + `serializers.py` — `GET certificado-medico/` y `tiene_certificado`.
- `backend/apps/members/migrations/00NN_*.py` — campo `key` + data migration.
- `backend/apps/members/tests/test_certificado_storage.py` (nuevo).
- Frontend: `SocioColumns.jsx`, `SocioDetailModal.jsx`, `SocioFormModal.jsx`, `ProfilePage.jsx`, `sociosService.js`, `useSociosData.js` y sus tests.
- `docs/deploy.md` — bucket privado y variables.

**Tests primero:**
**Backend** (`APITestCase`, `override_settings(STORAGES=...)` con `InMemoryStorage`/`FileSystemStorage` en `tmp`; `SimpleUploadedFile('apto.pdf', b'%PDF-1.4 body', content_type='application/pdf')` como en `test_certificado_self_service.py:33`):
- `test_upload_guarda_con_nombre_no_predecible` (el nombre no contiene `numero_socio` ni apellido).
- `test_upload_reemplaza_y_borra_objeto_anterior`.
- `test_serializer_no_expone_url_publica_permanente`.
- `test_get_certificado_propio_200`, `test_get_certificado_ajeno_403`, `test_get_sin_certificado_404`, `test_get_recep_200`.
- `test_default_storage_backend_en_produccion`: con `core.settings.production` importado (env mínimo) `settings.STORAGES['default']['BACKEND']` es `SupabaseMediaStorage` (detecta el setting removido).
Comando: `cd backend && pytest -q apps/members`.
**Frontend:** tests de `SocioDetailModal`/`ProfilePage` con `vi.mock('../../services/sociosService')`: click en "Ver certificado" llama `getCertificadoUrl` y abre la URL (`vi.spyOn(window,'open')`).
**Manual (staging):** subir apto como socio; intentar abrir la URL del objeto **sin** firma ⇒ 403/404; abrir desde la app ⇒ funciona; reemplazar ⇒ el anterior ya no existe.

### BK-SOC-02 · La subida del apto médico desde "Mi Perfil" (RF08 self-service) no hace nada
_Prioridad P0 · Tamaño S · Estado en código: roto · Depende de: BK-SOC-05, BK-SOC-06 · Issue #224 · Ficha: `docs/backlog/items/BK-SOC-02-subida-apto-medico-en-perfil-no-funciona.md`_

**Contexto:** `ProfilePage` muestra la sección "Certificado médico" y un botón "Subir certificado", pero el handler corta en silencio porque `GET /api/auth/profile/` **no devuelve `id`** del socio ni `certificado_medico_url`. Resultado: elegir un archivo no dispara ningún request y la pantalla siempre dice "No hay certificado cargado", aunque exista. Los tests lo esconden porque mockean un perfil con campos que el serializer real no tiene.

**Qué hacer:**
exponer `id`, `numero_socio`, `estado`, `certificado_medico_url` (solo lectura) en `GET/PATCH /api/auth/profile/`; usar `constants/files.js` para validar tipo/tamaño antes de subir; toast de error cuando falta `id`; arreglar los tests para que reflejen el contrato real; actualizar el cache de `['profile']` y de `['socioMembership']`/`['membresias','me']` tras subir.

**Archivos:**
- `backend/apps/users/serializers.py` — `ProfileSerializer.Meta.fields/read_only_fields`.
- `backend/apps/users/tests/test_views.py` — tests de contrato (ver §9).
- `frontend/src/pages/ProfilePage.jsx` — handler con validación y errores visibles.
- `frontend/src/hooks/queries/useProfile.js` — mutation de subida con actualización de cache.
- `frontend/src/pages/ProfilePage.test.jsx` — mock alineado al contrato + casos de subida.

**Tests primero:**
**Backend** (`backend/apps/users/tests/test_views.py`, `APITestCase` + `make_user_factory`/`make_socio_factory`; clase de perfil en líneas ~145-200): 
- `test_profile_get_includes_id_numero_socio_estado_certificado` (con y sin certificado: `''`).
- `test_profile_patch_ignores_id_estado_certificado` (campos read-only no mutan).
- `test_socio_upload_certificado_then_profile_shows_url` (flujo completo con `SimpleUploadedFile('apto.pdf', b'%PDF-1.4 body', content_type='application/pdf')`).
Comando: `cd backend && pytest -q apps/users/tests/test_views.py apps/members/tests/test_certificado_self_service.py`.
**Frontend** (`ProfilePage.test.jsx`, Vitest + RTL, `vi.mock('../hooks/queries/useProfile')` y `vi.mock('../services/api')`): 
- Con perfil **sin** `id` (contrato viejo) no debe quedar mudo: aparece toast de error.
- Archivo de 6 MB → toast "supera los 5 MB", **no** se llama a `api.post`.
- Archivo válido → `api.post('/members/socios/12/certificado-medico/', FormData)` y el banner pasa a "Certificado cargado".
- Mover el mock a un helper que replique exactamente los campos del serializer.
Comando: `cd frontend && npx vitest run src/pages/ProfilePage.test.jsx && npm run lint`.
**Manual:** `socio.nuevo@winnie.local` (seed, sin certificado) → `/perfil` → subir PDF → banner "Certificado cargado" → `/dashboard` muestra "Apto Médico: Vigente" (hasta que exista BK-SOC-06).

### BK-SOC-06 · Vigencia del apto médico (fecha de vencimiento, estados y avisos) — hoy "tiene archivo = vigente"
_Prioridad P1 · Tamaño L · Estado en código: ui-parcial · Depende de: BK-SOC-02, BK-SOC-05 · Issue #228 · Ficha: `docs/backlog/items/BK-SOC-06-vigencia-apto-medico-y-avisos.md`_

**Contexto:** El sistema solo sabe si hay un archivo cargado (`certificado_medico_url`), no cuándo se emitió ni cuándo vence. Por eso un apto de hace 3 años se muestra como "Al día" / "Vigente" en el listado, el detalle y el dashboard del socio, y no existe ningún aviso de "tu apto vence". La UI de recepción ya tiene un campo "VENCE" que no persiste en ningún lado.

**Qué hacer:**
campos `certificado_emitido_en` y `certificado_vence_en`; estado derivado `apto_estado` (`sin_apto | vigente | por_vencer | vencido`); entrada de la fecha al subir (staff y socio); filtros y KPI; badges coherentes en listado/detalle/dashboard/credencial/perfil; job Celery diario con emails de aviso (30/7/0 días) y deduplicación; tests.

**Archivos:**
- Backend: `members/models.py`, `members/migrations/*`, `members/serializers.py`, `members/filters.py`, `members/views.py` (stats + upload), `members/services.py` (parseo de fechas en `guardar_certificado_medico`), `members/tasks.py` (nuevo), `members/migrations/*_seed_apto_schedule.py` (nuevo), `common/templates/emails/apto_alert.{html,txt}` (nuevos), `memberships/serializers.py` (`SocioMeSerializer`), `users/serializers.py` (`ProfileSerializer`).
- Frontend: `components/socio/AptoBadge.jsx` (+test), `SocioColumns.jsx`, `SocioDetailModal.jsx`, `SocioFormModal.jsx`, `FilterPanel.jsx`, `SaludCard.jsx`, `SocioDashboardView.jsx`, `ProfilePage.jsx`, `services/sociosService.js` (`uploadCertificado(id, archivo, {venceEn})`), sus tests.

**Tests primero:**
**Backend** (`backend/apps/members/tests/`, `APITestCase` + `make_user_factory/make_socio_factory`, fechas relativas a `date.today()` como en `memberships/tests/test_expiration_task.py:11-24` (no hay `freezegun` en `requirements/`)):
- `test_socios_models.py`: `apto_estado` en los 4 casos y en los bordes (vence hoy ⇒ `por_vencer`; ayer ⇒ `vencido`).
- `test_socios_views.py`: filtro `?apto=vencido`; stats con `apto_por_vencer`; PATCH `certificado_vence_en` por admin/recep OK, por socio 403.
- `test_certificado_*`: upload con `vence_en` válido/pasado/formato inválido ⇒ 200/400/400.
- `test_apto_task.py`: aviso a 30/7/0 días, dedup en segunda corrida, no envía a socios en `baja`, no envía si no hay email real (usar `django.core.mail.outbox`, `CELERY_TASK_ALWAYS_EAGER=True` en `core/settings/test.py:16`).
Comando: `cd backend && pytest -q apps/members apps/memberships`.
**Frontend** (Vitest + RTL): `AptoBadge.test.jsx` (4 estados + compacto); `SocioColumns.test.jsx` y `SocioDetailModal.test.jsx` (no dicen "Al día" con apto vencido); `SocioDashboardView.test.jsx` (usa `apto.estado`); `FilterPanel` (nuevo grupo llama `onChange('apto', 'vencido')`).
Comando: `cd frontend && npx vitest run src/components src/pages && npm run lint`.
**Manual:** con admin cargar apto con vencimiento en 5 días a `socio.activo@winnie.local`; en el listado filtrar "Por vencer"; ejecutar la tarea (`python manage.py shell -c "from apps.members.tasks import check_expiring_aptos; check_expiring_aptos()"`) y v

### BK-SOC-09 · Portal del socio (dashboard, credencial, pagos): datos faltantes, fechas crudas, "próximas clases" truncadas y sin estados de error
_Prioridad P2 · Tamaño M · Estado en código: ui-parcial · Depende de: BK-SOC-06, BK-SOC-08, BK-CLS-01 · Issue #231 · Ficha: `docs/backlog/items/BK-SOC-09-portal-socio-datos-faltantes-y-estados-de-error.md`_

**Contexto:** El portal del socio (dashboard, credencial, mis pagos, checkout) renderiza el camino feliz, pero: muestra fechas ISO crudas (`2026-11-30`), pierde la fecha de vencimiento cuando la membresía ya venció (el backend solo devuelve la `activa`), no tiene estado de error (un fallo de red se lee como "Sin membresía activa"), arma "próximas clases" bajándose la grilla con un `page_size` que el backend ignora, y el historial de pagos solo muestra los últimos 10. Hay además dos hooks distintos para el mismo endpoint y un `Sede Central` hardcodeado.

**Qué hacer:**
formato de fechas (`es-AR`), estado de error y skeletons en dashboard/credencial/pagos; `/memberships/me/` devuelve también la última membresía vencida (`ultima_membresia`); unificar el hook de `/me`; CTA "Renovar" en dashboard y alerta de vencimiento; paginación ("Ver más") en Mis Pagos y mapas de etiquetas compartidos; "próximas clases" con endpoint dedicado; reemplazar `Sede Central` por dato real (`nombre_gym`); `MemberLayout` en `/socio/pagos`.

**Archivos:**
- Backend: `memberships/serializers.py` (`ultima_membresia`), `classes/views.py` (+ serializer liviano) y tests; opcional paginación global `core/settings/base.py`.
- Frontend: `utils/format.js` (+test), `hooks/queries/useMembresias.js`/`useDashboardData.js` (unificar), `SocioDashboardView.jsx`, `CredencialDigitalPage.jsx`, `MemberPlanDetails.jsx`, `MembershipExpiredAlert.jsx`, `HistorialPagosPage.jsx`, `useMisPagos.js`, y sus tests existentes (`SocioDashboardView.test.jsx`, `CredencialDigitalPage.test.jsx`, `MemberPlanDetails.test.jsx`, `MembershipExpiredAlert.test.jsx`).

**Tests primero:**
**Backend** (`memberships/tests/test_me_views.py`, `APITestCase`, `make_*_factory`; `classes/tests/`): `test_me_incluye_ultima_membresia_vencida`; `test_me_ultima_membresia_null_sin_historial`; `test_mis_reservas_solo_del_socio` (otro socio no aparece; `en_espera` distinguible; orden por `proxima_fecha`); `test_mis_reservas_rol_staff_403`.
Comando: `cd backend && pytest -q apps/memberships apps/classes`.
**Frontend** (Vitest + RTL; mocks de hooks con `vi.mock`): 
- `format.test.js`: `formatFecha('2026-11-30')` ⇒ "30 de noviembre de 2026" sin corrimiento (probar con `TZ=America/Argentina/Buenos_Aires` y `UTC`).
- Dashboard: `isError` ⇒ mensaje + Reintentar; sin membresía ⇒ botón Renovar; fecha formateada.
- Credencial: vencida ⇒ alerta con la fecha de `ultima_membresia` y link a `/socio/checkout`.
- Pagos: `next` ⇒ "Ver más"; etiquetas "Aprobado/MercadoPago".
Comando: `cd frontend && npx vitest run src/pages/socio src/components/socio src/components/dashboard src/utils && npm run lint`.
**Manual:** `socio.vencido@winnie.local` (seed) → `/socio/credencial`: alerta con fecha real y "Renovar ahora"; apagar el backend y recargar `/dashboard`: se ve el error con Reintentar; `socio.activo@winnie.local` con >10 pagos: "Ver más".

### BK-SOC-10 · Datos personales ampliados del socio (fecha de nacimiento, género, contacto de emergencia) y saludo de cumpleaños
_Prioridad P2 · Tamaño M · Estado en código: ui-parcial · Depende de: BK-SOC-01, BK-SOC-07 · Issue #232 · Ficha: `docs/backlog/items/BK-SOC-10-datos-personales-ampliados-nacimiento-emergencia.md`_

**Contexto:** El modelo `Socio` solo guarda `nombre, apellido, dni, telefono, observaciones`. No hay fecha de nacimiento (no se puede saber la edad ni detectar menores), ni género, ni **contacto de emergencia** (dato operativo clave ante una descompensación en el gimnasio), ni domicilio. La pantalla de Alta en Recepción ya dibuja "FECHA NACIMIENTO" y "GÉNERO" pero los descarta. El saludo de cumpleaños es una idea sin rastro en backend.

**Qué hacer:**
**Incluye (propuesta mínima):** `fecha_nacimiento` (opcional), `genero` (opcional, con "Prefiero no decirlo"), contacto de emergencia (`nombre`, `telefono`, opcional pero recomendado) en modelo, serializers de admin/recepción/perfil y formularios; validación de fecha (no futura, edad razonable); mostrar edad y contacto en el detalle de staff; aviso en UI si falta contacto de emergencia.

**Archivos:**
- Backend: `members/models.py`, `members/migrations/0008_*.py`, `members/serializers.py` (+ validaciones), `users/serializers.py` (`ProfileSerializer`, `ProfileCompleteSerializer`), `members/admin.py` (campos), `docs/database/*`, tests.
- Frontend: `DatosPersonalesCard.jsx`, `gestionSocios.schema.js`, `SocioFormModal.jsx`, `SocioDetailModal.jsx`, `ProfilePage.jsx`, `CompleteProfilePage.jsx` y tests respectivos.

**Tests primero:**
**Backend** (`members/tests/test_socios_models.py`, `test_socios_views.py`, `users/tests/test_views.py`; `APITestCase`, `make_user_factory/make_socio_factory`): 
- Modelo: `edad` correcta (cumpleaños hoy/mañana, 29 feb); `fecha_nacimiento` futura inválida.
- API: crear/editar con y sin campos nuevos (retrocompatible: todos opcionales); nombre sin teléfono de emergencia ⇒ 400; `GET /api/auth/profile/` los devuelve y `PATCH` los actualiza; `edad` ignorada en escritura.
Comando: `cd backend && pytest -q apps/members apps/users`.
**Frontend** (Vitest + RTL): `DatosPersonalesCard.test.jsx` (los campos llaman `onChange('fechaNacimiento'…)`, `max` = hoy); `ProfilePage.test.jsx` (guarda los campos nuevos, error por fecha futura); `SocioDetailModal.test.jsx` (muestra edad y contacto; aviso si falta).
Comando: `cd frontend && npx vitest run src/components src/pages && npm run lint`.
**Manual:** recepción crea socio con nacimiento y contacto → detalle muestra edad y link `tel:`; el socio edita su contacto en `/perfil`.

### BK-SOC-12 · Detalle de socio para staff: pestaña Actividad, notas internas con autor e historial de cambios
_Prioridad P2 · Tamaño L · Estado en código: backend-sin-ui · Depende de: BK-ACC-01, BK-SOC-03, BK-SOC-07 · Issue #234 · Ficha: `docs/backlog/items/BK-SOC-12-detalle-socio-actividad-notas-internas-e-historial.md`_

**Contexto:** El detalle del socio (`SocioDetailModal`) muestra Datos, Membresías y Pagos. Faltan tres cosas que recepción necesita para atender: **qué hizo el socio** (ingresos y clases), **notas internas con autor y fecha** (hoy hay un único campo `observaciones` que solo un administrador puede editar) y **quién cambió qué** (la auditoría ya se escribe en MongoDB pero no hay API ni pantalla para leerla).

**Qué hacer:**
(1) pestaña **Actividad** con últimos N ingresos (`access/logs`) y reservas (`inscripciones`) del socio, solo lectura; (2) **notas internas**: modelo `NotaSocio` con autor/fecha, alta por recepción y admin, listado cronológico, borrado por autor/admin; (3) pestaña **Historial** (solo admin) que lee `audit_logs` filtrando `model='members.socio'` + `instance_id`, con diff legible (ocultando campos ruidosos).

**Archivos:**
- Backend: `members/models.py`, `members/migrations/0008_*.py`, `members/serializers.py` (`NotaSocioSerializer`), `members/views.py` (acciones `notas`, `historial`), `members/services.py` (lectura de Mongo con degradación), `classes/serializers.py` (campos de clase en inscripciones), `common/management/commands/create_mongo_indexes.py`, tests.
- Frontend: `SocioDetailModal.jsx` (+test), 3 componentes nuevos (+tests), `hooks/queries/useActividadSocio.js` y ampliar `useSociosData.js`, `services/sociosService.js`.

**Tests primero:**
**Backend** (`members/tests/test_notas.py`, `test_historial.py`; `APITestCase`, `make_user_factory/make_socio_factory`; Mongo de tests `winnie_gym_logs_test`, `core/settings/test.py:21-24`; ver cómo `apps/common/tests/test_audit.py` limpia la colección):
- Notas: recepcionista y admin crean (201) y listan; autor borra la suya; recepcionista no borra la de otro (403); socio 403; `texto` vacío/>1000 ⇒ 400; `autor` queda seteado desde `request.user`.
- Historial: admin recibe cambios tras `PATCH telefono`; recepcionista 403; Mongo caído (mock de `get_collection` que lanza) ⇒ 200 `degraded:true`; `updated_at` no aparece en `cambios`.
- `inscripciones` serializer incluye `clase_nombre`.
Comando: `cd backend && pytest -q apps/members apps/classes apps/common/tests/test_audit.py` (requiere Mongo, igual que CI).
**Frontend** (Vitest + RTL, `vi.mock` de hooks como en `SocioDetailModal.test.jsx`): pestañas visibles según rol; crear/borrar nota actualiza la lista; Actividad vacío/error; Historial degradado; pestañas con foco por teclado.
Comando: `cd frontend && npx vitest run src/components/admin && npm run lint`.
**Manual:** recepción deja una nota en `socio.activo@winnie.local`; admin edita el teléfono y ve el cambio en Historial con su email; desactivar Mongo (`docker compose stop mongo`) y comprobar que el detalle sigue funcionando.

### BK-SOC-13 · El socio puede pedir su baja y la supresión de sus datos desde "Mi Perfil"
_Prioridad P3 · Tamaño M · Estado en código: solo-idea · Depende de: BK-SOC-08, BK-SOC-07 · Issue #235 · Ficha: `docs/backlog/items/BK-SOC-13-baja-de-cuenta-autogestionada-y-supresion-de-datos.md`_

**Contexto:** Hoy solo un administrador puede dar de baja a un socio, y no existe ningún camino (ni proceso documentado) para que un socio pida eliminar sus datos personales y su certificado médico. Esto es una **idea a validar** con el dueño del producto: no hay rastro en backend ni en specs. Se propone una solicitud de baja iniciada por el socio, resuelta por un administrador, más un procedimiento de anonimización posterior.

**Qué hacer:**
botón "Solicitar mi baja" en `/perfil` (con contraseña y confirmación) que crea una **solicitud**; listado de solicitudes para admin y acción "Aprobar" que ejecuta `dar_baja` + anonimización (nombre/apellido/teléfono/observaciones/certificado) conservando `Pago`/`Membresia` por razones contables; email de confirmación.

**Archivos:**
Backend: `members/models.py` (+migración), `members/serializers.py`, `members/views.py`, `members/services.py` (`anonimizar_socio`), `users/views.py`/`urls.py`, plantillas de email, tests. Frontend: `ProfilePage.jsx`, nuevo `components/auth/SolicitarBajaModal.jsx`, `hooks/queries/useProfile.js`, pantalla admin de solicitudes y tests.

**Tests primero:**
**Backend** (`members/tests/test_solicitud_baja.py`, `APITestCase`, `make_*_factory`): password incorrecta ⇒ 400; solicitud duplicada ⇒ 400; staff/otro rol ⇒ 403; aprobar anonimiza y conserva `Pago` y `Membresia`; aprobar es atómico (si falla el borrado del archivo no queda a medias); rechazar no toca datos; `email` anonimizado no permite login.
Comando: `cd backend && pytest -q apps/members`.
**Frontend** (Vitest + RTL): el modal exige contraseña; error inline; éxito muestra el mensaje; solo se ve para socios.
Comando: `cd frontend && npx vitest run src/pages/ProfilePage.test.jsx src/components/auth && npm run lint`.
**Manual:** `socio.nuevo@winnie.local` solicita baja; admin la aprueba; el login posterior falla y el listado muestra el socio anonimizado.

## B13 — Membresías: ciclo de vida y cobros manuales · Franco · ~23 días · rama `feat/membresias-ciclo-cobros`

**Commit (squash):** `feat(memberships): lifecycle actions, manual payment audit, receipts and cash close`

**En la descripción del PR:** Closes #188 · Closes #191 · Closes #192 · Closes #193

**Contexto.** 4 fichas agrupadas por zona de código. Hacelas en el orden de la lista.

### BK-FIN-06 · Gestión del ciclo de vida de membresías desde la UI (suspender, reactivar, cancelar, renovar, congelar)
_Prioridad P1 · Tamaño XL · Estado en código: backend-sin-ui · Depende de: BK-FIN-05, BK-FIN-07, BK-FIN-09 · Issue #188 · Ficha: `docs/backlog/items/BK-FIN-06-membresias-ciclo-de-vida.md`_

**Contexto:** El backend permite cambiar el `estado` de una membresía con `PATCH` (solo admin) pero no hay acciones de dominio (`suspender`, `reactivar`, `cancelar`, `renovar`), ni validación de transiciones, ni la regla "una sola membresía activa por socio" que exige el spec; el frontend solo **lee** membresías. Un socio que paga y se va de vacaciones, o que debe ser dado de baja con reembolso, no se puede gestionar sin entrar al Django admin. "Congelar" no existe en ningún lado.

**Qué hacer:**
- Acciones de dominio en `MembresiaViewSet`: `suspender`, `reactivar`, `cancelar` y `renovar` (cobro asociado en BK-FIN-09 / BK-FIN-07), con tabla de transiciones válidas y `400` ante transiciones inválidas.
- Regla "una sola membresía activa por socio" (validación + constraint parcial).
- Campos de auditoría de estado (motivo, quién, cuándo) y fecha de suspensión.
- Efecto sobre `fecha_fin` al reactivar (congelamiento, decisión abierta 1).
- UI: acciones por fila en la pestaña Membresías de la ficha y pantalla `/admin/membresias` con filtros (estado, plan, vencimiento).
- `SocioMeSerializer`: exponer `ultima_membresia` y estado para que el socio vea "Suspendida" y no "Vencida".
- `dar_baja` cancela las membresías activas/suspendidas del socio.

**Archivos:**
- Backend: `memberships/models.py` + migración, `memberships/services.py` (`suspender_membresia`, `reactivar_membresia`, `cancelar_membresia`, errores de transición), `memberships/views.py` (acciones), `memberships/serializers.py` (campos de solo lectura + `AccionMembresiaSerializer`), `memberships/filters.py` (`search`), `members/services.py::dar_baja` (cancelar membresías), `memberships/serializers.py::SocioMeSerializer` (`ultima_membresia`).
- Tests backend: `memberships/tests/test_membresia_acciones.py` (nuevo), ampliar `test_membresias_views.py`, `access/tests` (acceso denegado tras suspender).
- Frontend: `pages/admin/AdminMembresiasPage.jsx`, `components/admin/MembresiaAccionesMenu.jsx`, `ConfirmarAccionMembresiaModal.jsx`, `SocioDetailModal.jsx`, `hooks/queries/useMembresias.js`, `App.jsx`, `Sidebar.jsx`, `components/socio/MembershipExpiredAlert.jsx` (estado suspendida), tests correspondientes.

**Tests primero:**
**Backend** (`cd backend && pytest -q apps/memberships/tests apps/access/tests`; `APITestCase` + `RefreshToken`, factories `conftest.py:23-75`; `make_membresia_factory(socio, plan, estado=..., fecha_fin=...)`):
1. Transiciones felices: `activa->suspendida` (guarda `suspendida_desde`, `estado_cambiado_por`), `suspendida->activa`, `activa->cancelada`.
2. Transiciones inválidas: `cancelada->activa`, `vencida->suspendida`, `suspendida->suspendida` -> `400` con `detail`.
3. Permisos: recepcionista puede suspender/reactivar; `cancelar` -> `403` para recepcionista; `socio` -> `403` en todas; anónimo `401`.
4. `reactivar` con `extender_vencimiento`: `fecha_fin` aumenta exactamente los días suspendidos; si `fecha_fin` resultante `< hoy` -> `400`.
5. Constraint: crear/activar una segunda membresía `activa` del mismo socio -> `400` (API) / `IntegrityError` (modelo).
6. Efecto de acceso: tras `suspender`, `POST /api/access/qr/scan/` del socio devuelve denegado (`MEMBERSHIP_INACTIVE`); tras `reactivar`, permitido.
7. `dar_baja` cancela las membresías vigentes del socio.
8. Auditoría: el `post_save` dispara `log_audit_event` (mock de `core.mongodb.log_audit_event`; ver `apps/common/tests/test_audit.py` como molde).
**Frontend** (`npx vitest run src/components/admin src/pages/admin src/hooks/queries`): menú de acciones según estado; modal exige motivo; éxito invalida queries; error muestra toast; ficha refleja el nuevo estado; guard de rutas.
**Manual:** admin suspende a `socio.activo@winni

### BK-FIN-09 · Cobro manual - registrar quién cobró y con qué medio, anular/corregir cobros y evitar duplicados
_Prioridad P1 · Tamaño L · Estado en código: ui-parcial · Depende de: BK-FIN-06, BK-FIN-07, BK-FIN-05 · Issue #191 · Ficha: `docs/backlog/items/BK-FIN-09-cobro-manual-anulacion-auditoria-medio.md`_

**Contexto:** `CobroManualPage` permite registrar un pago en recepción y activa la membresía al instante, pero el cobro queda sin trazabilidad utilizable (quién lo cobró y la observación solo se guardan dentro del JSON `raw_webhook` y la API no los expone), no se registra el medio (efectivo/transferencia/tarjeta), no hay forma de anular o corregir un cobro mal cargado, y la API no previene el doble envío ni valida el estado del socio.

**Qué hacer:**
- Campos en `Pago`: `cobrado_por`, `medio_manual`, `observacion` (columnas reales en vez de `raw_webhook`), y de anulación (`anulado_por`, `anulado_en`, `motivo_anulacion`).
- `medio` obligatorio en el cobro manual (efectivo, transferencia, tarjeta débito, tarjeta crédito, otro).
- Endpoint de anulación con motivo y efecto sobre la membresía creada.
- Exponer en `PagoSerializer` quién cobró, medio, observación y datos de anulación; mostrarlos en UI.
- Validaciones: socio `activo`, `monto` máximo razonable, motivo obligatorio ante diferencia contra el precio, protección contra doble envío (clave de idempotencia).
- Invalidación de queries y comprobante/confirmación en pantalla al registrar.

**Archivos:**
- Backend: `payments/models.py` + migración (+ migración de datos), `payments/serializers.py` (entrada/salida), `payments/services.py` (`cobro_manual` con actor/medio/idempotencia, `anular_cobro_manual`), `payments/views.py` (acción `anular`, headers), `payments/admin.py` (marcar campos de anulación como solo lectura), plantilla de email de anulación (opcional).
- Tests backend: ampliar `test_cobro_manual.py`, `test_cobro_manual_diff.py`; nuevo `test_anular_cobro.py`.
- Frontend: `CobroManualPage.jsx`, `hooks/queries/usePagos.js`, `services/pagosService.js` (`anularPago`), `components/pagos/HistorialPagosCard.jsx`, nuevo `components/pagos/AnularPagoModal.jsx`, `constants/pagos.js` (labels de medio); tests de página y hooks.

**Tests primero:**
**Backend** (`cd backend && pytest -q apps/payments/tests`; molde `test_cobro_manual.py:14-70`: `APITestCase`, `_auth`, `override_settings` de email/Celery, `make_user_factory(rol='recepcionista')`):
1. Cobro guarda `cobrado_por=request.user`, `medio_manual`, `observacion`; `PagoSerializer` los devuelve.
2. `medio` ausente/ inválido -> `400`.
3. Monto distinto del plan sin `motivo_diferencia` -> `400`; con motivo -> `201` y queda guardado (extiende `test_cobro_manual_diff.py`).
4. Socio `baja` -> `400`.
5. Idempotencia: misma `Idempotency-Key` dos veces -> un solo `Pago`, una sola membresía, mismo `201`.
6. Anular: admin anula cobro manual aprobado -> `cancelado`, `anulado_*` completos, membresía `cancelada`, auditoría emitida (mock `core.mongodb.log_audit_event`).
7. Anular: recepcionista -> `403`; pago de MercadoPago -> `400`; ya anulado -> `400`; socio ya renovó después -> comportamiento según decisión 2.
8. Migración de datos: pagos manuales históricos copian `actor_id`/`observacion` (test de migración o función pura).
**Frontend** (`npx vitest run src/pages/recepcion src/hooks/queries/usePagos.test.jsx src/components/pagos`; helpers `renderWithProviders`; mocks de `api` como `usePagos.test.jsx:12-24`): no se puede enviar sin medio; la diferencia exige motivo; el envío usa `Idempotency-Key`; éxito invalida queries; botón "Anular" solo para admin; modal exige motivo y llama al endpoint; fila anulada se renderiza distinta.
**Manual:** `recepcion@winnie.local` registra un co

### BK-FIN-10 · Comprobantes / recibos de pago (número, PDF descargable y envío por email)
_Prioridad P2 · Tamaño L · Estado en código: no-existe · Depende de: BK-FIN-05, BK-FIN-08, BK-FIN-09 · Issue #192 · Ficha: `docs/backlog/items/BK-FIN-10-comprobantes-recibos-de-pago.md`_

**Contexto:** Hoy el único "comprobante" de un pago es el email de confirmación con monto y el id de MercadoPago. No hay número de comprobante, ni PDF, ni descarga desde la app, aunque el spec de "Mis pagos" lo prometía (columna "comprobante"). Se propone un recibo interno mínimo (no fiscal) con numeración, PDF generado en el backend y descarga para socio y staff. La factura electrónica fiscal es una decisión legal aparte.

**Qué hacer:**
**Incluye (propuesta mínima, "recibo interno"):**
- Numeración correlativa de recibos (`R-AAAA-NNNNNN`) asignada al aprobarse un pago (MP o manual).
- PDF de una página generado con `reportlab` (datos del gimnasio, socio, plan, período cubierto, monto, medio, N.º de pago MP si aplica, leyenda "Comprobante de pago - Documento no válido como factura").
- Endpoint de descarga (socio: solo los propios; staff: cualquiera).
- Botones "Comprobante" en Mis pagos, ficha de socio, historial del cobro manual y tras registrar un cobro.
- Opcional: adjuntar el PDF al email de confirmación (decisión 3).

**Archivos:**
- Backend: `payments/models.py` + migración, `payments/receipts.py` (nuevo), `payments/services.py` (asignar número al aprobar, en webhook y cobro manual), `payments/views.py` (acciones `comprobante`), `payments/serializers.py`, `common/models.py` + migración (`GymConfig`), `payments/tests/test_comprobante.py`, plantilla email (opcional adjunto: `enqueue_email` hoy no soporta adjuntos, `common/tasks.py:30-42` y `common/emails.py:25-62` requerirían un parámetro `attachments`).
- Frontend: `services/pagosService.js`, `hooks/queries/usePagos.js`, `HistorialPagosPage.jsx`, `HistorialPagosCard.jsx`, `SocioDetailModal.jsx`, `CobroManualPage.jsx`, tests asociados.

**Tests primero:**
**Backend** (`cd backend && pytest -q apps/payments/tests/test_comprobante.py`; `APITestCase` + `RefreshToken`, factories `conftest.py:23-75`; `Pago` creados directo como en `test_webhook.py:42-48`):
1. Al aprobarse un pago (webhook y cobro manual) se asigna `numero_comprobante` único; un segundo webhook no lo cambia.
2. `GET .../{id}/comprobante/` staff -> `200`, `Content-Type: application/pdf`, el cuerpo empieza con `%PDF-`; `Content-Disposition` con el número.
3. Socio descarga el propio; el de otro socio -> `404`.
4. Pago `pendiente`/`rechazado`/`cancelado` -> `400`.
5. Pago `reembolsado` -> PDF con la leyenda "Reembolsado" (verificar extrayendo texto con `pypdf` si se agrega, o comprobando que `build_receipt_pdf` recibe el estado).
6. Numeración retroactiva (migración de datos) ordena por `paid_at`.
**Frontend** (`npx vitest run`): botón visible solo para aprobado/reembolsado; click llama al servicio con `responseType: 'blob'` y dispara la descarga (mock de `window.URL.createObjectURL`; existe `frontend/src/services/__tests__/reportsService.test.js` como molde, **No verificado** su detalle); error muestra toast.
**Manual:** descargar con `socio.activo@winnie.local` y con `recepcion@winnie.local` desde la ficha; abrir el PDF y revisar datos.

### BK-FIN-11 · Caja diaria y cierre de turno para cobros manuales (idea a validar)
_Prioridad P3 · Tamaño L · Estado en código: solo-idea · Depende de: BK-FIN-09, BK-FIN-04 · Issue #193 · Ficha: `docs/backlog/items/BK-FIN-11-caja-diaria-y-cierre-de-turno.md`_

**Contexto:** No hay ningún rastro de "caja" en el código, la documentación ni los specs: recepción cobra en efectivo/transferencia (`CobroManualPage`) pero no existe forma de ver cuánto cobró cada operador en el día por medio de pago, ni de cerrar el turno comparando lo esperado con lo contado. Es una **idea a validar** con el dueño: depende de que los cobros manuales registren operador y medio (BK-FIN-09).

**Qué hacer:**
**Incluye (propuesta):**
- Resumen de caja por día y operador: cantidad y total de cobros manuales por `medio_manual`, total de anulaciones.
- Cierre de turno: el operador declara lo contado en efectivo, el sistema calcula la diferencia y deja registro inmutable.
- Pantalla "Caja" para recepcionista (su caja) y administrador (todas, con diferencias).
- Exporte del cierre (reutilizando `apps/reports/exporters.py`).

**Archivos:**
Backend: `payments/models.py` (`CierreCaja`) + migración, `payments/services.py` (`resumen_caja`, `cerrar_caja`), `payments/views.py`/`urls.py` (vistas de caja), `payments/serializers.py`, `payments/tests/test_caja.py`. Frontend: `CajaDiariaPage.jsx`, hooks, `pagosService.js`, `App.jsx`, `Sidebar.jsx`, tests.

**Tests primero:**
**Backend** (`cd backend && pytest -q apps/payments/tests/test_caja.py`; `APITestCase` + `RefreshToken`, factories `conftest.py:23-75`):
1. Resumen suma solo cobros manuales aprobados del operador y del día (hora ART, borde 23:59/00:00), agrupa por medio, descuenta anulados.
2. Recepcionista no puede consultar la caja de otro operador (`403`); admin sí.
3. Cierre: calcula `diferencia = contado - esperado`; segundo cierre del mismo día/operador -> `400`.
4. Después del cierre, anular un cobro de ese día/operador -> `400`/`409` según decisión 3.
5. `socio` -> `403`.
**Frontend** (`npx vitest run src/pages/recepcion`): render del resumen, cambio de fecha, modal de cierre con diferencia en vivo, errores; guard de ruta.
**Manual:** `recepcion@winnie.local` registra cobros con distintos medios, cierra caja; `admin@winnie.local` ve el cierre y la diferencia.

## B14 — Plataforma: estados de error, auditoría y operación · Rodrigo · ~20.5 días · rama `feat/plataforma-estados`

**Commit (squash):** `feat(platform): error boundary, 403/offline/session states, audit viewer, settings and backups`

**En la descripción del PR:** Closes #207 · Closes #208 · Closes #209 · Closes #210 · Closes #211 · Closes #219 · Closes #221 · Closes #222

**Contexto.** 8 fichas agrupadas por zona de código. Hacelas en el orden de la lista.

### BK-PLT-01 · Error Boundary global y página de error inesperado (500)
_Prioridad P1 · Tamaño M · Estado en código: no-existe · Depende de: — · Issue #207 · Ficha: `docs/backlog/items/BK-PLT-01-error-boundary-pagina-500.md`_

**Contexto:** Si un componente lanza una excepción durante el render, React desmonta todo el árbol y el usuario ve una pantalla en blanco. No hay ningún Error Boundary en el frontend ni página de "algo salió mal". Sentry está inicializado pero nunca recibe estos errores de render.

**Qué hacer:**
componente `ErrorBoundary` (clase) que captura errores de render, reporta a Sentry, muestra `ErrorFallbackPage` con botones "Reintentar" (resetea el boundary) y "Ir al inicio"; boundary global en `main.jsx`; boundary por ruta dentro de `AppLayout` para que un error en una página no tumbe el sidebar; tests.

**Archivos:**
- Crear `frontend/src/components/errors/ErrorBoundary.jsx` y `ErrorBoundary.test.jsx`.
- Crear `frontend/src/pages/ErrorFallbackPage.jsx` y `ErrorFallbackPage.test.jsx`.
- Modificar `frontend/src/main.jsx` (envolver `<App/>`).
- Modificar `frontend/src/components/layout/AppLayout.jsx` (boundary por página).
- Opcional: `frontend/src/lib/sentry.js` sin cambios (`captureException` es no-op sin `init`).

**Tests primero:**
Convención: Vitest + React Testing Library, tests colocados junto al archivo (`*.test.jsx`) o en `__tests__/`; `vite.config.js` define `globals: true`, `environment: 'jsdom'`, `setupFiles: './setupTests.js'`. Comandos: `cd frontend && npx vitest run` (o `docker compose exec frontend npx vitest run --coverage`); lint: `npm run lint`. Umbrales de cobertura: líneas 68, ramas 68, funciones 65, statements 68.
Escribir primero:
- `ErrorBoundary.test.jsx`: componente hijo que hace `throw new Error('boom')` → se renderiza el fallback con "Algo salió mal"; `vi.mock('@sentry/react')` y verificar `captureException` llamado una vez con el error; silenciar `console.error` con `vi.spyOn`.
- Click en "Reintentar" con hijo que deja de fallar (flag mutable) → vuelve a renderizar el hijo.
- Cambio de `resetKeys` resetea el estado de error.
- `ErrorFallbackPage`: botón "Volver al inicio" navega a `/dashboard` (usar `MemoryRouter`).
- Manual: en dev, agregar temporalmente un `throw` en `DashboardPage`; verificar pantalla de error, que el sidebar sigue funcionando (boundary por página) y que "Reintentar" funciona. Probar con las tres cuentas de `seed_demo_users`.

### BK-PLT-02 · Pantalla 403 "Sin permisos" y manejo correcto de 403 de la API
_Prioridad P2 · Tamaño M · Estado en código: no-existe · Depende de: — · Issue #208 · Ficha: `docs/backlog/items/BK-PLT-02-pagina-403-sin-permisos.md`_

**Contexto:** Cuando un usuario entra a una ruta que su rol no permite, `ProtectedRoute` lo redirige en silencio a su home sin explicar nada. Además, cuando la API responde 403 el frontend lo trata como "sesión expirada". No existe una pantalla 403 ni un mensaje coherente de "no tenés permiso".

**Qué hacer:**
página `ForbiddenPage` (403) reutilizable; `ProtectedRoute` renderiza la página (o redirige con toast, según decisión) cuando el rol no alcanza; separar 401 de 403 en `classifyError` (nuevo tipo `forbidden`); unificar copy (voseo) en el caso 4403 del WebSocket.

**Archivos:**
- Crear `frontend/src/pages/ForbiddenPage.jsx` + `ForbiddenPage.test.jsx`.
- Crear `frontend/src/utils/homeForRole.js` + test.
- Modificar `frontend/src/components/routing/ProtectedRoute.jsx`, `PublicRoute.jsx` (usar helper).
- Modificar `frontend/src/components/routing/ProtectedRoute.test.jsx` (casos 4 y 6 hoy esperan redirect: cambiar a esperar la página 403).
- Modificar `frontend/src/utils/errorHandling.js` y `frontend/src/utils/__tests__/errorHandling.test.js`.
- Modificar `frontend/src/hooks/queries/usePlanes.js` (case `forbidden`).
- Modificar `frontend/src/hooks/useWebSocket.js:113` (copy en voseo) y su test `hooks/__tests__/useWebSocket.test.jsx`.

**Tests primero:**
Vitest + RTL; `vi.mock('../../hooks/useAuth', () => ({ default: vi.fn() }))` y `MemoryRouter` como en `ProtectedRoute.test.jsx` (casos existentes en líneas ~46-105 son la plantilla).
- `ProtectedRoute`: socio en ruta `roles=['administrador','recepcionista']` → texto "No tenés permiso" (antes esperaba `SocioHome`). Recepcionista en `roles=['administrador']` → idem. Admin con `roles=['socio']` → idem. Sin token → sigue yendo a `/login`.
- `errorHandling.test.js`: 403 → `type 'forbidden'`, 401 → `'auth'`.
- `ForbiddenPage`: botón "Ir a mi inicio" navega a `/dashboard` (staff) o `/socio/credencial` (socio).
- Manual: entrar con `recepcionista@winniegym.com` (seed `seed_demo_users`, ver `docs/deploy.md`) a `/admin/usuarios`; con un socio a `/recepcion/aforo`.
Comandos: `cd frontend && npx vitest run && npm run lint`.

### BK-PLT-03 · Banner de sin conexión y manejo global de errores de red / servidor dormido
_Prioridad P2 · Tamaño M · Estado en código: ui-parcial · Depende de: — · Issue #209 · Ficha: `docs/backlog/items/BK-PLT-03-estado-offline-sin-conexion.md`_

**Contexto:** No existe un estado "sin conexión" global. Los errores de red aparecen solo como toasts sueltos en un par de pantallas (`RegisterPage`, `usePlanes`); el resto de las pantallas falla sin explicación. Además el backend de producción corre en Render Free y se duerme (cold start), situación que hoy se ve como errores de red genéricos. Mucho valor en el socio móvil (gimnasio con mala señal) y en la terminal de recepción.

**Qué hacer:**
hook `useOnlineStatus` (eventos `online`/`offline` + ping opcional a `/api/health/`), banner global fijo "Sin conexión" (rol `status`/`aria-live`), integración con React Query (`onlineManager`) para pausar/reanudar, `QueryCache.onError` global que muestre un único toast de "no pudimos conectar con el servidor" (deduplicado) para errores `network` y 502/503/504, y estado de "servidor despertando" (timeout largo + mensaje).

**Archivos:**
- Crear `frontend/src/hooks/useOnlineStatus.js` + `__tests__/useOnlineStatus.test.jsx`.
- Crear `frontend/src/components/system/ConnectionBanner.jsx` + test.
- Modificar `frontend/src/main.jsx` (QueryCache onError + onlineManager).
- Modificar `frontend/src/App.jsx` (montar banner).
- Modificar `frontend/src/pages/RegisterPage.jsx:107` para reutilizar el mensaje común (opcional).

**Tests primero:**
Vitest + RTL + jsdom (`vite.config.js` test env). Escribir primero:
- `useOnlineStatus`: `window.dispatchEvent(new Event('offline'))` dentro de `act` → `isOnline=false`; `online` + ping mockeado OK → `isServerReachable=true`; ping falla → sigue false.
- `ConnectionBanner`: con `isOnline=false` renderiza `role="status"` con el texto; con `true` no renderiza nada.
- QueryCache: dos errores de red seguidos disparan UN solo toast (mock de `sonner` como en `services/__tests__/api.test.js`).
- Manual: DevTools → Network → Offline en `http://localhost:5173` con cada rol; luego Online y verificar que las queries se refrescan. Probar con backend apagado (`docker compose stop backend`).
Comandos: `cd frontend && npx vitest run && npm run lint`.

### BK-PLT-04 · Sesión expirada: mensaje contextual en el login y retorno a la ruta original (`next`)
_Prioridad P1 · Tamaño M · Estado en código: ui-parcial · Depende de: — · Issue #210 · Ficha: `docs/backlog/items/BK-PLT-04-sesion-expirada-redireccion-con-next.md`_

**Contexto:** El cierre de sesión forzado funciona (refresh de JWT + logout + toast), pero: el login ignora el motivo (`state.reason: 'inactivity'` se envía y nadie lo lee), no se recuerda la URL a la que se quería ir (siempre se cae en `/dashboard`), y `ProtectedRoute` manda a `/login` sin `next`. En recepción, donde la sesión caduca a los 30 min de inactividad, el staff pierde su contexto cada vez.

**Qué hacer:**
guardar la ruta de origen (`pathname + search`) al expirar o al ser rebotado por `ProtectedRoute`; leerla en el login (email/password) y en `AuthCallback` (vía `sessionStorage`) y navegar a ella tras autenticar si es una ruta interna y permitida por el rol; mostrar en `/login` un aviso contextual según `reason` (`inactivity` | `expired`); validar `next` contra open-redirect (solo paths relativos que empiecen con `/` y no `//`).

**Archivos:**
- Crear `frontend/src/utils/safeNext.js` + `__tests__/safeNext.test.js`.
- Modificar `frontend/src/components/routing/ProtectedRoute.jsx` (+ test).
- Modificar `frontend/src/services/api.js` (+ `services/__tests__/api.test.js`).
- Modificar `frontend/src/components/auth/EmailPasswordForm.jsx` y su test (No verificado su ubicación exacta; buscar con `fd EmailPasswordForm`).
- Modificar `frontend/src/pages/AuthCallback.jsx` (+ `AuthCallback.test.jsx`) y `frontend/src/pages/LoginPage.jsx`.

**Tests primero:**
Vitest + RTL; mocks de `sonner` y de `useAuth` como en los tests citados.
- `safeNext`: acepta `/recepcion/acceso?x=1`; rechaza `https://evil.com`, `//evil.com`, `/login`, `javascript:alert(1)`, vacío.
- `ProtectedRoute`: sin token en `/recepcion/acceso` → ubicación final `/login?next=%2Frecepcion%2Facceso`.
- `api.test.js`: 401 `session_inactive` → `navigator` llamado con una URL que contiene `reason=inactivity` y `next`; refresh fallido → `reason=expired`.
- `LoginPage`/`EmailPasswordForm`: con `?next=/recepcion/aforo` y login OK → navega a `/recepcion/aforo`; con `next` malicioso → `/dashboard`.
- `AuthCallback`: lee `sessionStorage['auth-next']` y lo consume (lo borra).
- Manual: con admin local, esperar/forzar expiración (borrar `access` en `localStorage['auth-storage']` y poner un `refresh` inválido) estando en `/recepcion/acceso`; verificar aviso y retorno. Probar login con Google en entorno donde esté configurado.
Comandos: `cd frontend && npx vitest run && npm run lint`.

### BK-PLT-05 · ComingSoonPage sin uso: decidir entre eliminarla o usarla para secciones planificadas
_Prioridad P3 · Tamaño S · Estado en código: ui-parcial · Depende de: — · Issue #211 · Ficha: `docs/backlog/items/BK-PLT-05-comingsoon-page-codigo-muerto.md`_

**Contexto:** `ComingSoonPage` está importada y cableada en `App.jsx`, pero la lista `COMING_SOON_PATHS` está vacía, así que nunca se monta. Además sus etiquetas apuntan a rutas legacy (`/socios`, `/membresias`, …) que hoy son redirects. Es código muerto que puede confundir a quien agregue una sección nueva.

**Qué hacer:**
decisión y ejecución de una de las dos opciones: (A) eliminar `ComingSoonPage`, su test, el import y `COMING_SOON_PATHS`; o (B) conservarla como mecanismo oficial: renombrar a `FeaturePlaceholderPage` con título/subtítulo por props o por un mapa actualizado, y registrar rutas planificadas (p. ej. `/admin/comunicaciones`, BK-PLT-08) con un ítem en el sidebar marcado con `Badge`.

**Archivos:**
- A: eliminar `frontend/src/pages/ComingSoonPage.jsx` y `.test.jsx`; editar `App.jsx` (líneas 16, 40, 140-143).
- B: modificar `ComingSoonPage.jsx` y su test, `App.jsx`, y opcionalmente `Sidebar.jsx`.

**Tests primero:**
- A: no hay tests nuevos; correr `cd frontend && npm run lint && npx vitest run --coverage` y confirmar umbrales.
- B: primero actualizar `ComingSoonPage.test.jsx` para pasar `title`/`subtitle` por props y verificar que se renderizan; test en `App` no existe (No verificado `App.test.jsx`), agregar uno que navegue a la ruta y espere el texto "Próximamente" para un rol permitido y la redirección para un rol no permitido.
- Manual: abrir la ruta planificada con admin y con recepcionista.

### BK-PLT-13 · Visor de auditoría para administradores (quién cambió qué)
_Prioridad P2 · Tamaño L · Estado en código: backend-sin-ui · Depende de: BK-PLT-12 · Issue #219 · Ficha: `docs/backlog/items/BK-PLT-13-visor-de-auditoria-admin.md`_

**Contexto:** El backend ya escribe un trail de auditoría en MongoDB (`audit_logs`) con snapshot, diff por campo, actor y `request_id`, pero no existe ningún endpoint ni pantalla para leerlo: solo se puede consultar entrando a la base. La iteración anterior lo dejó explícitamente diferido. Sin el fix de BK-PLT-12 el actor sale como `system` en cambios hechos por API, así que esa ficha va primero.

**Qué hacer:**
endpoint de solo lectura paginado con filtros (modelo, acción, actor, rango de fechas, `instance_id`), pantalla admin con tabla y detalle expandible del diff, enlace desde modales de socio/plan ("Ver historial") opcional.

**Archivos:**
Backend: `apps/common/views.py` (`AuditLogListView`) o app nueva `apps/audit`; `serializers.py` (serializer no-model para dicts de Mongo); `urls.py`; ruta en `core/urls.py`; función `list_audit_events(filters, page, page_size)` en `core/mongodb.py`; tests. Frontend: página, servicio, hook, ruta, sidebar, tests.

**Tests primero:**
- Backend (pytest, Mongo real como `test_audit.py:14-35` con limpieza de colección): admin lista con paginación y orden; filtros `model`, `action`, `actor_id`, rango; recepcionista y socio → 403; sin token → 401; `password` redactado en `snapshot` de `auth.user`/`users.user`; fecha inválida → 400; Mongo caído (patch `get_collection` con excepción) → 503. Correr `cd backend && pytest apps/common -q`.
- Frontend (Vitest/RTL): render de filas con datos mockeados (`vi.mock('../../services/auditService')`), filtros llaman al servicio con parámetros, vacío y error.
- Manual: con admin, cambiar el precio de un plan y verlo en la pantalla con su email como actor (requiere BK-PLT-12).

### BK-PLT-15 · Configuración ampliada: horarios por día, feriados, política de cancelación global y aforo por sala
_Prioridad P3 · Tamaño L · Estado en código: solo-idea · Depende de: BK-PLT-14 · Issue #221 · Ficha: `docs/backlog/items/BK-PLT-15-configuracion-ampliada-horarios-feriados-politicas.md`_

**Contexto:** La configuración del gimnasio es un singleton con 5 campos planos (nombre, aforo máximo, apertura, cierre, teléfono). Un gimnasio real necesita horarios distintos por día, feriados/cierres especiales, políticas globales (cancelación de reservas, ventana de reserva) y capacidad por sala. Hoy esas reglas existen solo parcialmente y por clase, no como configuración. Es una idea sin especificación; esta ficha propone un modelo mínimo.

**Qué hacer:**
**Incluye (propuesta por fases):** F1 horarios por día de semana (`HorarioDia`); F2 feriados/cierres (`DiaEspecial`); F3 política global de cancelación y anticipación de reserva con override por clase; F4 entidad `Sala` con aforo propio para validar `cupo_maximo <= capacidad`.

**Archivos:**
Backend: modelos/serializers/vistas/migraciones en `apps/common` (y `apps/classes` para `Sala`), tests. Frontend: refactor de `AdminConfiguracionPage.jsx` en subcomponentes `components/admin/config/*`, hooks, tests.

**Tests primero:**
- Backend (pytest/`APITestCase`; patrón `apps/common/tests/test_gym_config.py`: `RefreshToken.for_user` + `client.credentials`): GET público, PUT/POST solo admin (recepcionista y socio 403); validaciones de horas; unicidad de fecha; seed de 7 días; data-migration de `Sala`; `cupo_maximo > capacidad` → 400 en `ClaseSerializer`.
- Frontend (Vitest/RTL): edición de un día; marcar "Cerrado" deshabilita las horas; alta/baja de feriado.
- Manual: cargar un feriado y verificar el efecto una vez implementado BK-PLT-14.

### BK-PLT-16 · Operación: sin backups de MongoDB y sin monitoreo de las tareas programadas (vencimientos)
_Prioridad P3 · Tamaño M · Estado en código: no-existe · Depende de: — · Issue #222 · Ficha: `docs/backlog/items/BK-PLT-16-operacion-backups-mongo-y-monitoreo-de-tareas.md`_

**Contexto:** Solo se documentan huecos con evidencia concreta: (1) MongoDB Atlas M0 no tiene backups y el propio `docs/deploy.md` lo deja "fuera de scope", pero Mongo guarda el historial de QR y la auditoría; (2) el scheduler y el worker de Celery corren dentro del mismo contenedor web (Render Free) y no hay ninguna alerta si la tarea diaria de vencimientos deja de correr o falla; el health check solo comprueba que haya algún worker respondiendo.

**Qué hacer:**
(A) workflow `.github/workflows/mongo-backup.yml` semanal (cron) con `mongodump` comprimido hacia un artefacto/bucket (decisión de destino), con restauración documentada; (B) heartbeat de tareas: guardar `last_success_at` de `check_expiring_memberships` (cache Redis o `django_celery_beat`), exponerlo en `/api/health/` como check no crítico `expiring_task` y alertar si supera 36 h; (C) hacer el cron tolerante a días perdidos (procesar `delta <= 0` y umbrales no enviados en lugar de igualdad exacta).

**Archivos:**
- Crear `.github/workflows/mongo-backup.yml` (secrets `MONGO_URI`, destino del artefacto).
- Modificar `backend/apps/memberships/tasks.py` (heartbeat + lógica tolerante), `backend/core/urls.py` (nuevo check), `docs/deploy.md` (procedimiento de restauración y alerta de UptimeRobot por palabra clave `degraded`).
- Tests en `backend/apps/memberships/tests/` y `backend/apps/common/tests/test_observability.py` (existe; leerlo antes para seguir su patrón).

**Tests primero:**
Backend (pytest; `core.settings.test` con `CELERY_TASK_ALWAYS_EAGER=True`; factories `make_membresia_factory` de `backend/conftest.py`):
- Tarea ejecutada con éxito escribe `last_success_at`; el health devuelve `expiring_task.ok=true`.
- Sin ejecución en > 36 h (cache vacío o viejo) → `ok=false` y `status='degraded'`, HTTP 200.
- Membresía con `fecha_fin = hoy - 1` y `estado=activa` (cron saltado un día) → pasa a `vencida` y se envía el aviso final una sola vez (`avisos_enviados`).
- El umbral 3 no enviado por salto se envía al día siguiente sin duplicar.
Manual: ejecutar `docker compose exec backend python manage.py shell -c "from apps.memberships.tasks import check_expiring_memberships as t; print(t())"` y consultar `/api/health/`. Para el backup: disparar el workflow manualmente (`workflow_dispatch`) y restaurar en un Mongo local con `mongorestore`.
Comandos: `cd backend && pytest apps/memberships apps/common -q`.

## B15 — Clases: instructor, reportes y calendario mensual · Franco · ~18 días · rama `feat/clases-instructor-reportes`

**Commit (squash):** `feat(classes): instructor entity, class reports and monthly calendar`

**En la descripción del PR:** Closes #180 · Closes #181 · Closes #182

**Contexto.** 3 fichas agrupadas por zona de código. Hacelas en el orden de la lista.

### BK-CLS-11 · Instructor como entidad (y rol Instructor) en lugar de texto libre
_Prioridad P3 · Tamaño XL · Estado en código: solo-idea · Depende de: BK-CLS-09, BK-CLS-10 · Issue #180 · Ficha: `docs/backlog/items/BK-CLS-11-instructor-modelo-y-rol.md`_

**Contexto:** El instructor de una clase es un `CharField` de texto libre sin relación con ningún usuario ni ficha; el formulario ofrece 4 nombres hardcodeados que no coinciden con los datos del seed; no existe el rol `instructor` (el enum solo tiene administrador, recepcionista y socio). Eso impide: validar disponibilidad (un instructor en dos salas a la vez), reportes por instructor, que el instructor vea y pase lista de sus clases, y mantener una lista oficial. Es una idea a validar con el dueño: el código actual lo deja explícitamente como decisión diferida.

**Qué hacer:**
**Incluye (propuesta por fases):**
- **Fase 1 (recomendada primero):** modelo `Instructor` (ficha, sin login) + FK en `Clase`/`SesionClase` + selector alimentado por API + validación de solapamiento por instructor.
- **Fase 2 (solo si se confirma):** rol `instructor` con login (`User.Rol.INSTRUCTOR`), vinculo `Instructor.usuario` 1-1, vistas "Mis clases" y asistencia limitada a sus clases.

**Archivos:**
- Fase 1: `backend/apps/classes/{models,serializers,views,urls,admin}.py`, migraciones, `seed_data.py`; `frontend` hooks, `CreateClassPage.jsx`, `AdminConfiguracionPage.jsx`.
- Fase 2: `backend/apps/users/{models,serializers,middleware}.py`, `backend/apps/access/permissions.py` (`IsInstructor`), nuevas rutas front y navegación, tests de permisos por rol.

**Tests primero:**
Backend (`backend/apps/classes/tests/test_instructores.py`; `APITestCase`; `cd backend && pytest -q`):
- CRUD y permisos (admin/recepcionista/socio); desactivar en lugar de borrar si tiene clases.
- Solapamiento de instructor -> 400.
- Migración de datos: textos existentes generan instructores únicos.
- Fase 2: instructor autenticado solo ve/edita asistencia de sus clases (403 en ajenas; socio/recepción sin cambios).
Frontend (vitest/RTL): selector con datos de API; ruta `/instructor/clases` solo para el rol; redirect por rol.
Manual: crear instructor, asignarlo, intentar doble asignación.

### BK-CLS-12 · Reportes de clases (ocupación y asistencia por clase/instructor), no-shows y cierre automático
_Prioridad P2 · Tamaño L · Estado en código: no-existe · Depende de: BK-CLS-09, BK-CLS-02, BK-CLS-11 · Issue #181 · Ficha: `docs/backlog/items/BK-CLS-12-reportes-de-clases-ocupacion-asistencia-y-no-shows.md`_

**Contexto:** El módulo de reportes solo tiene morosidad, facturación y un "reporte de asistencia" que en realidad mide ingresos por QR al gimnasio (`AccessLog`), no asistencia a clases. No hay ningún endpoint ni pantalla de ocupación por clase, asistencia por clase/instructor, ni seguimiento de ausentes (no-shows). La única métrica de clases es la "tasa de asistencia" calculada en el navegador dentro de `AttendancePage`. No existen sanciones ni cierre automático de listas.

**Qué hacer:**
- Reporte de ocupación de clases (por clase, disciplina, instructor, día/franja) con export CSV/XLSX/PDF reutilizando `exporters.export`.
- Reporte de asistencia a clases (presentes/ausentes/sin marcar y tasa) por clase/sesión, instructor y socio.
- Métrica de no-shows por socio (ausencias en ventana de N días).
- Cierre automático de asistencia (tarea Celery) tras X horas de finalizada la sesión.
- Política de sanciones configurable (propuesta) y su aplicación en la reserva.
- Pestañas "Clases" en `ReportesPage`.

**Archivos:**
- Backend: `reports/services.py` (`build_clases_ocupacion`, `build_clases_asistencia`, `build_no_shows`), `reports/views.py`, `reports/urls.py`, `classes/tasks.py` (cierre automático), `classes/models.py` (sanciones), tests.
- Frontend: `reportsService.js`, `useReportes.js`, `ReportesPage.jsx`, tests.

**Tests primero:**
Backend (`backend/apps/reports/tests/test_reports_endpoints.py` como modelo; `APITestCase`; `cd backend && pytest apps/reports apps/classes -q`):
- Ocupación: 3 clases con distintos inscriptos -> porcentajes exactos; filtros por categoría/instructor; export CSV con BOM (ver `test_csv_bom.py`).
- Asistencia: sesiones con presentes/ausentes/sin marcar -> tasas; agrupación por instructor y socio.
- No-shows: umbral 3 en 30 días; excluye `asistio=None`.
- Permisos: socio 403, sin token 401.
- Cierre automático: con `CELERY_TASK_ALWAYS_EAGER` llamar la tarea; marca ausentes a las sesiones finalizadas hace > X h, idempotente.
Frontend (vitest/RTL, `ReportesPage.test.jsx`): tabs, filtros, export dispara `api.get` con `responseType: 'blob'`.
Manual: `admin@winnie.local` -> Reportes -> "Clases" -> exportar XLSX.

### BK-CLS-13 · Vista mensual del calendario y gestión de feriados / cierres del gimnasio
_Prioridad P3 · Tamaño L · Estado en código: solo-idea · Depende de: BK-CLS-09, BK-CLS-07 · Issue #182 · Ficha: `docs/backlog/items/BK-CLS-13-vista-mensual-feriados-y-cierres.md`_

**Contexto:** El calendario solo tiene vista semanal y no existe ningún concepto de feriado, cierre especial o vacaciones: una clase de lunes se repite aun el 25 de mayo o el 1 de enero, y cada cierre obliga a cancelar la clase manualmente (que hoy la cancela para siempre, ver BK-CLS-05). Tampoco hay vista mensual para ver de un vistazo la ocupación del mes. Es una idea a validar: depende de sesiones por fecha.

**Qué hacer:**
**Incluye (propuesta):**
- Modelo `CierreGimnasio` (rango de fechas, motivo, `afecta`: todo el gimnasio o una sala) y precarga opcional de feriados nacionales.
- Al crear/modificar un cierre: las sesiones afectadas pasan a `cancelada` con motivo automático y se notifica (reutiliza BK-CLS-05), o directamente no se generan.
- Vista mensual en `/admin/clases` (grilla de mes con conteo de clases, ocupación y marcas de cierre) y marca de cierre en la agenda del socio.
- Horario de apertura por día de la semana (extensión de `GymConfig`).

**Archivos:**
- Backend: `classes/models.py` (o `common`), serializers, views, migraciones, servicio de cancelación masiva reutilizando `cancelar_sesion`, tests.
- Frontend: `ClassMonthView.jsx`, `ClassSchedulePage.jsx`, `AdminConfiguracionPage.jsx`, hooks, tests.

**Tests primero:**
Backend (`backend/apps/classes/tests/test_cierres.py`; `cd backend && pytest apps/classes -q`): crear cierre cancela solo las sesiones del rango y de la sala; notifica una vez por socio; rango inválido -> 400; permisos (recepción lectura, solo admin escribe; socio lectura).
Frontend (vitest/RTL): vista mensual pinta días cerrados; modal de cierre valida fechas; el calendario semanal marca el día cerrado.
Manual: `admin@winnie.local` -> Configuración -> cierre del 25/12 -> ver sesión cancelada y email.

## B16 — Ideas de plataforma (requieren decisión de producto) · Franco + Rodrigo · ~37 días · rama `feat/plataforma-ideas`

**Commit (squash):** `feat(platform): notifications, bulk communications, granular permissions, multi-branch and trainers`

**En la descripción del PR:** Closes #213 · Closes #214 · Closes #215 · Closes #216 · Closes #217

**Contexto.** 5 fichas agrupadas por zona de código. Hacelas en el orden de la lista.

### BK-PLT-07 · Bandeja de notificaciones in-app (campana con leídas / no leídas)
_Prioridad P3 · Tamaño L · Estado en código: solo-idea · Depende de: BK-PLT-08 · Issue #213 · Ficha: `docs/backlog/items/BK-PLT-07-bandeja-notificaciones-in-app.md`_

**Contexto:** Hoy toda comunicación al usuario sale por email; la app no guarda ni muestra notificaciones. No hay modelo `Notificacion`, ni endpoint, ni campana en el `TopBar`. Existe infraestructura reutilizable (Channels + Redis + Celery) pero solo para el aforo. Clasificación de la pieza: **(c) solo idea** (sin rastro en specs).

**Qué hacer:**
**Incluye (propuesta):** modelo `Notificacion` por usuario, endpoints de listado/contador/marcar leída, campana con badge en `TopBar` (staff) y en `MemberLayout` (socio), productores desde los eventos de email existentes, polling (30–60 s) como primera versión; WebSocket `ws/notificaciones/` como mejora posterior.

**Archivos:**
Crear `backend/apps/notifications/{models,serializers,views,urls,services,tests}`; registrar app en `INSTALLED_APPS` (`core/settings/base.py`) y URLs en `core/urls.py`; productores: llamar `notificar(usuario, tipo, ...)` desde `classes/signals.py`, `memberships/tasks.py`, `payments/services.py` junto a cada `enqueue_email`. Frontend: hook, componentes, ruta en `App.jsx`, campana en `TopBar.jsx` y `MemberLayout.jsx`.

**Tests primero:**
- Backend (pytest + `APITestCase`, fixtures `make_user_factory` de `backend/conftest.py`): usuario solo ve las suyas (otro usuario → 404 en `leer`); contador; `leer-todas`; paginación; productor: cancelar una clase (`cancelar_clase`) crea una `Notificacion` por inscripto no en espera; `check_expiring_memberships` crea una por umbral. Correr `cd backend && pytest apps/notifications -q`.
- Frontend (Vitest + RTL): `NotificationBell` muestra badge con el conteo mockeado; click en item llama `leer` y navega a `url`; vacío y error.
- Manual: cancelar una clase como admin y ver la campana del socio inscripto (cuentas de `seed_demo_users`).

### BK-PLT-08 · Comunicaciones: envío masivo por segmento y canales (email / push / WhatsApp)
_Prioridad P3 · Tamaño XL · Estado en código: solo-idea · Depende de: BK-PLT-06 · Issue #214 · Ficha: `docs/backlog/items/BK-PLT-08-comunicaciones-masivas-por-segmento.md`_

**Contexto:** El sistema solo envía 4 emails transaccionales automáticos (más el de activación/reset). No hay forma de que el staff redacte y envíe un comunicado a un grupo (p. ej. "socios con membresía vencida", "inscriptos a Yoga"), ni recordatorios de clases, ni otros canales. Existe una base reutilizable (Celery + helper de emails + plantillas), pero ningún modelo, API ni pantalla de comunicaciones.

**Qué hacer:**
**Incluye (propuesta, por fases):** Fase 1 email: modelo `Comunicacion` + `Destinatario` con segmentos predefinidos, vista previa del conteo, envío en lote por Celery con reporte (enviados/fallidos), pantalla `/admin/comunicaciones`. Fase 2: recordatorios automáticos de clases y lista de espera. Fase 3: push/WhatsApp (decisión de proveedor).

**Archivos:**
Backend: `apps/communications/` (modelos, serializers, views, urls, `tasks.py::enviar_comunicacion`, `segments.py`, tests), plantilla `emails/comunicacion.html/.txt`, registrar en `INSTALLED_APPS` y `core/urls.py`. Frontend: página, hook, ruta, sidebar.

**Tests primero:**
- Backend: cada segmento devuelve los socios correctos (fixtures `make_socio_factory`, `make_plan_factory`, `make_membresia_factory` en `backend/conftest.py`); permisos (recepcionista 403 en POST, socio 403 en todo); envío con `CELERY_TASK_ALWAYS_EAGER` (`core/settings/test.py:16`) y `mail.outbox` (patrón `test_welcome_signal.py`); socios sin email o con opt-out excluidos; fallo parcial no corta el lote.
- Frontend: formulario valida asunto/mensaje; preview muestra conteo; envío deshabilitado con 0 destinatarios.
- Manual: crear 2 socios con distintos vencimientos y enviar al segmento `vence_en_7_dias`; ver el email en Mailtrap.

### BK-PLT-09 · Permisos granulares por rol (matriz editable) sobre los 3 roles fijos
_Prioridad P3 · Tamaño XL · Estado en código: solo-idea · Depende de: BK-PLT-02, BK-PLT-12 · Issue #215 · Ficha: `docs/backlog/items/BK-PLT-09-permisos-granulares-matriz-editable.md`_

**Contexto:** Los permisos hoy son 3 roles fijos (`administrador`, `recepcionista`, `socio`) y 3 clases de permiso de DRF + listas de roles hardcodeadas en las rutas del frontend. No existe modelo de permisos ni pantalla para editarlos. Una matriz editable es una idea sin especificación; esta ficha deja la propuesta mínima y los riesgos.

**Qué hacer:**
**Incluye (propuesta mínima):** catálogo fijo de "capacidades" (strings), tabla rol→capacidades editable solo por admin, una clase DRF `HasCapability` y un endpoint que expone las capacidades del usuario para que el frontend oculte/ruteé. Los 3 roles siguen existiendo; el admin conserva todas las capacidades (no editable) para evitar lock-out.

**Archivos:**
Backend: modelo+migración+seed, `permissions.py::HasCapability`, vistas matriz/capacidades, reemplazar gradualmente las clases actuales (mantener las existentes como alias). Frontend: store/hook, `Can`, página, ajuste de `ProtectedRoute`, `Sidebar`, `AppBottomNav`, tests.

**Tests primero:**
- Backend (pytest + `APITestCase`): la matriz por defecto reproduce exactamente los permisos actuales (test parametrizado por endpoint×rol contra la tabla vigente, usando `make_user_factory(rol=...)`); quitar `cobros.crear` a recepción → 403 en `POST` de cobro manual; admin siempre permitido; PUT con rol admin → 400; cache invalidado.
- Frontend (Vitest/RTL): `<Can>` oculta; `ProtectedRoute capability` renderiza 403 (BK-PLT-02).
- Manual: quitar `reportes.ver` a recepción y verificar sidebar y 403 en `/api/reportes/`.

### BK-PLT-10 · Multi-sede: modelo Sede y su impacto en QR, aforo, planes, clases y reportes
_Prioridad P3 · Tamaño XL · Estado en código: solo-idea · Depende de: BK-PLT-14 · Issue #216 · Ficha: `docs/backlog/items/BK-PLT-10-multi-sede.md`_

**Contexto:** El sistema asume un único gimnasio. No existe modelo `Sede`; "Sede Central" aparece hardcodeada en la credencial del socio y en un plan de seed, y los planes muestran un texto "1 sede"/"2 sedes" que solo existe en el frontend. Todo (config, aforo, QR, clases, reportes) es global.

**Qué hacer:**
**Incluye (propuesta):** modelo `Sede`; FK nullable→obligatoria en `Clase`, `AccessLog`; `Membresia`/`PlanMembresia` con sedes habilitadas (M2M); aforo y config por sede; selector de sede activa para staff; QR valida contra la sede del lector; reportes filtrables por sede; migración que crea "Sede Central" y asigna todo lo existente.

**Archivos:**
Backend: nueva app `apps/sedes` (o dentro de `common`), cambios en `classes`, `access` (services, consumers, views), `memberships`, `reports`, `common`. Frontend: página admin, store, hooks con `sede` en las `queryKey`, ajustes en credencial, planes, aforo, reportes.

**Tests primero:**
- Backend: migración de datos idempotente; aforo por sede aislado; QR de sede no habilitada → rechazo y `AccessLog` registrado; permisos de `/api/sedes/`.
- Frontend: cambio de sede invalida queries (`queryKey` incluye sede); credencial muestra la sede real.
- Manual: crear 2 sedes y probar el flujo de acceso con cada una.

### BK-PLT-11 · Rol Instructor, entrenador asignado y rutinas personalizadas
_Prioridad P3 · Tamaño XL · Estado en código: solo-idea · Depende de: BK-PLT-09 · Issue #217 · Ficha: `docs/backlog/items/BK-PLT-11-instructor-entrenador-asignado-y-rutinas.md`_

**Contexto:** Los planes se "venden" con beneficios como "Seguimiento por entrenador" y "Rutina personalizada", pero en el backend no existe nada que los respalde: no hay rol instructor, ni entrenador asignado al socio, ni rutinas. El instructor de una clase es un texto libre. Solo hay rastro visual en el frontend de planes.

**Qué hacer:**
**Incluye (propuesta mínima, por fases):** Fase 1: rol `instructor` + FK `Clase.instructor_usuario`; pantalla "Mis clases" para instructor. Fase 2: `AsignacionEntrenador(socio, instructor)` y vista "Mi entrenador" en el socio. Fase 3: `Rutina`/`EjercicioRutina` creadas por instructor y asignadas a un socio.

**Archivos:**
Backend: `users/models.py` (+migración), `classes` (FK y serializer), nueva app `apps/training`, permisos, `seed_demo_users`. Frontend: páginas, hooks, `Sidebar`, `AppBottomNav`, `App.jsx`, `CreateClassPage.jsx` (selector de instructor desde usuarios en vez de texto; quitar el valor inicial `'Carlos R.'`).

**Tests primero:**
- Backend: permisos por rol (socio 403 en crear rutina; instructor solo ve sus asignaciones); constraint de una asignación activa por socio; migración con `instructor` texto existente.
- Frontend: `Sidebar` con rol `instructor`; páginas de socio con y sin entrenador.
- Manual: crear usuario instructor (extender `StaffFormModal`, hoy solo admin/recepcionista: `users/serializers.py:10` `STAFF_ROLES`).
