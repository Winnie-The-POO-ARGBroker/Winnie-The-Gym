---
id: BK-ACC-04
titulo: Pestaña "Actividad" en el detalle del socio (staff) y "Mi actividad" para el socio
tipo: feature
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: M
estado_en_codigo: backend-sin-ui
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-ACC-03, BK-ACC-05]
---

# BK-ACC-04 · Actividad del socio (vista staff y vista del propio socio)

## 1. Resumen
`SocioDetailModal` tiene pestañas Datos / Membresías / Pagos pero nada de asistencias, aunque el backend ya guarda cada acceso y ya filtra por usuario. El socio, por su parte, solo ve un número ("Asistencias este mes") en su dashboard, sin detalle ni historial, y el endpoint de logs que podría servirle le devuelve datos internos (`scanned_by_email`, `qr_jti`).

## 2. Objetivo de usuario
- Como **recepcionista/administrador** quiero **ver en el detalle de un socio sus últimos accesos (permitidos y rechazados) y su frecuencia del mes** para **atender reclamos ("me rebotó el QR") y detectar inactividad/abuso**.
- Como **socio** quiero **ver mis asistencias y mis rechazos recientes con el motivo** para **entender por qué no pude entrar y llevar mi constancia**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Frontend modal | `frontend/src/components/admin/SocioDetailModal.jsx:24-28` | `TABS = [datos, membresias, pagos]`. |
| Frontend modal | `SocioDetailModal.jsx:143-183` / `187-233` | `TabMembresias({socioId})`, `TabPagos({socioId})`: patrón (hook de query → skeleton `h-14 rounded-xl` → `EmptyState` inline → lista de tarjetas `p-3 rounded-xl bg-bg-raised border border-subtle`). |
| Frontend modal | `SocioDetailModal.jsx:236,276-298` | `activeTab` en `useState('datos')`; botones de pestaña y render condicional `{activeTab === 'pagos' && <TabPagos socioId={socio.id} />}`. |
| Frontend uso | `frontend/src/pages/admin/AdminSociosPage.jsx:330`, `frontend/src/pages/recepcion/GestionSociosPage.jsx:281` | Ambas páginas montan el modal con el `socio` de la lista (`SocioSerializer`). |
| Backend socio | `backend/apps/members/serializers.py:23-35` | `SocioSerializer.fields` incluye `id`, **`usuario`** (id del `User`), `email`, `numero_socio`, `nombre`, `apellido`, `dni`, `estado`... → alcanza para filtrar logs por `user=<socio.usuario>`. |
| Backend logs | `backend/apps/access/filters.py:12-17` | Filtro `user` (`exact`) = id de `User`. **No** existe filtro por id de Socio (ver BK-ACC-03). |
| Backend logs | `backend/apps/access/views.py:245-261` | Socio: `base_qs.filter(user=user)` (ownership). Devuelve el mismo `AccessLogSerializer` que a staff. |
| Backend serializer | `backend/apps/access/serializers.py:34-59` | Expone al socio `scanned_by`/`scanned_by_email` (mail del recepcionista) y `qr_jti` (identificador interno del QR). No es necesario para "mi actividad". |
| Backend agregado | `backend/apps/memberships/serializers.py:70-91` | `GET /api/memberships/me/` ya devuelve `asistencias_mes` (ENTRY GRANTED desde el día 1 del mes local). |
| Frontend socio | `frontend/src/components/dashboard/views/SocioDashboardView.jsx:53-65` | Muestra "Asistencias este mes: {membershipData?.asistencias_mes ?? '--'}" sin link ni detalle. |
| Frontend nav socio | `frontend/src/components/layout/Sidebar.jsx:36-42`; `frontend/src/components/layout/MemberLayout.jsx:64-181` | Sidebar socio: Dashboard, Mi Credencial, Clases, Mis Pagos, Pagar membresía. `MemberLayout` tiene una barra inferior propia con 5 ítems fijos (`NavLink`); `AppBottomNav` no tiene entrada `socio` (devuelve `null`). |
| Frontend rutas socio | `frontend/src/App.jsx:130-134` | `/socio/credencial`, `/socio/clases`, `/socio/checkout` (solo socio), `/socio/pagos` (solo socio). No hay `/socio/actividad`. |

## 4. Alcance
**Incluye:**
- Staff: pestaña "Actividad" en `SocioDetailModal` con resumen (accesos del mes, último acceso, rechazos del mes) y lista paginada de los últimos movimientos con resultado y motivo.
- Socio: endpoint propio sin datos internos y página `/socio/actividad` con la misma lista y el resumen mensual; entrada desde el dashboard.
- Serializer reducido para el socio.

**No incluye:** historial global (BK-ACC-03), reservas de clases (área CLS), gráficos de frecuencia (BK-ACC-08), notificaciones push.

