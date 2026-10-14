---
id: BK-BUG-03
titulo: El botón "Crear staff" no se renderiza (prop `actions` inexistente en TopBar) y el estado "Activo/Pendiente" es falso
tipo: bug
roles: [administrador]
prioridad: P0
tamano: S
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-BUG-03 · "Crear staff" invisible + estado de activación falso

## 1. Resumen
En `/admin/usuarios` el único acceso para crear staff está en `<TopBar actions={...}/>`, pero `TopBar` no tiene prop `actions` (solo `rightContent`), así que el botón **nunca se dibuja** y no hay forma de crear usuarios de staff desde la UI. El test existente lo oculta porque mockea `TopBar` con una prop `actions`. Además la columna "Estado" siempre muestra "Activo" porque el backend no expone si la contraseña es utilizable.

## 2. Objetivo de usuario
Como **administrador** quiero **crear usuarios de staff y ver quién todavía no activó su cuenta** para **gestionar el equipo y reenviar la activación**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Frontend página | `frontend/src/pages/admin/AdminUsuariosPage.jsx:44-56` | `<TopBar title icon={<Users/>} actions={<Button onClick={() => setIsFormOpen(true)}>Crear staff</Button>} />` |
| Frontend componente | `frontend/src/components/layout/TopBar.jsx:21,48-51` | Firma `TopBar({ title, subtitle, showLive, showSearch, onScan, rightContent, backAction })`. No acepta `actions` ni `icon` → ambos se ignoran |
| Frontend test (falso verde) | `frontend/src/pages/admin/__tests__/AdminUsuariosPage.test.jsx:39-46,81-86` | `vi.mock('.../TopBar', () => ({ default: ({ title, actions }) => ... {actions} }))` → el test "shows Crear staff button" pasa aunque el real no lo renderice |
| Frontend página | `frontend/src/pages/admin/AdminUsuariosPage.jsx:15-30,96` | `StatusBadge isActive hasUsablePassword`; se llama con `hasUsablePassword={true}` fijo → "Pendiente activación" solo aparece si `is_active=false` |
| Frontend modal | `frontend/src/components/admin/StaffFormModal.jsx:36-130` | Modal funcional: `useStaffCreate()`, valida email/nombre/apellido/rol, errores del backend por campo. Alcanzable solo desde el botón roto |
| Frontend hook | `frontend/src/hooks/queries/useStaff.js:29-71` | `useStaffList`, `useStaffCreate` (toast "Staff creado correctamente. Se envió un email de activación."), `useResendActivation` |
| Backend vista | `backend/apps/users/views.py:93-114,117-127` | `StaffView` (`GET`/`POST /api/users/staff/`, `IsAdminOnly`), `StaffResendActivationView` (`POST /api/users/staff/{id}/resend-activation/`); rutas en `backend/apps/users/staff_urls.py`, montadas en `backend/core/urls.py:160` |
| Backend serializer | `backend/apps/users/serializers.py:111-117` | `StaffListSerializer.fields = ('id','email','rol','first_name','last_name','is_active','date_joined')`: **no existe** `has_usable_password` |
| Backend serializer | `backend/apps/users/serializers.py:90-108` | Crea usuario con `set_unusable_password()` (por eso "pendiente" = `not user.has_usable_password()`) |
| Frontend ruta | `frontend/src/App.jsx:109-111` | `/admin/usuarios` → solo `administrador` |
| Frontend nav | `frontend/src/components/layout/Sidebar.jsx:19` | "Usuarios" (icono `people`, igual que "Socios") |

## 4. Alcance
**Incluye:** renderizar el botón en `TopBar` vía `rightContent`; exponer `has_usable_password` en `StaffListSerializer` y usarlo en `StatusBadge`; corregir el test para usar el `TopBar` real (o un mock con `rightContent`); estados de carga/vacío/error del listado.
**No incluye:** edición/desactivación de staff, cambio de rol, borrado, rediseño del listado, acceso desde mobile (BK-MOB-xx).

## 5. Contrato de API
**[EXISTE] `GET /api/users/staff/`** — `IsAdminOnly`. Response: lista (`generics.ListCreateAPIView`; paginación según config global DRF; el frontend tolera array o `{results}` en `AdminUsuariosPage.jsx:38-40`) de `{id, email, rol, first_name, last_name, is_active, date_joined}`.
**[A MODIFICAR]** agregar `has_usable_password = serializers.SerializerMethodField()` (`return obj.has_usable_password()`) a `StaffListSerializer.fields`.
**[EXISTE] `POST /api/users/staff/`** body `{email, rol ('administrador'|'recepcionista'), first_name, last_name}` → 201 `{id,email,rol,first_name,last_name}`; errores: `{"email":["already exists"]}`, `{"rol":["Rol inválido. Permitidos: ..."]}`; 403 si no es admin.
**[EXISTE] `POST /api/users/staff/{id}/resend-activation/`** → 200 `{"detail":"Activation email re-sent."}`; 404 si no es staff.

## 6. Modelo de datos
Sin cambios (`has_usable_password()` es método de `AbstractUser`).

