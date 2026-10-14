---
id: BK-SOC-04
titulo: El cambio de contraseña no verifica la contraseña actual ni cierra las demás sesiones
tipo: bug
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: S
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-SOC-04 · El cambio de contraseña no verifica la contraseña actual

## 1. Resumen
`ChangePasswordModal` pide "Contraseña actual" y la envía como `old_password`, pero `REST_AUTH` no activa `OLD_PASSWORD_FIELD_ENABLED`, que en dj-rest-auth viene en `False` por defecto: el endpoint `POST /api/auth/password/change/` **no valida `old_password`**. Con un access token robado (o una sesión abierta en un equipo compartido) se puede fijar una contraseña nueva sin conocer la anterior. Tampoco se invalidan los refresh tokens existentes. No hay tests backend del flujo.

## 2. Objetivo de usuario
Como **usuario autenticado** quiero **que cambiar mi contraseña exija mi contraseña actual y cierre mis otras sesiones** para **que nadie con acceso momentáneo a mi sesión me quite la cuenta**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend config | `backend/core/settings/base.py:230-238` | `REST_AUTH = {'USE_JWT': True, 'JWT_AUTH_HTTPONLY': False, 'USER_DETAILS_SERIALIZER': ..., 'JWT_SERIALIZER': ..., 'TOKEN_MODEL': None}`. **No define `OLD_PASSWORD_FIELD_ENABLED` ni `LOGOUT_ON_PASSWORD_CHANGE`.** |
| Backend rutas | `backend/core/urls.py:150` | `path('api/auth/', include('dj_rest_auth.urls'))` expone `password/change/` (vista de dj-rest-auth 7.2.0, `backend/requirements/base.txt:5`; `IsAuthenticated`). |
| Backend config JWT | `backend/core/settings/base.py:218-225` | `ROTATE_REFRESH_TOKENS=True`, `BLACKLIST_AFTER_ROTATION=True`, access 30 min, refresh 1 día. |
| Backend validadores | `backend/core/settings/base.py:113-118` | `AUTH_PASSWORD_VALIDATORS`: similitud con atributos, longitud mínima (8 por defecto), contraseñas comunes, solo numéricas. |
| Backend tests | `backend/apps/users/tests/` | **Ningún test** de `password/change`, `password/reset` ni confirm (`rg 'password/change'` en backend: 0 resultados). |
| Frontend modal | `frontend/src/components/auth/ChangePasswordModal.jsx:11-20,35-47` | Zod: `old_password` (min 1), `new_password1` (min 8), `new_password2` + refine de igualdad. Envía `api.post('/auth/password/change/', values)`; en error junta `Object.values(data).flat().join(' ')`. |
| Frontend test | `frontend/src/components/auth/__tests__/ChangePasswordModal.test.jsx:87-88` | Verifica que se envía `old_password`; no hay forma de detectar que el backend lo ignora. |

Verificación: la ausencia de la clave en `REST_AUTH` está confirmada leyendo `base.py`; el valor por defecto `False` de `OLD_PASSWORD_FIELD_ENABLED` proviene de la documentación de dj-rest-auth (no se ejecutó la app). **Confirmar en el paso 1 del TDD** con un test que envíe `old_password` incorrecto y hoy dará 200.

## 4. Alcance
**Incluye:** activar `OLD_PASSWORD_FIELD_ENABLED=True`; decidir/activar `LOGOUT_ON_PASSWORD_CHANGE`; blacklist de refresh tokens del usuario al cambiar contraseña; tests backend; mensajes de error en español y por campo en el modal.
**No incluye:** recuperación de contraseña por email (→ BK-SOC-11); 2FA; política de complejidad más estricta.

## 5. Contrato de API
**[EXISTE] `POST /api/auth/password/change/`** — `IsAuthenticated`. Request (campos del serializer de dj-rest-auth): `{"old_password":"...","new_password1":"...","new_password2":"..."}`. Response 200 `{"detail":"New password has been saved."}` (texto en inglés de dj-rest-auth; el modal muestra su propio toast). Errores 400: `{"old_password":["Your old password was entered incorrectly. Please enter it again."]}` (mensaje de Django, traducido por `LANGUAGE_CODE='es-ar'` si el catálogo está disponible), `{"new_password2":["The two password fields didn't match."]}`, `{"new_password2":[<mensajes de AUTH_PASSWORD_VALIDATORS>]}`.
**Cambio:** con `OLD_PASSWORD_FIELD_ENABLED=True` el campo `old_password` pasa a **obligatorio y validado**. Con `LOGOUT_ON_PASSWORD_CHANGE=True` dj-rest-auth cierra la sesión actual (en JWT solo hace sentido si además se blacklistea; evaluar en decisiones).

## 6. Modelo de datos
Sin cambios de modelo (las tablas de blacklist ya están migradas: `users/tests/test_views.py:242 test_token_blacklist_tables_migrated`).

## 7. Diseño frontend
- **Rutas/guard:** el modal se abre desde `/perfil` (`ProfilePage.jsx:211-223`), ruta `ProtectedRoute` sin `roles` (`App.jsx:75`); sirve a los tres roles (ojo BK-BUG-01: la página de perfil falla para staff).
- **Convenciones:** `react-hook-form + zod`, `components/ui/Modal`, `Button loading`, toasts `sonner`, cliente `services/api.js`.
- **Cambios:** mapear errores por campo: si `err.response.data.old_password` ⇒ `setError('old_password', {message:'La contraseña actual no es correcta.'})` en lugar del toast concatenado; los errores de `new_password2` (validadores) se muestran bajo el campo. Si se activa cierre de sesión global: tras éxito `clearAuth()` + `navigate('/login')` con toast "Contraseña actualizada. Iniciá sesión de nuevo."
- **Textos:** "La contraseña actual no es correcta.", "Las contraseñas no coinciden", "Contraseña actualizada correctamente."
- **Responsive:** modal estándar (`max-w-lg`), verificar teclado móvil a 375 px.

