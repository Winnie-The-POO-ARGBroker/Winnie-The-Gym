---
id: BK-ACC-03
titulo: Pantalla de historial de accesos (filtros, búsqueda por socio, rango, motivo, exportación)
tipo: feature
roles: [administrador, recepcionista]
prioridad: P1
tamano: L
estado_en_codigo: backend-sin-ui
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-ACC-05]
---

# BK-ACC-03 · Historial de accesos para administración y recepción

## 1. Resumen
`GET /api/access/logs/` ya existe, está paginado, filtra por fecha/tipo/estado/motivo/usuario y respeta ownership, pero **no hay ninguna pantalla** que lo consuma como listado: solo se lo usa para "últimos 5 movimientos" del dashboard y el monitor, y para un gráfico de reportes. Recepción no puede responder "¿entró Juan ayer? ¿por qué lo rechazaron?" ni exportar los accesos. Además al endpoint le faltan búsqueda por texto, tamaño de página configurable y filtro por socio.

## 2. Objetivo de usuario
Como **recepcionista/administrador** quiero **consultar y exportar el historial de accesos con filtros (fecha, socio, tipo, resultado, motivo de denegación)** para **resolver reclamos, auditar rechazos y detectar patrones**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend API | `backend/apps/access/views.py:234-261` | `AccessLogListView(generics.ListAPIView)`, `permission_classes=[IsAuthenticated]`; staff (`rol in ('administrador','recepcionista')` o `is_staff`, línea 250) ve todo; el resto solo `filter(user=user)`. `ordering_fields=['timestamp']`, `ordering=['-timestamp']`. `select_related('user__socio','scanned_by')` + `prefetch_related('user__socio__membresias__plan')`. |
| Backend filtros | `backend/apps/access/filters.py:6-18` | `AccessLogFilter`: `fecha_desde`/`fecha_hasta` (`timestamp__date__gte/lte`), y `access_type` (`exact`,`in`), `status` (`exact`,`in`), `denial_reason` (`exact`), `user` (`exact`, **id de User, no de Socio**), `scanned_by` (`exact`). |
| Backend búsqueda | `views.py:234-243` | La vista **no define `search_fields`**: aunque `SearchFilter` está en `DEFAULT_FILTER_BACKENDS` (`backend/core/settings/base.py:183-187`), `?search=` no hace nada. |
| Backend paginación | `backend/core/settings/base.py:181-182` | `PageNumberPagination`, `PAGE_SIZE=10`, sin `page_size_query_param`. Solo `SocioPagination` (`backend/apps/members/views.py:19-22`) habilita `page_size` (max 100). |
| Backend serializer | `backend/apps/access/serializers.py:34-80` | `AccessLogSerializer`; `user_plan_nombre` hace una query por fila (`socio.membresias.filter(estado='activa').first()`, línea 79) → N+1 aunque haya `prefetch_related` (el `.filter()` ignora el prefetch). |
| Backend export | `backend/apps/reports/views.py:66-86` + `services.py:141-201` | Existe `GET /api/reportes/asistencia/?formato=csv|xlsx|pdf&fecha_desde&fecha_hasta` (`IsReceptionistOrAdmin`), pero **solo ENTRY GRANTED pareadas con su EXIT** (permanencia). No incluye denegados ni motivo. El pareo es O(n·m) (doble loop, `services.py:162-180`). |
| Backend admin | `backend/apps/access/admin.py:5-11` | Django admin lista logs con `list_filter` y `search_fields` (único lugar donde hoy se puede buscar). |
| Frontend consumo | `frontend/src/hooks/queries/useDashboardData.js:18-27` | `useAccessLogs(limit)` manda `params: { limit }` que el backend **ignora** (ver BK-ACC-05). Devuelve `res.data.results`. |
| Frontend consumo | `frontend/src/hooks/queries/useReportes.js:24` | Idem con `REPORT_FETCH_LIMIT`. |
| Frontend rutas | `frontend/src/App.jsx:115-127` | No hay ruta de historial. `Sidebar.jsx:12-45` y `AppBottomNav.jsx:5-21` tampoco tienen ítem. |
| Frontend UI base | `frontend/src/components/ui/` | `DataTable` (props `columns, data, loading, ordering, onSort, onRowClick, renderActions, emptyTitle, emptyMessage`), `Pagination` (`currentPage, totalCount, pageSize, onPageChange`), `SearchBar` (`placeholder, onSearch, delay, className`), `Select`, `Badge`, `Modal`, `FilterButton`, `FilterPanel`, `EmptyState`, `Skeleton`. |
| Frontend patrón | `frontend/src/pages/recepcion/GestionSociosPage.jsx:25-48` y `hooks/queries/useSociosData.js:50-62` | Patrón del repo para listados: estado `page/search/filters/ordering` en la página + hook `useSociosList(params)` + servicio `getSocios` que traduce `pageSize→page_size`. |
| Frontend export | `frontend/src/services/reportsService.js:7-45,111-134` | Helpers `getFilenameFromDisposition`, `triggerBlobDownload`, `parseBlobError`, `exportAsistencia`. |

