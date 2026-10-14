---
id: BK-FIN-03
titulo: Morosidad y vencimientos - criterio correcto de "moroso", alertas del dashboard y recordatorios automáticos
tipo: bug
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: L
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-FIN-05]
---

# BK-FIN-03 · Morosidad y vencimientos

## 1. Resumen
El reporte de morosidad lista como "moroso" a todo socio que alguna vez tuvo una membresía vencida, aunque ya la haya renovado; el dashboard muestra "Desconocido" en las alertas; el job diario solo actúa el día exacto del vencimiento (si falla un día, la membresía queda `activa` vencida) y no hay recordatorios posteriores al vencimiento. Hay que definir un único criterio de morosidad, corregir el cálculo y completar el ciclo de avisos.

## 2. Objetivo de usuario
Como **recepcionista/administrador** quiero **una lista confiable de socios con cuota vencida (sin renovar) y alertas correctas en el dashboard** para **gestionar el cobro**; como **socio** quiero **recibir avisos antes y después del vencimiento con un link directo para pagar** para **no perder el acceso**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend servicio | `backend/apps/reports/services.py:29-54` | `build_morosidad`: toda `Membresia` con `estado in (vencida, pendiente_pago)` y `fecha_fin <= hoy`. **No excluye** socios que ya tienen una membresía `activa` posterior ni socios con `Socio.estado='baja'`. |
| Backend renovación | `backend/apps/memberships/services.py:27-29`, `backend/apps/payments/services.py:74-76` | Al renovar/cobrar, la membresía anterior pasa a `vencida` (`.update(estado=VENCIDA)`). Por lo tanto **cada socio que renueva queda en el reporte de morosidad para siempre** (fila de su membresía histórica). |
| Backend servicio | `backend/apps/reports/services.py:50` | `monto_adeudado` = `plan.precio` de la membresía vencida; no es una deuda real (no hay cuenta corriente). |
| Backend estado | `backend/apps/memberships/models.py:34` | `pendiente_pago` está "reservado - never writable via API"; ningún flujo lo asigna (`openspec/changes/socios-membresias/design.md:497`). Los filtros `estado=pendiente_pago` de la UI (`ReportFilters.jsx:218`) nunca devuelven filas. |
| Backend tarea | `backend/apps/memberships/tasks.py:15,60-77` | `check_expiring_memberships` solo procesa membresías `activa` con `delta in (7,3,1,0)` días. Si `fecha_fin` ya pasó y el job no corrió ese día (beat caído, deploy), la membresía queda `activa` indefinidamente en la base (solo se corrige "perezosamente" al escanear el QR, `backend/apps/access/services.py:207-215`). Para `delta=0` marca `vencida` y envía mail; no hay avisos de mora (+1, +7, ...). |
| Backend tarea | `backend/apps/memberships/tasks.py:27` | El asunto es siempre "Tu membresía en Winnie The Gym está por vencer", también para `delta=0` donde la plantilla dice "venció" (`backend/apps/common/templates/emails/expiration_alert.txt:3-5`). |
| Backend email | `backend/apps/common/templates/emails/expiration_alert.txt:7` | El link es `{{ frontend_url }}` (raíz), no la pantalla de pago `/socio/checkout`. |
| Backend schedule | `backend/apps/memberships/migrations/0004_seed_expiration_schedule.py:8-24` | `PeriodicTask` diario 09:00 `America/Argentina/Buenos_Aires`, vía `django_celery_beat` `DatabaseScheduler` (`base.py:368`). Servicio `celery-beat` en `docker-compose.yml:93-98`; en producción beat solo corre si el servicio all-in-one lo levanta (`render.yaml:4,17`; el servicio beat dedicado está comentado en `render.yaml:63-72`). **No verificado** si producción efectivamente ejecuta beat. |
| Backend tareas existentes | `backend/apps/memberships/tasks.py`, `backend/apps/common/tasks.py` (`send_email_task`), `backend/apps/access/tasks.py` (`log_qr_event_task`) | Son las únicas tareas Celery. No hay tareas de pagos (p. ej. vencer pagos pendientes) ni de recordatorios de mora. |
| Frontend hook | `frontend/src/hooks/queries/useDashboardData.js:30-40` | `useDashboardAlerts` pide `/memberships/membresias/` con `estado: 'vencida', limit: 5`: `limit` se ignora (10 filas, `base.py:181-182`) y trae membresías históricas, no morosos actuales. |
| Frontend dashboard | `frontend/src/components/dashboard/views/AdminDashboardView.jsx:30-34` | Mapea `mem.socio_nombre` / `mem.socio_apellido`, campos que `MembresiaSerializer` **no tiene** (`serializers.py:34`) -> toda alerta muestra "Desconocido"; el tag es 'Vencida' o 'Pendiente'. |
| Frontend dashboard | `frontend/src/components/dashboard/views/RecepcionistaDashboardView.jsx` | No muestra alertas de morosidad ni totales de cobro: solo usa `useAccessLogs`, `useAforoStats`, `useWebSocket` y `useGymConfig` (`RecepcionistaDashboardView.jsx:4-13`). |
| Frontend socio | `frontend/src/components/socio/MembershipExpiredAlert.jsx:15` | Mensaje "Acercate a recepción para renovar" sin botón de pago; además `membresia_activa` es `null` cuando venció, entonces la fecha nunca se muestra (`CredencialDigitalPage.jsx:51-57`, `SocioMeSerializer.get_membresia_activa` solo `estado='activa'`, `serializers.py:77-79`). |
| Frontend reportes | `frontend/src/components/recepcion/ReportFilters.jsx:207-237`, `MorosidadCard.jsx` | Filtros de morosidad por estado/plan solo afectan al exporte; la tarjeta muestra los números rotos de BK-FIN-01. |

