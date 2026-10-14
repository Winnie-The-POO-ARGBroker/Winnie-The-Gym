---
id: BK-FIN-07
titulo: Renovación self-service - cerrar el endpoint que activa membresías gratis y definir la política de apilado de días
tipo: bug
roles: [socio, administrador, recepcionista]
prioridad: P0
tamano: M
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-FIN-08]
---

# BK-FIN-07 · Renovación self-service: `me/renew` sin pago y días que se pierden

## 1. Resumen
Existe `POST /api/memberships/me/renew/` que cualquier socio autenticado puede llamar para obtener una membresía **activa sin pagar**; el frontend no lo usa (renueva por MercadoPago), pero la ruta está expuesta y testeada como flujo feliz. Además, tanto la renovación como el cobro manual y el webhook **descartan los días restantes** de la membresía vigente, aunque la UI de recepción promete lo contrario. Hay que cerrar el agujero, unificar la lógica de renovación y definir la política de apilado.

## 2. Objetivo de usuario
Como **socio** quiero **renovar mi plan pagando desde mi celular, con botón "Renovar" visible cuando se acerca o pasó el vencimiento** para **no perder acceso**; como **dueño del gimnasio** quiero **que nadie pueda activarse una membresía sin pagar y que los días no consumidos se respeten** para **evitar pérdidas y reclamos**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend API | `backend/apps/memberships/urls.py:12-15`, `views.py:83-106` | `MeRenewView` (`IsSocio`): `POST /api/memberships/me/renew/` con `{plan_id}` -> `renovar_membresia(socio, plan)` -> `201` con la membresía `activa`. **Sin pago, sin verificación de nada.** Cualquier socio puede reiniciar su membresía gratis tantas veces como quiera. |
| Backend tests | `backend/apps/memberships/tests/test_renewal_flow.py:19-54` | `test_renewal_happy_path_201` y `test_renewal_no_prior_membership_201` **consagran** ese comportamiento como correcto. |
| Frontend | `rg "me/renew\|renew" frontend/src` (sin tests) | **Ninguna** referencia: la UI no usa el endpoint. Es una API huérfana y vulnerable. |
| Backend servicio | `backend/apps/memberships/services.py:7-36` | `renovar_membresia`: `fecha_inicio = hoy`, `fecha_fin = inicio + plan.duracion_dias`; marca `activa -> vencida` **aunque le queden días**. |
| Backend pagos | `backend/apps/payments/services.py:68-86` | `_activate_membership(pago)`: lógica **duplicada** de la anterior (misma política), usada por webhook (`:303`) y por `cobro_manual` (`:186`). `docs/architecture.md:124` dice que el webhook llama `renovar_membresia`, lo que no es cierto. |
| Frontend recepción | `frontend/src/pages/recepcion/CobroManualPage.jsx:254-268` | Aviso "Este socio ya tiene una membresía activa hasta el <fecha>. **El cobro extenderá desde esa fecha.**" -> **falso**: el backend arranca desde hoy y vence la anterior (los días restantes se pierden). |
| Frontend checkout | `frontend/src/App.jsx:132`, `frontend/src/pages/socio/CheckoutPage.jsx:75-137` | `/socio/checkout` (`roles={['socio']}`): lista planes activos (`usePlanesQuery`, primera página de 10 planes, `usePlanesAdmin.js:14-24`) y botón "Pagar con MercadoPago" por plan. No muestra el plan actual, ni vencimiento, ni cuánto se acumula. |
| Frontend CTA | `frontend/src/components/layout/Sidebar.jsx:45`, `components/layout/MemberLayout.jsx:141-155` | Acceso solo por menú ("Pagar membresía" / ícono "Pagar" de la barra inferior). |
| Frontend credencial | `frontend/src/components/socio/MembershipExpiredAlert.jsx:15` | "Acercate a recepción para renovar": sin botón de pago; no hay CTA de renovación cuando faltan pocos días (la tarjeta de membresía `MemberPlanDetails` no se verificó). |
| Backend email | `backend/apps/common/templates/emails/expiration_alert.txt:7` | Link a la raíz del frontend, no a `/socio/checkout`. |
| Frontend plan | `frontend/src/pages/socio/CheckoutPage.jsx:14` | Lee `plan.descripcion`, campo **inexistente** en `PlanMembresia` (`backend/apps/memberships/models.py:8-16`, serializer `serializers.py:18`): los beneficios del plan nunca se muestran. |
| Spec | `openspec/changes/socios-membresias/proposal.md:14-15` y `verify-report.md:130-138,300` | El change `socios-membresias` definió "self-service `POST /me/renew` for socio role" y "socio read-own + renew-own" **antes** de existir el gateway de pagos (`proposal.md:20` deja la pasarela fuera de alcance). Con MercadoPago integrado el endpoint quedó obsoleto y es un agujero: el verify-report lo marca como ✅ (201). |

