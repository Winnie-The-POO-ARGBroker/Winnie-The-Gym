---
id: BK-SOC-03
titulo: La pestaña "Pagos" del detalle de socio lista los pagos de TODOS los socios (filtro `socio_id` inexistente)
tipo: bug
roles: [administrador, recepcionista]
prioridad: P0
tamano: S
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-FIN-01]
---

# BK-SOC-03 · La pestaña "Pagos" del detalle de socio muestra pagos ajenos

## 1. Resumen
`SocioDetailModal` pide `GET /api/payments/pagos/?socio_id=<id>`, pero el `PagoFilter` solo conoce el parámetro `socio`. `django-filter` ignora los parámetros desconocidos, así que el backend devuelve **la primera página de todos los pagos del sistema** (más recientes primero). Staff ve pagos (montos, planes, métodos) atribuidos al socio equivocado: error funcional y fuga de datos entre socios. La spec y el test lo "bendijeron" con el nombre equivocado.

## 2. Objetivo de usuario
Como **recepcionista/administrador** quiero **ver en el detalle de un socio solo sus propios pagos, con paginación** para **atender reclamos y cobros sin confundirme de persona**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend filtro | `backend/apps/payments/filters.py:6-19` | `PagoFilter`: `fecha_desde, fecha_hasta, monto_min, monto_max` + `Meta.fields`: `estado(exact,in), metodo(exact,in), socio(exact), plan(exact)`. **No existe `socio_id`.** |
| Backend vista | `backend/apps/payments/views.py:34-44` | `PagoViewSet(List+Retrieve)`, `queryset = Pago.objects.all()`, `filterset_class = PagoFilter`, `IsReceptionistOrAdmin` (salvo `mis_pagos` → `IsSocio`). Paginación DRF por defecto (`PAGE_SIZE=10`, `core/settings/base.py:181-182`). |
| Frontend hook | `frontend/src/hooks/queries/usePagos.js:13-24` | `usePagosPorSocio`: `api.get('/payments/pagos/', { params: { socio_id: socioId } })` y devuelve `res.data?.results ?? res.data ?? []` (solo primera página). |
| Frontend modal | `frontend/src/components/admin/SocioDetailModal.jsx:187-232` | `TabPagos` renderiza esa lista bajo "Pagos". El mismo modal se usa en `GestionSociosPage.jsx:281` (recepción) y `AdminSociosPage.jsx:330`. |
| Test que fija el bug | `frontend/src/hooks/queries/usePagos.test.jsx:40` | `expect(api.get).toHaveBeenCalledWith('/payments/pagos/', expect.objectContaining({ params: { socio_id: 10 } }))`. |
| Spec equivocada | `speckit/spec.md` REQ-3.5 | "Tab Pagos — llama a `GET /api/payments/pagos/?socio_id={id}`". |
| Componente hermano correcto | `frontend/src/components/pagos/HistorialPagosCard.jsx:57` | Usa `listarPagos({ socio: socioId, page_size: limit })` (parámetro correcto). |
| Backend tests | `backend/apps/payments/tests/` (`test_cobro_manual.py`, `test_mis_pagos.py`, …) | **No hay ningún test del filtrado de `GET /api/payments/pagos/` por socio.** |

Contraste: `useMembresiasPorSocio` sí usa el parámetro correcto (`socio`, `useMembresias.js:37`; `MembresiaFilter` `socio: exact`).
Verificación en vivo: **No verificado** (backend local apagado). Conclusión por lectura de `PagoFilter` + comportamiento documentado de django-filter (ignora claves no declaradas).

## 4. Alcance
**Incluye:** corregir el parámetro a `socio`; aceptar además `socio_id` como alias en el backend (defensa; ver §5); test de backend que garantice el aislamiento; paginación/"ver más" en la pestaña; test frontend actualizado.
**No incluye:** filtros por fecha/estado en la pestaña (BK-FIN); recibos/comprobantes (BK-FIN); la vista de pagos del propio socio (`/socio/pagos`, ver BK-SOC-09).

