---
id: BK-FIN-02
titulo: Exportes de reportes - validar parámetros, rangos de fechas, filtro por plan, totales y columnas numéricas
tipo: bug
roles: [administrador, recepcionista]
prioridad: P1
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-FIN-01]
---

# BK-FIN-02 · Exportes de reportes: validación, rangos, totales y números reales

## 1. Resumen
Los exportes CSV/XLSX/PDF de morosidad, facturación y asistencia existen y están cableados al frontend, pero: un `formato` o `mes` inválido produce un `500`; facturación solo admite un mes completo (los presets de rango de la UI no tienen efecto); no se puede filtrar por plan, estado ni socio; no hay fila de totales; y los importes salen como texto, por lo que en Excel no se pueden sumar.

## 2. Objetivo de usuario
Como **administrador/recepcionista** quiero **exportar facturación por rango de fechas, plan y método, con totales y columnas numéricas** para **conciliar caja y contabilidad sin retrabajo en planilla**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend vista | `backend/apps/reports/views.py:33-39,56-63,80-86` | Tres `APIView` (`MorosidadReportView`, `FacturacionReportView`, `AsistenciaReportView`) con `IsReceptionistOrAdmin`; leen `formato` y filtros con `request.query_params.get` sin validar. |
| Backend exportador | `backend/apps/reports/exporters.py:97-101` | `export()` lanza `ValueError('Formato de exportación no soportado')` si `formato` no es `csv|xlsx|pdf`; ninguna vista lo captura -> `500` en vez de `400`. |
| Backend servicio | `backend/apps/reports/services.py:67-71` | `build_facturacion`: `int(x) for x in mes.split('-', 1)` con `mes` libre -> `ValueError` (`500`) si viene `2026-13`, `abc` o vacío. |
| Backend servicio | `backend/apps/reports/services.py:82-88` | Facturación filtra solo `estado=aprobado`, `paid_at` dentro de un mes y `metodo`. No admite rango de días, plan, socio ni estados (reembolsos). |
| Backend servicio | `backend/apps/reports/services.py:94-101` | `monto` se escribe como `f'{Decimal(p.monto):.2f}'` (string). En `export_xlsx` (`exporters.py:39-40`) la celda queda de tipo texto -> sin SUM. Igual en morosidad (`services.py:50`). |
| Backend exportador | `backend/apps/reports/exporters.py:50-87` | PDF: tabla A4 apaisada genérica; sin totales, sin fecha de generación, sin pie, sin saltos de página con título repetido más allá de `repeatRows=1`. |
| Frontend filtros | `frontend/src/components/recepcion/ReportFilters.jsx:39-78,163-205` | Presets "Hoy / Últimos 7 días / Este mes / Mes anterior" llenan `fecha_desde/fecha_hasta`, pero para la categoría `facturacion` la UI muestra solo el selector `type="month"` (`mes`). |
| Frontend servicio | `frontend/src/services/reportsService.js:86-106,156-161` | `exportFacturacion` envía solo `mes` y `metodo`; descarta `fecha_desde/fecha_hasta` y `plan_id`. |
| Frontend servicio | `frontend/src/services/reportsService.js:45-56` | `parseBlobError` ya sabe leer un error JSON dentro de un blob (`detail`/`error`/`message`), por lo que un `400` con `{"detail": ...}` se mostrará bien en el toast. |
| Frontend página | `frontend/src/pages/recepcion/ReportesPage.jsx:70-86` | `handleExport(formato, explicitCategory)` hace `toast.loading` -> `exportReport` -> `toast.success('Reporte descargado: <archivo>')`. Funciona (el flujo de descarga por `Blob` está en `reportsService.js:30-40`). |
| Tests existentes | `backend/apps/reports/tests/test_reports_endpoints.py`, `test_csv_bom.py` | Cubren CSV/XLSX/PDF felices y permisos; **no** hay test de `formato` inválido, `mes` inválido ni filtros por plan. |

**¿Los exportes funcionan de verdad?** Por lectura del código y de los tests, sí: generan archivos reales desde la base (no hay datos mock en `backend/apps/reports/`). **No verificado en ejecución** (backend no levantado al relevar). Los problemas son de robustez y de contenido, no de "no funcionan".

