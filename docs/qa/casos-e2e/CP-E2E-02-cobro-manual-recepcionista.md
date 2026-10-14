# CP-E2E-02 — Cobro manual recepcionista + verificación de credencial e historial del socio

- **ID**: CP-E2E-02
- **Capa**: End-to-End
- **HU relacionadas**: US02 (ABM socios recepcionista), US05 (Cobro manual), US06 (Membresía), US08 (Historial pagos)
- **Prioridad**: P0
- **¿Automatizable?**: Sí — Playwright (planeado AUT-E2E-02)

## Precondiciones

- Backend + frontend corriendo.
- `seed_demo_users` ejecutado — hay un socio vencido (ej.: `socio.vencido@winnie.local`).
- Al menos 1 `PlanMembresia` activo.
- Recepcionista logueado (`recepcion@winnie.local`).

## Datos del caso

- **Socio target**: Diana Vencida (DNI 22222222, S-00008). Membresía vencida pre-caso.
- **Monto**: `$1500` (precio del Plan Demo).
- **Plan**: Plan Demo (vigente).

## Pasos

### Fase 1 — Buscar socio
1. Navegar a `/recepcion/socios`.
2. **Expected**: GestionSociosPage tab "Listado" visible.
3. Buscar "Diana" o DNI "22222222".
4. **Expected**: fila con el socio aparece. Columna "Estado" indica "Membresía vencida" (badge rojo/amarillo).

### Fase 2 — Registrar cobro manual
5. Navegar a `/recepcion/cobros` (o click "Nuevo cobro manual" si existe shortcut).
6. **Expected**: formulario de cobro con search del socio.
7. Buscar socio por DNI 22222222 → chip con nombre.
8. Seleccionar Plan Demo del dropdown → monto se prellena en $1500.
9. Observación: "Pago en efectivo, caja chica".
10. Submit "Cobrar".
11. **Expected**: toast "Cobro registrado — membresía reactivada". POST `/api/payments/cobros-manuales/` 201.
12. **Verify**: redirect a `/recepcion/cobros/` o home con listado actualizado + nuevo pago.

### Fase 3 — Verificar membresía activa
13. En la fila del cobro recién creado, click "Ver socio" o navegar a `/admin/socios/{id}`.
14. **Expected**: SocioDetailModal o page con pestañas incluye nueva pestaña "Actividad" (post PR #326).
15. Pestaña "Membresía" debe mostrar: estado "Activa", fecha fin = hoy + 30 días (duracion del Plan Demo).
16. Pestaña "Pagos" debe listar el cobro recién creado con `fecha, monto, operador=María Recepción, estado=aprobado`.

### Fase 4 — Verificar credencial del socio
17. Login como el socio (ventana separada, mismo DNI).
18. Navegar a `/socio/credencial`.
19. **Expected**: QR dinámico visible. Banner de "membresía vencida" NO visible.
20. En la ventana del terminal de recepción, escanear el QR en modo ENTRY.
21. **Expected**: "Entrada registrada" (post PR #319, EXIT no valida membresía, pero ENTRY sí → debería permitir porque la membresía está activa).

### Fase 5 — Verificar historial de pagos socio
22. Login como el socio.
23. Navegar a `/socio/pagos`.
24. **Expected**: tabla "Mis Pagos" lista el pago recién hecho + pagos anteriores (si hay).
25. Columnas: fecha, concepto (Plan Demo), monto ($1500), estado (aprobado).
26. **Expected (mobile)**: en < 768px la tabla se renderiza como cards (post PR #322).

## Pasa / falla

- **PASA** si todas las fases ejecutan correctamente.
- **FALLA** si:
  - El cobro manual no activa la membresía automáticamente.
  - El historial de pagos no muestra el pago en la sesión del socio.
  - El QR scan deniega acceso ("MEMBERSHIP_INACTIVE") inmediatamente después del cobro.
  - La pestaña Actividad no está (post PR #326 regression).

## Cobertura automatizada

Backend cubierto por:
- Tests de cobros-manuales en `apps/payments/tests/*`.
- Tests de membresia activa + `GET /api/memberships/me/`.
- Fix #223 (recepcionista puede crear socios + cobros) en PR #317.

Falta glue Playwright en Sprint 5.
