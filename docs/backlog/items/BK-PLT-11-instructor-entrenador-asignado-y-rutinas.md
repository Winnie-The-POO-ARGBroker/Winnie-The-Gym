---
id: BK-PLT-11
titulo: Rol Instructor, entrenador asignado y rutinas personalizadas
tipo: idea
roles: [administrador, recepcionista, socio]
prioridad: P3
tamano: XL
estado_en_codigo: solo-idea
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-PLT-09]
---

# BK-PLT-11 · Rol Instructor, entrenador asignado y rutinas personalizadas

## 1. Resumen
Los planes se "venden" con beneficios como "Seguimiento por entrenador" y "Rutina personalizada", pero en el backend no existe nada que los respalde: no hay rol instructor, ni entrenador asignado al socio, ni rutinas. El instructor de una clase es un texto libre. Solo hay rastro visual en el frontend de planes.

## 2. Objetivo de usuario
Como **socio** quiero **ver mi entrenador y mi rutina del día** para **seguir mi plan de entrenamiento**. Como **instructor** quiero **gestionar mis clases y mis socios asignados** para **hacer seguimiento**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend rol | `backend/apps/users/models.py:24-27` | `Rol` solo tiene `ADMINISTRADOR`, `RECEPCIONISTA`, `SOCIO`; no hay `INSTRUCTOR`. |
| Backend clase | `backend/apps/classes/models.py:38` | `instructor = models.CharField(max_length=120, default='')`: texto libre, sin FK a usuario. |
| Backend serializer | `backend/apps/classes/serializers.py:28,41-42,56-58` | `instructor_nombre = SerializerMethodField()` que devuelve `obj.instructor` (alias de compatibilidad). |
| Backend plan | `backend/apps/memberships/models.py:9-16` | `PlanMembresia` sin campos de beneficios/entrenador/rutina. |
| Backend socio | `backend/apps/members/models.py` | No verificado el contenido completo; `rg -i "entrenador\|rutina" backend --glob '*.py'` no devuelve resultados (verificado). |
| Decisión previa | `speckit/design.md` § 2.2 (líneas ~114-120) | "Instructors no están modelados como users hoy, son solo strings… `Clase.instructor` sigue siendo `CharField`, no FK". Decisión explícita de no modelarlo (iteración anterior). |
| Frontend planes | `frontend/src/components/admin/PlanFormModal.jsx:30,35-36,63-69` | `beneficios` con "Seguimiento por entrenador" y `matriz_comparativa.entrenador_asignado`/`rutina_personalizada` (booleanos de marketing; no persisten en backend, ver BK-PLT-10 §11). |
| Frontend comparativa | `frontend/src/components/admin/PlanComparativeTable.jsx:33` | Lee `plan.matriz_comparativa?.entrenador_asignado`. |
| Frontend clase | `frontend/src/pages/CreateClassPage.jsx:31,294-301` | Campo de texto "Instructor a cargo" con valor inicial `'Carlos R.'` (dato de ejemplo cargado por defecto en el formulario). |
| Frontend socio | `frontend/src/components/dashboard/views/SocioDashboardView.jsx:104` | Muestra `clase.instructor_nombre`. |

## 4. Alcance
**Incluye (propuesta mínima, por fases):** Fase 1: rol `instructor` + FK `Clase.instructor_usuario`; pantalla "Mis clases" para instructor. Fase 2: `AsignacionEntrenador(socio, instructor)` y vista "Mi entrenador" en el socio. Fase 3: `Rutina`/`EjercicioRutina` creadas por instructor y asignadas a un socio.
**No incluye:** seguimiento de progreso/medidas, videos, pagos a instructores, chat.

## 5. Contrato de API (propuesta, **[A CREAR]**)
- Fase 1: `GET /api/classes/clases/?instructor=me` (permiso nuevo `IsInstructor`, similar a `IsSocio`, `apps/access/permissions.py:22`); `Clase` expone `instructor_id`.
- Fase 2: `GET/POST /api/entrenadores/asignaciones/` (admin/recepción); `GET /api/members/me/entrenador/` (IsSocio) → `{instructor: {id, nombre}, desde}`.
- Fase 3: `GET /api/rutinas/mias/` (socio) → `{id, nombre, dias: [{dia, ejercicios: [{nombre, series, repeticiones, notas}]}]}`; `POST /api/rutinas/` e `/asignar/` (instructor/admin).