## 4. Alcance
**Incluye:**
- Validación de query params con `400` y mensajes en español (`formato`, `mes`, `fecha_desde`, `fecha_hasta`, `plan_id`, `metodo`, `estado`).
- Facturación por rango `fecha_desde`/`fecha_hasta` (tiene prioridad sobre `mes`), filtro `plan_id` y `estado` (lista, default `aprobado`).
- Columnas de importe numéricas en XLSX y CSV con punto decimal; fila "TOTAL" al final de facturación (y de morosidad: total adeudado).
- Encabezado del PDF con rango/filtros aplicados y fecha de generación.
- Frontend: enviar el rango y el plan; habilitar selector de rango en facturación.

**No incluye:**
- Nuevos reportes (caja diaria, BK-FIN-11), resumen JSON (BK-FIN-01), cambios de definición de morosidad (BK-FIN-03), comprobantes (BK-FIN-10).

## 5. Contrato de API
Todos **[EXISTE]**, se **modifican** (compatibles hacia atrás: los params actuales siguen funcionando).

`GET /api/reportes/facturacion/` — `IsReceptionistOrAdmin`.
- Params: `formato` (`csv|xlsx|pdf`, default `csv`), `mes` (`YYYY-MM`, default mes actual; ignorado si hay rango), **[A CREAR]** `fecha_desde`, `fecha_hasta` (`YYYY-MM-DD`, inclusive, día local ART; `fecha_desde <= fecha_hasta`, máx. 366 días), **[A CREAR]** `plan_id` (int), `metodo` (`mercado_pago|manual`), **[A CREAR]** `estado` (uno o varios de `aprobado|reembolsado|cancelado|rechazado|pendiente`, default `aprobado`).
- Respuesta `200`: archivo con headers existentes (`FACTURACION_HEADERS`, `services.py:61-64`) más fila final `TOTAL`. Nombre de archivo: `facturacion_<desde>_<hasta>.<ext>` o `facturacion_<mes>.<ext>`.
- Errores `400` (JSON, formato DRF): `{"formato": ["Formato no soportado. Usá csv, xlsx o pdf."]}`, `{"mes": ["Usá el formato AAAA-MM."]}`, `{"fecha_hasta": ["Debe ser posterior o igual a fecha_desde."]}`.

`GET /api/reportes/morosidad/` y `/asistencia/`: mismas validaciones de `formato` y fechas; morosidad agrega fila `TOTAL` de `monto_adeudado`. Params existentes: `estado` (`vencida|pendiente_pago`), `plan_id` (morosidad, `views.py:28-29`); `fecha_desde`, `fecha_hasta` (asistencia, `views.py:75-76`).

Implementación sugerida: un `Serializer` de query por reporte en `backend/apps/reports/serializers.py` (hoy vacío por diseño, `serializers.py:1-4`) usado en la vista con `serializer.is_valid(raise_exception=True)`; así el `ValidationError` de DRF devuelve el `400` estándar.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Ruta/guard:** sin cambios (`/admin/reportes`, `/recepcion/reportes`, `App.jsx:124-125`).
- **Reutilizar:** `ReportFilters` (props `filters`, `onFilterChange`, `onResetFilters`), `ReportExportButtons` (`onExport(formato)`, `downloadingFormat`, `disabled`), `exportReport` y helpers de descarga en `reportsService.js`.
- **Cambios:**
  - `ReportFilters.jsx`: en `facturacion` mostrar `fecha_desde/fecha_hasta` además de `mes` (el rango reemplaza al mes cuando está completo) y un `Select` "Plan de Membresía" (ya existe para morosidad, `ReportFilters.jsx:221-235`).
  - `reportsService.js::exportFacturacion`: aceptar `{ fecha_desde, fecha_hasta, plan_id, estado }` y enviarlos; `exportReport` los pasa (`reportsService.js:156-161`).
  - `ReportesPage.jsx`: deshabilitar exportar si `fecha_desde > fecha_hasta` (mensaje inline "La fecha desde no puede ser posterior a la fecha hasta").
- **Estados:** loading (`toast.loading` existente), error (toast con el `detail` del `400`), éxito (toast "Reporte descargado: <archivo>"), vacío (descargar igual un archivo con encabezados y TOTAL en 0; decisión abierta 3).
- **Textos (voseo):** "Elegí un rango de fechas", "Exportar facturación", "Total del período".
- **Responsive:** el bloque de filtros ya es `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`; a 375 px los inputs `date` ocupan una fila cada uno.

