---
id: BK-ACC-05
titulo: Contratos frontend/backend desalineados en aforo y logs (limit ignorado, stats sin aforo_actual, "/200" hardcodeado)
tipo: bug
roles: [administrador, recepcionista]
prioridad: P0
tamano: M
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-ACC-05 · Contratos rotos entre el frontend y los endpoints de aforo/logs

## 1. Resumen
Varias pantallas de acceso/aforo dependen de contratos que el backend **no cumple**, y los tests del frontend los enmascaran con mocks "felices". Efectos visibles hoy: "últimos 5 movimientos" muestra 10, el gráfico de asistencia semanal se calcula con 10 logs (no con la semana), el dashboard muestra aforo 0 / ingresos 0 si el WebSocket no conecta, y el terminal dice "Aforo N/200" aunque el aforo máximo configurado sea otro.

## 2. Objetivo de usuario
Como **recepcionista/administrador** quiero **que los números de aforo y movimientos recientes sean correctos aunque el WebSocket tarde o caiga** para **confiar en el dashboard y no operar con datos falsos**.

## 3. Estado actual en el código (evidencia)
| # | Capa | Archivo:línea | Qué hay hoy |
|---|---|---|---|
| A | Frontend hook | `frontend/src/hooks/queries/useDashboardData.js:18-27` | `useAccessLogs(limit=5)` hace `api.get('/access/logs/', { params: { limit } })`. |
| A | Backend | `backend/core/settings/base.py:181-182`; `backend/apps/access/views.py:234-243` | Paginación `PageNumberPagination` con `PAGE_SIZE=10` y **sin** `limit` ni `page_size_query_param` → el parámetro se ignora; siempre llegan 10 filas. Solo `SocioPagination` (`backend/apps/members/views.py:19-22`) acepta `page_size`. |
| A | Frontend uso | `frontend/src/pages/recepcion/AforoMonitorPage.jsx:23-36`, `components/dashboard/views/AdminDashboardView.jsx:15,30`, `components/recepcion/RecentEventsPanel.jsx:4-11`, `components/dashboard/MovementList.jsx:40+` | Ninguno hace `slice`: renderizan todo lo que llega → "5 recientes" son 10. |
| B | Frontend reportes | `frontend/src/hooks/queries/useReportes.js:24,92-103` | Pide `/access/logs/` con `limit: REPORT_FETCH_LIMIT (100)` (ignorado → 10 filas) y arma `asistenciaBars` (L-D) contando ENTRY de esas 10 filas. La barra "Asistencia semanal" es incorrecta. |
| C | Frontend dashboards | `AdminDashboardView.jsx:20-28`, `RecepcionistaDashboardView.jsx:11-19` | `aforoActual = lastMessage?.aforo_actual ?? restStats?.aforo_actual ?? 0` (idem `ingresos_hoy`, `egresos_hoy`) con `restStats = useAforoStats()`. |
| C | Backend | `backend/apps/access/services.py:123-129` / `views.py:270-278` | `GET /api/access/stats/` devuelve solo `promedioHoy, picoMaximo, picoHora, ingresoUltimaHora, egresoUltimaHora` (strings). **No** devuelve `aforo_actual`, `ingresos_hoy`, `egresos_hoy` (esas claves viven en `compute_aforo_actual`, `services.py:34-38`, y solo salen por WebSocket). El fallback REST es código muerto. |
| C | Tests que lo enmascaran | `frontend/src/components/dashboard/__tests__/RecepcionistaDashboardView.test.jsx:8-10` | Mockean `useAforoStats` → `{ aforo_actual: 37, ingresos_hoy: 8, egresos_hoy: 3 }`, forma que el backend real nunca devuelve. |
| D | Frontend terminal | `frontend/src/pages/recepcion/AccesoTerminalPage.jsx:84` | Texto fijo `Aforo {aforoActual}/200`; el test lo congela (`__tests__/AccesoTerminal.test.jsx:41-44`). El valor real está en `GymConfig.aforo_maximo` (`backend/apps/common/models.py:11`, `GET /api/config/gym/`, hook `useGymConfig`). `speckit/spec.md:292` (REQ-3.7) ya exigía que `GYM_MAX_CAPACITY` dejara de ser constante y se leyera de `useGymConfig()`. |
| D | Frontend constante | `frontend/src/constants/pagination.js:8` | `GYM_MAX_CAPACITY = 200` exportada y sin ningún import (código muerto). |
| E | Backend cache | `backend/apps/access/services.py:132-151`; `ws_signals.py:21-39` | El docstring pide invalidar el cache de stats "en `apps.access.signals`" (módulo inexistente; el real es `ws_signals`). El signal solo invalida `aforo:current`; `aforo:stats` queda hasta 30 s desactualizado y `invalidate_aforo_stats_cache()` no se llama desde ningún lado. |
| F | Backend vista | `backend/apps/access/views.py:245-261` | Para staff no hay filtro de "hoy" ni límite de rango; con el `page_size` fijo en 10 no hay forma de pedir "los de hoy". |

