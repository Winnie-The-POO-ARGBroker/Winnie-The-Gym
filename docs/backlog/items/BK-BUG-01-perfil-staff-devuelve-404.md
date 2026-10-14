---
id: BK-BUG-01
titulo: El perfil de administrador/recepcionista nunca carga (GET /api/auth/profile/ devuelve 404)
tipo: bug
roles: [administrador, recepcionista]
prioridad: P0
tamano: M
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-BUG-01 · El perfil de staff devuelve 404

## 1. Resumen
`ProfileView` resuelve el objeto con `get_object_or_404(Socio, usuario=request.user)`. Admin y recepcionista no tienen `Socio` (así lo asume el propio `ProtectedRoute`), por lo que `GET /api/auth/profile/` responde 404 siempre. La página `/perfil` (accesible desde "Ver perfil" del Sidebar) muestra skeleton ~1–2 s (reintento de React Query) y después un formulario vacío sin error. Además hay un test backend que **codifica el bug como comportamiento esperado**.

## 2. Objetivo de usuario
Como **administrador o recepcionista** quiero **ver y editar mi nombre/apellido y cambiar mi contraseña desde /perfil** para **gestionar mi cuenta sin pasar por el admin de Django**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend vista | `backend/apps/users/views.py:66-72` | `ProfileView(RetrieveUpdateAPIView)`, `permission_classes=[IsAuthenticated]`, `http_method_names=['get','patch']`, `get_object()` = `get_object_or_404(Socio, usuario=self.request.user)` |
| Backend serializer | `backend/apps/users/serializers.py:55-63` | `ProfileSerializer` es `ModelSerializer` de `Socio`: `fields=('email','foto','rol','dni','nombre','apellido','telefono')`; `email/foto/rol` vienen de `usuario.*`; `read_only_fields=('email','foto','rol','dni')` |
| Backend URL | `backend/apps/users/urls.py:14` + `backend/core/urls.py:146` | `path('profile/', ProfileView.as_view(), name='profile')` montado en `api/auth/` (namespace `users`) |
| Backend modelo | `backend/apps/users/models.py:23-44` | `User(AbstractUser)` con `email`, `rol` (`administrador`/`recepcionista`/`socio`), `foto`; `first_name`/`last_name` heredados de `AbstractUser`; `is_profile_complete = hasattr(self,'socio')` |
| Backend login | `backend/apps/users/serializers.py:22-37` | `CustomJWTSerializer.get_user` agrega `nombre`/`apellido` **solo** si `user.is_profile_complete` (staff queda sin nombre) |
| Backend test | `backend/apps/users/tests/test_views.py:151-157` | `test_user_without_socio_returns_404` usa `make_user_factory()` (rol por defecto `administrador`) y exige 404: hay que reemplazarlo |
| Frontend ruta | `frontend/src/App.jsx:75` | `/perfil` → `<ProtectedRoute><ProfilePage/></ProtectedRoute>` (sin `roles`) |
| Frontend página | `frontend/src/pages/ProfilePage.jsx:30-33,105-133` | `useProfile()`; `loading = isPending` → skeleton; no hay manejo de `isError` |
| Frontend página | `frontend/src/pages/ProfilePage.jsx:18-22,160,231-252,283-294` | schema zod exige `telefono` (min 8); bloque certificado solo si `rol==='socio'`; muestra DNI (`profile?.dni ?? '—'`) y Teléfono para todos |
| Frontend hook | `frontend/src/hooks/queries/useProfile.js:6-26` | `GET /auth/profile/` y `PATCH /auth/profile/`; `PROFILE_KEY=['profile']` |
| Frontend query client | `frontend/src/main.jsx:21-28` | `retry: 1`, `staleTime: 30_000` (por eso el skeleton dura ~1–2 s antes de fallar) |
| Frontend entradas | `frontend/src/components/layout/Sidebar.jsx:168-177` | "Ver perfil" → `navigate('/perfil')` (único acceso para staff en desktop) |

## 4. Alcance
**Incluye:** que `GET/PATCH /api/auth/profile/` funcione para staff; página `/perfil` apta para staff (nombre, apellido, email, rol, cambio de contraseña); mostrar nombre de staff en Sidebar/Dashboard tras login; estado de error visible en `ProfilePage`; corregir el test que fija el 404.
**No incluye:** foto de perfil/upload de avatar, DNI/teléfono para staff, rediseño visual de `/perfil`, flujo de activación de staff (ver BK-BUG-03).

## 5. Contrato de API
**[EXISTE] `GET /api/auth/profile/`** — `IsAuthenticated`. Hoy: socio → 200 con `{email, foto, rol, dni, nombre, apellido, telefono}`; staff → 404 `{"detail":"No Socio matches the given query."}`.

