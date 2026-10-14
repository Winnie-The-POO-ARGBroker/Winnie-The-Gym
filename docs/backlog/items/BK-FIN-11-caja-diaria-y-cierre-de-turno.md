---
id: BK-FIN-11
titulo: Caja diaria y cierre de turno para cobros manuales (idea a validar)
tipo: idea
roles: [administrador, recepcionista]
prioridad: P3
tamano: L
estado_en_codigo: solo-idea
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-FIN-09, BK-FIN-04]
---

# BK-FIN-11 · Caja diaria y cierre de turno

## 1. Resumen
No hay ningún rastro de "caja" en el código, la documentación ni los specs: recepción cobra en efectivo/transferencia (`CobroManualPage`) pero no existe forma de ver cuánto cobró cada operador en el día por medio de pago, ni de cerrar el turno comparando lo esperado con lo contado. Es una **idea a validar** con el dueño: depende de que los cobros manuales registren operador y medio (BK-FIN-09).

## 2. Objetivo de usuario
Como **recepcionista** quiero **ver y cerrar mi caja del día (efectivo, transferencias, tarjetas)** para **rendir lo cobrado sin diferencias**; como **administrador** quiero **auditar cierres y diferencias por operador** para **controlar el efectivo**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Búsqueda | `rg -i "caja" backend frontend/src docs speckit openspec README.md CHANGELOG.md` | **Sin resultados** relevantes (solo falsos positivos como "encaja"). No existe modelo, endpoint, pantalla ni spec de caja o cierre. |
| Backend cobro | `backend/apps/payments/services.py:149-189` | Un cobro manual guarda `actor_id` solo dentro de `raw_webhook` (`:160-166`); no hay columna de operador ni de medio (ver BK-FIN-09). Sin eso la caja por operador y por medio no se puede calcular de forma confiable. |
| Backend listado | `backend/apps/payments/filters.py:6-19` | `PagoFilter` filtra por estado, método (`mercado_pago`/`manual`), fechas (`created_at`), monto, socio, plan: **no** por operador ni por medio. |
| Backend reportes | `backend/apps/reports/services.py:67-102` | Facturación mensual por `paid_at`, sin desglose por operador/medio ni turnos. |
| Frontend | `frontend/src/pages/recepcion/CobroManualPage.jsx:150-152`, `Sidebar.jsx:24,37` | Solo alta de cobros; sin resumen del día. |
| Dashboard | `frontend/src/components/dashboard/views/RecepcionistaDashboardView.jsx` | No muestra totales de cobros: solo usa `useAccessLogs`, `useAforoStats`, `useWebSocket` y `useGymConfig` (`RecepcionistaDashboardView.jsx:4-13`); las métricas de `AdminDashboardView.jsx:24-26` también son de aforo. |

## 4. Alcance
**Incluye (propuesta):**
- Resumen de caja por día y operador: cantidad y total de cobros manuales por `medio_manual`, total de anulaciones.
- Cierre de turno: el operador declara lo contado en efectivo, el sistema calcula la diferencia y deja registro inmutable.
- Pantalla "Caja" para recepcionista (su caja) y administrador (todas, con diferencias).
- Exporte del cierre (reutilizando `apps/reports/exporters.py`).

**No incluye:** conciliación bancaria, arqueos con denominaciones de billetes, múltiples cajas/sedes, integración con controlador fiscal, pagos de MercadoPago (no pasan por caja física).

