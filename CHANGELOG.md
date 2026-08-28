# Changelog

Todos los cambios significativos de Winnie The Gym se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versionado según [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### En revisión — `feature/membresias` (PR #40, open)
- Módulos de gestión de membresías, planes y clases según Figma

### Pendiente de PR — `feature/code-quality-audit`
- Auditoría de calidad backend: permisos, namespacing, service layer, convenciones de modelos, consolidación de tests (5 slices)
- Auditoría de calidad frontend: guards de producción para mock data, `TopBar` con `backAction`, migración a TanStack Query, hook `useAuth()`, formularios RHF+Zod, tokens semánticos de color, limpieza de archivos duplicados/huérfanos, renombre `Screen` → `Page`

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
