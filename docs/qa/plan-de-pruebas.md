# Plan de Pruebas — Winnie The Gym

## 1. Encabezado

| Campo | Detalle |
|---|---|
| Nombre del Proyecto | Winnie The Gym — Sistema de gestión integral para gimnasios |
| Actividad | Verificación y Validación (V&V) — Sprint 3 |
| Fecha de elaboración | 14/09/2026 |
| Fecha de entrega de la actividad V&V | 17/09/2026 |
| Fecha de cierre del sprint del proyecto | 20/09/2026 |
| Institución | ISPC — Tecnicatura Superior en Desarrollo de Software |
| Repositorio | github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym |

## 2. Historial de Versiones

| Versión | Fecha | Autor(es) | Descripción del cambio |
|---|---|---|---|
| 1.0 | 14/09/2026 | Equipo QA (Magali Bechis, Gisele Lavisse, Jimena Gallegillo) con soporte técnico de Rodrigo Valdez | Elaboración inicial del Plan de Pruebas para la entrega de V&V del Sprint 3. |

## 3. Información del Proyecto

Winnie The Gym es un sistema de gestión integral para gimnasios que cubre autenticación de usuarios, administración de socios, planes de membresía, control de acceso mediante credencial digital (QR dinámico), gestión y reserva de clases, monitoreo de aforo en tiempo real y generación de reportes administrativos.

**Stack tecnológico** (confirmado en `docs/architecture.md`):

- **Frontend:** React (Vite) + TailwindCSS, desplegado en Vercel.
- **Backend:** Django REST Framework + Django Channels (WebSockets), desplegado en Render.
- **Base de datos transaccional:** PostgreSQL (Supabase en producción).
- **Auditoría / historial QR:** MongoDB (Atlas en producción).
- **Cache / broker / channel layer:** Redis (Upstash en producción).
- **Contenerización:** Docker / Docker Compose (5 servicios: `db`, `redis`, `mongo`, `backend`, `frontend`).
- **Integraciones externas:** MercadoPago (Checkout Pro + webhook), Google OAuth, Mailtrap (envío de emails vía Celery), Sentry (errores/performance), UptimeRobot (keep-alive).

**Alcance funcional (Product Backlog — 9 historias de usuario):** ver sección 8.

## 4. Aprobaciones

| Rol | Nombre | Aprobación | Fecha |
|---|---|---|---|
| Elaborado por | Magali Bechis | Elaborado | 14/09/2026 |
| Revisado por | Rodrigo Valdez | Revisado | 14/09/2026 |
| Aprobado por | Docente evaluadora | Pendiente | — |

Circuito de sign-off: el documento fue elaborado por Magali Bechis (QA Lead / Scrum Master) y revisado por Rodrigo Valdez (referente técnico full-stack). Queda pendiente la aprobación formal de la docente evaluadora al momento de la entrega.

## 5. Resumen Ejecutivo

Este Plan de Pruebas cubre la actividad de Verificación y Validación (V&V) del Sprint 3 del proyecto Winnie The Gym. El backend (Django REST Framework), organizado en 8 apps (`access`, `classes`, `common`, `members`, `memberships`, `payments`, `reports`, `users`), cuenta con una suite de **229 tests automatizados** (pytest + pytest-django), verificada en este ciclo ejecutándose localmente vía `docker compose exec backend pytest -q` con resultado **229 passed**. El frontend (React/Vite), en cambio, **no tiene tests automatizados** al día de hoy: varias pantallas (`GestionSocios`, `ClasesPage`, `CredencialDigitalPage`) todavía trabajan sobre datos mockeados (`socioMockData`) o formularios que solo hacen `console.log` en su `onSubmit`, a la espera de integrarse con los endpoints reales del backend. Por eso, la estrategia combina **regresión automatizada** sobre el backend con **pruebas manuales guiadas** sobre los flujos de UI visibles del frontend.

