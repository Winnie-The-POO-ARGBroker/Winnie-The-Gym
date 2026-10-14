# ADR-004: Deferral of Instructor Role (Fase 2) Post-Defensa

**Date**: 2026-10-14
**Status**: Accepted
**Deciders**: Development team

## Context

Issue #180 originally specified two phases for the Instructor entity:

- **Fase 1**: Instructor as a data entity (profile without login) — `nombre`, `apellido`, `email`, `telefono`, `especialidades`, `bio`, `activo`. Used as a FK target from `Clase.instructor_fk` and `SesionClase.instructor_override_fk`.
- **Fase 2**: Instructor as an authenticated user role — login, "Mis Clases" view, personal schedule management.

This ADR records the decision to implement only Fase 1 in PR #10 and defer Fase 2 post-defensa.

## Decision

**Fase 2 is deferred.** PR #10 delivers Fase 1 complete.

## Reasons

1. **Scope and defensa timeline**: Fase 2 requires extending the authentication system (new `rol='instructor'` on `User`, JWT claims, permission classes), adding new frontend views ("Mis Clases"), and potentially migrating existing auth flows. This scope exceeds what is needed to clear the ISPC defensa milestone.

2. **Auth system risk**: Introducing a new authenticated role touches `apps/users`, `apps/access/permissions.py`, and JWT token generation. A defect in this area could break existing admin/recepcionista/socio flows, which are already tested and stable.

3. **No blocking dependency**: The academic presentation does not require instructors to log in. Fase 1 (instructor entity linked to classes) is sufficient to demonstrate the data model and class scheduling feature.

4. **Non-regression**: Fase 1 is fully backwards-compatible — `Clase.instructor` (CharField) remains in place alongside `Clase.instructor_fk` (nullable FK), so no existing data or views break.

## Consequences

- `Instructor` rows are managed by admins via `/api/classes/instructores/` (CRUD).
- Instructors cannot log in or view their own schedule in this phase.
- A future PR implementing Fase 2 must:
  - Add `rol='instructor'` to `User.Rol` choices.
  - Create a `OneToOneField(Instructor)` or `ForeignKey(User)` bridge on `Instructor`.
  - Add `IsInstructor` permission class.
  - Implement `MisClasesView` for the instructor dashboard.
  - Write migration to link existing `Instructor` rows to `User` accounts.

## Related

- ADR-002: Initial decision on instructor role scope.
- Issue #180: Original spec including both phases.
- Issue #178: SesionClase model (uses `instructor_override_fk` from Fase 1).
