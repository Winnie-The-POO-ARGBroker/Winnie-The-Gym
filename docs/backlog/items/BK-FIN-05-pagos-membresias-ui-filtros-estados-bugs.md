---
id: BK-FIN-05
titulo: Ficha de socio y "Mis pagos" - historial de otro socio, estados cancelado/reembolsado en verde y datos crudos
tipo: bug
roles: [administrador, recepcionista, socio]
prioridad: P0
tamano: M
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-FIN-05 · Bugs de datos y estados en pagos y membresías (UI)

## 1. Resumen
Varias pantallas de pagos/membresías muestran datos equivocados: la pestaña "Pagos" de la ficha del socio trae pagos de **todos** los socios porque el hook manda el filtro con un nombre que el backend no reconoce; los estados `cancelado`, `reembolsado`, `suspendida` y `cancelada` se pintan en **verde** porque `Badge` no tiene variante `neutral`; y se muestran valores crudos (`mercado_pago`, ids de plan). Son correcciones chicas que además desbloquean BK-FIN-04, BK-FIN-06 y BK-FIN-08.

## 2. Objetivo de usuario
Como **recepcionista/administrador** quiero **que la ficha de un socio muestre solo sus pagos y sus membresías con nombres legibles**; como **socio** quiero **entender el estado de cada pago (incluido cancelado o reembolsado) en "Mis pagos"** para **no confundir un reembolso con un pago exitoso**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Frontend hook | `frontend/src/hooks/queries/usePagos.js:13-24` | `usePagosPorSocio` pide `GET /payments/pagos/` con `params: { socio_id: socioId }`. |
| Backend filtro | `backend/apps/payments/filters.py:12-19` | `PagoFilter` solo reconoce `socio` (exact). `socio_id` se ignora silenciosamente -> el listado devuelve la primera página de **todos** los pagos (10 filas, `base.py:181-182`). |
| Frontend UI | `frontend/src/components/admin/SocioDetailModal.jsx:187-232,297` | Pestaña "Pagos" usa ese hook: un recepcionista ve pagos de otros socios en la ficha de uno (fuga de datos entre fichas, dentro del staff). |
| Frontend test | `frontend/src/hooks/queries/usePagos.test.jsx:40` | El test **fija el bug**: `expect(api.get).toHaveBeenCalledWith('/payments/pagos/', ... params: { socio_id: 10 })`. |
| Spec | `speckit/spec.md:263` | REQ-3.5 también dice `?socio_id={id}` (el spec arrastró el error). |
| Frontend UI | `frontend/src/components/pagos/HistorialPagosCard.jsx:57` | Usa `listarPagos({ socio: socioId, page_size: limit })`: `socio` es correcto, pero `page_size` no existe en `PagoViewSet` -> siempre 10 filas, ignora `limit=8` de `CobroManualPage.jsx:372`. |
| Frontend UI | `frontend/src/components/ui/Badge.jsx:3-15` | `variantStyles` define `success`, `danger`, `warning`, `live`; `const s = variantStyles[variant] ?? variantStyles.success`: una variante inexistente cae en **verde (success)**. Existe paleta `neutral` en `frontend/src/styles/tokens.js:81` sin usar en `Badge`. |
| Frontend UI | `frontend/src/pages/socio/HistorialPagosPage.jsx:9-16,81-83` | `estadoBadgeVariant` devuelve `'neutral'` para `cancelado` y `reembolsado` -> se ven verdes, como si fueran aprobados. Muestra el estado crudo (`pago.estado`) y el método crudo `capitalize` (`mercado_pago` -> "Mercado_pago", líneas 77-79). Usa `created_at` en vez de `paid_at` (línea 69). |
| Frontend UI | `frontend/src/components/admin/SocioDetailModal.jsx:39-55,176,226` | `estadoMembresiaVariant` / `estadoPagoVariant` devuelven `'neutral'` por defecto (suspendida, cancelada, cancelado, reembolsado -> verde). `case 'pendiente'` no coincide con el estado real `pendiente_pago`. |
| Frontend UI | `frontend/src/components/dashboard/views/SocioDashboardView.jsx:28` | `<Badge variant="neutral">Sin membresía</Badge>` -> verde. |
| Frontend UI | `frontend/src/components/admin/SocioDetailModal.jsx:170,214` | `m.plan_nombre ?? m.plan`: `MembresiaSerializer` (`backend/apps/memberships/serializers.py:34`) no tiene `plan_nombre`, muestra el **id numérico del plan**. |
| Backend serializer | `backend/apps/memberships/serializers.py:31-36` | `MembresiaSerializer` expone `id, socio, plan, fecha_inicio, fecha_fin, estado` (sin nombres). `MembresiaViewSet` sin `select_related` (`views.py:52`). |
| Frontend UI | `frontend/src/components/pagos/HistorialPagosCard.jsx:7-19` | Es la única pieza que mapea correctamente los 5 estados de pago (`aprobado/rechazado/cancelado/pendiente/reembolsado`) pero con constantes locales; `METODO_LABEL` duplica `frontend/src/constants/pagos.js:5-8`. |

