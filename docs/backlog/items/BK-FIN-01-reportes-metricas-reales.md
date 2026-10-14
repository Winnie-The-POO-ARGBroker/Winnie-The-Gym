---
id: BK-FIN-01
titulo: Reportes - las métricas de la pantalla salen de datos truncados y de un gráfico fijo
tipo: bug
roles: [administrador, recepcionista]
prioridad: P0
tamano: L
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-FIN-03, BK-FIN-05]
---

# BK-FIN-01 · Reportes: métricas reales de ingresos, morosidad y membresías

## 1. Resumen
`ReportesPage` calcula sus tarjetas (Evolución de ingresos, Morosidad, Membresías activas, Asistencia semanal) en el navegador, a partir de listados paginados que el backend corta en 10 filas, y con el campo `plan` que el serializer devuelve como id (no como objeto). Resultado: los números son parciales o en cero y el gráfico de ingresos es una línea fija. Hay que reemplazarlo por un endpoint de resumen calculado en el servidor. Es P0 porque la pantalla muestra cifras financieras incorrectas sin avisar.

## 2. Objetivo de usuario
Como **administrador o recepcionista** quiero **ver ingresos del mes (con su evolución real), morosos con monto adeudado y membresías activas/por vencer** para **tomar decisiones con números que coincidan con los pagos y membresías cargados**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Frontend hook | `frontend/src/hooks/queries/useReportes.js:21-25` | `useReportMetrics` hace 3 `api.get` en paralelo (`/memberships/membresias/`, `/payments/pagos/?estado=aprobado`, `/access/logs/`) con `params: { limit: REPORT_FETCH_LIMIT }` y `.catch(() => ({ data: [] }))`: cualquier error (403, 500, red) se transforma en lista vacía y la UI muestra ceros sin error. |
| Frontend constante | `frontend/src/constants/pagination.js:11` | `REPORT_FETCH_LIMIT = 100`. |
| Backend paginación | `backend/core/settings/base.py:181-182` | `PageNumberPagination` con `PAGE_SIZE = 10` y sin `page_size_query_param`: el parámetro `limit` se ignora, cada request devuelve solo la primera página (10 filas). `MembresiaViewSet`/`PagoViewSet` no definen `pagination_class` (`backend/apps/memberships/views.py:51-65`, `backend/apps/payments/views.py:34-44`). |
| Frontend hook | `frontend/src/hooks/queries/useReportes.js:39,55` | Usa `m.plan?.precio` para el monto adeudado. `MembresiaSerializer` expone `plan` como PK (`backend/apps/memberships/serializers.py:34`, `fields = ('id','socio','plan','fecha_inicio','fecha_fin','estado')`), solo `retrieve` usa el serializer con plan anidado (`views.py:62-65`). `m.plan?.precio` es siempre `undefined` -> **Adeudado siempre `$ 0`**. |
| Frontend hook | `frontend/src/hooks/queries/useReportes.js:60` | `morosidadPct = morosos / totalMembresias`: divide filas de membresía (incluye historial de renovaciones) en vez de socios. |
| Frontend hook | `frontend/src/hooks/queries/useReportes.js:107-108` | `chartPath` es un string fijo (`'M 0,70 L 60,65 ...'`) con `// TODO: compute real chart points ... placeholder until backend endpoint exists`. |
| Frontend componente | `frontend/src/components/recepcion/EvolucionIngresosCard.jsx:45-57` | Dibuja un `<path d={chartPoints}>` dentro de un `<svg viewBox="0 0 400 100">`; sin ejes, sin meses, sin tooltips. No hay librería de gráficos en `frontend/package.json`. |
| Frontend página | `frontend/src/pages/recepcion/ReportesPage.jsx:16-28,36` | `DEFAULT_METRICS` con ceros y `chartPath` fijo; `const { data: metrics = DEFAULT_METRICS, isLoading }`: no se lee `isError`, no hay estado de error ni reintento. |
| Frontend página | `frontend/src/pages/recepcion/ReportesPage.jsx:31,102-175` | Tabs `Resumen / Morosidad / Asistencia / Ingresos` solo muestran/ocultan las mismas 4 tarjetas. Las tarjetas de ingresos y morosidad no respetan los filtros de `ReportFilters` (mes, plan); los filtros solo afectan a los exportes. |
| Backend reportes | `backend/apps/reports/urls.py:8-12`, `views.py` | Solo existen `morosidad/`, `facturacion/`, `asistencia/`, todos devuelven archivo (CSV/XLSX/PDF). No hay endpoint JSON de resumen. |
| Backend ingresos | `backend/apps/reports/services.py:67-102` | `build_facturacion` ya define la regla correcta de ingresos: `Pago.estado = aprobado` con `paid_at` dentro del mes local. |
| Rutas | `frontend/src/App.jsx:124-126` | `/recepcion/reportes` y `/admin/reportes` (roles `administrador`, `recepcionista`) renderizan la misma `ReportesPage`; `/reportes` redirige a `/admin/reportes`. |

