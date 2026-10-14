---
id: BK-CLS-11
titulo: Instructor como entidad (y rol Instructor) en lugar de texto libre
tipo: idea
roles: [administrador, recepcionista]
prioridad: P3
tamano: XL
estado_en_codigo: solo-idea
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-CLS-09, BK-CLS-10]
---

# BK-CLS-11 · Instructor como entidad (y rol Instructor) en lugar de texto libre

## 1. Resumen
El instructor de una clase es un `CharField` de texto libre sin relación con ningún usuario ni ficha; el formulario ofrece 4 nombres hardcodeados que no coinciden con los datos del seed; no existe el rol `instructor` (el enum solo tiene administrador, recepcionista y socio). Eso impide: validar disponibilidad (un instructor en dos salas a la vez), reportes por instructor, que el instructor vea y pase lista de sus clases, y mantener una lista oficial. Es una idea a validar con el dueño: el código actual lo deja explícitamente como decisión diferida.

## 2. Objetivo de usuario
Como **administrador** quiero **mantener una lista de instructores y asignarlos a las clases** para **evitar errores de tipeo, detectar solapamientos y tener reportes por instructor**.
(Fase 2) Como **instructor** quiero **ver mis clases y tomar asistencia** para **no depender de recepción**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/classes/models.py:38` | `instructor = models.CharField(max_length=120, default='')`. Sin FK. Migración `0003_clase_instructor_empty_default`. |
| Backend serializer | `backend/apps/classes/serializers.py:28,41-42,56-58` | `instructor_nombre` es un alias (`SerializerMethodField` que devuelve `obj.instructor`) agregado por compatibilidad de frontend. |
| Backend filtros | `backend/apps/classes/filters.py:30`, `views.py:52` | `instructor` filtra por `exact/icontains`; `search_fields` incluye `instructor`. |
| Backend roles | `backend/apps/users/models.py:22-27` | `Rol`: `administrador`, `recepcionista`, `socio`. No existe `instructor`. |
| Backend staff | `backend/apps/users/serializers.py:10,83-87` y `backend/apps/users/middleware.py:9` | `STAFF_ROLES = (ADMINISTRADOR, RECEPCIONISTA)`; el alta de staff (`StaffView`, `users/views.py:93-114`) rechaza cualquier otro rol. |
| Backend permisos | `backend/apps/access/permissions.py:4-35` | `IsReceptionistOrAdmin`, `IsSocio`, `IsAdminOnly`: no hay `IsInstructor`. |
| Frontend | `frontend/src/pages/CreateClassPage.jsx:294-309` | Select de instructor con "Carlos R.", "Sofia L.", "Pedro M.", "Ana T." (valores fijos y rótulos con especialidad). |
| Backend seed | `backend/seed_data.py:41,53,65` | "Marcos Gómez", "Sofía Chen", "Lucas Silva": no coinciden con el select. |
| Frontend | `frontend/src/components/layout/Sidebar.jsx:12-45`, `frontend/src/App.jsx` | Navegación y `ProtectedRoute roles=[...]` solo conocen 3 roles. |
| Specs | `speckit/design.md:115-119` | Decisión documentada: "Instructors no están modelados como users hoy, son solo strings"; se mantiene `CharField`. |
| Specs | `speckit/class-model-architecture-decision/explore.md` §10 pregunta 3 | Pregunta abierta: ¿instructor libre intencional (externos sin cuenta)? |

## 4. Alcance
**Incluye (propuesta por fases):**
- **Fase 1 (recomendada primero):** modelo `Instructor` (ficha, sin login) + FK en `Clase`/`SesionClase` + selector alimentado por API + validación de solapamiento por instructor.
- **Fase 2 (solo si se confirma):** rol `instructor` con login (`User.Rol.INSTRUCTOR`), vinculo `Instructor.usuario` 1-1, vistas "Mis clases" y asistencia limitada a sus clases.

**No incluye:**
- Liquidación de sueldos / horas trabajadas.
- Evaluaciones de socios al instructor.
- Reemplazos y suplencias por fecha (cubierto parcialmente por overrides de sesión en BK-CLS-09).

## 5. Contrato de API (propuesta)
Todo **[A CREAR]**.
- `GET /api/classes/instructores/` (IsAuthenticated) -> `[{ "id", "nombre", "apellido", "email", "telefono", "disciplinas": [slug], "activo", "usuario": id|null }]`; `POST/PATCH/DELETE` -> `IsAdminOnly` (o `IsReceptionistOrAdmin` para lectura/alta según decisión).
- `ClaseSerializer`: `instructor` pasa a id (FK) manteniendo `instructor_nombre` (string) para compatibilidad; migración de texto -> `Instructor` por coincidencia de nombre.
- Fase 2: `GET /api/classes/mis-clases/` (rol `instructor`) y `GET /api/classes/sesiones/?instructor=me`; `PATCH /api/classes/reservas/{id}/` permitido solo si la clase/sesión pertenece al instructor (403 en otro caso).
- Errores: `400 {"instructor": ["El instructor ya tiene una clase en ese horario."]}`.

## 6. Modelo de datos (propuesta)
```python
class Instructor(models.Model):
    nombre = CharField(80); apellido = CharField(80); email = EmailField(blank=True)
    telefono = CharField(30, blank=True); activo = BooleanField(default=True)
    disciplinas = ManyToManyField('classes.Disciplina', blank=True)   # requiere BK-CLS-10
    usuario = OneToOneField(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=SET_NULL)  # fase 2