Conclusión sobre "faltan en la UI los estados Cancelado/Reembolsado": están en `HistorialPagosCard` (staff) pero **no** en `HistorialPagosPage` (socio) ni en `SocioDetailModal`, y donde faltan se muestran en verde.

## 4. Alcance
**Incluye:**
- Corregir `usePagosPorSocio` (`socio`), el test que lo fija y `page_size` (agregar paginación configurable en `PagoViewSet`, ver BK-FIN-04).
- `Badge`: agregar variantes `neutral` e `info` y que una variante desconocida **no** caiga en `success` (usar `neutral`).
- Mapa único de estados de pago y de membresía (label + variante + icono) en `frontend/src/constants/pagos.js` y `frontend/src/constants/membresias.js` (nuevo), consumido por `HistorialPagosPage`, `SocioDetailModal`, `HistorialPagosCard`, `SocioDashboardView`.
- `MembresiaSerializer`: `plan_nombre` y `socio_nombre` read-only; `select_related`.
- Corregir `AdminDashboardView` para usar `socio_nombre` (ver BK-FIN-03).

**No incluye:** pantalla de listado global (BK-FIN-04), acciones de ciclo de vida (BK-FIN-06), flujo de reembolso (BK-FIN-08).

## 5. Contrato de API
**[EXISTE → MODIFICAR]** `GET /api/memberships/membresias/` y `GET /api/memberships/membresias/{id}/` (`IsReceptionistOrAdmin`, `views.py:57-60`): agregar campos de solo lectura al serializer.
```json
{ "id": 88, "socio": 12, "socio_nombre": "Ana Gómez", "plan": 3, "plan_nombre": "Premium",
  "fecha_inicio": "2026-09-30", "fecha_fin": "2026-10-30", "estado": "activa" }
```
Implementación: `socio_nombre = serializers.CharField(source='socio.__str__', read_only=True)` (mismo patrón que `PagoSerializer`, `payments/serializers.py:9`) y `plan_nombre = serializers.CharField(source='plan.nombre', read_only=True)`; `read_only_fields` ya incluye `fecha_fin` (`serializers.py:36`). `MembresiaDetailSerializer` sigue anidando `plan` (`serializers.py:55-56`).
**[EXISTE]** `GET /api/payments/pagos/?socio=<id>` (filtro correcto). Errores: sin cambios.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Rutas/guard:** sin cambios.
- **Componentes a tocar:**
  - `components/ui/Badge.jsx`: agregar `neutral` (`colors.neutral` de `styles/tokens.js:81`, verificar sus shades) e `info` (la paleta `info` existe en `frontend/tailwind.config.js:40` y se usa como `text-info-500` en `HistorialPagosCard.jsx:13`, pero **no** está en `styles/tokens.js`: agregarla ahí para que `Badge` pueda usar `colors.info`); fallback a `neutral`.
  - `constants/pagos.js`: exportar `ESTADO_PAGO = { aprobado:{label:'Aprobado', variant:'success', icon:CheckCircle}, pendiente:{label:'Pendiente', variant:'warning', icon:Clock}, rechazado:{label:'Rechazado', variant:'danger', icon:XCircle}, cancelado:{label:'Cancelado', variant:'neutral', icon:XCircle}, reembolsado:{label:'Reembolsado', variant:'info', icon:Banknote} }` y `ESTADO_MEMBRESIA = { activa:'success', vencida:'danger', suspendida:'warning', cancelada:'neutral', pendiente_pago:'warning' }` con labels ("Activa", "Vencida", "Suspendida", "Cancelada", "Pendiente de pago").
  - `pages/socio/HistorialPagosPage.jsx`: usar los mapas; fecha `paid_at ?? created_at`; método con `METODO_PAGO_LABEL`; columna Estado con ícono además de color (accesibilidad: no depender solo del color).
  - `components/admin/SocioDetailModal.jsx`: mapas compartidos; `m.plan_nombre`; tab Pagos con hook corregido.
  - `hooks/queries/usePagos.js`: `params: { socio: socioId, page_size: 50 }` (una vez exista `page_size`, BK-FIN-04) y `queryKey` sin cambios (`PAGOS_POR_SOCIO_KEY`).