**[A MODIFICAR] mismo endpoint, rama staff (propuesta recomendada):**
- `get_serializer_class()`: si `request.user.rol in STAFF_ROLES` → `StaffProfileSerializer`; si no, `ProfileSerializer`.
- `get_object()`: si staff → `self.request.user`; si no → `get_object_or_404(Socio, usuario=...)`.
- `StaffProfileSerializer` (nuevo, `ModelSerializer` de `User`):
  - `nombre = CharField(source='first_name', max_length=150)`, `apellido = CharField(source='last_name', max_length=150)`
  - `fields = ('id','email','foto','rol','nombre','apellido')`; `read_only_fields = ('id','email','foto','rol')`
- Respuesta 200 ejemplo: `{"id":1,"email":"admin@winnie.local","foto":"","rol":"administrador","nombre":"Admin","apellido":"Gym"}` (no incluye `dni` ni `telefono`; el frontend debe tolerar su ausencia).
- `PATCH` body: `{"nombre":"...","apellido":"..."}`; errores 400 estándar DRF (`{"nombre":["This field may not be blank."]}`).
- Un usuario con `rol='socio'` sin `Socio` (perfil incompleto) sigue recibiendo 404 (decisión abierta 11.2).

**[A MODIFICAR] login:** `CustomJWTSerializer.get_user` (`serializers.py:25-37`) debe agregar `nombre`/`apellido` desde `first_name`/`last_name` para staff, de modo que `Sidebar.jsx:56-58` y `DashboardPage.jsx:16-18` (que leen `user.nombre`) muestren el nombre y no el email.

## 6. Modelo de datos
Sin cambios de modelo ni migración (se usan `User.first_name`/`last_name`, ya existentes en `AbstractUser`).

## 7. Diseño frontend
- **Ruta/guard:** sin cambios (`/perfil` ya está abierta a cualquier rol autenticado en `App.jsx:75`).
- **`ProfilePage.jsx`:**
  - Derivar `isStaff = rol !== 'socio'`. Para staff: ocultar bloque Certificado (ya oculto), ocultar fila DNI y campo Teléfono, y usar un schema zod sin `telefono` (`z.object({nombre, apellido})`). Hoy el schema único exige `telefono` y bloquearía el guardado de staff.
  - `reset({ nombre, apellido, telefono })` (líneas 47-51 y 56): armar el objeto según rol para no enviar `telefono: undefined`.
  - Manejar `isError` de `useProfile()`: mostrar `EmptyState` (`components/ui/EmptyState.jsx`) con "No pudimos cargar tu perfil" + botón "Reintentar" (`refetch`).
- **`useProfile.js`:** opcional `retry: (n, err) => err?.response?.status !== 404 && n < 1` para no esperar el reintento ante 404.
- **Estados:** loading = skeleton existente; error = EmptyState; éxito = `toast.success('Perfil actualizado correctamente.')` (ya existe, `sonner`).
- **Textos:** título "Mi Perfil", subtítulo "Información de tu cuenta" (existentes). Error: "No pudimos cargar tu perfil. Intentá de nuevo."
- **Responsive:** el layout actual es una columna `max-w-2xl`; sin cambios a 375/768 px.

## 8. Archivos a crear / modificar
- `backend/apps/users/serializers.py` — agregar `StaffProfileSerializer`; en `CustomJWTSerializer.get_user` incluir `nombre`/`apellido` de staff.
- `backend/apps/users/views.py` — `ProfileView.get_object()` y `get_serializer_class()` por rol.
- `backend/apps/users/tests/test_views.py` — reemplazar `test_user_without_socio_returns_404` y agregar tests de staff.
- `frontend/src/pages/ProfilePage.jsx` — rama staff, schema por rol, estado de error.
- `frontend/src/pages/ProfilePage.test.jsx` — casos staff/error.
- (opcional) `frontend/src/hooks/queries/useProfile.js` — `retry` condicional.

## 9. Plan de pruebas (TDD)
Convención backend: `backend/apps/users/tests/test_views.py` usa `APITestCase`, `make_user_factory(rol=...)` y `make_socio_factory(usuario, ...)` de `backend/conftest.py`, y helper `_auth_client(self.client, user)` (JWT). Correr: `cd backend && pytest apps/users -q` (CI corre `pytest -q`; `pytest.ini` exige `--cov-fail-under=80`).

