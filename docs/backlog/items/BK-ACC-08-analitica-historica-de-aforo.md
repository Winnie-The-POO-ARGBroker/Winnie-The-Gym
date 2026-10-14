---
id: BK-ACC-08
titulo: Analítica histórica de aforo (por hora y por día, horas pico, permanencia promedio)
tipo: feature
roles: [administrador, recepcionista]
prioridad: P2
tamano: L
estado_en_codigo: no-existe
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-ACC-05, BK-ACC-01]
---

# BK-ACC-08 · Analítica histórica de aforo

## 1. Resumen
Todo el análisis de aforo es "de hoy": promedio, pico y movimientos de la última hora. No se puede ver cómo se comporta el gimnasio por hora del día, por día de la semana ni en el tiempo (¿cuál es la hora pico? ¿cuánto se queda la gente?). Los datos están (cada `AccessLog` tiene timestamp y tipo), pero no hay endpoint ni pantalla. Además el "promedio de hoy" actual está sesgado hacia abajo.

## 2. Objetivo de usuario
Como **administrador** quiero **ver ocupación e ingresos por hora y por día, picos y permanencia promedio de un período** para **planificar personal, horarios de clases y detectar saturación**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend servicio | `backend/apps/access/services.py:45-129` | `compute_aforo_stats()` solo del día actual: `promedioHoy`, `picoMaximo`, `picoHora`, `ingresoUltimaHora`, `egresoUltimaHora` (todo `str`). Carga todos los logs del día en memoria. |
| Backend sesgo | `services.py:109-115` | `promedioHoy = weighted_sum / total_elapsed`, con `total_elapsed = now - medianoche local`: el denominador incluye las horas de gimnasio cerrado (00:00-07:00), así que el promedio queda subestimado. |
| Backend API | `backend/apps/access/views.py:264-278`, `urls.py:11` | `GET /api/access/stats/` (`IsReceptionistOrAdmin`, cache 30 s). Sin parámetros de fecha. |
| Backend reporte | `backend/apps/reports/services.py:141-201`, `views.py:66-86` | `GET /api/reportes/asistencia/` exporta ENTRY pareada con su EXIT y `permanencia_minutos` (CSV/XLSX/PDF) pero **no agrega** (sin curva por hora, sin pico, sin promedio). El pareo es O(n·m) (doble loop) y no escala a meses. |
| Backend modelo | `backend/apps/access/models.py:40-56` | `timestamp` (`db_index=True`), `access_type`, `status`. Suficiente para agregar; sin índice compuesto. |
| Frontend monitor | `frontend/src/pages/recepcion/AforoMonitorPage.jsx:92-98`, `components/recepcion/AforoStatBar.jsx:3-31` | 4 tarjetas de "hoy" (props `promedioHoy, picoMaximo, picoHora, ingresoUltimaHora, egresoUltimaHora`). |
| Frontend reportes | `frontend/src/pages/recepcion/ReportesPage.jsx:130-150`, `components/recepcion/AsistenciaSemanalCard.jsx:4-70` | "Asistencia semanal" = barras CSS (`flex` + `height: %`), alimentadas hoy con 10 logs (bug de BK-ACC-05). |
| Frontend libs | `frontend/package.json` | **No hay librería de gráficos** (sin recharts/chart.js/d3): las "charts" son divs/SVG a mano (`EvolucionIngresosCard` usa un `path` SVG con datos de relleno). |

## 4. Alcance
**Incluye:** endpoint de serie histórica agregada (por hora y por día) con pico y permanencia promedio; heatmap día-de-semana × hora; vista "Histórico" en el Monitor de Aforo (o pestaña en Reportes) con selector de rango; corrección del promedio de hoy.
**No incluye:** predicción/ML, comparativas contra clases, alertas (BK-ACC-06), exportación nueva (reusar `/reportes/asistencia/`).

