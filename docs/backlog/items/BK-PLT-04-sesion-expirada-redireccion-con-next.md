---
id: BK-PLT-04
titulo: Sesión expirada: mensaje contextual en el login y retorno a la ruta original (`next`)
tipo: ui-estado
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-PLT-04 · Sesión expirada: mensaje contextual en el login y retorno a la ruta original (`next`)

## 1. Resumen
El cierre de sesión forzado funciona (refresh de JWT + logout + toast), pero: el login ignora el motivo (`state.reason: 'inactivity'` se envía y nadie lo lee), no se recuerda la URL a la que se quería ir (siempre se cae en `/dashboard`), y `ProtectedRoute` manda a `/login` sin `next`. En recepción, donde la sesión caduca a los 30 min de inactividad, el staff pierde su contexto cada vez.

## 2. Objetivo de usuario
Como **recepcionista** quiero **que al reloguearme tras una expiración vuelva a la pantalla donde estaba y me diga por qué se cerró la sesión** para **no perder el flujo de trabajo (por ejemplo la terminal de acceso o un cobro)**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Frontend cliente | `frontend/src/services/api.js:96-109` | 401 con `data.code === 'session_inactive'` → `clearAuth()`, `toast.error('Sesión expirada por inactividad. Por favor, iniciá sesión nuevamente.')`, `navigator('/login', { replace: true, state: { reason: 'inactivity' } })`. |
| Frontend cliente | `frontend/src/services/api.js:111-146` | 401 normal → un solo refresh en vuelo (`isRefreshing`, `refreshSubscribers`); si falla: `clearAuth()`, `toast.error('Tu sesión ha expirado. Por favor, iniciá sesión nuevamente.')`, `navigator('/login', { replace: true })` (sin `state`). |
| Frontend cliente | `frontend/src/services/api.js:15,102-103,138-139` | Bandera de módulo `isRedirecting` evita toasts duplicados; se resetea en la próxima request con token (`:44`). |
| Frontend store | `frontend/src/stores/authStore.js:16-50` | `refreshAuthToken` hace `fetch` a `${VITE_API_URL||'/api'}/auth/token/refresh/` con `{refresh}`; si falla limpia auth. Persistencia `zustand/persist` clave `auth-storage` (`:53`) en `localStorage` con `user`, `accessToken`, `refreshToken`. |
| Frontend login | `frontend/src/pages/LoginPage.jsx` | No importa `useLocation`: `state.reason` se descarta (verificado con `rg "reason\|location" LoginPage.jsx` → sin resultados). |
| Frontend login form | `frontend/src/components/auth/EmailPasswordForm.jsx:45-50` | Tras `setAuth(data)`: `toast.success('Sesión iniciada')` y `navigate(data.user?.is_profile_complete ? '/dashboard' : '/completar-perfil')`. Sin lectura de `next`. |
| Frontend guard | `frontend/src/components/routing/ProtectedRoute.jsx:9` | `<Navigate to="/login" replace />` sin `state`/query. |
| Frontend callback | `frontend/src/pages/AuthCallback.jsx:46-55` | Éxito → `/dashboard` o `/completar-perfil`; error → `/login` con toast. Sin `next`. El login con Google es redirect completo (`ux_mode: 'redirect'`, `LoginPage.jsx:13`), por lo que `state` de router se pierde: hace falta `sessionStorage`. |
| Backend middleware | `backend/apps/users/middleware.py:45-` (`StaffInactivityMiddleware`) | Staff inactivo > `STAFF_INACTIVITY_TIMEOUT_SECONDS` (30 min, `core/settings/base.py:228`) → 401 `{"detail": "Sesión expirada por inactividad.", "code": "session_inactive"}`. También intercepta `POST /api/auth/token/refresh/` de staff inactivo. |
| Backend JWT | `backend/core/settings/base.py:218-224` | `ACCESS_TOKEN_LIFETIME` 30 min, `REFRESH_TOKEN_LIFETIME` 1 día, rotación + blacklist. |
| Tests | `frontend/src/services/__tests__/api.test.js`, `frontend/src/stores/authStore.test.jsx`, `AuthCallback.test.jsx`, `routing/ProtectedRoute.test.jsx` | Cobertura existente del interceptor, store y guard. |

## 4. Alcance
**Incluye:** guardar la ruta de origen (`pathname + search`) al expirar o al ser rebotado por `ProtectedRoute`; leerla en el login (email/password) y en `AuthCallback` (vía `sessionStorage`) y navegar a ella tras autenticar si es una ruta interna y permitida por el rol; mostrar en `/login` un aviso contextual según `reason` (`inactivity` | `expired`); validar `next` contra open-redirect (solo paths relativos que empiecen con `/` y no `//`).
**No incluye:** cambiar tiempos de expiración (RNF05 ya definido), aviso previo de "tu sesión está por vencer" (idea; ver decisiones abiertas), cambios de backend.

