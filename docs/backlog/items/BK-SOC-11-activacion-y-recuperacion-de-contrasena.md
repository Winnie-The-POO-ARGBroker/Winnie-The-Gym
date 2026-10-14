---
id: BK-SOC-11
titulo: Activación de cuenta y recuperación de contraseña: link/token a validar, emails en inglés con dominio por defecto, sin reenvío para socios
tipo: bug
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: M
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-SOC-01, BK-SOC-07]
---

# BK-SOC-11 · Activación de cuenta y recuperación de contraseña

## 1. Resumen
Tanto el alta de staff como el alta de socio con email real dependen de un email "poné tu contraseña" que se genera con el `PasswordResetForm` de Django, mientras que el endpoint que lo consume (`/api/auth/password/reset/confirm/`) es el de dj-rest-auth + allauth. Nada en los tests recorre el flujo completo (todos mockean `send_activation_email`), así que **hay un riesgo alto, a confirmar con un test de ida y vuelta, de que el token del email no sea aceptado por el confirm (generadores de token distintos)**. Además: el dominio del link sale de la tabla `Site` (por defecto `example.com`), los textos del email son los de Django admin en inglés, el link vence en 3 días, el front muestra "Invalid value" crudo cuando el token es inválido, los socios no tienen reenvío de activación y el panel de staff no distingue "pendiente de activación".

## 2. Objetivo de usuario
Como **persona invitada (staff o socio)** o que **olvidó su contraseña** quiero **recibir un email claro en español con un link que funcione y poder pedir otro si venció** para **entrar a mi cuenta sin pedir ayuda**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Servicio activación | `backend/apps/users/services.py:17-44` | `send_activation_email(user)`: `PasswordResetForm(data={'email': user.email}).save(request=None, use_https=True, from_email=None, email_template_name='registration/password_reset_email.html', subject_template_name='registration/password_reset_subject.txt')`; errores se tragan y loguean. Con `request=None` el dominio sale de `Site.objects.get_current()`. |
| Sites | `backend/core/settings/base.py:28,131` | `django.contrib.sites` instalado, `SITE_ID = 1`. `rg "Site\b\|SITE_DOMAIN\|example.com" backend --glob '!tests'`: no hay código/migración que cambie el dominio (queda el `example.com` por defecto salvo edición manual en el admin; **No verificado en producción**). |
| Plantillas | `backend/apps/common/templates/emails/` | Solo `_base, clase_cancelada, expiration_alert, payment_confirmation, welcome` (+`.txt`). **No existe** `registration/password_reset_email.html` ni `password_reset_subject.txt` en el repo ⇒ Django usa las de `django.contrib.admin` (inglés: "Password reset on …"). **No verificado el render exacto**; confirmar con un test. |
| URL del email | `backend/core/urls.py:135-159` | `password_reset_confirm` redirige a `{FRONTEND_URL}/reset-password/{uidb64}/{token}`; `api/auth/password/reset/` usa `SafePasswordResetView` (siempre 200). |
| Confirm | `backend/core/urls.py:150` + `dj_rest_auth` 7.2.0 (`requirements/base.txt:5`) | `POST /api/auth/password/reset/confirm/` es de dj-rest-auth. Con `allauth` en `INSTALLED_APPS` (`base.py:36-39`) su serializer valida el token con el generador de allauth (hash que incluye emails), distinto del `default_token_generator` de Django usado por `PasswordResetForm` del servicio. **Hipótesis a confirmar (TDD paso 1).** |
| Expiración | `backend/core/settings/base.py` | No define `PASSWORD_RESET_TIMEOUT` ⇒ default de Django 5.1: 3 días (259200 s). |
| Tests | `backend/apps/users/tests/test_staff_create.py:39-203` | Todos usan `@patch('apps.users.views.send_activation_email')`; `:203 test_resend_activation_for_socio_returns_404`. **Ningún test** envía el email real ni consume el token. |
| Reenvío staff | `backend/apps/users/views.py:117-127`, `staff_urls.py:12` | `POST /api/users/staff/{id}/resend-activation/` (`IsAdminOnly`) solo para `rol in ['administrador','recepcionista']`. **No hay equivalente para socios.** |
| Socio sin email real | `backend/apps/members/serializers.py:61-84`, `services.py:23-45` | Sin `email`, el usuario es `socio_<dni>@winniegym.com` y **no** se envía activación (`is_synthetic`, líneas 33-39): ese socio nunca podrá iniciar sesión. |
| Bienvenida a email falso | `backend/apps/common/signals.py:14-35` | El `post_save` de `Socio` envía "¡Bienvenido/a!" a cualquier `user.email` no vacío, **incluido el sintético** `socio_<dni>@winniegym.com` (sin guardia, a diferencia del servicio). |
| Frontend recuperar | `frontend/src/pages/ForgotPasswordPage.jsx:29-39,79-92` | Siempre muestra "Si el email existe, te enviamos un enlace…" (correcto vs. enumeración). |
| Frontend reset | `frontend/src/pages/ResetPasswordPage.jsx:31-52` | `POST /auth/password/reset/confirm/ {uid, token, new_password1, new_password2}`; en error junta `Object.values(data).flat().join(' ')` ⇒ el usuario ve **"Invalid value"** (token) en inglés; sin pantalla de "enlace vencido" ni CTA para pedir otro. La ruta está dentro de `PublicRoute` (`App.jsx:71`): si ya hay sesión redirige al dashboard y el link de activación "no funciona". |
| Frontend staff | `frontend/src/pages/admin/AdminUsuariosPage.jsx:96` y `backend/apps/users/serializers.py:111-117` | `<StatusBadge isActive={member.is_active} hasUsablePassword={true} />`: **valor fijo**; `StaffListSerializer.fields = (id,email,rol,first_name,last_name,is_active,date_joined)` no expone `has_usable_password` ni `last_login` ⇒ nunca se ve "Pendiente activación". El listado no pagina (usa la 1ª página de 10, `AdminUsuariosPage.jsx:38-40`). |
| Google | `backend/apps/users/views.py:30-39` | `GoogleLoginView` (callback `{FRONTEND_URL}/auth/callback`); las cuentas Google no tienen contraseña usable. |

