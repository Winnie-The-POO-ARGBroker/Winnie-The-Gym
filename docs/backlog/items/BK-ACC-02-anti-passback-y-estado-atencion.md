---
id: BK-ACC-02
titulo: Anti-passback (doble entrada / salida sin entrada) y estado "Atención" en el terminal
tipo: feature
roles: [administrador, recepcionista]
prioridad: P1
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-ACC-01]
---

# BK-ACC-02 · Anti-passback y estado "Atención"

## 1. Resumen
Hoy el backend acepta cualquier secuencia de movimientos: dos `ENTRY` seguidos del mismo socio (con dos QR distintos o por DNI), o un `EXIT` sin `ENTRY`. Cada ENTRY duplicado suma al aforo y a `asistencias_mes`. La UI ya tiene un tercer estado visual "Atención" (`warning`) en `ValidationResult`, pero la página nunca lo emite (solo `success`/`error`). Esta ficha agrega la regla de presencia ("¿está adentro?") y usa ese estado.

## 2. Objetivo de usuario
Como **recepcionista** quiero **que el sistema me avise cuando un socio que ya figura adentro intenta entrar de nuevo (o sale sin haber entrado)** para **evitar préstamo de credencial, doble conteo en el aforo y datos sucios de asistencia**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend vista | `backend/apps/access/views.py:78-104` | `ScanQRView.post`: valida token → usuario activo → membresía. **No consulta el último movimiento del usuario.** Idem `ManualAccessView.post` (`views.py:158-190`). |
| Backend modelo | `backend/apps/access/models.py:22-30` | `DenialReason` (8 valores). No existe `ALREADY_INSIDE` ni `NOT_INSIDE`. `NO_MEMBERSHIP` (línea 28) está definido pero **nunca se emite** (`rg NO_MEMBERSHIP backend` solo da el modelo y un docstring). |
| Backend anti-replay | `backend/apps/access/utils.py:58-96` | `verify_and_consume_token` evita reusar el **mismo** `jti` (`cache.add`, key `qr_used:{jti}`, TTL = TTL del token + 60 s). No evita dos tokens distintos del mismo socio. |
| Backend agregados | `backend/apps/memberships/serializers.py:81-91` | `asistencias_mes` cuenta `ENTRY/GRANTED` del mes → se infla con entradas duplicadas. |
| Backend aforo | `backend/apps/access/services.py:15-38` | Aforo = ENTRY − EXIT del día (piso 0). Entradas duplicadas lo inflan. |
| Frontend página | `frontend/src/pages/recepcion/AccesoTerminalPage.jsx:29-34` | Solo asigna `status: 'success' \| 'error'`; nunca `'warning'`. |
| Frontend componente | `frontend/src/components/recepcion/ValidationResult.jsx:20,27,41-47,56` | Ya renderiza `warning` (borde ámbar, ícono `AlertCircle`, título "Atención") pero es código inalcanzable hoy. |
| Frontend mapeo | `frontend/src/components/recepcion/ValidationResult.jsx:5-11` | `DENIAL_REASONS` solo cubre 5 motivos (faltan `INVALID_SIGNATURE`, `INVALID_TOKEN`, `NO_MEMBERSHIP`, `REDIS_UNAVAILABLE`). |
| Frontend debounce | `frontend/src/pages/recepcion/AccesoTerminalPage.jsx:10-11,67-73` | `SCAN_DEBOUNCE_MS = 5000` global (no por token) y `SCAN_RESULT_DISPLAY_MS = 8000`. |
| Evidencia visual | `docs/qa/evidence/frontend/04-acceso-advertencia.png` | Captura de QA del estado de advertencia (de una iteración previa; verificar si coincide con el código actual). |

## 4. Alcance
**Incluye:**
- Función de presencia: "último movimiento GRANTED del usuario en el día local" → `inside` / `outside`.
- Regla ENTRY con presencia `inside` → respuesta de "Atención" (ya figura adentro) con acción explícita de recepción "Registrar igual" (override auditado).
- Regla EXIT con presencia `outside` → "Atención" (no figura adentro) pero se permite registrar.
- Mensaje claro cuando se re-escanea un QR ya consumido hace pocos segundos (hoy es un `REPLAY_ATTACK` rojo; se trata como advertencia "Ya registrado hace N s").
- Completar `DENIAL_REASONS` del front.

**No incluye:** molinete físico, geocercas, ventanas por sede (hay una sola sede), cierre automático de día (BK-ACC-07).