Backend (escribir primero, en `ProfileViewTests`):
- `test_staff_get_returns_200` para `administrador` y `recepcionista`: 200 con `nombre`==`first_name`, `apellido`==`last_name`, `email`, `rol`; sin `dni`/`telefono`.
- `test_staff_patch_updates_first_last_name`: PATCH `{nombre,apellido}` persiste en `User.first_name/last_name`.
- `test_staff_patch_ignores_email_and_rol`: PATCH `{email:'x@y.z', rol:'administrador'}` no cambia `email` ni `rol`.
- `test_socio_without_socio_record_returns_404`: usuario `rol='socio'` sin `Socio` → 404 (sustituye al test actual).
- `test_login_response_includes_nombre_apellido_for_staff` en `CustomJWTSerializerTests`.
- Los tests existentes de socio (200/PATCH/DNI inmutable) deben seguir en verde.

Frontend (vitest + RTL; mocks de `../hooks/queries/useProfile` y `useAuth` como en `ProfilePage.test.jsx:15`; utilidades en `frontend/src/test/test-utils.jsx`: `renderWithProviders`, `createTestQueryClient`): staff no ve campos DNI/Teléfono y puede guardar con nombre/apellido; `isError` muestra EmptyState + "Reintentar"; socio mantiene comportamiento. Correr: `cd frontend && npx vitest run src/pages/ProfilePage.test.jsx`; lint `npm run lint` (`--max-warnings 0`).

Manual: login con `admin@winnie.local` y `recepcion@winnie.local` (seed `seed_demo_users`) → Sidebar → "Ver perfil" → ver datos, editar nombre, recargar y verificar que el Sidebar muestra el nombre.

## 10. Criterios de aceptación
- **Dado** un administrador autenticado **cuando** abre `/perfil` **entonces** ve su email, rol y nombre/apellido sin skeleton infinito ni formulario vacío.
- **Dado** un recepcionista **cuando** edita nombre y apellido y guarda **entonces** recibe toast de éxito y el Sidebar refleja el nuevo nombre.
- **Dado** que la API de perfil falla **cuando** se carga `/perfil` **entonces** se ve un mensaje de error con botón "Reintentar".
- **Dado** un socio **cuando** abre `/perfil` **entonces** todo funciona como hoy (DNI, teléfono, certificado).

## 11. Riesgos y decisiones abiertas
1. ¿Staff debe poder editar `telefono`? Recomendación: no (no existe campo en `User`); fuera de alcance.
2. Usuario `rol='socio'` sin `Socio`: mantener 404 (el flujo `/completar-perfil` lo cubre). Recomendado.
3. ¿Exponer `foto` editable? Recomendación: no.
4. Riesgo: `setAuth` en `ProfilePage.jsx:57-61` reescribe `user` con `nombre/apellido`; para staff funciona igual una vez que el login los devuelva.

## 12. Referencias
`docs/architecture.md`; test del comportamiento actual `backend/apps/users/tests/test_views.py:151`; comentario de `ProtectedRoute.jsx:10-11` ("Staff users ... do not have a Socio record"). Figma (opcional): página "vistas live", módulo Perfil. Relacionado: BK-BUG-03 (gestión de staff).

## 13. Prompt listo para un agente de IA
> Repo Winnie The Gym (Django REST + React/Vite). Bug: `GET/PATCH /api/auth/profile/` devuelve 404 para administrador/recepcionista porque `ProfileView.get_object` (`backend/apps/users/views.py:71`) busca un `Socio`. TDD: primero reemplazá en `backend/apps/users/tests/test_views.py` (`ProfileViewTests`) el test `test_user_without_socio_returns_404` por tests de staff (200 con `nombre/apellido/email/rol`, PATCH que persiste `first_name/last_name`, email y rol inmutables, socio sin `Socio` → 404) y agregá en `CustomJWTSerializerTests` que el login de staff incluya `nombre/apellido`. Luego implementá: `StaffProfileSerializer` (ModelSerializer de `User`, `nombre=CharField(source='first_name')`, `apellido=CharField(source='last_name')`, `fields=('id','email','foto','rol','nombre','apellido')`, read-only `id,email,foto,rol`) en `backend/apps/users/serializers.py`; `ProfileView.get_serializer_class/get_object` por rol (`STAFF_ROLES` ya existe en el módulo de serializers); extender `CustomJWTSerializer.get_user`. Frontend: en `frontend/src/pages/ProfilePage.jsx` ocultá DNI y Teléfono para staff, usá schema zod sin `telefono` para staff, y mostrá `EmptyState` con "Reintentar" cuando `useProfile()` esté en `isError`; actualizá `ProfilePage.test.jsx`. Textos de UI en español rioplatense, código/identificadores en inglés/como están. Hecho cuando: `cd backend && pytest apps/users -q` y `cd frontend && npx vitest run src/pages/ProfilePage.test.jsx && npm run lint` pasan, y manualmente con `admin@winnie.local` `/perfil` carga y guarda. No hagas commits.