## 5. Contrato de API (propuesta)
Todos **[A CREAR]**, bajo `apps/payments` (`/api/payments/caja/`).
- `GET /api/payments/caja/?fecha=YYYY-MM-DD&operador=<user_id>` — `IsReceptionistOrAdmin`; la recepcionista solo ve su propio `operador` (si pasa otro: `403`). Response `200`:
```json
{ "fecha": "2026-10-13", "operador_id": 7, "operador_nombre": "Laura Pérez",
  "cobros": { "cantidad": 14, "total": "168000.00" },
  "por_medio": { "efectivo": "96000.00", "transferencia": "48000.00", "debito": "24000.00", "credito": "0.00", "otro": "0.00" },
  "anulaciones": { "cantidad": 1, "total": "12000.00" },
  "cierre": null }
```
Cálculo: `Pago` con `metodo='manual'`, `estado='aprobado'`, `cobrado_por=operador` y `paid_at` dentro del día local ART (`America/Argentina/Buenos_Aires`, `base.py:121`); anulaciones por `anulado_en`.
- `POST /api/payments/caja/cierre/` — `IsReceptionistOrAdmin`, body `{ "fecha": "2026-10-13", "efectivo_contado": "95500.00", "observacion": "Faltan 500 por vuelto" }`. Response `201` con el cierre `{id, fecha, operador, efectivo_esperado, efectivo_contado, diferencia, observacion, cerrado_en}`. Reglas: un cierre por operador y día (`400` si ya existe); una vez cerrado, los cobros del día de ese operador no pueden anularse (decisión 3).
- `GET /api/payments/caja/cierres/?fecha_desde&fecha_hasta&operador` — solo `IsAdminOnly`, paginado.

## 6. Modelo de datos (propuesta)
Nuevo modelo `payments.CierreCaja`: `fecha` (DateField), `operador` (FK `users.User`, PROTECT), `efectivo_esperado`, `efectivo_contado`, `diferencia` (Decimal 10,2), `observacion` (CharField 200), `cerrado_en` (auto_now_add); `UniqueConstraint(fields=['fecha','operador'])`. Requiere previamente `Pago.cobrado_por` y `Pago.medio_manual` (BK-FIN-09).

## 7. Diseño frontend (propuesta)
- **Ruta:** `/recepcion/caja` con `<ProtectedRoute roles={['administrador','recepcionista']}>` (patrón `App.jsx:122-127`); entrada "Caja" en `Sidebar.jsx` para ambos roles.
- **Página:** `frontend/src/pages/recepcion/CajaDiariaPage.jsx` con `AppLayout` + `TopBar`, selector de fecha (por defecto hoy), tarjetas de totales por medio (`Card`), tabla de cobros del día (`DataTable`, columnas hora, socio, plan, medio, monto, estado), botón "Cerrar caja" que abre `Modal` con input de efectivo contado y la diferencia calculada en vivo.
- **Hooks:** `useCajaDiaria(params)` y `useCerrarCaja()` (`hooks/queries/usePagos.js`, key `['pagos','caja', params]`).
- **Estados:** loading (skeleton), vacío ("Todavía no hay cobros en este día"), error (toast), éxito ("Caja cerrada. Diferencia: $0").
- **Textos (voseo):** "Caja del día", "Efectivo contado", "Diferencia", "Cerrar caja", "Una vez cerrada no podés modificar los cobros de este día."
- **Responsive:** 375 px: tarjetas apiladas y lista de cobros como tarjetas; el cierre es un bottom sheet (`Modal`).

## 8. Archivos a crear / modificar (propuesta)
Backend: `payments/models.py` (`CierreCaja`) + migración, `payments/services.py` (`resumen_caja`, `cerrar_caja`), `payments/views.py`/`urls.py` (vistas de caja), `payments/serializers.py`, `payments/tests/test_caja.py`. Frontend: `CajaDiariaPage.jsx`, hooks, `pagosService.js`, `App.jsx`, `Sidebar.jsx`, tests.

