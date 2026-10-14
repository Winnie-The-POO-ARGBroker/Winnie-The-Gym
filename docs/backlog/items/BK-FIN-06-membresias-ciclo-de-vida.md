---
id: BK-FIN-06
titulo: Gestión del ciclo de vida de membresías desde la UI (suspender, reactivar, cancelar, renovar, congelar)
tipo: feature
roles: [administrador, recepcionista]
prioridad: P1
tamano: XL
estado_en_codigo: backend-sin-ui
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-FIN-05, BK-FIN-07, BK-FIN-09]
---

# BK-FIN-06 · Ciclo de vida de membresías desde la UI

## 1. Resumen
El backend permite cambiar el `estado` de una membresía con `PATCH` (solo admin) pero no hay acciones de dominio (`suspender`, `reactivar`, `cancelar`, `renovar`), ni validación de transiciones, ni la regla "una sola membresía activa por socio" que exige el spec; el frontend solo **lee** membresías. Un socio que paga y se va de vacaciones, o que debe ser dado de baja con reembolso, no se puede gestionar sin entrar al Django admin. "Congelar" no existe en ningún lado.

## 2. Objetivo de usuario
Como **recepcionista/administrador** quiero **suspender, reactivar, cancelar y renovar la membresía de un socio desde su ficha** para **controlar su acceso al gimnasio y su facturación sin tocar la base**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/memberships/models.py:27-65` | `Membresia` con `estado` `activa/vencida/suspendida/cancelada/pendiente_pago` (esta última "reserved - never writable via API", línea 34), `fecha_inicio`, `fecha_fin`, `avisos_enviados` (JSON de avisos de vencimiento). **Sin** motivo, fecha de suspensión, quién cambió el estado ni noción de "congelada". Sin constraint de unicidad de membresía activa por socio. |
| Backend vista | `backend/apps/memberships/views.py:51-65` | `MembresiaViewSet(ModelViewSet)`: `create/update/partial_update/destroy` -> `IsAdminOnly`; `list/retrieve` -> `IsReceptionistOrAdmin`. **No hay `@action`** de suspender/cancelar/renovar. La recepcionista no puede cambiar estados. |
| Backend serializer | `backend/apps/memberships/serializers.py:10,31-52` | `WRITABLE_ESTADO_VALUES = ('activa','vencida','suspendida','cancelada')`; `PATCH {estado}` acepta cualquiera de esos desde cualquier estado (p. ej. `cancelada -> activa`, `vencida -> activa` sin tocar `fecha_fin`). `create` fuerza `estado='activa'` y calcula `fecha_fin`. |
| Spec | `openspec/changes/socios-membresias/spec.md:188` | "A socio MUST NOT have two concurrent memberships with `estado=activa`." **No está implementado**: ni validación en `create`/`PATCH` ni constraint (`rg` sin resultados en `backend/apps/memberships/*.py` y tests). |
| Backend auto-renovación | `backend/apps/memberships/services.py:7-36` | `renovar_membresia(socio, plan, fecha_inicio=None)`: marca todas las `activa` como `vencida` y crea una nueva `activa`. Solo lo invoca `MeRenewView` (`views.py:95-106`); ver BK-FIN-07. |
| Acceso | `backend/apps/access/services.py:170-217` | `has_active_membership` exige `Socio.estado='activo'` + `Membresia.estado='activa'` + `fecha_fin >= hoy`. `suspendida`/`cancelada`/`vencida` => acceso denegado (`MEMBERSHIP_INACTIVE`, `backend/apps/access/views.py:96-98`). Es decir: suspender o cancelar corta el ingreso al instante en el próximo escaneo. |
| Aforo | `backend/apps/access/services.py` (aforo) | El conteo de aforo sale de `AccessLog` (entradas/salidas); cambiar la membresía no expulsa a quien ya está adentro. **No verificado** en detalle (no se leyó la lógica completa del cálculo de aforo). |
| Clases | `rg -n "membres" backend/apps/classes/*.py` | **Sin resultados**: las reservas de clases no validan membresía. Qué hacer con reservas futuras al suspender/cancelar es una decisión abierta (BK-CLS-xx). |
| Socio baja | `backend/apps/members/services.py:48-55` | `dar_baja` solo marca `Socio.estado='baja'` y `fecha_baja`; **no** cancela la membresía: queda `activa` y sigue contando en `socios_activos` del plan (`serializers.py:20-21`) y en reportes. |
| Credencial | `backend/apps/memberships/serializers.py:77-79`, `frontend/src/pages/socio/CredencialDigitalPage.jsx:61` | `membresia_activa` solo devuelve `activa`; un socio con membresía `suspendida` ve "No tienes un plan activo" y `isExpired=true` (indistinguible de vencida). |
| Frontend lectura | `frontend/src/hooks/queries/useMembresias.js:33-44,50-64` | Solo `GET` (`useMembresiasPorSocio`, `useMembresiaActivaDeSocio`, `useSocioMembresiaMe`). Ninguna mutation de membresías. |
| Frontend UI | `frontend/src/components/admin/SocioDetailModal.jsx:143-183` | Pestaña "Membresías" de la ficha: lista solo lectura (plan, fechas, badge), sin acciones. |
| Frontend nav | `frontend/src/App.jsx:96`, `components/layout/Sidebar.jsx:16` | "Membresías" del menú admin apunta a `/membresias`, que redirige a `/admin/planes` (catálogo de planes, no membresías de socios). No existe pantalla de membresías de socios. |
| Frontend alta | `frontend/src/pages/recepcion/gestionSocios.schema.js:8-25`, `components/recepcion/PlanPagoCard.jsx:17-18` | El formulario de alta de socio incluye "Plan y pago" con planes **hardcodeados** (`Básico/Premium/Gold`, precios fijos), `cuota`, `cobro` y "Renovación automática": se envía todo a `POST /members/socios/` (`sociosService.js:49-51`) pero el backend ignora esos campos; **nunca se crea una membresía al dar de alta**. No hay renovación automática en el sistema (se menciona en la UI pero no existe). |
| Auditoría | `backend/apps/common/audit.py:164-171` | Cambios en `Membresia` quedan en Mongo (`audit_logs`) con actor, pero no hay API/UI para consultarlos (**No verificado** ningún endpoint de lectura de `audit_logs`). |

## 4. Alcance
**Incluye:**
- Acciones de dominio en `MembresiaViewSet`: `suspender`, `reactivar`, `cancelar` y `renovar` (cobro asociado en BK-FIN-09 / BK-FIN-07), con tabla de transiciones válidas y `400` ante transiciones inválidas.
- Regla "una sola membresía activa por socio" (validación + constraint parcial).
- Campos de auditoría de estado (motivo, quién, cuándo) y fecha de suspensión.
- Efecto sobre `fecha_fin` al reactivar (congelamiento, decisión abierta 1).
- UI: acciones por fila en la pestaña Membresías de la ficha y pantalla `/admin/membresias` con filtros (estado, plan, vencimiento).
- `SocioMeSerializer`: exponer `ultima_membresia` y estado para que el socio vea "Suspendida" y no "Vencida".
- `dar_baja` cancela las membresías activas/suspendidas del socio.

**No incluye:** cobro de renovación (BK-FIN-09), política de apilado de días (BK-FIN-07), reservas de clases (BK-CLS-xx), recordatorios (BK-FIN-03), la UI de alta de socio con plan (BK-SOC-xx probable; se documenta como hallazgo).

## 5. Contrato de API
Base: `/api/memberships/membresias/{id}/` — **[A CREAR]** acciones POST en `MembresiaViewSet` (`@action(detail=True, methods=['post'], url_path=...)`, mismo patrón que `SocioViewSet.dar_baja`, `backend/apps/members/views.py:56-69`).

| Acción | Permiso | Body | Transición | Efecto |
|---|---|---|---|---|
| `POST .../suspender/` | `IsReceptionistOrAdmin` | `{ "motivo": "str<=200 (obligatorio)", "hasta": "YYYY-MM-DD (opcional)" }` | `activa -> suspendida` | guarda `suspendida_desde=hoy`; acceso denegado desde el próximo escaneo |
| `POST .../reactivar/` | `IsReceptionistOrAdmin` | `{ "extender_vencimiento": true }` | `suspendida -> activa` | si `extender_vencimiento`, `fecha_fin += (hoy - suspendida_desde)` (congelamiento); si `fecha_fin < hoy` tras el cálculo -> `400` "La membresía ya venció; renovala." |
| `POST .../cancelar/` | `IsAdminOnly` | `{ "motivo": "str<=200 (obligatorio)" }` | `activa|suspendida -> cancelada` | terminal; no se puede reactivar (hay que crear nueva) |
| `POST .../renovar/` | `IsReceptionistOrAdmin` | `{ "plan_id": int (opcional, default plan actual), "pago_id": int (opcional) }` | crea nueva `activa` (política en BK-FIN-07) | si no hay `pago_id`, solo admin y con `motivo` ("cortesía"); preferir usar `POST /api/payments/cobros-manuales/` (BK-FIN-09) |

Respuesta `200`: `MembresiaDetailSerializer` (`serializers.py:55-56`). Errores: `400` `{"detail": "Transición no permitida: cancelada -> activa."}` (convención de `dar_baja`: `{'detail': ...}` + 400, `members/views.py:60-64`); `403` `{"detail": "..."}`; `404`.
**[EXISTE → RESTRINGIR]** `PATCH /api/memberships/membresias/{id}/` con `estado`: pasar a validar transiciones (o dejar `estado` read-only en `update` y forzar las acciones). Verificar con tests existentes (`backend/apps/memberships/tests/test_membresias_views.py`) antes de cambiar.
**[A CREAR]** `GET /api/memberships/membresias/?estado=&plan=&socio=&vence_desde=&vence_hasta=&inicio_desde=&inicio_hasta=&search=` — los filtros ya existen (`filters.py:18-30`); agregar `search` (`socio__nombre`, `socio__apellido`, `socio__dni`) y `page_size` (ver BK-FIN-04/05).

## 6. Modelo de datos (propuesta)
Migración `memberships/0006_...` (**usar el siguiente número libre**; BK-FIN-03 también agrega una migración de datos):
- `Membresia.motivo_estado = CharField(max_length=200, blank=True, default='')`
- `Membresia.estado_cambiado_en = DateTimeField(null=True, blank=True)`
- `Membresia.estado_cambiado_por = ForeignKey('users.User', null=True, blank=True, on_delete=SET_NULL, related_name='+')`
- `Membresia.suspendida_desde = DateField(null=True, blank=True)`
- Constraint: `UniqueConstraint(fields=['socio'], condition=Q(estado='activa'), name='uniq_membresia_activa_por_socio')`. **Riesgo:** si hoy hay duplicados en la base, la migración falla; incluir una migración de datos previa que deje la de `fecha_fin` más alta como `activa` y las otras `vencida`, y auditar.
Reglas de transición en `services.py` (`MembresiaTransitionError`), no en el serializer. Efecto lateral: emitir el `post_save` ya auditado (`common/audit.py`).

## 7. Diseño frontend
- **Rutas/guard:** nueva `<Route path="/admin/membresias" element={<ProtectedRoute roles={['administrador','recepcionista']}><AdminMembresiasPage /></ProtectedRoute>} />` en `App.jsx`, reemplazando la redirección de `App.jsx:96` (`/membresias`); ajustar el ítem "Membresías" del menú admin (`Sidebar.jsx:16`) y agregarlo al menú recepcionista (`Sidebar.jsx:31-39`).
- **Reutilizar:** `SocioDetailModal` (pestaña `TabMembresias`), `DataTable`, `Pagination`, `Modal` (props `isOpen`, `onClose`, `title`, `description`, `icon`, `maxWidth`), `Button` (`variant`, `size`, `loading`), `Select`, `Input`, `Badge` con el mapa de BK-FIN-05, `usePlanes`.
- **Hooks nuevos** en `hooks/queries/useMembresias.js`: `useMembresiasList(params)`, `useMembresiaAccion()` que devuelve `{suspender, reactivar, cancelar, renovar}` (`useMutation` cada una; `onSuccess` invalida `MEMBRESIAS_QUERY_KEYS` (`['membresias', ...]`), `['socios']` (`SOCIOS_QUERY_KEYS`, `useSociosData.js:16-23`), `['dashboardAlerts']`, `REPORTES_QUERY_KEY`; `onError` -> `toast.error(detail)` con el helper `extractErrorMessage` usado en `usePagos.js:28-30`).
- **Componentes nuevos:** `components/admin/MembresiaAccionesMenu.jsx` (botones según estado: activa -> Suspender / Cancelar / Renovar; suspendida -> Reactivar / Cancelar; vencida -> Renovar; cancelada -> sin acciones) y `components/admin/ConfirmarAccionMembresiaModal.jsx` (motivo obligatorio con `react-hook-form` + `zod`, igual que `gestionSocios.schema.js`).
- **Estados:** loading (skeletons existentes), vacío ("Este socio no tiene membresías"), error (toast con el `detail`), éxito (toast "Membresía suspendida" / "reactivada" / "cancelada" / "renovada"). Confirmación obligatoria antes de cancelar ("Esta acción no se puede deshacer").
- **Textos (voseo):** "Suspender membresía", "El socio no podrá ingresar hasta que la reactives.", "Motivo (obligatorio)", "Reactivar y extender el vencimiento por los días suspendidos", "Cancelar membresía".
- **Responsive:** 375 px: acciones en menú desplegable por tarjeta; 768 px: tabla con columna de acciones (`DataTable renderActions`).

## 8. Archivos a crear / modificar
- Backend: `memberships/models.py` + migración, `memberships/services.py` (`suspender_membresia`, `reactivar_membresia`, `cancelar_membresia`, errores de transición), `memberships/views.py` (acciones), `memberships/serializers.py` (campos de solo lectura + `AccionMembresiaSerializer`), `memberships/filters.py` (`search`), `members/services.py::dar_baja` (cancelar membresías), `memberships/serializers.py::SocioMeSerializer` (`ultima_membresia`).
- Tests backend: `memberships/tests/test_membresia_acciones.py` (nuevo), ampliar `test_membresias_views.py`, `access/tests` (acceso denegado tras suspender).
- Frontend: `pages/admin/AdminMembresiasPage.jsx`, `components/admin/MembresiaAccionesMenu.jsx`, `ConfirmarAccionMembresiaModal.jsx`, `SocioDetailModal.jsx`, `hooks/queries/useMembresias.js`, `App.jsx`, `Sidebar.jsx`, `components/socio/MembershipExpiredAlert.jsx` (estado suspendida), tests correspondientes.

## 9. Plan de pruebas (TDD)
**Backend** (`cd backend && pytest -q apps/memberships/tests apps/access/tests`; `APITestCase` + `RefreshToken`, factories `conftest.py:23-75`; `make_membresia_factory(socio, plan, estado=..., fecha_fin=...)`):
1. Transiciones felices: `activa->suspendida` (guarda `suspendida_desde`, `estado_cambiado_por`), `suspendida->activa`, `activa->cancelada`.
2. Transiciones inválidas: `cancelada->activa`, `vencida->suspendida`, `suspendida->suspendida` -> `400` con `detail`.
3. Permisos: recepcionista puede suspender/reactivar; `cancelar` -> `403` para recepcionista; `socio` -> `403` en todas; anónimo `401`.
4. `reactivar` con `extender_vencimiento`: `fecha_fin` aumenta exactamente los días suspendidos; si `fecha_fin` resultante `< hoy` -> `400`.
5. Constraint: crear/activar una segunda membresía `activa` del mismo socio -> `400` (API) / `IntegrityError` (modelo).
6. Efecto de acceso: tras `suspender`, `POST /api/access/qr/scan/` del socio devuelve denegado (`MEMBERSHIP_INACTIVE`); tras `reactivar`, permitido.
7. `dar_baja` cancela las membresías vigentes del socio.
8. Auditoría: el `post_save` dispara `log_audit_event` (mock de `core.mongodb.log_audit_event`; ver `apps/common/tests/test_audit.py` como molde).
**Frontend** (`npx vitest run src/components/admin src/pages/admin src/hooks/queries`): menú de acciones según estado; modal exige motivo; éxito invalida queries; error muestra toast; ficha refleja el nuevo estado; guard de rutas.
**Manual:** admin suspende a `socio.activo@winnie.local`, con ese socio intentar QR (recepción) -> denegado; reactivar -> permitido.

## 10. Criterios de aceptación
- **Dado** una membresía activa **cuando** la suspendo con motivo **entonces** el socio no puede ingresar y la ficha muestra "Suspendida".
- **Dado** una membresía suspendida 10 días **cuando** la reactivo con extensión **entonces** `fecha_fin` se corre 10 días.
- **Dado** una membresía cancelada **cuando** intento reactivarla **entonces** veo un error y no cambia.
- **Dado** que un socio ya tiene una membresía activa **cuando** intento crear otra activa **entonces** el sistema lo rechaza.
- **Dado** un socio dado de baja **entonces** sus membresías quedan canceladas y no cuentan en `socios_activos`.

## 11. Riesgos y decisiones abiertas
1. **Congelamiento:** ¿la suspensión "pausa" el reloj (se extiende `fecha_fin`) o es solo un bloqueo administrativo? Recomendación: dos conceptos: `suspender` = bloqueo (no extiende) y `congelar` = pausa con extensión, con tope de días por año (a definir con el dueño).
2. ¿La recepcionista puede cancelar? Recomendación: no (admin), porque implica potencial reembolso.
3. ¿Qué pasa con las reservas de clases futuras al suspender/cancelar? Hoy las clases no miran la membresía; coordinar con área CLS.
4. Constraint de unicidad: requiere limpieza previa de datos duplicados (verificar en producción antes de migrar).
5. ¿Cancelar implica reembolso? Fuera de alcance; enlazar con BK-FIN-08/09.
6. Transiciones por PATCH: ¿se deshabilitan? Riesgo de romper clientes/tests actuales.

## 12. Referencias
- `openspec/changes/socios-membresias/spec.md:186-215` (Membresia CRUD), `design.md:385,497`, `proposal.md:12`.
- `docs/architecture.md` (flujo de acceso por QR).
- Figma (solo apoyo visual opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", Admin/Socios, ficha con pestaña Membresías.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5/DRF + React/Vite). TDD estricto; implementá docs/backlog/items/BK-FIN-06-membresias-ciclo-de-vida.md.

Backend (backend/apps/memberships): agregá a Membresia motivo_estado, estado_cambiado_en, estado_cambiado_por (FK users.User SET_NULL), suspendida_desde, más UniqueConstraint parcial (socio, condition estado='activa') con migración (siguiente número libre tras 0005_add_es_popular.py; incluí migración de datos que resuelva duplicados). En services.py implementá suspender_membresia, reactivar_membresia (extiende fecha_fin por los días suspendidos si se pide) y cancelar_membresia con tabla de transiciones y MembresiaTransitionError. En views.py agregá @action POST suspender/reactivar/cancelar/renovar al MembresiaViewSet (suspender/reactivar: IsReceptionistOrAdmin; cancelar: IsAdminOnly; errores 400 {'detail': ...}, patrón de SocioViewSet.dar_baja en apps/members/views.py:56-69). dar_baja (apps/members/services.py) debe cancelar las membresías vigentes. SocioMeSerializer expone ultima_membresia.
Frontend: hooks en src/hooks/queries/useMembresias.js (useMembresiasList, useMembresiaAccion con invalidación de ['membresias'], ['socios'], ['dashboardAlerts'] y REPORTES_QUERY_KEY), componentes MembresiaAccionesMenu y ConfirmarAccionMembresiaModal (react-hook-form+zod, motivo obligatorio), acciones en SocioDetailModal pestaña Membresías, pantalla pages/admin/AdminMembresiasPage.jsx con DataTable/Pagination y ruta /admin/membresias (ProtectedRoute roles administrador y recepcionista) reemplazando el redirect de /membresias en App.jsx:96; actualizá Sidebar.jsx.
Tests primero: backend apps/memberships/tests/test_membresia_acciones.py (transiciones, permisos 403, constraint, extensión de fecha_fin, acceso QR denegado/permitido con apps/access) y frontend (vitest + renderWithProviders): menú por estado, modal con motivo, invalidaciones.
Terminado cuando `cd backend && pytest -q` (cov>=80) y `cd frontend && npm run lint && npx vitest run --coverage && npm run build` pasan. Textos UI en español rioplatense. Sin commits.
```
