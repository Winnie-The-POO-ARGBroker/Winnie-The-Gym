---
id: BK-CLS-02
titulo: Pasar lista roto - modal y página de asistencia no respetan el contrato del backend
tipo: bug
roles: [administrador, recepcionista]
prioridad: P0
tamano: M
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-CLS-09]
---

# BK-CLS-02 · Pasar lista roto - modal y página de asistencia no respetan el contrato del backend

## 1. Resumen
El flujo "pasar lista" persiste `asistio` por PATCH, pero la UI lee campos que el serializer no devuelve (`estado`, `nombre`, `dni`, `plan`, `hora_reserva`), por lo que el modal muestra filas vacías y nunca marca presente/ausente; `asistio` es `False` por defecto, así que en la página completa todos los inscriptos aparecen como "ausentes" desde el inicio; el link "Abrir terminal completa de asistencia" pierde el `?id=`; "Cerrar asistencia" es solo un toast. Hoy el staff no puede tomar asistencia de forma confiable.

## 2. Objetivo de usuario
Como **recepcionista** quiero **marcar presente/ausente a cada inscripto y cerrar la lista de una clase** para **tener un registro de asistencia correcto (y distinguir "no marcado" de "ausente")**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/classes/models.py:75-76` | `asistio = BooleanField(default=False)`, `en_espera = BooleanField(default=False)`. No hay estado "sin marcar" ni fecha de la clase (ver BK-CLS-09). |
| Backend serializer | `backend/apps/classes/serializers.py:5-22` | `InscripcionClaseSerializer` devuelve `id, clase, socio, socio_nombre, socio_apellido, socio_numero, asistio, en_espera, created_at`. NO existen `nombre`, `dni`, `plan`, `estado`, `hora_reserva`. `clase` y `socio` son escribibles en PATCH. |
| Backend API | `backend/apps/classes/views.py:155-161` | `InscripcionClaseViewSet` (ModelViewSet, `IsReceptionistOrAdmin`). Asistencia se marca con `PATCH /api/classes/inscripciones/{id}/`. No hay endpoint de "cerrar asistencia". |
| Frontend hook | `frontend/src/hooks/queries/useClassAttendees.js:17-45` | Lee `GET /classes/clases/{id}/` -> `inscripciones`; `toggleMutation` hace `PATCH /classes/inscripciones/{id}/` con `{ asistio: newStatus === 'presente' }`. "ausente" envía `false` (idéntico al valor por defecto). |
| Frontend modal | `frontend/src/components/classes/ClassAttendeesModal.jsx:27-40` | Filtra por `att.nombre`, `att.dni`, `att.socio_id`; cuenta por `att.estado === 'presente'/'ausente'/'sin_marcar'`. Ninguno existe en la API. |
| Frontend modal | `ClassAttendeesModal.jsx:94-135` | `isPresente = att.estado === 'presente'`; muestra `att.nombre`, `att.dni`, `att.hora_reserva`, `att.plan` (todos `undefined`). |
| Frontend modal | `ClassAttendeesModal.jsx:171-176` | `navigate('/clases/asistencia?id=${selectedClass.id}')`. |
| Frontend ruta | `frontend/src/App.jsx:94-95` | `<Navigate to="/admin/clases/asistencia" replace />` descarta el query string -> la página llega sin `id`. |
| Frontend página | `frontend/src/pages/AttendancePage.jsx:30-33` | Sin `id`: `toast.error('Clase no encontrada')` + `navigate('/admin/clases')` (efecto secundario ejecutado durante el render). |
| Frontend página | `AttendancePage.jsx:72-76, 170-172` | `ausente = asistio === false`: como el valor por defecto es `false`, todo inscripto arranca "ausente" (rojo/tachado); `sinMarcarCount` es siempre 0; la "tasa de asistencia" es `presentes/inscriptos`. |
| Frontend página | `AttendancePage.jsx:46-49` | `handleCloseAttendance`: solo `toast.success('Asistencia guardada y cerrada correctamente')` + `navigate('/clases')`. No llama a ningún endpoint. |
| Frontend página | `AttendancePage.jsx:154-159, 206-218` | Columna "DNI" muestra `att.socio_numero` (número de socio, no DNI); columna "PLAN" siempre "Pase" hardcodeado. |
| Frontend página | `AttendancePage.jsx:51-70` | Export CSV client-side (funciona y descarga); incluye "Pase" fijo y `a.hora_reserva` (inexistente), arma el data URI con `encodeURI` (un `#` en un nombre corta el archivo) y sin BOM UTF-8 (Excel rompe acentos). Solo exporta confirmados. |
| Frontend página | `AttendancePage.jsx:308-322` | Lista de espera: usa `person.nombre` y `person.plan` (inexistentes) -> filas sin nombre (el botón "Habilitar" se trata en BK-CLS-03). |
| Frontend ClassSchedulePage | `frontend/src/pages/ClassSchedulePage.jsx:232-243` | `onSave` del modal solo invalida cache + `toast.success('Asistencia guardada con éxito')`: el PATCH ya ocurrió en cada click, "Guardar" es cosmético. |
| Tests | `frontend/src/pages/AttendancePage.test.jsx` | Mockea `useClassAttendees` con datos a medida: por eso no detectó el desfasaje de campos. |

