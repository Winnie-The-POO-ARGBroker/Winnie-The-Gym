---
id: BK-CLS-12
titulo: Reportes de clases (ocupación y asistencia por clase/instructor), no-shows y cierre automático
tipo: feature
roles: [administrador, recepcionista]
prioridad: P2
tamano: L
estado_en_codigo: no-existe
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-CLS-09, BK-CLS-02, BK-CLS-11]
---

# BK-CLS-12 · Reportes de clases (ocupación y asistencia por clase/instructor), no-shows y cierre automático

## 1. Resumen
El módulo de reportes solo tiene morosidad, facturación y un "reporte de asistencia" que en realidad mide ingresos por QR al gimnasio (`AccessLog`), no asistencia a clases. No hay ningún endpoint ni pantalla de ocupación por clase, asistencia por clase/instructor, ni seguimiento de ausentes (no-shows). La única métrica de clases es la "tasa de asistencia" calculada en el navegador dentro de `AttendancePage`. No existen sanciones ni cierre automático de listas.

## 2. Objetivo de usuario
Como **administrador** quiero **ver y exportar la ocupación y la asistencia por clase, disciplina e instructor** para **decidir qué clases mantener, reprogramar o reforzar**.
Como **recepcionista** quiero **identificar socios con ausencias reiteradas** para **aplicar la política del gimnasio**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend reportes | `backend/apps/reports/urls.py:8-12` | Rutas: `morosidad/`, `facturacion/`, `asistencia/` (prefijo `api/reportes/`, `backend/core/urls.py:166`). Nada de clases. |
| Backend reportes | `backend/apps/reports/services.py:141-201` | `build_asistencia`: agrupa `AccessLog` (entradas/salidas por QR) con `permanencia_minutos`; no toca `Clase` ni `InscripcionClase`. |
| Backend reportes | `backend/apps/reports/views.py:66-86` | `AsistenciaReportView` (`IsReceptionistOrAdmin`), `formato=csv|xlsx|pdf`, `fecha_desde/fecha_hasta`; usa `export(...)` de `reports/exporters.py`. |
| Backend socios | `backend/apps/memberships/serializers.py:81-92` | `asistencias_mes` = ingresos QR del mes (no clases). |
| Backend clases | `backend/apps/classes/models.py:64-90` | `asistio` sin fecha (ver BK-CLS-02/09): no se puede calcular asistencia histórica ni por período. |
| Backend clases | `backend/apps/classes/filters.py:59-68` | `cupo_disponible` ya recorre el queryset contando inscriptos por clase (N+1); no hay agregaciones. |
| Backend sanciones | (ninguno) | `rg -i "sancion|no.?show|penaliz" backend/apps` sin resultados de negocio; `finalizada` nunca se asigna (`models.py:21`). |
| Backend cierre auto | `backend/apps/memberships/tasks.py:45-60` y `0004_seed_expiration_schedule.py` | Existe el patrón de tarea Celery beat (alertas de vencimiento), pero ninguna tarea para clases. |
| Frontend | `frontend/src/pages/AttendancePage.jsx:72-76` | `tasaAsistencia = presentes / confirmados` calculada en el cliente solo para la clase abierta. |
| Frontend | `frontend/src/pages/recepcion/ReportesPage.jsx`, `frontend/src/services/reportsService.js:109-170`, `frontend/src/hooks/queries/useReportes.js` | UI de reportes: exporta `facturacion`, `morosidad`, `asistencia` (QR). Sin reportes de clases. |
| Frontend dashboard | `frontend/src/components/dashboard/ClassCapacityList.jsx`, `AdminDashboardView.jsx:58` | Lista "Cupos de clases" (`current/max`) solo como snapshot de la plantilla. |
| Docs | `docs/qa/walkthrough-2026-09-22.md` (mobile) | Reportes móvil sin tabs Morosidad/Asistencia/Ingresos ni filtros (otra área). |

