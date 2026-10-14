---
id: BK-SOC-09
titulo: Portal del socio (dashboard, credencial, pagos): datos faltantes, fechas crudas, "próximas clases" truncadas y sin estados de error
tipo: ui-estado
roles: [socio]
prioridad: P2
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-SOC-06, BK-SOC-08, BK-CLS-01]   # BK-CLS: paginación/endpoint de reservas del socio
---

# BK-SOC-09 · Portal del socio: datos que faltan y estados que no existen

## 1. Resumen
El portal del socio (dashboard, credencial, mis pagos, checkout) renderiza el camino feliz, pero: muestra fechas ISO crudas (`2026-11-30`), pierde la fecha de vencimiento cuando la membresía ya venció (el backend solo devuelve la `activa`), no tiene estado de error (un fallo de red se lee como "Sin membresía activa"), arma "próximas clases" bajándose la grilla con un `page_size` que el backend ignora, y el historial de pagos solo muestra los últimos 10. Hay además dos hooks distintos para el mismo endpoint y un `Sede Central` hardcodeado.

## 2. Objetivo de usuario
Como **socio** quiero **ver en mi celular cuándo vence mi membresía, mi apto, mis próximas reservas y todos mis pagos, y saber cuando algo falló** para **no llegar al gimnasio con sorpresas**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend /me | `backend/apps/memberships/serializers.py:59-92` | `SocioMeSerializer.fields = (id, numero_socio, dni, nombre, apellido, estado, membresia_activa, certificado_medico_url, asistencias_mes)`. `get_membresia_activa` filtra `estado='activa'` (línea 78): una membresía `vencida` **no se devuelve**, ni su fecha. `asistencias_mes` cuenta `AccessLog` ENTRY/GRANTED del mes (82-92). |
| Backend pagos | `backend/apps/payments/views.py:46-55` | `GET /api/payments/pagos/mis-pagos/` (`IsSocio`), paginado con la paginación global (10 por página, `base.py:181-182`); el front solo lee la primera página. |
| Backend paginación | `backend/apps/members/views.py:19-22`; `backend/core/settings/base.py:174-189` | Solo `SocioPagination` acepta `page_size`. La paginación global (`PageNumberPagination`, `PAGE_SIZE=10`) **no define `page_size_query_param`** ⇒ `?page_size=1000` se ignora en `/classes/clases/` y en todo lo demás. |
| Frontend dashboard | `frontend/src/components/dashboard/views/SocioDashboardView.jsx:10-33,47,63` | Solo `isLoadingMembership` (sin `isError`); `expiration = mem?.fecha_fin \|\| '--'` impreso crudo (`"Vence el 2026-11-30"`); badge "Al día" para cualquier membresía no vencida; `asistencias_mes ?? '--'`. Botones: "Ver Mi Credencial QR" y "Reservar Nueva Clase"; **no hay botón "Renovar"** (aunque existe `/socio/checkout`). |
| Frontend próximas clases | `frontend/src/hooks/queries/useDashboardData.js:67-79`, `constants/pagination.js:5` | `GET /classes/clases/?page_size=1000` + filtro `c.user_inscrito` + `slice(0,3)`; comentario `TODO (TICKET-123)`. Como el backend ignora `page_size`, el filtro se aplica a **10 clases** ⇒ reservas fuera de esa página no aparecen. Además `Badge`: `{upcomingClasses.length} Reservadas` (nunca >3) y la tarjeta muestra solo `hora`, sin día. |
| Frontend hooks duplicados | `frontend/src/hooks/queries/useDashboardData.js:55-64` (`['socioMembership']`) y `useMembresias.js:17-27` (`['membresias','me']`) | Dos queries al mismo `GET /api/memberships/me/` con claves distintas (doble request, caches que no se invalidan juntas). |
| Frontend credencial | `frontend/src/pages/socio/CredencialDigitalPage.jsx:45-62,86-90,144-146,183` | `sedeHabitual: 'Sede Central'` hardcodeado (línea 50); `isExpired = !member?.membresia \|\| estado==='vencida'` (como `membresia_activa` nunca viene vencida, solo dispara por `null`); `MembershipExpiredAlert fechaVencimiento={member.membresia?.fechaVencimiento}` ⇒ siempre `undefined` cuando vence ⇒ cae al texto "No tienes un plan activo. Acercate a recepción…" (`components/socio/MembershipExpiredAlert.jsx:14-16`); el QR se pide igual (86-90). Carga: `<div>Cargando...</div>` sin skeleton (111-113); sin `isError`. |
| Frontend credencial | `frontend/src/components/socio/MemberPlanDetails.jsx:20` | Imprime `membresia.fechaVencimiento` crudo (ISO). |
| Frontend pagos | `frontend/src/pages/socio/HistorialPagosPage.jsx:2,33-96` y `hooks/queries/useMisPagos.js:6-10` | Usa `AppLayout` (layout de escritorio) mientras credencial/clases/checkout usan `MemberLayout` (mobile-first); `data?.results ?? data`: **ignora `next`** (sin paginación); estados y métodos se imprimen crudos (`aprobado`, `mercado_pago`) a diferencia de `components/pagos/HistorialPagosCard.jsx:7-19` que tiene mapas de etiquetas; sin estado de error. |
| Frontend checkout | `frontend/src/pages/socio/CheckoutPage.jsx:75-135` | Lista planes activos (paginados a 10 por la misma razón) y redirige a MercadoPago; no muestra plan/vencimiento actual ni avisa de un pago `pendiente` previo. |
| Config | `backend/apps/common/models.py:4-14` | `GymConfig` tiene `nombre_gym`, `aforo_maximo`, horarios, `telefono_contacto` (no hay "sede"). Público: `GET /api/config/gym/`. |