## 4. Alcance
**Incluye:**
- Cerrar `POST /api/memberships/me/renew/`: eliminar la ruta (recomendado) o responder `410 Gone` con mensaje apuntando al checkout; actualizar/eliminar los tests que lo consagran.
- Servicio único `renovar_membresia(socio, plan, *, fecha_inicio=None, politica=...)` en `memberships/services.py`, usado por webhook, cobro manual y renovación admin (BK-FIN-06); eliminar `_activate_membership` duplicado.
- Política de apilado (ver decisión 1): por defecto **acumular los días restantes**.
- Corregir el aviso de `CobroManualPage` para que describa la política real y muestre la nueva fecha de vencimiento estimada.
- CTA "Renovar" en la credencial y en el email; checkout con "Tu plan actual", vencimiento y preselección por `?plan=<id>`.
- Mostrar nuevo vencimiento en la confirmación y en el email de pago (`payment_confirmation`).

**No incluye:** pagos recurrentes/débito automático (no existe; ver decisión 4), estados de pago y webhook (BK-FIN-08), acciones de suspensión/cancelación (BK-FIN-06), descripción de planes (área planes: agregar `descripcion` a `PlanMembresia`).

## 5. Contrato de API
- **[EXISTE → ELIMINAR/410]** `POST /api/memberships/me/renew/`. Si se mantiene como 410: `{"detail": "Renová tu membresía desde el checkout de pago."}`.
- **[EXISTE → MODIFICAR]** `GET /api/memberships/me/` (`MeView`, `IsSocio`, `SocioMeSerializer`, `serializers.py:59-92`): agregar `ultima_membresia` (misma forma que `membresia_activa`, la más reciente por `fecha_fin` en cualquier estado) y `dias_restantes` (int, `null` si no hay vigente). Hoy `membresia_activa` es `null` cuando venció.
- **[EXISTE]** `POST /api/payments/preferencias/` `{plan_id}` -> `201 {pago_id, preference_id, init_point, sandbox_init_point, external_reference}` (`payments/views.py:71-96`; errores `404` plan inexistente/inactivo, `502` `{"detail": "No se pudo generar la preferencia con MercadoPago."}`).
- **Servicio** (no HTTP): `renovar_membresia(socio, plan, *, fecha_inicio=None, acumular=True)`:
  - `vigente = socio.membresias.filter(estado='activa', fecha_fin__gte=hoy).order_by('-fecha_fin').first()`
  - `restante = (vigente.fecha_fin - hoy).days if vigente and acumular else 0`
  - nueva: `fecha_inicio = hoy`, `fecha_fin = hoy + timedelta(days=restante + plan.duracion_dias)`, `estado='activa'`; la vigente pasa a `vencida` (o a un estado `renovada`, decisión 2). Todo en `transaction.atomic()` con `select_for_update()` sobre las membresías del socio para evitar carreras entre webhook y cobro manual simultáneos.

## 6. Modelo de datos
Sin cambios obligatorios. Opcional (decisión 2): estado `renovada` en `Membresia.Estado` (migración de choices, sin cambio de columna) para distinguir "reemplazada por renovación" de "vencida por falta de pago" en reportes de morosidad (BK-FIN-03). Opcional: `Membresia.pago_origen` FK a `payments.Pago` para trazabilidad (hoy el vínculo está del lado de `Pago.membresia`, `payments/models.py:31-36`).