## 4. Alcance
**Incluye:**
- Reporte de ocupación de clases (por clase, disciplina, instructor, día/franja) con export CSV/XLSX/PDF reutilizando `exporters.export`.
- Reporte de asistencia a clases (presentes/ausentes/sin marcar y tasa) por clase/sesión, instructor y socio.
- Métrica de no-shows por socio (ausencias en ventana de N días).
- Cierre automático de asistencia (tarea Celery) tras X horas de finalizada la sesión.
- Política de sanciones configurable (propuesta) y su aplicación en la reserva.
- Pestañas "Clases" en `ReportesPage`.

**No incluye:**
- Reportes de acceso QR/aforo (ya existen).
- Facturación por clase/instructor (no hay modelo de costos).
- Dashboards BI avanzados.

## 5. Contrato de API (propuesta, todo **[A CREAR]**; permisos `IsReceptionistOrAdmin`, `formato=csv|xlsx|pdf` igual que `FORMAT_PARAMETER` de `reports/views.py:11-17`)
- `GET /api/reportes/clases-ocupacion/?fecha_desde=&fecha_hasta=&categoria=&instructor=&sala=&formato=`
  Columnas: `fecha, clase, categoria, instructor, sala, cupo_maximo, confirmados, en_espera, ocupacion_pct`. Sin sesiones (BK-CLS-09) devuelve snapshot por plantilla (`fecha` vacía).
- `GET /api/reportes/clases-asistencia/?fecha_desde=&fecha_hasta=&agrupar=clase|instructor|socio&formato=`
  Columnas: `clase|instructor|socio, sesiones, inscriptos, presentes, ausentes, sin_marcar, tasa_asistencia_pct`.
- `GET /api/reportes/no-shows/?dias=30&minimo=3` -> socios con >= `minimo` ausencias: `socio_dni, socio_nombre, ausencias, ultimas_ausencias`.
- Respuestas JSON para pantalla: `GET .../clases-ocupacion/?formato=json` `{ "resumen": {...}, "filas": [...] }` (el servicio actual solo exporta archivos: nuevo parámetro).
- Sanciones (decisión abierta): `GET /api/classes/sanciones/` y efecto en `inscribir`: `400 {"detail": "Tenés la reserva suspendida hasta el 20/10 por ausencias reiteradas."}`.
- Errores: `400 {"detail": "fecha_desde debe ser anterior a fecha_hasta."}`; `403` socios.

## 6. Modelo de datos (propuesta)
- Requiere sesiones por fecha (BK-CLS-09) y `asistio` nullable (BK-CLS-02).
- `SancionReserva(socio FK, motivo, desde, hasta, creada_por, automatica Bool)` o contador derivado de reservas con `asistio=False`.
- `GymConfig` (o modelo `PoliticaClases`): `ausencias_para_sancion`, `ventana_dias`, `dias_suspension`, `horas_cierre_auto`.
- Tarea Celery beat `classes.auto_close_attendance` cada 15 min (patrón `memberships.check_expiring_memberships`, `core/celery.py`, `CELERY_BEAT_SCHEDULER` DatabaseScheduler en `base.py:368`).

## 7. Diseño frontend
- **Ruta/guard:** `ReportesPage` en `/recepcion/reportes` y `/admin/reportes` (`frontend/src/App.jsx:124-125`, guard `<ProtectedRoute roles={['administrador', 'recepcionista']}>`).
- **Reutilizar:** `frontend/src/services/reportsService.js` (agregar `exportClasesOcupacion`, `exportClasesAsistencia`), `useReportes.js`, `DataTable`, `FilterPanel`, `AsistenciaSemanalCard` (barras) como referencia visual.
- **Hooks:** `useReporteClases(tipo, filtros)` en `frontend/src/hooks/queries/useReportes.js` (TanStack Query, `api.get('/reportes/clases-ocupacion/', { params })`).
- **Estados:** loading `Skeleton`; vacío "No hay clases en ese período"; error toast; éxito descarga.
- **Textos (voseo):** "Ocupación de clases", "Asistencia por instructor", "Socios con ausencias reiteradas", "Exportar".
- **Responsive:** filtros en panel colapsable en 375 px; tablas con scroll horizontal.

## 8. Archivos a crear / modificar
- Backend: `reports/services.py` (`build_clases_ocupacion`, `build_clases_asistencia`, `build_no_shows`), `reports/views.py`, `reports/urls.py`, `classes/tasks.py` (cierre automático), `classes/models.py` (sanciones), tests.
- Frontend: `reportsService.js`, `useReportes.js`, `ReportesPage.jsx`, tests.

