---
id: BK-ACC-01
titulo: Terminal de acceso sin flujo de salida (todo se registra como ENTRY) y salida bloqueada por membresía vencida
tipo: bug
roles: [administrador, recepcionista]
prioridad: P0
tamano: M
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-ACC-01 · Terminal de acceso sin flujo de salida

## 1. Resumen
El backend soporta `access_type = 'EXIT'`, pero la pantalla `AccesoTerminalPage` manda siempre `'ENTRY'` (hardcodeado) y no ofrece ningún control de "Registrar salida". Resultado: desde la UI el aforo solo sube (nunca baja) y el monitor de aforo, los dashboards y el reporte de permanencia quedan inflados. Además, si se enviara una salida de un socio con membresía vencida, el backend la **deniega** (valida membresía también en EXIT), dejando al socio "adentro" para siempre.

## 2. Objetivo de usuario
Como **recepcionista** quiero **registrar la salida de un socio escaneando su QR o ingresando su DNI** para **que el aforo en vivo refleje cuánta gente hay realmente adentro**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/access/models.py:14-16` | `AccessType` = `ENTRY` ("Ingreso") / `EXIT` ("Egreso"). |
| Backend API | `backend/apps/access/serializers.py:13-30` | `ScanQRSerializer` y `ManualAccessSerializer` aceptan `access_type` (`ChoiceField`, default `ENTRY`). Ya soporta `EXIT`. |
| Backend API | `backend/apps/access/views.py:92-98` | En `ScanQRView.post` se valida `is_active` + `has_active_membership` **sin distinguir ENTRY/EXIT** → una salida de socio vencido queda `DENIED / MEMBERSHIP_INACTIVE`. Idem `ManualAccessView.post` (`views.py:179-185`). |
| Backend servicio | `backend/apps/access/services.py:15-38` | `compute_aforo_actual` = ENTRY GRANTED − EXIT GRANTED del día, con piso en 0. Un EXIT denegado no descuenta. |
| Frontend página | `frontend/src/pages/recepcion/AccesoTerminalPage.jsx:63` | `manualAccess(manualDni, 'ENTRY')` — hardcodeado. |
| Frontend página | `frontend/src/pages/recepcion/AccesoTerminalPage.jsx:72` | `scanQR(token, 'ENTRY')` — hardcodeado. |
| Frontend componente | `frontend/src/components/recepcion/ValidationResult.jsx:13` | Recibe `onRegisterExit: _onRegisterExit` (prop sin uso, prefijo `_` para silenciar el lint). No hay botón de salida. |
| Frontend servicio | `frontend/src/services/accessService.js:9,23` | `scanQR(qrToken, accessType='ENTRY')` y `manualAccess(dni, accessType='ENTRY')` ya aceptan `'EXIT'`. |
| Frontend test | `frontend/src/services/__tests__/accessService.test.js` | Ya hay un caso que verifica el envío de `EXIT` en el service (la brecha está en la página). |
| Frontend test | `frontend/src/pages/recepcion/__tests__/AccesoTerminal.test.jsx:41-44` | Verifica el texto `Aforo 150/200` (cuando se haga BK-ACC-05 hay que actualizarlo). |

Confirmación de que el aforo solo sube por UI: `rg "'EXIT'" frontend/src --glob '!*test*'` solo devuelve comentarios JSDoc de `accessService.js` y el rótulo de `ValidationResult.jsx:85`; ninguna llamada de la página envía `'EXIT'`.

## 4. Alcance
**Incluye:**
- Selector de modo en el terminal: "Entrada" / "Salida" (segmented control) que se aplica tanto al escaneo QR como al DNI manual.
- Que `ValidationResult` muestre "Salida registrada" / "Entrada registrada" según `log.access_type` (hoy el rótulo "Tipo de Ingreso" es fijo, `ValidationResult.jsx:80`).
- Regla de backend: en `EXIT` **no** se exige membresía activa (sí se exige token válido/anti-replay y que el usuario exista). Un socio con membresía vencida o suspendido que está adentro debe poder salir.
- Tests de ambos lados.

**No incluye:** anti-passback (ver BK-ACC-02), corrección masiva de aforo (BK-ACC-07), alertas de umbral (BK-ACC-06).

## 5. Contrato de API
Sin endpoints nuevos. Cambia el comportamiento de dos existentes.

**[EXISTE] `POST /api/access/qr/scan/`** — permiso `IsReceptionistOrAdmin` (`backend/apps/access/permissions.py:4`).
- Request: `{ "qr_token": "<str>", "access_type": "ENTRY" | "EXIT" }` (default `ENTRY`).
- Response 200 (GRANTED) / 403 (DENIED), mismo cuerpo: `{ "status": "GRANTED"|"DENIED", "message": str, "denial_reason": str|null, "access_log": AccessLogSerializer }`. `AccessLogSerializer.Meta.fields` (`serializers.py:44-59`): `id, timestamp, user, user_email, user_nombre, user_apellido, user_plan_nombre, access_type, status, status_display, denial_reason, qr_jti, scanned_by, scanned_by_email`.
- 400: errores de campo del serializer (`{"qr_token": ["This field is required."]}`).
- **Cambio:** si `access_type == EXIT`, saltear el bloque `has_active_membership` (y `USER_SUSPENDED`) de `views.py:92-98`; mantener `UNKNOWN_USER`, `TOKEN_EXPIRED`, `INVALID_SIGNATURE`, `REPLAY_ATTACK`.

**[EXISTE] `POST /api/access/manual/`**
- Request: `{ "dni": "7-8 dígitos" (regex `^\d{7,8}$`, `serializers.py:25`), "access_type": "ENTRY"|"EXIT" }`.
- Mismo response. **Cambio idéntico** en `views.py:179-185` para EXIT.

Extraer la regla a una función en `services.py`, por ejemplo `def evaluate_access(user, access_type) -> str | None` (devuelve `denial_reason` o `None`), para no duplicar en las dos vistas (hoy están copiadas, `views.py:91-98` y `views.py:179-185`).

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Ruta/guard:** ya existe `/recepcion/acceso` con `<ProtectedRoute roles={['administrador','recepcionista']}>` (`frontend/src/App.jsx:115-121`, con `Suspense` + `Skeleton`).
- **Reutilizar:** `ScannerPanel` (`frontend/src/components/recepcion/ScannerPanel.jsx`), `ValidationResult`, `Button` (`components/ui/Button.jsx`), `Card`.
- **Estado nuevo en la página:** `const [accessType, setAccessType] = useState('ENTRY')` (en `AccesoTerminalPage.jsx`, junto a los otros `useState`, líneas 14-19). Reemplazar los literales `'ENTRY'` de las líneas 63 y 72 por `accessType`.
- **Nuevo componente:** `frontend/src/components/recepcion/AccessTypeToggle.jsx` — dos botones con `role="radiogroup"`/`aria-checked` ("Entrada", "Salida"); props `{ value, onChange, disabled }`. Colocarlo arriba de `ScannerPanel` (o dentro, antes de los botones inferiores). Estilos: tokens Tailwind del repo (`bg-bg-raised`, `border-subtle`, `text-primary`).
- **ValidationResult:** cambiar el rótulo "Tipo de Ingreso" por "Tipo de movimiento"; texto de éxito: `access_type === 'EXIT' ? 'Salida registrada' : 'Acceso permitido'` (hoy `ValidationResult.jsx:54`). Eliminar la prop `onRegisterExit` sin uso.
- **Estados:** loading = "Validando acceso..." (ya existe, `ScannerPanel.jsx:43-46`); éxito/denegado = `ValidationResult`; error de red = toast (`sonner`, ya importado en la página).
- **Textos (voseo):** "Entrada", "Salida", "Salida registrada", "El socio salió a las 18:42". Modo salida: color distintivo (ámbar) para que recepción no confunda el modo.
- **Responsive:** el toggle ocupa todo el ancho a 375 px (`grid grid-cols-2`); a 768 px+ queda en la fila de acciones del panel izquierdo.

## 8. Archivos a crear / modificar
- `backend/apps/access/services.py` — nueva `evaluate_access(user, access_type)`.
- `backend/apps/access/views.py` — usar `evaluate_access` en `ScanQRView` y `ManualAccessView`.
- `backend/apps/access/tests/test_manual_access.py` y `test_qr_utils.py` — casos nuevos.
- `frontend/src/components/recepcion/AccessTypeToggle.jsx` (+ `.test.jsx`) — nuevo.
- `frontend/src/pages/recepcion/AccesoTerminalPage.jsx` — estado `accessType`, pasarlo a `scanQR`/`manualAccess`.
- `frontend/src/components/recepcion/ValidationResult.jsx` — rótulos por tipo de movimiento.
- `frontend/src/pages/recepcion/__tests__/AccesoTerminal.test.jsx` — nuevos casos.

## 9. Plan de pruebas (TDD)
**Convención backend:** pytest + pytest-django, config `backend/pytest.ini` (`DJANGO_SETTINGS_MODULE=core.settings.test`, cobertura mínima 80 %). Los tests de `apps/access/tests/` usan `APITestCase`/`TestCase` y las factories de `backend/conftest.py` (`make_user_factory`, `make_socio_factory`, `make_plan_factory`, `make_membresia_factory`); también hay fixtures pytest (`make_user`, `make_socio`, `auth_client`). Correr: `cd backend && pytest apps/access -q`. El Celery corre en modo eager en tests; el modelo Mongo se mockea con `@patch('apps.access.tasks.log_qr_event')` (patrón en `test_qr_utils.py:105-107`).

Primero escribir (rojo):
1. `test_manual_exit_with_expired_membership_is_granted`: socio con membresía `fecha_fin` vencida, POST `/api/access/manual/` `{dni, access_type:'EXIT'}` → 200, `status=GRANTED`, `AccessLog.access_type == 'EXIT'`.
2. `test_manual_exit_suspended_user_is_granted` (usuario `is_active=False` con EXIT) → 200.
3. `test_manual_entry_expired_still_denied` (regresión): ENTRY con membresía vencida → 403 `MEMBERSHIP_INACTIVE`.
4. `test_scan_exit_token_expired_denied`: EXIT con token expirado → 403 `TOKEN_EXPIRED` (la salida sigue exigiendo token válido).
5. `test_exit_unknown_dni_denied` → 403 `UNKNOWN_USER`.
6. `test_aforo_decrements_on_exit`: ENTRY + EXIT GRANTED → `compute_aforo_actual()['aforo_actual'] == 0`.

**Convención frontend:** Vitest + React Testing Library (`frontend/package.json:11` `vitest run`; CI: `npx vitest run --coverage`, umbral 68 % en `vite.config.js`). Los tests viven junto al código (`*.test.jsx`) o en `__tests__/`. El test existente de la página mockea `accessService`, `useWebSocket`, `AppLayout`, `TopBar` y `@yudiel/react-qr-scanner` (ver `AccesoTerminal.test.jsx:1-34`) — reutilizar esos mocks.
1. Al elegir "Salida" y validar un DNI, `manualAccess` se llama con `('12345678', 'EXIT')`.
2. Por defecto el modo es Entrada: `manualAccess(..., 'ENTRY')`.
3. `ValidationResult` con `log.access_type='EXIT'` y `status='success'` muestra "Salida registrada".
4. `AccessTypeToggle`: navegación por teclado y `aria-checked`.

Correr: `cd frontend && npx vitest run src/pages/recepcion src/components/recepcion` y `npm run lint` (`--max-warnings 0`).

**Manual:** `recepcion@winnie.local` (seed `seed_demo_users`, ver README sección cuentas demo): validar DNI de un socio demo en Entrada y luego en Salida; el chip "Aforo N" del terminal y `/recepcion/aforo` deben subir y bajar.

## 10. Criterios de aceptación
- **Dado** que un socio entró hoy, **cuando** recepción cambia a "Salida" y escanea su QR, **entonces** se crea un `AccessLog` `EXIT/GRANTED` y el aforo baja en 1 en todos los clientes conectados al WebSocket.
- **Dado** un socio con membresía vencida que está adentro, **cuando** se registra su salida, **entonces** la salida es `GRANTED` (no `MEMBERSHIP_INACTIVE`).
- **Dado** modo "Entrada", **cuando** se escanea un socio con membresía vencida, **entonces** sigue siendo denegado.
- **Dado** modo "Salida" activo, **cuando** se muestra el resultado, **entonces** la tarjeta dice "Salida registrada" y el rótulo de tipo dice "Salida".

## 11. Riesgos y decisiones abiertas
- ¿Se permite EXIT sin ENTRY previo? Recomendación: sí en esta ficha (no rompe nada), y tratar el caso como advertencia en BK-ACC-02.
- ¿Salida automática por molinete físico? Fuera de alcance; hoy solo hay terminal de recepción.
- Persistir el modo elegido en `sessionStorage` para que no se resetee al recargar: recomendado (try/catch, como hace `useHighContrast.js`).

## 12. Referencias
- `docs/qa/evidence/frontend/04-acceso-*.png` (capturas actuales del terminal).
- `CHANGELOG.md:130-132` (WebSocket de aforo, HU08/RF07).
- Figma (apoyo visual opcional): archivo `WuBKhksfVVcBjNKbDVX5EM`, página "vistas live", módulo Recepción / Acceso.
- Relacionadas: BK-ACC-02, BK-ACC-05, BK-ACC-07.

## 13. Prompt listo para un agente de IA
```
Repo: Winnie-The-Gym (Django 5 + DRF backend en /backend, React 18 + Vite + Vitest en /frontend, JS sin TypeScript, textos de UI en español rioplatense con voseo, código/identificadores en inglés).

