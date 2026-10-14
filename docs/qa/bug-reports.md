# Reportes de bugs — Sprint 3/4 (V&V)

Reportes redactados con el modelo de la consigna (`.github/ISSUE_TEMPLATE/bug_report.md`), listos para cargar como Issues con la etiqueta `bug`. Cada uno enlaza su ficha técnica en [`docs/backlog/items/`](../backlog/items/) (causa raíz con `archivo:línea`) y su evidencia en [`docs/qa/evidence/bugs/`](evidence/bugs/).

**Ambiente de todos los reportes:** macOS (Darwin 25.6) · Chromium 153.0.8010.12 (Playwright 1.63) · `docker compose up` local (frontend `localhost:5173`, backend `localhost:8000`) · cuentas de `seed_demo_users`.
**Cómo se regeneran las capturas:** `DEMO_USER_PASSWORD=<clave del seed> node frontend/scripts/capture-bug-evidence.mjs` (detalle de las llamadas de red en `evidence/bugs/api-evidence.json`).

| # | Bug | Severidad | Etiquetas | Ficha | HU afectada |
|---|---|---|---|---|---|
| 1 | El perfil de administrador/recepcionista no carga (404) | Alta | `bug`, `backend` | [BK-BUG-01](../backlog/items/BK-BUG-01-perfil-staff-devuelve-404.md) | US01 |
| 2 | "Crear staff" no se muestra en Usuarios | Alta | `bug`, `frontend` | [BK-BUG-03](../backlog/items/BK-BUG-03-crear-staff-boton-invisible-y-estado-activacion-falso.md) | US01 |
| 3 | "Abrir terminal completa de asistencia" termina en "Clase no encontrada" | Alta | `bug`, `frontend` | [BK-BUG-04](../backlog/items/BK-BUG-04-redirect-legacy-pierde-query-asistencia-clase-no-encontrada.md) | US06 |
| 4 | La pestaña "Pagos" de la ficha de socio muestra pagos de otros socios | Alta | `bug`, `frontend`, `backend` | [BK-SOC-03](../backlog/items/BK-SOC-03-detalle-socio-pagos-de-otros-socios.md) | US03 |
| 5 | La subida del certificado médico desde "Mi Perfil" no hace nada | Alta | `bug`, `frontend`, `backend` | [BK-SOC-02](../backlog/items/BK-SOC-02-subida-apto-medico-en-perfil-no-funciona.md) | US03 |
| 6 | El socio no tiene menú inferior en `/dashboard`, `/perfil` y `/socio/pagos` (móvil) | Media | `bug`, `frontend` | [BK-MOB-02](../backlog/items/BK-MOB-02-navegacion-movil-socio.md) | US04 |

---

## 1. El perfil de administrador/recepcionista no carga (404)

**Tema / Pantalla:** Mi Perfil (`/perfil`) con rol administrador.

**Ambiente de Testing:**
- Sistema Operativo: macOS (Darwin 25.6)
- Navegador: Chromium (Playwright)
- Versión: 153.0.8010.12

**Precondiciones**
Usuario `admin@winnie.local` (seed `seed_demo_users`) con sesión iniciada.

**Pasos para Reproducir**
1. Iniciar sesión como `admin@winnie.local`.
2. Ir a `/perfil` (Sidebar → usuario → "Ver perfil").
3. Observar el formulario "Datos personales" y la pestaña Network.

**Resultado Esperado**
El perfil carga el nombre, apellido y teléfono del usuario y permite editarlos.

**Resultado Obtenido**
`GET /api/auth/profile/` responde **404** `{"detail":"No Socio matches the given query."}` (dos veces). La pantalla no muestra ningún error: Nombre, Apellido y Teléfono quedan vacíos y el DNI aparece como "—".

**Evidencia**
- `docs/qa/evidence/bugs/BK-BUG-01_perfil-admin-formulario-vacio.png`
- `docs/qa/evidence/bugs/api-evidence.json` (clave `apiCalls.admin`, `status: 404`)

---

## 2. "Crear staff" no se muestra en Usuarios

**Tema / Pantalla:** Gestión de usuarios (`/admin/usuarios`).

**Ambiente de Testing:** igual al reporte 1.

**Precondiciones**
Usuario `admin@winnie.local` con sesión iniciada.

**Pasos para Reproducir**
1. Iniciar sesión como `admin@winnie.local`.
2. Sidebar → "Usuarios".
3. Buscar el botón para crear personal en la cabecera.

**Resultado Esperado**
Existe un botón "Crear staff" arriba a la derecha que abre el formulario de alta de personal (recepcionista/administrador).

**Resultado Obtenido**
La cabecera muestra solo el título "Gestión de usuarios". No hay ningún botón de alta. La única acción disponible por fila es "Reenviar activación", incluso para usuarios que ya están activos.

**Evidencia**
- `docs/qa/evidence/bugs/BK-BUG-03_usuarios-sin-boton-crear-staff.png`

---

## 3. "Abrir terminal completa de asistencia" termina en "Clase no encontrada"

**Tema / Pantalla:** Clases → Lista y Detalle → modal de inscriptos → Asistencia.

**Ambiente de Testing:** igual al reporte 1.

**Precondiciones**
Usuario `recepcion@winnie.local` con sesión iniciada. Existe al menos una clase (el seed trae 4).

**Pasos para Reproducir**
1. Iniciar sesión como `recepcion@winnie.local`.
2. Sidebar → "Clases" → pestaña "Lista y Detalle".
3. Con la primera clase seleccionada ("Funcional Intensivoads", ID 1), presionar "Ver lista de inscriptos".
4. En el modal, presionar "Abrir terminal completa de asistencia".

