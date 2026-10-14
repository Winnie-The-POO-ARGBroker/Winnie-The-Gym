# Casos de prueba v2 — resumen de cambios

Archivos: `casos-de-prueba-v2.csv` (casos), `matriz-de-trazabilidad.csv` / `.md` (trazabilidad HU ↔ casos ↔ tests ↔ bugs). Ejecución real el 13/10/2026.

## Números

| | v1 | v2 |
|---|---|---|
| Casos totales | 66 | 269 |
| PASS | 61 | 247 |
| FALLA | 2 | 11 |
| PENDIENTE | 3 | 11 |

- De los 66 casos de v1, **54 se dividieron** y 12 se conservaron atómicos (mismo ID). Los 54 divididos generaron 205 casos.
- Casos nuevos (sin ID v1): 52. Son: 27 casos para tests backend que ya existían pero no estaban en v1 (acceso manual por DNI, autoservicio de certificado, login con Google, mis-pagos, cobro manual, reportes), 7 casos PENDIENTES que marcan huecos de cobertura, 6 casos manuales de bugs (TC-FRONTEND-06..11) y 12 casos automatizados de frontend con Vitest.
- Todo caso tiene HU relacionada (US01–US09 o "Transversal" con la razón en Comentarios), escenario #1–#3 o "N/A", tipo de testing, capa de la pirámide, ¿automatizable?, justificación, herramienta e ID del test automatizado.

## Cómo se ejecutó

- Backend: `docker exec winnie-the-gym-backend-1 python -m pytest apps -v --no-cov -p no:cacheprovider` (suite completa, **401 passed**; salida en `evidence/backend-pytest-output-2026-10-13.txt`). Se tomó el resultado por test de esa corrida en lugar de lanzar un proceso por test (≈400 arranques de BD). TC-MEMBERS-06 se re-ejecutó además por separado con los 5 node ids del caso (5 passed).
- Frontend: `docker exec winnie-the-gym-frontend-1 npx vitest run <6 archivos> --reporter=verbose` (56 passed; salida en `evidence/vitest-output-2026-10-13.txt`). Fuera del contenedor no corre (node_modules compilado para Linux).
- Casos manuales de frontend: se conserva lo ejecutado el 15/09/2026; no se re-ejecutaron. Los 6 casos de bugs (TC-FRONTEND-06..11) usan las capturas del 13/10/2026.

## Casos divididos

| Caso v1 | Casos v2 | Sufijos |
|---|---|---|
| TC-ACCESS-01 | 3 | A, B, C |
| TC-ACCESS-02 | 2 | A, B |
| TC-ACCESS-03 | 6 | A, B, C, D, E, F |
| TC-ACCESS-04 | 7 | A, B, C, D, E, F, G |
| TC-ACCESS-05 | 4 | A, B, C, D |
| TC-ACCESS-06 | 5 | A, B, C, D, E |
| TC-ACCESS-07 | 3 | A, B, C |
| TC-CLASSES-01 | 6 | A, B, C, D, E, F |
| TC-CLASSES-02 | 7 | A, B, C, D, E, F, G |
| TC-CLASSES-03 | 5 | A, B, C, D, E |
| TC-CLASSES-04 | 3 | A, B, C |
| TC-CLASSES-05 | 4 | A, B, C, D |
| TC-CLASSES-06 | 4 | A, B, C, D |
| TC-CLASSES-07 | 3 | A, B, C |
| TC-CLASSES-09 | 6 | A, B, C, D, E, F |
| TC-COMMON-01 | 3 | A, B, C |
| TC-COMMON-03 | 2 | A, B |
| TC-COMMON-04 | 4 | A, B, C, D |
| TC-COMMON-05 | 2 | A, B |
| TC-MEMBERS-01 | 6 | A, B, C, D, E, F |
| TC-MEMBERS-03 | 4 | A, B, C, D |
| TC-MEMBERS-04 | 5 | A, B, C, D, E |
| TC-MEMBERS-05 | 2 | A, B |
| TC-MEMBERS-06 | 5 | A, B, C, D, E |
| TC-MEMBERS-07 | 2 | A, B |
| TC-MEMBERS-08 | 3 | A, B, C |
| TC-MEMBERSHIPS-01 | 7 | A, B, C, D, E, F, G |
| TC-MEMBERSHIPS-02 | 4 | A, B, C, D |
| TC-MEMBERSHIPS-03 | 4 | A, B, C, D |
| TC-MEMBERSHIPS-04 | 6 | A, B, C, D, E, F |
| TC-MEMBERSHIPS-05 | 6 | A, B, C, D, E, F |
| TC-MEMBERSHIPS-06 | 4 | A, B, C, D |
| TC-MEMBERSHIPS-07 | 5 | A, B, C, D, E |
| TC-MEMBERSHIPS-08 | 5 | A, B, C, D, E |
| TC-PAYMENTS-02 | 2 | A, B |
| TC-PAYMENTS-04 | 2 | A, B |
| TC-PAYMENTS-05 | 2 | A, B |
| TC-PAYMENTS-07 | 2 | A, B |
| TC-PAYMENTS-08 | 3 | A, B, C |
| TC-REPORTS-01 | 3 | A, B, C |
| TC-REPORTS-04 | 2 | A, B |
| TC-REPORTS-05 | 2 | A, B |
| TC-USERS-01 | 2 | A, B |
| TC-USERS-02 | 2 | A, B |
| TC-USERS-03 | 4 | A, B, C, D |
| TC-USERS-04 | 4 | A, B, C, D |
| TC-USERS-05 | 2 | A, B |
| TC-USERS-06 | 3 | A, B, C |
| TC-USERS-07 | 3 | A, B, C |
| TC-FRONTEND-01 | 4 | A, B, C, D |
| TC-FRONTEND-02 | 5 | A, B, C, D, E |
| TC-FRONTEND-03 | 4 | A, B, C, D |
| TC-FRONTEND-04 | 5 | A, B, C, D, E |
| TC-FRONTEND-05 | 2 | A, B |

