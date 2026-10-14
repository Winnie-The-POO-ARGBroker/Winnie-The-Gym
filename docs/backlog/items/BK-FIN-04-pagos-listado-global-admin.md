---
id: BK-FIN-04
titulo: Pantalla "Pagos y facturación" (listado global con filtros, totales y exporte)
tipo: feature
roles: [administrador, recepcionista]
prioridad: P1
tamano: L
estado_en_codigo: backend-sin-ui
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-FIN-05, BK-FIN-02]
---

# BK-FIN-04 · Pagos y facturación: listado global para staff

## 1. Resumen
El backend ya expone `GET /api/payments/pagos/` (listado global con filtros por estado, método, socio, plan, fechas y monto), pero ninguna pantalla lo usa como listado: solo se consume por socio dentro de la ficha y en la página de cobro manual. Falta una pantalla de administración para auditar todos los cobros, ver totales y exportar, además de pequeños cambios de backend (búsqueda, tamaño de página, totales, N+1).

## 2. Objetivo de usuario
Como **administrador/recepcionista** quiero **ver todos los pagos filtrando por estado, método, fecha y socio, con totales y exporte** para **conciliar la caja, detectar pagos pendientes o rechazados y atender reclamos**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend vista | `backend/apps/payments/views.py:30-44` | `PagoViewSet` (`ListModelMixin`+`RetrieveModelMixin`+`GenericViewSet`), `queryset = Pago.objects.all()` **sin `select_related`**; `get_permissions` devuelve `IsReceptionistOrAdmin` salvo `mis_pagos` (`IsSocio`). `ordering_fields = ['created_at','monto','estado']`, `ordering = ['-created_at']`. |
| Backend filtro | `backend/apps/payments/filters.py:6-19` | `PagoFilter`: `fecha_desde`/`fecha_hasta` (sobre `created_at`, `date__gte/lte`), `monto_min`, `monto_max`, `estado` (`exact`,`in`), `metodo` (`exact`,`in`), `socio` (`exact`), `plan` (`exact`). Nótese que filtra por fecha de creación, no por `paid_at`. |
| Backend búsqueda | `backend/apps/payments/views.py:34-39` | No define `search_fields`; `SearchFilter` está en los backends globales (`base.py:183-187`) pero sin campos, por lo que `?search=` no hace nada. |
| Backend paginación | `backend/core/settings/base.py:181-182` | `PageNumberPagination`, 10 por página, sin `page_size`. |
| Backend serializer | `backend/apps/payments/serializers.py:8-33` | `PagoSerializer` (todo read-only): `id, socio, socio_nombre (source 'socio.__str__' = "Nombre Apellido", members/models.py:46-47), plan, plan_nombre, membresia, monto, moneda, metodo, estado, mp_preference_id, mp_payment_id, mp_external_reference, mp_status_detail, paid_at, created_at, updated_at`. No expone DNI, quién cobró, observación ni comprobante; `raw_webhook` queda afuera a propósito. |
| Backend modelo | `backend/apps/payments/models.py:7-63` | Estados `pendiente/aprobado/rechazado/cancelado/reembolsado` y métodos `mercado_pago/manual`. |
| Backend admin | `backend/apps/payments/admin.py:6-11` | `PagoAdmin` (Django admin) con `list_filter` y búsqueda: es la única vista global hoy (no apta para recepción). |
| Frontend servicio | `frontend/src/services/pagosService.js:38-46` | `listarPagos(params)` -> `GET /payments/pagos/` ya existe. |
| Frontend usos | `frontend/src/components/pagos/HistorialPagosCard.jsx:57`, `frontend/src/hooks/queries/usePagos.js:13-24` | Solo listado por socio (con bug de filtro, ver BK-FIN-05). |
| Frontend rutas | `frontend/src/App.jsx:122-127` | No existe ruta de pagos para staff; solo `/recepcion/cobros` (alta de cobro manual). Sidebar admin y recepcionista no tienen "Pagos" (`frontend/src/components/layout/Sidebar.jsx:13-39`). |
| Frontend UI base | `frontend/src/components/ui/DataTable.jsx`, `Pagination.jsx`, `FilterPanel.jsx`, `SearchBar.jsx`, `Badge.jsx` | Componentes reutilizables; `Badge` solo conoce `success/danger/warning/live` (`Badge.jsx:3-12`). |
| Reportes | `backend/apps/reports/views.py:42-63` | Exporte de facturación mensual existente; sin filtro por socio ni por estado (BK-FIN-02). |