## 4. Alcance
**Incluye:** (A) soporte real de `page_size` en `/access/logs/` y que `useAccessLogs`/`useReportMetrics` lo usen bien; (B) corregir el cálculo de "Asistencia semanal"; (C) endpoint de snapshot de aforo para el fallback REST; (D) máximo real en el terminal; (E) invalidar el cache de stats; (F) actualizar los tests que enmascaran el contrato.

**No incluye:** pantalla de historial (BK-ACC-03), analítica histórica (BK-ACC-08), alertas de umbral (BK-ACC-06).

## 5. Contrato de API
**[EXISTE → MODIFICAR] `GET /api/access/logs/`** — `page_size` (ver BK-ACC-03: `AccessLogPagination`, `page_size_query_param='page_size'`, `max_page_size=200`). Para compatibilidad, aceptar también `limit` como alias dentro de la clase de paginación (`get_page_size` leyendo `request.query_params.get('limit')`) o cambiar los dos hooks del front a `page_size`. Recomendación: cambiar el front a `page_size` (un solo contrato) y no tocar el alias.

**[A CREAR] `GET /api/access/aforo/`** — `IsReceptionistOrAdmin`; vista nueva `AforoActualView` en `views.py` + `path('aforo/', ...)` en `urls.py`. Response 200: `{ "aforo_actual": int, "ingresos_hoy": int, "egresos_hoy": int, "aforo_maximo": int }` (los tres primeros salen de `get_aforo_actual()` — cache 5 s —; `aforo_maximo` de `GymConfig.get().aforo_maximo`). Mismos nombres de claves que el WebSocket (`aforo.snapshot`, `consumers.py:32-35`).

**[A CREAR/OPCIONAL] asistencia semanal:** `GET /api/access/stats/semanal/` → `{ "dias": [{ "fecha": "YYYY-MM-DD", "ingresos": int }...7] }` (ENTRY GRANTED agrupados con `TruncDate('timestamp')`). Alternativa sin endpoint nuevo: `GET /api/access/logs/?access_type=ENTRY&status=GRANTED&fecha_desde=<lunes>&page_size=200` (se queda corto en gimnasios grandes; por eso se recomienda el endpoint).

Mantener `GET /api/access/stats/` sin cambios de forma (claves camelCase y valores string) para no romper `AforoStatBar`.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Hook nuevo:** `useAforoActual()` en `frontend/src/hooks/queries/useDashboardData.js` (junto a `useAforoStats`, línea 82): `queryKey: ['aforoActual']`, `queryFn: api.get('/access/aforo/')`, `refetchInterval: 15000`, `retry: 1`. En `AdminDashboardView.jsx:24-26` y `RecepcionistaDashboardView.jsx:15-17` reemplazar `restStats` por este hook para `aforo_actual/ingresos_hoy/egresos_hoy` (y mantener `useAforoStats` para `AforoStatBar`).
- **useAccessLogs / useReportMetrics:** cambiar `{ limit }` por `{ page_size: limit }` (`useDashboardData.js:22`) y `{ limit: REPORT_FETCH_LIMIT }` por `page_size` solo si se mantiene este cálculo; recomendado reemplazar `asistenciaBars` por `useAsistenciaSemanal()` que consuma el endpoint semanal.
- **Terminal:** `AccesoTerminalPage.jsx:84` → usar `const { data: gymConfig } = useGymConfig()` y `Aforo {aforoActual}/{gymConfig?.aforo_maximo ?? '--'}`; eliminar `GYM_MAX_CAPACITY` si queda sin uso. Hook ya existe: `frontend/src/hooks/queries/useGymConfig.js` (`staleTime: Infinity`, key `['gymConfig']`).
- **Estados:** mientras el WS conecta, mostrar el valor REST (no `0`); si no hay ninguno, `--` y `Skeleton` (ya existe `AforoCard loading`, `AforoCard.jsx:4-27`); error REST = `retry:1` y `--`, sin toast (es polling de fondo).
- **Textos (voseo):** sin cambios de copy visibles salvo el máximo real ("Aforo 37/150").
- **Responsive:** sin cambios.

