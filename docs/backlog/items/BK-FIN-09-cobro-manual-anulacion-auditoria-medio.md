---
id: BK-FIN-09
titulo: Cobro manual - registrar quién cobró y con qué medio, anular/corregir cobros y evitar duplicados
tipo: feature
roles: [administrador, recepcionista]
prioridad: P1
tamano: L
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-FIN-06, BK-FIN-07, BK-FIN-05]
---

# BK-FIN-09 · Cobro manual: trazabilidad, anulación y validaciones

## 1. Resumen
`CobroManualPage` permite registrar un pago en recepción y activa la membresía al instante, pero el cobro queda sin trazabilidad utilizable (quién lo cobró y la observación solo se guardan dentro del JSON `raw_webhook` y la API no los expone), no se registra el medio (efectivo/transferencia/tarjeta), no hay forma de anular o corregir un cobro mal cargado, y la API no previene el doble envío ni valida el estado del socio.

## 2. Objetivo de usuario
Como **recepcionista** quiero **registrar un cobro indicando el medio de pago y poder ver quién lo cargó**, y como **administrador** quiero **anular un cobro mal cargado con motivo** para **mantener la caja y las membresías consistentes y auditar a cada operador**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend API | `backend/apps/payments/views.py:99-125`, `urls.py:14` | `POST /api/payments/cobros-manuales/` (`IsReceptionistOrAdmin`): valida `CobroManualSerializer`, busca `Socio` y `PlanMembresia(activo=True)` (404 si no existen), llama `cobro_manual(request.user, socio, plan, monto, observacion)` y devuelve `201` con `PagoSerializer`. |
| Backend serializer entrada | `backend/apps/payments/serializers.py:49-54` | `socio_id` (int), `plan_id` (int), `monto` (Decimal 10,2, `min_value=0.01`), `observacion` (opcional, `max_length=200`). **Sin** campo de medio de pago ni `max_value`. |
| Backend servicio | `backend/apps/payments/services.py:149-189` | Crea `Pago(metodo='manual', estado='aprobado', paid_at=now)`, activa membresía (`_activate_membership`, `:68-86`) y envía email. El "actor" y la observación van a `raw_webhook = {'source':'manual','actor_id':..., 'observacion':..., 'plan_precio':..., 'monto_cobrado':..., 'diferencia_vs_plan'?}` (`:160-166`). Una diferencia de monto respecto del precio solo genera `logger.warning` (`:167-172`); no se exige motivo ni aprobación. |
| Backend modelo | `backend/apps/payments/models.py:7-63` | `Pago` **no tiene** FK a usuario que cobró, ni campo de medio manual, ni observación, ni campos de anulación. `raw_webhook` (JSON) se reutiliza para guardar datos del cobro manual. |
| Backend serializer salida | `backend/apps/payments/serializers.py:14-33` | `PagoSerializer` no incluye `raw_webhook`: la UI **no puede mostrar** quién cobró ni la observación. |
| Backend anulación | `backend/apps/payments/views.py:30-44` | `PagoViewSet` es solo `List`+`Retrieve`: **no existe** anular, corregir ni reembolsar. Solo el Django admin (`payments/admin.py:6-11`) podría editar/borrar (sin restricciones ni motivo). |
| Backend validaciones | `backend/apps/payments/views.py:119-124` | No chequea `Socio.estado` (`baja`/`suspendido`), no limita montos, no previene doble envío (reintentar la request crea otro `Pago` y otra membresía; la UI solo deshabilita con `loading`). |
| Backend auditoría | `backend/apps/common/audit.py:164-171`, `core/mongodb.py` | `Pago` se audita automáticamente en Mongo (`audit_logs`: acción, snapshot, actor, `request_id`). **No hay API/UI para leer `audit_logs`** (**No verificado** otro consumidor: `rg audit` solo encuentra escrituras). |
| Frontend ruta | `frontend/src/App.jsx:127`, `Sidebar.jsx:24,37` | `/recepcion/cobros` (`roles=['administrador','recepcionista']`); menú "Cobros manuales" (admin) y "Cobros" (recepcionista). |
| Frontend página | `frontend/src/pages/recepcion/CobroManualPage.jsx:17-389` | Busca socio (`GET /members/socios/?search=&page_size=6`, combobox ARIA con teclado), elige plan (`usePlanesQuery`, solo primera página de planes), monto precargado con el precio de lista, observación (200 caracteres) y botón "Registrar cobro y activar membresía". Éxito -> `toast.success('Cobro registrado: $X — Nombre Apellido')` y limpia el formulario (`:133-139`). |
| Frontend copy | `CobroManualPage.jsx:150-152` | Subtítulo "Registrá pagos en efectivo u otros medios fuera de MercadoPago", pero **no hay selector de medio**. |
| Frontend aviso falso | `CobroManualPage.jsx:254-268` | "El cobro extenderá desde esa fecha." No es cierto (ver BK-FIN-07). |
| Frontend diferencia | `CobroManualPage.jsx:325-329` | Muestra "Diferencia: $X" si el monto difiere del precio, sin exigir motivo. |
| Frontend validación | `CobroManualPage.jsx:119-123` | Solo valida socio, plan y monto > 0 con toasts (sin `react-hook-form`/`zod`). |
| Frontend mutation | `frontend/src/hooks/queries/usePagos.js:57-65` | `useCobrarManualMutation` sin `onSuccess` que invalide queries (el historial de la tarjeta lateral usa estado local, `HistorialPagosCard.jsx:41-76`). |
| Frontend historial | `frontend/src/components/pagos/HistorialPagosCard.jsx:41-140` | Muestra plan, fecha, método (`Cobro manual`), monto y estado; sin operador, medio ni observación. |
| Tests | `backend/apps/payments/tests/test_cobro_manual.py`, `test_cobro_manual_diff.py`; `frontend/src/pages/recepcion/__tests__/CobroManualPage.test.jsx`, `CobroManualPage.handlers.test.jsx` | Cubren felices, 403 socio, 404 plan, monto 0 y el log de diferencia. |
| Caja diaria | `rg -i "caja" backend frontend docs speckit openspec` | **Sin rastros** en código ni specs (ver BK-FIN-11). |