## 7. Diseño frontend
- **Ruta y guard:** sin cambios.
- **`AdminUsuariosPage.jsx`:** reemplazar `actions={...}` por `rightContent={<Button ...>Crear staff</Button>}` y quitar `icon` (no soportado). Usar `hasUsablePassword={member.has_usable_password}` en `StatusBadge`.
- **Estados:** loading — reemplazar el texto "Cargando usuarios..." por `Skeleton` (`components/ui/Skeleton.jsx`) como el resto de páginas; vacío existente ("No hay usuarios staff registrados."); error de lista: hoy no se maneja `isError` → mostrar `EmptyState` "No pudimos cargar los usuarios" + "Reintentar". Éxito: toast de `useStaffCreate`; reenvío: toast "Email de activación reenviado." (existente).
- **Textos:** "Crear staff", "Reenviar activación", "Pendiente activación", "Activo".
- **Responsive:** la tabla ya está en `overflow-x-auto`; a 375 px el botón de `TopBar` debe caber (usar `size="sm"` si hace falta).

## 8. Archivos a crear / modificar
- `frontend/src/pages/admin/AdminUsuariosPage.jsx` — `rightContent`, `has_usable_password`, estados.
- `frontend/src/pages/admin/__tests__/AdminUsuariosPage.test.jsx` — mock de `TopBar` con `rightContent` (o sin mock) y casos nuevos.
- `backend/apps/users/serializers.py` — `has_usable_password` en `StaffListSerializer`.
- `backend/apps/users/tests/test_staff_create.py` — caso de listado con el campo nuevo.

## 9. Plan de pruebas (TDD)
Frontend (vitest + RTL, `renderWithProviders` de `frontend/src/test/test-utils.jsx`): **primero** hacer rojo el test: sin mockear `TopBar` (ni mockeando `actions`), `screen.getByRole('button',{name:/crear staff/i})` debe existir; click abre `StaffFormModal`; usuario con `has_usable_password:false` muestra "Pendiente activación" y con `true` "Activo"; `isError` muestra "Reintentar". Correr `cd frontend && npx vitest run src/pages/admin/__tests__/AdminUsuariosPage.test.jsx`; lint `npm run lint`.
Backend (`backend/apps/users/tests/test_staff_create.py`, mismo estilo `APITestCase` + `make_user_factory`/`_auth_client`): `GET /api/users/staff/` como admin incluye `has_usable_password` `False` para un usuario recién creado por `POST` y `True` para uno con `set_password`; recepcionista y socio → 403. `cd backend && pytest apps/users -q`.
Manual: `admin@winnie.local` → Sidebar "Usuarios" → ver botón "Crear staff" arriba a la derecha → crear → aparece con "Pendiente activación".

## 10. Criterios de aceptación
- **Dado** un administrador en `/admin/usuarios` **entonces** ve el botón "Crear staff" en la barra superior.
- **Dado** que crea un staff nuevo **entonces** aparece en la tabla con estado "Pendiente activación" y puede reenviar el email.
- **Dado** un staff que ya activó su cuenta **entonces** se muestra "Activo".
- **Dado** el test de página **entonces** falla si `TopBar` deja de renderizar el botón.

## 11. Riesgos y decisiones abiertas
1. ¿Extender `TopBar` para soportar `actions` en vez de usar `rightContent`? Recomendación: no; 9 páginas ya usan `rightContent` (`rg "rightContent=" frontend/src/pages`), unificar en esa.
2. Otras páginas que pasen props desconocidas a `TopBar`: solo `AdminUsuariosPage` (`actions`, `icon`); verificado con `rg` en `frontend/src/pages` (no verificado en `components/`).

## 12. Referencias
Specs previos de gestión de staff: `openspec/changes/` (buscar "staff"; no verificado el nombre exacto). Figma (opcional): "vistas live", Admin → Usuarios.

## 13. Prompt listo para un agente de IA
> Repo Winnie The Gym. Bug: en `frontend/src/pages/admin/AdminUsuariosPage.jsx` el botón "Crear staff" se pasa como `actions` a `TopBar`, que solo soporta `rightContent` (`frontend/src/components/layout/TopBar.jsx:21`), por lo que no se renderiza. El test `frontend/src/pages/admin/__tests__/AdminUsuariosPage.test.jsx` mockea `TopBar` con `actions` y por eso pasa. TDD: primero reescribí el test para que use el `TopBar` real y verifique el botón, la apertura de `StaffFormModal`, y el badge "Pendiente activación" cuando `has_usable_password` es false; agregá en `backend/apps/users/tests/test_staff_create.py` un test que exija `has_usable_password` en `GET /api/users/staff/`. Luego: cambiá `actions` por `rightContent` y quitá `icon`; agregá `has_usable_password = SerializerMethodField` a `StaffListSerializer` (`backend/apps/users/serializers.py:111`); usá ese campo en `StatusBadge`; agregá `Skeleton` de carga y `EmptyState` de error con "Reintentar". UI en español rioplatense. Terminado cuando `cd frontend && npx vitest run src/pages/admin && npm run lint` y `cd backend && pytest apps/users -q` pasan. Sin commits.
