# Evidencia de ejecución — Casos de frontend (manual)

Capturas de pantalla de la ejecución real de los 5 casos de prueba manuales de frontend (`docs/qa/casos-de-prueba.csv`, módulo Frontend), tomadas el 15/09/2026 mediante un script automatizado (Playwright) que reproduce los mismos pasos que un tester haría a mano en el navegador.

## TC-FRONTEND-01 — Login — PASS

- `01-login-page.png` — pantalla de login
- `01-login-admin-dashboard.png` — acceso rápido Administrador → Dashboard
- `01-login-recepcionista-dashboard.png` — acceso rápido Recepcionista → Dashboard
- `01-login-socio-dashboard.png` — acceso rápido Socio → Dashboard

## TC-FRONTEND-02 — Credencial digital con QR — PASS

- `02-credencial-qr-inicial.png` — QR inicial con contador en 30s
- `02-credencial-qr-tras-espera.png` — contador tras ~6s de espera (cuenta regresiva confirmada)
- `02-credencial-qr-refresh-manual.png` — resultado del refresh manual
- `02-credencial-qr-fullscreen.png` — modo pantalla completa en alto contraste

## TC-FRONTEND-03 — Agenda y reservas de clases — FALLA

- `03-clases-catalogo.png` — **hallazgo**: toast "Error al cargar clases / Your session has expired", redirige a `/login` con sesión mock de Socio
- `03-clases-mis-reservas.png` — misma falla de sesión al intentar ver "Mis Reservas"

## TC-FRONTEND-04 — Terminal de acceso de recepción — PASS

- `04-acceso-exito.png` — escaneo simulado con resultado éxito
- `04-acceso-error.png` — escaneo simulado con resultado error (membresía vencida)
- `04-acceso-advertencia.png` — escaneo simulado con resultado advertencia
- `04-acceso-auto-clear.png` — panel limpio tras ~5s (auto-limpieza confirmada)
- `04-acceso-dni-manual-error.png` — ingreso manual de DNI terminado en 2 → Acceso denegado

## TC-FRONTEND-05 — Alta de socios (Gestión de Socios) — FALLA (parcial)

- `05-alta-socio-validacion-vacia.png` — validación de campos obligatorios (bloquea envío vacío)
- `05-alta-socio-formulario-completo.png` — formulario completo antes de enviar
- `05-alta-socio-post-submit.png` — tras enviar: sin confirmación visual de éxito (el `onSubmit` solo hace `console.log`, confirmado en consola del navegador)

---

Detalle completo de cada ejecución, incluyendo log de consola capturado: ver `results.md` en la sesión de trabajo, y los resultados ya volcados en `docs/qa/casos-de-prueba.csv`.