## 4. Alcance
**Incluye:**
- Campos en `Pago`: `cobrado_por`, `medio_manual`, `observacion` (columnas reales en vez de `raw_webhook`), y de anulación (`anulado_por`, `anulado_en`, `motivo_anulacion`).
- `medio` obligatorio en el cobro manual (efectivo, transferencia, tarjeta débito, tarjeta crédito, otro).
- Endpoint de anulación con motivo y efecto sobre la membresía creada.
- Exponer en `PagoSerializer` quién cobró, medio, observación y datos de anulación; mostrarlos en UI.
- Validaciones: socio `activo`, `monto` máximo razonable, motivo obligatorio ante diferencia contra el precio, protección contra doble envío (clave de idempotencia).
- Invalidación de queries y comprobante/confirmación en pantalla al registrar.

**No incluye:** reembolsos de MercadoPago (BK-FIN-08), caja diaria/cierre (BK-FIN-11), comprobantes PDF (BK-FIN-10), consulta de `audit_logs` (idea para el área de plataforma, PLT).

## 5. Contrato de API
**[EXISTE → MODIFICAR]** `POST /api/payments/cobros-manuales/` — `IsReceptionistOrAdmin`.
Request (propuesta; los nuevos campos marcados):
```json
{ "socio_id": 12, "plan_id": 3, "monto": "12000.00", "observacion": "Pago en efectivo",
  "medio": "efectivo",                      // NUEVO, obligatorio: efectivo|transferencia|debito|credito|otro
  "motivo_diferencia": "Descuento familiar" // NUEVO, obligatorio si monto != plan.precio (max 200)
}
```
Header opcional `Idempotency-Key: <uuid>` (decisión 3): el servidor guarda la clave en el `Pago` y devuelve el mismo `201` si se repite en 24 h.
Response `201` `PagoSerializer` + campos nuevos: `cobrado_por` (id), `cobrado_por_nombre`, `medio_manual`, `observacion`, `anulado_en`, `anulado_por_nombre`, `motivo_anulacion`.
Errores: `400` `{"medio": ["Este campo es obligatorio."]}`, `{"motivo_diferencia": ["Indicá el motivo de la diferencia con el precio del plan."]}`, `{"socio_id": ["El socio está dado de baja."]}`; `403`; `404` (socio/plan).