Alcance de la "Asistencia semanal" (`asistenciaBars`, `useReportes.js:89-102`): sufre el mismo problema (10 logs de `/access/logs/`). Se incluye en el endpoint de resumen para no dejar la pantalla a medias, pero su semántica pertenece al área de accesos (BK-ACC-xx probable).

Verificación en ejecución: **No verificado** contra la app corriendo (backend en `localhost:8001` no estaba levantado al relevar); las conclusiones salen de leer el código.

## 4. Alcance
**Incluye:**
- Endpoint `GET /api/reportes/resumen/` con ingresos del mes actual, mes anterior, variación y serie de los últimos N meses; morosos (cantidad, monto, tasa); membresías (activas, por vencer en 7 días, nuevas del mes); asistencia por día de la semana.
- Reemplazar `useReportMetrics` por una única llamada y construir el gráfico con la serie real (SVG propio, sin sumar dependencias).
- Estado de error visible con botón "Reintentar" (sin `catch` silenciado).
- Que los filtros de rango (`mes`) y `plan_id` afecten también a las tarjetas.

**No incluye:**
- Nuevos exportes ni validaciones de exportes (BK-FIN-02).
- Redefinir "moroso" (la definición se comparte con BK-FIN-03; acá solo se consume).
- Librería de gráficos nueva o rediseño visual de las tarjetas.

## 5. Contrato de API
**[A CREAR]** `GET /api/reportes/resumen/` — permiso `IsReceptionistOrAdmin` (`backend/apps/access/permissions.py:4`).

Query params (propuesta):
- `meses` (int, default `6`, mín `1`, máx `24`): largo de la serie de ingresos.
- `plan_id` (int, opcional): filtra ingresos y membresías por plan.

Response `200` (propuesta, montos como string decimal con 2 decimales, igual que los exportes `f'{Decimal(...):.2f}'`):
```json
{
  "generado_en": "2026-10-13T12:00:00-03:00",
  "ingresos": {
    "mes_actual": "1250000.00",
    "mes_anterior": "1100000.00",
    "variacion_pct": 13.6,
    "serie": [{ "mes": "2026-05", "total": "980000.00" }, { "mes": "2026-06", "total": "1010000.00" }]
  },
  "morosidad": { "socios_morosos": 14, "monto_adeudado": "168000.00", "tasa_pct": 7.2 },
  "membresias": { "activas": 180, "por_vencer_7d": 12, "nuevas_mes": 21 },
  "asistencia_semanal": [{ "dia": "lun", "ingresos": 140 }]
}
```
Reglas:
- `ingresos.*`: suma de `Pago.monto` con `estado='aprobado'` y `paid_at` en el mes local (misma regla que `build_facturacion`). `variacion_pct` es `null` si el mes anterior es 0 (no inventar `+100%` como hace hoy `useReportes.js:85-87`).
- `morosidad.*`: usa el selector compartido de BK-FIN-03 (`socios_morosos_queryset`); `tasa_pct = morosos / socios con alguna membresía * 100`.
- `membresias.activas`: `Membresia.estado='activa'` con `fecha_fin >= hoy`.
- Errores: `400` `{"meses": ["..."]}` si `meses`/`plan_id` no son enteros válidos; `403` `{"detail": "..."}` para socio.

Se agrega serializer de salida en `backend/apps/reports/serializers.py` (hoy dice "This app has no DRF serializers", `serializers.py:1-4`; hay que reescribir ese comentario) para que drf-spectacular documente el contrato (`@extend_schema(tags=['reports'])` como en `views.py:22`).

## 6. Modelo de datos
Sin cambios de modelo. Sugerido (opcional, solo si la serie se vuelve lenta): índice en `Pago(estado, paid_at)`; hoy hay índices `pagos_socio_e_idx` y `pagos_extref_idx` (`backend/apps/payments/models.py:57-60`) y ninguno cubre `paid_at`.