## 9. Plan de pruebas (TDD)
**Backend** (`cd backend && pytest -q apps/payments/tests/test_caja.py`; `APITestCase` + `RefreshToken`, factories `conftest.py:23-75`):
1. Resumen suma solo cobros manuales aprobados del operador y del día (hora ART, borde 23:59/00:00), agrupa por medio, descuenta anulados.
2. Recepcionista no puede consultar la caja de otro operador (`403`); admin sí.
3. Cierre: calcula `diferencia = contado - esperado`; segundo cierre del mismo día/operador -> `400`.
4. Después del cierre, anular un cobro de ese día/operador -> `400`/`409` según decisión 3.
5. `socio` -> `403`.
**Frontend** (`npx vitest run src/pages/recepcion`): render del resumen, cambio de fecha, modal de cierre con diferencia en vivo, errores; guard de ruta.
**Manual:** `recepcion@winnie.local` registra cobros con distintos medios, cierra caja; `admin@winnie.local` ve el cierre y la diferencia.

## 10. Criterios de aceptación
- **Dado** 3 cobros (2 efectivo, 1 transferencia) del día **cuando** abro Caja **entonces** veo el total por medio.
- **Dado** efectivo contado distinto al esperado **cuando** cierro **entonces** el sistema guarda la diferencia y no me deja cerrar dos veces.
- **Dado** que soy recepcionista **cuando** pido la caja de otra persona **entonces** no puedo.

## 11. Riesgos y decisiones abiertas
1. **Validar necesidad:** ¿el gimnasio cobra efectivo en recepción en volumen suficiente? Si casi todo es MercadoPago, no vale el costo (L). Recomendación: validar con el dueño antes de construir; mientras tanto basta el filtro por operador/medio de BK-FIN-04/09.
2. ¿Un turno = un día calendario o hay turnos mañana/tarde por operador? Recomendación: por día y operador en v1.
3. Tras el cierre, ¿se bloquean anulaciones? Recomendación: sí, solo admin puede reabrir.
4. ¿Se contabilizan transferencias/tarjetas en el cierre o solo efectivo? Recomendación: cierre solo de efectivo, resto informativo.
5. Dependencia fuerte de BK-FIN-09 (operador y medio hoy no son columnas).

## 12. Referencias
- Sin specs previos. Relacionado: `docs/architecture.md:113-126` (flujo de pagos), `backend/apps/payments/services.py:149-189` (cobro manual, "riesgo #3 del PDF").
- Figma (solo apoyo visual opcional): no hay pantalla equivalente conocida en `WuBKhksfVVcBjNKbDVX5EM`.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym. NO empezar sin confirmar con el dueño que se quiere caja diaria (idea P3) y sin que BK-FIN-09 esté implementado (Pago.cobrado_por y Pago.medio_manual). TDD estricto. Implementá docs/backlog/items/BK-FIN-11-caja-diaria-y-cierre-de-turno.md.

Backend (backend/apps/payments): modelo CierreCaja (fecha, operador FK users.User PROTECT, efectivo_esperado, efectivo_contado, diferencia, observacion CharField 200, cerrado_en; UniqueConstraint fecha+operador) + migración; services.resumen_caja(fecha, operador) (Pago metodo='manual', estado='aprobado', cobrado_por=operador, paid_at en el día local America/Argentina/Buenos_Aires; por_medio; anulaciones por anulado_en) y services.cerrar_caja(...); endpoints GET /api/payments/caja/ (IsReceptionistOrAdmin; recepcionista solo su operador), POST /api/payments/caja/cierre/ (400 si ya existe), GET /api/payments/caja/cierres/ (IsAdminOnly, paginado).
Frontend: pages/recepcion/CajaDiariaPage.jsx (AppLayout, TopBar, Card, DataTable, Modal de cierre con diferencia en vivo), hooks useCajaDiaria/useCerrarCaja en hooks/queries/usePagos.js, pagosService, ruta /recepcion/caja con ProtectedRoute roles administrador y recepcionista, ítem en Sidebar.jsx.
Tests primero: backend test_caja.py (borde de día ART, 403 por operador ajeno, doble cierre 400, anulados descontados) y vitest con renderWithProviders.
Terminado cuando `cd backend && pytest -q` (cov>=80) y `cd frontend && npm run lint && npx vitest run --coverage && npm run build` pasan. Textos UI en español rioplatense. Sin commits.
```