**[A CREAR]** `POST /api/payments/pagos/{id}/anular/` — permiso `IsAdminOnly` (decisión 1). Body `{ "motivo": "str 5..200 (obligatorio)" }`.
- Solo `metodo='manual'` y `estado='aprobado'`; si no: `400` `{"detail": "Solo se pueden anular cobros manuales aprobados."}`; ya anulado: `400` `{"detail": "El cobro ya fue anulado."}`.
- Efecto (en `transaction.atomic()`): `estado -> cancelado`, completa `anulado_*`; la membresía creada por ese pago (`Pago.membresia`) pasa a `cancelada` **si** sigue `activa` y fue creada por este pago (si el socio ya renovó después, `409`/aviso: decisión 2). Registra auditoría (señal `Pago` ya activa) y envía email al socio (opcional).
- Response `200` `PagoSerializer`.

**[EXISTE → MODIFICAR]** `GET /api/payments/pagos/` y `.../{id}/`: serializer ampliado (ver BK-FIN-04 para filtros).

## 6. Modelo de datos (propuesta)
Migración `payments/0002_...` (coordinar numeración con BK-FIN-08, que también agrega campos):
- `Pago.cobrado_por = ForeignKey('users.User', null=True, blank=True, on_delete=SET_NULL, related_name='cobros_registrados')`
- `Pago.medio_manual = CharField(max_length=20, blank=True, default='', choices=MedioManual.choices)` (`efectivo|transferencia|debito|credito|otro`)
- `Pago.observacion = CharField(max_length=200, blank=True, default='')`
- `Pago.motivo_diferencia = CharField(max_length=200, blank=True, default='')`
- `Pago.anulado_por` (FK User SET_NULL), `Pago.anulado_en` (DateTimeField null), `Pago.motivo_anulacion` (CharField 200)
- `Pago.idempotency_key = CharField(max_length=64, null=True, blank=True, unique=True)`
Migración de datos: copiar `raw_webhook['actor_id']`, `['observacion']` a las columnas nuevas para `metodo='manual'` existentes (el origen está en `services.py:160-166`).
`Pago.socio`/`plan` tienen `on_delete=PROTECT` (`models.py:21-30`): ya impiden borrar socios/planes con pagos.

## 7. Diseño frontend
- **Ruta/guard:** sin cambios (`/recepcion/cobros`). Anulación visible solo para `administrador` (`useAuth().user.rol`, como `Sidebar.jsx:52-59`).
- **Reutilizar:** `CobroManualPage`, `Card`, `Input`, `Select` (props `label`, `id`, `value`, `onChange`, children `<option>`), `Button`, `Modal`, `HistorialPagosCard`, `useCobrarManualMutation`.
- **Cambios:**
  - `CobroManualPage`: agregar `Select` "Medio de pago" (obligatorio) y campo "Motivo de la diferencia" que aparece/obliga cuando `monto !== plan.precio` (ya se calcula `Diferencia`, `:325-329`); migrar la validación a `react-hook-form` + `zod` (patrón `gestionSocios.schema.js`); generar un `Idempotency-Key` con `generateUUID()` de `services/api.js:30-39` por intento de envío y reutilizarlo en reintentos.
  - Corregir el texto del aviso de membresía activa según BK-FIN-07.
  - Tras éxito: `toast.success('Cobro registrado...')`, invalidar `['pagos']`, `MEMBRESIAS_QUERY_KEYS`, mostrar en pantalla "Cobro registrado · Vence el <fecha>" y, si existe BK-FIN-10, botón "Descargar comprobante".
  - `usePagos.js`: `useAnularPagoMutation()` -> `api.post('/payments/pagos/${id}/anular/', { motivo })`; `onSuccess` invalida `['pagos']`, `['membresias']`, `['misPagos']` (`MIS_PAGOS_KEY`); `onError` -> `toast.error(extractErrorMessage(...))` (helper existente, `usePagos.js:28-30`).
  - `HistorialPagosCard` y la pantalla de BK-FIN-04: columnas "Cobró" y "Medio"; fila anulada tachada con badge "Anulado" y motivo; botón "Anular" (solo admin) abre `Modal` con `textarea` de motivo.