**Resultado Esperado**
Se abre la pantalla de asistencia de la clase seleccionada, con su nombre y su lista de inscriptos.

**Resultado Obtenido**
La URL final es `/admin/clases/asistencia` (**se perdió el `?id=`**), el título es genérico ("Asistencia — Clase Grupal") y aparece el toast rojo **"Clase no encontrada"**.

**Evidencia**
- `docs/qa/evidence/bugs/BK-BUG-04_clases-lista-detalle.png` (paso 2)
- `docs/qa/evidence/bugs/BK-BUG-04_modal-inscriptos-con-enlace.png` (paso 3)
- `docs/qa/evidence/bugs/BK-BUG-04_clase-no-encontrada.png` (resultado)
- `docs/qa/evidence/bugs/api-evidence.json` (clave `bug04FinalUrl`)

---

## 4. La pestaña "Pagos" de la ficha de socio muestra pagos de otros socios

**Tema / Pantalla:** Gestión de Socios → detalle de socio → pestaña "Pagos".

**Ambiente de Testing:** igual al reporte 1.

**Precondiciones**
Usuario `admin@winnie.local`. En la base hay 2 pagos en total (de los socios S-00001 y S-00002); el socio S-00009 (Eduardo Nuevo, `socio.nuevo@winnie.local`) tiene **0 pagos**.

**Pasos para Reproducir**
1. Iniciar sesión como `admin@winnie.local`.
2. Sidebar → "Socios".
3. Abrir el detalle de "Eduardo Nuevo" (S-00009).
4. Ir a la pestaña "Pagos".

**Resultado Esperado**
Estado vacío ("sin pagos"), porque el socio no registró ninguno.

**Resultado Obtenido**
Se listan 2 pagos "Smoke Plan — $ 1.500,00 — pendiente" que pertenecen a otros socios. La pantalla pidió `GET /api/payments/pagos/?socio_id=9` y el backend devolvió `count: 2`: el filtro real se llama `socio`, así que `socio_id` se ignora y se devuelve todo.

**Evidencia**
- `docs/qa/evidence/bugs/BK-SOC-03_ficha-socio-pagos-ajenos.png`
- `docs/qa/evidence/bugs/api-evidence.json` (clave `apiCalls.admin-socios`, URL con `socio_id=9`)

---

## 5. La subida del certificado médico desde "Mi Perfil" no hace nada

**Tema / Pantalla:** Mi Perfil (`/perfil`) con rol socio.

**Ambiente de Testing:** igual al reporte 1.

**Precondiciones**
Usuario `socio.nuevo@winnie.local` (sin certificado cargado) con sesión iniciada. Un PDF válido para subir.

**Pasos para Reproducir**
1. Iniciar sesión como `socio.nuevo@winnie.local`.
2. Ir a `/perfil`: la sección "Certificado médico" dice "No hay certificado cargado".
3. Presionar "Subir certificado" y elegir un PDF.
4. Esperar 2 segundos y observar la pantalla y la red.

**Resultado Esperado**
Se envía el archivo, aparece un aviso de éxito ("Certificado cargado") y la sección pasa a mostrar el certificado.

**Resultado Obtenido**
No se dispara **ninguna** request distinta de GET, no hay aviso y la pantalla queda igual ("No hay certificado cargado").

**Evidencia**
- `docs/qa/evidence/bugs/BK-SOC-02_perfil-antes-de-subir-apto.png`
- `docs/qa/evidence/bugs/BK-SOC-02_perfil-despues-de-subir-apto-sin-cambios.png`
- `docs/qa/evidence/bugs/api-evidence.json` (clave `bugSoc02NonGetApiRequestsAfterUpload: 0`)

---

## 6. El socio no tiene menú inferior en `/dashboard`, `/perfil` y `/socio/pagos` (móvil)

**Tema / Pantalla:** Portal del socio en móvil (iPhone SE, 375×667).

**Ambiente de Testing:**
- Sistema Operativo: macOS (Darwin 25.6), emulando iPhone SE
- Navegador: Chromium (Playwright)
- Versión: 153.0.8010.12

**Precondiciones**
Usuario `socio.activo@winnie.local` con sesión iniciada en viewport móvil.

**Pasos para Reproducir**
1. Iniciar sesión como `socio.activo@winnie.local` con viewport de iPhone SE.
2. Ir a `/socio/credencial`: se ve la barra de navegación inferior.
3. Ir a `/dashboard`, luego a `/perfil` y luego a `/socio/pagos`.

**Resultado Esperado**
La barra de navegación inferior (Inicio, Clases, QR, Pagar, Perfil) está disponible en todas las pantallas del portal del socio.

**Resultado Obtenido**
En `/dashboard`, `/perfil` y `/socio/pagos` **no hay barra inferior** (se verificó por DOM: `bottomNavVisible: false`) y tampoco el Sidebar, que está oculto en móvil. El socio queda sin forma de navegar salvo con los botones internos o el botón "atrás".

**Evidencia**
- `docs/qa/evidence/bugs/BK-MOB-02_credencial-con-nav.png` (con barra)
- `docs/qa/evidence/bugs/BK-MOB-02_dashboard-sin-nav.png`
- `docs/qa/evidence/bugs/BK-MOB-02_perfil-sin-nav.png`
- `docs/qa/evidence/bugs/BK-MOB-02_pagos-sin-nav.png`
- `docs/qa/evidence/bugs/api-evidence.json` (clave `bugMob02`)