## 4. Alcance
**Incluye:** test de ida y vuelta activación→confirm (y recuperación→confirm); corregir el generador de tokens/forma de envío para que sean compatibles; plantillas de email en español (activación vs. recuperación) con dominio del frontend; `PASSWORD_RESET_TIMEOUT` explícito; pantalla de "enlace inválido o vencido" con CTA; reenvío de activación para socios (admin/recepción); guardia de email sintético en la bienvenida; `has_usable_password` en el listado de staff y badge real.
**No incluye:** cambio de contraseña autenticado (→ BK-SOC-04); alta de socios en recepción (→ BK-SOC-01); verificación de email en el registro (`ACCOUNT_EMAIL_VERIFICATION='none'`, decisión de producto); proveedor de email/SPF/DKIM (→ BK-PLT).

## 5. Contrato de API
**[EXISTE] `POST /api/auth/password/reset/`** (público) — `{"email": "..."}` → siempre `200 {"detail":"Password reset e-mail has been sent."}` (texto inglés; el front no lo muestra).
**[EXISTE] `POST /api/auth/password/reset/confirm/`** (público, dj-rest-auth) — `{"uid":"<uidb64>","token":"<token>","new_password1":"...","new_password2":"..."}`; 200 `{"detail":"Password has been reset with the new password."}`; 400 `{"token":["Invalid value"]}` / `{"uid":["Invalid value"]}` / `{"new_password2":[<validadores>]}`.
**[A CREAR — propuesta] `POST /api/members/socios/{id}/reenviar-activacion/`** — `IsReceptionistOrAdmin`; 200 `{"detail":"Te enviamos el email de activación."}`; 400 `{"detail":"Este socio no tiene un email real cargado."}` si el email es sintético; 404 inexistente. Reutiliza `send_activation_email`.
**[EXISTE → CAMBIA] `GET /api/users/staff/`** (`IsAdminOnly`) — `StaffListSerializer` agrega `has_usable_password: bool` (`SerializerMethodField` → `obj.has_usable_password()`) y `last_login`.
**Email (propuesta):** pasar a `send_templated_email` (`apps/common/emails.py`) con plantilla `emails/password_reset.{html,txt}` y `emails/account_activation.{html,txt}`; link directo `{FRONTEND_URL}/reset-password/{uid}/{token}` (sin pasar por el dominio de `Site`).

## 6. Modelo de datos
Sin cambios de modelo. (Si se mantiene la ruta por `Site`: data migration que ajuste `Site(pk=1).domain` desde `FRONTEND_URL`/env.)