## 4. Alcance
**Incluye:**
- Backend: `select_related`, `search_fields`, paginación con `page_size`, serializer enriquecido (DNI, N° de socio), endpoint de totales con los mismos filtros, filtro de fecha por `paid_at` opcional.
- Pantalla `/admin/pagos` (y alias `/recepcion/pagos`) con filtros, tabla, totales, detalle en modal y exporte reutilizando BK-FIN-02.
- Entrada de menú "Pagos" para administrador y recepcionista.

**No incluye:** anulación/corrección de pagos (BK-FIN-09), comprobantes PDF (BK-FIN-10), reembolsos vía API de MercadoPago (BK-FIN-08), caja diaria (BK-FIN-11).

## 5. Contrato de API
**[EXISTE → MODIFICAR]** `GET /api/payments/pagos/` — `IsReceptionistOrAdmin` (`views.py:41-44`).
- Params existentes: `estado`, `estado__in` (csv), `metodo`, `metodo__in`, `socio`, `plan`, `fecha_desde`, `fecha_hasta`, `monto_min`, `monto_max`, `ordering`, `page`.
- **[A CREAR]** `search` (`socio__nombre`, `socio__apellido`, `socio__dni`, `mp_payment_id`, `mp_external_reference`), `page_size` (default 20, máx 100; clase `PagoPagination` análoga a `SocioPagination`, `backend/apps/members/views.py:20-22`), `paid_desde`/`paid_hasta` (sobre `paid_at`).
- Response `200`: `{count, next, previous, results:[PagoSerializer]}`; **[A CREAR]** campos adicionales de solo lectura: `socio_dni` (`source='socio.dni'`), `numero_socio` (`source='socio.numero_socio'`).
- Errores: `403` socio; `401` sin token; `400` con `{"fecha_desde": ["Introduzca una fecha válida."]}` (mensaje de django-filter).

**[A CREAR]** `GET /api/payments/pagos/resumen/` — `IsReceptionistOrAdmin`, mismos filtros que el listado (usar `self.filter_queryset(self.get_queryset())` dentro de un `@action(detail=False)`):
```json
{ "cantidad": 132,
  "total_aprobado": "1580000.00", "total_pendiente": "24000.00", "total_reembolsado": "0.00",
  "por_estado": { "aprobado": 118, "pendiente": 6, "rechazado": 5, "cancelado": 2, "reembolsado": 1 },
  "por_metodo": { "mercado_pago": { "cantidad": 90, "total": "1100000.00" }, "manual": { "cantidad": 28, "total": "480000.00" } } }
```
Montos string con 2 decimales; `total_*` suman `monto` por estado con `Sum`.

**[A CREAR/REUTILIZAR]** Exporte: `GET /api/reportes/facturacion/` con los params de BK-FIN-02 (`fecha_desde`, `fecha_hasta`, `plan_id`, `estado`, `metodo`). Agregar `socio_id` ahí si se quiere exportar el resultado filtrado por socio.

## 6. Modelo de datos
Sin cambios obligatorios. Si se agrega `cobrado_por` (BK-FIN-09), exponerlo en la tabla. Índice sugerido: `Pago(estado, paid_at)` y `Pago(created_at)` (hoy solo `socio+estado` y `mp_external_reference`, `models.py:57-60`).

## 7. Diseño frontend
- **Ruta y guard:** agregar en `frontend/src/App.jsx` junto a `/recepcion/cobros` (`App.jsx:127`):
  `<Route path="/admin/pagos" element={<ProtectedRoute roles={['administrador','recepcionista']}><AdminPagosPage /></ProtectedRoute>} />` y `/recepcion/pagos` apuntando a la misma página. Entradas de menú en `Sidebar.jsx` (`NAV_BY_ROLE.administrador` sección "Administración"; `NAV_BY_ROLE.recepcionista`), icono existente `'card'` o `'chart-line'` (`constants/navIcons.js`).