## 4. Alcance
**Incluye:**
- Backend: `search`, `page_size`, filtro `socio` (id de Socio), filtro por rango horario opcional, orden por `status`/`access_type`; nuevo reporte de accesos exportable (incluye denegados y motivo).
- Frontend: página "Historial de accesos" para admin y recepción con tabla, filtros, buscador, paginación y exportación CSV/XLSX/PDF.
- Corregir el N+1 de `user_plan_nombre`.

**No incluye:** pestaña de actividad dentro del detalle del socio y "Mis asistencias" (BK-ACC-04), analítica agregada (BK-ACC-08), edición/borrado de logs (deben ser inmutables, ver BK-ACC-12).

## 5. Contrato de API
**[EXISTE → MODIFICAR] `GET /api/access/logs/`** — `IsAuthenticated`; staff ve todo, socio solo lo propio (se mantiene).
- Query params existentes: `fecha_desde`, `fecha_hasta` (YYYY-MM-DD), `access_type` (`ENTRY|EXIT`, o `access_type__in=ENTRY,EXIT`), `status` / `status__in`, `denial_reason`, `user` (id de `User`), `scanned_by`, `ordering` (`timestamp`/`-timestamp`), `page`.
- **[A CREAR] params:** `search` (agregar `search_fields = ('user__email','user__socio__nombre','user__socio__apellido','user__socio__dni','user__socio__numero_socio')`), `page_size` (clase `AccessLogPagination(PageNumberPagination)` con `page_size=25`, `page_size_query_param='page_size'`, `max_page_size=200`, copiando el patrón de `SocioPagination`), `socio` (`NumberFilter(field_name='user__socio__id')`), `ordering` ampliado a `['timestamp','status','access_type']`.
- Response 200 (paginado DRF): `{ "count": int, "next": url|null, "previous": url|null, "results": [AccessLogSerializer...] }`. Campos de cada fila (`serializers.py:44-59`): `id, timestamp, user, user_email, user_nombre, user_apellido, user_plan_nombre, access_type, status, status_display, denial_reason, qr_jti, scanned_by, scanned_by_email`.
- **Faltan en el serializer para esta pantalla:** `denial_reason_display` (`get_denial_reason_display`), `user_dni` (de `socio.dni`), `user_numero_socio`, `access_type_display`. Agregarlos como `SerializerMethodField`/`CharField(source=...)`.
- Errores: 401 sin token; 400 si `fecha_desde` no parsea (`{"fecha_desde": ["Enter a valid date."]}`).

**[A CREAR] `GET /api/reportes/accesos/`** — `IsReceptionistOrAdmin`, nueva `AccesosReportView` en `backend/apps/reports/views.py` (mismo estilo que `AsistenciaReportView`) + `build_accesos(...)` en `services.py` + ruta en `backend/apps/reports/urls.py` (`path('accesos/', ...)`).
- Params: `formato` (`csv|xlsx|pdf`, default `csv`), `fecha_desde`, `fecha_hasta`, `status`, `access_type`, `denial_reason`, `socio`, `search`.
- Respuesta: archivo (`export(fmt, slug='accesos', title='Historial de accesos', headers, rows)` en `backend/apps/reports/exporters.py:97`). Headers propuestos: `fecha, hora, socio_dni, socio_nombre, plan, tipo, resultado, motivo, registrado_por`.
- Tope de filas (propuesta 50.000) con 400 `{"detail": "Demasiados registros, acotá el rango de fechas."}`.

