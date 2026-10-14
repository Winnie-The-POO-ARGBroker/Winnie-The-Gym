---
id: BK-ACC-12
titulo: Seguridad y auditoría del acceso (logs inmutables, auditoría Mongo que no reintenta ni expira, rate limiting, WebSocket)
tipo: deuda-tecnica
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: M
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-ACC-12 · Seguridad y auditoría del control de acceso

## 1. Resumen
El módulo de acceso tiene buenas bases (HMAC, anti-replay atómico, ownership en logs, permisos por rol), pero la auditoría tiene huecos que se descubren leyendo el código: los reintentos de Celery nunca se disparan, la retención de 90 días en Mongo no funciona con el tipo de dato que se guarda, los logs de Postgres se pueden borrar desde el admin de Django, no hay rate limiting en ningún endpoint y el WebSocket tiene detalles de autenticación mejorables.

## 2. Objetivo de usuario
Como **administrador** quiero **que cada acceso quede registrado de forma inalterable y que el sistema resista abuso** para **tener trazabilidad confiable (RNF04) y reducir riesgo operativo**.

## 3. Estado actual en el código (evidencia)
| # | Tema | Archivo:línea | Qué hay hoy |
|---|---|---|---|
| 1 | Retry Celery muerto | `backend/apps/access/tasks.py:11-22` y `backend/core/mongodb.py:63-73` | `log_qr_event_task` hace `try: log_qr_event(payload) except Exception: ... self.retry(...)`. Pero `log_qr_event` **captura todas las excepciones** y devuelve `False` (`mongodb.py:70-73`); la tarea nunca recibe una excepción, no reintenta y descarta el valor de retorno. Si Mongo está caído el evento se pierde sin rastro más que un `logger.error`. |
| 2 | TTL de retención | `backend/apps/common/management/commands/create_mongo_indexes.py:35-47`, `backend/apps/access/views.py:119,202-205`, `docs/database/mongo-schemas.md:25,41,58` | El índice TTL se crea sobre `timestamp`, pero el payload guarda `"timestamp": timezone.now().isoformat()` (**string** ISO; el propio doc lo declara "ISO 8601 string"). Los índices TTL de MongoDB solo expiran campos de tipo fecha (BSON Date), por lo que los documentos probablemente **nunca expiran** (`MONGO_RETENTION_DAYS=90`, `base.py:404`). **No verificado contra una instancia real**: confirmar con `db.qr_history.getIndexes()` y revisando el tipo del campo. |
| 3 | Logs mutables | `backend/apps/access/admin.py:5-11`, `models.py:32-39,71-78` | `AccessLogAdmin` define `readonly_fields` pero no sobreescribe `has_add_permission`/`has_delete_permission`/`has_change_permission` → el superusuario puede borrar logs (acción masiva "Eliminar seleccionados" del admin). `user` y `scanned_by` son `on_delete=SET_NULL`: al borrar un usuario los logs pierden la atribución. No hay hash/encadenado de integridad. |
| 4 | Rate limiting | `backend/core/settings/base.py:174-190` | `REST_FRAMEWORK` no define `DEFAULT_THROTTLE_CLASSES` ni `DEFAULT_THROTTLE_RATES` (`rg -i throttl backend` no devuelve nada). `GET /api/access/qr/generate/` (cualquier usuario autenticado), `POST /qr/scan/` y `POST /manual/` no tienen límite: un token de recepción robado puede enumerar DNIs (la respuesta devuelve nombre/email del socio en `access_log`, `serializers.py:35-37`) y un socio puede generar tokens sin tope. |
| 5 | Fail-open de anti-replay | `backend/apps/access/utils.py:58-96`; `rg ACCESS_ANTIREPLAY_FAIL_OPEN backend` | El flag solo se lee con `getattr(settings, 'ACCESS_ANTIREPLAY_FAIL_OPEN', False)`: no está declarado en `core/settings/*.py` (ni en el `.env.example`, **No verificado**). Ante caída de Redis con flag en `False` se deniega con motivo `'REDIS_UNAVAILABLE'`, valor que **no existe** en `AccessLog.DenialReason` (`models.py:22-30`) ni en el mapa del front (`ValidationResult.jsx:5-11`). Con fail-open, `verify_dynamic_qr_token` devuelve `True, None` y se pierde la marca de "modo degradado" en el log. |
| 6 | Exposición de datos al socio | `backend/apps/access/serializers.py:35-59`, `views.py:245-261` | El socio recibe `scanned_by`/`scanned_by_email` (email del recepcionista) y `qr_jti` en sus propios logs (ver BK-ACC-04). |
| 7 | WebSocket: token en URL | `frontend/src/hooks/useWebSocket.js:45`, `backend/core/ws_auth.py:38-43` | JWT de acceso como `?token=` (queda en logs de proxy/servidor). Limitación conocida de WebSockets de navegador. |
| 8 | WebSocket: usuario inactivo | `backend/core/ws_auth.py:18-35`, `backend/apps/access/consumers.py:20-27,58-64` | Resuelve el usuario por `pk` sin chequear `is_active`; `_is_authorized` tampoco. Un usuario desactivado conserva el WS hasta que expire su access token (30 min, `base.py:220`). |
| 9 | WebSocket: Origin | `backend/core/asgi.py:17-23` | `ProtocolTypeRouter` sin `AllowedHostsOriginValidator`. Riesgo bajo (la auth es por token, no por cookie) pero es hardening estándar de Channels. |
| 10 | Roles que validan | `backend/apps/access/permissions.py:4-19` | `IsReceptionistOrAdmin`: staff/superuser o `rol in ('administrador','recepcionista')`. Coherente con el WebSocket (`consumers.py:58-64`) y con `AforoStatsView`. OK. |
| 11 | Trazabilidad del dispositivo | `backend/apps/access/models.py:71-78` | Se guarda `scanned_by` (usuario) pero no desde qué terminal/IP; hay un middleware de `X-Request-ID` en el front (`api.js:41-56`), pero el `AccessLog` no guarda el request id. |
| 12 | Tests | `backend/apps/access/tests/test_qr_utils.py`, `test_manual_access.py`, `test_aforo_websocket.py` | Cubren firma, replay, ownership y rol. No hay tests de: retry de Mongo, TTL, admin, throttling, WS con usuario inactivo. |