## 7. Diseño frontend
- **Rutas/guard:** `/forgot-password` y `/reset-password/:uid/:token` envueltas en `<PublicRoute>` (`App.jsx:70-71`); proponer que `/reset-password/...` **no** redirija si hay sesión (sacarla de `PublicRoute` o permitir cerrar sesión).
- **Convenciones:** páginas de auth con `react-hook-form + zod`, `Input`/`Button` de `components/ui`, `WinnieLogo`, `sonner`; llamadas con `services/api.js`.
- **Cambios:**
  1. `ResetPasswordPage`: si el error trae `token` o `uid` ⇒ mostrar estado "enlace vencido" (ícono + "Este enlace ya no es válido o venció." + botón "Pedir un enlace nuevo" → `/forgot-password`); errores de `new_password2` bajo el campo; traducir/mapear mensajes de los validadores a español (`Esta contraseña es demasiado común.`, etc.).
  2. `AdminUsuariosPage`: `hasUsablePassword={member.has_usable_password}`; paginación (o `page_size` si se agrega).
  3. Detalle de socio (`SocioDetailModal`): botón "Reenviar activación" (solo si el socio tiene email real; admin/recepción) → mutation `useReenviarActivacion` en `hooks/queries/useSociosData.js` + `sociosService.reenviarActivacion(id)`; toast "Te enviamos el email de activación.".
- **Estados de UI:** loading (`Button loading`), error (estado "enlace vencido" o toast), éxito (toast + redirección a `/login`).
- **Textos:** "Elegí una contraseña nueva", "Este enlace ya no es válido o venció.", "Pedir un enlace nuevo", "Reenviar activación".
- **Responsive:** páginas centradas (`max-w-sm`), ok a 375 px; el panel izquierdo promocional ya se oculta bajo `md`.

## 8. Archivos a crear / modificar
- Backend: `users/services.py` (envío con plantilla propia), `common/templates/emails/{password_reset,account_activation}.{html,txt}`, `core/settings/base.py` (`PASSWORD_RESET_TIMEOUT`), `users/serializers.py` (`StaffListSerializer`), `members/views.py` + `services.py` (reenvío), `common/signals.py` (guardia sintético), tests nuevos.
- Frontend: `ResetPasswordPage.jsx` (+test), `AdminUsuariosPage.jsx`, `SocioDetailModal.jsx`, `services/sociosService.js`, `hooks/queries/useSociosData.js`, `App.jsx` (si se saca de `PublicRoute`).

## 9. Plan de pruebas (TDD)
**Backend** (`backend/apps/users/tests/test_activation_flow.py`, `APITestCase`, `django.core.mail.outbox` con `core/settings/test.py:13` locmem; `CELERY_TASK_ALWAYS_EAGER=True`): 
- **Paso 1 (confirmar la hipótesis):** `test_activacion_staff_roundtrip`: admin crea staff por `POST /api/users/staff/` **sin mockear** el email; parsear `uid` y `token` del cuerpo de `mail.outbox[0]`; `POST /api/auth/password/reset/confirm/` con una contraseña válida ⇒ debe ser 200 y `POST /api/auth/login/` funcionar. Si hoy da 400 `{"token":["Invalid value"]}`, el bug está confirmado.
- `test_recuperacion_roundtrip`: `POST /api/auth/password/reset/` → outbox → confirm → login.
- `test_token_vencido_400` (con `PASSWORD_RESET_TIMEOUT` mínimo o `freeze` manual del generador).
- `test_email_en_espanol_y_link_al_frontend`: asunto y cuerpo en español; el link empieza con `settings.FRONTEND_URL`.
- `test_reenviar_activacion_socio_ok/400_sintetico/403_socio`.
- `test_welcome_no_se_envia_a_email_sintetico` (`apps/common/tests/test_welcome_signal.py`).
- `test_staff_list_expone_has_usable_password`.
Comando: `cd backend && pytest -q apps/users apps/members apps/common`.
**Frontend** (`ResetPasswordPage.test.jsx`, Vitest + RTL, `vi.mock('../services/api')`): 400 `{token:['Invalid value']}` ⇒ pantalla "enlace vencido" con link a `/forgot-password`; 400 `{new_password2:[...]}` ⇒ error bajo el campo; éxito ⇒ `toast.success` + navegación a `/login`. `AdminUsuariosPage.test.jsx`: badge "Pendiente activación" cuando `has_usable_password=false`.
Comando: `cd frontend && npx vitest run src/pages src/components && npm run lint`.
**Manual:** admin crea un recepcionista con email de prueba → abrir el link del email → definir contraseña → login. Con la sesión de otro usuario abierta, abrir el link (no debe redirigir al dashboard).