## 8. Archivos a crear / modificar
- `backend/core/settings/base.py` — `REST_AUTH['OLD_PASSWORD_FIELD_ENABLED']=True` (+ opcional `LOGOUT_ON_PASSWORD_CHANGE`).
- `backend/apps/users/views.py` + `core/urls.py` — (si se decide blacklist global) vista `PasswordChangeView` propia que, tras `super().post`, blacklistea `OutstandingToken` del usuario excepto el actual.
- `backend/apps/users/tests/test_password_change.py` (nuevo).
- `frontend/src/components/auth/ChangePasswordModal.jsx` y su test en `__tests__/`.

## 9. Plan de pruebas (TDD)
**Backend** (`APITestCase`, `make_user_factory(email=..., password='Vieja123!')`, auth con `RefreshToken.for_user(user).access_token` como en otros tests de `users/tests`): 
- `test_password_change_old_incorrecta_400` (hoy da 200 ⇒ test rojo).
- `test_password_change_ok_200_y_login_con_nueva` (`POST /api/auth/login/` con la nueva).
- `test_password_change_nueva_debil_400` (numérica / común / similar al email).
- `test_password_change_sin_auth_401`.
- (si se implementa) `test_refresh_token_previo_invalidado_tras_cambio`.
Comando: `cd backend && pytest -q apps/users/tests/test_password_change.py`.
**Frontend:** `ChangePasswordModal.test.jsx` (Vitest + RTL, `vi.mock('../../../services/api')`): 400 con `{old_password:[...]}` ⇒ error bajo el campo "Contraseña actual"; éxito ⇒ `toast.success` + `onClose`.
Comando: `cd frontend && npx vitest run src/components/auth && npm run lint`.
**Manual:** `socio.activo@winnie.local` (seed) → `/perfil` → "Cambiar contraseña" con actual incorrecta ⇒ error; con actual correcta ⇒ éxito y el login con la nueva funciona.

## 10. Criterios de aceptación
- **Dado** un usuario autenticado **cuando** envía `old_password` incorrecto **entonces** recibe 400 `{"old_password":[...]}` y la contraseña no cambia.
- **Dado** `old_password` correcto y una nueva válida **cuando** confirma **entonces** 200 y el login con la nueva contraseña funciona.
- **Dado** un cambio exitoso **cuando** otro dispositivo intenta refrescar su token **entonces** (si se adopta) falla y debe loguearse otra vez.
- El modal muestra el error de contraseña actual debajo del campo correcto.

## 11. Riesgos y decisiones abiertas
1. ¿Cerrar todas las sesiones al cambiar contraseña? (Recomendado: sí, blacklistear refresh tokens previos; el access vigente expira en ≤30 min.)
2. ¿Subir el mínimo a 10 caracteres? (Recomendado: no ahora; alinear mensajes de frontend (8) con el validador real.)
3. Usuarios creados por Google OAuth no tienen contraseña usable: `old_password` no aplica (el endpoint fallará). ¿Mostrar "Crear contraseña" en su lugar? (Recomendado: ocultar el botón si `has_usable_password=False`; requiere exponerlo en `UserDetailsSerializer`.)

## 12. Referencias
- Documentación dj-rest-auth (settings `OLD_PASSWORD_FIELD_ENABLED`, `LOGOUT_ON_PASSWORD_CHANGE`).
- `speckit/spec.md` REQ-3.2 ("Cambio de password logueado").
- Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", Perfil → Seguridad.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1 + dj-rest-auth 7.2.0 + simplejwt; React 18). Problema: POST /api/auth/password/change/ no valida old_password porque REST_AUTH en backend/core/settings/base.py:230-238 no define OLD_PASSWORD_FIELD_ENABLED (default False). El modal frontend/src/components/auth/ChangePasswordModal.jsx igual lo envía.
TDD: creá backend/apps/users/tests/test_password_change.py (APITestCase, make_user_factory de backend/conftest.py, JWT con RefreshToken.for_user): old_password incorrecta -> 400 {old_password:[...]} (hoy falla: devuelve 200); correcta -> 200 y login con la nueva; nueva débil -> 400; sin auth -> 401. Confirmá que el test de old_password incorrecta falla ANTES de tocar nada. Luego agregá 'OLD_PASSWORD_FIELD_ENABLED': True a REST_AUTH y, si el dueño lo aprueba, invalidá los refresh tokens previos del usuario (rest_framework_simplejwt.token_blacklist OutstandingToken/BlacklistedToken) en una vista PasswordChangeView que herede de dj_rest_auth.views.PasswordChangeView y reemplace la ruta en backend/core/urls.py antes de include('dj_rest_auth.urls').
Frontend: en ChangePasswordModal mostrá el error de old_password con setError bajo el campo (texto "La contraseña actual no es correcta.") y los errores de new_password2 bajo su campo; actualizá frontend/src/components/auth/__tests__/ChangePasswordModal.test.jsx.
Terminado: pytest -q apps/users verde, npx vitest run src/components/auth y npm run lint verdes. No imprimas ni guardes contraseñas reales; usá las de test. No hagas commits.
```
