# Changelog

Todos los cambios significativos de Winnie The Gym se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versionado según [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Sin publicar] — v0.6.0-rc
**PR #26** · `feature/socios-membresias` → `develop` · @MrForii · _Pendiente de revisión_

### Corregido
- Fix crítico: `has_active_membership()` dejó de devolver `False` hardcodeado y ahora consulta la base de datos real

### Agregado
- Modelo `Socio` extendido: `numero_socio` (secuencia automática S-00001), `estado` (activo/suspendido/baja), `fecha_baja`, `updated_at`, `observaciones`
- App `memberships`: modelos `PlanMembresia` y `Membresia` con lógica de expiración lazy
- 15 endpoints REST con permisos por rol
- Renovación self-service: `POST /api/memberships/me/renew/`
- Clases de permiso nuevas: `IsSocio`, `IsAdminOnly` (en `apps/access/permissions.py`)
- Clase `IsReceptionistOrAdmin` corregida: ahora verifica los nombres de rol reales (`administrador`, `recepcionista`)
- 78 tests pytest — TDD estricto, cobertura de todos los endpoints y modelos nuevos
- 4 migraciones seguras (solo additive) compatibles con datos de producción existentes

---

## [0.5.0] — 2026-08-23
**PR #25** · `feature/compat-recepcion-socio` → `develop` · @MagaBechis · @MrForii

### Agregado
- **Módulo socio:** `CredencialDigitalPage` con QR dinámico (refresh automático) y estado de membresía; `ClasesPage` con agenda, reservas, búsqueda y filtrado
- **`MemberLayout`:** layout responsive con sidebar desktop (`md:`) y bottom tab nav mobile centrado (5 ítems, frame `sm:max-w-sm`)
- **`AppBottomNav`:** bottom tab navigation por rol para administrador/recepcionista (mobile only, `md:hidden`)
- **`ProtectedRoute`** con prop `roles` para guardia de rutas por rol
- Mock de PII anonimizado en `socioMockData.js`
- Integración unificada del módulo recepción y socio en una sola rama (reemplaza PRs #16 y #17)

### Modificado
- **Sidebar simplificado:** sin drawer, `hidden md:flex`, `NAV_ICON_MAP` compartido entre layouts
- **Breakpoints corregidos** en todas las páginas y componentes: grids migrados a `lg:` donde el sidebar ocupa 240px en `md:`

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
