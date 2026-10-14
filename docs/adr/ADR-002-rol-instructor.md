# ADR-002 — Rol Instructor + entrenador asignado + rutinas personalizadas

- **Status**: Proposed (deferred to post-defensa ISPC)
- **Date**: 2026-10-14
- **Deciders**: @MrForii, @Franco-Arce, equipo full
- **Issue**: #217
- **Depende de**: ADR-001 (modelo de clases)

## Contexto

El frontend de planes muestra beneficios como "Seguimiento por entrenador" y "Rutina personalizada" (ver `/socio/checkout` + landing). El backend **no respalda** nada de eso:

- No existe rol `instructor` en `User.Rol` (hoy: `administrador`, `recepcionista`, `socio`).
- El campo `Clase.instructor` es texto libre.
- No hay modelo de rutinas ni entrenador asignado.

**Riesgo comercial**: si un socio paga un plan con "seguimiento personalizado" y la app no entrega, hay un problema de confianza + compliance.

## Decisión

**Deferir implementación a sprints 5+** siguiendo el plan por fases abajo. **ADR aceptado como roadmap**, pero el código no se escribe hasta que:

1. ADR-001 se materialice (modelo de clases con FK instructor).
2. Se tenga tiempo de equipo + testing E2E planeado.

## Plan por fases

### Fase 1 — Rol instructor + Clase con FK instructor (Sprint 5)
**Scope**: alineación básica sin funcionalidad avanzada.

- Agregar `User.Rol.INSTRUCTOR = 'instructor'`.
- Modificar `Clase.instructor` de `CharField` a `ForeignKey(User, rol='instructor')`. Data migration que trata de matchear el texto con usuarios existentes y crea placeholder si no hay match.
- Nueva pantalla staff `MisClasesInstructor.jsx`: lista las clases del instructor logueado + inscriptos.
- Permisos: instructor puede ver sus clases pero NO crearlas (eso sigue siendo admin/recep).
- Endpoints:
  - `GET /api/classes/mis-clases/` — instructor-only, filtra por `request.user.id`.
- Tests: cobertura mínima para listado + permission.

**Compromiso**: si ADR-001 **NO** se migró, Fase 1 se puede hacer sobre `Clase.instructor` convertido a FK sin problema.

### Fase 2 — Asignación de entrenador al socio (Sprint 6)

Modelo:
```python
class AsignacionEntrenador(models.Model):
    socio = ForeignKey(Socio)
    instructor = ForeignKey(User, rol='instructor')
    desde = DateField
    hasta = DateField(nullable, blank)  # null = activa
    notas = TextField(blank)
```

**UI**:
- Socio: nueva card en Dashboard "Mi entrenador" con nombre + foto + email + botón "Mensaje".
- Admin: en `AdminSociosPage` + `SocioDetailModal` nueva pestaña "Entrenador" para asignar/desasignar.
- Instructor: en su dashboard una lista "Mis socios asignados".

**Endpoints**:
- `GET/POST /api/members/socios/{id}/asignaciones-entrenador/` — admin.
- `GET /api/users/mi-entrenador/` — socio.

### Fase 3 — Rutinas personalizadas (Sprint 7+)

Modelos:
```python
class Rutina(models.Model):
    socio = ForeignKey(Socio)
    instructor = ForeignKey(User)
    nombre = CharField
    descripcion = TextField
    created_at = DateTimeField

class EjercicioRutina(models.Model):
    rutina = ForeignKey(Rutina)
    orden = IntegerField
    nombre = CharField
    series = IntegerField
    repeticiones = IntegerField
    descanso_segundos = IntegerField
    notas = TextField(blank)
```

**UI**: nueva page `MiRutina.jsx` para el socio, nueva page `CrearRutina.jsx` para el instructor. Exportable a PDF.

## Criterios de aceptación (del issue)

- **Fase 1**:
  - **Dado** una clase con instructor asignado **cuando** el instructor inicia sesión **entonces** ve solo sus clases e inscriptos.
- **Fase 2**:
  - **Dado** un socio con entrenador **cuando** abre "Mi entrenador" **entonces** ve su nombre; sin asignación ve estado vacío.
- **Fase 3**:
  - Rutina creada por instructor + visible por el socio en el app.

## Dependencias cruzadas

- **ADR-001**: la Fase 1 asume FK instructor en `Clase` o `SesionClase`. Si ADR-001 se materializa primero (modelo nuevo), Fase 1 se adapta a `SesionClase.instructor`.
- **Rol granular (#215 BK-PLT-09)**: si se implementan permisos granulares por rol antes, instructor hereda de ahí.
- **Comunicaciones masivas (#214 BK-PLT-08)**: email del socio al entrenador puede reusar el motor de comunicaciones.

## Consecuencias

- #217 **cerrado** como "deferred to post-defensa" con este ADR como roadmap.
- Expectativa comercial del plan (seguimiento + rutinas) queda **documentada como roadmap** pero **no implementada en MVP**.
- Si en la defensa surge "¿y cómo cumple con 'seguimiento por entrenador'?", respuesta honesta: **"está planificado en sprint 5 fase 1 como está documentado en ADR-002"**. El plan muestra que el equipo tiene conciencia + roadmap.

## Riesgos

- **Expectation debt**: cada mes que pasa sin fase 1 agrava el "no cumplimos el plan". Mitigación: comunicar en la landing que "seguimiento personalizado estará disponible desde {MES}".
- **Data migration de instructor** texto libre → FK: algunos registros van a quedar en placeholder "Instructor no identificado". Mitigación: documento el proceso + los admins validan los matches post-migración.

## Alternativas consideradas

### Alt 1 — Dejar `instructor` como texto libre y aceptar la deuda
Rechazado: contradice directamente los planes que ya se venden con "seguimiento personalizado".

### Alt 2 — Implementar las 3 fases en un solo sprint
Rechazado: XL por tamaño + depende de ADR-001 + requiere testing E2E que no hay.

### Alt 3 — Solo Fase 1, y las fases 2+3 "cuando haya demanda"
Considerado. **Aceptable como compromiso realista** si la carga del equipo lo exige. El plan documenta las 3 fases pero prioridad real es Fase 1.