## 4. Alcance
**Incluye:**
- Alinear el contrato: agregar `socio_dni` y `plan_nombre` (plan de la membresía activa) al serializer; el frontend usa `socio_nombre`, `socio_apellido`, `socio_dni`, `plan_nombre`, `asistio`, `created_at`.
- Estado tri-estado de asistencia: `asistio` pasa a `BooleanField(null=True, blank=True, default=None)` (`None` = sin marcar, `True` presente, `False` ausente) con migración `0011`.
- Arreglar el redirect legacy para conservar el query string y el link del modal (usar directamente `/admin/clases/asistencia?id=`).
- Hacer reales "Guardar asistencia" y "Cerrar asistencia" (interino hasta BK-CLS-09): endpoint `POST /api/classes/clases/{id}/cerrar-asistencia/`.
- Mover la redirección por `!classId` a un `useEffect`/`<Navigate>`.
- Export CSV con BOM, escape correcto (Blob en lugar de `encodeURI`) y columnas reales.

**No incluye:**
- Asistencia por fecha/ocurrencia (BK-CLS-09): mientras no exista, `asistio` sigue siendo un flag único por (clase, socio) que se arrastra de semana a semana. Documentarlo como limitación en el cierre.
- Reportes de asistencia por clase/instructor y no-shows/sanciones (BK-CLS-12).
- Promoción desde lista de espera (BK-CLS-03).

## 5. Contrato de API
- **[EXISTE]** `GET /api/classes/clases/{id}/` (`ClaseDetailSerializer`, `IsAuthenticated`). `inscripciones[]` hoy: `id, clase, socio, socio_nombre, socio_apellido, socio_numero, asistio, en_espera, created_at`.
  **[A CREAR]** agregar `socio_dni` (`source='socio.dni'`) y `plan_nombre` (SerializerMethodField: plan de `socio.membresias.filter(estado='activa').order_by('-fecha_fin').first()`, patrón de `memberships/serializers.py:77-79`; `null` si no tiene) y `asistio` pasa a nullable.
  Nota: `ClaseDetailSerializer` expone TODAS las inscripciones a cualquier usuario autenticado, incluido un socio (nombres, apellidos y DNI de otros socios). Recomendación: que `inscripciones` solo se serialice para staff (ver riesgos).
- **[EXISTE]** `PATCH /api/classes/inscripciones/{id}/` body `{"asistio": true|false|null}`, permiso `IsReceptionistOrAdmin`. **[A CREAR]** hacer `clase` y `socio` `read_only` al actualizar (hoy un PATCH puede reasignar la inscripción a otra clase/socio).
- **[A CREAR]** `POST /api/classes/clases/{id}/cerrar-asistencia/`, `IsReceptionistOrAdmin`, sin body (o `{"marcar_ausentes": true}`). Efecto interino: las inscripciones confirmadas (`en_espera=False`) con `asistio is None` pasan a `False`. Response `200 {"detail": "Asistencia cerrada.", "presentes": n, "ausentes": n, "tasa_asistencia": 0.0-1.0}`. Errores: `400 {"detail": "La clase está cancelada."}` si `estado='cancelada'`.

## 6. Modelo de datos
- `InscripcionClase.asistio`: `models.BooleanField(null=True, blank=True, default=None)`.
- Migración `backend/apps/classes/migrations/0011_inscripcionclase_asistio_nullable.py` con `AlterField` + `RunPython` que convierte `False` existentes en `None` SOLO si nunca fueron marcadas (no se puede distinguir; decisión abierta, recomendación: dejar los `False` existentes como están y declararlo en el changelog).
- Considerar `asistencia_cerrada_at = DateTimeField(null=True)` en `Clase` solo como interino; si se hace BK-CLS-09 pasa a la sesión.