Clase.instructor_ref = ForeignKey(Instructor, null=True, on_delete=PROTECT)
```
- Fase 2: `User.Rol.INSTRUCTOR = 'instructor'` (migración `users`), agregar a `STAFF_ROLES` solo donde corresponda (no debe heredar permisos de recepción), `is_staff=False`.
- Migración de datos: crear `Instructor` por cada valor distinto de `Clase.instructor`.

## 7. Diseño frontend (propuesta)
- **Fase 1:** `Select` de instructores en `CreateClassPage.jsx` (hook nuevo `useInstructores()` en `frontend/src/hooks/queries/useInstructores.js`, convención de `useGymConfig.js`); ABM en `AdminConfiguracionPage` (sección "Instructores", acceso `<ProtectedRoute roles={['administrador']}>` ya definido en `App.jsx:136-138`); filtro "Instructor" en la agenda del socio y calendario.
- **Fase 2:** ruta `/instructor/clases` con `<ProtectedRoute roles={['instructor']}>`, entrada en `NAV_BY_ROLE` (`Sidebar.jsx`) y en el bottom nav, reutiliza `AttendancePage`/`ClassAttendeesModal` con datos filtrados; `RoleBasedClasesRedirect` (`App.jsx:42-47`) debe contemplar el nuevo rol.
- **Estados:** vacío "Todavía no cargaste instructores"; error de solapamiento inline; éxito toast.
- **Textos (voseo):** "Instructor a cargo", "Este instructor ya tiene otra clase en ese horario", "Mis clases de hoy".
- **Responsive:** "Mis clases" mobile-first (el instructor usa el celular en la sala).

## 8. Archivos a crear / modificar
- Fase 1: `backend/apps/classes/{models,serializers,views,urls,admin}.py`, migraciones, `seed_data.py`; `frontend` hooks, `CreateClassPage.jsx`, `AdminConfiguracionPage.jsx`.
- Fase 2: `backend/apps/users/{models,serializers,middleware}.py`, `backend/apps/access/permissions.py` (`IsInstructor`), nuevas rutas front y navegación, tests de permisos por rol.

## 9. Plan de pruebas (TDD)
Backend (`backend/apps/classes/tests/test_instructores.py`; `APITestCase`; `cd backend && pytest -q`):
- CRUD y permisos (admin/recepcionista/socio); desactivar en lugar de borrar si tiene clases.
- Solapamiento de instructor -> 400.
- Migración de datos: textos existentes generan instructores únicos.
- Fase 2: instructor autenticado solo ve/edita asistencia de sus clases (403 en ajenas; socio/recepción sin cambios).
Frontend (vitest/RTL): selector con datos de API; ruta `/instructor/clases` solo para el rol; redirect por rol.
Manual: crear instructor, asignarlo, intentar doble asignación.

## 10. Criterios de aceptación
- **Dado** la lista de instructores **cuando** creo una clase **entonces** elijo uno de la lista y no escribo texto libre.
- **Dado** un instructor ya asignado a las 10:00 **cuando** lo asigno a otra clase a las 10:30 **entonces** veo el error de solapamiento.
- (Fase 2) **Dado** un usuario con rol instructor **cuando** entra **entonces** solo ve sus clases y puede pasar lista solo en ellas.

## 11. Riesgos y decisiones abiertas
1. ¿Los instructores necesitan cuenta (login) o alcanza con una ficha? Recomendación: Fase 1 sin login.
2. ¿Hay instructores externos/freelance? Recomendación: sí posible; por eso `usuario` es opcional.
3. ¿Un instructor puede dar varias disciplinas? Recomendación: sí (M2M, depende de BK-CLS-10).
4. ¿Permisos del rol instructor? Recomendación: lectura de sus clases + asistencia; nunca cobros ni socios.
5. Migración desde texto: los typos generan duplicados; revisar manualmente antes de consolidar.

## 12. Referencias
- `speckit/design.md:115-119`; `speckit/class-model-architecture-decision/explore.md` §1 y §10.
- Backlog histórico: `docs/qa/walkthrough-2026-09-22.md` (rol Instructor/Entrenador "solo idea").
- Ver también (otras áreas): BK-PLT-11 (instructor/entrenador asignado y rutinas).
- Figma opcional: no hay pantalla de instructor.

## 13. Prompt listo para un agente de IA
Contexto: Winnie The Gym. Hoy `Clase.instructor` es `CharField` (`backend/apps/classes/models.py:38`) y no hay rol instructor (`backend/apps/users/models.py:22-27`). Este ítem es una IDEA: antes de codificar, pedir al dueño que resuelva la sección 11 y ejecutar con SDD (`/sdd-new instructores`).
Tarea (si se aprueba Fase 1, TDD): tests en `backend/apps/classes/tests/test_instructores.py` (CRUD+permisos+solapamiento+migración); modelo `Instructor`, FK en `Clase`, serializer con `instructor_nombre` compatible, viewset en `urls.py`, migración de datos; frontend: `useInstructores.js`, select en `CreateClassPage.jsx`, sección en `AdminConfiguracionPage.jsx`. No agregar el rol `instructor` en esta fase. Comandos: `cd backend && pytest apps/classes -q`; `cd frontend && npx vitest run && npm run lint`. Terminado: criterios de las dos primeras viñetas de la sección 10.
