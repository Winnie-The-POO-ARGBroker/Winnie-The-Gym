---
id: BK-CLS-09
titulo: Sesiones de clase por fecha (SesionClase) y edición de series recurrentes
tipo: feature
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: XL
estado_en_codigo: no-existe
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-CLS-01]
---

# BK-CLS-09 · Sesiones de clase por fecha (SesionClase) y edición de series recurrentes

## 1. Resumen
Hoy `Clase` es una plantilla semanal ("Yoga, lunes 08:00") que mezcla la definición recurrente con las ocurrencias. No existe ninguna entidad por fecha, entonces: cupo, lista de espera, reservas, asistencia y cancelación son únicos para todas las semanas; cancelar "la clase del lunes 13" cancela la serie entera para siempre; la asistencia marcada hoy se arrastra a la semana siguiente; no se puede editar "solo esta fecha" ni "esta y siguientes". Es la deuda estructural de la que dependen casi todos los demás ítems del área.

## 2. Objetivo de usuario
Como **recepcionista** quiero **gestionar cada fecha concreta de una clase recurrente (cancelarla, cambiar sala/instructor, tomar asistencia) y editar la serie con alcance "solo esta / esta y siguientes / toda"** para **operar el día a día sin romper el resto de la serie**.
Como **socio** quiero **reservar y cancelar una fecha puntual** para **no quedar atado a todas las semanas**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/classes/models.py:34-35,43-44` | `dia` (weekday) + `hora` + `recurrencia` (texto) + `dias_recurrencia` (JSON): plantilla sin fechas. |
| Backend modelo | `models.py:64-90` | `InscripcionClase(clase, socio)` con `unique_together = ('clase','socio')`: una inscripción vale para todas las semanas; `asistio` y `en_espera` también son únicos. |
| Backend servicio | `backend/apps/classes/services.py:70-79` | `_next_clase_datetime` calcula "la próxima ocurrencia" con `dia` y la hora; ignora `dias_recurrencia`. |
| Backend servicio | `services.py:9-28` | `cancelar_clase` marca `estado='cancelada'` en la plantilla: afecta todas las fechas. |
| Backend vista | `backend/apps/classes/views.py:56-61` | Las canceladas se ocultan globalmente. |
| Backend modelo | `models.py:19-21` | `Estado.FINALIZADA` declarado y nunca asignado. |
| Frontend | `frontend/src/components/classes/ClassCalendarView.jsx:26-56` | Renderiza por día de la semana; sin concepto de fecha. `ClassSchedulePage.jsx:42-77` solo cambia rótulos con `weekOffset`. |
| Frontend | `frontend/src/hooks/queries/useClassAttendees.js:31-35` | Asistencia: `PATCH /classes/inscripciones/{id}/ {asistio}` sin fecha. |
| Frontend | `frontend/src/pages/CreateClassPage.jsx:112-116` | Editar = `PUT` a la plantilla: siempre "toda la serie", sin selector de alcance. |
| Specs | `speckit/class-model-architecture-decision/explore.md` §1, §10 | Exploración (issue #42, 2026-10-04): documenta el problema y 10 preguntas abiertas. No hay `proposal.md` ni `design.md` de ese cambio: la decisión sigue abierta. Propone la separación Tipo/Sesión/Reserva. |
| Reglas de edición hoy | (todo el código anterior) | Única regla actual: cualquier edición reescribe la plantilla y afecta todas las semanas y a todos los inscriptos sin aviso. Faltan "solo esta" y "esta y siguientes". |

## 4. Alcance
**Incluye (propuesta de diseño, a validar):**
- Nuevo modelo `SesionClase` (una fila por fecha de la serie) y migración de datos desde `Clase`/`InscripcionClase`.
- Generación de sesiones por ventana móvil (tarea Celery beat) y bajo demanda al crear/editar.
- Inscripción, lista de espera, asistencia y cancelación por sesión.
- Edición de serie con alcance `solo_esta | esta_y_siguientes | toda`.
- Nuevos endpoints de rango de fechas para calendario y agenda del socio.
- Adaptación de frontend (calendario, lista, asistencia, agenda del socio).

**No incluye:**
- Feriados/cierres y vista mensual (BK-CLS-13, se apoya en este ítem).
- Catálogos de sala/instructor (BK-CLS-10, BK-CLS-11).
- Reportes (BK-CLS-12).
- Reservas recurrentes tipo "abono" (decisión abierta).

## 5. Contrato de API
Todo **[A CREAR]** salvo lo marcado.
- **[EXISTE, se mantiene por compatibilidad]** `/api/classes/clases/` (CRUD de la plantilla) y `/api/classes/inscripciones/` (staff).
- `GET /api/classes/sesiones/?desde=YYYY-MM-DD&hasta=YYYY-MM-DD[&categoria=&sala=&instructor=]` — `IsAuthenticated`. Response paginada: `[{ "id", "clase": id, "fecha": "2026-10-13", "hora": "08:00:00", "duracion_min", "sala", "instructor", "nombre", "categoria", "cupo_maximo", "cupos_reservados", "en_lista_espera", "estado": "activa|cancelada|finalizada", "motivo_cancelacion", "user_estado": "confirmada|espera|null", "user_posicion_espera" }]`. Máximo 62 días por consulta (`400 {"detail": "El rango no puede superar 62 días."}`).
- `POST /api/classes/sesiones/{id}/inscribir/` y `/cancelar/` (IsSocio) — mismas reglas de BK-CLS-04/03 sobre la sesión; ventana de cancelación calculada con la fecha real (`fecha + hora - cancelacion_horas`).
- `POST /api/classes/sesiones/{id}/cancelar-sesion/` (staff) body `{motivo}` (>= 10 chars) — notifica a confirmados y espera (BK-CLS-05).
- `POST /api/classes/sesiones/{id}/cerrar-asistencia/` (staff); `PATCH /api/classes/reservas/{id}/ {asistio}`.
- `PATCH /api/classes/clases/{id}/?alcance=solo_esta|esta_y_siguientes|toda&fecha=YYYY-MM-DD` — staff:
  - `toda` (default): actualiza la plantilla y las sesiones futuras sin reservas divergentes; las pasadas no cambian.
  - `esta_y_siguientes`: cierra la plantilla actual (`vigente_hasta = fecha - 1`) y crea una nueva con los cambios desde `fecha` (las sesiones ya reservadas migran a la nueva plantilla).
  - `solo_esta`: aplica overrides (`sala`, `instructor`, `hora`, `cupo_maximo`) en la `SesionClase` de `fecha`.
  - Errores: `400 {"detail": "La fecha no pertenece a la serie."}`, `400 {"cupo_maximo": ["..."]}`.

## 6. Modelo de datos
Propuesta (nombres a validar con el dueño):
```python
class SesionClase(models.Model):
    clase = FK('classes.Clase', related_name='sesiones', on_delete=CASCADE)   # plantilla
    fecha = DateField(db_index=True)
    hora = TimeField()                       # copia editable (override)
    duracion_min = PositiveIntegerField()
    sala = CharField(80); instructor = CharField(120)   # overrides (luego FK, BK-CLS-10/11)
    cupo_maximo = PositiveIntegerField()
    estado = CharField(choices=Estado)       # activa|cancelada|finalizada
    motivo_cancelacion = TextField(blank=True); fecha_cancelacion = DateTimeField(null=True)
    cancelada_por = FK(User, null=True)
    asistencia_cerrada_at = DateTimeField(null=True)
    class Meta: unique_together = ('clase','fecha'); indexes = [Index(fields=['fecha','estado'])]