## 4. Alcance
**Incluye:** formato de fechas (`es-AR`), estado de error y skeletons en dashboard/credencial/pagos; `/memberships/me/` devuelve también la última membresía vencida (`ultima_membresia`); unificar el hook de `/me`; CTA "Renovar" en dashboard y alerta de vencimiento; paginación ("Ver más") en Mis Pagos y mapas de etiquetas compartidos; "próximas clases" con endpoint dedicado; reemplazar `Sede Central` por dato real (`nombre_gym`); `MemberLayout` en `/socio/pagos`.
**No incluye:** apto con vigencia (→ BK-SOC-06, solo se prevé el slot en el dashboard); respeto del estado suspendido/baja (→ BK-SOC-08); rediseño del QR/wake lock/alto contraste (→ BK-MOB); recibos descargables (→ BK-FIN); grilla de clases (→ BK-CLS).

## 5. Contrato de API
**[EXISTE → CAMBIA] `GET /api/memberships/me/`** — `IsSocio`. Agregar: `ultima_membresia` (`MembresiaDetailSerializer` de la última membresía no activa por `fecha_fin` desc, o `null`) y `proxima_clase` opcional. Campos ya existentes: `id, numero_socio, dni, nombre, apellido, estado, membresia_activa{id,socio,plan{id,nombre,duracion_dias,precio,clases_asignadas,activo,es_popular,socios_activos},fecha_inicio,fecha_fin,estado}, certificado_medico_url, asistencias_mes`.
**[A CREAR — propuesta] `GET /api/classes/clases/mis-reservas/`** — `@action(detail=False, url_path='mis-reservas', permission_classes=[IsSocio])` en `ClaseViewSet` (`classes/views.py`); sin paginar (acotado por socio); devuelve `[{"id","nombre","dia","hora","duracion_min","sala","instructor_nombre","en_espera","proxima_fecha": "2026-10-15T19:00:00-03:00"}]` ordenado por `proxima_fecha` (reutiliza `_next_clase_datetime`, `classes/services.py:70`). Cruza con BK-CLS.
**[EXISTE] `GET /api/payments/pagos/mis-pagos/`** — `?page=N`; response `{count,next,previous,results:[PagoSerializer]}`.
**Alternativa global:** agregar `page_size_query_param='page_size'` (con `max_page_size`) a una `StandardPagination` global (`REST_FRAMEWORK['DEFAULT_PAGINATION_CLASS']`); beneficia también planes/clases. Decidir con BK-PLT/BK-CLS.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Rutas/guard:** `/dashboard` (`ProtectedRoute`, `App.jsx:74`), `/socio/credencial` y `/socio/clases` (`roles=['administrador','socio']`, 130-131), `/socio/checkout` y `/socio/pagos` (`roles=['socio']`, 132-133).
- **Convenciones:** hooks en `frontend/src/hooks/queries/` (react-query v5), `api` axios, `Skeleton` (`components/ui/Skeleton`), `EmptyState` (`icon,title,message`), `Badge`, `sonner`, íconos `lucide-react`; layouts `MemberLayout` (props `title, subtitle, member, rightAction`) y `AppLayout`+`TopBar`.
- **Cambios:**
  1. `frontend/src/utils/format.js` (nuevo): `formatFecha(iso)` con `toLocaleDateString('es-AR', {day:'2-digit', month:'long', year:'numeric'})` — **parsear `YYYY-MM-DD` como fecha local** (`new Date(y, m-1, d)`) para evitar el corrimiento de un día por UTC; usarlo en dashboard, `MemberPlanDetails`, `MembershipExpiredAlert`, `HistorialPagosPage`.
  2. Un único hook `useSocioMe()` (renombrar/mover desde `useMembresias.js`) usado por dashboard y credencial; eliminar `useSocioMembership` o hacer que lo reexporte; query key única `['socio','me']` e invalidarla desde BK-SOC-02/06 y desde el éxito de pago.
  3. `SocioDashboardView`: `isError` ⇒ `EmptyState` "No pudimos cargar tu membresía. Reintentar" (con `refetch`); badge por estado real; botón "Renovar membresía" → `/socio/checkout` cuando no hay `membresia_activa` o vence en ≤ 7 días; tarjeta de clases con día y hora ("Mié 19:00") y contador correcto (`N reservas`), vacío "Todavía no reservaste clases. Mirá la grilla".
  4. `CredencialDigitalPage`: usar `ultima_membresia.fecha_fin` para `MembershipExpiredAlert`; CTA "Renovar ahora" (link a `/socio/checkout`) en vez de "Acercate a recepción"; skeleton en lugar de "Cargando..."; `isError`; reemplazar `Sede Central` por `useGymConfig().nombre_gym` (hook existente `frontend/src/hooks/queries/useGymConfig.js`, `GET /config/gym/`).
  5. `HistorialPagosPage`: `MemberLayout`, `useInfiniteQuery` (o botón "Ver más") sobre `next`, etiquetas compartidas (`METODO_PAGO_LABEL` ya existe en `constants/pagos.js`; extraer ahí también el mapa de estados `ESTADO_CONFIG` que hoy vive en `HistorialPagosCard.jsx:7-14`), estado de error.