## 6. Modelo de datos (propuesta)
`User.Rol.INSTRUCTOR = 'instructor'` (migración de choices, sin cambios de columna); `Clase.instructor_usuario = FK(User, null=True, SET_NULL)` manteniendo `instructor` (texto) como fallback; `AsignacionEntrenador(socio FK, instructor FK, activa, desde)` con constraint único por socio activo; `Rutina(nombre, creada_por, socio FK null)`, `EjercicioRutina(rutina, dia, orden, nombre, series, repeticiones, notas)`. Condicionar por plan (flag explícito `PlanMembresia.incluye_entrenador`, hoy inexistente) en lugar del texto libre de marketing.

## 7. Diseño frontend
- Rutas: `/instructor/clases` (`roles=['instructor']`), `/socio/entrenador` y `/socio/rutina` (`roles=['socio']`), mismo patrón de `App.jsx:130-134`.
- Layouts: socio móvil en `MemberLayout.jsx`; instructor con `AppLayout` y nuevo `NAV_BY_ROLE.instructor` en `Sidebar.jsx` (hoy `NAV_BY_ROLE[rol] ?? NAV_BY_ROLE.administrador`, `Sidebar.jsx:61`: un rol desconocido cae al menú de administrador, tener cuidado con el rol nuevo).
- Estados: vacío "Todavía no tenés un entrenador asignado."; skeleton; error toast.
- Textos (es-AR): "Mi entrenador", "Mi rutina de hoy", "Series × repeticiones".
- Responsive: rutina como lista vertical de tarjetas a 375 px.

## 8. Archivos a crear / modificar
Backend: `users/models.py` (+migración), `classes` (FK y serializer), nueva app `apps/training`, permisos, `seed_demo_users`. Frontend: páginas, hooks, `Sidebar`, `AppBottomNav`, `App.jsx`, `CreateClassPage.jsx` (selector de instructor desde usuarios en vez de texto; quitar el valor inicial `'Carlos R.'`).

## 9. Plan de pruebas (TDD)
- Backend: permisos por rol (socio 403 en crear rutina; instructor solo ve sus asignaciones); constraint de una asignación activa por socio; migración con `instructor` texto existente.
- Frontend: `Sidebar` con rol `instructor`; páginas de socio con y sin entrenador.
- Manual: crear usuario instructor (extender `StaffFormModal`, hoy solo admin/recepcionista: `users/serializers.py:10` `STAFF_ROLES`).

## 10. Criterios de aceptación
- **Dado** una clase con instructor asignado **cuando** el instructor inicia sesión **entonces** ve solo sus clases e inscriptos.
- **Dado** un socio con entrenador **cuando** abre "Mi entrenador" **entonces** ve su nombre; sin asignación ve el estado vacío.

## 11. Riesgos y decisiones abiertas
- Revierte la decisión de `speckit/design.md` § 2.2; confirmar con el dueño.
- ¿Los instructores son empleados con login o solo nombres? **Recomendación:** si no hace falta que operen en el sistema, mantener el texto libre y quitar del marketing "Seguimiento por entrenador".
- El flag de rol nuevo afecta `STAFF_ROLES`, el middleware de inactividad (`users/middleware.py:9`) y el guard (`ProtectedRoute.jsx:4`).

## 12. Referencias
- `speckit/design.md` § 2.2, `speckit/spec.md` § REQ-2.2. Sin spec de rutinas.

## 13. Prompt listo para un agente de IA
```
NO implementar sin aprobación del dueño (ver sección 11 de docs/backlog/items/BK-PLT-11-instructor-entrenador-asignado-y-rutinas.md). 
Si se aprueba solo la Fase 1: TDD primero (permiso IsInstructor, GET /api/classes/clases/?instructor=me, migración que conserva Clase.instructor texto). Agregá User.Rol.INSTRUCTOR, Clase.instructor_usuario, ajustá StaffCreateSerializer/STAFF_ROLES/StaffInactivityMiddleware y en frontend Sidebar.NAV_BY_ROLE.instructor, ProtectedRoute y una página /instructor/clases. Quitá el valor inicial 'Carlos R.' de CreateClassPage.jsx.
Terminado: pytest -q (>=80%) y `npm run lint && npx vitest run --coverage` verdes.
```