## 4. Alcance
**Incluye:**
- Definición única y selector compartido `socios_morosos_queryset` (último estado del socio, no filas históricas).
- Endpoint JSON paginado de morosos para la UI (`GET /api/memberships/morosos/`) y reutilización en el exporte `/reportes/morosidad/`.
- Corregir las alertas del dashboard (nombre real, solo morosos actuales, cantidad real).
- Job de barrido `expire_overdue_memberships` (todas las `activa` con `fecha_fin < hoy`) y recordatorios de mora (+1, +7, +15 días; configurables) con plantilla propia y link a `/socio/checkout`.
- Asunto correcto para el aviso del día de vencimiento; link directo a checkout en los emails.
- En la credencial del socio: mostrar fecha de vencimiento y botón "Renovar ahora" (detalle de pago en BK-FIN-07/08).

**No incluye:** deuda real/cuenta corriente, recargos por mora, planes de pago, WhatsApp/SMS (decisión abierta 4), corte automático de acceso distinto al ya existente.

## 5. Contrato de API
**[A CREAR]** `GET /api/memberships/morosos/` — `IsReceptionistOrAdmin`. Paginado (`PageNumberPagination`, `page`). Query: `plan_id`, `estado` (`vencida|pendiente_pago`), `dias_atraso_min`, `search` (nombre/apellido/DNI), `ordering` (`dias_atraso`, `-dias_atraso`, `apellido`). Item (propuesta):
```json
{ "socio_id": 12, "numero_socio": "S-00012", "socio_nombre": "Ana Gómez", "dni": "30123456",
  "plan_id": 3, "plan_nombre": "Premium", "membresia_id": 88, "fecha_fin": "2026-09-30",
  "dias_atraso": 13, "monto_adeudado": "12000.00", "telefono": "5491100000001",
  "email": "ana@example.com", "ultimo_aviso": "mora_7" }
```
Reglas del selector (`apps/memberships/services.py::socios_morosos_queryset`): socio con `Socio.estado='activo'`; **sin** membresía `activa` con `fecha_fin >= hoy`; su membresía más reciente (por `fecha_fin`) está en `vencida|pendiente_pago` (o `activa` con `fecha_fin < hoy`, por job caído); `dias_atraso = hoy - fecha_fin`; `monto_adeudado = plan.precio` de esa membresía (etiquetar "último plan" en la UI).
**[EXISTE → MODIFICAR]** `GET /api/reportes/morosidad/` (`backend/apps/reports/views.py:33-39`) debe usar el mismo selector.
Errores: `400` por params inválidos; `403` para socio.

Tareas Celery **[A CREAR]** (nombres propuestos): `memberships.expire_overdue_memberships` y `memberships.send_overdue_reminders`, registradas con una migración de datos como `0004_seed_expiration_schedule.py` (`CrontabSchedule` 09:15 ART). Claves en `Membresia.avisos_enviados` (JSON ya existente, `models.py:52`): `"mora_1"`, `"mora_7"`, `"mora_15"`.

## 6. Modelo de datos
Sin cambios obligatorios (se reutiliza `avisos_enviados`). Opcional: `GymConfig.dias_recordatorio_mora` (lista) para hacerlo configurable (`backend/apps/common/models.py:4-14` hoy solo tiene nombre, aforo, horarios, teléfono). Plantillas nuevas: `backend/apps/common/templates/emails/overdue_notice.html` y `.txt` (ver `expiration_alert.*` para el esqueleto y `_base.html`).