## 5. Contrato de API (propuesta)
**[A CREAR] `GET /api/access/stats/historico/`** — `IsReceptionistOrAdmin` (nueva `AforoHistoricoView` en `views.py`, ruta `path('stats/historico/', ...)` en `urls.py`).
- Query: `desde` (YYYY-MM-DD, default hoy−6), `hasta` (YYYY-MM-DD, default hoy), `granularidad` = `hora` | `dia` (default `dia`). Validar `hasta - desde <= 92 días` → 400 `{"detail": "El rango máximo es de 92 días."}`; `desde > hasta` → 400.
- Response 200:
```json
{
  "desde": "2026-10-07", "hasta": "2026-10-13", "granularidad": "dia",
  "puntos": [
    { "bucket": "2026-10-13", "ingresos": 142, "egresos": 139, "ocupacion_pico": 61, "hora_pico": "19:05", "permanencia_promedio_min": 74 }
  ],
  "resumen": { "ingresos_total": 987, "pico_maximo": 88, "hora_pico_frecuente": "19:00", "permanencia_promedio_min": 71 },
  "heatmap": [ { "dia_semana": 0, "hora": 18, "ingresos_promedio": 23.4 } ]
}
```
  (`granularidad=hora`: `bucket` = ISO con hora local, y `heatmap` se omite si el rango es de un solo día.) Zona horaria: `America/Argentina/Buenos_Aires` (`base.py:121`, `USE_TZ=True`).
- Implementación sugerida: agregar con `TruncDate`/`TruncHour(tzinfo=...)` + `Count(filter=Q(access_type=...))` para ingresos/egresos; ocupación pico por día con una pasada ordenada en Python (o ventana SQL `Sum(Case(ENTRY=+1, EXIT=-1)) OVER (PARTITION BY fecha ORDER BY timestamp)` y `Max`); permanencia: parear por usuario ordenando una sola vez (O(n)), idéntica regla que `build_asistencia`. Cachear en Redis por `(desde,hasta,granularidad)`: TTL largo (24 h) si `hasta < hoy`, 60 s si incluye hoy.
- Fix de `compute_aforo_stats`: calcular `total_elapsed` desde `max(day_start, hora_apertura local)` (o desde el primer evento) en lugar de medianoche.

## 6. Modelo de datos
Sin tablas nuevas. Índice compuesto recomendado: `models.Index(fields=['status', 'access_type', 'timestamp'])` (migración en `apps/access/migrations/`, siguiente número libre tras `0003_...`). Opcional futuro: tabla de agregados diarios `AforoDiario(fecha, ingresos, pico, ...)` poblada por tarea nocturna si el volumen lo exige (decisión abierta).

## 7. Diseño frontend
- **Ubicación:** nueva pestaña "Histórico" en `AforoMonitorPage.jsx` (estado `useState('hoy'|'historico')`, mismos botones de pestaña que `GestionSociosPage.jsx` con `role="tablist"`), para no agregar ruta. Misma guard (`/recepcion/aforo`, `App.jsx:122`).
- **Hook:** `useAforoHistorico({ desde, hasta, granularidad })` en `frontend/src/hooks/queries/useDashboardData.js` (junto a `useAforoStats`, línea 82): `queryKey: ['aforoHistorico', desde, hasta, granularidad]`, `staleTime: 60_000`, `retry: 1`.
- **Componentes (nuevos, en `components/recepcion/`):** `AforoRangeSelector` (presets Hoy / 7 días / 30 días / Mes + inputs `date`, mismo estilo de presets que `ReportFilters.jsx:270-300`), `AforoOcupacionChart` (SVG propio: barras de ingresos y línea de pico; tokens de color `success-500`/`primary`; con `role="img"` y `aria-label` resumiendo el pico), `AforoHeatmap` (grilla 7×24 con intensidad por `ingresos_promedio`, tooltip nativo `title`), `AforoResumenCards` (reutilizar `Card`; estilo de `AforoStatBar`).
- **Decisión de librería:** recomendado seguir sin dependencia (SVG manual) mientras sean 3 gráficos simples; si se quiere más, agregar `recharts` (decisión abierta, afecta bundle/`vite` y cobertura).
- **Estados:** loading → `Skeleton` de gráfico (`h-64`); vacío "Todavía no hay movimientos en este período."; error → `EmptyState` + "Reintentar"; rango inválido (>92 días) → mensaje inline bajo los inputs.
- **Textos (voseo):** "Histórico de aforo", "Elegí el período", "Hora pico", "Permanencia promedio: 1 h 14 min", "Ingresos por hora".
- **Responsive:** a 375 px los gráficos ocupan todo el ancho con scroll horizontal en el heatmap (`overflow-x-auto`), tarjetas en 2 columnas; a 768 px 2 gráficos por fila.