## 5. Contrato de API
**[EXISTE] `GET /api/payments/pagos/`** — `IsReceptionistOrAdmin`. Query: `socio=<id>` (exact), `estado`, `metodo`, `plan`, `fecha_desde`, `fecha_hasta`, `monto_min`, `monto_max`, `ordering` (`created_at, monto, estado`), `page`, `page_size` (no soportado: la paginación global es `PageNumberPagination` sin `page_size_query_param` → usar `page`). Response: `{count,next,previous,results:[PagoSerializer]}` con `id, socio, socio_nombre, plan, plan_nombre, membresia, monto, moneda, metodo, estado, mp_preference_id, mp_payment_id, mp_external_reference, mp_status_detail, paid_at, created_at, updated_at`.
**Cambio backend (defensa, [A CREAR]):** en `PagoFilter` agregar `socio_id = django_filters.NumberFilter(field_name='socio_id')` para que ningún cliente futuro vuelva a "listar todo" por error. Alternativa más estricta: si llega un query param desconocido, devolver 400 (cambia comportamiento global: no recomendado).
Nota: el `HistorialPagosCard.jsx:57` usa `page_size` que **también se ignora** (se devuelven 10 igual): no romper, pero no confiar en `limit`.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Rutas/guard:** el modal no tiene ruta; se abre desde `/admin/socios` (`roles=['administrador']`, `App.jsx:104`) y `/recepcion/socios` (`roles=['administrador','recepcionista']`, `App.jsx:123`).
- **Convenciones:** hooks react-query v5 en `frontend/src/hooks/queries/` (`usePagos.js`), `api` axios (`services/api.js`), skeletons con `components/ui/Skeleton`, vacío con ícono + texto.
- **Cambios:**
  1. `usePagosPorSocio`: `params: { socio: socioId }`; devolver `{ results, count, next }` o usar `useInfiniteQuery`/estado `page` para "Ver más" (la lista hoy corta en 10).
  2. `TabPagos`: botón secundario "Ver más pagos" si `next`; mostrar `paid_at ?? created_at` (como `HistorialPagosCard`) y etiquetas de método (`mercado_pago` → "MercadoPago", `manual` → "Cobro manual") en vez del valor crudo (`SocioDetailModal.jsx:217` imprime `p.metodo`).
  3. Estado de error: hoy no existe (si el `GET` falla, `data=[]` y dice "No hay pagos registrados"): agregar `isError` con mensaje "No pudimos cargar los pagos. Reintentar".
- **Textos:** "No hay pagos registrados para este socio.", "Ver más pagos", "No pudimos cargar los pagos."
- **Responsive:** el modal es `max-w-xl`; las filas son flex y ya colapsan; verificar 375 px.

## 8. Archivos a crear / modificar
- `backend/apps/payments/filters.py` — alias `socio_id` (opcional, defensa).
- `backend/apps/payments/tests/test_pagos_list.py` (nuevo) — aislamiento por socio.
- `frontend/src/hooks/queries/usePagos.js` — `params: { socio }` (+ paginación).
- `frontend/src/hooks/queries/usePagos.test.jsx` — corregir la aserción de la línea 40.
- `frontend/src/components/admin/SocioDetailModal.jsx` (+ `.test.jsx`) — error state, método legible, "Ver más".
- Corregir `speckit/spec.md` REQ-3.5 (documentación).

