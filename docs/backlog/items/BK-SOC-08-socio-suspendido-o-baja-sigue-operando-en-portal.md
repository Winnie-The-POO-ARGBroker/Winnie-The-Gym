---
id: BK-SOC-08
titulo: Un socio suspendido o dado de baja sigue reservando clases, generando QR y renovando; el portal no se lo informa
tipo: bug
roles: [socio, administrador, recepcionista]
prioridad: P1
tamano: M
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-SOC-07, BK-ACC-01]   # BK-ACC: mensajes de denegación en el terminal
---

# BK-SOC-08 · `Socio.estado` solo se respeta en el escaneo de acceso

## 1. Resumen
`Socio.estado` (`activo | suspendido | baja`) únicamente se consulta al validar el ingreso (`has_active_membership`). En el resto del backend (reservas de clases, generación de QR, renovación, preferencia de pago) un socio dado de baja o suspendido se comporta como uno activo, y en el portal (dashboard, credencial) ni siquiera se le avisa de su estado. `dar_baja` tampoco cancela su membresía ni sus reservas futuras. Resultado: un socio de baja puede seguir ocupando cupos de clases y comprando planes sin que recepción lo note.

## 2. Objetivo de usuario
Como **administrador** quiero **que suspender o dar de baja a un socio lo deje realmente fuera de las funciones del portal** y como **socio** quiero **ver claramente por qué no puedo reservar o ingresar** para **evitar cupos fantasma y reclamos sin explicación**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend permiso | `backend/apps/access/permissions.py:22-32` | `IsSocio`: solo `rol=='socio'` y `hasattr(user,'socio')`. **No mira `socio.estado`.** |
| Backend acceso | `backend/apps/access/services.py:170-215` | `has_active_membership(user)`: exige `socio.estado == 'activo'` (línea 192) y membresía activa vigente. **Único lugar donde se evalúa `estado`** (`rg "Socio.Estado\|socio.estado" payments classes memberships` ⇒ 0 resultados fuera de tests). |
| Backend reservas | `backend/apps/classes/views.py:87-95`, `classes/services.py:41-63` | `inscribir` (`IsSocio`) → `inscribir_socio(clase, socio)`: valida duplicado y cupo; **no valida estado del socio ni membresía vigente**. |
| Backend renovación | `backend/apps/memberships/views.py:95-106` | `MeRenewView` (`IsSocio`) → `renovar_membresia(socio, plan)` crea membresía activa **sin cobro previo y sin mirar el estado** (hallazgo de seguridad para FIN, ver informe). |
| Backend pagos | `backend/apps/payments/views.py:71-82` | `CrearPreferenciaView` (`IsSocio`): no valida estado. |
| Backend QR | `backend/apps/access/views.py:28-47`, `access/utils.py:23-53` | `GenerateQRView` (`IsAuthenticated`) emite token a cualquier usuario autenticado; la validación ocurre al escanear (`views.py:91-98`). |
| Backend baja | `backend/apps/members/services.py:48-56` | `dar_baja` solo cambia `estado` y `fecha_baja`; la membresía `activa` queda `activa` (el job la vence por fecha) y las `InscripcionClase` (CASCADE por socio, no por estado) quedan vigentes. Spec: "La cuenta `User` debe seguir activa" (`openspec/changes/socios-membresias/spec.md:343`). |
| Backend /me | `backend/apps/memberships/serializers.py:73-75` | `SocioMeSerializer.fields` **sí incluye `estado`** del socio. |
| Frontend dashboard | `frontend/src/components/dashboard/views/SocioDashboardView.jsx:22-33` | Badge "Al día" si la membresía no está vencida; **ignora `membershipData.estado`**. |
| Frontend credencial | `frontend/src/pages/socio/CredencialDigitalPage.jsx:61-62,144-146` | `isExpired = !membresia || membresia.estado==='vencida'`; sigue pidiendo y mostrando QR; **ignora `rawProfile.estado`**. |
| Frontend clases | `frontend/src/pages/socio/ClasesPage.jsx` | No se verificó el manejo de errores 400/403 de `inscribir` ante un socio no habilitado: **No verificado**. |
| Notificación | `backend/apps/common/templates/emails/` | No existe email de "tu cuenta fue suspendida/dada de baja". |

## 4. Alcance
**Incluye:** permiso `IsSocioActivo` reutilizable aplicado a reservar/cancelar clases, generar QR, preferencia de pago y renovación (según política §11); efectos de `dar_baja` (cancelar membresía activa y reservas futuras, en una transacción); banner de estado en dashboard/credencial; email de aviso al cambiar a `suspendido`/`baja`; mensajes de error claros.
**No incluye:** botón "Suspender/Reactivar" y validaciones de formulario (→ BK-SOC-07); desactivar `User.is_active` (contradice la spec y bloquearía la reactivación por el propio socio); mensajes en el terminal de acceso (→ BK-ACC); decidir si `MeRenewView` debe exigir pago (→ BK-FIN).