## 7. Diseño frontend
- **Rutas/guard:** nueva sección "Morosos" dentro de `/admin/reportes` o página `/recepcion/morosos` con `roles={['administrador','recepcionista']}` (patrón de `App.jsx:122-127`). Recomendado: tab existente "Morosidad" de `ReportesPage` pasa a mostrar tabla (hoy solo tarjeta).
- **Reutilizar:** `DataTable` (`columns`, `data`, `loading`, `ordering`, `onSort`, `renderActions`, `emptyTitle`, `emptyMessage`), `Pagination` (`currentPage`, `totalCount`, `pageSize`, `onPageChange`), `Badge`, `FilterButton`, `SearchBar`, `AlertList` del dashboard.
- **Nuevos:** hook `useMorososList(params)` en `frontend/src/hooks/queries/useMembresias.js` (query key `['membresias','morosos', params]`); acción por fila "Cobrar" que navega a `/recepcion/cobros` con el socio preseleccionado (query `?socio=<id>`; hoy `CobroManualPage` no lee query params, hay que agregarlo) y "Copiar teléfono".
- **Dashboard:** `useDashboardAlerts` consume `/memberships/morosos/?page_size=5` (agregar `page_size` o usar `ordering` + corte en cliente) y `AdminDashboardView.jsx` usa `socio_nombre`/`dias_atraso`.
- **Socio:** `MembershipExpiredAlert` recibe `fechaVencimiento` real (exponer `ultima_membresia` en `SocioMeSerializer`, ver BK-FIN-07) y un `Button` "Renovar ahora" -> `/socio/checkout`.
- **Estados:** loading (`DataTable loading`), vacío ("No hay socios con cuota vencida"), error (toast + reintentar), éxito.
- **Textos (voseo):** "Socios con cuota vencida", "Hace 13 días", "Cobrar", "Renovar ahora", email: "Tu membresía venció hace 7 días. Renovala desde acá para volver a entrenar."
- **Responsive:** a 375 px la tabla pasa a tarjetas apiladas (nombre, plan, días de atraso, botón Cobrar); a 768 px tabla con columnas teléfono/email ocultas.

## 8. Archivos a crear / modificar
- `backend/apps/memberships/services.py`: `socios_morosos_queryset`.
- `backend/apps/memberships/views.py` + `urls.py`: `MorososView` (`ListAPIView`, `pagination` global) y `serializers.py`: `MorosoSerializer`.
- `backend/apps/reports/services.py`: `build_morosidad` usa el selector.
- `backend/apps/memberships/tasks.py`: `expire_overdue_memberships`, `send_overdue_reminders`; corregir asunto para `delta=0`.
- `backend/apps/memberships/migrations/0006_seed_overdue_schedules.py` (numeración: la última existente es `0005_add_es_popular.py`).
- Plantillas de email (`overdue_notice.*`) y link `{{ frontend_url }}/socio/checkout` en `expiration_alert.*`.
- Frontend: `useMembresias.js`, `useDashboardData.js`, `AdminDashboardView.jsx`, `MorosidadCard.jsx`/`ReportesPage.jsx`, `MembershipExpiredAlert.jsx`, `CobroManualPage.jsx` (preselección por query).
- Tests: `backend/apps/memberships/tests/test_morosos_view.py`, `test_overdue_tasks.py`; `backend/apps/reports/tests/test_reports_endpoints.py`; frontend `useMembresias.test.jsx`, `AdminDashboardView` tests (**No verificado** el nombre exacto del test existente; ubicarlo con `fd AdminDashboard frontend/src`).

## 9. Plan de pruebas (TDD)
**Backend** (`cd backend && pytest -q apps/memberships/tests apps/reports/tests`; ver `test_expiration_task.py` como molde: `TestCase` + `override_settings(EMAIL_BACKEND=locmem, CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True)`, `mail.outbox`; factories `conftest.py:23-75`):
1. Socio con membresía vencida y otra `activa` posterior **no** aparece en morosos ni en el exporte (regresión del bug principal).
2. Socio `baja` o `suspendido` no aparece.
3. `activa` con `fecha_fin = hoy - 3` (job caído): `expire_overdue_memberships` la pasa a `vencida` y no envía "por vencer".
4. `send_overdue_reminders`: a +1/+7/+15 manda un mail cada uno, no repite (`avisos_enviados`), no manda si el socio renovó.
5. `GET /api/memberships/morosos/`: paginación, filtros `plan_id`/`search`, orden por `dias_atraso`, `403` socio, `401` anónimo.
6. Asunto del aviso `delta=0` contiene "venció".
**Frontend** (`npx vitest run`): alertas del dashboard muestran el nombre y los días; `MembershipExpiredAlert` renderiza botón "Renovar ahora" con `href`/navegación a `/socio/checkout`; tabla de morosos: loading, vacío, error, acción "Cobrar".
**Manual:** `socio.vencido@winnie.local` (seed) debe aparecer; renovar con cobro manual desde `/recepcion/cobros` y verificar que desaparece de la lista.

