# CP-E2E-01 — Nuevo socio self-service: registro completo hasta acceso concedido

- **ID**: CP-E2E-01
- **Capa**: End-to-End (navegador + backend + DB real)
- **HU relacionadas**: US01 (Registro público socio), US04 (Cert médico self-service), US06 (Checkout plan), US07 (Acceso por QR)
- **Prioridad**: P0 (debe pasar antes de defensa)
- **¿Automatizable?**: Sí — Playwright (planeado AUT-E2E-01)

## Precondiciones

- Backend corriendo con `seed_demo_users` ejecutado.
- Frontend en `localhost:5173`.
- Terminal de recepción en `/recepcion/acceso` abierta en una ventana separada (como molinete).
- Email catcher (ej.: Mailpit) corriendo si se valida el email de activación.
- Al menos 1 `PlanMembresia` activo en la DB (ej.: "Plan Mensual").

## Datos del caso

- **Email candidato**: `e2e.socio.{timestamp}@test.local` (dinámico).
- **DNI**: `55{random 6 dígitos}`.
- **Nombre/apellido**: `E2E / Candidato`.
- **Teléfono**: `+5493511234567`.
- **Plan**: el primero activo (`Plan Mensual`).
- **Cert médico de prueba**: PDF ≤ 1MB en `docs/qa/evidence/cert-medico-test.pdf`.

## Pasos (expected behavior post-Sprint 4)

### Fase 1 — Registro público
1. Navegar a `/registro`.
2. Completar formulario: nombre, apellido, email, DNI, teléfono, contraseña.
3. Submit.
4. **Expected**: respuesta 201 con `socio_id` + mensaje "Revisá tu email para activar tu cuenta".
5. **Verify**: en Mailpit o `mail.outbox` hay email en español con subject "Activá tu cuenta en Winnie The Gym" y link a `${FRONTEND_URL}/auth/reset-password/<uidb64>/<token>/`.

### Fase 2 — Activación
6. Click link del email.
7. **Expected**: landing en `/auth/reset-password/<uidb64>/<token>/`. Formulario "Elegí tu contraseña".
8. Setear password + submit.
9. **Expected**: redirect a `/login` con mensaje "Cuenta activada". Login con nuevo password.
10. **Expected**: landing en `/socio/dashboard` (NO `/completar-perfil` porque el perfil ya viene completo).

### Fase 3 — Cert médico self-service
11. Navegar a `/perfil`.
12. **Expected**: ProfilePage shape socio con `id`, `numero_socio`, `estado`, `certificado_medico_url=""`.
13. Click "Subir certificado médico" → file picker → seleccionar PDF.
14. **Expected**: toast "Validando..." → request `POST /api/members/socios/{id}/certificado-medico/` → toast "Certificado subido correctamente".
15. **Expected**: UI refleja "Certificado cargado" con link al archivo.

### Fase 4 — Checkout plan
16. Navegar a `/socio/checkout` o click "Pagar membresía" en dashboard.
17. **Expected**: lista de planes activos con botón "Pagar con MercadoPago".
18. Click "Pagar" en el Plan Mensual.
19. **Expected (sandbox)**: redirect a MercadoPago sandbox, completar pago con card de prueba.
20. **Expected**: regreso a `/socio/credencial?pago=exito` con banner success.
21. **Verify**: `GET /api/memberships/me/` devuelve membresía activa con `fecha_fin > today`.

### Fase 5 — Acceso por QR
22. Navegar a `/socio/credencial`.
23. **Expected**: QR dinámico visible, Wake Lock activo (pantalla no se apaga), botón "Ver en pantalla completa".
24. En la ventana del terminal de recepción (`/recepcion/acceso`), modo ENTRY:
25. Escanear el QR del socio.
26. **Expected**: ValidationResult "Entrada registrada" + socio info + aforo + 1 en el monitor.
27. Cambiar terminal a modo EXIT, re-escanear.
28. **Expected**: "Salida registrada" + aforo − 1.

## Pasa / falla

- **PASA** si todos los pasos ejecutan y los expected se cumplen.
- **FALLA** si:
  - Email de activación no llega o está en inglés o usa `example.com`.
  - Token no es aceptado por el confirm.
  - Cert médico POST responde algo distinto a 200.
  - Checkout no redirige a MercadoPago sandbox.
  - QR scan devuelve DENIED cuando la membresía está activa.
  - Terminal no diferencia ENTRY/EXIT.

## Cobertura automatizada

Backend ya cubre buena parte vía:
- `test_activation_email_token_accepted_by_password_reset_confirm` (PR #318)
- `test_cert_medico_upload_by_socio_dueno_succeeds` (PR #318)
- `test_profile_get_socio_exposes_id_numero_socio_estado_cert_url` (PR #318)
- `test_exit_with_expired_membership_returns_granted` (PR #319)
- Full suite tests sobre scan y aforo (PR #319).

Lo que falta para full automation es la "glue" de navegación via Playwright + un fake MercadoPago sandbox mock.

## Follow-ups

- Script Playwright `tests/e2e/CP-E2E-01.spec.ts` en Sprint 5 (planeado como AUT-E2E-01).
- Fake MercadoPago webhook para no depender del sandbox real en CI.