## 5. Contrato de API (propuesta, marcada **[A CREAR/MODIFICAR]**)
**[EXISTE → MODIFICAR] `POST /api/access/qr/scan/` y `POST /api/access/manual/`** — permiso `IsReceptionistOrAdmin`.
- Request nuevo campo opcional: `override` (`BooleanField`, default `False`) en `ScanQRSerializer`/`ManualAccessSerializer` (`serializers.py:13-30`). Con `override=true` y presencia conflictiva: se registra igual y se crea el log marcado (ver modelo).
- Nuevos valores `DenialReason`: `ALREADY_INSIDE` ("Socio ya registrado adentro"), `NOT_INSIDE` ("Salida sin ingreso previo").
- Comportamiento propuesto por defecto (`ACCESS_ANTIPASSBACK_MODE='block'`, setting nuevo en `core/settings/base.py`; valores `off|warn|block`):
  - ENTRY con presencia `inside` y `override=False`: `403`, `status: "DENIED"`, `denial_reason: "ALREADY_INSIDE"`, **y se crea `AccessLog` DENIED** (queda auditado; no afecta el aforo, que solo cuenta GRANTED).
  - Mismo caso con `override=True`: se crea un `EXIT` GRANTED sintético (mismo usuario, `scanned_by` = recepcionista, `source='OVERRIDE'`) y luego el `ENTRY` GRANTED, de modo que el aforo no se infle.
  - EXIT con presencia `outside`: `200 GRANTED` pero con campo `warning: "NOT_INSIDE"` en la respuesta (no se bloquea una salida real, solo se avisa).
  - `warn`: nunca bloquea; responde `warning` en ambos casos. `off`: comportamiento actual.
- Response (campos existentes `status, message, denial_reason, access_log` — `views.py:131-136`) + **nuevo** `warning: str|null`.
- Re-escaneo de QR ya consumido: cuando `verify_dynamic_qr_token` devuelve `REPLAY_ATTACK` y existe un `AccessLog` GRANTED con el mismo `qr_jti` (campo con `db_index`, `models.py:64-69`) de los últimos 60 s, el mensaje pasa a `"Ya registrado hace N segundos"`; el `denial_reason` sigue siendo `REPLAY_ATTACK` (no cambiar el contrato de auditoría).

## 6. Modelo de datos (propuesta)
- `AccessLog.source` → `CharField(max_length=20, choices=[QR, MANUAL, OVERRIDE, AUTO_CLOSE], default='QR')`. (Si BK-ACC-07 ya lo introdujo, reutilizarlo y agregar solo `OVERRIDE`/`MANUAL`.) Migración `0004_accesslog_source.py` en `backend/apps/access/migrations/` (hoy llegan hasta `0003_accesslog_choices_textchoices.py`). Backfill: `MANUAL` donde `qr_jti IS NULL`, `QR` en el resto.
- Ampliar `DenialReason` (migración de choices; las choices no se imponen a nivel DB, ver `0003`).
- Índice sugerido: `models.Index(fields=['user', '-timestamp'])` para la consulta de presencia.

## 7. Diseño frontend
- **Ruta/guard:** `/recepcion/acceso` ya protegida (`App.jsx:115-121`).
- **Estado:** extender `processAccess` en `AccesoTerminalPage.jsx:24-59`: si `data.warning` o `denial_reason in {'ALREADY_INSIDE','NOT_INSIDE'}` → `setScanResult({ status: 'warning', ... , canOverride: denial_reason==='ALREADY_INSIDE', lastRequest })`. Guardar el último request (`{kind:'qr'|'manual', payload}`) para reintentar con `override: true`.
- **ValidationResult** (`ValidationResult.jsx`): nueva prop `onOverride` y botón "Registrar igual" visible solo en `warning` + `canOverride`; agregar a `DENIAL_REASONS`: `ALREADY_INSIDE: 'El socio ya figura adentro'`, `NOT_INSIDE: 'No figura como ingresado'`, `INVALID_SIGNATURE: 'Código QR inválido'`, `INVALID_TOKEN: 'Código QR malformado'`, `NO_MEMBERSHIP: 'Socio sin membresía'`, `REDIS_UNAVAILABLE: 'Servicio de validación no disponible, usá el DNI'`.
- **Servicio:** `accessService.js` — agregar parámetro `options = { override }` a `scanQR`/`manualAccess` (`{ qr_token, access_type, override }`).
- **Textos (voseo):** título "Atención"; mensaje "Este socio ya figura adentro desde las 18:10. ¿Salió sin escanear?" / botones "Registrar igual" y "Cancelar".
- **Responsive:** botones apilados (`grid-cols-1`) a 375 px; lado a lado desde 640 px.
- Debounce: cambiar `lastScanRef` de timestamp global a `{token, at}` para no descartar el escaneo de **otro** socio dentro de los 5 s (`AccesoTerminalPage.jsx:67-70`).

## 8. Archivos a crear / modificar
- `backend/apps/access/models.py` (+ migración `0004`) — `source`, nuevos `DenialReason`.
- `backend/apps/access/services.py` — `get_presence(user) -> 'inside'|'outside'` y `evaluate_antipassback(...)`.
- `backend/apps/access/views.py`, `serializers.py` — `override`, `warning`.
- `backend/core/settings/base.py` — `ACCESS_ANTIPASSBACK_MODE = config('ACCESS_ANTIPASSBACK_MODE', default='block')`.
- `backend/apps/access/tests/test_antipassback.py` — nuevo.
- `frontend/src/pages/recepcion/AccesoTerminalPage.jsx`, `components/recepcion/ValidationResult.jsx`, `services/accessService.js` y sus tests.