## 10. Criterios de aceptación
- **Dado** un socio que venció y renovó **cuando** abro morosidad **entonces** no figura.
- **Dado** un socio vencido hace 13 días **cuando** abro el dashboard **entonces** veo su nombre y "13 días".
- **Dado** que el job diario no corrió ayer **cuando** corre hoy **entonces** las membresías `activa` con `fecha_fin < hoy` pasan a `vencida`.
- **Dado** un socio vencido hace 7 días **cuando** corre el job **entonces** recibe un único mail con link a `/socio/checkout`.
- **Dado** un socio vencido **cuando** abre su credencial **entonces** ve la fecha de vencimiento y "Renovar ahora".

## 11. Riesgos y decisiones abiertas
1. ¿Cuándo se considera moroso: desde `fecha_fin + 1` o con días de gracia? Recomendación: sin gracia, pero recordatorio recién a +1.
2. ¿Qué pasa con las `pendiente_pago`? Hoy nunca existen. Recomendación: quitar la opción del filtro hasta que un flujo la use (el pago MP pendiente podría mapearse acá, ver BK-FIN-08).
3. ¿Se corta el acceso a socios morosos desde el día +1? Hoy ya se corta (`has_active_membership` exige `activa` y `fecha_fin >= hoy`).
4. Canal de recordatorio: solo email (infraestructura existente `enqueue_email`, `backend/apps/common/tasks.py:30-42`). WhatsApp/SMS requieren proveedor: fuera de alcance.
5. Zona horaria: el job usa `timezone.localdate()` (`tasks.py:56`); validar que el worker corra con `CELERY_TIMEZONE = TIME_ZONE` (`base.py:363`).

## 12. Referencias
- `openspec/changes/socios-membresias/spec.md:188` (una membresía activa por socio), `design.md:497` (`pendiente_pago` reservado).
- `docs/architecture.md` sección "Job diario de vencimientos".
- Figma (solo apoyo visual opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", Dashboard y Reportes.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django/DRF + Celery en backend/, React+Vite+TanStack Query en frontend/). TDD estricto.

Problema: (a) backend/apps/reports/services.py::build_morosidad lista toda Membresia vencida histórica; los socios que renovaron siguen apareciendo porque renovar marca la vieja como 'vencida' (memberships/services.py:27-29, payments/services.py:74-76). (b) backend/apps/memberships/tasks.py::check_expiring_memberships solo actúa si delta in (7,3,1,0): si el job falla un día, la membresía queda 'activa' vencida; no hay recordatorios de mora. (c) AdminDashboardView.jsx usa mem.socio_nombre que MembresiaSerializer no expone -> 'Desconocido'; useDashboardAlerts manda limit:5 que el backend ignora.

Construí según docs/backlog/items/BK-FIN-03-morosidad-calculo-alertas-recordatorios.md:
1. apps/memberships/services.py::socios_morosos_queryset(estado=None, plan_id=None) (socio activo, sin membresía activa vigente, última membresía vencida/pendiente_pago o activa con fecha_fin<hoy).
2. GET /api/memberships/morosos/ (IsReceptionistOrAdmin, paginado, filtros plan_id/search/ordering) + MorosoSerializer; build_morosidad usa el selector.
3. Tareas Celery expire_overdue_memberships y send_overdue_reminders (+1,+7,+15 con avisos_enviados), plantilla emails/overdue_notice.html/.txt, migración de datos memberships/0006 con CrontabSchedule como 0004_seed_expiration_schedule.py; corregí el asunto del aviso delta=0 y el link a {{frontend_url}}/socio/checkout.
4. Frontend: useMorososList en hooks/queries/useMembresias.js, dashboard con nombre y días de atraso, MembershipExpiredAlert con botón 'Renovar ahora' (/socio/checkout), tabla de morosos con DataTable+Pagination en la tab Morosidad de ReportesPage.
Tests primero: backend/apps/memberships/tests/test_morosos_view.py y test_overdue_tasks.py (molde: test_expiration_task.py), ampliar apps/reports/tests; frontend con vitest + renderWithProviders (src/test/test-utils.jsx).
Terminado cuando: `cd backend && pytest -q` (cov>=80) y `cd frontend && npm run lint && npx vitest run --coverage && npm run build` pasan. No hagas commits.
```
