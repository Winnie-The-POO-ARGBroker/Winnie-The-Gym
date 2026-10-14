---
id: BK-BUG-08
titulo: Datos inventados en la UI: "Sede Central" en la credencial, gráfico de ingresos con curva fija, formulario de clases pre-llenado y placeholders de rol
tipo: bug
roles: [administrador, recepcionista, socio]
prioridad: P2
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-BUG-06]
---

# BK-BUG-08 · Datos hardcodeados que parecen reales

## 1. Resumen
Hay valores fijos en pantalla que el usuario interpreta como datos reales: la credencial dice "Sede Habilitada: Sede Central" para todos (el modelo no tiene sedes); el gráfico "Evolución de ingresos" dibuja siempre la misma curva; el formulario "Crear clase" arranca con "Funcional Intensivo / Carlos R. / Sala A…" y planes `['Premium','Gold']` (si el admin no los edita, se publican); la credencial muestra "Vista de Administrador" como estado vacío. Se agrupan acá porque comparten solución (leer del backend u ocultar). Los hardcodes de planes están en BK-BUG-06 y los del alta en recepción en BK-BUG-02.

## 2. Objetivo de usuario
Como **usuario** quiero **ver solo información real o una indicación clara de que falta** para **no tomar decisiones con datos de ejemplo**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/members/models.py:19-28` y `backend/apps/memberships/models.py:8-16` | No existe ningún concepto de sede/sucursal en `Socio`, `PlanMembresia` ni `Membresia` (verificado con `rg -i sede` en `backend/`: solo aparece el nombre de un plan en `backend/seed_data.py:15`, "Pase Libre - Sede Central"; no hay campo ni modelo de sedes) |
| Frontend credencial | `frontend/src/pages/socio/CredencialDigitalPage.jsx:45-59,178-185` | `sedeHabitual: 'Sede Central'` fijo en el mapeo; se muestra en la tarjeta "Sede Habilitada" |
| Frontend credencial | `frontend/src/pages/socio/CredencialDigitalPage.jsx:117-127` | Sin `member`: título "Vista de Administrador" / mensaje "Las credenciales digitales son exclusivas para los socios." (solo admin llega: `App.jsx:130`) y "Iniciá sesión para ver tu credencial digital." para cualquier otro caso (el usuario ya está logueado) |
| Frontend credencial (relacionado) | `frontend/src/pages/socio/CredencialDigitalPage.jsx:92-107` | El temporizador llama `refreshQR(false)` **dentro** del updater de `setTimeLeft` (efecto secundario en un updater: en `StrictMode` se ejecuta dos veces → doble `GET /access/qr/generate/` cada 30 s en dev) |
| Frontend reportes | `frontend/src/hooks/queries/useReportes.js:107-108` | `chartPath: 'M 0,70 L 60,65 L 130,50 L 200,60 L 270,40 L 340,45 L 400,25'` con comentario `TODO: compute real chart points from ingresos data — placeholder until backend endpoint exists` |
| Frontend reportes | `frontend/src/pages/recepcion/ReportesPage.jsx:15-27,143-146` | `DEFAULT_METRICS` (`chartPath` fijo, `asistenciaBars: [10,10,…]`) y `EvolucionIngresosCard chartPoints={metrics.chartPath}` |
| Frontend reportes | `frontend/src/components/recepcion/EvolucionIngresosCard.jsx:39-49` | Dibuja el `path d={chartPoints}` tal cual |
| Frontend dashboard | `frontend/src/hooks/queries/useDashboardData.js:34,72` | `TODO` pendientes: morosos = membresías vencidas "hasta que backend soporte"; `TODO (TICKET-123)`: trae toda la grilla de clases |
| Frontend crear clase | `frontend/src/pages/CreateClassPage.jsx:23-39` | `formData` inicial: nombre 'Funcional Intensivo', descripcion 'Entrenamiento funcional de alta intensidad…', dia 'Lunes', hora '08:00', sala 'Sala A', instructor 'Carlos R.', `dias_recurrencia ['L','X','V']`, `planes_habilitados ['Premium','Gold']` |
| Frontend crear clase | `frontend/src/pages/CreateClassPage.jsx:81-113,391-405` | El payload es `{...formData}` completo (incluye `cupos_reservados`, `id` al editar, `recurrencia` generado); lista de planes **fija** `['Básico','Premium','Gold']` (no consulta `/memberships/planes/`); `planes_habilitados` guarda nombres de plan |
| Frontend crear clase | `frontend/src/pages/CreateClassPage.jsx:13,506-517` | Botón "Copiar de clase existente" solo si `import.meta.env.DEV` (copia la primera de la lista) |
| Backend clases | `backend/apps/classes/models.py:32-44` | `instructor = CharField(max_length=120, default='')`, `sala = CharField(default='Sala A')`, `planes_habilitados = JSONField(default=list)`, `recurrencia`/`dias_recurrencia` |
| Frontend api | `frontend/src/services/api.js:91-94` | Rama de tokens `mock-`: ningún código del repo genera tokens `mock-` (`rg "mock-"` solo devuelve este uso) → código muerto (ver BK-BUG-10) |

## 4. Alcance
**Incluye:** quitar "Sede Central" (ocultar la tarjeta o mostrar el nombre del gimnasio desde configuración si existe); calcular `chartPath` a partir de datos reales o ocultar el gráfico cuando no haya serie; estado vacío explícito ("Sin datos de ingresos aún"); formulario de clases con valores iniciales vacíos y validación (nombre, día, hora, cupo obligatorios) y planes habilitados leídos de la API; textos de estado vacío de la credencial correctos por rol; mover `refreshQR` fuera del updater.
**No incluye:** modelo de sedes/multisede (feature nueva, no pedida por el código), nuevo endpoint de ingresos por mes (propuesta en 5), rediseño de reportes (BK-FIN-xx).

## 5. Contrato de API
**[EXISTE]** `GET /api/memberships/planes/` (fuente de planes para `planes_habilitados`); `GET /api/access/qr/generate/` (`GenerateQRView`, `IsAuthenticated`, `access/views.py:36-47`).
**[A CREAR — propuesta, opcional]** `GET /api/reportes/ingresos-mensuales/?meses=6` → `[{"mes":"2026-05","total":"123456.00"}, ...]` (solo `IsReceptionistOrAdmin`) para alimentar el gráfico. Ya existe `FacturacionReportView` en `backend/apps/reports/views.py:42` (exporta facturación; no revisado si devuelve serie mensual): reutilizarla si sirve.

## 6. Modelo de datos
Sin cambios para el alcance mínimo. (Multisede: no hay rastro en el backend; ver 11.1.)

## 7. Diseño frontend
- **`CredencialDigitalPage.jsx`:** eliminar `sedeHabitual` y la `Card` de "Sede Habilitada", dejando solo el plan (o mover "Plan" a `MemberPlanDetails`). En el estado sin `member`: administrador → "Esta vista es para socios" con botón "Ir al dashboard"; otro caso → `EmptyState` de error con "Reintentar" (usar `isError` de `useSocioMembresiaMe`). Temporizador: usar `useEffect` con un `setInterval` que decrementa y otro `useEffect` que dispare `refreshQR` cuando `timeLeft === 0`.
- **`useReportes.js`/`ReportesPage.jsx`:** generar los puntos del `path` a partir de una serie (normalizar a `viewBox 0 0 400 100`); si no hay serie, `chartPath = null` y `EvolucionIngresosCard` muestra "Sin datos de ingresos aún". Quitar los `[10,10,10,…]` de `DEFAULT_METRICS` cuando no haya datos.
- **`CreateClassPage.jsx`:** estado inicial con strings vacíos, `dias_recurrencia: []`, `planes_habilitados: []`, `cupo_maximo: ''`; enviar solo campos del serializer (`nombre, categoria, descripcion, dia, hora, duracion_min, sala, instructor, cupo_maximo, lista_espera_max, cancelacion_horas, planes_habilitados, recurrencia, dias_recurrencia`); planes desde `usePlanesQuery()` (`hooks/queries/usePlanesAdmin.js`); validar con zod + react-hook-form (ya instalados; patrón en `ProfilePage.jsx:18-22`).
- **Estados:** loading skeleton, vacío ("Sin datos…"), error (toast + EmptyState), éxito (toast existente de `useClasesMutations`).
- **Textos:** "Sin datos de ingresos aún", "Esta vista es para socios", "Completá el nombre de la clase".
- **Responsive:** sin cambios; verificar a 375 px que `CredencialDigitalPage` (frame `sm:max-w-sm`) no pierda la tarjeta de plan.

## 8. Archivos a crear / modificar
- `frontend/src/pages/socio/CredencialDigitalPage.jsx`, `frontend/src/hooks/queries/useReportes.js`, `frontend/src/pages/recepcion/ReportesPage.jsx`, `frontend/src/components/recepcion/EvolucionIngresosCard.jsx`, `frontend/src/pages/CreateClassPage.jsx`.
- Tests: `frontend/src/pages/CreateClassPage.test.jsx`, `CreateClassPage.handlers.test.jsx`, `frontend/src/pages/socio/CredencialDigitalPage.test.jsx`, `frontend/src/hooks/queries/useReportes.test.jsx`. Backend solo si se crea el endpoint de ingresos.

## 9. Plan de pruebas (TDD)
Frontend (vitest + RTL, `renderWithProviders`): credencial no contiene el texto "Sede Central"; admin sin membresía ve "Esta vista es para socios"; con fake timers el `GET /access/qr/generate/` se llama **una vez** por ciclo de 30 s también bajo `<StrictMode>`; `CreateClassPage` arranca con campos vacíos, el submit con campos vacíos no llama a `createClase`, y el payload no incluye `cupos_reservados`/`id`; `EvolucionIngresosCard` con `chartPoints=null` muestra el estado vacío; `buildChartPath([])` devuelve `null`. `cd frontend && npx vitest run src/pages src/hooks`; `npm run lint`.
Manual: `socio.activo@winnie.local` en `/socio/credencial`; `admin@winnie.local` en `/admin/clases/crear` y `/recepcion/reportes` (con y sin pagos cargados).

## 10. Criterios de aceptación
- **Dado** cualquier socio **entonces** la credencial no muestra una sede inventada.
- **Dado** que no hay ingresos registrados **entonces** el gráfico muestra un estado vacío, no una curva.
- **Dado** `/admin/clases/crear` **entonces** ningún campo viene precargado con datos de ejemplo y no se puede publicar sin los obligatorios.
- **Dado** la credencial en desarrollo (StrictMode) **entonces** se hace una sola petición de QR por ciclo.

## 11. Riesgos y decisiones abiertas
1. ¿El gimnasio tendrá varias sedes? Hoy no hay modelo; recomendación: ocultar y, si llega la necesidad, abrir una feature (`Sede` + FK) en otra ficha.
2. ¿Los planes habilitados de una clase se guardan por nombre o por id? Hoy por nombre (`JSONField`), frágil si se renombra un plan; recomendación: migrar a ids en una ficha de clases (BK-CLS-xx).
3. ¿`FacturacionReportView` puede devolver la serie mensual? (no verificado).

## 12. Referencias
`docs/reports/rnf01-rnf06.md`; Figma (opcional): "vistas live", Socio → Credencial y Recepción → Reportes. Relacionados: BK-BUG-02, BK-BUG-06, BK-CLS-xx, BK-FIN-xx.

## 13. Prompt listo para un agente de IA
> Repo Winnie The Gym. Eliminá datos inventados de la UI: (1) `frontend/src/pages/socio/CredencialDigitalPage.jsx`: sacar `sedeHabitual: 'Sede Central'` y la card "Sede Habilitada"; corregir el estado vacío ("Vista de Administrador" → mensaje correcto por rol, `isError` con "Reintentar"); y sacar la llamada `refreshQR` del updater de `setTimeLeft` (l.92-107) para que no se duplique bajo StrictMode. (2) `frontend/src/hooks/queries/useReportes.js:107`: reemplazar el `chartPath` fijo por uno calculado desde datos reales o `null`, y hacer que `EvolucionIngresosCard` muestre "Sin datos de ingresos aún". (3) `frontend/src/pages/CreateClassPage.jsx`: estado inicial vacío, validación con zod + react-hook-form, planes desde `usePlanesQuery()`, payload solo con campos del `ClaseSerializer`. TDD primero: tests en `frontend/src/pages/CreateClassPage.test.jsx`, de la credencial (fake timers + StrictMode) y de `EvolucionIngresosCard`. No inventes campos de backend ni sedes. UI en español rioplatense. Terminado cuando `cd frontend && npx vitest run && npm run lint` pasan. Sin commits.
