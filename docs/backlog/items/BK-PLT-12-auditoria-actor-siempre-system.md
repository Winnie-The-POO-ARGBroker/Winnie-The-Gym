---
id: BK-PLT-12
titulo: Auditoría: el actor de los eventos de API queda como `system` (la identidad del usuario JWT no llega al middleware)
tipo: bug
roles: [administrador]
prioridad: P1
tamano: S
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-PLT-12 · Auditoría: el actor de los eventos de API queda como `system`

## 1. Resumen
El trail de auditoría en MongoDB (RNF04, "quién cambió qué") obtiene el actor con un middleware de Django que lee `request.user` ANTES de que DRF autentique el JWT. En una API con `JWTAuthentication` ese `request.user` es anónimo en ese punto, así que los eventos creados desde la API se registran con `actor_rol='system'`. **Esto se deduce leyendo el código; ningún test lo contradice ni lo prueba**, por eso el primer paso del ítem es un test que lo confirme.

## 2. Objetivo de usuario
Como **administrador** quiero **que cada cambio registrado indique quién lo hizo** para **poder investigar quién modificó un plan, un pago o un socio**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Settings | `backend/core/settings/base.py:54-72` | `MIDDLEWARE`: `AuthenticationMiddleware` (sesiones de Django) en `:63`, luego `apps.common.middleware.CurrentUserMiddleware` en `:69`. |
| Settings DRF | `backend/core/settings/base.py:174-177` | `DEFAULT_AUTHENTICATION_CLASSES = ('rest_framework_simplejwt.authentication.JWTAuthentication',)`: la autenticación JWT ocurre dentro de la vista DRF, después de todos los middlewares. |
| Middleware | `backend/apps/common/middleware.py:23-29` | `__call__` toma `user = getattr(request, 'user', None)` ANTES de `self.get_response(request)` y guarda en `_thread_locals.user` solo si `is_authenticated`; si no, `None`. Con sesión Django (admin de Django) sí funciona; con JWT, no. |
| Auditoría | `backend/apps/common/audit.py:58-72` | `_describe_actor()` usa `get_current_user()`; si es `None` devuelve `actor_rol='system'`, `actor_id=None`, `actor_email=None`. |
| Auditoría | `backend/apps/common/audit.py:164-171` | Modelos auditados: `Socio`, `PlanMembresia`, `Membresia`, `Clase`, `User`, `Pago`. No incluye `GymConfig` ni `Inscripcion`/`AccessLog`. |
| Auditoría | `backend/apps/common/audit.py:138-157` | `_dispatch` arma el payload con `timestamp, action, model, instance_id, object_id, snapshot, actor_*, request_id[, diff]`. |
| Mongo | `backend/core/mongodb.py:76-87` | `log_audit_event` → colección `audit_logs`. |
| Índices | `backend/apps/common/management/commands/create_mongo_indexes.py:49-58` | Índices por `timestamp`, `actor_id`, `action`, `model` y TTL de 90 días (`MONGO_RETENTION_DAYS`, `render.yaml`). |
| Tests | `backend/apps/common/tests/test_audit.py:86-90`, `test_audit_diff.py:187` | Solo prueban actor `system` sin request y que la clave `actor_email` exista. Ningún test hace una llamada HTTP autenticada por JWT y revisa el actor (`rg "actor_email\|actor_rol\|get_current_user" backend/apps --glob '*test*'` lo confirma). |
| Docs | `backend/apps/common/audit.py:10-14` | El docstring afirma que el actor se obtiene con `CurrentUserMiddleware` "when a request is in flight". |

## 4. Alcance
**Incluye:** test de regresión que haga una petición API autenticada con JWT, modifique un `PlanMembresia` y verifique que el evento tenga `actor_id`/`actor_email`/`actor_rol` correctos; corrección: fijar el usuario en el thread-local desde DRF (opción recomendada: clase base `AuditedAPIView`/mixin o sobreescribir `perform_authentication` — o un `JWTAuthentication` subclase que además llame a un setter `set_current_user(user)` en `apps/common/middleware.py`); limpiar el thread-local al finalizar.
**No incluye:** UI para consultar la auditoría (BK-PLT-13), auditar modelos nuevos (se menciona `GymConfig` como mejora), acciones de lectura.

## 5. Contrato de API
Sin cambios de API. Cambia el contenido de los documentos de `audit_logs` (los campos ya existen: `actor_id`, `actor_user_id`, `actor_email`, `actor_rol`).

