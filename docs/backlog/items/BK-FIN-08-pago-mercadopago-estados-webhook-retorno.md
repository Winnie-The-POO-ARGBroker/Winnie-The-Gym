---
id: BK-FIN-08
titulo: Pago con MercadoPago end-to-end - webhook robusto, estados completos (cancelado/reembolsado) y retorno del checkout confiable
tipo: bug
roles: [socio, administrador, recepcionista]
prioridad: P0
tamano: XL
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-FIN-07, BK-FIN-05]
---

# BK-FIN-08 · Pago con MercadoPago: webhook, estados y retorno

## 1. Resumen
El flujo feliz (crear preferencia -> pagar en MP -> webhook -> activar membresía -> email) existe y está testeado, pero tiene huecos que pueden dejar a un socio **pagado sin membresía**, activar de más o dejarla activa tras un reembolso: el webhook ignora como "duplicado" un segundo intento de pago aprobado sobre la misma preferencia, no protege estados terminales, reenvía el email en cada notificación, no revoca nada ante reembolso/contracargo, nunca vence los pagos pendientes abandonados y la pantalla de retorno confía en un parámetro de URL en lugar del estado real del pago.

## 2. Objetivo de usuario
Como **socio** quiero **que al pagar con MercadoPago mi membresía se active y la app me muestre el estado real del pago (aprobado, pendiente, rechazado, cancelado, reembolsado)** para **saber si ya puedo entrar al gimnasio**; como **recepcionista/administrador** quiero **que el estado de cada pago sea fiel a lo que dice MercadoPago** para **no atender reclamos por pagos "perdidos" ni dejar accesos activos tras un reembolso**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/payments/models.py:9-14,37-51` | `Pago.Estado`: `pendiente/aprobado/rechazado/cancelado/reembolsado`; `Metodo`: `mercado_pago/manual`. `mp_payment_id` es `unique` (nullable), `mp_external_reference` indexado, `raw_webhook` JSON, `paid_at`. **Sin** campo de comprobante, de fecha/monto de reembolso ni de vencimiento del intento. |
| Backend preferencia | `backend/apps/payments/services.py:89-146`, `views.py:71-96` | Cada click en "Pagar con MercadoPago" crea un `Pago` `pendiente` + preferencia (`mp_external_reference` uuid). `auto_return='approved'` solo si `FRONTEND_URL` es público (`:127-128`); `notification_url` solo si hay `MP_NGROK_URL` (`:39-44,131-133`); si no hay URL pública en un entorno, **no hay webhook** (los pagos quedan `pendiente`). **No se setea expiración** de la preferencia. |
| Backend back_urls | `backend/apps/payments/services.py:30-36` | `success/failure/pending` -> `{FRONTEND_URL}/socio/credencial?pago=success|failure|pending`. |
| Backend webhook | `backend/apps/payments/views.py:147-164`, `services.py:255-308` | `AllowAny`, firma HMAC v1 con `MP_WEBHOOK_SECRET` (`verify_webhook_signature`, `:208-237`; sin secreto lanza `ImproperlyConfigured`, **se propaga como 500**), consulta `fetch_payment(data_id)` y actualiza el `Pago` ubicado por `external_reference` o `metadata.pago_id`. Devuelve `200 {ok:true}` o `400 {ok:false, detail}` (`missing data.id`, `invalid signature`, `failed to fetch payment`, `unknown pago`). |
| Backend mapeo | `backend/apps/payments/services.py:196-205` | `approved->aprobado`, `rejected->rechazado`, `cancelled->cancelado`, `refunded->reembolsado`, `charged_back->reembolsado`, `in_process/pending/authorized->pendiente`; desconocido -> `pendiente`. |
| Backend idempotencia | `backend/apps/payments/services.py:288-300` | El comentario dice "do not overwrite once terminal" pero el código solo compara `pago.mp_payment_id != data_id` (`:290-292`) y, si coincide o está vacío, **sobrescribe `estado`** con el último estado recibido (sin chequear terminal ni orden de llegada). |
| Backend duplicado | `backend/apps/payments/services.py:290-292` | **Riesgo alto (inferido por lectura, confirmar en sandbox):** Checkout Pro permite reintentar el pago con la misma preferencia. Si el 1.º intento fue `rejected`, el `Pago` guarda ese `mp_payment_id`; cuando el 2.º intento (otro `payment id`, misma `external_reference`) llega `approved`, entra en `pago.mp_payment_id != data_id` -> `return True, 'duplicate ignored'`: **el pago aprobado se ignora y la membresía no se activa**. |
| Backend email | `backend/apps/payments/services.py:305-306`; `payments/tests/test_webhook.py:105-114` | Se reenvía el mail de confirmación en **cada** webhook `approved` (MP suele notificar más de una vez). `test_duplicate_webhook_is_idempotent` solo asserta `paid_at` y vacía `mail.outbox` sin comprobar que quede vacío. |
| Backend reembolso | `backend/apps/payments/services.py:296-303` | Si llega `refunded`/`cancelled`/`charged_back` solo cambia `Pago.estado`. **No** vence/cancela la membresía creada por ese pago (`Pago.membresia`, `models.py:31-36`), **no** avisa al socio ni al staff. No hay endpoint para iniciar un reembolso desde la app. |
| Backend pendientes | `backend/apps/payments/services.py:93-102` | No hay tarea que cancele/venza `Pago` `pendiente` viejos (usuario que cierra MP). Solo existen tareas Celery de membresías y emails (`backend/apps/*/tasks.py`). Se acumulan filas `pendiente`. |
| Backend webhook topics | `backend/apps/payments/services.py:240-252` | `_extract_data_id` toma `data.id` de cualquier notificación; no filtra por `type`/`topic` (`payment` vs `merchant_order`). Una notificación de otro tipo haría `fetch_payment` con un id que no es de pago -> `failed to fetch payment` (400) y MP reintenta. **No verificado en sandbox.** |
| Backend permisos socio | `backend/apps/payments/views.py:41-55` | El socio solo puede `mis-pagos` (lista). `retrieve` de un pago es solo staff: no hay endpoint para que el frontend consulte **el estado del pago recién hecho**. `mis_pagos` no admite filtros (arma el queryset a mano, `:49`). |
| Frontend checkout | `frontend/src/pages/socio/CheckoutPage.jsx:75-137`, `hooks/queries/usePagos.js:36-51` | `useCrearPreferenciaMutation` -> `window.location.href = init_point` (o `sandbox_init_point` si `VITE_MP_SANDBOX==='true'`, `services/pagosService.js:20-25`). Sin guardar el `pago_id`/`external_reference` para el retorno. |
| Frontend retorno | `frontend/src/pages/socio/CredencialDigitalPage.jsx:28-39,138-141`, `components/socio/PagoResultadoBanner.jsx:4-23,30-69` | Lee `?pago=success|failure|pending` **una vez** y muestra un banner de 6 s (`:37`) con mensajes fijos: success = "¡Pago aprobado! Tu membresía fue activada exitosamente..."; failure = "Pago rechazado"; pending = "Pago en proceso". Solo 3 estados; no existen mensajes para `cancelado` ni `reembolsado`. |
| Frontend desfasaje | `CredencialDigitalPage.jsx:42,61` | Al volver con `success`, la membresía del socio (`useSocioMembresiaMe`) puede seguir vencida si el webhook aún no llegó (o si en dev no hay `notification_url`), y **no hay re-consulta ni polling**: el banner dice "activada" mientras la tarjeta dice "Vencida". El parámetro es manipulable (solo cosmético). |
| Frontend historial | `frontend/src/pages/socio/HistorialPagosPage.jsx:9-16`, `components/pagos/HistorialPagosCard.jsx:7-14` | Staff ve los 5 estados con ícono; el socio solo ve 3 con color correcto y los otros 2 en verde (BK-FIN-05). Sin "Reintentar pago" para `pendiente`/`rechazado`. |
| Tests | `backend/apps/payments/tests/test_webhook.py`, `test_crear_preferencia.py`, `test_mis_pagos.py`; `frontend/src/components/socio/__tests__/PagoResultadoBanner.test.jsx`, `pages/socio/CheckoutPage.test.jsx` | Cubren aprobado, rechazado, firma inválida, duplicado simple, referencia desconocida; **no** cubren reintento con otro `payment id`, reembolso, contracargo, orden de llegada, topics. |
| Docs | `docs/architecture.md:113-126,164-167` | Describen "idempotencia garantizada por `Pago.mp_payment_id UNIQUE`" (es solo una restricción de DB; no impide los problemas descritos). |

## 4. Alcance
**Incluye:**
- Reescribir `procesar_webhook` con: lookup por `mp_payment_id` y por `external_reference`, aceptación de nuevos intentos sobre el mismo `Pago` mientras no esté aprobado, protección de estados terminales (un `aprobado` solo pasa a `reembolsado`/`cancelado` por refund/chargeback), un único email de confirmación por `Pago`, y registro de pagos aprobados duplicados (doble cobro) para revisión.
- Política y efecto de reembolso/contracargo sobre la membresía y notificación al staff (ver decisión 1).
- Expiración de pagos pendientes (tarea Celery + `expiration_date_to` en la preferencia).
- Endpoint de estado de pago para el socio y pantalla de retorno que consulta el estado real (con polling corto) y muestra los 5 estados con mensajes.
- Filtrar por `topic/type` de la notificación y responder códigos que no provoquen reintentos inútiles.
- "Reintentar pago" para pagos `pendiente`/`rechazado`.

**No incluye:** emisión de reembolsos desde la app (decisión 2), comprobantes (BK-FIN-10), suscripciones recurrentes, UI de listado de staff (BK-FIN-04), política de apilado (BK-FIN-07).

## 5. Contrato de API
**[EXISTE → MODIFICAR]** `POST /api/payments/webhook/` — `AllowAny`, `authentication_classes=[]` (`views.py:147-150`). Respuestas propuestas: `200 {"ok": true, "detail": "processed (aprobado)"|"ignored (topic)"|"duplicate ignored"}`; `400` solo por firma inválida o `data.id` ausente (MP no debe reintentar lo que nunca va a poder procesarse: `unknown pago` -> `200 {"ok": false, "detail": "unknown pago"}` con log de warning; decisión 4); `500` evitable: capturar `ImproperlyConfigured` y devolver `503 {"detail": "Webhook no configurado"}`.
Reglas de transición (propuesta, tabla):

| Estado actual | Llega MP | Resultado |
|---|---|---|
| pendiente | approved | aprobado + `paid_at` + activar membresía + 1 email |
| pendiente | rejected / cancelled | rechazado / cancelado, sin membresía |
| rechazado | approved (otro `payment id`, misma referencia) | aprobado (nuevo `mp_payment_id`; guardar el anterior en `raw_webhook['intentos']`) |
| aprobado | approved (mismo id) | sin cambios, **sin** email |
| aprobado | approved (otro id distinto) | no cambia el `Pago`; registrar `raw_webhook['doble_cobro']=<id>` + log `error` para devolución manual |
| aprobado | refunded / charged_back | reembolsado; aplicar política (decisión 1) |
| aprobado | in_process / pending / rejected | **ignorar** (fuera de orden) |
| reembolsado/cancelado | cualquiera | sin cambios |

**[A CREAR]** `GET /api/payments/pagos/mis-pagos/` ampliado con filtro `?external_reference=<ref>` y `?id=<pago_id>` — `IsSocio` (`views.py:42-44`); alternativa: `GET /api/payments/pagos/mis-pagos/{id}/`. Response `PagoSerializer` (`serializers.py:14-32`). Errores: `404` si el pago no pertenece al socio.
**[A CREAR]** `POST /api/payments/preferencias/` agrega `expiration_date_to` (ahora + 24 h) en el payload de MP (`services.py:107-134`); la respuesta no cambia.
**[A CREAR]** Tarea Celery `payments.expire_pending_pagos`: `Pago` `pendiente` con `metodo=mercado_pago` y `created_at < now-24h` y sin `mp_payment_id` -> `cancelado` (`mp_status_detail='expired'`); registrar con migración de datos (`CrontabSchedule` horario, patrón `backend/apps/memberships/migrations/0004_seed_expiration_schedule.py`).
Nota MercadoPago (documentación del proveedor, **no verificado en el repo**): MP agrega a las `back_urls` los parámetros `payment_id`, `status`, `external_reference`, `preference_id`; usar `external_reference` (que el backend ya genera) para consultar el estado real.

## 6. Modelo de datos (propuesta)
Migración `payments/0002_...`:
- `Pago.confirmacion_enviada_at = DateTimeField(null=True, blank=True)` (guard del email; evita duplicados con `UPDATE ... WHERE confirmacion_enviada_at IS NULL`).
- `Pago.reembolsado_at = DateTimeField(null=True, blank=True)` y `Pago.monto_reembolsado = DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)` (se completan desde `raw_webhook` cuando MP reporte `transaction_amount_refunded`; **No verificado** el nombre exacto del campo en la API de MP).
- `Pago.expira_at = DateTimeField(null=True, blank=True)` (opcional).
Índice recomendado: `Pago(metodo, estado, created_at)` para la tarea de expiración.

## 7. Diseño frontend
- **Rutas:** mantener retorno en `/socio/credencial` (back_urls ya apuntan ahí, `services.py:33-35`); recomendado además `/socio/pagos/resultado` dedicada. `CredencialDigitalPage` ya es `roles={['administrador','socio']}` (`App.jsx:130`).
- **Hook nuevo** en `hooks/queries/useMisPagos.js` (o `usePagos.js`): `usePagoEstado(externalReference, { pollMs: 3000, maxMs: 30000 })` con `refetchInterval` que se corta al llegar a un estado final; al `aprobado` invalida `MEMBRESIAS_QUERY_KEYS.me`, `MIS_PAGOS_KEY` (`useMisPagos.js:4`) y `['socioMembership']`.
- **`PagoResultadoBanner`** (props hoy: `estado` en `'success'|'failure'|'pending'`): pasar a recibir el **estado real** (`aprobado/pendiente/rechazado/cancelado/reembolsado`) más `fechaFin`, con mensajes por estado (tabla abajo) y sin auto-ocultarse en `pendiente` ni `rechazado`; botón "Reintentar pago" (`Link` a `/socio/checkout?plan=<id>`).
- **Mensajes (voseo):**
  - aprobado: "¡Pago aprobado! Tu membresía está activa hasta el 30/11/2026."
  - pendiente: "Estamos esperando la confirmación de MercadoPago. Te avisamos por email cuando se acredite."
  - rechazado: "MercadoPago rechazó el pago (<detalle>). Probá con otro medio de pago o acercate a recepción."
  - cancelado: "Cancelaste el pago o venció el tiempo para pagarlo. No se te cobró nada."
  - reembolsado: "Te reembolsamos este pago. Si querés seguir entrenando, renová tu plan."
- **`HistorialPagosPage`:** estados con mapa compartido (BK-FIN-05) y acción "Reintentar" en `pendiente`/`rechazado`.
- **`CheckoutPage`:** deshabilitar el botón mientras haya un pago `pendiente` reciente del mismo plan (evita filas duplicadas), con aviso "Ya tenés un pago en curso".
- **Estados de UI:** loading (skeleton/spinner "Confirmando tu pago..."), vacío (sin parámetros -> no mostrar banner), error (si el polling falla: "No pudimos confirmar tu pago. Revisá *Mis pagos* en unos minutos."), éxito.
- **Responsive:** el banner ya es `flex` de una columna (mobile first, `MemberLayout`); a 375 px botones a ancho completo.

## 8. Archivos a crear / modificar
- Backend: `payments/services.py` (webhook, preferencia con expiración, política de reembolso), `payments/views.py` (códigos de respuesta, filtro `mis-pagos`), `payments/models.py` + migración `0002`, `payments/tasks.py` (nuevo, `expire_pending_pagos`), migración de datos de schedule, plantillas `emails/` (aviso de reembolso al socio), `payments/serializers.py`, `docs/architecture.md` (corregir idempotencia/flujo).
- Tests backend: ampliar `payments/tests/test_webhook.py`, `test_mis_pagos.py`, nuevo `test_expire_pending.py`.
- Frontend: `CredencialDigitalPage.jsx`, `components/socio/PagoResultadoBanner.jsx`, `hooks/queries/useMisPagos.js`, `HistorialPagosPage.jsx`, `CheckoutPage.jsx`, `constants/pagos.js`; tests `PagoResultadoBanner.test.jsx`, `CheckoutPage.test.jsx`, `useMisPagos.test.jsx`, `HistorialPagosPage.test.jsx`.

## 9. Plan de pruebas (TDD)
**Backend** (`cd backend && pytest -q apps/payments/tests`; molde `test_webhook.py`: `APITestCase`, `override_settings(MP_WEBHOOK_SECRET=..., EMAIL_BACKEND=locmem, CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True)`, helper `_build_signature` (`:23-26`), `patch('apps.payments.services.mercadopago_client.fetch_payment')`; factories `conftest.py:23-75`):
1. **Reintento:** `Pago` con `mp_payment_id='A'` y estado `rechazado`; webhook `approved` con `data.id='B'` y misma referencia -> `Pago` `aprobado`, `mp_payment_id='B'`, membresía activa, 1 mail. (Hoy falla: devuelve `duplicate ignored`.)
2. **Email único:** dos webhooks `approved` idénticos -> `len(mail.outbox) == 1` (asserta de verdad).
3. **Orden:** `aprobado` + webhook posterior `in_process`/`rejected` (otro estado de la misma sucesión) no degrada el estado.
4. **Reembolso:** `aprobado` + `refunded` -> `reembolsado`, `reembolsado_at` seteado, membresía según política (cancelada/vencida), mail de aviso; `charged_back` igual.
5. **Doble cobro:** `aprobado` con id A + `approved` con id B -> estado sin cambios y `raw_webhook['doble_cobro']=='B'`.
6. **Topic:** payload `type='merchant_order'` -> `200 ignored`, sin `fetch_payment`.
7. **Sin secreto:** `MP_WEBHOOK_SECRET=''` -> `503` (no 500).
8. `mis-pagos?external_reference=<ref>` devuelve solo el pago propio; de otro socio -> vacío/`404`.
9. `expire_pending_pagos` cancela pendientes viejos sin `mp_payment_id` y no toca los recientes ni los manuales.
10. Preferencia incluye `expiration_date_to` (mock de `create_preference`, `payments/tests/test_crear_preferencia.py`).
**Frontend** (`npx vitest run src/components/socio src/pages/socio src/hooks/queries/useMisPagos`): banner por cada uno de los 5 estados con su copy; polling termina al estado final y al timeout muestra el mensaje de error; `success` con pago aún `pendiente` **no** dice "activada"; invalidación de membresía al aprobarse; "Reintentar pago" navega a `/socio/checkout?plan=`.
**Manual (sandbox MP, requiere `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_NGROK_URL` en `.env`; no imprimir credenciales):** con `socio.vencido@winnie.local`, pagar con tarjeta de prueba rechazada y luego aprobada en el mismo checkout -> membresía activa; reembolsar desde el panel de MP -> pago `reembolsado`.

## 10. Criterios de aceptación
- **Dado** un intento rechazado **cuando** el socio reintenta en el mismo checkout y se aprueba **entonces** el pago pasa a `aprobado` y la membresía se activa.
- **Dado** que MP notifica dos veces el mismo pago aprobado **entonces** el socio recibe un único email.
- **Dado** un pago aprobado **cuando** MP informa reembolso **entonces** el pago pasa a `reembolsado`, la membresía se ajusta según la política y se notifica.
- **Dado** que vuelvo de MP con `pago=success` pero el webhook no llegó **entonces** la app dice "Estamos confirmando tu pago" y se actualiza sola al acreditarse.
- **Dado** un pago `pendiente` abandonado por más de 24 h **entonces** queda `cancelado`.
- **Dado** cualquier pago **cuando** lo veo en "Mis pagos" **entonces** su estado y color corresponden a los 5 estados definidos.

## 11. Riesgos y decisiones abiertas
1. **Efecto del reembolso/contracargo sobre la membresía:** ¿cancelar (acceso cortado de inmediato), dejar correr hasta `fecha_fin`, o revisión manual? Recomendación: contracargo -> cancelar + alerta al staff; reembolso total -> cancelar; reembolso parcial -> manual. Además `charged_back` hoy se mapea a `reembolsado`: ¿distinguir un estado `contracargo`? Recomendación: mantener el mapeo y guardar el detalle en `mp_status_detail`.
2. **Reembolsos desde la app:** ¿se inician en el panel de MP (recomendado v1) o con API (`refund`)? Implica permisos y auditoría (BK-FIN-09).
3. **Ventana de expiración de preferencia/pendientes:** 24 h propuesto; validar con el dueño.
4. **`unknown pago` -> 200 o 400:** devolver 400 hace que MP reintente hasta ~3 días; recomendación: 200 con log, y alerta si ocurre.
5. **Entornos sin URL pública** (dev sin ngrok): no llega webhook; considerar un botón "Sincronizar estado" para staff que consulte `fetch_payment`.
6. Concurrencia: dos webhooks simultáneos del mismo pago; usar `select_for_update()` sobre el `Pago` dentro de `transaction.atomic()`.

## 12. Referencias
- `docs/architecture.md:113-126,164-167`, `CHANGELOG.md` (alta de MP), `backend/apps/payments/tests/test_webhook.py`.
- Figma (solo apoyo visual opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", Mobile: Credencial (banner de pago) / Checkout.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django/DRF + Celery + React/Vite). TDD estricto. Implementá docs/backlog/items/BK-FIN-08-pago-mercadopago-estados-webhook-retorno.md.

Backend (backend/apps/payments/services.py::procesar_webhook y views.py::WebhookView): reescribí el procesamiento con transaction.atomic() + select_for_update() sobre el Pago y la tabla de transiciones de la ficha: (a) un 2.º intento aprobado (otro mp_payment_id, misma external_reference) sobre un Pago rechazado/pendiente debe aprobarse y activar la membresía (hoy se ignora por la rama `pago.mp_payment_id != str(data_id)`); (b) estados terminales no se degradan; (c) un único email de confirmación (campo Pago.confirmacion_enviada_at); (d) refunded/charged_back -> reembolsado + reembolsado_at + política sobre la membresía + aviso por email (confirmá la política con el dueño; por defecto cancelar la membresía creada por ese pago); (e) doble cobro -> raw_webhook['doble_cobro'] + log error; (f) ignorar notificaciones cuyo type/topic no sea 'payment'; (g) ImproperlyConfigured -> 503, no 500; 'unknown pago' -> 200 con warning. Agregá expiration_date_to (24h) en crear_preferencia y la tarea Celery payments.expire_pending_pagos (cancelar pendientes mercado_pago sin mp_payment_id con >24h) registrada con migración de datos como backend/apps/memberships/migrations/0004_seed_expiration_schedule.py. mis-pagos acepta ?external_reference=. Migración payments/0002 con confirmacion_enviada_at, reembolsado_at, monto_reembolsado.
Frontend: hook usePagoEstado(externalReference) con polling (3s, máx 30s) en hooks/queries/useMisPagos.js; PagoResultadoBanner recibe el estado real (aprobado/pendiente/rechazado/cancelado/reembolsado) con los copys de la ficha y botón 'Reintentar pago' a /socio/checkout?plan=<id>; CredencialDigitalPage usa external_reference del query string de retorno, invalida membresía y mis pagos al aprobarse; HistorialPagosPage/CheckoutPage según la ficha.
Tests primero en backend/apps/payments/tests/test_webhook.py (molde existente, helper _build_signature, patch de mercadopago_client.fetch_payment) y test_expire_pending.py, más vitest (renderWithProviders) para banner, hook y páginas.
Terminado cuando `cd backend && pytest -q` (cov>=80) y `cd frontend && npm run lint && npx vitest run --coverage && npm run build` pasan. No imprimas ni commitees credenciales de MercadoPago. Textos UI en español rioplatense. Sin commits.
```