## 7. Diseño frontend
- **Rutas/guard:** `/socio/checkout` ya existe (`roles={['socio']}`, `App.jsx:132`). Aceptar `?plan=<id>` para preseleccionar/resaltar.
- **Reutilizar:** `CheckoutPage` (`PlanCard` local, props `plan`, `onPagar`, `loading`), `useCrearPreferenciaMutation` (`usePagos.js:36-51`, redirige con `window.location.href`), `useSocioMembresiaMe` (`useMembresias.js:17-27`), `MembershipExpiredAlert`, `MemberLayout` (props `title`, `subtitle`, `member`, `rightAction`).
- **Cambios:**
  - `CheckoutPage`: bloque superior "Tu plan actual: <nombre> · vence el <fecha> (faltan N días)" con `useSocioMembresiaMe`; al elegir un plan mostrar "Tu nueva membresía vencerá el <fecha estimada> (sumamos los N días que te quedan)"; quitar `plan.descripcion` o condicionarlo hasta que el campo exista.
  - `CredencialDigitalPage`/`MembershipExpiredAlert`: botón "Renovar ahora" (`Link` a `/socio/checkout`) cuando `isExpired` o `dias_restantes <= 7`.
  - `CobroManualPage.jsx:261-266`: reemplazar el texto por la política real (ej.: "Se sumarán los N días restantes; la nueva membresía vencerá el <fecha>") calculado en cliente con `membresiaActiva.fecha_fin` + `plan.duracion_dias`.
- **Estados:** loading (skeleton de planes ya existente), vacío ("Sin planes disponibles", ya existe), error (toast "Error al iniciar el pago. Intentá nuevamente.", ya existe en `usePagos.js:48`), éxito (redirección a MP y retorno, BK-FIN-08).
- **Textos (voseo):** "Renovar ahora", "Tu plan vence en 5 días", "Si renovás hoy, tu nueva membresía vence el 30/11/2026 (sumamos los 5 días que te quedan).".
- **Responsive:** 375 px una tarjeta por plan (ya es columna); el bloque "plan actual" sticky arriba en mobile.

## 8. Archivos a crear / modificar
- Backend: `memberships/views.py` + `urls.py` (quitar `MeRenewView`/`me-renew`), `memberships/services.py` (servicio unificado), `payments/services.py` (reemplazar `_activate_membership` por `renovar_membresia`), `memberships/serializers.py` (`ultima_membresia`, `dias_restantes`), plantillas `expiration_alert.*` y `payment_confirmation.*` (link y nuevo vencimiento).
- Tests backend: reescribir `memberships/tests/test_renewal_flow.py` (ahora prueba el servicio y que la ruta ya no activa), `payments/tests/test_cobro_manual.py`, `test_webhook.py`, `memberships/tests/test_memberships_services.py`.
- Frontend: `CheckoutPage.jsx` (+ `CheckoutPage.test.jsx`), `CredencialDigitalPage.jsx`, `MembershipExpiredAlert.jsx`, `CobroManualPage.jsx` (+ tests en `pages/recepcion/__tests__/CobroManualPage.test.jsx` y `CobroManualPage.handlers.test.jsx`), `docs/architecture.md` (corregir el flujo).

## 9. Plan de pruebas (TDD)
**Backend** (`cd backend && pytest -q apps/memberships/tests apps/payments/tests`; `TestCase`/`APITestCase`, factories `conftest.py:23-75`):
1. `POST /api/memberships/me/renew/` por un socio **no** crea ni activa membresía (`404`/`410`); no existe efecto en DB.
2. Servicio con acumulación: membresía vigente con 5 días restantes + plan de 30 -> nueva `fecha_fin = hoy + 35`; anterior queda `vencida`/`renovada`.
3. Servicio sin vigente (vencida): `fecha_fin = hoy + duracion_dias`.
4. Webhook `approved` y cobro manual aplican la misma política (tests que comparan `fecha_fin`).
5. Concurrencia: dos llamadas seguidas no dejan dos `activa` (con el constraint de BK-FIN-06 o por `select_for_update`).
6. `GET /api/memberships/me/` devuelve `ultima_membresia` y `dias_restantes` para vencida y para vigente.
**Frontend** (`npx vitest run src/pages/socio src/pages/recepcion src/components/socio`): checkout muestra plan actual y nueva fecha estimada; alerta de vencida tiene botón a `/socio/checkout`; `CobroManualPage` muestra el texto real del apilado y la nueva fecha.
**Manual:** `socio.vencido@winnie.local` abre credencial -> "Renovar ahora" -> checkout (sandbox MP, ver BK-FIN-08); como `recepcion@winnie.local` cobrar a `socio.activo@winnie.local` y verificar que el vencimiento suma los días restantes.