## 6. Modelo de datos
Sin cambios de modelo. Índice sugerido (migración `0004`, o la que corresponda si otra ficha ya la tomó): `models.Index(fields=['status', '-timestamp'])` y `models.Index(fields=['user', '-timestamp'])` para los filtros más usados (`timestamp` ya tiene `db_index`, `models.py:40-44`).

## 7. Diseño frontend
- **Ruta y guard:** en `frontend/src/App.jsx` junto a las rutas de recepción (línea ~122): `<Route path="/recepcion/accesos" element={<ProtectedRoute roles={['administrador','recepcionista']}><AccesosHistorialPage /></ProtectedRoute>} />` y alias `/admin/accesos` → `<Navigate to="/recepcion/accesos" replace />` (mismo estilo que `/reportes`, línea 126).
- **Nav:** agregar `{ label: 'Historial accesos', path: '/recepcion/accesos', icon: 'activity' }` a `NAV_BY_ROLE.administrador` (sección "Control & Recepción") y `recepcionista` en `components/layout/Sidebar.jsx`; la barra inferior móvil (`AppBottomNav.jsx`) ya está en 5/6 ítems: acceder desde el chip "Ver historial" del Monitor de Aforo.
- **Página nueva:** `frontend/src/pages/recepcion/AccesosHistorialPage.jsx` (layout `AppLayout` + `TopBar title="Historial de accesos"`), estado local `page, pageSize, search, filters{status,access_type,denial_reason,fecha_desde,fecha_hasta}, ordering` (patrón `GestionSociosPage.jsx:25-48`).
- **Hook nuevo:** `frontend/src/hooks/queries/useAccessLogsList.js` → `export const ACCESS_LOGS_QUERY_KEYS = { all:['accessLogs'], list:(p)=>['accessLogs','list',p] }` y `useAccessLogsList(params, options)` (`useQuery`, `placeholderData` para conservar la página anterior; ojo: el repo usa `keepPreviousData: true` en `useSociosList`, que en TanStack Query v5 está deprecado — usar `placeholderData: keepPreviousData`).
- **Servicio:** `frontend/src/services/accessService.js` → `getAccessLogs(params)` (traduce `pageSize→page_size`, descarta vacíos) y `exportAccessLogs({formato, ...filters})` reutilizando `triggerBlobDownload`/`parseBlobError` de `reportsService.js`.
- **Componentes:** `components/recepcion/AccessLogFilters.jsx` (Selects de resultado, tipo, motivo con las etiquetas de `DenialReason`; dos `<input type="date">`; presets Hoy/7 días/Este mes como en `ReportFilters.jsx:270-300`), `AccessLogRow`/columnas con `Badge` (`variant="success"` GRANTED, `"danger"` DENIED, `"warning"` si hay advertencia), botón "Exportar" (menú CSV/XLSX/PDF como `ReportExportButtons`).
- **Estados:** loading = `DataTable loading` (5 filas skeleton); vacío = `emptyTitle="Sin accesos"` / `emptyMessage="No hay movimientos con estos filtros."`; error = `toast.error` (sonner) + `EmptyState` con "Reintentar"; éxito de export = `toast.success('Exportación lista')`.
- **Textos (voseo):** Título "Historial de accesos"; buscador "Buscá por nombre, DNI, Nº de socio o email"; filtros "Resultado", "Movimiento", "Motivo", "Desde", "Hasta"; vacío "No hay movimientos con estos filtros. Probá ampliando el rango de fechas."; columnas "Fecha y hora", "Socio", "Plan", "Movimiento", "Resultado", "Motivo", "Registró".
- **Responsive:** a 375 px la tabla pasa a lista de tarjetas (o scroll horizontal con `DataTable`, que ya envuelve en `overflow-x-auto`); filtros en un `FilterPanel` colapsable. A 768 px: tabla completa, filtros en 2 columnas.
- Clic en el nombre del socio → abre `SocioDetailModal` en la pestaña Actividad (BK-ACC-04) cuando exista; hasta entonces no navegar.

