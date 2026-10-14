# ADR-001 — Modelo de clases: `Clase/InscripcionClase` vs `TipoClase/SesionClase/Reserva`

- **Status**: Accepted (post-defensa ISPC)
- **Date**: 2026-10-14
- **Deciders**: @MrForii (líder), @Franco-Arce (backend lead), equipo full
- **Issue**: #42

## Contexto

El módulo de clases hoy está modelado con dos entidades:

```python
# apps/classes/models.py
class Clase(models.Model):
    nombre = CharField
    disciplina = CharField
    instructor = CharField  # texto libre (fix issue #217)
    sala = CharField
    fecha = DateField
    hora_inicio = TimeField
    cupo_maximo = IntegerField
    estado = CharField  # programada/cerrada/cancelada

class InscripcionClase(models.Model):
    socio = ForeignKey(Socio)
    clase = ForeignKey(Clase)
    created_at = DateTimeField
```

**Pain points conocidos**:
1. Imposible modelar una clase recurrente ("Yoga Vinyasa de los martes a las 18h") sin crear N `Clase` manualmente.
2. No hay un **catálogo** reusable de tipos de clase — cada clase tiene su nombre/disciplina duplicados.
3. `instructor` es texto libre → sin FK → no permite "clases de Juan" ni dashboards por instructor (ver #217).
4. No existe funcionalidad de **cancelación por socio** ni **cancelación por admin** con las consecuencias correctas (liberar cupo, notificar).

### Modelo propuesto

```
TipoClase (catálogo)
    │ 1
    │
    │ N
SesionClase (instancia con fecha/hora/instructor)
    │ 1
    │
    │ N
Reserva (socio inscrito a una sesión)
    │ N
    │
    │ 1
Socio
```

```python
class TipoClase(models.Model):
    nombre = CharField
    disciplina = CharField
    descripcion = TextField
    duracion_minutos = IntegerField
    cupo_default = IntegerField
    activo = BooleanField

class SesionClase(models.Model):
    tipo = ForeignKey(TipoClase)
    instructor = ForeignKey(User)  # rol=instructor
    sala = CharField
    fecha = DateField
    hora_inicio = TimeField
    cupo_maximo = IntegerField  # puede sobrescribir el default
    estado = CharField  # programada/cerrada/cancelada

class Reserva(models.Model):
    socio = ForeignKey(Socio)
    sesion = ForeignKey(SesionClase)
    estado = CharField  # confirmada/cancelada_socio/cancelada_admin/presente/ausente
    cancelada_at = DateTimeField(nullable)
    cancelada_motivo = CharField(blank)
```

## Decisión

**Mantener el modelo actual (`Clase/InscripcionClase`) hasta después de la defensa ISPC**. Migrar al modelo propuesto en Sprint post-defensa (sprint 5+).

## Razonamiento

### Pros del modelo propuesto
- **Separación de preocupaciones** limpia (catálogo vs instancia vs reserva).
- Permite **series recurrentes** sin manual.
- **Instructor como FK** (resuelve #217 fase 1 limpio).
- Estado por reserva más rico (cancelación por socio vs admin, presente vs ausente).
- Facilita reportes de ocupación por instructor y por tipo.

### Contras / costos
- **Migración de datos** significativa: cada `Clase` existente debe convertirse en `TipoClase + SesionClase + Reservas`. Se puede automatizar en una `0010_migrate_clases_to_sesiones.py` pero requiere decidir cómo deduplicar nombres repetidos.
- **Rewrite parcial del frontend**: `ClassCalendarView`, `CreateClassPage`, `ClasesPage` cambian de contrato. Tests existentes (17+ archivos) hay que actualizar.
- **Impacto en test suite** backend: `apps/classes/tests/*` entera hay que rehacer.
- Período de **compatibilidad backwards** (feature flag + endpoints paralelos) o migración de "big bang" con riesgo.
- Impacto en `AccessLog` / `AuditLog` del PR #326: si una `Clase` referenciada por un log histórico desaparece, el audit queda roto.

### Por qué no migrar ahora

El Sprint 4 cerró 50+ issues y hay una **defensa académica inmediata** (ISPC). Migrar en el último sprint:
1. Agregaría riesgo alto de regresión funcional en algo que **funciona**.
2. Rompería o requeriría re-hacer **~15% del frontend tocado por los PRs #319, #322, #325**.
3. No agrega valor demostrable en la defensa (el panel de ocupación y "mis clases" se pueden mostrar con el modelo actual).

El valor del modelo propuesto es real pero **se cosecha en sprint 5+** cuando el equipo tenga tiempo de hacer la migración con cuidado.

## Plan de migración (futuro — sprint 5+)

### Fase 0 — Decisión y setup
- [x] Este ADR aceptado.
- [ ] Issue mother del rework: crear `[BK-CLS-REWRITE] Migrar modelo de clases al esquema TipoClase/SesionClase/Reserva`.
- [ ] Feature flag `settings.USE_NEW_CLASS_MODEL=False` por default.

### Fase 1 — Modelos nuevos sin romper los viejos
- Nuevos modelos agregados con tablas separadas.
- `Clase` queda intacta. Nuevo código viaja con la flag en True.
- Migración `0010_create_tipoclase_sesionclase_reserva.py`.

### Fase 2 — Data migration
- Management command `migrate_clases_to_sesiones` que:
  - Deduplica (nombre + disciplina) → TipoClase.
  - Convierte cada `Clase` en una `SesionClase`.
  - Convierte cada `InscripcionClase` en una `Reserva(estado='confirmada')`.
  - Reporta huérfanos.
- Idempotente + reversible.

### Fase 3 — Endpoints paralelos
- `GET /api/classes/sesiones/` (nuevo) coexiste con `GET /api/classes/clases/`.
- Frontend consume el nuevo detrás de la flag.

### Fase 4 — Switch over + cleanup
- Flag `USE_NEW_CLASS_MODEL=True` en prod.
- Deprecar endpoints viejos (log warning).
- 2 sprints después: deprecated → delete.

### Rollback plan
- La flag permite revertir en 1 deploy.
- Data no se destruye: los Clase/InscripcionClase viejos siguen en DB.
- Si la migración data destruye información (ej. metadata de inscripción perdida), rollback requiere restore de backup.

## Alcance de "cancelación" (addendum de #42)

Independiente del modelo elegido, definir ya para el próximo PR:

### Cancelación por socio
- **Hasta cuándo**: 2 horas antes del `hora_inicio` de la clase (configurable en `GymConfig.cancelacion_minutos_antes`, default 120).
- **Efectos**: libera el cupo, puede volver a reservar la misma clase, no se cobra penalidad en MVP.
- **UI**: botón "Cancelar" en `ClasesPage` solo visible si está dentro del plazo.
- **API**: `POST /api/classes/inscripciones/{id}/cancelar/` (modelo actual) o `POST /api/classes/reservas/{id}/cancelar/` (futuro).

### Cancelación por admin
- **Cuándo**: siempre, hasta `hora_inicio`.
- **Efectos**: libera cupos de todas las reservas + envía email a los socios notificando (template nuevo en `backend/apps/users/templates/account/email/clase_cancelada_*.html`).
- **Audit**: queda en AuditLog con actor=admin.
- **UI**: botón "Cancelar clase" en `CreateClassPage` (modo edición).

## Consecuencias de aceptar este ADR

- #42 queda **cerrado como "deferred to post-defensa"**.
- #217 también queda **deferido** (depende del modelo nuevo para la fase 1 de FK instructor).
- Cancelación por socio/admin se implementa en Sprint 5 con el modelo actual (patch simple) o con el nuevo (si ya migramos).
- Documento `docs/adr/ADR-002-rol-instructor.md` complementa este con el plan de rol instructor.

## Alternativas consideradas y rechazadas

### Alt 1 — Migrar ahora, rushed
Rechazado: riesgo alto previo a la defensa. Un bug en migración data = clases perdidas = demo rota.

### Alt 2 — Agregar solo FK instructor sin reestructurar
Considerado. Resuelve 50% de #217 con 10% del esfuerzo. **Posible compromiso para sprint 5 fase 1** si no se migra al modelo completo.

### Alt 3 — Modelo híbrido (TipoClase + Clase con instancias generadas on-demand)
Rechazado: añade complejidad sin resolver el problema de recurrencia. Peor de los dos mundos.
