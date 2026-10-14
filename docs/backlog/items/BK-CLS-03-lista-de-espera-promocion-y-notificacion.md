---
id: BK-CLS-03
titulo: Lista de espera - "Habilitar" es falso, promoción incompleta y sin notificación al promovido
tipo: bug
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: M
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-CLS-02, BK-CLS-04]
---

# BK-CLS-03 · Lista de espera - "Habilitar" es falso, promoción incompleta y sin notificación al promovido

## 1. Resumen
El backend sabe poner socios en lista de espera y promover automáticamente al primero cuando un socio cancela, pero: (a) el botón "Habilitar" de la pantalla de asistencia solo muestra un toast de éxito sin llamar a ningún endpoint; (b) la promoción automática solo ocurre en un camino (cancelación del socio) y no en otros que liberan lugar; (c) el socio promovido nunca se entera (no hay email ni push); (d) la UI del staff muestra datos inexistentes de los anotados. Se genera una falsa sensación de que se habilitó a alguien.

## 2. Objetivo de usuario
Como **recepcionista** quiero **habilitar manualmente al siguiente de la lista de espera cuando alguien falta o se libera un lugar** para **llenar la clase y que el socio sepa que ya tiene lugar**.
Como **socio en lista de espera** quiero **recibir un aviso cuando paso a tener cupo confirmado** para **ir a la clase o cancelar a tiempo**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/classes/models.py:40,76` | `lista_espera_max` (default 5) en `Clase`; `en_espera` en `InscripcionClase`. Sin posición explícita: el orden es `created_at`. |
| Backend servicio | `backend/apps/classes/services.py:42-67` | `inscribir_socio`: si `cupos_ocupados >= cupo_maximo` crea la inscripción con `en_espera=True`; si la lista está llena -> `ValidationError({'detail': 'La clase y su lista de espera están completas.'})`. No es atómico (sin `transaction.atomic`/`select_for_update`). |
| Backend servicio | `backend/apps/classes/services.py:82-127` | `cancelar_inscripcion` borra la inscripción y, si era confirmada, promueve a la más antigua en espera (`order_by('created_at').first()`; `en_espera=False`). Devuelve `True/False`. No envía nada al promovido. |
| Backend vista | `backend/apps/classes/views.py:114-125` | `POST /clases/{id}/cancelar/` responde `{'detail': 'Inscripción cancelada.', 'promovido_de_espera': bool}`. |
| Backend vista | `backend/apps/classes/views.py:155-161` | `InscripcionClaseViewSet` (staff): `destroy`/`update` son ModelViewSet puros: borrar una inscripción confirmada o hacer `PATCH en_espera=false` NO dispara promoción ni valida cupo. |
| Backend emails | `backend/apps/common/templates/emails/` (`_base, clase_cancelada, expiration_alert, payment_confirmation, welcome`) | No existe template de "promovido de lista de espera". No hay infraestructura de push (rg `webpush|firebase|fcm` sin resultados en `backend/apps`). |
| Backend emails | `backend/apps/classes/signals.py:22` | La señal de cancelación de clase solo avisa a `en_espera=False`; los anotados en espera no reciben aviso (ver BK-CLS-05). |
| Frontend página | `frontend/src/pages/AttendancePage.jsx:35-44` | `handlePromoteFromWaitingList`: `toast.success('${nombre} habilitado e inscripto')` + `fetchAttendees()`; comentario "In the real system, promoting could mean...". Cero llamadas a la API. |
| Frontend página | `AttendancePage.jsx:308-330` | La fila muestra `person.nombre` y `person.plan` (el serializer da `socio_nombre`/`socio_apellido`, no `plan`). Sin posición en la fila. |
| Frontend socio | `frontend/src/components/socio/ClassCard.jsx:143-151` | Con clase llena el botón queda `disabled` "Sin cupos disponibles": el socio NO puede anotarse en lista de espera desde la UI (ver BK-CLS-08). |
| Frontend admin | `frontend/src/components/classes/ClassListDetailView.jsx:269` | `Lista de espera: {current.lista_espera_max || 5} cupos`: si el límite es 0 muestra 5. No muestra cuántos hay en espera. |
| Tests | `backend/apps/classes/tests/test_cancel_flow.py:69-83` | Cubre solo la promoción por cancelación del socio. Sin tests de promoción por otros caminos ni de notificación. |

## 4. Alcance
**Incluye:**
- Servicio único `promover_de_espera(clase)` (atómico) usado por: cancelación del socio, borrado de inscripción por staff, aumento de `cupo_maximo` y acción manual.
- Endpoint de promoción manual por staff.
- Email al socio promovido (template + `enqueue_email`).
- UI de "Habilitar" real con estados de loading/error y posición en la fila.
- Corregir `lista_espera_max || 5`.

**No incluye:**
- Permitir al socio anotarse a la espera desde la app y ver su estado (BK-CLS-08).
- Push notifications (no existe infraestructura; propuesta abierta en riesgos).
- Reglas de plan/membresía al promover (BK-CLS-04; este ítem debe llamarlas cuando existan).
- Promoción por ocurrencia/fecha (BK-CLS-09).

## 5. Contrato de API
- **[EXISTE]** `POST /api/classes/clases/{id}/inscribir/` (IsSocio) -> `201` `InscripcionClaseSerializer` (`id, clase, socio, socio_nombre, socio_apellido, socio_numero, asistio, en_espera, created_at`).
- **[EXISTE]** `POST /api/classes/clases/{id}/cancelar/` (IsSocio) -> `200 {"detail": "Inscripción cancelada.", "promovido_de_espera": true|false}`.
- **[A CREAR]** `POST /api/classes/inscripciones/{id}/promover/` — `IsReceptionistOrAdmin`. Sin body (opcional `{"forzar": true}` para sobrecupo, solo `administrador`; decisión abierta).
  - `200` -> `InscripcionClaseSerializer` con `en_espera=false`.
  - `400 {"detail": "La inscripción no está en lista de espera."}`.
  - `400 {"detail": "La clase no tiene cupo disponible."}` si `cupos_reservados >= cupo_maximo` y no es `forzar`.
  - `400 {"detail": "La clase está cancelada."}`.
  - `403` para socios.
- **[A CREAR]** `GET /api/classes/clases/{id}/` agrega a cada inscripción en espera `posicion_espera` (int, 1-based, por `created_at`) y a la clase `en_lista_espera` (int). (Solo staff; ver BK-CLS-02 sobre exposición de `inscripciones`.)

## 6. Modelo de datos
Sin cambios obligatorios (la posición se calcula por `created_at`). Opcional: `InscripcionClase.promovida_at = DateTimeField(null=True)` para auditoría y para no re-notificar.

## 7. Diseño frontend
- **Ruta:** `/admin/clases/asistencia?id=` (`frontend/src/App.jsx:89-91`, `<ProtectedRoute roles={['administrador','recepcionista']}>`).
- **Reutilizar:** `AttendancePage.jsx` sección "Lista de espera" (líneas 291-339); `Avatar`, `Button` (`variant`, `loading`).
- **Hook nuevo:** `useClassAttendees` (`frontend/src/hooks/queries/useClassAttendees.js`) expone `promote(inscripcionId)`: `useMutation` -> `api.post(`/classes/inscripciones/${id}/promover/`)`, `onSuccess`: invalidar `ATTENDEES_QUERY_KEYS.byClass(classId)` y `CLASES_QUERY_KEYS.all` + `toast.success` (sonner); `onError`: `toast.error(err.response.data.detail)`.
- **Estados:** botón "Habilitar" con `loading`; deshabilitado si `confirmados >= cupo_maximo` con tooltip "No hay lugar libre. Marcá a alguien como ausente o aumentá el cupo."; vacío "No hay socios en lista de espera actualmente."
- **Textos (voseo):** toast éxito "{nombre} ya está inscripto. Le avisamos por email."; error "No pudimos habilitar al socio. Probá de nuevo."
- **Responsive:** la sidebar de lista de espera (`xl:w-[340px]`) se apila debajo en `< xl`; a 375 px la fila debe permitir nombre + botón en 2 líneas.

## 8. Archivos a crear / modificar
- `backend/apps/classes/services.py`: `promover_de_espera(clase, *, forzar=False)` con `transaction.atomic()` + `select_for_update()`; refactor de `cancelar_inscripcion` para usarla.
- `backend/apps/classes/views.py`: `@action(detail=True, methods=['post'], url_path='promover')` en `InscripcionClaseViewSet`; `perform_destroy` que promueve si la baja era confirmada.
- `backend/apps/classes/signals.py` (o servicio): al subir `cupo_maximo` en update de `Clase`, promover hasta llenar.
- `backend/apps/common/templates/emails/clase_promovida.html` (extiende `emails/_base.html`, como `clase_cancelada.html`).
- `backend/apps/classes/serializers.py`: `posicion_espera`.
- `frontend/src/hooks/queries/useClassAttendees.js`, `frontend/src/pages/AttendancePage.jsx`, `frontend/src/components/classes/ClassListDetailView.jsx:269`.

## 9. Plan de pruebas (TDD)
Backend (`backend/apps/classes/tests/test_waitlist.py`, `APITestCase`, `make_user_factory`/`make_socio_factory`; `core.settings.test` usa `CELERY_TASK_ALWAYS_EAGER=True` y `EmailBackend` locmem, así que se verifica con `django.core.mail.outbox` o `patch('apps.classes.services.enqueue_email')` como en `test_soft_cancel.py`):
- Promover manual: en espera + cupo libre -> 200 y `en_espera=False`; sin cupo -> 400; ya confirmado -> 400; clase cancelada -> 400; socio -> 403.
- Borrar inscripción confirmada por staff promueve a la más antigua.
- Subir `cupo_maximo` de 2 a 4 con 3 en espera promueve 2.
- Se encola email al promovido (`category='clase_promovida'`); sin email del usuario no rompe (`socio.usuario.email` vacío).
- Concurrencia: dos `inscribir` simultáneos con 1 cupo no superan `cupo_maximo` (test con `TransactionTestCase` o verificación de lock).
- Orden FIFO por `created_at`.
Frontend (`frontend/src/pages/AttendancePage.test.jsx`, vitest + RTL): click en "Habilitar" llama al POST (mock de `api.post`), muestra toast, deshabilita sin cupo, muestra error del backend.
Manual: crear clase con cupo 1, anotar 2 socios (`socio.activo@winnie.local` + otro del seed), el segundo queda en espera; staff marca/cancela y "Habilita"; verificar email en Mailtrap/consola.

## 10. Criterios de aceptación
- **Dado** una clase llena con 2 en espera **cuando** un socio confirmado cancela **entonces** el primero de la lista pasa a confirmado y recibe un email.
- **Dado** que el staff hace click en "Habilitar" **cuando** hay cupo **entonces** el socio pasa a confirmado en servidor (y no solo en el toast).
- **Dado** que el staff hace click en "Habilitar" **cuando** no hay cupo **entonces** ve el mensaje del backend y nada cambia.
- **Dado** `lista_espera_max = 0` **cuando** se ve el detalle **entonces** dice "Sin lista de espera".

## 11. Riesgos y decisiones abiertas
- ¿"Habilitar" permite sobrecupo? Recomendación: no por defecto; solo `administrador` con `forzar`.
- ¿La promoción automática debe respetar la ventana de `cancelacion_horas` (si queda poco tiempo, el promovido no puede cancelar)? Recomendación: promover igual y avisar la hora límite en el email.
- ¿Hay que reconfirmar el cupo (el socio acepta en X minutos)? Recomendación: no en v1.
- Push: no hay infraestructura; evaluar Web Push (PWA) como idea aparte (PLT/MOB).
- Se arrastra el problema de BK-CLS-09: la lista de espera es única por plantilla, no por fecha.

## 12. Referencias
- `speckit/class-model-architecture-decision/explore.md` §10 pregunta 6 (listas de espera entre sesiones).
- HU07 (reserva y cancelación) en `docs/qa/plan-de-pruebas.md`.
- Ver también (otras áreas): BK-BUG-05 (lista de espera vacía / "Habilitar" simulado) y BK-PLT-07 (bandeja de notificaciones in-app).
- Figma opcional: pantalla Asistencia (columna lateral "Lista de espera").

## 13. Prompt listo para un agente de IA
Contexto: Winnie The Gym (Django REST + React). Modelo `backend/apps/classes/models.py` (`Clase`, `InscripcionClase.en_espera`); servicios en `backend/apps/classes/services.py` (`inscribir_socio`, `cancelar_inscripcion` que promueve al más antiguo); vistas en `views.py`. `frontend/src/pages/AttendancePage.jsx:35-44` simula "Habilitar" con un toast sin API. No hay email de promoción (templates en `backend/apps/common/templates/emails/`, envío vía `apps.common.tasks.enqueue_email`).
Tarea (TDD): 1) escribir `backend/apps/classes/tests/test_waitlist.py` con los casos de la sección 9 y verlos fallar; 2) crear `services.promover_de_espera(clase, forzar=False)` atómica y usarla desde `cancelar_inscripcion`, `InscripcionClaseViewSet.perform_destroy` y la nueva acción `POST /api/classes/inscripciones/{id}/promover/` (`IsReceptionistOrAdmin`, errores `{'detail': ...}` con `rest_framework.exceptions.ValidationError`); 3) template `clase_promovida.html` extendiendo `emails/_base.html` y encolado con `enqueue_email(template_base='clase_promovida', subject=..., to=[email], context=..., category='clase_promovida')`; 4) frontend: mutación `promote` en `useClassAttendees.js`, botón "Habilitar" real en `AttendancePage.jsx` (loading, deshabilitado sin cupo, toasts `sonner` en voseo), arreglar `person.nombre/plan` por `socio_nombre/socio_apellido`, y `lista_espera_max || 5` en `ClassListDetailView.jsx:269`. Correr `cd backend && pytest apps/classes -q` y `cd frontend && npx vitest run && npm run lint`. No tocar `backend/loadtests/*` ni los archivos modificados del dueño. Terminado: tests verdes, "Habilitar" persiste en servidor, el promovido recibe email, la promoción también ocurre al borrar inscripción por staff y al subir el cupo.