## 5. Contrato de API
**[EXISTE] `GET /api/access/logs/?user=<socio.usuario>&page_size=20&ordering=-timestamp`** — `IsAuthenticated`; staff puede ver cualquier usuario. Usa el filtro `user` actual. Requiere el `page_size` de BK-ACC-03 (hoy se ignora; sin él devuelve 10 filas).
Resumen mensual del socio (staff) sin endpoint nuevo: `GET /api/access/logs/?user=<id>&status=GRANTED&access_type=ENTRY&fecha_desde=<YYYY-MM-01>&page_size=1` y leer `count`; rechazos: `status=DENIED`.

**[A CREAR] `GET /api/access/me/`** — permiso `IsSocio` (`backend/apps/access/permissions.py:22-32`: rol socio + `hasattr(user,'socio')`), en `backend/apps/access/views.py` + ruta en `urls.py` (`path('me/', MyAccessLogListView.as_view(), name='access-me')`).
- Queryset: `AccessLog.objects.filter(user=request.user)`; paginación `AccessLogPagination` (BK-ACC-03); filtros `fecha_desde`, `fecha_hasta`, `status`, `access_type`.
- Serializer **[A CREAR]** `MyAccessLogSerializer` con solo: `id, timestamp, access_type, access_type_display, status, status_display, denial_reason, denial_reason_display`.
- Response: `{ count, next, previous, results: [...] }`. 403 si no es socio (`{"detail": "You do not have permission to perform this action."}`), 401 sin token.
- Opcional **[A CREAR]** `GET /api/access/me/summary/` → `{ "asistencias_mes": int, "rechazos_mes": int, "ultimo_acceso": ISO|null, "racha_semanas": int }` (propuesta; `racha_semanas` es decisión abierta).

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
**Staff (modal)**
- Agregar `{ key: 'actividad', label: 'Actividad' }` a `TABS` (`SocioDetailModal.jsx:24-28`) y `{activeTab === 'actividad' && <TabActividad usuarioId={socio.usuario} />}` en el bloque de contenido (líneas 294-298). **Ojo:** `socio.id` ≠ `socio.usuario`; las otras pestañas usan `socio.id`, esta usa `socio.usuario`.
- `TabActividad` (mismo archivo, mismo estilo que `TabPagos`): hook `useAccessLogsList({ user: usuarioId, pageSize: 20, ordering: '-timestamp' })` (de BK-ACC-03). Encabezado con 3 mini-KPIs (Accesos del mes, Rechazos del mes, Último acceso) y lista de filas: ícono ↗/↙ (`lucide-react` `ArrowUpRight`/`ArrowDownLeft`), "Entrada"/"Salida", fecha y hora `es-AR`, `Badge` Permitido/Denegado + motivo (`denial_reason_display`). Botón "Ver todo el historial" → `/recepcion/accesos?socio=<socio.id>`.
- Estados: loading = 2-3 `Skeleton h-14 rounded-xl`; vacío = ícono `Activity` + "Este socio todavía no registra accesos."; error = texto + "Reintentar".
**Socio**
- Ruta nueva en `App.jsx` (junto a línea 133): `<Route path="/socio/actividad" element={<ProtectedRoute roles={['socio']}><MiActividadPage /></ProtectedRoute>} />`.
- Página `frontend/src/pages/socio/MiActividadPage.jsx` con `MemberLayout title="Mi actividad" subtitle="Tus ingresos al gimnasio"` (patrón de `CredencialDigitalPage.jsx`).
- Hook `useMyAccessLogs(params)` en `frontend/src/hooks/queries/useAccessLogsList.js` → `api.get('/access/me/', { params })`.
- Hacer clickeable la tarjeta "Asistencias este mes" del dashboard (`SocioDashboardView.jsx:53-65`) hacia `/socio/actividad`; agregar "Mi actividad" al `NAV_BY_ROLE.socio` del Sidebar (escritorio). En mobile no se agrega un 6° ítem a la barra inferior de `MemberLayout` (ya tiene 5): se accede desde el dashboard.
- Textos (voseo): "Mi actividad", "Ingresaste 12 veces este mes", "Tu último ingreso fue el martes 13 a las 18:42", "Rechazado — tu membresía estaba vencida", vacío: "Todavía no registramos ingresos. ¡Te esperamos!".
- Responsive: lista de tarjetas en una columna a 375 px; a 768 px se mantiene `max-w` de `MemberLayout`.

## 8. Archivos a crear / modificar
- `backend/apps/access/{views,serializers,urls}.py` — `MyAccessLogListView`, `MyAccessLogSerializer`.
- `backend/apps/access/tests/test_my_access.py` — nuevo.
- `frontend/src/components/admin/SocioDetailModal.jsx` (+ `SocioDetailModal.test.jsx`) — pestaña.
- `frontend/src/hooks/queries/useAccessLogsList.js` — `useMyAccessLogs`.
- `frontend/src/pages/socio/MiActividadPage.jsx` (+ test), `App.jsx`, `Sidebar.jsx`, `SocioDashboardView.jsx`.