## 10. Criterios de aceptación
- **Dado** un staff o socio recién invitado **cuando** abre el link del email y elige una contraseña válida **entonces** puede iniciar sesión.
- **Dado** un link vencido o usado **cuando** lo abre **entonces** ve "Este enlace ya no es válido o venció." con botón para pedir otro.
- **Dado** el email recibido **entonces** está en español, con el nombre del gimnasio y un link a `FRONTEND_URL` (no a `example.com`).
- **Dado** un socio con email real que no activó **cuando** recepción pulsa "Reenviar activación" **entonces** recibe un email nuevo.
- **Dado** un socio con email sintético **entonces** no recibe bienvenida ni activación y recepción ve el aviso "sin email real".
- El listado de staff muestra "Pendiente activación" para quien aún no definió contraseña.

## 11. Riesgos y decisiones abiertas
1. ¿Vigencia del link de activación? (Recomendado: 7 días para activación y 1 hora para recuperación, usando tokens/flujos separados; Django solo permite un `PASSWORD_RESET_TIMEOUT` global → 3 días como piso.)
2. ¿Unificar en dj-rest-auth (`AllAuthPasswordResetForm`) o en el generador de Django para ambos flujos? (Recomendado: lo que haga pasar el test de ida y vuelta con menos código; probable: disparar el email de activación mediante el mismo serializer de dj-rest-auth.)
3. ¿Exigir email real en toda alta de socio? (Recomendado: sí; ver BK-SOC-01.)
4. Cuentas Google: ¿ofrecer "Crear contraseña"? (Recomendado: no ahora.)

## 12. Referencias
- `speckit/spec.md` REQ-1.2 (staff con email de activación) y REQ-1.3 (admin crea socio dispara activation email).
- Documentación dj-rest-auth (password reset confirm) y Django (`PasswordResetForm`, `PASSWORD_RESET_TIMEOUT`).
- Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", Auth → Recuperar / Nueva contraseña.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1 + dj-rest-auth 7.2.0 + allauth 65; React 18). Objetivo: que activación de cuenta y recuperación de contraseña funcionen de punta a punta, en español.
Hechos verificados: send_activation_email (backend/apps/users/services.py) usa django PasswordResetForm con plantillas por defecto de Django admin (inglés) y dominio de Site (example.com por defecto); todos los tests de staff mockean ese servicio (backend/apps/users/tests/test_staff_create.py); el confirm es el de dj-rest-auth (path en backend/core/urls.py) y se sospecha que valida con el token generator de allauth (distinto al de Django); ResetPasswordPage.jsx muestra errores crudos ('Invalid value'); StaffListSerializer no expone has_usable_password y AdminUsuariosPage.jsx:96 fija hasUsablePassword={true}; no hay reenvío de activación para socios; common/signals.py envía bienvenida a emails sintéticos socio_<dni>@winniegym.com.
TDD: PRIMERO escribí backend/apps/users/tests/test_activation_flow.py con el test de ida y vuelta sin mockear (crear staff -> parsear uid/token de mail.outbox -> POST /api/auth/password/reset/confirm/ -> login) y confirmá si falla. Luego arreglá lo mínimo para que pase, creá plantillas emails/account_activation y emails/password_reset (.html/.txt, español rioplatense, link a settings.FRONTEND_URL/reset-password/{uid}/{token}), fijá PASSWORD_RESET_TIMEOUT, agregá has_usable_password a StaffListSerializer, el endpoint POST /api/members/socios/{id}/reenviar-activacion/ (IsReceptionistOrAdmin; 400 si email sintético) y la guardia de sintético en la señal de bienvenida.
Frontend: ResetPasswordPage con estado 'enlace vencido' + CTA a /forgot-password y errores por campo; AdminUsuariosPage badge real; botón 'Reenviar activación' en SocioDetailModal (hook + servicio). Tests Vitest + RTL.
Terminado: pytest -q apps/users apps/members apps/common y npx vitest run && npm run lint verdes. No imprimas contraseñas ni tokens reales en logs/tests. Sin commits.
```
