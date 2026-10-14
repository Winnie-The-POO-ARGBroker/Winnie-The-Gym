---
id: BK-PLT-06
titulo: Email de activación de staff y de reseteo de contraseña usan la plantilla genérica de Django (sin marca, texto inadecuado, dominio de Site sin configurar)
tipo: bug
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-PLT-06 · Email de activación de staff y de reseteo de contraseña usan la plantilla genérica de Django

## 1. Resumen
Los 4 emails transaccionales de negocio (bienvenida, alerta de vencimiento, confirmación de pago, clase cancelada) usan plantillas HTML con marca bajo `backend/apps/common/templates/emails/`. El email de **activación de cuenta de staff** y el de **reseteo de contraseña** NO: reutilizan la plantilla de texto plano de `django.contrib.admin` ("You're receiving this email because you requested a password reset…"), que habla de un reset que el usuario no pidió cuando se trata de una activación y usa `{{ site_name }}`/`{{ domain }}` del framework `django.contrib.sites`, que ningún código del repo configura.

## 2. Objetivo de usuario
Como **administrador** quiero **que el empleado nuevo reciba un email claro y con la marca del gimnasio con un link que funcione** para **que pueda activar su cuenta sin confusión ni soporte**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend servicio | `backend/apps/users/services.py:16-44` | `send_activation_email(user)` usa `PasswordResetForm(data={'email': ...}).save(request=None, use_https=True, from_email=None, email_template_name='registration/password_reset_email.html', subject_template_name='registration/password_reset_subject.txt')`. Excepciones solo se loguean con `logger.warning` (`:43-44`). |
| Backend plantillas | búsqueda `fd password_reset` en `backend/` | El repo NO define `registration/password_reset_email.html` ni el subject: se usan las de `django.contrib.admin` (instalado, `core/settings/base.py:22`). Contenido (Django 5.x, verificado en el paquete local): "You're receiving this email because you requested a password reset for your user account at {{ site_name }}. … {{ protocol }}://{{ domain }}{% url 'password_reset_confirm' uidb64=uid token=token %}". |
| Backend URL | `backend/core/urls.py` (`password_reset_confirm_redirect` y ruta `api/auth/password/reset/confirm/<uidb64>/<token>/`) | El link apunta al backend y este redirige a `FRONTEND_URL/reset-password/{uid}/{token}`. |
| Backend settings | `backend/core/settings/base.py:28,131` | `django.contrib.sites` instalado y `SITE_ID = 1`. `rg "Site\b\|example.com" backend/apps core` no encuentra código ni migración que fije dominio/nombre → quedan los valores por defecto de Django (`example.com`) salvo que se editen a mano en el admin de producción. **No verificado en producción.** |
| Backend vistas | `backend/apps/users/views.py:93-126` | `StaffView.perform_create` (`:112-114`) y `StaffResendActivationView.post` (`:124-126`) llaman `send_activation_email`. |
| Backend reset | `backend/apps/users/views.py:42-63` | `SafePasswordResetView` (dj-rest-auth) captura cualquier excepción de envío y responde siempre 200 `{'detail': 'Password reset e-mail has been sent.'}`. Los fallos de entrega son invisibles para el usuario. |
| Backend email infra | `backend/apps/common/emails.py:25-71`, `backend/apps/common/tasks.py:11-40` | `send_templated_email` + `enqueue_email` (Celery, `max_retries=3`, reintento 60 s) con base `_base.html`. El flujo de activación NO pasa por aquí: se envía síncrono por el request, sin cola ni reintentos y sin `category`. |
| Backend modelo | `backend/apps/users/serializers.py:98-107` | `StaffCreateSerializer.create` deja la contraseña "unusable"; la cuenta solo se activa por el flujo de reset. |
| Backend settings idioma | `backend/core/settings/base.py:120` | `LANGUAGE_CODE = 'es-ar'` (la plantilla admin se traduce al español de Django, igualmente genérico). |
| Frontend | `frontend/src/pages/ResetPasswordPage.jsx:33`, `frontend/src/services/staffService.js:31` | La página `/reset-password/:uid/:token` hace `POST /auth/password/reset/confirm/`; `resendActivation(id)` llama `POST /users/staff/{id}/resend-activation/`. |
| Tests | `backend/apps/users/tests/test_staff_create.py:39-119` | Mockean `apps.users.views.send_activation_email`; no se prueba el contenido real del email ni que el link apunte al frontend. |

## 4. Alcance
**Incluye:** (1) plantillas propias `emails/staff_activation.html/.txt` y `emails/password_reset.html/.txt` basadas en `_base.html`; (2) construir el link directamente con `FRONTEND_URL` (`{{ frontend_url }}/reset-password/{uid}/{token}`) generado con `default_token_generator` + `urlsafe_base64_encode`, sin depender de `Site`; (3) enviar por `enqueue_email` (reintentos Celery); (4) sobreescribir el email de reset de dj-rest-auth con un `PasswordResetSerializer` propio (`REST_AUTH['PASSWORD_RESET_SERIALIZER']`) para usar la misma plantilla; (5) tests del contenido y del link.
**No incluye:** cambiar el flujo de activación (sigue siendo set-password), invitaciones con expiración propia, emails a socios (ya tienen `welcome`).

## 5. Contrato de API
Sin cambios de contrato. **[EXISTE]** `POST /api/users/staff/` (`IsAdminOnly`; body `{email, rol, first_name, last_name}` → 201 `{id, email, rol, first_name, last_name}` según `StaffCreateSerializer.Meta.fields`); `POST /api/users/staff/{id}/resend-activation/` → 200 `{"detail": "Activation email re-sent."}`; `POST /api/auth/password/reset/` (body `{email}`) → siempre 200. Nota: el detalle en inglés es parte del contrato actual; el frontend no lo muestra textualmente (No verificado).