## 7. Diseño frontend
- **Rutas:** `frontend/src/App.jsx:89-95`. La ruta real es `/admin/clases/asistencia` con `<ProtectedRoute roles={['administrador', 'recepcionista']}>`. Corregir el redirect legacy a un componente que preserve `location.search` (p. ej. `const L = () => { const { search } = useLocation(); return <Navigate to={`/admin/clases/asistencia${search}`} replace /> }`) y apuntar los links internos directamente a `/admin/clases/asistencia`.
- **Componentes a reutilizar:** `Avatar`, `Button`, `EmptyState`, `Skeleton`, `Modal` (`frontend/src/components/ui/`). `Modal` props: `isOpen, onClose, title, description, icon, maxWidth, children`.
- **Hook:** `useClassAttendees` (`frontend/src/hooks/queries/useClassAttendees.js`). Cambiar `toggleStatus(id, 'presente'|'ausente'|'sin_marcar')` para enviar `true|false|null`; agregar en `useClases.js` una mutación `cerrarAsistencia` (patrón: `api.post(`/classes/clases/${id}/cerrar-asistencia/`)`, invalidar `ATTENDEES_QUERY_KEYS.byClass(id)` y `CLASES_QUERY_KEYS.all`, `toast` de `sonner`).
- **Selectores derivados:** helper `getAsistenciaEstado(att)` -> `'presente' | 'ausente' | 'sin_marcar'` según `asistio` (`true/false/null`) usado por modal y página (hoy duplican lógica).
- **Estados:** loading (`Skeleton` ya existe en la página), vacío ("No hay inscriptos confirmados"), error de PATCH (toast), éxito ("Asistencia cerrada"). Botón "Presente/Ausente" con `aria-pressed`.
- **Textos (voseo):** "Cerrar y guardar asistencia", "Asistencia cerrada: {presentes} presentes, {ausentes} ausentes", "Todavía quedan {n} inscriptos sin marcar. Si cerrás, se registran como ausentes."
- **Responsive:** la tabla usa `grid-cols-[3fr_2fr_2fr_220px]` fijo (`AttendancePage.jsx:154`): a 375 px se desborda. Pasar a tarjetas apiladas en `< md` con los botones Presente/Ausente a ancho completo; el modal ya usa `flex-col sm:flex-row`.

## 8. Archivos a crear / modificar
- `backend/apps/classes/models.py`, nueva migración `0011_...`: `asistio` nullable.
- `backend/apps/classes/serializers.py`: `socio_dni`, `plan_nombre`; `read_only_fields` en update.
- `backend/apps/classes/services.py`: `cerrar_asistencia(clase, actor)`.
- `backend/apps/classes/views.py`: `@action cerrar_asistencia`.
- `frontend/src/App.jsx`: redirect legacy con query string.
- `frontend/src/components/classes/ClassAttendeesModal.jsx`: usar campos reales.
- `frontend/src/pages/AttendancePage.jsx`: tri-estado, columnas reales, close real, redirect por `useEffect`, CSV por Blob con BOM.
- `frontend/src/hooks/queries/useClassAttendees.js`, `useClases.js`.
- Tests: ver sección 9.

## 9. Plan de pruebas (TDD)
**Backend** (`backend/apps/classes/tests/`, `APITestCase`, `make_user_factory`/`make_socio_factory`, `_auth` con `RefreshToken`; correr `cd backend && pytest apps/classes -q`):
- Nuevo `test_asistencia.py`: PATCH `asistio=true/false/null` como recepcionista -> 200 y persiste; como socio -> 403; PATCH con `clase`/`socio` distintos no los cambia.
- Serializer: `GET /api/classes/clases/{id}/` incluye `socio_dni` y `plan_nombre` (con y sin membresía activa).
- `cerrar-asistencia`: marca `None` -> `False`, no toca `True`; clase cancelada -> 400; socio -> 403; idempotente.
- Migración: inscripción nueva arranca con `asistio is None`.
**Frontend** (vitest + RTL; `renderWithProviders`, `resetAllStores` de `frontend/src/test/test-utils.jsx`; correr `cd frontend && npx vitest run src/pages/AttendancePage.test.jsx src/components/classes`):
- Actualizar `AttendancePage.test.jsx` y agregar test del modal con fixtures REALES de la API (`socio_nombre`, `asistio: null`): una fila con `asistio:null` NO se pinta como ausente; "sin marcar" cuenta correctamente.
- Test del redirect: `MemoryRouter initialEntries={['/clases/asistencia?id=7']}` termina en `/admin/clases/asistencia?id=7`.
- Test del cierre: click en "Cerrar y guardar asistencia" llama `POST .../cerrar-asistencia/`.
- Export: el Blob contiene BOM y escapa comillas.
**Manual:** entrar como `recepcion@winnie.local` (seed `seed_demo_users`), `/admin/clases` -> "Lista" de una clase con inscriptos -> marcar, cerrar, recargar y verificar persistencia.