- **Estados:** loading (`loading` del `Button`), vacío (sin socio seleccionado: `EmptyState` existente), error (toast con `detail`), éxito (toast + resumen).
- **Textos (voseo):** "Medio de pago", "Motivo de la diferencia", "Registrar cobro", "Anular cobro", "¿Seguro que querés anular este cobro? Se cancelará la membresía que activó.", "Cobro anulado".
- **Responsive:** el layout ya colapsa a una columna (`flex-col lg:flex-row`, `CobroManualPage.jsx:155`); a 375 px el botón principal a ancho completo (ya `w-full`).

## 8. Archivos a crear / modificar
- Backend: `payments/models.py` + migración (+ migración de datos), `payments/serializers.py` (entrada/salida), `payments/services.py` (`cobro_manual` con actor/medio/idempotencia, `anular_cobro_manual`), `payments/views.py` (acción `anular`, headers), `payments/admin.py` (marcar campos de anulación como solo lectura), plantilla de email de anulación (opcional).
- Tests backend: ampliar `test_cobro_manual.py`, `test_cobro_manual_diff.py`; nuevo `test_anular_cobro.py`.
- Frontend: `CobroManualPage.jsx`, `hooks/queries/usePagos.js`, `services/pagosService.js` (`anularPago`), `components/pagos/HistorialPagosCard.jsx`, nuevo `components/pagos/AnularPagoModal.jsx`, `constants/pagos.js` (labels de medio); tests de página y hooks.

## 9. Plan de pruebas (TDD)
**Backend** (`cd backend && pytest -q apps/payments/tests`; molde `test_cobro_manual.py:14-70`: `APITestCase`, `_auth`, `override_settings` de email/Celery, `make_user_factory(rol='recepcionista')`):
1. Cobro guarda `cobrado_por=request.user`, `medio_manual`, `observacion`; `PagoSerializer` los devuelve.
2. `medio` ausente/ inválido -> `400`.
3. Monto distinto del plan sin `motivo_diferencia` -> `400`; con motivo -> `201` y queda guardado (extiende `test_cobro_manual_diff.py`).
4. Socio `baja` -> `400`.
5. Idempotencia: misma `Idempotency-Key` dos veces -> un solo `Pago`, una sola membresía, mismo `201`.
6. Anular: admin anula cobro manual aprobado -> `cancelado`, `anulado_*` completos, membresía `cancelada`, auditoría emitida (mock `core.mongodb.log_audit_event`).
7. Anular: recepcionista -> `403`; pago de MercadoPago -> `400`; ya anulado -> `400`; socio ya renovó después -> comportamiento según decisión 2.
8. Migración de datos: pagos manuales históricos copian `actor_id`/`observacion` (test de migración o función pura).
**Frontend** (`npx vitest run src/pages/recepcion src/hooks/queries/usePagos.test.jsx src/components/pagos`; helpers `renderWithProviders`; mocks de `api` como `usePagos.test.jsx:12-24`): no se puede enviar sin medio; la diferencia exige motivo; el envío usa `Idempotency-Key`; éxito invalida queries; botón "Anular" solo para admin; modal exige motivo y llama al endpoint; fila anulada se renderiza distinta.
**Manual:** `recepcion@winnie.local` registra un cobro y `admin@winnie.local` lo anula; verificar que el socio queda sin acceso (QR) y que el cobro figura como Anulado.