## 6. Modelo de datos
Sin cambios de modelo. Si se quiere dejar de depender de `Site`, no hace falta migración.

## 7. Diseño frontend
Sin cambios de frontend. Verificar que el link generado cae en la ruta `frontend/src/App.jsx:71` (`/reset-password/:uid/:token`, envuelta en `PublicRoute`; si el staff ya tiene sesión abierta en el navegador será redirigido a su home: documentar como caso borde).

## 8. Archivos a crear / modificar
- Crear `backend/apps/common/templates/emails/staff_activation.html` y `.txt`, `password_reset.html` y `.txt` (extienden `_base.html`, bloques `subject`/`content` como las plantillas existentes).
- Modificar `backend/apps/users/services.py`: reescribir `send_activation_email` para generar `uid`/`token` y llamar `enqueue_email(template_base='staff_activation', subject='Activá tu cuenta en Winnie The Gym', to=[user.email], context={'nombre', 'rol', 'activation_url'}, category='staff_activation')`.
- Crear `backend/apps/users/serializers.py::BrandedPasswordResetSerializer` (subclase de `dj_rest_auth.serializers.PasswordResetSerializer`; No verificado el nombre exacto de la clase en la versión instalada) y registrarlo en `REST_AUTH` (`core/settings/base.py:~232`).
- Tests nuevos en `backend/apps/users/tests/test_activation_email.py`.

## 9. Plan de pruebas (TDD)
Convención: pytest + `APITestCase`/`TestCase`; `core.settings.test` usa `EMAIL_BACKEND` locmem y `CELERY_TASK_ALWAYS_EAGER=True` (`core/settings/test.py:13-17`); fixtures `make_user_factory`, etc. en `backend/conftest.py`. Patrón: `apps/common/tests/test_welcome_signal.py` (usa `mail.outbox`). Correr: `cd backend && pytest apps/users -q` (requiere Postgres/Redis/Mongo como en CI) o `docker compose exec backend pytest -q`; el CI exige cobertura global >= 80 (`pytest.ini`).
Casos primero:
- Crear staff por API (admin autenticado) → `mail.outbox` con 1 mensaje, asunto en español, cuerpo con `settings.FRONTEND_URL + '/reset-password/'` y sin la cadena "requested a password reset".
- `resend-activation` por recepcionista → 403 (ya cubierto; mantener) y por admin → 200 + email.
- El `uid` y `token` del link validan con `default_token_generator.check_token`.
- Fallo de `send_templated_email` no rompe la creación del usuario (ya hoy es no fatal).
- Reset por `POST /api/auth/password/reset/` con email existente → email con plantilla de marca; email inexistente → 200 sin email.
- Manual: crear staff desde `/admin/usuarios` (admin) y abrir el email en Mailtrap; abrir el link en ventana privada.

## 10. Criterios de aceptación
- **Dado** que un admin crea un recepcionista **cuando** se envía el email **entonces** es un email de marca, en español, que dice que es una invitación y el botón/link lleva a `FRONTEND_URL/reset-password/<uid>/<token>`.
- **Dado** un fallo transitorio del proveedor **cuando** se envía **entonces** Celery reintenta hasta 3 veces (60 s).
- **Dado** `Site` con dominio por defecto **cuando** se envía **entonces** el link sigue siendo correcto.

## 11. Riesgos y decisiones abiertas
- ¿El link de activación debe tener una vigencia distinta a `PASSWORD_RESET_TIMEOUT` (default Django 3 días)? **Recomendación:** mantener el default y mencionar la vigencia en el email.
- El envío por Celery implica que en Render Free el worker corre junto con web (`backend/Procfile`, `--concurrency=1`); un worker caído demora el email. Alternativa: mantener síncrono con reintento. **Recomendación:** Celery (ya es el patrón del repo).
- Confirmar en producción qué dominio tiene `Site` (No verificado).

## 12. Referencias
- `backend/apps/common/emails.py`, `backend/apps/common/templates/emails/`, `backend/apps/users/services.py`, `docs/deploy.md`.
- Relacionados: BK-PLT-08 (comunicaciones).

## 13. Prompt listo para un agente de IA
```
Contexto: Django 5 + DRF + Celery + Anymail/Mailtrap. backend/apps/users/services.py::send_activation_email usa PasswordResetForm con la plantilla genérica de django.contrib.admin (sin marca, dice "requested a password reset", depende de Site/example.com). Los otros emails usan backend/apps/common/emails.py + enqueue_email (Celery) y plantillas en backend/apps/common/templates/emails/ que extienden _base.html.
Tarea (docs/backlog/items/BK-PLT-06-email-activacion-staff-y-reset-sin-marca.md): TDD primero — apps/users/tests/test_activation_email.py con mail.outbox (patrón de apps/common/tests/test_welcome_signal.py): asunto en español, link = settings.FRONTEND_URL + /reset-password/<uid>/<token> con token válido (default_token_generator), sin texto "requested a password reset". Luego creá las plantillas staff_activation y password_reset (.html/.txt, extienden _base.html), reescribí send_activation_email para usar enqueue_email, y reemplazá el serializer de reset de dj-rest-auth por uno que use la misma plantilla (REST_AUTH['PASSWORD_RESET_SERIALIZER']). No cambies los contratos de los endpoints.
Terminado: `cd backend && pytest -q` verde con cobertura >= 80.
```