## 8. Archivos a crear / modificar
- `backend/apps/reports/serializers.py`: serializers de query (`FacturacionQuerySerializer`, `MorosidadQuerySerializer`, `AsistenciaQuerySerializer`).
- `backend/apps/reports/views.py`: usar los serializers antes de llamar a `build_*`.
- `backend/apps/reports/services.py`: `build_facturacion(mes, metodo, fecha_desde, fecha_hasta, plan_id, estados)`; importes como `Decimal` y fila `TOTAL`.
- `backend/apps/reports/exporters.py`: tipos numéricos en XLSX (`cell.number_format = '#,##0.00'`), CSV con `Decimal` en texto plano, encabezado con filtros en PDF.
- `backend/apps/reports/tests/test_reports_endpoints.py` + nuevo `test_reports_validation.py`.
- `frontend/src/services/reportsService.js` (+ `__tests__/reportsService.test.js`), `frontend/src/components/recepcion/ReportFilters.jsx`, `frontend/src/pages/recepcion/ReportesPage.jsx` (+ tests existentes en `__tests__/`).

## 9. Plan de pruebas (TDD)
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

## 10. Criterios de aceptación
- **Dado** `formato=docx` **cuando** pido el exporte **entonces** recibo `400` con mensaje claro, no `500`.
- **Dado** un rango de fechas **cuando** exporto facturación **entonces** solo salen pagos de esos días (hora ART).
- **Dado** el XLSX de facturación **cuando** lo abro en Excel **entonces** la columna de monto es numérica y hay una fila TOTAL correcta.
- **Dado** un plan elegido **cuando** exporto **entonces** solo salen pagos de ese plan.

## 11. Riesgos y decisiones abiertas
1. ¿Incluir `reembolsado` con signo negativo en el total? Recomendación: columna `estado` visible y total solo de `aprobado`; reembolsos en subtotal aparte.
2. ¿Rango máximo? Recomendación: 366 días para proteger memoria (el exporte arma todo en RAM: `export_xlsx`/`export_pdf` usan `io.BytesIO`).
3. ¿Archivo vacío o `204`/mensaje cuando no hay filas? Recomendación: archivo con encabezados y TOTAL 0 (comportamiento actual).
4. Inyección de fórmulas en CSV/XLSX (celdas de `apellido`/`nombre` que empiecen con `=`, `+`, `-`, `@`): hoy no se sanea; recomendación: prefijar con `'` en exportes.

## 12. Referencias
- `CHANGELOG.md:167` (alta de reportes), `docs/qa/plan-de-pruebas.md:77` (reportes cubiertos por pytest).
- Figma (solo apoyo visual opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", módulo Reportes.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym. TDD: tests primero. Mejorá los exportes de backend/apps/reports sin romper compatibilidad.

Hoy: views.py pasa `formato` y filtros sin validar; exporters.export() lanza ValueError -> 500; services.build_facturacion usa int(mes.split('-')) -> 500 con mes inválido; solo filtra por mes/método; importes son strings (f'{Decimal:.2f}').

Hacé:
1. serializers.py: Serializers de query (formato csv|xlsx|pdf; mes AAAA-MM; fecha_desde/fecha_hasta ISO con desde<=hasta y máx 366 días; plan_id int; metodo mercado_pago|manual; estado múltiple default aprobado) y usalos en las 3 vistas con is_valid(raise_exception=True) -> 400 DRF con mensajes en español.
2. services.build_facturacion: rango por fecha local (America/Argentina/Buenos_Aires) que prima sobre mes, plan_id, estados; devolvé importes Decimal/float y agregá fila TOTAL (morosidad: TOTAL de monto_adeudado).
3. exporters: celdas numéricas en XLSX con number_format, CSV con punto decimal (mantené BOM), PDF con rango y fecha de generación en el título.
4. Frontend: reportsService.exportFacturacion/exportReport envían fecha_desde, fecha_hasta, plan_id; ReportFilters muestra rango y plan para 'facturacion'; ReportesPage deshabilita exportar si desde>hasta.

Tests (backend/apps/reports/tests/test_reports_validation.py y ampliar test_reports_endpoints.py; frontend src/services/__tests__/reportsService.test.js y src/pages/recepcion/__tests__/ReportesPage.test.jsx): casos de la ficha docs/backlog/items/BK-FIN-02-reportes-exportes-validacion-rangos-totales.md sección 9.
Definición de terminado: `cd backend && pytest -q` (cov>=80), `cd frontend && npm run lint && npx vitest run --coverage && npm run build` en verde. Sin commits.
```