## 4. Alcance
**Incluye:** (1) retry real de auditoría Mongo; (2) TTL funcional (guardar `datetime` UTC, no string) + migración de datos; (3) inmutabilidad de `AccessLog` (admin read-only, sin delete; `PROTECT`/`DO_NOTHING` de atribución según decisión); (4) rate limiting por scope; (5) `REDIS_UNAVAILABLE` como motivo y marca de modo degradado; (6) hardening del WebSocket (inactivo + Origin); (7) request id en logs.
**No incluye:** firma digital/blockchain de logs, SIEM externo, rate limiting de login (hallazgo para el área de plataforma/usuarios), anti-passback (BK-ACC-02), historial (BK-ACC-03).

## 5. Contrato de API
Sin endpoints nuevos. Cambios de comportamiento:
- **Throttling** (DRF `ScopedRateThrottle`, `throttle_scope` por vista; tasas en `REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']`): `qr_generate` = `30/min` por usuario (el front pide 2/min normalmente), `qr_scan` = `120/min` por usuario, `access_manual` = `60/min`. Superado el límite → `429 {"detail": "Request was throttled. Expected available in N seconds."}` (formato DRF). El front debe tratar 429 en el terminal con el mensaje "Demasiados intentos, esperá unos segundos".
- **Respuesta de escaneo** [EXISTE]: cuando `denial_reason == 'REDIS_UNAVAILABLE'` mostrar mensaje propio (BK-ACC-02 amplía `DENIAL_REASONS`).
- El throttle de DRF usa el cache default (Redis): si Redis cae, `cache.get/set` lanza una excepción y la request termina en 500. Decidir si se envuelve en una clase de throttle propia que ante error del cache deje pasar (fail-open) y registre el problema.