## 10. Criterios de aceptación
- **Dado** un socio autenticado **cuando** llama a `me/renew` **entonces** no obtiene membresía activa sin pago.
- **Dado** una membresía con 5 días restantes **cuando** se aprueba un pago de plan 30 días **entonces** la nueva vence en 35 días desde hoy.
- **Dado** un socio con membresía vencida **cuando** abre la credencial **entonces** ve "Renovar ahora" y la fecha en que venció.
- **Dado** una recepcionista cobrando a un socio vigente **cuando** selecciona plan **entonces** ve la nueva fecha de vencimiento correcta (coincide con el resultado real).

## 11. Riesgos y decisiones abiertas
1. **Política de apilado** (pregunta central al dueño): (A) arrancar hoy y perder los días restantes (lo actual); (B) acumular (recomendado, evita reclamos); (C) la nueva arranca el día siguiente al `fecha_fin` vigente (la anterior sigue `activa` hasta entonces; exige estado `programada` y cambiar el chequeo de acceso). Recomendación por defecto: B.
2. ¿Estado `renovada` para la anterior? Recomendación: sí, para que morosidad no la confunda (BK-FIN-03).
3. Cambio de plan a mitad de ciclo (upgrade/downgrade): ¿prorrateo? Recomendación: sin prorrateo en v1; se acumulan días, se aplica el plan nuevo.
4. ¿Renovación automática (suscripción recurrente de MercadoPago)? La UI de alta de socio la muestra ("Renovación Automática", `PlanPagoCard.jsx:37-45`) pero no existe en backend ni en el modelo. Recomendación: sacar el campo de la UI hasta decidir; evaluar "Suscripciones" de MP como proyecto aparte (XL).
5. Eliminar la ruta puede romper algún consumidor externo desconocido: **No verificado** fuera del repo.

## 12. Referencias
- `docs/architecture.md:113-126` (flujo de pago; corregir `renovar_membresia`), `openspec/changes/socios-membresias/proposal.md:20`.
- Figma (solo apoyo visual opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", Mobile: Pagar / Credencial.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym. TDD estricto. Implementá docs/backlog/items/BK-FIN-07-renovacion-self-service-me-renew-y-politica-de-apilado.md.

Problema crítico: POST /api/memberships/me/renew/ (backend/apps/memberships/views.py MeRenewView, urls.py) deja a cualquier socio activar una membresía sin pagar; el frontend no lo usa y backend/apps/memberships/tests/test_renewal_flow.py lo consagra. Además payments/services.py::_activate_membership duplica memberships/services.py::renovar_membresia y ambos descartan los días restantes, mientras CobroManualPage.jsx:261-266 promete 'extenderá desde esa fecha'.

Hacé:
1. Quitá MeRenewView y la ruta me/renew/ (o respondé 410 con {'detail': 'Renová tu membresía desde el checkout de pago.'}); reescribí test_renewal_flow.py para probar el servicio y que el endpoint ya no activa nada.
2. Unificá en memberships/services.py::renovar_membresia(socio, plan, *, fecha_inicio=None, acumular=True) con transaction.atomic() + select_for_update, política de acumular días restantes de la membresía vigente (fecha_fin = hoy + restante + plan.duracion_dias); payments/services.py (webhook y cobro_manual) debe usar ese servicio y se borra _activate_membership.
3. SocioMeSerializer: agregá ultima_membresia y dias_restantes.
4. Frontend: CheckoutPage muestra plan actual y nueva fecha estimada y acepta ?plan=<id>; MembershipExpiredAlert/CredencialDigitalPage con botón 'Renovar ahora' (Link a /socio/checkout) si venció o dias_restantes<=7; CobroManualPage muestra la política real y la nueva fecha; plantillas de email expiration_alert/payment_confirmation con link a {{frontend_url}}/socio/checkout y nuevo vencimiento.
Tests primero (backend: APITestCase/TestCase con factories de backend/conftest.py; frontend: vitest + renderWithProviders de src/test/test-utils.jsx).
Terminado cuando `cd backend && pytest -q` (cov>=80) y `cd frontend && npm run lint && npx vitest run --coverage && npm run build` pasan. Textos UI en español rioplatense. Sin commits.
```