## 8. Archivos a crear / modificar
- `backend/apps/access/views.py`, `urls.py`, `services.py` (invalidar stats en el signal), `ws_signals.py` (llamar `invalidate_aforo_stats_cache()`), `tests/test_aforo_endpoints.py` (nuevo).
- `frontend/src/hooks/queries/useDashboardData.js`, `useReportes.js`, `components/dashboard/views/{Admin,Recepcionista}DashboardView.jsx`, `pages/recepcion/AccesoTerminalPage.jsx`, `constants/pagination.js` (borrar `GYM_MAX_CAPACITY` si no se usa) y los tests asociados.

## 9. Plan de pruebas (TDD)
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
Manual: bajar Redis/WS (o bloquear `ws://` en DevTools) y verificar que el dashboard sigue mostrando el aforo por REST; cambiar `aforo_maximo` en `/admin/configuracion` y ver el nuevo tope en terminal y monitor.

## 10. Criterios de aceptación
- **Dado** 12 movimientos de hoy, **cuando** se abre el dashboard, **entonces** "Movimientos recientes" muestra exactamente 5.
- **Dado** que el WebSocket no conecta, **cuando** carga el dashboard, **entonces** el aforo, ingresos y egresos de hoy salen del endpoint REST y no figuran en 0.
- **Dado** `aforo_maximo = 150`, **cuando** recepción abre el terminal, **entonces** ve "Aforo N/150".
- **Dado** la pantalla de Reportes, **cuando** se abre "Asistencia semanal", **entonces** las barras reflejan los ingresos de la semana completa.

## 11. Riesgos y decisiones abiertas
- ¿Mantener `limit` como alias en backend? Recomendación: no; migrar el front a `page_size`.
- Endpoint semanal vs. reusar logs: recomendación: endpoint dedicado (BK-ACC-08 lo extiende a histórico por hora/día).
- Cambiar el `PAGE_SIZE` global afectaría a otros listados: no tocar `REST_FRAMEWORK`, usar la clase de paginación por vista.

## 12. Referencias
- `CHANGELOG.md:130-132` (WebSocket de aforo), `backend/apps/access/consumers.py:32-35` (forma del snapshot).
- Figma (opcional): "vistas live" → Recepción → Aforo (Hi-Fi).

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1 + DRF 3.15 /backend, React 18 + Vite + TanStack Query v5 + Vitest /frontend). Corregí los contratos rotos descritos en docs/backlog/items/BK-ACC-05-contratos-rotos-aforo-y-logs.md (leelo entero; las filas A-F de la sección 3 son la evidencia).
TDD: primero tests backend (backend/apps/access/tests/test_aforo_endpoints.py, APITestCase, fixtures de backend/conftest.py; correr con `cd backend && pytest apps/access -q`) para: GET /api/access/aforo/ (IsReceptionistOrAdmin) -> {aforo_actual, ingresos_hoy, egresos_hoy, aforo_maximo}; page_size en /api/access/logs/ (AccessLogPagination con page_size_query_param='page_size', max_page_size=200, definida en la vista, sin tocar REST_FRAMEWORK global); invalidación del cache aforo:stats en ws_signals.broadcast_aforo_on_access.
Luego frontend: useAforoActual en hooks/queries/useDashboardData.js, useAccessLogs con page_size, dashboards Admin/Recepcionista usando useAforoActual como fallback del WebSocket, AccesoTerminalPage usando useGymConfig().aforo_maximo en vez de "/200", borrar GYM_MAX_CAPACITY si queda sin uso, y arreglar los tests que mockean useAforoStats con la forma inexistente {aforo_actual,...}.
No toques backend/loadtests ni hooks/useScreenWakeLock.js. Código en inglés, textos de UI en español rioplatense.
Terminado: pytest -q (cov>=80 %) y `cd frontend && npx vitest run --coverage && npm run lint` en verde.
```