## 6. Modelo de datos
- `AccessLog.DenialReason`: agregar `REDIS_UNAVAILABLE` ("Servicio de validación no disponible") y migración de choices (`apps/access/migrations/0004...`).
- (Opcional) `AccessLog.request_id = CharField(max_length=64, blank=True, db_index=True)` poblado desde el header `X-Request-ID`.
- Atribución: cambiar `user`/`scanned_by` de `SET_NULL` a `PROTECT` **o** snapshot de datos (`user_email_snapshot`, `user_dni_snapshot`) — decisión abierta (ver sección 11).
- Mongo: guardar `timestamp` como `datetime` (`timezone.now()` aware, `mongo_payload["timestamp"] = timezone.now()`), y script de migración que convierta documentos existentes (`$toDate`) antes de recrear el índice TTL (`create_mongo_indexes` ya existe y refresca indexes).

## 7. Diseño frontend
- Terminal: manejar `429` y `REDIS_UNAVAILABLE` con copy claro (ver BK-ACC-09 para el manejo de errores de red); toast `sonner`.
- `useWebSocket`: sin cambios funcionales; documentar que `?token=` es una limitación. Si el backend cierra con 4403 por usuario inactivo, el hook ya detiene los reintentos (`useWebSocket.js:110-115`).
- Sin pantallas nuevas.

## 8. Archivos a crear / modificar
Backend: `apps/access/{tasks,admin,models,views}.py`, `core/mongodb.py` (que `log_qr_event` re-lance la excepción o devuelva/propague el error para que Celery reintente), `core/ws_auth.py`, `apps/access/consumers.py`, `core/asgi.py`, `core/settings/base.py` (throttles, `ACCESS_ANTIREPLAY_FAIL_OPEN = config(..., cast=bool, default=False)`), `apps/common/management/commands/create_mongo_indexes.py` (verificar tipo), migración, tests.
Frontend: `components/recepcion/ValidationResult.jsx`, `pages/recepcion/AccesoTerminalPage.jsx`.

## 9. Plan de pruebas (TDD)
Convención: pytest + pytest-django, `APITestCase`, `core.settings.test` (LocMemCache, Celery eager, Mongo de prueba `winnie_gym_logs_test`).
1. **Retry:** parchear `core.mongodb.get_collection` para lanzar `ConnectionFailure` y verificar que `log_qr_event_task` reintenta (`task.retry` llamado / `Retry` propagado con `CELERY_TASK_EAGER_PROPAGATES=True`, `test.py:14-16`). Hoy este test fallaría (la excepción se traga).
2. **TTL/tipo:** `mongo_payload['timestamp']` es `datetime` aware (no `str`); test del comando `create_mongo_indexes` + inserción real en Mongo de prueba y `index_information()` (saltar si no hay Mongo disponible).
3. **Admin inmutable:** con `AdminSite`/cliente superuser, `AccessLogAdmin().has_delete_permission(request)`/`has_add_permission`/`has_change_permission` → `False`; `POST` de la acción `delete_selected` no borra.
4. **Throttle:** con `@override_settings(REST_FRAMEWORK={..., 'DEFAULT_THROTTLE_RATES': {'qr_scan': '2/min', ...}})` la 3ª llamada a `/api/access/qr/scan/` → 429; limpiar `cache.clear()` en `setUp` (los contadores viven en el cache).
5. **Redis caído:** `@patch('apps.access.utils.cache.add', side_effect=Exception)` → `403`, `denial_reason == 'REDIS_UNAVAILABLE'` y el log se persiste; con `ACCESS_ANTIREPLAY_FAIL_OPEN=True` → 200 y el log queda marcado (campo `source`/nota de modo degradado).
6. **WS inactivo:** usuario `is_active=False` con token válido → cierre 4401/4403 (extender `test_aforo_websocket.py`, que ya tiene los helpers `_make_user`, `_token_for`, `_connect`).
7. Frontend: `ValidationResult` mapea `REDIS_UNAVAILABLE`; el terminal muestra el copy de 429 (mock de `manualAccess` que rechaza con `{ response: { status: 429 } }`).
Manual: apagar Redis en Docker Compose y escanear; detener Mongo y revisar que el evento se reintenta y se registra al volver.