- **Estados de UI:** loading (Skeleton existente), vacío ("No hay pagos registrados para este socio."), error (hoy el modal no muestra error: agregar mensaje "No se pudieron cargar los pagos"), éxito.
- **Textos (voseo):** "Pago cancelado", "Pago reembolsado", "Tu pago fue reembolsado y la membresía puede haberse dado de baja; consultá en recepción." (texto final a validar, decisión 3).
- **Responsive:** `HistorialPagosPage` tiene tabla con `overflow-x-auto`; a 375 px convertir cada fila en tarjeta (fecha, plan, monto, estado).

## 8. Archivos a crear / modificar
- `frontend/src/components/ui/Badge.jsx` (+ test nuevo `Badge.test.jsx`), `frontend/src/constants/pagos.js`, `frontend/src/constants/membresias.js` (nuevo).
- `frontend/src/hooks/queries/usePagos.js` y `usePagos.test.jsx` (línea 40: cambiar a `socio`).
- `frontend/src/components/pagos/HistorialPagosCard.jsx` (usar constantes compartidas; tests en `components/pagos/__tests__/HistorialPagosCard.test.jsx`).
- `frontend/src/pages/socio/HistorialPagosPage.jsx` (+ `pages/socio/__tests__/HistorialPagosPage.test.jsx`).
- `frontend/src/components/admin/SocioDetailModal.jsx` (+ `SocioDetailModal.test.jsx`), `frontend/src/components/dashboard/views/SocioDashboardView.jsx`.
- `backend/apps/memberships/serializers.py`, `backend/apps/memberships/views.py` (`select_related('socio','plan')`), `backend/apps/memberships/tests/test_membresias_views.py` (ampliar).

## 9. Plan de pruebas (TDD)
**Backend** (`cd backend && pytest -q apps/memberships/tests/test_membresias_views.py apps/payments/tests`; `APITestCase` + `RefreshToken`, factories `conftest.py:23-75`):
1. `GET /api/memberships/membresias/` incluye `socio_nombre` y `plan_nombre`; `GET .../membresias/{id}/` mantiene `plan` anidado.
2. Con 3 socios y pagos de cada uno, `GET /api/payments/pagos/?socio=<A>` devuelve solo los de A (test de regresión de contrato, en `apps/payments/tests`).
3. Query count constante en el listado de membresías.
**Frontend** (`npx vitest run`; mocks como en `usePagos.test.jsx:12-24`):
1. `usePagosPorSocio(10)` llama con `params: expect.objectContaining({ socio: 10 })` y **no** con `socio_id`.
2. `Badge` con variante desconocida usa estilos `neutral` (no `success`); `neutral` e `info` renderizan colores distintos.
3. `HistorialPagosPage`: un pago `reembolsado` muestra "Reembolsado" y ícono (no badge verde); método "MercadoPago"/"Cobro manual".
4. `SocioDetailModal`: pestaña Membresías muestra `plan_nombre`; suspendida/cancelada con etiqueta correcta.
5. Accesibilidad básica: `getByText('Cancelado')` presente (el estado no se comunica solo por color).
**Manual:** con `recepcion@winnie.local` abrir la ficha de `socio.activo@winnie.local` y comprobar que solo aparecen sus pagos.