## 9. Plan de pruebas (TDD)
Backend (`pytest apps/access -q`; `APITestCase`; factories `make_user_factory/make_socio_factory`):
1. Socio A pide `/api/access/me/` y solo ve sus logs; no aparece `scanned_by_email` ni `qr_jti` en el JSON.
2. Rol recepcionista/administrador → 403 en `/api/access/me/`; sin token → 401.
3. Incluye DENIED con `denial_reason_display` ("Membresía inactiva o cuota vencida").
4. `?fecha_desde=` filtra.
5. Staff: `GET /api/access/logs/?user=<id>` solo trae ese usuario (regresión del filtro existente).
Frontend (Vitest/RTL; `SocioDetailModal.test.jsx` ya existe — ver cómo mockea hooks `useMembresiasPorSocio`/`usePagosPorSocio`):
0. Helpers de test del repo: `renderWithProviders`/`resetAllStores` de `frontend/src/test/test-utils`; el test del modal mockea `../../hooks/queries/useMembresias`, `usePagos` y `../ui/Modal` con `vi.mock` (`SocioDetailModal.test.jsx:9-30`): agregar un `vi.mock` equivalente para `useAccessLogsList`.
1. Al hacer clic en la pestaña "Actividad" se llama a `api.get('/access/logs/', { params: expect.objectContaining({ user: socio.usuario }) })` y no con `socio.id`.
2. Estados skeleton / vacío / lista / error.
3. `MiActividadPage`: renderiza lista y el estado vacío con el copy de arriba; un rol no-socio es redirigido por `ProtectedRoute`.
Manual: `recepcion@winnie.local` → Socios → "Carlos Activo" → Actividad; `socio.activo@winnie.local` → Dashboard → tarjeta de asistencias.

## 10. Criterios de aceptación
- **Dado** un socio con 3 ingresos y 1 rechazo, **cuando** recepción abre su detalle → Actividad, **entonces** ve las 4 filas ordenadas por fecha descendente con resultado y motivo.
- **Dado** un socio autenticado, **cuando** abre "Mi actividad", **entonces** solo ve sus propios movimientos y no ve datos del recepcionista que escaneó ni el identificador del QR.
- **Dado** un socio sin movimientos, **cuando** abre la pantalla, **entonces** ve el estado vacío amigable y no un error.

## 11. Riesgos y decisiones abiertas
- ¿El socio debe ver sus rechazos? Recomendación: sí, con motivo legible; reduce consultas en recepción.
- ¿Mostrar permanencia (tiempo adentro) al socio? Recomendación: dejarlo para cuando el anti-passback (BK-ACC-02) garantice pares ENTRY/EXIT confiables.
- `racha_semanas` y gamificación: idea (P3), no incluir sin validación de producto.
- Si BK-ACC-03 todavía no está, `TabActividad` puede usar `?user=` con el `PAGE_SIZE` de 10 y un link al historial.

## 12. Referencias
- `docs/qa/plan-de-pruebas.md` (credencial y panel del socio), `openspec/changes/socios-membresias/` (specs del detalle de socio; leer si se necesita contexto del modal).
- Figma (opcional): "vistas live" → Admin/Recepción → Socios → detalle.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django+DRF /backend, React 18+Vite+TanStack Query v5+Vitest /frontend). Implementá docs/backlog/items/BK-ACC-04-actividad-del-socio.md. Asumí que BK-ACC-03 ya agregó `page_size` a GET /api/access/logs/ y el hook frontend/src/hooks/queries/useAccessLogsList.js (si no existe, crealo siguiendo hooks/queries/useSociosData.js).
Backend (tests primero en backend/apps/access/tests/test_my_access.py): GET /api/access/me/ con permiso IsSocio (apps/access/permissions.py), MyAccessLogSerializer con solo id,timestamp,access_type(+_display),status(+_display),denial_reason(+_display); sin scanned_by_email ni qr_jti; paginado.
Frontend (tests RTL primero): pestaña "Actividad" en components/admin/SocioDetailModal.jsx usando socio.usuario (NO socio.id) para ?user=; página pages/socio/MiActividadPage.jsx con MemberLayout; ruta /socio/actividad con <ProtectedRoute roles={['socio']}> en App.jsx; link desde la tarjeta "Asistencias este mes" de components/dashboard/views/SocioDashboardView.jsx y entrada en Sidebar (solo desktop).
UI en español rioplatense (voseo), código en inglés. No toques backend/loadtests ni hooks/useScreenWakeLock.js.
Terminado: pytest -q (cov>=80%) y `npx vitest run --coverage && npm run lint` en verde.
```