## 5. Contrato de API
Sin endpoints nuevos. Se apoya en **[EXISTE]**: respuesta 401 `{"detail": "Sesión expirada por inactividad.", "code": "session_inactive"}` (`users/middleware.py`) y `POST /api/auth/token/refresh/` (body `{"refresh": "<jwt>"}` → `{"access": ..., "refresh": ...}` por `ROTATE_REFRESH_TOKENS`).

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Rutas:** `/login` sigue envuelta en `PublicRoute` (`App.jsx:66`). Convención: `next` por query string `/login?next=%2Frecepcion%2Facceso&reason=expired` (visible, sin datos sensibles), más `sessionStorage['auth-next']` para el flujo de Google (el redirect de OAuth pierde el query).
- **Utilidad nueva:** `frontend/src/utils/safeNext.js` — `getSafeNext(raw)` devuelve `raw` solo si `/^\/(?!\/)/.test(raw)` y no apunta a `/login`; si no, `null`.
- **Cambios:**
  - `ProtectedRoute.jsx:9`: `const location = useLocation()` → `<Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />`.
  - `api.js:106,142`: en lugar de `navigator('/login', ...)` construir la URL con `window.location.pathname + search` y `reason`.
  - `EmailPasswordForm.jsx:50` y `AuthCallback.jsx:46-49`: tras `setAuth`, `navigate(getSafeNext(next) ?? defaultHome)`. Si `next` es una ruta con `roles` no permitidos, el guard (o `ForbiddenPage` de BK-PLT-02) lo resuelve.
  - `LoginPage.jsx`: `useSearchParams()` → si `reason=inactivity` mostrar tarjeta/aviso "Cerramos tu sesión por inactividad (30 min). Iniciá sesión para continuar."; si `reason=expired` "Tu sesión venció. Volvé a iniciar sesión."
- **Estados de UI:** aviso inline (no solo toast, que desaparece), sin loading. Reutilizar `toast` de `sonner` para el mensaje ya existente.
- **Responsive:** el aviso va arriba del form dentro de la columna `max-w-sm` (`LoginPage.jsx` panel derecho); 375 px ocupa el ancho completo.

## 8. Archivos a crear / modificar
- Crear `frontend/src/utils/safeNext.js` + `__tests__/safeNext.test.js`.
- Modificar `frontend/src/components/routing/ProtectedRoute.jsx` (+ test).
- Modificar `frontend/src/services/api.js` (+ `services/__tests__/api.test.js`).
- Modificar `frontend/src/components/auth/EmailPasswordForm.jsx` y su test (No verificado su ubicación exacta; buscar con `fd EmailPasswordForm`).
- Modificar `frontend/src/pages/AuthCallback.jsx` (+ `AuthCallback.test.jsx`) y `frontend/src/pages/LoginPage.jsx`.

## 9. Plan de pruebas (TDD)
Vitest + RTL; mocks de `sonner` y de `useAuth` como en los tests citados.
- `safeNext`: acepta `/recepcion/acceso?x=1`; rechaza `https://evil.com`, `//evil.com`, `/login`, `javascript:alert(1)`, vacío.
- `ProtectedRoute`: sin token en `/recepcion/acceso` → ubicación final `/login?next=%2Frecepcion%2Facceso`.
- `api.test.js`: 401 `session_inactive` → `navigator` llamado con una URL que contiene `reason=inactivity` y `next`; refresh fallido → `reason=expired`.
- `LoginPage`/`EmailPasswordForm`: con `?next=/recepcion/aforo` y login OK → navega a `/recepcion/aforo`; con `next` malicioso → `/dashboard`.
- `AuthCallback`: lee `sessionStorage['auth-next']` y lo consume (lo borra).
- Manual: con admin local, esperar/forzar expiración (borrar `access` en `localStorage['auth-storage']` y poner un `refresh` inválido) estando en `/recepcion/acceso`; verificar aviso y retorno. Probar login con Google en entorno donde esté configurado.
Comandos: `cd frontend && npx vitest run && npm run lint`.

## 10. Criterios de aceptación
- **Dado** un staff en `/recepcion/acceso` **cuando** su sesión expira por inactividad **entonces** llega a `/login` con aviso de inactividad y, al autenticarse, vuelve a `/recepcion/acceso`.
- **Dado** un `next` externo o con `//` **cuando** se loguea **entonces** se ignora y va a la home por rol.
- **Dado** el login con Google **cuando** había `next` **entonces** se respeta tras `/auth/callback`.

## 11. Riesgos y decisiones abiertas
- ¿Aviso previo "tu sesión está por vencer, ¿seguís acá?" con renovación manual? **Recomendación:** dejarlo para una segunda etapa; el middleware cuenta actividad por request, un modal de "seguir conectado" debería llamar a un endpoint ligero.
- `sessionStorage` vs query para Google: usar `sessionStorage` y limpiar al consumir.
- El store persiste tokens en `localStorage` (`authStore.js:53-60`): riesgo XSS conocido, fuera de alcance.

## 12. Referencias
- RNF05 (inactividad staff): `backend/apps/users/middleware.py`, `core/settings/base.py:228`.
- Relacionados: BK-PLT-02 (403), BK-PLT-03 (offline).
- Figma (opcional): "vistas live", login / sesión expirada (No verificado).

## 13. Prompt listo para un agente de IA
```
Contexto: frontend React 18 + react-router-dom v7 + zustand (authStore persist 'auth-storage') + axios con interceptor en frontend/src/services/api.js (líneas 96-146 manejan session_inactive y refresh fallido y llaman navigator('/login', ...)). LoginPage.jsx no lee location.state.reason. ProtectedRoute.jsx:9 redirige a /login sin `next`.
Tarea (docs/backlog/items/BK-PLT-04-sesion-expirada-redireccion-con-next.md): TDD primero (safeNext, ProtectedRoute, api.test.js, login/AuthCallback). Implementá utils/safeNext.js (anti open-redirect), pasá `next` y `reason` por query a /login desde ProtectedRoute y api.js, guardá `next` en sessionStorage para el flujo Google (AuthCallback.jsx), leelo tras autenticar en EmailPasswordForm.jsx y AuthCallback.jsx, y mostrá un aviso inline en LoginPage.jsx según `reason` (copy es-AR con voseo). No cambies el backend.
Terminado: `cd frontend && npm run lint && npx vitest run --coverage` verdes (umbrales 68/68/65/68).
```