- **Página:** `frontend/src/pages/admin/AdminPagosPage.jsx`: `AppLayout` + `TopBar title="Pagos y facturación" subtitle="Todos los cobros del gimnasio"` + barra de totales (tarjetas `Card`) + filtros + `DataTable` + `Pagination`.
- **Hooks:** en `frontend/src/hooks/queries/usePagos.js` agregar `PAGOS_QUERY_KEYS = { all:['pagos'], list:(p)=>['pagos','list',p], resumen:(p)=>['pagos','resumen',p] }`, `usePagosList(params)` (`listarPagos` + `keepPreviousData`, `staleTime: 30_000` como `useSociosList`, `useSociosData.js:51-59`) y `usePagosResumen(params)`; en `pagosService.js` agregar `getResumenPagos(params)`.
- **Filtros:** `Select` Estado (Todos/Aprobado/Pendiente/Rechazado/Cancelado/Reembolsado), `Select` Método, rango `fecha_desde/fecha_hasta` (inputs `type="date"` como `ReportFilters.jsx:184-203`), búsqueda por socio (`SearchBar` con `useDebounce` de `hooks/useDebounce.js`), `Select` Plan (`usePlanes`).
- **Columnas:** Fecha (`paid_at ?? created_at`), Socio (`socio_nombre` + DNI), Plan, Monto (`Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'})`), Método (`METODO_PAGO_LABEL`, `frontend/src/constants/pagos.js:5-8`), Estado (`Badge` con el mapa compartido de BK-FIN-05). Click en fila -> `Modal` de detalle (ids de MP, `mp_status_detail`, membresía asociada).
- **Estados:** loading (skeleton de `DataTable`), vacío ("No hay pagos con estos filtros"), error (toast + reintentar), éxito.
- **Textos (voseo):** "Pagos y facturación", "Buscá por socio, DNI o ID de pago", "Total cobrado", "Pendientes de confirmación", "Exportar".
- **Responsive:** 375 px: lista de tarjetas (socio, monto, estado, fecha); 768 px: tabla sin columnas de método/plan; filtros en `FilterPanel` colapsable.

## 8. Archivos a crear / modificar
- Backend: `payments/views.py` (queryset con `select_related('socio','plan')`, `search_fields`, `PagoPagination`, action `resumen`), `payments/filters.py` (`paid_desde/hasta`), `payments/serializers.py` (`socio_dni`, `numero_socio`), `payments/tests/test_pagos_list.py` (nuevo).
- Frontend: `pages/admin/AdminPagosPage.jsx` (+ test), `hooks/queries/usePagos.js`, `services/pagosService.js`, `App.jsx`, `components/layout/Sidebar.jsx` (+ `Sidebar` tests si afectan snapshots), `constants/pagos.js` (mapa de estados, ver BK-FIN-05).

## 9. Plan de pruebas (TDD)
**Backend** (`cd backend && pytest -q apps/payments/tests/test_pagos_list.py`; `APITestCase` + `_auth` como `apps/payments/tests/test_cobro_manual.py:14-16`; crear `Pago` directos como `test_webhook.py:42-48`):
1. Recepcionista y admin listan; `socio` -> `403`; anónimo -> `401`.
2. Cada filtro (`estado`, `metodo`, `socio`, `plan`, `fecha_desde/hasta`, `monto_min/max`) devuelve solo lo esperado.
3. `search` por apellido, DNI y `mp_payment_id`.
4. `page_size=5` devuelve 5 y `count` total; `page_size=1000` se limita a 100.
5. `resumen` con mismos filtros: sumas por estado y método correctas; pagos `pendiente` no suman en `total_aprobado`.
6. Número de queries del listado constante (usar `assertNumQueries` o `django_assert_max_num_queries`) para evitar N+1.
**Frontend** (`npx vitest run src/pages/admin/AdminPagosPage.test.jsx src/hooks/queries/usePagos.test.jsx`): render con datos, estado vacío, error, cambio de filtro dispara request con params, paginación, modal de detalle, badges de los 5 estados con colores distintos, rol recepcionista ve la ruta y `socio` es redirigido (`ProtectedRoute`).
**Manual:** `recepcion@winnie.local` y `admin@winnie.local` abren `/admin/pagos`; hacer un cobro manual y ver la fila aparecer.