Cada sufijo tiene precondición, datos, pasos y resultado esperado propios. Ejemplo: TC-ACCESS-04-A..E (sin membresía, activa vigente, vencida, suspendida, baja) más -F (usuario sin perfil de socio) y -G (verificación repetida).

Atomicidad con matices:
- TC-ACCESS-06-D y -E comparten un mismo test (`test_generate_and_scan_qr_views`) porque ese test tiene dos aserciones independientes (autoriza y persiste el log) que trazan a US05 #1 y #3.
- Algunos tests recorren varios valores de una misma partición (TC-MEMBERSHIPS-07-A: estados vencida/suspendida/cancelada; TC-ACCESS-08-G: tres DNI inválidos; TC-REPORTS-03-B: tres URLs). Se dejaron como un caso.

## Casos que no se pudieron ejecutar o quedan FALLA/PENDIENTE

### FALLA (11)
- TC-FRONTEND-03-A — Agenda de clases: los filtros por día, categoría, turno y búsqueda devuelven solo lo esperado
- TC-FRONTEND-03-B — Agenda de clases: reservar una clase con cupo disponible
- TC-FRONTEND-03-C — Agenda de clases: intentar reservar una clase sin cupo muestra error
- TC-FRONTEND-03-D — Mis Reservas: cancelar una reserva existente libera el cupo
- TC-FRONTEND-05-B — Alta de socio: al completar y enviar se confirma la creación con feedback de éxito
- TC-FRONTEND-06 — El perfil de administrador carga sus datos personales
- TC-FRONTEND-07 — En Gestión de usuarios existe el botón "Crear staff"
- TC-FRONTEND-08 — Abrir la terminal completa de asistencia desde el modal de inscriptos muestra la clase seleccionada
- TC-FRONTEND-09 — La pestaña "Pagos" de la ficha de socio muestra solo los pagos de ese socio
- TC-FRONTEND-10 — La subida del certificado médico desde "Mi Perfil" envía el archivo y confirma
- TC-FRONTEND-11 — El socio tiene el menú inferior de navegación en todas las pantallas del portal (móvil)