## 10. Criterios de aceptación
- **Dado** una clase con 3 inscriptos sin marcar **cuando** abro la lista **entonces** veo "0 presentes, 0 ausentes, 3 sin marcar".
- **Dado** que marco Presente **cuando** recargo **entonces** sigue Presente.
- **Dado** el modal de asistentes **cuando** hago click en "Abrir terminal completa" **entonces** llego a `/admin/clases/asistencia?id={id}` mostrando esa clase.
- **Dado** inscriptos sin marcar **cuando** cierro la asistencia **entonces** se registran como ausentes y el resumen coincide con el servidor.
- **Dado** un socio **cuando** intenta `PATCH /inscripciones/{id}/` **entonces** 403.

## 11. Riesgos y decisiones abiertas
- Sin sesiones por fecha (BK-CLS-09) el `asistio` es acumulativo entre semanas: marcar presente hoy deja "presente" la semana próxima. Recomendación: no dejar este ítem en producción real sin BK-CLS-09, o resetear `asistio` por cron semanal como parche (no recomendado).
- ¿"Cerrar" marca ausentes a los sin marcar? Recomendación: sí, con confirmación explícita en UI.
- Exposición de datos: `inscripciones` en `ClaseDetailSerializer` es visible para cualquier autenticado (`views.py:70-75`). Recomendación: devolver solo para staff.

## 12. Referencias
- `speckit/class-model-architecture-decision/explore.md` §1 y §10 (preguntas 7 y 10).
- `docs/qa/plan-de-pruebas.md` (US06/US07).
- Ver también (otras áreas): BK-BUG-04 (redirect legacy pierde `?id=`) y BK-BUG-05 (acciones simuladas de asistencia): solapan con este ítem; coordinar para no duplicar el arreglo.
- Figma opcional: pantalla de Asistencia (página "vistas live", columna Hi-Fi, módulo Clases).

## 13. Prompt listo para un agente de IA
Contexto: repo Winnie The Gym (Django REST en `backend/apps/classes`, React+Vite en `frontend/src`). El flujo de asistencia está roto: `ClassAttendeesModal.jsx` y `AttendancePage.jsx` leen campos inexistentes (`estado`, `nombre`, `dni`, `plan`, `hora_reserva`) cuando `InscripcionClaseSerializer` devuelve `socio_nombre, socio_apellido, socio_numero, asistio, en_espera, created_at`; `InscripcionClase.asistio` es `BooleanField(default=False)` (no hay "sin marcar"); `App.jsx:94-95` redirige `/clases/asistencia?id=X` descartando el query; `handleCloseAttendance` solo hace toast.
Tarea (TDD, tests primero): 1) backend: tests en `backend/apps/classes/tests/test_asistencia.py` para tri-estado, permisos (403 socio), `socio_dni`/`plan_nombre` en `GET /api/classes/clases/{id}/`, `POST /api/classes/clases/{id}/cerrar-asistencia/`; luego migración `0011` (`asistio` `null=True, default=None`), serializer, `services.cerrar_asistencia`, `@action` en `ClaseViewSet`; `clase`/`socio` read-only en PATCH. 2) frontend: tests (vitest+RTL con `renderWithProviders`) con fixtures reales de la API; arreglar modal y página para usar los campos reales y el tri-estado, redirect legacy preservando `location.search`, mutación `cerrarAsistencia` en `useClases.js`, CSV por `Blob` con BOM. Convenciones: toasts `sonner`, iconos `lucide-react`, UI en `frontend/src/components/ui`, textos en español rioplatense con voseo. Comandos: `cd backend && pytest apps/classes -q`; `cd frontend && npx vitest run && npm run lint` (lint con `--max-warnings 0`). No toques `backend/loadtests/*`, `frontend/src/hooks/useScreenWakeLock.js` ni `usePlanes.test.jsx`. Terminado cuando: tests verdes, el modal y la página muestran nombre/DNI/plan reales, los sin marcar no se ven como ausentes, el cierre persiste y el link del modal abre la clase correcta.