## 5. Contrato de API
**[A CREAR] Permiso** `IsSocioActivo(IsSocio)` en `backend/apps/access/permissions.py`: además de `IsSocio`, exige `user.socio.estado == 'activo'`; si no, `403` con `message = 'Tu cuenta de socio está suspendida. Acercate a recepción.'` (o `'...dada de baja...'`).
Aplicar a:
- `POST /api/classes/clases/{id}/inscribir/` (hoy `IsSocio`, `classes/views.py:87`) → `IsSocioActivo`. Cancelar (`/cancelar/`) se mantiene `IsSocio` (poder liberar cupo).
- `GET /api/access/qr/generate/` (hoy `IsAuthenticated`, `access/views.py:41`) → emitir solo si el socio está `activo` (staff sin socio sigue sin QR útil); `403` con el mensaje anterior.
- `POST /api/payments/preferencias/` y `POST /api/memberships/me/renew/` → bloquear solo `baja` (política recomendada, §11).
**[EXISTE → CAMBIA] `POST /api/members/socios/{id}/dar-baja/`** (`IsAdminOnly`) — dentro de `transaction.atomic()`: socio → `baja`; membresías `activa|pendiente_pago` → `cancelada`; `InscripcionClase` futuras del socio → eliminadas (promoviendo lista de espera si corresponde, reutilizar `classes/services.py cancelar_inscripcion`). Response sin cambios (`SocioSerializer`).
Errores nuevos: `403 {"detail": "<mensaje>"}` en los endpoints protegidos (formato estándar DRF `{detail}`).

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Rutas/guard:** `/dashboard` (`ProtectedRoute`), `/socio/credencial` y `/socio/clases` (`roles=['administrador','socio']`, `App.jsx:130-131`); no se agregan rutas.
- **Convenciones:** datos de `GET /api/memberships/me/` vía `useSocioMembresiaMe()` (`hooks/queries/useMembresias.js:17`, key `['membresias','me']`) y `useSocioMembership()` (`hooks/queries/useDashboardData.js:55`, key `['socioMembership']`) — son dos hooks distintos al mismo endpoint: unificar en uno es parte de BK-SOC-09. `Badge` variantes; `sonner` para errores.
- **Componente nuevo:** `frontend/src/components/socio/EstadoSocioBanner.jsx` (`{estado}` → `null` si `activo`; `suspendido` ⇒ banner `warning` "Tu cuenta está suspendida. Acercate a recepción para regularizarla."; `baja` ⇒ banner `danger` "Tu cuenta fue dada de baja. Si querés volver, acercate a recepción."). Usarlo arriba de `SocioDashboardView` y `CredencialDigitalPage`.
- **Comportamiento:** en credencial no pedir `GET /access/qr/generate/` si `estado !== 'activo'` (hoy el efecto de la línea 86-90 lo pide siempre que haya `member`) y mostrar el QR deshabilitado; en `ClasesPage` deshabilitar "Reservar" y mostrar el mensaje.
- **Estados de UI:** banner (info), botones deshabilitados con `title`, errores 403 por `toast.error(err.response.data.detail)`.
- **Responsive:** el banner ocupa el ancho completo; a 375 px texto en dos líneas.

## 8. Archivos a crear / modificar
- Backend: `access/permissions.py`, `classes/views.py`, `access/views.py`, `payments/views.py`, `memberships/views.py`, `members/services.py` (`dar_baja` transaccional), `common/templates/emails/estado_socio.{html,txt}` + envío desde `members/services.py`/`views.py`, tests en `members/tests`, `classes/tests`, `access/tests`, `memberships/tests`.
- Frontend: `components/socio/EstadoSocioBanner.jsx` (+test), `SocioDashboardView.jsx`, `CredencialDigitalPage.jsx`, `ClasesPage.jsx` y sus tests.