## 8. Archivos a crear / modificar
- `backend/apps/access/views.py` (`search_fields`, `pagination_class`), `filters.py` (`socio`), `serializers.py` (campos `*_display`, `user_dni`; corregir N+1 con `Prefetch(..., queryset=Membresia.objects.filter(estado='activa'), to_attr='membresias_activas')`).
- `backend/apps/reports/{views,services,urls}.py` — reporte de accesos.
- `backend/apps/access/tests/test_access_log_list.py` (nuevo), `backend/apps/reports/tests/test_reports_endpoints.py` (ampliar).
- Frontend: `App.jsx`, `Sidebar.jsx`, `pages/recepcion/AccesosHistorialPage.jsx`, `components/recepcion/AccessLogFilters.jsx`, `hooks/queries/useAccessLogsList.js`, `services/accessService.js`, y tests.

## 9. Plan de pruebas (TDD)
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
Manual: `recepcion@winnie.local` → `/recepcion/accesos`; generar un acceso denegado con `socio.vencido@winnie.local` y verlo con motivo "Membresía inactiva o cuota vencida".

## 10. Criterios de aceptación
- **Dado** que existen accesos permitidos y denegados, **cuando** recepción filtra Resultado = Denegado y Motivo = "Membresía inactiva…", **entonces** solo ve esos registros con socio, hora y quién escaneó.
- **Dado** el buscador, **cuando** escribe un DNI, **entonces** la lista se reduce a los movimientos de ese socio sin recargar la página.
- **Dado** un rango de fechas, **cuando** exporta a CSV, **entonces** el archivo contiene las mismas filas que ve en pantalla (incluyendo denegados).
- **Dado** un usuario con rol socio, **cuando** intenta abrir `/recepcion/accesos`, **entonces** es redirigido (guard de rol).

## 11. Riesgos y decisiones abiertas
- Retención: los logs de Postgres no tienen TTL; Mongo (`qr_history`) sí (90 días). ¿El historial se sirve solo de Postgres? Recomendación: sí.
- ¿Exportar PDF de miles de filas? Recomendación: limitar PDF a 1.000 filas, CSV/XLSX hasta 50.000.
- Privacidad: el historial expone `qr_jti` y `scanned_by_email`; para esta pantalla no hace falta mostrar `qr_jti` (ver BK-ACC-12).
- Zona horaria: `fecha_desde/hasta` usan `timestamp__date` (zona `America/Argentina/Buenos_Aires`, `USE_TZ=True`); la exportación debe formatear en hora local (como `build_asistencia`).

## 12. Referencias
- `docs/qa/plan-de-pruebas.md` (US05), `CHANGELOG.md` (módulo access), `backend/apps/reports/` (patrón de exportadores).
- Figma (opcional): "vistas live" → Recepción → Reportes (para el estilo de filtros/export).

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5 + DRF + django-filter + drf-spectacular en /backend; React 18 + Vite + TanStack Query v5 + sonner + lucide-react + Tailwind + Vitest/RTL en /frontend; JS, sin TypeScript). Implementá docs/backlog/items/BK-ACC-03-historial-de-accesos.md (leelo entero).
Orden TDD:
1. Escribí los tests backend de la sección 9 en backend/apps/access/tests/test_access_log_list.py y backend/apps/reports/tests/test_reports_endpoints.py (fixtures: backend/conftest.py). Luego: search_fields + AccessLogPagination (page_size_query_param, max 200) + filtro `socio` en backend/apps/access/{views,filters}.py; campos denial_reason_display/user_dni/user_numero_socio en AccessLogSerializer y arreglo del N+1 de user_plan_nombre con Prefetch(to_attr); AccesosReportView + build_accesos + ruta /api/reportes/accesos/ reutilizando apps/reports/exporters.export.
2. Frontend: tests RTL primero. Luego servicio getAccessLogs/exportAccessLogs en services/accessService.js, hook hooks/queries/useAccessLogsList.js, componente components/recepcion/AccessLogFilters.jsx, página pages/recepcion/AccesosHistorialPage.jsx usando DataTable/SearchBar/Pagination/Select/Badge existentes, ruta /recepcion/accesos con <ProtectedRoute roles={['administrador','recepcionista']}> en App.jsx y entradas en Sidebar.jsx. Textos en español rioplatense; código en inglés.
No toques backend/loadtests ni frontend/src/hooks/useScreenWakeLock.js.
Terminado: `cd backend && pytest -q` (cov >= 80 %) y `cd frontend && npx vitest run --coverage && npm run lint` verdes.
```