TC-FRONTEND-03-A..D están FALLA porque la pantalla no carga (sesión mock: "Your session has expired"; sesión real: catálogo vacío; issue #30): los pasos no llegaron a ejecutarse. TC-FRONTEND-05-B (alta de socio no confirma, `onSubmit` solo hace `console.log`) viene de v1. TC-FRONTEND-06..11 son los 6 bugs de `bug-reports.md`.

### PENDIENTE (11)
- TC-ACCESS-01-D — Feed de aforo en vivo: el recepcionista conecta y recibe el snapshot inicial
- TC-ACCESS-02-C — Un egreso otorgado (EXIT) disminuye el aforo en tiempo real
- TC-ACCESS-05-E — La generación del QR se bloquea si el socio no tiene membresía vigente
- TC-ACCESS-06-F — Escaneo de QR de un socio con membresía vencida: la recepción recibe 403 MEMBERSHIP_INACTIVE
- TC-MEMBERS-01-G — Un recepcionista registra un socio nuevo (rol de la HU03)
- TC-MEMBERS-10 — El estado médico del socio pasa a "Aprobado" al finalizar la carga del certificado
- TC-USERS-01-C — Login con contraseña incorrecta responde 401 y no emite tokens
- TC-FRONTEND-02-C — Credencial digital: el QR rota solo al llegar a 0 (cada 30 s)
- CP-E2E-01 — Nuevo socio self-service — registro completo hasta acceso concedido
- CP-E2E-02 — Cobro manual recepcionista + verificación de credencial y historial del socio
- CP-E2E-03 — Admin end-to-end — alta de personal + plan + socio + cobro + reportes + configuración

CP-E2E-01..03 y TC-FRONTEND-02-C (rotación del QR al llegar a 0: v1 lo daba por PASS en bloque pero solo se esperaron ~6 s) no se ejecutaron. El resto son casos sin test: indican el test a escribir en la columna "ID del test automatizado".

Ningún test automatizado falló al re-ejecutarse (401/401 backend, 56/56 Vitest).

## Huecos de cobertura (ver matriz)

- **Sin cobertura (2):** US03 #3; US08 #2.
  - US03 #3 (estado médico "Aprobado"): el modelo Socio no tiene ese campo; no hay lógica ni test.
  - US08 #2 (el aforo baja al registrar una salida): ningún test crea un EXIT sobre el aforo.
- **Parcial (10):** US01 #2 (Google solo caminos negativos y manual sin captura), US01 #3 (solo UI con API mockeada; sin test de backend), US02 #3 (no se verifica estado Activo), US03 #1 (alta solo probada como administrador; la HU dice recepcionista), US03 #2 (UI de Mi Perfil rota, BK-SOC-02), US04 #2 (bloqueo solo en UI; el endpoint de generación no valida membresía), US05 #2 (mora por QR sin test; solo por DNI y servicio), US07 #1–#3 (API OK, pantalla de reservas FALLA).
- Casos PENDIENTES que nombran el test a escribir para cerrar cada hueco: TC-USERS-01-C, TC-ACCESS-02-C, TC-ACCESS-05-E, TC-ACCESS-06-F, TC-ACCESS-01-D, TC-MEMBERS-01-G, TC-MEMBERS-10.
- Sin HU en el backlog: pagos/cobros, membresías (renovación, estados, avisos), perfil de usuario, auditoría/observabilidad e infraestructura (marcados "Transversal").

## Hallazgos sobre v1 (correcciones hechas en v2)

1. **TC-MEMBERS-06**: en el CSV recibido, su "Resultado Obtenido" era una copia de **su propio** "Resultado Esperado", no de TC-MEMBERS-03 como se sospechaba. Se re-ejecutó y se reescribió con el resultado real, y se aclaró que la baja repetida por API se **rechaza** (400), no es idempotente; solo el servicio `dar_baja()` tolera dos llamadas.
2. **Resultado Obtenido = Resultado Esperado en {copy} de {len(v1)} casos de v1**: el mismo patrón en todos los casos automatizados. En v2 cada resultado obtenido incluye el nombre del test y su estado real (`PASSED`) de la corrida del 13/10/2026.
3. **TC-CLASSES-02 citaba tests inexistentes** (`test_create_clase_recep_403`, `test_patch_clase_recep_403`) y afirmaba "restringido a administrador". Los tests reales muestran que el recepcionista sí puede crear (201) y editar (200); solo eliminar es exclusivo del administrador.
4. **TC-REPORTS-03** decía "solo administradores"; `test_recepcionista_can_access_report` demuestra que el recepcionista también accede a los tres reportes.
5. **TC-ACCESS-01** se titulaba "solo administrador"; el consumer WebSocket permite administrador y recepcionista (el segundo sin test: TC-ACCESS-01-D PENDIENTE).
6. **TC-MEMBERSHIPS-04** hablaba de "duración no soportada (ej. 60)"; el test usa 10 y la regla vigente es un rango 30–365 (60 es válido).
7. Expectativas de v1 que el test no verifica: TC-PAYMENTS-02-B/03 ("no se contacta la pasarela", "sin registros inconsistentes"), TC-PAYMENTS-06 ("no reenvía el correo"). Se documentó en Comentarios qué aserta realmente el test.
8. TC-FRONTEND-02 y TC-FRONTEND-01 daban por PASS bloques que el resultado obtenido no respaldaba del todo (rotación del QR; Google OAuth sin captura). Se separaron; la rotación quedó PENDIENTE.
9. Tests existentes que v1 no citaba y ahora tienen caso: `test_manual_access.py`, `test_certificado_self_service.py`, `test_mis_pagos.py`, `GoogleLoginViewTests`, 3 de `test_cobro_manual.py`, 5 de `test_reports_endpoints.py`, 1 de `test_certificado_upload.py`.
10. Siguen sin caso (fuera del alcance de las HU y de esta revisión): `test_staff_create.py`, `test_gym_config.py`, `test_inactivity_middleware*.py`, `test_seed_*.py`, `test_soft_cancel.py`, `test_class_contract_fields.py`, `test_plan_contract_fields.py`, `test_audit_diff.py`, `test_request_id.py`, `test_email_helper.py`, `test_cleanup_orphan.py`, `test_production_settings.py`, `test_qr_scan_latency_benchmark.py` y los tests de modelos/TextChoices; y el resto de los archivos de Vitest (solo se citan 6).

## Notas de honestidad

- "Capa de la pirámide": las vistas con `APIClient` figuran como "API"; servicios/modelos/configuración como "Unitaria backend"; señales, WebSocket, Celery y Mongo como "Integración backend"; Vitest y manuales como "UI/E2E".
- "Tipo de testing": se usó solo la lista pedida; las pruebas de seguridad/abuso figuran como "negativa".
- Los tests de escaneo QR mockean `has_active_membership`; las pruebas con pasarela mockean MercadoPago. No hay ejecución contra servicios reales.
- No verificado: que `backend-pytest-output.txt` (233 passed) corresponda al mismo commit; la suite actual tiene 401 tests.