## 10. Criterios de aceptación
- **Dado** que existen pagos de varios socios **cuando** abro la ficha de uno **entonces** la pestaña Pagos muestra solo los de ese socio.
- **Dado** un pago `reembolsado` o `cancelado` **cuando** lo veo en cualquier pantalla **entonces** no se pinta en verde y su etiqueta dice Reembolsado/Cancelado.
- **Dado** una membresía suspendida **cuando** la veo en la ficha **entonces** muestra "Suspendida" en tono de advertencia y el nombre del plan, no su id.
- **Dado** `limit=8` en el historial del cobro manual **cuando** se carga **entonces** se muestran como máximo 8.

## 11. Riesgos y decisiones abiertas
1. Cambiar `Badge` afecta otras pantallas que usen variantes inexistentes (hoy `SocioDashboardView` usa `neutral` y se ve verde por el fallback); revisar capturas.
2. ¿`page_size` se agrega en este ticket o espera a BK-FIN-04? Recomendación: agregar `PagoPagination` acá (cambio de 6 líneas) y reutilizarlo en BK-FIN-04.
3. Texto para el socio ante `reembolsado`/`cancelado`: depende de la política de BK-FIN-08 (si el reembolso revoca la membresía).

## 12. Referencias
- `speckit/spec.md:214-230` (REQ-3.3 historial del socio, incluía columna "comprobante": ver BK-FIN-10) y `:256-264` (REQ-3.5).
- `docs/database/schema.dbml:94` (tabla `payments_pago`).
- Figma (solo apoyo visual opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", Mobile/Hi-Fi: Mis pagos y Ficha de socio.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (backend Django/DRF, frontend React+Vite+TanStack Query+Tailwind). TDD estricto.

Bugs (ver docs/backlog/items/BK-FIN-05-pagos-membresias-ui-filtros-estados-bugs.md):
1) frontend/src/hooks/queries/usePagos.js::usePagosPorSocio manda params {socio_id}; PagoFilter (backend/apps/payments/filters.py) solo conoce `socio`, así que la pestaña Pagos de SocioDetailModal muestra pagos de todos. El test usePagos.test.jsx:40 fija el bug: corregilo a {socio: id}.
2) components/ui/Badge.jsx cae en variantStyles.success para variantes desconocidas; HistorialPagosPage, SocioDetailModal y SocioDashboardView usan 'neutral' -> cancelado/reembolsado/suspendida/cancelada se ven verdes. Agregá variantes 'neutral' e 'info' (frontend/src/styles/tokens.js tiene paletas) y fallback a neutral.
3) Mapas compartidos ESTADO_PAGO (aprobado/pendiente/rechazado/cancelado/reembolsado) en constants/pagos.js y ESTADO_MEMBRESIA (activa/vencida/suspendida/cancelada/pendiente_pago) en constants/membresias.js (label, variant, icono); usalos en HistorialPagosPage (también método con METODO_PAGO_LABEL y fecha paid_at ?? created_at), SocioDetailModal y HistorialPagosCard.
4) Backend: MembresiaSerializer (apps/memberships/serializers.py) debe exponer socio_nombre (source 'socio.__str__') y plan_nombre (source 'plan.nombre') read-only; MembresiaViewSet con select_related('socio','plan'). SocioDetailModal usa m.plan_nombre.
5) PagoViewSet: agregá PagoPagination (page_size 20, page_size_query_param 'page_size', max_page_size 100) para que HistorialPagosCard limit funcione.
Tests primero: Badge.test.jsx (nuevo), usePagos.test.jsx, HistorialPagosPage.test.jsx, SocioDetailModal.test.jsx; backend test_membresias_views.py y un test de filtro ?socio= en apps/payments/tests. Usá renderWithProviders (src/test/test-utils.jsx).
Terminado cuando: `cd backend && pytest -q` (cov>=80) y `cd frontend && npm run lint && npx vitest run --coverage && npm run build` pasan. Textos UI en español rioplatense. Sin commits.
```