## 9. Plan de pruebas (TDD)
**Backend** (`APITestCase`; `make_user_factory(rol='socio')`, `make_socio_factory(user, estado='suspendido')`, `make_plan_factory`, `make_membresia_factory` de `backend/conftest.py`; auth con `RefreshToken.for_user`):
- `classes/tests`: `test_inscribir_socio_suspendido_403`, `test_inscribir_socio_baja_403`, `test_cancelar_socio_suspendido_200` (puede liberar cupo).
- `access/tests`: `test_qr_generate_socio_baja_403`; `test_qr_generate_socio_activo_200` (regresión).
- `memberships/tests/test_me_views.py`: `test_renew_socio_baja_403`.
- `payments/tests/test_crear_preferencia.py`: `test_preferencia_socio_baja_403`.
- `members/tests/test_members_services.py`: `test_dar_baja_cancela_membresia_activa_y_reservas_futuras` (con promoción de lista de espera) y `test_dar_baja_atomica` (si falla una parte, no queda a medias).
- `members/tests/test_estado_email.py`: `outbox` recibe un mail al pasar a `baja`/`suspendido` (con `CELERY_TASK_ALWAYS_EAGER=True`, `core/settings/test.py:16`).
Comando: `cd backend && pytest -q apps/members apps/classes apps/access apps/memberships apps/payments`.
**Frontend** (Vitest + RTL): `EstadoSocioBanner.test.jsx` (3 estados); `CredencialDigitalPage.test.jsx` (con `estado:'baja'` no se llama `api.get('/access/qr/generate/')` y se ve el banner); `SocioDashboardView.test.jsx` y `ClasesPage.test.jsx` (botón Reservar deshabilitado).
Comando: `cd frontend && npx vitest run src/components/socio src/pages/socio src/components/dashboard && npm run lint`.
**Manual:** admin suspende a `socio.activo@winnie.local`; iniciar sesión como ese socio → banner de suspensión en `/dashboard` y `/socio/credencial`, "Reservar" deshabilitado; volver a activarlo y comprobar que todo funciona.

## 10. Criterios de aceptación
- **Dado** un socio suspendido o de baja **cuando** intenta reservar o generar QR **entonces** recibe 403 con mensaje claro y la UI muestra el banner.
- **Dado** que un admin da de baja a un socio con membresía y reservas **cuando** confirma **entonces** la membresía queda `cancelada` y las reservas futuras se liberan en una sola transacción.
- **Dado** el cambio de estado **cuando** ocurre **entonces** el socio recibe un email informativo.
- Un socio suspendido puede seguir cancelando reservas existentes y entrando al portal.

## 11. Riesgos y decisiones abiertas
1. ¿Un socio **suspendido** puede pagar/renovar para salir de la suspensión? (Recomendado: sí; solo `baja` bloquea renovar y debe reactivar recepción.)
2. ¿`dar_baja` cancela la membresía y reservas? (Recomendado: sí; si el dueño prefiere conservar membresía pagada, dejar solo reservas.)
3. ¿Enviar email al cambiar estado? (Recomendado: sí; texto neutro, sin motivo.)
4. ¿Mensaje de 403 por `PermissionDenied` o por código estructurado (`{"code":"socio_suspendido"}`)? (Recomendado: agregar `code` para que el front decida el copy.)

## 12. Referencias
- `openspec/changes/socios-membresias/spec.md` (dar de baja, `User.is_active` intacto), `docs/architecture.md`.
- Relacionados: BK-SOC-07 (acciones y KPIs), BK-SOC-09 (datos del portal), BK-ACC (mensajes en terminal), BK-FIN (renovación sin pago).
- Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", Mobile → Credencial (estados).

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1/DRF; React 18/Vite/react-query v5). Problema verificado: Socio.estado (activo|suspendido|baja) solo se valida en backend/apps/access/services.py:has_active_membership (escaneo). IsSocio (backend/apps/access/permissions.py:22-32) no lo mira, así que classes/views.py inscribir, access/views.py GenerateQRView, payments CrearPreferenciaView y memberships MeRenewView funcionan para socios suspendidos o de baja; dar_baja (members/services.py:48-56) no cancela membresía ni reservas; el portal (SocioDashboardView.jsx, CredencialDigitalPage.jsx) ignora el campo estado que /api/memberships/me/ ya devuelve.
TDD: escribí primero los tests backend listados (inscribir/QR/renew/preferencia con socio suspendido y baja => 403; cancelar reserva sigue permitido; dar_baja transaccional que cancela membresía activa y reservas futuras promoviendo la lista de espera; email al cambiar de estado) en las carpetas tests de members, classes, access, memberships y payments usando make_user_factory/make_socio_factory/make_plan_factory/make_membresia_factory. Luego creá IsSocioActivo(IsSocio) con mensaje en español y aplicalo según la política: reservar y QR bloquean suspendido y baja; renovar/pagar bloquean solo baja. Frontend: componente components/socio/EstadoSocioBanner.jsx, usarlo en dashboard y credencial; no pedir /access/qr/generate/ si estado !== 'activo'; deshabilitar Reservar en ClasesPage. Tests Vitest + RTL.
Terminado: pytest -q (apps/members classes access memberships payments) verde; npx vitest run src/components/socio src/pages/socio src/components/dashboard y npm run lint verdes. No cambies User.is_active ni la exigencia de pago de MeRenewView (es de FIN). Sin commits.
```