## 10. Criterios de aceptación
- **Dado** que Mongo está caído, **cuando** se registra un acceso, **entonces** el evento se reintenta (3 veces, 30 s) y, si sigue fallando, queda un error visible (log/Sentry) en lugar de perderse en silencio.
- **Dado** un `AccessLog` existente, **cuando** un superusuario entra al admin de Django, **entonces** no puede editarlo ni eliminarlo.
- **Dado** 61 pedidos a `/api/access/manual/` en un minuto del mismo usuario, **cuando** llega el 61º, **entonces** responde 429.
- **Dado** documentos con `timestamp` fecha, **cuando** pasa el período de retención, **entonces** MongoDB los elimina (verificado en `qr_history`).

## 11. Riesgos y decisiones abiertas
- Retención/legal: ¿cuánto tiempo se conservan datos de acceso (PII) en Postgres? Hoy es indefinido. Recomendación: definirlo con el dueño del producto (política de retención y baja de socio), por ejemplo 24 meses y anonimización posterior.
- `SET_NULL` vs `PROTECT` en `AccessLog.user`: `PROTECT` impide borrar usuarios con historial (ya hay baja lógica de socio, `dar_baja` en `apps/members/services.py`); recomendación: `PROTECT` + baja lógica; revisar `cleanup_orphan_socios`.
- Migrar el `timestamp` de Mongo a `Date` requiere un job único (`updateMany` con pipeline `$toDate`). Riesgo bajo.
- Límite de throttle por IP vs por usuario: recomendación: por usuario (recepción comparte IP).
- Hallazgo fuera de alcance: no hay throttling en login/registro (`apps/users`); derivar al área de plataforma.

## 12. Referencias
- `docs/database/mongo-schemas.md`, `docs/reports/rnf01-rnf06.md`, `docs/qa/plan-de-pruebas.md` (seguridad: anti-replay, HMAC, gating por rol), RNF04 (trazabilidad) y RNF06 (disponibilidad) en el README.
- Figma: no aplica (sin UI nueva).

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1 + DRF + Channels + Celery + PostgreSQL + MongoDB/pymongo). Implementá docs/backlog/items/BK-ACC-12-seguridad-y-auditoria-del-acceso.md en este orden, TDD (tests primero con pytest; correr `cd backend && pytest apps/access apps/common -q`):
(1) core/mongodb.log_qr_event traga las excepciones y devuelve False, por lo que apps/access/tasks.log_qr_event_task nunca reintenta: escribí el test (patch de core.mongodb.get_collection con ConnectionFailure; CELERY_TASK_EAGER_PROPAGATES ya es True en core/settings/test.py) y corregí para que la tarea reintente.
(2) El payload de Mongo guarda timestamp como string ISO (apps/access/views.py ~119 y ~202) y el TTL de create_mongo_indexes necesita Date: guardá datetime aware y agregá un comando/script de migración de datos.
(3) AccessLogAdmin (apps/access/admin.py): has_add/change/delete_permission = False.
(4) Throttling DRF con ScopedRateThrottle (scopes qr_generate 30/min, qr_scan 120/min, access_manual 60/min) y ACCESS_ANTIREPLAY_FAIL_OPEN declarado en core/settings/base.py; DenialReason.REDIS_UNAVAILABLE con migración.
(5) WS: core/ws_auth.py y apps/access/consumers.py rechazan usuarios is_active=False; agregar AllowedHostsOriginValidator en core/asgi.py (ajustar los tests de apps/access/tests/test_aforo_websocket.py si el Origin es requerido).
(6) Frontend mínimo: ValidationResult.jsx mapea REDIS_UNAVAILABLE y AccesoTerminalPage muestra copy para 429 ("Demasiados intentos, esperá unos segundos").
No toques backend/loadtests ni frontend/src/hooks/useScreenWakeLock.js. Código en inglés; textos UI en español rioplatense.
Terminado: `cd backend && pytest -q` (cobertura >= 80 %) y `cd frontend && npx vitest run && npm run lint` en verde.
```
