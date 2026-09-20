# Changelog

Todos los cambios significativos de Winnie The Gym se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versionado según [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### En progreso
- **project-wide-cleanup** (branch `chore/project-wide-cleanup`, 4 commits atómicos): security hardening + CI + backend refactor + frontend React Query migration + DevOps hygiene. PR por abrirse cuando el equipo lo indique.

---

## [1.0.0] — 2026-09-15
**PR #75** · Google OAuth auth-code flow · @MrForii
**PR #76** · fix backend `callback_url` · @MrForii
**PR #77** · refactor UI: sidebar unificado, scheduling cleanup, Vitest setup · @MagaBechis

### Agregado
- **`AuthCallback` page** (`/auth/callback`): intercambia el code de Google con el backend y redirige al usuario a `/dashboard` o `/completar-perfil`; maneja cancelación con toast y retorno a `/login`
- **Vitest setup**: `frontend/setupTests.js`, `vite.config.js` con entorno de tests; tests unitarios iniciales para `Button`, `EmptyState` y `ClassSchedulePage` (`frontend/src/components/ui/__tests__/` y `frontend/src/pages/__tests__/`)

### Cambiado
- **Google OAuth**: flujo cambiado de implicit popup (`useGoogleLogin` default) a `auth-code` con redirección en la misma pestaña (`flow: 'auth-code'`, `ux_mode: 'redirect'`); elimina el error de popup bloqueado por Chrome en producción con cookies de terceros restringidas
- **`GoogleLoginView.callback_url`** pinado a `${FRONTEND_URL}/auth/callback` en el backend (`apps/users/views.py`) para que ambas fases del flujo OAuth (autorización + intercambio de token) usen el mismo `redirect_uri` — corrige el error 400 `redirect_uri_mismatch` de `dj-rest-auth` / allauth
- **Sidebar unificado**: `Sidebar.jsx` y `navIcons.js` consolidados; `MemberLayout` y `AppBottomNav` actualizados para reutilizar la misma fuente de verdad de navegación
- **`ClassSchedulePage`**: limpieza de lógica de filtrado y desborde de scroll; `ClassCalendarView` y `ClassCard` refactorizados
- **`ClasesPage` (socio)**: scroll overflow corregido; mock data alineado con el shape real de la API (`socioMockData.js`)
- **Serializers y filtros de clases** (`backend/apps/classes/`): ajustes menores para alinearse con los cambios del frontend
- `authStore.js` y `useAuth.js` limpiados de lógica duplicada; `services/constants.js` centraliza las constantes de endpoints

### Notas de deploy
- Agregar en Google Cloud Console los Authorized Redirect URIs:
  - `http://localhost:5173/auth/callback` (dev)
  - `https://winnie-the-gym.vercel.app/auth/callback` (prod)
- `FRONTEND_URL` ya presente en el env group de Render y en `settings/base.py`

**PRs**: #75, #76, #77
**Merge commit**: `22261cd`

---

## [0.12.0] — 2026-09-11
**PR #64** · `feature/production-deploy-prep` → `develop` · @Franco-Arce
**Hotfixes #65–#74** · correcciones de deploy en producción (Render + Upstash + Atlas)

### Agregado
- **`backend/Dockerfile.prod`** multi-stage (builder + runner slim en `python:3.12-slim`): sin dev deps (locust, django-extensions, pytest), user no-root (`app:1000`), CMD `daphne -b 0.0.0.0 -p ${PORT} core.asgi:application` por default
- **`backend/entrypoint.sh`** compartido por los 3 servicios de Render: flags `RUN_MIGRATIONS`, `COLLECT_STATIC` y `CREATE_MONGO_INDEXES` controlan qué corre en cada servicio (sólo el web las activa)
- **`render.yaml` Blueprint**: 3 servicios (`winnie-backend`, `winnie-celery-worker`, `winnie-celery-beat`) + `envVarGroup winnie-shared` con todas las env vars requeridas (revertido a proceso único por limitación de free tier — ver Cambiado)
- **`frontend/vercel.json`**: SPA rewrite, cache headers para `/assets/*` y security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`)
- **`settings/production.py` hardened**: `SECURE_PROXY_SSL_HEADER`, `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS=1y` con preload y subdomains, cookies CSRF/session con `Secure`, `X_FRAME_OPTIONS='DENY'`, `CSRF_TRUSTED_ORIGINS` con regex para `*.vercel.app` y `*.onrender.com`, logging JSON forzado
- **WhiteNoise** (`whitenoise==6.7.0`) con `CompressedManifestStaticFilesStorage` para servir static files desde el mismo proceso Django; middleware insertado post-`SecurityMiddleware`
- **Supabase Storage adapter** (`apps/common/storages.py::SupabaseMediaStorage`) vía `django-storages[s3]` + `boto3` para persistir certificados médicos (RF08) en producción; dev sigue usando `FileSystemStorage` local
- **`docs/deploy.md`** (400+ líneas): setup paso a paso de Supabase, Atlas, Upstash, Render y Vercel; troubleshooting común; checklist post-deploy
- **`backend/.env.example`** y **`frontend/.env.example`** actualizados con todas las env vars nuevas del proyecto

### Cambiado
- **Redis TLS / Upstash** (hotfixes #65, #68, #69, #72, #73, #74): configuración de Cache, Channel Layer y Celery unificada bajo `REDIS_URL`; helper que agrega `ssl_cert_reqs=CERT_REQUIRED` como int en `OPTIONS` para `django.core.cache.RedisCache`; `CELERY_BROKER_USE_SSL` y `redis_backend_use_ssl` declarados como dicts explícitos (Celery descarta query params de URLs `rediss://`); forzado de `/0` en URLs de Upstash (proveedor single-DB que rechaza `DB > 0`)
- **Render Free tier** (hotfix #66): los 3 procesos (Daphne + Celery worker + Celery beat) consolidados en un único web service gestionado por **honcho** vía `Procfile`; `render.yaml` actualizado a servicio único (reversible con 2 líneas al pasar a plan Starter)
- **Atlas TLS / MongoDB** (hotfix #67): `honcho` y `certifi` agregados a `requirements/base.txt`; bundle CA de `certifi` requerido en `python:3.12-slim` para el handshake TLS con Atlas
- **Health check** (hotfixes #70, #71): probe de MongoDB clasificada como no-crítica (devuelve `200 degraded` en lugar de `503`) mientras se investigaba el TLS handshake en Render; `healthCheckPath` en `render.yaml` reemplazado por port-scan TCP para no bloquear el deploy
- README con nueva sección de deploy y link a `docs/deploy.md`

**PRs**: #64, #65, #66, #67, #68, #69, #70, #71, #72, #73, #74
**Merge commit**: `c02b375`

---

## [0.11.0] — 2026-09-11
**PR #54** · `feature/data-devops-hardening` → `develop` · @Franco-Arce

### Agregado
- **MER PostgreSQL**: `docs/database/schema.dbml` (formato dbdiagram.io) + `docs/database/mer.md` con diagrama Mermaid embebido; documenta las 8 tablas, 7 relaciones críticas, 6 índices y convenciones aplicadas
- **Esquemas MongoDB**: `docs/database/mongo-schemas.md` con las colecciones `qr_history` y `audit_logs`: campos, índices, TTL 90 días y justificación de uso NoSQL vs Postgres
- **Arquitectura del sistema**: `docs/architecture.md` con diagrama de componentes Mermaid, flujos críticos (login, QR, pagos MP, job vencimientos) y target de deploy productivo
- **Trail de auditoría en MongoDB** (`apps.common.audit`): signal receivers `post_save`/`post_delete` sobre `Socio`, `PlanMembresia`, `Membresia`, `Clase` y `Pago` que persisten eventos con snapshot post-cambio; encoder JSON que soporta `Decimal`, `date`, `datetime` y `UUID` para persistencia lossless
- **`CurrentUserMiddleware`**: expone el usuario autenticado a signals via thread-local; fallback `actor_rol='system'` para CLI, Celery y tests
- **Management command `create_mongo_indexes`**: idempotente; provisiona 4 índices de performance + TTL 90d por colección en `qr_history` y `audit_logs`. `MONGO_RETENTION_DAYS` configurable por env
- **WebSocket real de aforo (HU08 / RF07)**: `apps.access.consumers.AforoConsumer` reemplaza el mock del frontend; envía `aforo.snapshot` al conectar y `aforo.update` en cada cambio. Auth JWT por query string `?token=<jwt>` (`core.ws_auth.JWTAuthMiddleware`); acceso denegado con close code `4403` para socios y anónimos
- **Broadcast automático de aforo**: signal `post_save` sobre `AccessLog` (`apps/access/ws_signals.py`) publica al channel layer `aforo_updates`. Ignora eventos `DENIED`
- **Servicio `get_aforo_actual()`** con cache Redis 5s (key `aforo:current`); `invalidate_aforo_cache()` en cada evento
- `core/asgi.py` reemplaza `URLRouter([])` vacío por routing real de `apps.access.routing` (cerrando el mock de HU08)
- **Logs estructurados JSON** via `python-json-logger==2.0.7`; toggle a formato plano con `LOG_FORMAT=plain` para debug local
- **Load tests con Locust** (`backend/loadtests/locustfile.py`): 3 escenarios (`SocioUser`, `RecepcionistaUser`, `AdminUser`) cubriendo login + generación QR + scan + reportes; instrucciones headless en README (RNF01)
- **Sentry frontend** (`@sentry/react==8.30.0`): `frontend/src/lib/sentry.js`, opt-in vía `VITE_SENTRY_DSN`; zero cost sin DSN; sampling 10% en prod, 0% en dev
- **Management command `availability_report`**: `python manage.py availability_report --days N [--json]` calcula disponibilidad (RNF06) desde `AccessLog` excluyendo denials legítimos de negocio
- `docs/reports/rnf01-rnf06.md` con fórmula, instrucciones de captura y criterios de aprobación

### Cambiado
- `MONGO_DB_NAME` en test settings aislada a `winnie_gym_logs_test` para no contaminar la base de desarrollo
- Dependencias nuevas: `daphne==4.1.2` (ASGI server para tests asyncio), `pytest-asyncio==0.24.0` (dev); `pytest.ini` con `asyncio_mode = auto`
- README con nueva sección «📚 Documentación técnica» linkeando los 4 documentos técnicos

**PRs**: #54
**Merge commit**: `40027aa`

Suite: **229 tests** (+21 vs v0.10.0, 0 fallas).

---

## [0.10.0] — 2026-09-11
**PR #48** · `feature/backend-mp-emails-reports` → `develop` · @Franco-Arce

### Agregado
- **Infraestructura API**: documentación OpenAPI vía `drf-spectacular` con Swagger UI (`/api/docs/`), ReDoc (`/api/redoc/`) y schema descargable (`/api/schema/`); todos los ViewSets anotados con `@extend_schema`
- **Paginación global**: `PageNumberPagination` (page_size=10, máx 100 vía `?page_size=`) en todos los listados
- **Filtros avanzados**: `django-filter` con `FilterSet` custom en las 5 apps (`apps/{app}/filters.py`); socios, planes, membresías, clases, inscripciones y access logs
- **Búsqueda avanzada de clases (HU06)**: combina `?search=` + `categoria` + `dia` + `hora_desde`/`hora_hasta` + `cupo_disponible`
- **Cancelación de reservas (HU07)**: `POST /api/classes/clases/{id}/cancelar/` con enforcement de `cancelacion_horas` y promoción automática desde lista de espera
- **Certificado médico (RF08)**: `POST /api/members/socios/{id}/certificado-medico/` con validación de tipo (PDF/JPG/PNG) y tamaño máx 5 MB
- **App `payments`** con modelo `Pago` (5 estados, FK a `Socio`, `PlanMembresia` y `Membresia`, campos MP completos)
- **MercadoPago Checkout Pro**: `POST /api/payments/preferencias/` (socio) crea `Pago(pendiente)` + preferencia MP; `POST /api/payments/webhook/` valida firma HMAC-SHA256, es idempotente por `mp_payment_id` y activa la membresía en `approved`; `POST /api/payments/cobros-manuales/` (recep/admin) contingencia PDF riesgo #3
- **Emails transaccionales async** vía Anymail + Mailtrap HTTP API; `apps/common/emails.py::send_templated_email` con retry 3× backoff 60s; templates: bienvenida (signal `post_save` de Socio), confirmación de pago y alerta de vencimiento
- **Celery + Redis**: worker y beat en `docker-compose.yml`; `DatabaseScheduler` editable desde el admin
- **Job diario de vencimientos** (`memberships.check_expiring_memberships`): corre 09:00 ARG; alertas a 7/3/1/0 días del vencimiento + flip a `estado='vencida'`; deduplicado por `Membresia.avisos_enviados`
- **Reportes exportables (RF09 / HU09)**: app `reports` con exportadores agnósticos CSV (`stdlib`), XLSX (`openpyxl`) y PDF (`reportlab`, landscape A4); endpoints `GET /api/reportes/morosidad/`, `GET /api/reportes/facturacion/` y `GET /api/reportes/asistencia/` con parámetro `?formato=` (no `?format=` para evitar conflicto con content-negotiation de DRF)
- **Health check completo**: `/api/health/` con probes reales a Postgres, Redis y Mongo (200 sano / 503 degradado)
- **Password reset**: endpoints provistos por `dj-rest-auth` con `SafePasswordResetView` (siempre 200 para no revelar existencia de cuenta)
- **Recupero de contraseña**: `POST /api/auth/password/reset/` y `POST /api/auth/password/reset/confirm/`

### Cambiado
- `SIMPLE_JWT.ACCESS_TOKEN_LIFETIME` reducido a 30 minutos con rotación de refresh tokens (RNF05)
- `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGIN_REGEXES` y `CSRF_TRUSTED_ORIGINS` ampliados con wildcards para `.ngrok-free.dev/.app/.ngrok.io` (habilita el webhook MP en desarrollo)
- Escritura async de accesos en Mongo migrada de `Thread(daemon=True)` a Celery task `access.log_qr_event` (retries + graceful shutdown)
- Cobro manual registra y persiste diferencia respecto a `plan.precio` cuando el monto no coincide (auditable, no bloqueante)
- BOM UTF-8 al inicio de todos los CSV exportados para renderizado correcto de tildes y ñ en Excel/Numbers
- `mercadopago_client.py` como cliente aislado para facilitar mock en tests y futura migración de SDK
- Sentry integrado opt-in vía env var `SENTRY_DSN` con integraciones Django, Celery y logging

### Corregido
- `MP_NGROK_URL` omite `auto_return` cuando `back_urls.success` es localhost (MP rechaza URLs no públicas en sandbox)

**Requisitos ABP cubiertos**: 40+ endpoints documentados, paginación, filtros en 5 apps, consumo de API externa con valor real (MercadoPago Sandbox), 3 escenarios de email transaccional, carga de archivos (RF08), exportación CSV/PDF/XLSX (HU09). Suite: **208 tests** (0 fallas).

**PRs**: #48
**Merge commit**: `d4f4b8e`

---

## [0.9.0] — 2026-08-28
**PR #43** · `feature/code-quality-audit` → `develop` · @Franco-Arce · @MagaBechis · @MrForii

### Cambiado
- **Backend — permisos y namespacing**: permisos declarados por ViewSet, URLs con namespacing de app, eliminación de código muerto y dead imports (Slice 1)
- **Backend — convenciones de modelos**: campos migrados a `TextChoices`, migraciones de datos seguras y sólo aditivas (Slice 2)
- **Backend — capa de servicio**: lógica de negocio extraída de las vistas a módulos `services.py` en `members`, `memberships`, `classes` y `access` (Slice 3)
- **Backend — ViewSets**: `members` y `memberships` migrados desde APIView a ViewSet con router; rutas resultantes compatibles con los existentes (Slice 4)
- **Backend — tests**: estructura `tests/` por app consolidada con `conftest.py` y helpers reutilizables; cobertura mantenida (Slice 5)
- **Frontend — naming**: componentes renombrados de `Screen` → `Page` para coincidir con la convención de rutas del proyecto
- **Frontend — TopBar**: patrón unificado con prop `backAction` en `ClassesPage`, `AdminPlanesPage` y vistas de dashboard
- **Frontend — estado**: hooks `useAuth` y `useProfile` extraídos; estado desacoplado de los componentes de presentación
- **Frontend — formularios**: `GestionSocios` migrado a React Hook Form + Zod
- **Frontend — mock isolation**: datos mock aislados detrás de `import.meta.env.DEV`; `api.js` corregido para no filtrar mocks en producción
- **Frontend — miscelánea**: `themeStore` con `export default`, imports de React innecesarios eliminados (JSX Transform), key warnings en listas corregidos, colores de estado migrados a tokens semánticos, `PublicRoute` y nuevo `CompleteProfileRoute` corregidos

### Docs
- README actualizado con decisiones de arquitectura del audit y guidelines de backend/frontend
- `CHANGELOG.md` sincronizado con entradas `v0.7.0` y `v0.8.0`

**PRs**: #43
**Merge commit**: `1838c10`

---

## [0.8.0] — 2026-08-28
**PR #40** · `feature/membresias` → `develop` · @gigilvsarg

### Agregado
- **Módulo de Membresías y Planes** (`/membresias`, `/admin/planes`): tarjetas de plan, gráfico de distribución de socios, tabla comparativa de características, modal CRUD (crear/editar/archivar/duplicar). UI completa contra `adminMockData.js` — integración con API real pendiente (#41)
- **Módulo de Clases y Actividades** (`/clases`, `/admin/clases`, `/clases/crear`, `/clases/asistencia`): calendario semanal navegable, vista de lista y detalle con filtros, modal de asistentes con búsqueda, formulario de alta/edición con live preview, terminal de asistencia con exportación CSV
- Backend `apps/classes`: modelos `Clase` e `InscripcionClase`, acción `inscribir` con control de cupo, tests TDD — nota: modelo distinto al originalmente especificado en #32, sin acción de cancelar (seguimiento en #42)
- `apps/memberships`: habilitada eliminación/archivado de planes con permiso `IsAdminOnly`

### Notas
- Cubre parcialmente los issues #31 y #32 (ver comentarios en cada issue) — se abrieron #41 y #42 como seguimiento del alcance restante

---

## [0.7.0] — 2026-08-27
**PR #36** · `feature/asistencia` → `develop` · @MagaBechis

### Agregado
- `ClassesScreen` (`/clases`): hub de gestión de clases para administrador con navegación centralizada
- `AttendanceScreen` (`/clases/asistencia`): toma de asistencias con estado visual (presente / ausente / sin marcar) e insignias por plan de membresía (Básico / Gold / Premium), adaptable a Light/Dark mode
- `AttendanceTable`: componente de tabla de asistentes reutilizable
- `CreateClassScreen` (`/clases/crear`) + `CreateClassForm`: formulario de alta de clase (mockup inicial)
- Sidebar actualizado: sección «Gestión Clases» visible para el rol administrador
- `apps.classes` registrado en `INSTALLED_APPS` (stub — backend pendiente en #32)

### Corregido
- Tests de `has_active_membership` restaurados tras la consolidación de `tests.py`
- Usuario de testing corregido: `rol='recepcionista'` en lugar de `is_staff=True`
- `backend_logs.txt` eliminado del repo; `*.log` agregado a `.gitignore`

---

## [0.6.0] — 2026-08-25
**PR #26** · `feature/socios-membresias` → `develop` · @MrForii

### Corregido
- Fix crítico: `has_active_membership()` dejó de devolver `False` hardcodeado y ahora consulta la base de datos real
- `MeRenewView`: envuelto en `transaction.atomic()` para evitar estado parcial si el `create` falla tras el `update` (fix post-review @Franco-Arce)
- `IsReceptionistOrAdmin`: corregida para verificar los nombres de rol reales del proyecto (`administrador`, `recepcionista`)

### Agregado
- Modelo `Socio` extendido: `numero_socio` (secuencia automática S-00001), `estado` (activo/suspendido/baja), `fecha_baja`, `updated_at`, `observaciones`
- App `memberships`: modelos `PlanMembresia` y `Membresia` con lógica de expiración lazy
- 15 endpoints REST con permisos por rol (ver [API Reference](API-Reference))
- Renovación self-service: `POST /api/memberships/me/renew/`
- Clases de permiso nuevas: `IsSocio`, `IsAdminOnly` (en `apps/access/permissions.py`)
- 78 tests pytest — TDD estricto, cobertura de todos los endpoints y modelos nuevos
- 4 migraciones seguras (solo additive) compatibles con datos de producción existentes

### Infraestructura
- `CHANGELOG.md` incorporado al repositorio
- Templates de GitHub: PR template, issue templates (bug, feature, task)
- `pytest` y `pytest-django` agregados a `requirements/development.txt`
- `.github/CODEOWNERS`: agregado `@Franco-Arce` como co-owner

---

## [0.5.0] — 2026-08-25
**Trabajo original:** PR #16 `feature/recepcion` · @Jimenna | PR #17 `feature/socio-credencial-qr` · @giannagiava
**Unificación y revisión:** PR #25 `feature/compat-recepcion-socio` → `develop` · @MagaBechis · @MrForii

### Agregado

**Módulo Recepcionista** (PR #16 — @Jimenna)
- Terminal de Acceso (`/recepcion/acceso`): escaneo QR y validación manual por DNI, estados visuales reactivos (verde/rojo/amarillo)
- Monitor de Aforo (`/recepcion/aforo`): dashboard de ocupación con simulación de WebSocket y métricas en tiempo real
- Gestión de Socios (`/recepcion/socios`): búsqueda, detalle y formulario de alta de socios
- Reportes (`/recepcion/reportes`): métricas de ingresos, membresías activas, morosidad y asistencia
- Fidelidad visual del 100% respecto a los mockups de Figma

**Módulo Socio** (PR #17 — @giannagiava)
- `CredencialDigitalPage` (`/socio/credencial`): QR dinámico firmado con SVG, auto-refresh cada 30 segundos, temporizador circular y vista fullscreen de alto contraste
- `ClasesPage` (`/socio/clases`): agenda de clases con búsqueda, filtrado por categoría, reserva y cancelación
- Layout mobile-first con tema oscuro alineado a design tokens

**Unificación y correcciones** (PR #25 — @MagaBechis · @MrForii)
- `MemberLayout`: sidebar desktop (`md:`) + bottom tab nav mobile centrado (frame `sm:max-w-sm`)
- `AppBottomNav`: bottom tab navigation por rol para administrador/recepcionista (mobile only, `md:hidden`)
- `ProtectedRoute` con prop `roles` para guardia de rutas por rol
- Breakpoints corregidos en todas las páginas y componentes: grids migrados a `lg:` donde el sidebar ocupa 240px en `md:`
- Mock de PII anonimizado en `socioMockData.js`
- Sidebar sin drawer: `hidden md:flex`, `NAV_ICON_MAP` compartido entre layouts

### Eliminado
- `utils.js` — sin uso
- `sidebarStore.js` — sin uso (reemplazado por la nueva arquitectura de layouts)

---

## [0.4.0] — 2026-08-21
**PR #10** · `feature/dashboard` → `develop` · @MagaBechis

### Agregado
- Dashboard con vistas diferenciadas por rol: Administrador, Recepcionista y Socio
- Sistema de layout: AppLayout, Sidebar con navegación, TopBar con indicador LIVE
- Librería de componentes UI: Button (4 variantes), Badge (5 variantes), Avatar, Skeleton, CircularProgress, WinnieLogo
- Widgets de dashboard: AforoCard, MovementList, AlertList, ClassCapacityList — todos con loading/skeleton states
- Selector de rol para desarrollo (oculto en producción via `import.meta.env.DEV`)
- ProtectedRoute con guards de `accessToken` y `is_profile_complete`
- PublicRoute que redirige usuarios autenticados lejos de `/login`
- Sistema de design tokens (`tokens.js` + aliases semánticos en Tailwind)
- Theme store (Zustand): toggle claro/oscuro, persistido en localStorage

### Corregido
- `VITE_API_URL` hardcodeado a `localhost` — reemplazado por `/api` relativa (compatible con Docker)
- Posición de `GoogleOAuthProvider` en el árbol de componentes
- Guard de `is_profile_complete` faltante en `ProtectedRoute`
- `.env.example`: agregadas variables `EMAIL_*`, `QR_SECRET_KEY`, `QR_TOKEN_EXPIRATION_SECONDS`

### Modificado
- `api.js`: `baseURL` usa `VITE_API_URL` o cae a `/api` relativa
- `docker-compose.yml`: `VITE_API_URL` corregido a `/api`

---

## [0.3.0] — 2026-08-13
**PR #2** · `feature/auth-google-oauth` → `develop` · @MrForii

### Agregado
- Modelo de usuario custom: `email` como `USERNAME_FIELD`, campo `rol` (administrador/recepcionista/socio), `google_id`, `foto`, `is_profile_complete`
- Login con Google OAuth via django-allauth + dj-rest-auth (`POST /api/auth/social/google/`)
- Autenticación JWT: access token 60 min, refresh token 7 días (SimpleJWT)
- `CompleteProfileView`: `POST /api/auth/complete-profile/` — crea registro Socio y marca perfil completo
- `ProfileView`: `GET/PATCH /api/auth/profile/`
- Auth store (Zustand): `user`, `accessToken`, `refreshToken` con persistencia en `localStorage`
- `LoginPage`: botón de Google Sign-In con `@react-oauth/google`
- `CompleteProfilePage`: formulario de onboarding con validación Zod
- `ProfilePage`: vista y edición del perfil de usuario
- `ComingSoonPage`: placeholder para secciones en construcción
- Librería Sonner para notificaciones toast al usuario
- Tests: `CompleteProfileView`, `ProfileView` (9 casos de prueba)

### Corregido
- `MultipleObjectsReturned` de allauth: resuelto usando una única fuente de configuración de Google (solo APP en settings, no SocialApp en DB)
- Error 404 en `ProfileView` cuando el usuario no tiene Socio vinculado

---

## [0.2.0] — 2026-08-10
**PR #1** · `feature/access-qr-engine` → `develop` · @Franco-Arce · @MrForii

### Agregado
- Motor de tokens QR dinámicos: implementación custom HMAC-SHA256 con expiración de 30 segundos
- Protección anti-replay atómica con Redis via SET NX (`cache.add`)
- Modelo `AccessLog` en PostgreSQL: timestamp, usuario, estado, `denial_reason`, `qr_jti`
- Logging de auditoría en MongoDB: escritura asíncrona en hilo daemon para no bloquear requests
- Endpoints: `GET /api/access/qr/generate/`, `POST /api/access/qr/scan/`, `GET /api/access/logs/`
- Clase de permiso `IsReceptionistOrAdmin`
- Servicio `has_active_membership()` (stub fail-closed — pendiente integración con Membresías)
- Notificaciones por email: bienvenida, notificación de acceso, alerta de vencimiento
- Tests: generación de QR, detección de tampering, prevención de replay attack, auth de endpoints (7 casos)
- `CODEOWNERS`: `@MrForii` como revisor obligatorio en todos los archivos

---

## [0.1.0] — 2026-08-08
**Commit inicial** · @MrForii

### Agregado
- Scaffold inicial del proyecto
- Orquestación Docker Compose: PostgreSQL, Redis, MongoDB, backend Django, frontend React
- Configuración base Django 5 + DRF (settings divididos: base/development/test)
- Base frontend React + Vite + TailwindCSS
- Endpoint de health check: `GET /api/health/`
- Estructura base de apps: `users`, `access`, `members`, `memberships`