## 9. Plan de pruebas (TDD)
Convenciones: igual que BK-ACC-01 (`pytest apps/access -q`, `APITestCase`, factories de `backend/conftest.py`, `@patch('apps.access.tasks.log_qr_event')`; frontend `npx vitest run`, mocks del `AccesoTerminal.test.jsx`).
Backend (rojo primero):
1. ENTRY → ENTRY mismo socio (2 tokens distintos) → 2º `403 ALREADY_INSIDE`, 2 logs, aforo = 1.
2. ENTRY → EXIT → ENTRY → 3º `200` (presencia volvió a `outside`).
3. ENTRY duplicado con `override=true` → `200`, se crean EXIT sintético (`source='OVERRIDE'`) + ENTRY, aforo = 1.
4. EXIT sin ENTRY → `200` con `warning == 'NOT_INSIDE'`.
5. Modo `off` (`@override_settings(ACCESS_ANTIPASSBACK_MODE='off')`) conserva el comportamiento viejo.
6. Presencia ignora logs del día anterior (no hay `freezegun` en `backend/requirements/`; crear los logs y retrocederles el `timestamp` con `AccessLog.objects.filter(...).update(timestamp=...)`, porque es `auto_now_add`).
7. Re-escaneo del mismo QR a los 10 s → `403 REPLAY_ATTACK` con mensaje "Ya registrado hace…".
8. Roles: socio → 403 al endpoint (`IsReceptionistOrAdmin`).
Frontend: `warning` se pinta ámbar; botón "Registrar igual" llama a `manualAccess(dni,'ENTRY',{override:true})`; `DENIAL_REASONS` cubre todos los valores de `AccessLog.DenialReason`.
Manual: con `recepcion@winnie.local` validar dos veces el DNI del socio demo activo.

## 10. Criterios de aceptación
- **Dado** un socio que ya ingresó hoy y no salió, **cuando** se valida otra entrada, **entonces** el terminal muestra "Atención — ya figura adentro" y el aforo no cambia.
- **Dado** esa advertencia, **cuando** recepción toca "Registrar igual", **entonces** el aforo queda igual (se cierra la sesión previa y se abre una nueva) y queda auditado quién lo hizo.
- **Dado** una salida de un socio que no figura adentro, **cuando** se registra, **entonces** se acepta con aviso y el aforo no baja de 0.

## 11. Riesgos y decisiones abiertas
- ¿Bloquear (`block`) o solo avisar (`warn`) por defecto? Recomendación: `block` + override, porque protege el aforo; si el gimnasio no escanea salidas hoy, arrancar en `warn` hasta que BK-ACC-01 esté en producción.
- ¿Ventana temporal (p. ej. "más de 4 h adentro = sesión vencida") en vez de "día completo"? Recomendación: ventana de 4 h configurable, evita bloquear a quien se olvidó de salir ayer.
- Interacción con `asistencias_mes`: con anti-passback en `block`, el conteo se corrige solo.

## 12. Referencias
- `backend/apps/access/utils.py:58-96` (anti-replay), `docs/qa/plan-de-pruebas.md` (US05 validación QR).
- Figma (opcional): "vistas live" → Recepción → Acceso, estado Atención.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django+DRF /backend, React+Vite+Vitest /frontend). Implementá anti-passback según docs/backlog/items/BK-ACC-02-anti-passback-y-estado-atencion.md (leelo completo) y asumí que BK-ACC-01 (modo Entrada/Salida en el terminal) ya está hecho.
Backend: AccessLog.source + DenialReason ALREADY_INSIDE/NOT_INSIDE (migración 0004 en backend/apps/access/migrations), services.get_presence(user) usando el último AccessLog GRANTED del día local (timezone America/Argentina/Buenos_Aires, USE_TZ=True), setting ACCESS_ANTIPASSBACK_MODE (off|warn|block, default block), campo override en ScanQRSerializer/ManualAccessSerializer, campo warning en la respuesta de ScanQRView/ManualAccessView. Con override se crea un EXIT sintético (source='OVERRIDE') y luego el ENTRY.
Frontend: estado 'warning' real en AccesoTerminalPage.processAccess, botón "Registrar igual" en ValidationResult, DENIAL_REASONS completo, scanQR/manualAccess con { override }, debounce por token.
TDD: escribí primero backend/apps/access/tests/test_antipassback.py (casos de la sección 9) y los tests RTL; después implementá. UI en español rioplatense (voseo); código en inglés. No toques backend/loadtests ni useScreenWakeLock.js.
Terminado: `cd backend && pytest -q` (cobertura >= 80 %) y `cd frontend && npx vitest run --coverage && npm run lint` en verde.
```