- **Estados de UI:** loading (skeleton), vacío (`EmptyState`), error (`EmptyState` + botón Reintentar), éxito.
- **Textos:** "Vence el 30 de noviembre de 2026", "Tu plan venció el 30 de octubre de 2026. Renovalo desde acá.", "Ver más pagos".
- **Responsive:** diseñar primero a 375 px (MemberLayout), a 768 px dos columnas como el dashboard actual (`lg:grid-cols-2`).

## 8. Archivos a crear / modificar
- Backend: `memberships/serializers.py` (`ultima_membresia`), `classes/views.py` (+ serializer liviano) y tests; opcional paginación global `core/settings/base.py`.
- Frontend: `utils/format.js` (+test), `hooks/queries/useMembresias.js`/`useDashboardData.js` (unificar), `SocioDashboardView.jsx`, `CredencialDigitalPage.jsx`, `MemberPlanDetails.jsx`, `MembershipExpiredAlert.jsx`, `HistorialPagosPage.jsx`, `useMisPagos.js`, y sus tests existentes (`SocioDashboardView.test.jsx`, `CredencialDigitalPage.test.jsx`, `MemberPlanDetails.test.jsx`, `MembershipExpiredAlert.test.jsx`).

## 9. Plan de pruebas (TDD)
**Backend** (`memberships/tests/test_me_views.py`, `APITestCase`, `make_*_factory`; `classes/tests/`): `test_me_incluye_ultima_membresia_vencida`; `test_me_ultima_membresia_null_sin_historial`; `test_mis_reservas_solo_del_socio` (otro socio no aparece; `en_espera` distinguible; orden por `proxima_fecha`); `test_mis_reservas_rol_staff_403`.
Comando: `cd backend && pytest -q apps/memberships apps/classes`.
**Frontend** (Vitest + RTL; mocks de hooks con `vi.mock`): 
- `format.test.js`: `formatFecha('2026-11-30')` ⇒ "30 de noviembre de 2026" sin corrimiento (probar con `TZ=America/Argentina/Buenos_Aires` y `UTC`).
- Dashboard: `isError` ⇒ mensaje + Reintentar; sin membresía ⇒ botón Renovar; fecha formateada.
- Credencial: vencida ⇒ alerta con la fecha de `ultima_membresia` y link a `/socio/checkout`.
- Pagos: `next` ⇒ "Ver más"; etiquetas "Aprobado/MercadoPago".
Comando: `cd frontend && npx vitest run src/pages/socio src/components/socio src/components/dashboard src/utils && npm run lint`.
**Manual:** `socio.vencido@winnie.local` (seed) → `/socio/credencial`: alerta con fecha real y "Renovar ahora"; apagar el backend y recargar `/dashboard`: se ve el error con Reintentar; `socio.activo@winnie.local` con >10 pagos: "Ver más".