## 9. Plan de pruebas (TDD)
**Backend** (nuevo `test_pagos_list.py`, `APITestCase` + `make_user_factory`, `make_socio_factory`, `make_plan_factory`, creación directa de `Pago` como en `test_mis_pagos.py:23`):
- `test_list_filtra_por_socio`: 2 socios con pagos; `GET /api/payments/pagos/?socio=<A>` ⇒ solo pagos de A.
- `test_list_socio_id_alias` (si se agrega el alias): `?socio_id=<A>` ⇒ solo A.
- `test_list_sin_filtro_devuelve_todos_para_staff` y `test_list_rol_socio_403`.
Comando: `cd backend && pytest -q apps/payments/tests/test_pagos_list.py`.
**Frontend** (`usePagos.test.jsx`, `SocioDetailModal.test.jsx`, Vitest + RTL, `vi.mock('../../hooks/queries/usePagos')` como ya hace el test del modal):
- Hook: `api.get` llamado con `{ params: { socio: 10 } }`.
- Modal: `isError` ⇒ mensaje de error (no "No hay pagos"); `next` presente ⇒ botón "Ver más pagos"; método `mercado_pago` ⇒ "MercadoPago".
Comando: `cd frontend && npx vitest run src/hooks/queries/usePagos.test.jsx src/components/admin/SocioDetailModal.test.jsx`.
**Manual:** admin → `/admin/socios` → abrir dos socios distintos con pagos → la pestaña "Pagos" muestra solo los de cada uno; un socio sin pagos muestra el vacío (hoy mostraría pagos ajenos).

## 10. Criterios de aceptación
- **Dado** dos socios con pagos distintos **cuando** staff abre el detalle de A y entra a "Pagos" **entonces** ve únicamente pagos de A.
- **Dado** un socio sin pagos **cuando** se abre la pestaña **entonces** se muestra el estado vacío (no pagos de otros).
- **Dado** más de 10 pagos **cuando** se abre la pestaña **entonces** hay forma de ver el resto.
- **Dado** un error de red **cuando** carga la pestaña **entonces** se informa el error.

## 11. Riesgos y decisiones abiertas
1. ¿Agregar el alias `socio_id` en backend o solo corregir el cliente? (Recomendado: ambos; el alias es una línea y evita recurrencia.)
2. ¿Rechazar query params desconocidos globalmente (400)? (Recomendado: no, fuera de alcance.)
3. Revisar el resto de consumidores de `/payments/pagos/` (CobroManualPage, reportes) por el mismo error de nombre; reportarlo a BK-FIN.

## 12. Referencias
- `speckit/spec.md` REQ-3.5 (contiene el nombre de parámetro erróneo).
- `frontend/src/components/pagos/HistorialPagosCard.jsx` (usa `socio`, correcto).
- Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", Hi-Fi → Socios → Detalle (tab Pagos).

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym. Bug verificado: frontend/src/hooks/queries/usePagos.js (usePagosPorSocio, ~línea 17) llama GET /payments/pagos/ con params {socio_id}, pero backend/apps/payments/filters.py (PagoFilter) solo define el filtro `socio`; django-filter ignora el parámetro desconocido y el endpoint devuelve los pagos de todos los socios (primera página) en la pestaña "Pagos" de SocioDetailModal.
TDD: (1) crea backend/apps/payments/tests/test_pagos_list.py (APITestCase, make_user_factory/make_socio_factory/make_plan_factory de backend/conftest.py, Pago.objects.create como en test_mis_pagos.py) con: filtrar por ?socio=<id> devuelve solo ese socio; (si agregás alias) ?socio_id=<id> también; rol socio 403. (2) agregá `socio_id = django_filters.NumberFilter(field_name='socio_id')` a PagoFilter. (3) cambiá el hook a params {socio: socioId} y corregí la aserción en frontend/src/hooks/queries/usePagos.test.jsx:40. (4) En SocioDetailModal.jsx TabPagos: estado de error (isError), etiqueta legible del método (mercado_pago -> MercadoPago, manual -> Cobro manual), paginación "Ver más pagos" si hay `next`; actualizá SocioDetailModal.test.jsx.
Terminado cuando: cd backend && pytest -q apps/payments verde; cd frontend && npx vitest run src/hooks/queries/usePagos.test.jsx src/components/admin/SocioDetailModal.test.jsx y npm run lint verdes. Corregí también speckit/spec.md REQ-3.5. No hagas commits ni toques otros archivos.
```