Como insumo adicional, el equipo ya cuenta con: un reporte de requisitos no funcionales de performance/disponibilidad (`docs/reports/rnf01-rnf06.md`), un set de pruebas de carga con Locust (`backend/loadtests/`) y 8 reportes de bugs ya cargados y cerrados como GitHub Issues (#78 a #85) usando la plantilla oficial del repositorio.

## 6. Alcance de las Pruebas

**Incluye:**

- Pruebas funcionales de regresión sobre los 8 módulos backend Django vía la suite pytest existente.
- Pruebas manuales funcionales y de usabilidad sobre los flujos de UI del frontend React (login, credencial digital/QR, reserva de clases, terminal de acceso de recepción, alta de socios).
- Verificación de interacción real con las bases de datos (PostgreSQL y MongoDB) en los escenarios donde el código así lo prevé (auditoría, historial QR, expiración de membresías).
- Pruebas de seguridad básicas ya cubiertas por el código (anti-replay de QR, HMAC del webhook de pagos, gating por rol/autenticación, hardening de hosts/CSRF para túneles ngrok).
- Pruebas de rendimiento/no funcionales apoyadas en el reporte RNF01/RNF06 existente y en Locust.

**No incluye:** ver sección 10.

## 7. Elementos a Probar

| Módulo | Descripción funcional | Tipo de cobertura actual |
|---|---|---|
| `access` | Generación/validación de QR dinámico, control de ingreso, aforo en tiempo real (WebSocket), reporte de disponibilidad | Automatizada (pytest) |
| `classes` | Alta/edición/baja de clases, búsqueda y filtrado, inscripción con cupo y lista de espera, cancelación, control de asistencia | Automatizada (pytest) |
| `common` | Logging estructurado (JSON), auditoría transversal en MongoDB, señal de email de bienvenida, helper de emails con plantillas | Automatizada (pytest) |
| `members` | Alta de socios, carga de certificado médico, edición/baja de socios, protección de campos inmutables | Automatizada (pytest) |
| `memberships` | Planes de membresía (CRUD admin), renovación, expiración automática (Celery Beat), endpoint "mi membresía" | Automatizada (pytest) |
| `payments` | Preferencias de pago MercadoPago, webhook de confirmación, cobro manual por recepción, diferencias de precio | Automatizada (pytest) |
| `reports` | Exportación de reportes (morosidad, facturación, asistencia) en CSV/XLSX/PDF | Automatizada (pytest) |
| `users` | Autenticación (login local + Google OAuth), perfil, infraestructura de API (paginación, docs, health check), hardening (ngrok/CSRF) | Automatizada (pytest) |
| Frontend (manual) | Pantallas React: login, credencial digital, agenda/reserva de clases, terminal de acceso de recepción, gestión de socios | Manual (sin automatización aún) |

## 8. Nuevas Funcionalidades a Probar

Descritas desde la perspectiva del usuario final, según el Product Backlog (9 historias de usuario):

- **US01 — Login:** como usuario del sistema, quiero iniciar sesión con mi cuenta local o con Google según mi rol, para acceder a las funciones que me corresponden.
- **US02 — Planes de Membresía:** como administrador, quiero crear, modificar y desactivar planes de membresía, para mantener actualizada la oferta comercial del gimnasio.
- **US03 — Alta de Socios:** como recepcionista, quiero registrar nuevos socios y subir su certificado médico, para habilitar su ingreso al gimnasio.
- **US04 — Credencial Digital:** como socio activo, quiero ver un código QR de acceso en mi celular, para ingresar al gimnasio sin credencial física (bloqueado si tengo un pago vencido).
- **US05 — Validación QR:** como recepcionista, quiero escanear la credencial del socio, para autorizar su ingreso y registrar la asistencia.
- **US06 — Gestión de Clases:** como administrador, quiero crear clases y configurar sus cupos, para ofrecer una agenda de actividades a los socios.
- **US07 — Reservas de Clases:** como socio, quiero reservar o cancelar mi lugar en una clase según el cupo disponible, para organizar mi rutina.
- **US08 — Aforo en tiempo real:** como personal del gimnasio, quiero monitorear la ocupación en vivo, para gestionar la capacidad del salón.
- **US09 — Reportes:** como administrador, quiero exportar analíticas en PDF/Excel, para tomar decisiones de negocio con datos reales.

## 9. Pruebas de Regresión

El backend cuenta con una suite de regresión automatizada de **229 tests** (pytest + pytest-django + pytest-asyncio), distribuidos así (conteo real verificado con `pytest --collect-only` sobre cada app, dentro del contenedor Docker del backend):

| App | Tests recolectados |
|---|---|
| `access` | 29 |
| `classes` | 54 |
| `common` | 15 |
| `members` | 33 |
| `memberships` | 50 |
| `payments` | 18 |
| `reports` | 9 |
| `users` | 21 |
| **Total** | **229** |

Se ejecutó la suite completa (`docker compose exec backend pytest -q`) el 14/09/2026 y el resultado fue **229 passed** (0 failed), con solo advertencias no bloqueantes (deprecación de `asyncio_default_fixture_loop_scope` y un warning de teardown de base de datos de test por conexión concurrente).

**Importante (hallazgo honesto):** actualmente **no existe un pipeline de CI** (no hay directorio `.github/workflows/`). La suite se corre manualmente en el entorno local/Docker de cada desarrollador antes de mergear. Esto es un riesgo de proceso (ver sección 24), no un defecto de los tests en sí — los 229 tests son reales y pasan de forma reproducible.

Cada vez que se agregue o modifique una historia de usuario, la regresión mínima exigida es: correr la suite completa de pytest y, para el frontend, re-ejecutar manualmente los 5 casos de la sección "Frontend (manual)" del archivo `docs/qa/casos-de-prueba.csv`.

## 10. Funcionalidades que NO se van a Probar

- Automatización de tests de frontend (unitarios/E2E): no existen en el proyecto al día de hoy; quedan fuera de esta ronda de V&V como automatización, se cubren solo manualmente.
- Integración real contra las cuentas de producción de MercadoPago, Google OAuth, Mailtrap o Sentry (se usan sandboxes/mocks en los tests).
- Pruebas de aceptación de infraestructura de despliegue en sí misma (Render, Vercel, Supabase, MongoDB Atlas, Upstash) más allá de lo que ya cubre el health check (`/api/health/`).
- Pruebas de accesibilidad (a11y) formales y pruebas cross-browser exhaustivas.
- Pruebas de penetración/seguridad ofensivas formales (pentesting); solo se valida lo que el propio código de tests ya ejerce (anti-replay, HMAC, gating por rol).
- Panel de administración nativo de Django (`/admin`) más allá de su disponibilidad básica.
- [PENDIENTE: definir con el equipo] — otros límites de alcance que el equipo decida excluir explícitamente antes del cierre del sprint.

## 11. Estrategia/Enfoque de Pruebas

| Tipo de prueba | Enfoque | Herramientas |
|---|---|---|
| **Funcional** | Automatizada sobre los 8 módulos backend (casos de éxito, validaciones, reglas de negocio); manual sobre flujos de UI del frontend | pytest, pytest-django, Django REST test client, ejecución manual guiada por `casos-de-prueba.csv` |
| **Integración** | Verificación de interacción real entre Django, PostgreSQL, MongoDB (auditoría/historial QR), Redis (channel layer WS) y Celery (tareas async) | pytest con fixtures de DB real de test, Docker Compose |
| **Usabilidad** | Revisión manual de los flujos de socio/recepción/admin en el frontend (claridad, feedback visual, estados de error) | Ejecución manual, navegador |
| **Seguridad** | Anti-replay y firma HMAC de tokens QR, validación de firma HMAC-SHA256 del webhook de MercadoPago, gating por rol/autenticación (401/403), hardening de `ALLOWED_HOSTS`/CSRF para túneles ngrok | pytest (`test_qr_utils.py`, `test_webhook.py`, `test_infra_hardening.py`) |
| **Performance / No funcional** | Latencia del endpoint de validación QR (RNF01: p95 < 2000ms bajo 50 usuarios concurrentes) y disponibilidad simulada del módulo de accesos (RNF06: ≥ 99.9%) | Locust (`backend/loadtests/locustfile.py`), comando `availability_report`, reporte ya documentado en `docs/reports/rnf01-rnf06.md` |

## 12. Criterios de Aceptación/Rechazo

**Aceptación:**
- La suite completa de pytest (229 tests) debe ejecutarse en verde (0 failed) antes de considerar aprobado un módulo backend.
- Cada caso de prueba manual del frontend debe ejecutarse y documentar su Resultado Obtenido; se acepta el caso si el resultado obtenido coincide con el esperado.
- Los RNF01 y RNF06 deben cumplir los umbrales definidos en `docs/reports/rnf01-rnf06.md` (p95 < 2000ms y disponibilidad ≥ 99.9% respectivamente).

**Rechazo:**
- Cualquier test automatizado en rojo sobre una funcionalidad de la historia de usuario en evaluación.
- Un caso de prueba manual con Resultado Obtenido divergente del Esperado, sin una excepción documentada y aceptada por el equipo.
- Un defecto de severidad "bloqueante" (según se cargue en un bug report tipo Issue) sin resolver sobre un flujo crítico (login, QR, pagos, aforo).

## 13. Criterios de Suspensión

La ejecución de pruebas sobre un módulo se suspende si:
- Aparece un bug de severidad **Crítica/Bloqueante** que impide continuar ejecutando el resto de los casos planificados sobre ese módulo (ej.: un endpoint caído, un flujo de login roto).
- Más del **30% de los casos de prueba** de un mismo módulo resultan en Fallo en una misma ronda de ejecución — indica un problema sistémico que conviene resolver antes de seguir invirtiendo tiempo en testing puntual.

## 14. Criterios de Reanudación

La ejecución se reanuda cuando:
- El bug bloqueante que motivó la suspensión fue corregido (PR mergeado a `develop`) y re-verificado manualmente o vía la suite automatizada, según corresponda.
- La tasa de fallos del módulo vuelve a estar por debajo del 30% tras aplicar el/los fix(es) correspondientes.

## 15. Entregables

- Este documento: `docs/qa/plan-de-pruebas.md`.
- Matriz de casos de prueba: `docs/qa/casos-de-prueba.csv`.
- Reportes de bugs ya cargados como GitHub Issues **#78 a #85** (cerrados), usando la plantilla `.github/ISSUE_TEMPLATE/bug_report.md`.
- Reporte de requisitos no funcionales de performance/disponibilidad: `docs/reports/rnf01-rnf06.md`.
- Script y README de pruebas de carga: `backend/loadtests/locustfile.py`, `backend/loadtests/README.md`.
- Documento de arquitectura: `docs/architecture.md`.

## 16. Recursos

**Hardware:** notebooks personales de cada integrante del equipo (sin requisitos especiales de hardware; el stack corre containerizado vía Docker Desktop).

**Software:** Git ≥2.x, Docker ≥24.x, Docker Compose ≥2.x (plugin), Python 3.12 (imagen `python:3.12-slim`), Node 20 (imagen `node:20-alpine`), navegador moderno (Chrome/Edge/Firefox).

**Herramientas:** ver sección 18.

**Personal:** ver sección 19.

**Capacitación específica requerida para esta ronda de testing:** [PENDIENTE: definir con el equipo]

## 17. Requisitos de Entorno (Hardware y Software)

Según `docker-compose.yml` (raíz del repo) y la wiki del equipo (`Guia-de-Setup.md`, `Variables-de-Entorno.md`):

| Servicio | Imagen | Puerto local | Función |
|---|---|---|---|
| `db` (PostgreSQL) | `postgres:16-alpine` | 5432 | Fuente de verdad transaccional |
| `redis` | `redis:7-alpine` | 6379 | Broker Celery + channel layer WS + cache |
| `mongo` | `mongo:7` | 27017 | Auditoría + historial QR |
| `backend` | build local (`python:3.12-slim`) | 8000 | API REST + Channels (Django) |
| `celery-worker` | build local | — | Tareas async (emails, escrituras a Mongo) |
| `celery-beat` | build local | — | Scheduler (job diario de vencimientos, 09:00 ARG) |
| `frontend` | build local (`node:20-alpine`) | 5173 | SPA React/Vite |

**Puntos de acceso:**

| Componente | URL |
|---|---|
| Frontend (React) | http://localhost:5173 |
| API backend | http://localhost:8000/api/ |
| Panel admin Django | http://localhost:8000/admin |
| Health check | http://localhost:8000/api/health/ (verifica Postgres + Redis + Mongo) |

**Variables de entorno requeridas** (categorías confirmadas vía wiki del equipo — `Variables-de-Entorno.md` — dado que `backend/.env.example` y `frontend/.env.example` no fueron accesibles directamente desde este entorno de sandbox, ver nota al pie):

- Django core: `SECRET_KEY`, `ALLOWED_HOSTS`, `DJANGO_SETTINGS_MODULE`.
- PostgreSQL: `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`.
- Redis: `REDIS_HOST`, `REDIS_PORT`.
- MongoDB: `MONGO_URI`, `MONGO_DB_NAME`, `MONGO_USER`, `MONGO_PASSWORD`.
- CORS: `CORS_ALLOWED_ORIGINS`.
- Email (SMTP/Anymail vía Mailtrap): `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`.
- QR dinámico: `QR_SECRET_KEY`, `QR_TOKEN_EXPIRATION_SECONDS`.
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (según la wiki, no estarían documentadas todavía en `.env.example`).
- Frontend (Vite): `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`.

> Nota: el archivo `docker-compose.yml` confirma de forma directa el uso de `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `MONGO_USER`, `MONGO_PASSWORD`, `MONGO_DB_NAME` y `VITE_API_URL`. El resto de las variables de esta lista proviene de la wiki pública del equipo (`Variables-de-Entorno.md`), que sí pudo consultarse en este ciclo (ver sección "Referencias"). Se recomienda validar esta lista contra el `backend/.env.example` real antes de distribuir el plan, ya que el entorno de trabajo usado para redactar este documento tenía bloqueado el acceso de lectura a archivos `.env*` por política de sandbox.

## 18. Herramientas de Testing Requeridas

- **pytest** + **pytest-django** + **pytest-asyncio** (asyncio_mode=auto, `backend/pytest.ini`) — motor de tests automatizados backend.
- **Django REST Framework test client** (`APIClient`) — pruebas de endpoints HTTP.
- **Locust 2.31.5** (`backend/loadtests/locustfile.py`) — pruebas de carga para RNF01/RNF06.
- **Comando de gestión `availability_report`** — cálculo empírico de disponibilidad del módulo de accesos.
- **Docker / Docker Compose** — entorno reproducible de ejecución (db, redis, mongo, backend, frontend).
- **GitHub Issues** con plantilla `.github/ISSUE_TEMPLATE/bug_report.md` — registro y seguimiento de bugs.
- **Navegador (Chrome/Edge/Firefox)** — ejecución manual de casos de frontend.
- Herramienta de cobertura de código (ej. `coverage.py`/`pytest-cov`): no se encontró configurada en `backend/requirements/*.txt` ni en `pytest.ini` al momento de este relevamiento — [PENDIENTE: definir con el equipo] si se va a incorporar.
- Cliente REST manual (Postman/Insomnia) para exploración ad-hoc: [PENDIENTE: definir con el equipo].

## 19. Personal y Roles

Fuente: wiki del equipo, página Home, tabla "Equipo".

| Integrante | Usuario | Roles en el proyecto |
|---|---|---|
| Rodrigo Valdez | @MrForii | Dev Backend, Dev Frontend, UX/UI |
| Magali Bechis | @MagaBechis | Scrum Master, Dev Frontend, QA Tester |
| Gianna Giavarini | @giannagiava | Dev Backend, Dev Frontend, Datos |
| Franco Arce | @Franco-Arce | Dev Backend, Datos |
| Gisele Lavisse | @gigilvsarg | Dev Frontend, QA Tester |
| Jimena Gallegillo | @Jimenna | Dev Frontend, QA Tester |

## 20. Planificación y Organización

La actividad de V&V se ejecuta en paralelo al cierre del Sprint 3 (que finaliza el 20/09/2026), con entrega específica de esta actividad el 17/09/2026. El trabajo se organiza en tres frentes:

1. **Regresión automatizada backend:** ejecución de la suite pytest completa (229 tests) sobre los 8 módulos.
2. **Testing manual frontend:** ejecución guiada de los 5 casos definidos en `casos-de-prueba.csv` para las pantallas de login, credencial digital, reservas de clases, terminal de acceso y gestión de socios.
3. **Consolidación de hallazgos:** cualquier defecto nuevo se carga como GitHub Issue con la plantilla oficial, siguiendo el mismo formato que los issues #78-#85 ya cerrados.

## 21. Procedimientos de Prueba

1. Levantar el entorno con `docker compose up` (o confirmar que los contenedores ya estén corriendo con `docker compose ps`).
2. Para regresión backend: correr `docker compose exec backend pytest -q` y confirmar `229 passed`. Si hay fallos, registrar el módulo afectado y abrir un Issue con la plantilla de bug report.
3. Para testing manual frontend: acceder a http://localhost:5173, iniciar sesión con el rol correspondiente a cada caso (los accesos rápidos de demo en `LoginPage.jsx` solo están disponibles en modo desarrollo — `import.meta.env.DEV`), ejecutar los pasos del caso, y completar `Resultado Obtenido` y `Estado` en `casos-de-prueba.csv`.
4. Ante un resultado divergente, documentar evidencia (captura/video) y cargar un Issue con la plantilla `.github/ISSUE_TEMPLATE/bug_report.md`.
5. Actualizar este plan y la matriz de casos con los resultados finales antes de la fecha de entrega (17/09/2026).

## 22. Matriz de Responsabilidades (RACI)

| Actividad | Magali Bechis (QA/SM) | Gisele Lavisse (QA) | Jimena Gallegillo (QA) | Rodrigo Valdez (Ref. técnico) | Gianna Giavarini / Franco Arce (Dev) |
|---|---|---|---|---|---|
| Ejecutar regresión automatizada backend | R | R | R | C | I |
| Ejecutar casos manuales frontend | R | R | R | C | I |
| Redactar/actualizar Plan de Pruebas | A | R | R | C | I |
| Cargar bug reports (Issues) | R | R | R | I | I |
| Corregir defectos encontrados | I | I | I | C/A | R |
| Aprobar cierre de la ronda de V&V | A | I | I | C | I |

Referencia: **R**=Responsable/Ejecutor, **A**=Aprobador, **C**=Consultado, **I**=Informado.

## 23. Cronograma

| Fecha | Actividad |
|---|---|
| 14/09/2026 | Elaboración del Plan de Pruebas y la matriz de casos de prueba (este documento). |
| 15–16/09/2026 | Ejecución de la suite de regresión automatizada y de los casos manuales de frontend; carga de hallazgos como Issues. |
| 17/09/2026 | Entrega de la actividad de V&V del Sprint 3. |
| 20/09/2026 | Cierre general del Sprint 3 del proyecto. |

## 24. Supuestos, Dependencias y Riesgos

**Riesgos identificados por el equipo** (fuente: documento de avance del proyecto):

- Fallas de sincronización de WebSocket (impacta el módulo de aforo en tiempo real, US08).
- Interrupciones del gateway de pagos MercadoPago (impacta US02/pagos; parcialmente mitigado por los tests de `test_webhook.py` y `test_crear_preferencia.py` que verifican manejo de fallas del gateway con 502).
- Compatibilidad de QR en dispositivos mobile (impacta US04/US05).

**Riesgos técnicos adicionales detectados durante este relevamiento:**

- **Ausencia de pipeline de CI:** no existe `.github/workflows/`; la regresión de 229 tests se corre manualmente, lo que depende de la disciplina del equipo antes de cada merge.
- **Frontend sin tests automatizados y con datos mockeados:** `ClasesPage.jsx` y `CredencialDigitalPage.jsx` usan `socioMockData` (`generateMockQRToken`, `getStoredClasses`) en lugar de las APIs reales (marcado explícitamente con comentarios `TODO: reemplazar por API real` en el código), y `GestionSocios.jsx` tiene un `onSubmit` que solo hace `console.log('Form submitted:', data)` sin llamar al backend. Esto implica que varios de los casos de prueba manuales de esta ronda validan la UI/UX del flujo, pero **no** validan aún la integración real end-to-end con el backend.
- **Bugs ya identificados y corregidos** (evidencia de riesgos reales del proyecto, Issues #78-#85 cerrados): entre ellos, `ProtectedRoute` no verificaba el token (acceso a rutas protegidas sin sesión, #78), `has_active_membership` devolvía `False` incondicional bloqueando todo QR (#80), y URL de API hardcodeada a `localhost:8000` (#85) — confirman que las categorías de riesgo de autenticación/autorización y de configuración de entorno ya se materializaron una vez en este proyecto.

**Dependencias:**

- Disponibilidad de servicios externos sandbox (MercadoPago, Google OAuth, Mailtrap) para las pruebas de integración.
- Entorno Docker Compose funcional con los 3 servicios de datos (Postgres, Redis, Mongo) saludables antes de correr la suite.

**Supuestos:**

- El equipo asume que la suite pytest local (229 tests, verificada en este ciclo) es representativa del estado real del código en la rama de trabajo.
- [PENDIENTE: definir con el equipo] — cualquier otro supuesto de negocio no verificado en este relevamiento.

## 25. Referencias

- `docs/architecture.md` — Arquitectura del sistema.
- `docs/reports/rnf01-rnf06.md` — Reporte de captura y evaluación de RNF01 (latencia QR) y RNF06 (disponibilidad).
- `backend/loadtests/locustfile.py` y `backend/loadtests/README.md` — Herramienta y escenarios de carga (Locust).
- `.github/ISSUE_TEMPLATE/bug_report.md` — Plantilla de reporte de bugs usada en los Issues #78 a #85 (cerrados).
- `docker-compose.yml` (raíz del repo) — Definición de servicios de infraestructura local.
- Wiki del equipo: `Guia-de-Setup.md` y `Variables-de-Entorno.md` (github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/wiki) — consultadas exitosamente durante la elaboración de este plan.
- Product Backlog del proyecto (9 historias de usuario, US01-US09).
- Suite de tests: `backend/apps/{access,classes,common,members,memberships,payments,reports,users}/tests/`.

## 26. Glosario

| Término | Significado |
|---|---|
| **Socio** | Miembro/cliente del gimnasio que se autentica y accede con credencial digital. |
| **Aforo** | Cantidad de personas presentes en el gimnasio en un momento dado, monitoreada en tiempo real. |
| **Cupo** | Capacidad máxima de inscriptos permitida en una clase. |
| **RNF** | Requisito No Funcional (ej. RNF01 = latencia, RNF06 = disponibilidad). |
| **QR dinámico** | Código QR de la credencial digital, firmado con HMAC y con TTL corto (30s), de un solo uso. |
| **HMAC** | Hash-based Message Authentication Code — mecanismo de firma usada para validar tokens QR y el webhook de MercadoPago. |
| **JWT** | JSON Web Token — formato del token de sesión (access 30 min + refresh 1 día). |
| **Webhook** | Notificación HTTP asíncrona enviada por MercadoPago al backend para confirmar el estado de un pago. |
| **Celery / Celery Beat** | Sistema de tareas asíncronas y su scheduler (usado para emails, escritura a Mongo y el job diario de vencimientos). |
| **CI** | Integración Continua — pipeline automatizado de build/test (no implementado aún en este proyecto). |
| **RACI** | Responsable, Aprobador, Consultado, Informado — matriz de responsabilidades. |
| **Locust** | Herramienta de pruebas de carga usada para validar RNF01/RNF06. |
| **Aprobado / Rechazado** | Estado de un caso de prueba tras su ejecución, según coincida o no el resultado obtenido con el esperado. |