## 10. Criterios de aceptación
- **Dado** una membresía que vence el 2026-11-30 **cuando** el socio abre dashboard o credencial **entonces** ve "30 de noviembre de 2026" (no `2026-11-30`) en cualquier zona horaria.
- **Dado** una membresía vencida **cuando** abre la credencial **entonces** ve cuándo venció y un botón que lo lleva a `/socio/checkout`.
- **Dado** un fallo del backend **cuando** abre el dashboard **entonces** ve un error con "Reintentar" (no "Sin membresía activa").
- **Dado** más de 10 pagos **cuando** abre Mis Pagos **entonces** puede ver los siguientes.
- Las próximas clases reservadas aparecen aunque estén fuera de las primeras 10 de la grilla.

## 11. Riesgos y decisiones abiertas
1. ¿Paginación global con `page_size` o solo endpoint específico para reservas? (Recomendado: ambos; el global es una línea y evita 3 bugs afines; ver informe a BK-PLT/BK-CLS.)
2. "Sede": ¿el gimnasio es de una sola sede? (Recomendado: mostrar `nombre_gym`; eliminar el concepto de sede.)
3. ¿`/socio/pagos` pasa a `MemberLayout`? (Recomendado: sí, consistencia mobile-first.)
4. Los administradores entran a `/socio/credencial` (`roles` incluye `administrador`) y ven "Vista de Administrador": ¿se mantiene? (Recomendado: sí, sin cambios.)

## 12. Referencias
- `speckit/spec.md` REQ-3.3 (historial de pagos self-service); `docs/qa/plan-de-pruebas.md` (flujo "Verificar historial de pagos en `/socio/pagos`").
- Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", Mobile → Dashboard / Credencial / Mis Pagos.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1/DRF; React 18 + react-query v5 + Tailwind). Mejorá el portal del socio sin tocar el apto médico (BK-SOC-06) ni el estado suspendido/baja (BK-SOC-08).
Hechos verificados: /api/memberships/me/ (backend/apps/memberships/serializers.py:59-92) solo devuelve membresia_activa (estado='activa'); SocioDashboardView.jsx imprime fecha_fin cruda y no maneja error; CredencialDigitalPage.jsx pierde la fecha al vencer, tiene 'Sede Central' hardcodeado y 'Cargando...' plano; useSocioUpcomingClasses (hooks/queries/useDashboardData.js:67) pide /classes/clases/?page_size=1000 pero la paginación global de DRF ignora page_size (solo SocioPagination lo soporta) ⇒ solo ve 10 clases; HistorialPagosPage.jsx/useMisPagos.js ignoran `next`; hay dos hooks para /memberships/me/ con distinta key (['socioMembership'] y ['membresias','me']).
TDD primero: backend (memberships/tests/test_me_views.py: ultima_membresia; classes/tests: GET /api/classes/clases/mis-reservas/ IsSocio con proxima_fecha usando _next_clase_datetime) y frontend (utils/format.test.js sin corrimiento de zona horaria; tests de dashboard, credencial, MemberPlanDetails, MembershipExpiredAlert y HistorialPagosPage para error/vacío/paginación). Luego implementá: formatFecha parseando YYYY-MM-DD como fecha local; un solo hook useSocioMe (key ['socio','me']); estados de error con Reintentar; CTA Renovar a /socio/checkout; próximas clases desde el endpoint nuevo mostrando día y hora; Mis Pagos con MemberLayout, 'Ver más' y etiquetas compartidas (constants/pagos.js); reemplazá 'Sede Central' por el nombre del gimnasio de GET /api/config/gym/.
Terminado: pytest -q apps/memberships apps/classes y npx vitest run && npm run lint verdes. Textos en español rioplatense. Sin commits.
```