## 8. Archivos a crear / modificar
Backend: `apps/access/{services,views,urls}.py` (+ `AforoHistoricoQuerySerializer` para validar `desde/hasta/granularidad`), migración de índice, tests `apps/access/tests/test_aforo_historico.py` y corrección en `test_services.py`.
Frontend: `AforoMonitorPage.jsx`, `useDashboardData.js`, 4 componentes nuevos + tests, `AforoMonitorPage.test.jsx` (hoy mockea `useAforoStats`/`useAccessLogs`, líneas 10-17).

## 9. Plan de pruebas (TDD)
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

## 10. Criterios de aceptación
- **Dado** 7 días con movimientos, **cuando** el administrador elige "Últimos 7 días", **entonces** ve ingresos por día, pico de ocupación con su hora y permanencia promedio.
- **Dado** el heatmap, **cuando** se mira, **entonces** se identifica la franja con más ingresos (p. ej. lunes 19 h) sin exportar nada.
- **Dado** un rango de más de 92 días, **cuando** se intenta consultar, **entonces** se muestra un error claro y no se ejecuta la consulta pesada.

## 11. Riesgos y decisiones abiertas
- Fuente del pico/permanencia depende de que las salidas se registren (BK-ACC-01/07); sin salidas los números de ocupación son inútiles. Recomendación: implementar luego de 01 y 07, o mostrar un aviso de "calidad de datos" (porcentaje de ingresos con salida).
- ¿Librería de gráficos? Recomendación: SVG propio por ahora.
- ¿Roles? Recepción ya ve estadísticas de hoy; recomendación: histórico solo para administración (`IsAdminOnly`) si se considera dato de negocio.
- Rendimiento: agregación sobre `AccessLog` crece linealmente; si supera ~1 M filas, pasar a tabla de agregados diarios.

## 12. Referencias
- `docs/reports/rnf01-rnf06.md` (métricas del módulo), `docs/database/mer.md` (modelo), `backend/apps/reports/services.py` (pareo ENTRY/EXIT).
- Figma (opcional): "vistas live" → Recepción → Aforo / Reportes.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1 + DRF + PostgreSQL; React 18 + Vite + TanStack Query v5 + Vitest, sin librería de gráficos). Implementá docs/backlog/items/BK-ACC-08-analitica-historica-de-aforo.md.
TDD backend primero: backend/apps/access/tests/test_aforo_historico.py (APITestCase; logs con timestamp retrocedido vía .update()) para GET /api/access/stats/historico/?desde&hasta&granularidad=hora|dia con el JSON de la sección 5, validaciones (rango máx 92 días), solo GRANTED, hora local America/Argentina/Buenos_Aires, permisos IsReceptionistOrAdmin (socio 403, anónimo 401). Después implementá la vista en apps/access/views.py + ruta en urls.py, agregación con TruncDate/TruncHour y pareo ENTRY/EXIT O(n) por usuario, cache Redis por rango, y arreglá el denominador de promedioHoy en services.compute_aforo_stats (desde hora_apertura).
Frontend: tests RTL primero; hook useAforoHistorico en hooks/queries/useDashboardData.js; componentes AforoRangeSelector, AforoOcupacionChart (SVG accesible con role="img"), AforoHeatmap, AforoResumenCards en components/recepcion/; pestaña "Histórico" en pages/recepcion/AforoMonitorPage.jsx. Textos en español rioplatense (voseo); código en inglés.
No toques backend/loadtests ni hooks/useScreenWakeLock.js. Terminado: pytest -q (cov>=80 %) y `npx vitest run --coverage && npm run lint` verdes.
```