## 10. Criterios de aceptación
- **Dado** 40 pagos **cuando** abro Pagos **entonces** veo 20 por página y el total correcto.
- **Dado** el filtro Estado=Pendiente **cuando** lo aplico **entonces** la tabla y los totales se limitan a pendientes.
- **Dado** el texto "30123456" en búsqueda **cuando** busco **entonces** aparece el pago de ese DNI.
- **Dado** un pago rechazado **cuando** abro el detalle **entonces** veo `mp_status_detail`.
- **Dado** el rol socio **cuando** entro a `/admin/pagos` **entonces** soy redirigido a `/socio/credencial`.

## 11. Riesgos y decisiones abiertas
1. ¿La recepcionista debe ver montos totales de caja? Hoy el endpoint ya le permite listar todo (`views.py:41-44`). Recomendación: sí, es su herramienta de cobro; ocultar solo el exporte a admin si el dueño lo pide.
2. ¿Filtro de fecha por `created_at` (intento) o `paid_at` (cobro)? Recomendación: por defecto `paid_at` para estados aprobados y `created_at` para el resto; exponer ambos.
3. Volumen: sin índice por fecha, el listado puede volverse lento; medir.
4. Dependencia de BK-FIN-05 para badges de estado correctos (`Badge` hoy pinta `neutral` en verde).

## 12. Referencias
- `speckit/spec.md:256-264` (REQ-3.5, filtros de pagos), `docs/database/mer.md:147` (pago y reembolsos), `docs/database/schema.dbml` (tabla `payments_pago`).
- Figma (solo apoyo visual opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", módulo Pagos/Cobros.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym. TDD estricto. Construí la pantalla de administración "Pagos y facturación" según docs/backlog/items/BK-FIN-04-pagos-listado-global-admin.md.

Backend (backend/apps/payments): en views.py PagoViewSet agregá queryset.select_related('socio','plan'), search_fields (socio__nombre, socio__apellido, socio__dni, mp_payment_id, mp_external_reference), una PagoPagination (page_size 20, page_size_query_param='page_size', max 100; modelo: SocioPagination en backend/apps/members/views.py:20-22) y un @action(detail=False, url_path='resumen') con los mismos filtros que devuelva cantidad, total_aprobado, total_pendiente, total_reembolsado, por_estado y por_metodo (montos string 2 decimales). En serializers.py sumá socio_dni y numero_socio. En filters.py sumá paid_desde/paid_hasta. Permisos: IsReceptionistOrAdmin (apps/access/permissions.py).
Frontend: página pages/admin/AdminPagosPage.jsx (AppLayout, TopBar, DataTable, Pagination, FilterPanel/SearchBar, Modal de detalle), hooks usePagosList y usePagosResumen en hooks/queries/usePagos.js, getResumenPagos en services/pagosService.js, rutas /admin/pagos y /recepcion/pagos en App.jsx con ProtectedRoute roles={['administrador','recepcionista']}, entradas 'Pagos' en components/layout/Sidebar.jsx para ambos roles. Estados de pago con Badge: usá el mapa compartido de BK-FIN-05 (constants/pagos.js) y no el fallback de Badge.
Tests primero: backend/apps/payments/tests/test_pagos_list.py (filtros, search, page_size, resumen, 403/401, número de queries) y frontend AdminPagosPage.test.jsx + usePagos.test.jsx (renderWithProviders de src/test/test-utils.jsx; mock de services/api).
Terminado cuando `cd backend && pytest -q` y `cd frontend && npm run lint && npx vitest run --coverage && npm run build` pasan. Textos de UI en español rioplatense (voseo); código en inglés/convención del repo. Sin commits.
```
