# CP-E2E-03 — Admin end-to-end: alta de personal + plan + socio + cobro + reportes + configuración

- **ID**: CP-E2E-03
- **Capa**: End-to-End
- **HU relacionadas**: US09 (Admin personal + planes + reportes), US02 (ABM socios), US05 (Cobros)
- **Prioridad**: P0
- **¿Automatizable?**: Sí — Playwright (planeado AUT-E2E-03)

## Precondiciones

- Backend + frontend corriendo con `seed_demo_users` ejecutado.
- Admin logueado (`admin@winnie.local`).

## Datos del caso

- **Nuevo recepcionista**: email `nuevo.recep.{ts}@winnie.local`, nombre "Nuevo Recep E2E".
- **Nuevo plan**: nombre "Plan E2E", precio $2500, duración 30 días, cupo clases 10.
- **Nuevo socio**: DNI `56{random}`, nombre "Socio E2E", email `socio.e2e.{ts}@test.local`, teléfono.
- **Config aforo**: subir aforo máximo a 100 y setear bloqueo al llegar al máximo.

## Pasos

### Fase 1 — Alta de personal (recepcionista)
1. Navegar a `/admin/usuarios`.
2. **Expected (post PR #317 + #322)**: TopBar con botón "Crear staff" visible (prop `actions`).
3. Click "Crear staff" → modal con formulario (email, rol).
4. Completar email + rol="recepcionista" + submit.
5. **Expected**: toast success + nueva fila en la tabla con "Pendiente activación" (badge).
6. **Verify**: `has_usable_password: false` en la fila. Botón "Reenviar email" visible solo en esta fila.
7. Click "Reenviar email" → toast "Email reenviado".
8. **Verify**: email español en Mailpit con link `${FRONTEND_URL}/auth/reset-password/...`.

### Fase 2 — Alta de plan
9. Navegar a `/admin/planes`.
10. Click "Crear plan" → formulario (nombre, descripcion, precio, duracion_dias, clases_asignadas, activo).
11. Completar con datos del caso + submit.
12. **Expected**: toast "Plan creado". Nueva fila en tabla.
13. Click en la fila → modal detalle con los datos ingresados.

### Fase 3 — Alta de socio (desde admin, no recepcionista)
14. Navegar a `/admin/socios`.
15. Click "Crear socio" → modal.
16. Completar nombre, apellido, DNI, teléfono, email + submit.
17. **Expected (post PR #317)**: toast "Socio creado" + redirect o update tabla.
18. **Verify**: fila nueva en tabla con estado "activo" + sin membresía.
19. Email del nuevo socio enviado (activación con nombre del gym + FRONTEND_URL).

### Fase 4 — Cobrar al nuevo socio (desde admin)
20. Navegar a `/recepcion/cobros` o shortcut desde el detalle del socio.
21. Buscar el socio recién creado.
22. Seleccionar "Plan E2E" + submit "Cobrar $2500".
23. **Expected**: toast + membresía activada. Pago creado.

### Fase 5 — Verificar reporte
24. Navegar a `/admin/reportes`.
25. **Expected**: dashboard con cards de ingresos del mes, socios activos, aforo promedio.
26. Click en "Reporte de pagos" (si existe) → descargar CSV/PDF.
27. **Expected**: archivo descargado contiene el pago recién hecho (fila con monto $2500 y socio.e2e).
28. Click en "Reporte de asistencia" → verificar que el fix de timezone del PR #319 pintea bien (permanencia correcta).

### Fase 6 — Configuración aforo
29. Navegar a `/admin/configuracion`.
30. **Expected (post PR #319)**: campos `aforo_maximo`, `aforo_umbral_alerta_pct` (90), `aforo_bloqueo_al_llegar_max` (checkbox).
31. Setear `aforo_maximo = 100`, `aforo_bloqueo_al_llegar_max = true`. Submit.
32. **Expected**: toast "Configuración actualizada".
33. **Verify**: en otra ventana `/recepcion/aforo-monitor` + simular 100 ingresos → siguiente ENTRY debería ser DENIED con mensaje "Aforo completo" (ver `test_scan_denied_aforo_full_when_block_active` del PR #319).

### Fase 7 — Visor auditoría (fix #219 PR #326)
34. Navegar a `/admin/auditoria`.
35. **Expected**: VisorAuditoria con tabla de AuditLog entries.
36. Filtrar por `entity_type=members.Socio` + fecha de hoy.
37. **Expected**: aparece el AuditLog del alta del socio E2E con actor=admin, action=CREATE, diff con los campos iniciales.

## Pasa / falla

- **PASA** si todas las fases ejecutan correctamente.
- **FALLA** si:
  - Botón "Crear staff" no se renderiza (regression de #162).
  - Alta de plan no refleja en la tabla (regression de #317).
  - Cobro manual desde admin no activa membresía.
  - Reporte CSV no contiene el pago recién creado o tiene fechas en UTC (regression de PR #133).
  - Configuración aforo no se persiste en backend (regression de #220 — asignado a Franco).
  - Visor auditoría no muestra entries de hoy (regression de #219 PR #326).

## Cobertura automatizada

Casi todas las fases están cubiertas unitariamente post Sprint 4:
- #162 fix botón Crear staff (PR #317) con test de componente.
- #223 alta recepción (PR #317) con test backend.
- #148/#153/#154 aforo backend-enforced (PR #319) con 15 tests.
- #219 AuditLog signals (PR #326) con test.

Lo que falta es Playwright glue test en Sprint 5 (planeado AUT-E2E-03).

## Follow-ups

- Script Playwright `tests/e2e/CP-E2E-03.spec.ts` en Sprint 5.
- Fake aforo loader (crear 100 AccessLogs en bulk) para no requerir 100 escaneos manuales.