## 7. Diseño frontend
- **Ruta/guard:** sin cambios (`App.jsx:124-126`, `roles={['administrador','recepcionista']}`).
- **Reutilizar:** `ReportesPage.jsx`, `EvolucionIngresosCard` (props `chartPoints`, `estesMes`, `vsAnterior`, `onExport`), `MorosidadCard` (`morosos`, `adeudado`, `tasa`, `morosidadPct`, `onExport`), `MembresiasActivasCard` (`activas`, `porVencer`, `nuevasMes`), `AsistenciaSemanalCard` (`bars`), `ReportFilters`, `ReportExportButtons`.
- **Cambios:**
  - `frontend/src/hooks/queries/useReportes.js`: `useReportMetrics(filters)` pasa a `api.get('/reportes/resumen/', { params: { meses: 6, plan_id } })`; el `queryKey` incluye los filtros (`['reportes','metrics', params]`); eliminar `REPORT_FETCH_LIMIT` del archivo. Mantener el export `REPORTES_QUERY_KEY` (lo usan los tests).
  - Nuevo helper `frontend/src/utils/sparkline.js` (`buildSparklinePath(values, { width: 400, height: 100, padding: 8 })`) y usarlo para `chartPath`.
  - `EvolucionIngresosCard`: sumar etiquetas de meses debajo del SVG y `<title>` accesible por punto (sin librería).
  - `ReportesPage.jsx`: leer `isError`/`refetch`; mostrar `EmptyState` con "No pudimos cargar las métricas" + `Button` "Reintentar".
- **Estados:** loading (spinner `Loader2` ya presente), vacío (sin pagos: mostrar `$ 0` y "Sin datos de ingresos en el período"), error (EmptyState + reintentar), éxito.
- **Textos (voseo):** "No pudimos cargar las métricas. Probá de nuevo." / "Reintentar" / "Sin ingresos registrados en este período".
- **Responsive:** grilla `grid-cols-1 lg:grid-cols-2` ya existente (`ReportesPage.jsx:140`); a 375 px una tarjeta por fila, SVG con `w-full`; las etiquetas de meses se reducen a iniciales.

## 8. Archivos a crear / modificar
- `backend/apps/reports/services.py`: `build_resumen(meses, plan_id)` (función pura, usa `Pago`, `Membresia`, `AccessLog`).
- `backend/apps/reports/views.py`: `ResumenReportView` (`APIView`, `permission_classes=[IsReceptionistOrAdmin]`).
- `backend/apps/reports/urls.py`: `path('resumen/', ResumenReportView.as_view(), name='resumen')`.
- `backend/apps/reports/serializers.py`: `ResumenSerializer` (+ validación de query con un `Serializer`).
- `backend/apps/reports/tests/test_resumen_endpoint.py` (nuevo).
- `frontend/src/hooks/queries/useReportes.js` + `useReportes.test.jsx` (existe: actualizar).
- `frontend/src/utils/sparkline.js` + test.
- `frontend/src/components/recepcion/EvolucionIngresosCard.jsx`, `frontend/src/pages/recepcion/ReportesPage.jsx` (+ sus tests `__tests__/ReportesPage.test.jsx`, `ReportesPage.handlers.test.jsx`).

## 9. Plan de pruebas (TDD)
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
2. Error 500 -> la página muestra "No pudimos cargar las métricas" y el botón reintenta (no ceros).
3. `buildSparklinePath` con serie de 1 punto, de 0 puntos y de valores iguales no genera `NaN`.
4. Cambiar `plan_id` en `ReportFilters` dispara un nuevo query key.
Correr además `npm run lint` (máx. 0 warnings) y `npx vitest run --coverage` (umbral 68 %, `vite.config.js`).

**Manual** (cuentas de `seed_demo_users`: `admin@winnie.local`, `recepcion@winnie.local`; contraseña por `DEMO_USER_PASSWORD`, no se imprime acá): cargar 12 cobros manuales desde `/recepcion/cobros`, abrir `/admin/reportes` y verificar que "Este mes" coincide con el total del CSV de facturación del mismo mes.