## 9. Plan de pruebas (TDD)
Backend (`backend/apps/reports/tests/test_reports_endpoints.py` como modelo; `APITestCase`; `cd backend && pytest apps/reports apps/classes -q`):
- Ocupación: 3 clases con distintos inscriptos -> porcentajes exactos; filtros por categoría/instructor; export CSV con BOM (ver `test_csv_bom.py`).
- Asistencia: sesiones con presentes/ausentes/sin marcar -> tasas; agrupación por instructor y socio.
- No-shows: umbral 3 en 30 días; excluye `asistio=None`.
- Permisos: socio 403, sin token 401.
- Cierre automático: con `CELERY_TASK_ALWAYS_EAGER` llamar la tarea; marca ausentes a las sesiones finalizadas hace > X h, idempotente.
Frontend (vitest/RTL, `ReportesPage.test.jsx`): tabs, filtros, export dispara `api.get` con `responseType: 'blob'`.
Manual: `admin@winnie.local` -> Reportes -> "Clases" -> exportar XLSX.

## 10. Criterios de aceptación
- **Dado** un mes con sesiones **cuando** pido ocupación por instructor **entonces** veo % de ocupación promedio por instructor y puedo exportarlo.
- **Dado** sesiones cerradas **cuando** pido asistencia **entonces** la tasa coincide con `presentes / (presentes + ausentes)`.
- **Dado** un socio con 3 ausencias en 30 días **cuando** abro "no-shows" **entonces** aparece listado.
- **Dado** una sesión terminada hace 3 h sin cerrar **cuando** corre la tarea **entonces** los sin marcar quedan ausentes una sola vez.

## 11. Riesgos y decisiones abiertas
- Sin BK-CLS-09 los números de asistencia no tienen fecha: no entregar asistencia histórica antes.
- ¿Existe política de sanciones? Hoy no hay definición. Recomendación: empezar solo con el reporte de no-shows (sin bloquear reservas) y decidir la sanción con el dueño.
- ¿"Tasa de asistencia" = presentes/confirmados o presentes/(presentes+ausentes)? `AttendancePage` usa la primera. Recomendación: definir una sola y documentarla.
- Cierre automático: ¿cuántas horas después? Recomendación: 3 h configurable en `GymConfig`.
- Datos personales: el reporte de no-shows incluye DNI; restringir a staff y registrar acceso (auditoría, `backend/apps/common/audit.py`).

## 12. Referencias
- `speckit/class-model-architecture-decision/explore.md` §10 pregunta 7 (reportes entre sesiones).
- `docs/qa/plan-de-pruebas.md` (US09 reportes).
- Figma opcional: Reportes (tabs Morosidad/Asistencia/Ingresos) en "vistas live".

## 13. Prompt listo para un agente de IA
Contexto: Winnie The Gym. `backend/apps/reports` solo tiene morosidad, facturación y asistencia por QR (`AccessLog`). No hay reportes de clases. Prerrequisitos: sesiones por fecha (BK-CLS-09) y `asistio` nullable (BK-CLS-02); si no están hechos, detenerte y avisar.
Tarea (TDD): tests en `backend/apps/reports/tests/test_reports_clases.py` para `clases-ocupacion`, `clases-asistencia`, `no-shows` (permisos, filtros, formatos con `exporters.export`); implementar `build_*` en `reports/services.py`, vistas y rutas (`IsReceptionistOrAdmin`); tarea Celery `classes.auto_close_attendance` (patrón de `apps/memberships/tasks.py` + migración de `PeriodicTask` como `memberships/migrations/0004_seed_expiration_schedule.py`); frontend: `exportClases*` en `reportsService.js`, pestaña "Clases" en `ReportesPage.jsx`, tests vitest/RTL. Comandos: `cd backend && pytest apps/reports apps/classes -q`; `cd frontend && npx vitest run && npm run lint`. Terminado: criterios de la sección 10 verdes y exports abren en Excel sin romper acentos (BOM).