## 10. Criterios de aceptación
- **Dado** que registro un cobro **cuando** lo guardo **entonces** queda registrado quién lo cobró y con qué medio, y se ve en el historial.
- **Dado** un monto distinto al precio **cuando** intento registrarlo **entonces** debo escribir el motivo.
- **Dado** un doble click o reintento de red **entonces** se crea un único cobro.
- **Dado** un cobro mal cargado **cuando** el administrador lo anula con motivo **entonces** el pago queda "Anulado", la membresía que activó se cancela y queda en auditoría.
- **Dado** un socio dado de baja **cuando** intento cobrarle **entonces** el sistema lo impide.

## 11. Riesgos y decisiones abiertas
1. ¿Quién puede anular? Recomendación: solo administrador; la recepcionista solicita (o puede anular el mismo día un cobro propio: decisión del dueño).
2. Si el socio ya renovó después del cobro que se anula: ¿bloquear la anulación, o cancelar solo ese tramo? Recomendación: bloquear (`409`) y pedir resolver desde BK-FIN-06.
3. Idempotencia: header `Idempotency-Key` vs. bloqueo "mismo socio+plan+monto en los últimos 60 s". Recomendación: header (determinista) y además aviso en UI.
4. ¿Se permite cobrar sin plan (monto libre, p. ej. pase diario, matrícula)? Hoy `plan_id` es obligatorio y siempre activa membresía.
5. ¿Pagos parciales/cuotas? Hoy el monto menor al precio igual activa la membresía completa.
6. Retención/auditoría: `audit_logs` en Mongo tiene índice TTL (`audit_logs_ttl`, `backend/apps/common/management/commands/create_mongo_indexes.py:48-59`; `docs/architecture.md:171` habla de 90 días), o sea que la huella de "quién cobró/anuló" se pierde con el tiempo; por eso conviene persistir quién/cuándo en Postgres (columnas propuestas en la sección 6).

## 12. Referencias
- `backend/apps/payments/services.py:149-189` (docstring "PDF risk #3"), `docs/architecture.md:113-126`, `CHANGELOG.md:163`.
- Figma (solo apoyo visual opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", módulo Cobros (recepción).

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym. TDD estricto. Implementá docs/backlog/items/BK-FIN-09-cobro-manual-anulacion-auditoria-medio.md.

Backend (backend/apps/payments): agregá a Pago cobrado_por (FK users.User SET_NULL), medio_manual (efectivo|transferencia|debito|credito|otro), observacion, motivo_diferencia, anulado_por/anulado_en/motivo_anulacion e idempotency_key (unique, null) con migración 0002 (+ migración de datos que copie raw_webhook['actor_id'] y ['observacion'] de los pagos manuales existentes; origen en services.py:160-166). CobroManualSerializer: medio obligatorio, motivo_diferencia obligatorio si monto != plan.precio, socio no 'baja'. cobro_manual(actor, ...) guarda actor/medio/observación, respeta Idempotency-Key. Nueva acción POST /api/payments/pagos/{id}/anular/ {motivo 5..200} solo IsAdminOnly: solo manual+aprobado, pasa a cancelado, completa anulado_*, cancela la membresía creada por ese pago si sigue activa (si el socio ya renovó, 409). PagoSerializer expone cobrado_por, cobrado_por_nombre, medio_manual, observacion, anulado_en, anulado_por_nombre, motivo_anulacion.
Frontend: CobroManualPage con Select de medio, motivo de diferencia, react-hook-form+zod, Idempotency-Key con generateUUID (src/services/api.js), aviso corregido según BK-FIN-07, invalidación de queries; useAnularPagoMutation en hooks/queries/usePagos.js; AnularPagoModal y columnas Cobró/Medio/Anulado en HistorialPagosCard (botón solo para rol administrador).
Tests primero: backend test_cobro_manual.py (ampliar), test_cobro_manual_diff.py, test_anular_cobro.py (APITestCase + RefreshToken, factories de backend/conftest.py); frontend CobroManualPage tests y usePagos.test.jsx con renderWithProviders.
Terminado cuando `cd backend && pytest -q` (cov>=80) y `cd frontend && npm run lint && npx vitest run --coverage && npm run build` pasan. Textos UI en español rioplatense. Sin commits.
```