Problema: frontend/src/pages/recepcion/AccesoTerminalPage.jsx manda siempre 'ENTRY' (líneas ~63 y ~72), así que el aforo nunca baja. Además backend/apps/access/views.py (ScanQRView líneas ~92-98 y ManualAccessView ~179-185) exige membresía activa también para EXIT.

Hacé (TDD, tests primero):
1. Backend: crear en backend/apps/access/services.py `evaluate_access(user, access_type) -> str|None` que devuelva el denial_reason (USER_SUSPENDED / MEMBERSHIP_INACTIVE) solo para ENTRY y None para EXIT; usarla en ScanQRView y ManualAccessView (eliminando la lógica duplicada). Tests en backend/apps/access/tests/ (APITestCase + factories de backend/conftest.py): EXIT con membresía vencida => 200 GRANTED; ENTRY vencida => 403 MEMBERSHIP_INACTIVE; EXIT con token expirado => 403 TOKEN_EXPIRED; aforo baja con EXIT.
2. Frontend: crear components/recepcion/AccessTypeToggle.jsx (radiogroup accesible "Entrada"/"Salida"), estado accessType en AccesoTerminalPage pasado a scanQR/manualAccess, y en ValidationResult rótulo "Tipo de movimiento" y texto "Salida registrada" cuando log.access_type==='EXIT'. Quitar la prop sin uso onRegisterExit. Tests RTL en pages/recepcion/__tests__/AccesoTerminal.test.jsx reutilizando los mocks existentes.
No toques backend/loadtests ni frontend/src/hooks/useScreenWakeLock.js (trabajo en curso).
Terminado cuando: `cd backend && pytest apps/access -q` y `cd frontend && npx vitest run && npm run lint` pasan, y la cobertura no baja de los umbrales de CI.
```