```
- `InscripcionClase` agrega `sesion = FK(SesionClase, null=True)` y pasa `unique_together` a `('sesion','socio')`; `asistio` nullable (BK-CLS-02), `estado` de reserva (`confirmada|espera|cancelada`).
- `Clase` agrega `vigente_desde`, `vigente_hasta` (para "esta y siguientes") y `dias_recurrencia` pasa a canónico (BK-CLS-06).
- Migración de datos: por cada `Clase` activa y cada fecha de las próximas N semanas crear sesiones; copiar inscripciones a la primera sesión futura (o a todas las futuras si se decide "abono"); archivar `asistio` previo (no hay fecha: se pierde). Reversible hasta limpiar campos antiguos.
- Tarea Celery beat `classes.generate_sessions` (patrón: `backend/apps/memberships/migrations/0004_seed_expiration_schedule.py` + `apps/memberships/tasks.py`), ventana 4-8 semanas; zona `America/Argentina/Buenos_Aires` (`base.py:121,363`).

## 7. Diseño frontend
- **Rutas:** sin cambios de URL (`/admin/clases`, `/admin/clases/crear`, `/admin/clases/asistencia`, `/socio/clases`; guard `<ProtectedRoute roles=[...]>` en `frontend/src/App.jsx`). La asistencia pasa a `?sesion=<id>`.
- **Hooks nuevos** en `frontend/src/hooks/queries/useSesiones.js` (convención: `SESIONES_QUERY_KEYS`, `useSesionesList({desde,hasta})`, `useSesionesMutations()` con `inscribir/cancelar/cancelarSesion/cerrarAsistencia`; cliente `api` de `services/api.js`; toasts `sonner`).
- **Calendario admin:** `ClassCalendarView` recibe sesiones del rango visible; `weekOffset` pasa a pedir `desde/hasta` reales (cada semana distinta).
- **Edición de serie:** `Modal` "¿A qué clases aplican los cambios?" con radio: "Solo esta clase (13 de octubre)", "Esta y las siguientes", "Todas las clases de la serie"; muestra cuántos inscriptos afecta.
- **Estados:** loading por semana con `Skeleton`, vacío "No hay clases esta semana", error con reintento, éxito con toast y aviso de emails enviados.
- **Textos (voseo):** "Cancelar solo esta clase", "Cancelar esta y las siguientes", "Los cambios no afectan a las clases ya dictadas."
- **Responsive:** agenda diaria en 375 px (BK-CLS-07/08), selector de alcance como bottom sheet.

## 8. Archivos a crear / modificar
- Backend: `models.py`, `migrations/0011+` (esquema y datos), `services.py` (generación, inscripción por sesión, edición por alcance), `serializers.py`, `views.py` (`SesionClaseViewSet`), `urls.py`, `tasks.py` (nuevo), `admin.py`, tests nuevos.
- Frontend: `hooks/queries/useSesiones.js`, `ClassCalendarView.jsx`, `ClassSchedulePage.jsx`, `ClassListDetailView.jsx`, `AttendancePage.jsx`, `ClassAttendeesModal.jsx`, `CreateClassPage.jsx`, `pages/socio/ClasesPage.jsx`, `components/socio/ClassCard.jsx`.
- Docs: `speckit/class-model-architecture-decision/{proposal,design,tasks}.md` (SDD) y ADR en `docs/architecture.md`.

## 9. Plan de pruebas (TDD)
Backend (`backend/apps/classes/tests/test_sesiones.py`, `test_series_edit.py`; pytest + `make_*` fixtures de `backend/conftest.py`; `cd backend && pytest apps/classes -q`):
- Generación idempotente (dos corridas no duplican `(clase, fecha)`), respeta `dias_recurrencia` y `vigente_*`.
- Inscribir en una fecha no afecta otra; cupo y espera por sesión; cancelación con corte `fecha+hora-cancelacion_horas` (sin `freezegun` en `backend/requirements`: mockear `django.utils.timezone.now` con `unittest.mock.patch`).
- `cancelar-sesion` cancela solo esa fecha, notifica, el resto sigue activa.
- Alcance `solo_esta`, `esta_y_siguientes`, `toda` con reservas existentes; sesiones pasadas inmutables.
- Migración de datos: fixtures con `Clase` + inscripciones pasan a sesiones sin pérdida (test de migración con `MigrationExecutor` (no hay `django_test_migrations` en requirements)).
- Permisos por rol (403 socio en endpoints de staff).
Frontend (vitest/RTL): calendario pide el rango correcto por semana; modal de alcance envía `alcance`; asistencia usa `sesion`.
Manual: con `recepcion@winnie.local` cancelar solo el lunes 13 y verificar que el 20 sigue activo.

## 10. Criterios de aceptación
- **Dado** una serie L/X/V **cuando** cancelo solo el miércoles 15 **entonces** las demás fechas siguen activas y solo los inscriptos del 15 reciben el aviso.
- **Dado** que marco presentes el lunes 13 **cuando** abro el lunes 20 **entonces** la asistencia está en blanco.
- **Dado** que edito "esta y siguientes" desde el 20 **cuando** reviso el 13 **entonces** conserva los valores originales.
- **Dado** un socio que reservó el 13 **cuando** abre el 20 **entonces** no figura reservado.

## 11. Riesgos y decisiones abiertas
1. ¿El socio reserva fecha por fecha o se "abona" a la serie? Recomendación: fecha por fecha, con opción "repetir cada semana" como mejora.
2. ¿Horizonte de generación? Recomendación: 8 semanas rodantes.
3. ¿Se mantiene `Clase` con su ruta `/api/classes/clases/` o se renombra a `TipoClase`/`PlantillaClase`? Recomendación: mantener nombre y ruta (menor ruptura).
4. Cantidad real de filas a migrar: no verificable sin acceso a la BD de producción (el explore lo marca como desconocido).
5. `finalizada`: asignarla automáticamente al cerrar la asistencia o pasar la hora (propuesta: cron cada 15 min).
6. Compatibilidad: ¿existen consumidores externos de la API actual? Recomendación: confirmar con el dueño antes de deprecar.

## 12. Referencias
- `speckit/class-model-architecture-decision/explore.md` (completo; issue #42).
- `docs/architecture.md`, `docs/database/schema.dbml` y `mer.md` (actualizar).
- Figma opcional: calendario semanal y detalle de clase, página "vistas live".

## 13. Prompt listo para un agente de IA
Contexto: Winnie The Gym. `backend/apps/classes/models.py` define `Clase` como plantilla semanal (`dia`, `hora`, `dias_recurrencia`) e `InscripcionClase(clase, socio, asistio, en_espera)` con `unique_together ('clase','socio')`. No hay entidad por fecha. Este ítem es un cambio grande: ejecutarlo con SDD (`/sdd-new sesiones-de-clase`) y NO en un solo commit.
Tarea: (1) leer `speckit/class-model-architecture-decision/explore.md` y elaborar `proposal.md` + `design.md` con las decisiones abiertas de la sección 11 resueltas por el dueño; (2) implementar por slices (cada uno con tests primero): a) modelo `SesionClase` + migración de datos + generador Celery; b) endpoints `sesiones` de lectura por rango; c) inscripción/espera/cancelación por sesión; d) cancelación de sesión + emails; e) asistencia por sesión; f) edición con `alcance`; g) frontend (hooks `useSesiones.js`, calendario por semana real, modal de alcance). Convenciones: errores `ValidationError({'detail': ...})`, permisos `IsReceptionistOrAdmin`/`IsSocio` de `apps.access.permissions`, tests `APITestCase` con `make_user_factory`/`make_socio_factory`, front con TanStack Query + `sonner` + vitest/RTL. Comandos: `cd backend && pytest -q`; `cd frontend && npx vitest run && npm run lint`. Terminado: criterios de la sección 10 verdes, cobertura backend >= 80% (`pytest.ini`), migración reversible probada.