## 10. Criterios de aceptación
- **Dado** 25 pagos aprobados del mes **cuando** abro Reportes **entonces** "Este mes" muestra la suma de los 25 (no de 10).
- **Dado** socios morosos con planes de distinto precio **cuando** abro Reportes **entonces** "Adeudado" es la suma de los precios de sus planes (no `$ 0`).
- **Dado** pagos en 6 meses distintos **cuando** abro Reportes **entonces** el gráfico refleja la serie real y cambia si cambian los pagos.
- **Dado** que el endpoint falla **cuando** abro Reportes **entonces** veo un error con "Reintentar", no ceros.
- **Dado** un `plan_id` filtrado **cuando** cambia el filtro **entonces** las tarjetas se recalculan.

## 11. Riesgos y decisiones abiertas
1. ¿Los ingresos son brutos (solo `aprobado`) o netos de reembolsos (restar `reembolsado`)? Hoy `build_facturacion` solo cuenta `aprobado`. Recomendación: brutos y mostrar reembolsos como línea aparte cuando exista BK-FIN-08.
2. ¿La tasa de morosidad se mide sobre socios con membresía o sobre socios `activo`? Recomendación: socios `activo` con al menos una membresía.
3. ¿Se mantiene "Asistencia semanal" en esta pantalla? Si se mueve al área de accesos, quitar `asistencia_semanal` del contrato.
4. Costo de la consulta: con miles de pagos conviene el índice `(estado, paid_at)`; validar con el volumen real.

## 12. Referencias
- `backend/apps/reports/services.py` (reglas de exporte), `CHANGELOG.md:167` (alta de la app `reports`), `docs/architecture.md` (flujo de pago).
- `speckit/spec.md:341` menciona el recorrido admin "export PDF morosidad" como flujo e2e esperado.
- Figma (solo apoyo visual opcional): archivo `WuBKhksfVVcBjNKbDVX5EM`, página "vistas live", módulo Reportes.

## 13. Prompt listo para un agente de IA
```
Contexto: repo Winnie-The-Gym (Django 5/DRF en backend/, React 18 + Vite + TanStack Query en frontend/). Trabajá en TDD estricto: primero los tests, luego el código.

Problema: frontend/src/hooks/queries/useReportes.js (useReportMetrics) arma las métricas de ReportesPage en el navegador a partir de /memberships/membresias/, /payments/pagos/ y /access/logs/ con params {limit:100}. El backend usa PageNumberPagination con PAGE_SIZE=10 (backend/core/settings/base.py:181-182) e ignora `limit`, así que solo se procesan 10 filas. Además MembresiaSerializer devuelve `plan` como id, por lo que `m.plan?.precio` es undefined y "Adeudado" da $0; el gráfico (chartPath) es un string fijo; los errores se tragan con .catch(() => ({data: []})).

Construí:
1. Backend: GET /api/reportes/resumen/ (IsReceptionistOrAdmin) en backend/apps/reports (views.py, urls.py, services.py::build_resumen, serializers.py). Query: meses (default 6, 1..24), plan_id. Response según ficha docs/backlog/items/BK-FIN-01-reportes-metricas-reales.md sección 5. Ingresos = Pago estado='aprobado' con paid_at en el mes local (America/Argentina/Buenos_Aires), igual que build_facturacion. variacion_pct = null si el mes anterior es 0. Morosos: reutilizá el selector de BK-FIN-03 si ya existe; si no, usá Membresia vencida/pendiente_pago con fecha_fin<hoy sin otra membresía activa del mismo socio.
2. Frontend: reescribí useReportMetrics para una sola llamada con queryKey ['reportes','metrics', params], agregá frontend/src/utils/sparkline.js (buildSparklinePath), mostrá estado de error con botón "Reintentar" en ReportesPage.jsx, y etiquetas de meses en EvolucionIngresosCard.jsx.

Tests primero: backend/apps/reports/tests/test_resumen_endpoint.py (APITestCase, RefreshToken, factories de backend/conftest.py): >10 pagos suman completo, estados no aprobados no suman, borde de mes en ART, variacion null, morosidad sin renovados, 400 por params inválidos, 403 socio. Frontend: actualizá useReportes.test.jsx y __tests__/ReportesPage.test.jsx (vitest + renderWithProviders de src/test/test-utils.jsx).

Terminado cuando: `cd backend && pytest -q` pasa (cobertura >= 80), `cd frontend && npm run lint && npx vitest run --coverage && npm run build` pasan, y "Este mes" de Reportes coincide con el total del CSV de facturación del mismo mes. No toques archivos fuera de este alcance. No hagas commits.
```
