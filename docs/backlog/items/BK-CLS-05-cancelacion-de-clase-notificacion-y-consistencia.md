---
id: BK-CLS-05
titulo: Cancelación de clase - emails duplicables, bypass por PUT, sin aviso a la espera ni visibilidad posterior
tipo: bug
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-CLS-09]
---

# BK-CLS-05 · Cancelación de clase - emails duplicables, bypass por PUT, sin aviso a la espera ni visibilidad posterior

## 1. Resumen
La cancelación con motivo (mínimo 10 caracteres) existe y SÍ envía emails reales (vía Celery) a los inscriptos confirmados. Pero: la señal vuelve a mandar emails en cualquier `save()` posterior de una clase cancelada; el staff puede cancelar con un `PUT estado=cancelada` salteando el motivo; los que están en lista de espera no se enteran; el motivo no se expone en la API ni se ve en ninguna pantalla; las clases canceladas desaparecen del calendario y de "Mis reservas" sin rastro; y se cancela la clase completa (toda la serie recurrente para siempre) aunque la UI dice "cancelar la clase".

## 2. Objetivo de usuario
Como **recepcionista** quiero **cancelar una clase con motivo y que todos los afectados (confirmados y en espera) sean avisados una sola vez** para **evitar viajes en vano y reclamos**.
Como **socio** quiero **ver en la app que mi clase fue cancelada y por qué** para **no depender solo de un email**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/classes/models.py:45-47` | `estado` (`activa/cancelada/finalizada`), `fecha_cancelacion`, `motivo_cancelacion`. `finalizada` nunca se asigna en ningún servicio ni UI. |
| Backend servicio | `backend/apps/classes/services.py:9-28` | `cancelar_clase(clase, motivo, actor=None)`: valida no cancelada y `len(motivo.strip()) >= 10`; `save(update_fields=['estado','fecha_cancelacion','motivo_cancelacion'])`. `actor` se recibe pero no se usa (sin auditoría de quién canceló). Sin `transaction.atomic`. |
| Backend señal | `backend/apps/classes/signals.py:14-55` | `post_save` de `Clase`: si `not created` y `estado == cancelada`, itera `inscripciones.filter(en_espera=False)` y llama `enqueue_email(template_base='clase_cancelada', ...)` por socio con email. No distingue transición de re-guardado ni mira `update_fields`. |
| Backend email | `backend/apps/common/tasks.py:11-42` | `send_email_task` (Celery, `max_retries=3`) llama a `send_templated_email`, que captura toda excepción y devuelve 0 (`backend/apps/common/emails.py:25-71`): los reintentos de Celery nunca se disparan y la falla de entrega solo queda en log. Se envía de verdad: `celery-worker` y `celery-beat` están en `docker-compose` y en tests `CELERY_TASK_ALWAYS_EAGER=True` (`core/settings/test.py:16`). |
| Backend email | `backend/apps/common/templates/emails/clase_cancelada.html` | Template existente con nombre, clase, día/hora, motivo y fecha de cancelación. No hay push ni notificación in-app (rg `webpush|firebase|Notificacion` sin resultados). |
| Backend vista | `backend/apps/classes/views.py:127-144` | `POST /api/classes/clases/{id}/cancelar-clase/` (`IsReceptionistOrAdmin`), body `{motivo}`, responde `200 {"detail": "Clase cancelada correctamente."}`; no informa a cuántos se notificó. |
| Backend vista | `views.py:56-61,63-70` | `update`/`partial_update` permitidos a recepción; `ClaseSerializer.estado` es escribible (`serializers.py:50`). `PUT {"estado": "cancelada"}` cancela sin motivo y dispara emails con "Sin motivo especificado."; `PATCH {"estado": "activa"}` reactiva sin aviso. |
| Backend vista | `views.py:64-65` | `destroy` hard-delete solo admin: `CASCADE` borra las inscripciones sin avisar a nadie. |
| Backend serializer | `serializers.py:30-54` | `fecha_cancelacion` y `motivo_cancelacion` NO están en `ClaseSerializer`: ni el staff ni el socio pueden ver el motivo desde la API. |
| Backend filtro | `views.py:56-61` | Por defecto las canceladas se excluyen; solo con `?incluir_canceladas=true`. |
| Frontend | `frontend/src/pages/ClassSchedulePage.jsx:92-112` | El botón de papelera abre `CancelarClaseModal`; en éxito cierra y des-selecciona. Nunca pasa `incluir_canceladas`, por lo que la clase simplemente desaparece. |
| Frontend | `frontend/src/components/classes/ClassListDetailView.jsx:315-321` | El icono de papelera tiene `title="Eliminar clase"` pero hace soft-cancel; el badge siempre dice "Activa" (`:163-166`). |
| Frontend modal | `frontend/src/components/classes/CancelarClaseModal.jsx:9-14,51-54` | Zod `motivo` min 10 / max 500 (el backend no valida el máximo); copy: "cancela la clase y notifica a todos los socios inscriptos por email. No es reversible desde el panel." (no aclara que es toda la serie ni que la espera no se entera). |
| Frontend hook | `frontend/src/hooks/queries/useClases.js:86-94,96-106` | Existe `remove` (DELETE) sin uso en UI; `cancelar` -> `POST .../cancelar-clase/`. |
| Frontend socio | `frontend/src/pages/socio/ClasesPage.jsx:73-90` | "Mis reservas" filtra `user_inscrito` sobre la lista que ya no trae canceladas: la reserva cancelada desaparece sin explicación. |
| Tests | `backend/apps/classes/tests/test_soft_cancel.py` | Cubre estado, motivo corto, permisos, que se encole un email por inscripto y el filtro por defecto. No cubre re-guardado, PUT con `estado`, ni espera. |

## 4. Alcance
**Incluye:**
- Disparar emails solo en la transición a cancelada (mover el envío al servicio con `transaction.on_commit`, o mantener señal comparando estado previo).
- Notificar también a los de lista de espera (texto distinto: "La clase a la que estabas en lista de espera fue cancelada").
- Bloquear cambios de `estado` por `PUT/PATCH` (read-only; solo servicio `cancelar_clase`) y registrar `cancelada_por`.
- Exponer `fecha_cancelacion` y `motivo_cancelacion` en la API y mostrarlos al staff y al socio.
- Mostrar clases canceladas con estado visible (staff: toggle "Ver canceladas"; socio: aviso en "Mis reservas").
- Corregir el ícono/rótulo ("Cancelar clase") y devolver cuántos fueron notificados.
- Reactivar una clase cancelada (acción explícita) - ver decisión abierta.

**No incluye:**
- Cancelar solo una fecha concreta de una serie (BK-CLS-09; es la corrección de fondo).
- Notificaciones in-app / push (nueva ficha PLT; aquí solo se deja el punto de extensión).
- Reembolso/crédito de `clases_asignadas`.

## 5. Contrato de API
- **[EXISTE]** `POST /api/classes/clases/{id}/cancelar-clase/` — `IsReceptionistOrAdmin`; body `{"motivo": "string (>=10, <=500)"}`.
  - Hoy: `200 {"detail": "Clase cancelada correctamente."}`; `400 {"motivo": "El motivo debe tener al menos 10 caracteres."}`; `400 {"detail": "La clase ya está cancelada."}`; `403` socio; `404` si ya cancelada y se consulta sin `incluir_canceladas`.
  - **[A CREAR]** respuesta `200 {"detail": "...", "notificados": n, "en_espera_notificados": n}`; `400 {"motivo": "El motivo no puede superar los 500 caracteres."}`.
- **[A CREAR]** `POST /api/classes/clases/{id}/reactivar/` — `IsReceptionistOrAdmin`; `200` -> `ClaseSerializer`; `400 {"detail": "La clase no está cancelada."}`. (Opcional: email "la clase se reactivó".)
- **[EXISTE]** `PUT/PATCH /api/classes/clases/{id}/` — **[A CREAR]** `estado`, `fecha_cancelacion`, `motivo_cancelacion` read-only; error al intentar cambiar `estado`: ignorado o `400 {"estado": "Usá /cancelar-clase/."}` (recomendado: 400).
- **[A CREAR]** `ClaseSerializer` agrega `fecha_cancelacion` (datetime ISO|null) y `motivo_cancelacion` (string).
- **[EXISTE]** `GET /api/classes/clases/?incluir_canceladas=true` (staff) para listar canceladas.

## 6. Modelo de datos
- `Clase.cancelada_por = ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=SET_NULL, related_name='+')` + migración `0011`.
- Sin cambios para `finalizada` (decisión: eliminarla o darle ciclo de vida; ver BK-CLS-09).

## 7. Diseño frontend
- **Rutas/guard:** `/admin/clases` (`frontend/src/App.jsx:83-85`, `<ProtectedRoute roles={['administrador','recepcionista']}>`); `/socio/clases` (`:131`).
- **Reutilizar:** `CancelarClaseModal` (props: `isOpen, onClose, clase, onConfirm(motivo), loading`; usa `react-hook-form` + `zodResolver`), `Modal`, `Badge`, `Button variant="danger"`.
- **Cambios:** (1) ícono/`title` "Cancelar clase"; (2) badge de estado en `ClassListDetailView` según `current.estado` (`Activa`/`Cancelada` con motivo); (3) `useClasesList({ incluir_canceladas: true })` bajo un toggle "Mostrar canceladas" en `ClassSchedulePage`; (4) tarjeta del socio con estado "Clase cancelada: {motivo}" en `ClassCard` variante `booked`.
- **Hook nuevo:** `reactivar` dentro de `useClasesMutations` (mismo patrón: `useMutation`, `invalidate()`, `toast` de `sonner`).
- **Estados:** loading con `Button loading`; error `toast.error(detail)`; éxito `toast.success('Clase cancelada. Avisamos a {n} socios.')`.
- **Textos (voseo):** modal "Vas a cancelar esta clase para todas sus fechas. Avisamos por email a los {n} inscriptos y a los {m} en lista de espera." / "Motivo (se lo mostramos a los socios)".
- **Responsive:** el modal ya es `Modal` apilado; en 375 px botones a ancho completo (ya `flex-1`).

## 8. Archivos a crear / modificar
- `backend/apps/classes/services.py`: `cancelar_clase` guarda `cancelada_por`, envía emails en `transaction.on_commit`, devuelve conteos; nuevo `reactivar_clase`.
- `backend/apps/classes/signals.py`: eliminar o reducir a guard de transición (comparar con valor previo).
- `backend/apps/classes/serializers.py`, `views.py`, `models.py`, migración `0011_...`.
- `backend/apps/common/templates/emails/clase_cancelada.html` (variante para espera) o `clase_cancelada_espera.html`.
- `frontend/src/pages/ClassSchedulePage.jsx`, `components/classes/ClassListDetailView.jsx`, `components/classes/CancelarClaseModal.jsx`, `components/socio/ClassCard.jsx`, `hooks/queries/useClases.js`.

## 9. Plan de pruebas (TDD)
Backend (`backend/apps/classes/tests/test_soft_cancel.py` ampliado; patrón `patch('apps.classes.signals.enqueue_email')` o `patch('apps.classes.services.enqueue_email')`; correr `cd backend && pytest apps/classes -q`):
- Re-guardar una clase cancelada (`clase.save()` y `PATCH nombre`) NO vuelve a encolar emails.
- `PUT/PATCH {"estado": "cancelada"}` por recepción -> 400/ignorado y no se encola nada.
- Se encola email a confirmados y otro (template de espera) a `en_espera=True`.
- Socio sin email no rompe y no cuenta como notificado.
- Respuesta incluye `notificados`/`en_espera_notificados`.
- `reactivar`: 200 y estado `activa`; en clase activa 400; socio 403.
- `GET` expone `motivo_cancelacion` solo con `incluir_canceladas`; el motivo >500 -> 400.
- `cancelada_por` queda seteado al usuario que ejecutó.
Frontend (vitest/RTL; actualizar `components/classes/__tests__/CancelarClaseModal.test.jsx`, `pages/__tests__/ClassSchedulePage.test.jsx`, `ClassCard.test.jsx`): copy nuevo, toggle de canceladas, badge de estado, tarjeta del socio con motivo.
Manual: con `recepcion@winnie.local` cancelar una clase con 1 inscripto y 1 en espera (cuentas del seed); verificar 2 emails (consola/Mailtrap); recargar `/admin/clases` con "Mostrar canceladas".

## 10. Criterios de aceptación
- **Dado** una clase cancelada **cuando** staff la edita (nombre, cupo) **entonces** no se envían emails nuevos.
- **Dado** una clase con 3 confirmados y 2 en espera **cuando** se cancela **entonces** los 5 reciben email y la API informa 3 + 2.
- **Dado** un PUT con `estado='cancelada'` **cuando** lo manda recepción **entonces** es rechazado.
- **Dado** que un socio tenía reserva **cuando** la clase se cancela **entonces** en "Mis reservas" ve "Clase cancelada" con el motivo.

## 11. Riesgos y decisiones abiertas
- Cancelar hoy cancela toda la serie semanal sin fecha de retorno (`Clase` es plantilla). Recomendación: no entregar la UX final sin BK-CLS-09; mientras tanto el copy debe decirlo con claridad.
- ¿Se puede reactivar? Recomendación: sí, con acción explícita y email opcional.
- ¿Los socios cancelados siguen anotados? Recomendación: conservar inscripciones pero marcarlas `cancelada` en la futura sesión.
- Si Redis/broker está caído, `send_email_task.delay` puede lanzar excepción dentro de `post_save` luego de persistir el cambio (no verificado en runtime); usar `on_commit` + manejo de error.
- Email: no hay registro de entregas; considerar tabla de notificaciones (PLT).

## 12. Referencias
- `speckit/spec.md` REQ-3.4 (soft-cancel con email); `speckit/class-model-architecture-decision/explore.md` §6.
- Commit `ec764cd` (introdujo el soft-cancel).
- Ver también (otras áreas): BK-PLT-07 (notificaciones in-app) y BK-PLT-06 (emails sin marca).
- Figma opcional: "CancelarClaseModal" en la página "vistas live".

## 13. Prompt listo para un agente de IA
Contexto: Winnie The Gym. `backend/apps/classes/services.py::cancelar_clase` marca la clase `cancelada` y `backend/apps/classes/signals.py` (post_save) manda `clase_cancelada` por `enqueue_email` a los confirmados. Problemas: la señal reenvía en cualquier save posterior; `ClaseSerializer.estado` es escribible (se puede cancelar por PUT sin motivo); no se avisa a `en_espera=True`; `motivo_cancelacion`/`fecha_cancelacion` no se serializan; el frontend nunca muestra canceladas.
Tarea (TDD): ampliar `backend/apps/classes/tests/test_soft_cancel.py` con los casos de la sección 9 y verlos fallar; luego: mover el envío a `cancelar_clase` con `transaction.on_commit` (eliminar la señal o dejarla como no-op), `estado` read-only en `ClaseSerializer` + exponer `fecha_cancelacion`/`motivo_cancelacion`, `cancelada_por` (migración), notificación a lista de espera con template propio, endpoint `reactivar`, respuesta con conteos. Frontend: toggle "Mostrar canceladas" (`useClasesList({ incluir_canceladas: true })`), badge de estado, copy del modal en voseo ("Vas a cancelar esta clase para todas sus fechas..."), tarjeta del socio con motivo. Convenciones: errores `ValidationError({'detail': ...})`, toasts `sonner`, hooks en `frontend/src/hooks/queries/useClases.js`. Comandos: `cd backend && pytest apps/classes -q`; `cd frontend && npx vitest run && npm run lint`. No tocar `backend/loadtests/*`. Terminado: criterios de la sección 10 verdes y sin regresiones en `test_soft_cancel.py` existente.