## 6. Modelo de datos
Sin cambios de modelo ni de migración de Postgres. Los eventos históricos ya guardados con actor `system` no se pueden recuperar.

## 7. Diseño frontend
Sin cambios de frontend.

## 8. Archivos a crear / modificar
- Modificar `backend/apps/common/middleware.py`: agregar `set_current_user(user)` (setter) y mantener el reset en `finally`.
- Crear `backend/apps/common/authentication.py`: `class AuditJWTAuthentication(JWTAuthentication)` que tras autenticar llame `set_current_user(user)`; apuntar `DEFAULT_AUTHENTICATION_CLASSES` (`base.py:175`) a ella. **Cuidado:** el middleware limpia en `finally` en el mismo hilo (sincrónico); en consumers ASGI/Celery no aplica.
- Agregar `('common', 'GymConfig')` a `_AUDITED_MODELS` (`audit.py:164`) si el dueño lo aprueba.
- Tests nuevos en `backend/apps/common/tests/test_audit_actor.py`.

## 9. Plan de pruebas (TDD)
Convención: pytest + `APITestCase`; `core.settings.test`; helper de auth usado en `apps/common/tests/test_gym_config.py:12-14` (`RefreshToken.for_user(user).access_token` + `client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')`); los tests de auditoría usan Mongo real (`get_collection('audit_logs')`, helpers `_clean_audit_collection()` y `_last_audit(model)` en `apps/common/tests/test_audit.py:14-35`; el CI levanta `mongo:7`), por lo que el nuevo test debe seguir ese patrón con `TestCase`/`APITestCase` + `setUp/tearDown` que limpian la colección. Correr: `cd backend && pytest apps/common/tests -q`.
Escribir primero (deben FALLAR hoy):
- Admin con JWT hace `PATCH /api/memberships/planes/{id}/` (ruta verificada en `memberships/urls.py`: router `planes`) → el payload enviado a `log_audit_event` tiene `actor_email == admin.email` y `actor_rol == 'administrador'`.
- Request sin autenticar (rechazada) no deja usuario en el thread-local.
- Tras la respuesta, `get_current_user()` es `None` (sin fuga entre requests).
- Evento disparado desde una tarea Celery (`CELERY_TASK_ALWAYS_EAGER`) sigue como `system`.
- Manual: cambiar el precio de un plan con el admin de `seed_demo_users` y consultar `audit_logs` en Mongo (solo lectura).

## 10. Criterios de aceptación
- **Dado** un admin autenticado por JWT **cuando** modifica un plan por la API **entonces** el evento de auditoría registra su id, email y rol.
- **Dado** una tarea en segundo plano **cuando** modifica un modelo auditado **entonces** el actor sigue siendo `system`.
- **Dado** peticiones concurrentes **cuando** terminan **entonces** no hay fuga de actor entre ellas.

## 11. Riesgos y decisiones abiertas
- Thread-local con ASGI/Daphne: las vistas DRF síncronas corren en `sync_to_async` con hilo por request; validar que no haya reutilización con estado sucio (el `finally` del middleware lo cubre).
- Alternativa más robusta: `contextvars` en vez de `threading.local`. **Recomendación:** `contextvars` (ya se usa para `request_id`, `core/middleware/request_id.py`).
- ¿Auditar `GymConfig` y `Inscripcion`? **Recomendación:** sí `GymConfig` (cambios de aforo/horarios afectan la operación).

## 12. Referencias
- RNF04 (README:56, CHANGELOG:127 y :361), `docs/qa/plan-de-pruebas.md:73`. Relacionado: BK-PLT-13.

## 13. Prompt listo para un agente de IA
```
Contexto: backend Django 5 + DRF (JWT). apps/common/middleware.py::CurrentUserMiddleware guarda request.user en un thread-local ANTES de que DRF autentique el JWT, por lo que apps/common/audit.py::_describe_actor devuelve actor 'system' para cambios hechos vía API (docs/backlog/items/BK-PLT-12-auditoria-actor-siempre-system.md).
Tarea: TDD primero — escribí apps/common/tests/test_audit_actor.py con un PATCH autenticado por JWT que verifique actor_email/actor_rol en el payload de log_audit_event (el test debe fallar antes del fix; si NO falla, documentalo y detenete). Luego corregí: agregá set_current_user en middleware.py (o migrá a contextvars) y una subclase de JWTAuthentication que lo llame; configurala en REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES']. Verificá que no haya fuga entre requests y que Celery siga como 'system'.
Terminado: `cd backend && pytest -q` verde con cobertura >= 80.
```
