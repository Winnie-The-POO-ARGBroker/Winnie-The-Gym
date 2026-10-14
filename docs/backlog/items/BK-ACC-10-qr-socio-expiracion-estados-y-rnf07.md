---
id: BK-ACC-10
titulo: QR del socio — renovación confiable del token, estados bloqueado/suspendido y cierre de RNF07 (legibilidad y luminosidad)
tipo: mobile
roles: [socio]
prioridad: P1
tamano: L
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-ACC-10 · QR del socio: expiración, estados y RNF07

## 1. Resumen
La credencial digital ya rota el token cada 30 s, tiene alto contraste, pantalla completa y Wake Lock (PR #110). Pero la cuenta regresiva es un contador local de 30 s que se desincroniza en segundo plano o con el teléfono bloqueado, una falla de red deja un QR vencido a la vista con el contador reiniciado, el estado "bloqueado" solo contempla membresía vencida (no socio suspendido/de baja ni sin plan), y el QR resultante es denso (≈ 53×53 módulos a 170 px) y el "boost de brillo" depende de APIs que no existen en navegadores estándar. RNF07 sigue sin cerrarse.

## 2. Objetivo de usuario
Como **socio** quiero **que mi QR esté siempre vigente, legible bajo el sol y que me diga claramente por qué no puedo entrar** para **pasar en el molinete al primer intento desde el celular**.

## 3. Estado actual en el código (evidencia)
| # | Capa | Archivo:línea | Qué hay hoy |
|---|---|---|---|
| 1 | Backend emisión | `backend/apps/access/views.py:37-47`, `utils.py:23-55` | `GET /api/access/qr/generate/` (`IsAuthenticated`, cualquier rol) devuelve `{qr_token, expires_in, expires_at, jti}` (`serializers.py:6-10`). TTL = `QR_TOKEN_EXPIRATION_SECONDS` (default 30, `base.py:380`). Payload `{user_id, jti, iat, exp}` firmado HMAC-SHA256. Emite token aun si el socio está vencido/suspendido. |
| 2 | Backend verificación | `utils.py:99-140` | `if now > exp` estricto, sin tolerancia (leeway); el reloj es el del servidor. Un token que llega con 1 s de retraso da `TOKEN_EXPIRED` (que `availability_report` cuenta como falla de infraestructura, `availability_report.py:27`). |
| 3 | Frontend timer | `frontend/src/pages/socio/CredencialDigitalPage.jsx:24,92-107` | `timeLeft` fijo en 30 con `setInterval(1000)`; al llegar a 1 llama `refreshQR(false)` y devuelve 30 **sin esperar el resultado**. Ignora `expires_in`/`expires_at` de la respuesta (línea 72 solo guarda `res.data.qr_token`). `maxTime={30}` hardcodeado (línea 164). |
| 4 | Frontend segundo plano | `CredencialDigitalPage.jsx:92-107`, `frontend/src/hooks/useScreenWakeLock.js` (`visibilitychange` solo re-adquiere el wake lock) | Al volver de otra app o desbloquear, los timers estuvieron throttled: el contador puede mostrar 12 s con el token ya vencido. No hay refresh por `visibilitychange`. |
| 5 | Frontend fallo de red | `CredencialDigitalPage.jsx:68-83` | Si `GET /access/qr/generate/` falla: `toast.error('Error al generar QR')` cada ciclo (spam) y `qrData` conserva el token viejo que se sigue mostrando como válido con el contador en 30. |
| 6 | Frontend estado bloqueado | `CredencialDigitalPage.jsx:61-62`, `components/socio/QRDisplay.jsx:34-43` | `isExpired = !member?.membresia \|\| member.membresia.estado === 'vencida'`; el overlay siempre dice "Acceso Bloqueado / Membresía vencida". `GET /api/memberships/me/` sí devuelve `estado` del socio (`memberships/serializers.py:75`), pero no se usa: un socio `suspendido`/`baja` ve un QR "válido" que el backend rechaza (`has_active_membership`: `socio.estado not in ('activo',)`, `services.py:192-193`). Sin plan, dice "vencida" (incorrecto). |
| 7 | Frontend QR | `components/socio/QRDisplay.jsx:25-31`, `QRCode.jsx:8-62`, `lib/qr.js:5-24` | Generador propio sin dependencias (nivel ECC M). El token mide ≈168 caracteres (payload 93 B → base64 124 + `.` + firma 43) ⇒ versión 9 = 53×53 módulos ⇒ a `size=170` son ≈3,2 px por módulo (pantalla completa `size=220`: ≈4,1 px; `QRFullscreenModal.jsx:108-114`). Comentario del archivo dice "Versions 1-6" pero el código llega a 10 (`capacityM` líneas 15-19). Si falla la generación cae silenciosamente a una matriz 21×21 en blanco (`lib/qr.js:235-242`). No hay test que decodifique el QR generado con un decodificador real (los tests solo miran render): **No verificado** que lo lea cualquier lector. |
| 8 | RNF07 contraste | `frontend/src/index.css:134-165`, `hooks/useHighContrast.js:4-5`, `components/ui/HighContrastToggle.jsx` | Existe modo "Alto Contraste (exterior)": se activa solo en `/socio/credencial`, toggle manual persistido en `localStorage` (`winnie-high-contrast-pref`), CSS en `.credencial-page`. El QR usa `fgColor #121212` sobre blanco (`QRDisplay.jsx:28`), no `#000000` (el modal sí usa `#000000`). |
| 9 | RNF07 luminosidad | `hooks/useScreenWakeLock.js:20-43,60-84` | Wake Lock real (`navigator.wakeLock.request('screen')`, re-adquirido en `visibilitychange`). El "boost de brillo" intenta `screen.brightness` / `screen.setBrightness`, **propiedades no estándar** (no existen en Chrome/Safari; solo en algún WebView propietario): en la práctica es un no-op (`brightnessBoosted` queda en `false`). El Fullscreen API (`QRFullscreenModal.jsx:17-61`, comentario "suele forzar brillo máximo") no cambia el brillo de la pantalla. *(Archivo con cambios sin commitear del dueño; la evidencia es del commit `3bc4755`.)* |
| 10 | Multi-dispositivo | `frontend/src/pages/socio/__tests__/CredencialDispositivos.test.jsx` (PR #110) | Tests con user-agents simulados (Android Chrome / iOS Safari). Pendiente según specs: pruebas en dispositivos reales / BrowserStack (`speckit/README.md:35`, `speckit/proposal.md:32`, `speckit/frontend-coverage-and-walkthrough/tasks.md:395`). |
| 11 | Concurrencia | `utils.py:58-96` | El anti-replay es por `jti`: dos dispositivos del mismo socio generan tokens independientes y válidos a la vez (no hay "último token gana"). |
| 12 | Datos fijos | `CredencialDigitalPage.jsx:50` | `sedeHabitual: 'Sede Central'` hardcodeado. |

## 4. Alcance
**Incluye:** (a) countdown y refresh basados en `expires_at` + `visibilitychange` + estado de fallo; (b) estado de credencial derivado del servidor (`habilitado`/motivo) con copy por motivo; (c) legibilidad: tamaño responsivo del QR, `#000` en alto contraste, token más corto (opcional), test de ida y vuelta con decodificador; (d) honestidad en luminosidad: quitar el falso boost y reemplazarlo por pantalla completa blanca + aviso "Subí el brillo"; (e) tolerancia (leeway) en la verificación.
**No incluye:** wallet (Apple/Google Wallet), NFC, QR estático de respaldo, cambios al terminal (BK-ACC-09/02).

## 5. Contrato de API
**[EXISTE → MODIFICAR] `GET /api/access/qr/generate/`** — `IsAuthenticated`. Response actual: `{ "qr_token": str, "expires_in": int, "expires_at": int (epoch s), "jti": str }`.
**[A CREAR]** campos adicionales en `GenerateQRResponseSerializer` (`serializers.py:6-10`): `server_time` (epoch s, para calcular el desfase del reloj del teléfono), `acceso_habilitado` (bool) y `motivo` (`null` | `MEMBERSHIP_INACTIVE` | `USER_SUSPENDED` | `NO_MEMBERSHIP`; este último valor del enum **hoy nunca se emite**, `models.py:28`). `acceso_habilitado` se calcula con la misma regla que el escaneo (`has_active_membership` / `is_active`; ver `evaluate_access` de BK-ACC-01). Se sigue emitiendo el token (compatibilidad), el escaneo es la autoridad. Errores: 401 sin token.
**[EXISTE → MODIFICAR] verificación** (`verify_dynamic_qr_token`, `utils.py:126-127`): aceptar `now <= exp + QR_TOKEN_LEEWAY_SECONDS` (setting nuevo, default 3; `QR_TOKEN_EXPIRATION_SECONDS` sigue siendo 30).
**[OPCIONAL] token compacto:** claves cortas (`u`, `j`, `e`) y `jti` en base64url de 16 bytes ⇒ ≈118 caracteres ⇒ versión 6 (41×41, ≈4,1 px/módulo a 170 px). La verificación debe aceptar ambos formatos durante 1 TTL.
Alternativa/ complemento: **[OPCIONAL]** "último token gana" por usuario (`cache.set(f'qr_latest:{user_id}', jti, ttl)` y rechazar tokens con otro `jti` → `REPLAY_ATTACK`/nuevo `TOKEN_SUPERSEDED`): decisión abierta (rompe el uso simultáneo en 2 dispositivos).

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Rutas/guard:** `/socio/credencial` con `roles={['administrador','socio']}` (`App.jsx:130`). Sin cambios.
- **Hook nuevo `frontend/src/hooks/useDynamicQr.js`**: encapsula la obtención del token. Recibe `{ enabled }`; devuelve `{ qrToken, secondsLeft, maxSeconds, status: 'loading'|'ready'|'stale'|'error', habilitado, motivo, refresh }`. Reglas: `secondsLeft = max(0, expires_at - (Date.now()/1000 + skew))` con `skew = server_time - clientNow` medido en la primera respuesta; refrescar cuando `secondsLeft <= 5` (renueva **antes** de vencer: evita el `TOKEN_EXPIRED` en el molinete) y en `visibilitychange`→`visible`/`online`; si falla, reintento con backoff (2 s, 4 s, 8 s) y `status='stale'` (el QR se difumina con texto "Sin conexión, reintentando…"; sin toast repetido: un único `toast.error` por racha de fallos). Reemplaza el `useState/useEffect` de `CredencialDigitalPage.jsx:23-25,68-107`.
- **Props reales a `QRDisplay`** (`QRDisplay.jsx:4-12`: `qrToken, timeLeft, maxTime, isRefreshing, isExpired, onRefresh, onOpenFullscreen`): pasar `maxTime={maxSeconds}` (no 30 fijo) y nuevo `blockedReason` para elegir el copy del overlay:
  - `MEMBERSHIP_INACTIVE`: "Acceso bloqueado — tu membresía está vencida" + botón "Renovar" (→ `/socio/checkout`).
  - `USER_SUSPENDED`: "Acceso bloqueado — tu cuenta está suspendida. Consultá en recepción".
  - `NO_MEMBERSHIP`: "Todavía no tenés un plan activo" + botón "Ver planes".
- **Legibilidad (RNF07):** tamaño del QR `size = Math.min(window.innerWidth - 64, 280)` en la tarjeta y `Math.min(innerWidth - 48, 320)` en pantalla completa (≥ 5 px/módulo en v9); `fgColor` `#000000` cuando `high-contrast` (leer `useHighContrast().isHighContrast`); `role="img"` y `aria-label="Código QR de acceso, válido por N segundos"` en `QRCode.jsx`; no caer en silencio a la matriz en blanco (`lib/qr.js:235-242`): propagar el error y mostrar "No pudimos generar tu QR. Reintentá".
- **Luminosidad:** sacar `boostBrightness` del flujo principal de `useScreenWakeLock` o dejarlo como "best effort" pero **no** mostrar nada que sugiera que sube el brillo; en `QRFullscreenModal` fondo 100 % blanco (hoy es tarjeta blanca sobre `bg-neutral-950/90`, línea 70) y aviso "Subí el brillo de tu celular al máximo" (texto visible la primera vez, descartable y recordado en `localStorage` con try/catch).
- **Estados de UI:** loading (`Skeleton` cuadrado), listo, stale (difuminado + reintento), error persistente (EmptyState con "Reintentar"), bloqueado (overlay por motivo), éxito de refresh manual (`toast.success('Código QR actualizado')`, ya existe).
- **Textos (voseo):** ver arriba; temporizador "Se renueva en 12 s".
- **Responsive:** 375 px es el caso principal (QR ≈ 280 px); a 768 px se centra con `max-w` de `MemberLayout`.

## 8. Archivos a crear / modificar
Backend: `apps/access/{utils,serializers,views}.py`, `core/settings/base.py` (`QR_TOKEN_LEEWAY_SECONDS`), tests `apps/access/tests/test_qr_utils.py` (ampliar).
Frontend: `hooks/useDynamicQr.js` (+test), `pages/socio/CredencialDigitalPage.jsx`, `components/socio/{QRDisplay,QRCode,QRFullscreenModal}.jsx`, `lib/qr.js`, `hooks/useScreenWakeLock.js` (coordinar con el dueño: tiene cambios sin commitear), tests existentes `CredencialDigitalPage.test.jsx`, `__tests__/CredencialDispositivos.test.jsx`, `QRDisplay.test.jsx`, `QRFullscreenModal.test.jsx`, `QRCode.test.jsx`.

## 9. Plan de pruebas (TDD)
Backend (pytest, `TestCase`/`APITestCase`; patrón de `test_qr_utils.py`: `generate_dynamic_qr_token`, `verify_dynamic_qr_token`, `@patch('apps.access.tasks.log_qr_event')`):
1. `GET /qr/generate/` incluye `server_time` y `acceso_habilitado=True` para socio activo; `False` + `motivo='MEMBERSHIP_INACTIVE'` con membresía vencida; `USER_SUSPENDED` si `is_active=False`... (un usuario inactivo no puede loguearse: usar `socio.estado='suspendido'` → motivo `MEMBERSHIP_INACTIVE`/nuevo `SOCIO_SUSPENDED` según decisión).
2. Leeway: token con `exp = now-2` y `QR_TOKEN_LEEWAY_SECONDS=3` → válido; con `exp = now-5` → `TOKEN_EXPIRED`.
3. (opcional) token compacto y formato viejo conviven.
Frontend (Vitest + RTL + `vi.useFakeTimers`; mocks como `CredencialDispositivos.test.jsx:1-25`: `useSocioMembresiaMe`, `useAuth`, `../../../services/api`, `sonner`):
1. `useDynamicQr`: con `expires_at = now+30` refresca cuando faltan ≤ 5 s (no a los 30).
2. Simular `document.visibilityState='visible'` tras avanzar 40 s → refresca de inmediato.
3. Fallo de `api.get` → `status='stale'`, **un** solo toast, reintentos con backoff, el QR no se muestra como válido.
4. Overlay por motivo (`MEMBERSHIP_INACTIVE`, `USER_SUSPENDED`, `NO_MEMBERSHIP`) con su copy y CTA.
5. `QRCode` expone `role="img"` y `aria-label`; con `isHighContrast` usa `#000000`.
6. **Round-trip de decodificación:** generar el SVG/matriz de un token real de 168 caracteres y decodificar la matriz con `barcode-detector` o `jsqr` (dependencia de dev; el repo ya incluye `barcode-detector` como dependencia transitiva del scanner, verificar antes) → el texto decodificado es idéntico. Hoy no existe este test.
Manual (RNF07): en un celular real (Android Chrome y iOS Safari) a pleno sol o con brillo mínimo: abrir `/socio/credencial` con `socio.activo@winnie.local`, activar Alto Contraste y "Ver QR en pantalla completa"; escanear desde `/recepcion/acceso` en otro equipo a 30-50 cm; repetir con `socio.vencido@winnie.local` (overlay) y con modo avión 40 s (estado stale).

## 10. Criterios de aceptación
- **Dado** el teléfono bloqueado 2 minutos, **cuando** se desbloquea y se vuelve a la credencial, **entonces** se muestra un token nuevo en menos de 2 s y el contador es correcto.
- **Dado** que se cae la red, **cuando** el token está por vencer, **entonces** el QR se marca como desactualizado (no como válido) y se reintenta solo, con un único aviso.
- **Dado** un socio suspendido o sin plan, **cuando** abre la credencial, **entonces** ve el motivo exacto y una acción posible (renovar / consultar a recepción) en lugar de "membresía vencida" genérico.
- **Dado** un celular de 375 px, **cuando** se abre el QR en pantalla completa, **entonces** ocupa ≥ 280 px, es negro puro sobre blanco y un lector lo decodifica al primer intento a 40 cm.

## 11. Riesgos y decisiones abiertas
- ¿Token compacto? Recomendación: sí si la prueba en celulares de gama baja falla con 53×53; si no, bastan el tamaño responsivo y el alto contraste.
- ¿"Último token gana" (un dispositivo activo por socio)? Recomendación: no por ahora; se mitiga el préstamo de credencial con anti-passback (BK-ACC-02).
- Brillo: la web no puede subirlo; solo una app nativa/PWA instalada con APIs específicas podría. Recomendación: documentar la limitación y mantener el aviso visual.
- ¿Seguir mostrando QR a socios vencidos (hoy se emite igual)? Recomendación: no mostrar QR, solo el overlay (ya ocurre visualmente), y no pedir token mientras `acceso_habilitado=false`.
- Cambios en `useScreenWakeLock.js`: el dueño tiene modificaciones sin commitear en ese archivo; coordinar antes de editarlo.

## 12. Referencias
- PR #110 (`cf05fe5`): Wake Lock + brillo experimental + Fullscreen; `speckit/README.md:35`, `speckit/proposal.md:32` (RNF07 contraste QR y multi-dispositivo marcados como pendientes); `docs/qa/evidence/frontend/02-credencial-qr-*.png`, `docs/qa/screenshots/mobile/credencial.png`.
- MDN: Screen Wake Lock API (soporte), `docs/reports/rnf01-rnf06.md` (RNF01/06).
- Figma (opcional): "vistas live" → Socio → Credencial (Mobile).

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1 + DRF; React 18 + Vite + Vitest/RTL). Implementá docs/backlog/items/BK-ACC-10-qr-socio-expiracion-estados-y-rnf07.md (leelo entero). Archivos clave: backend/apps/access/{utils,serializers,views}.py; frontend/src/pages/socio/CredencialDigitalPage.jsx, components/socio/{QRDisplay,QRCode,QRFullscreenModal}.jsx, lib/qr.js. NO edites frontend/src/hooks/useScreenWakeLock.js (el dueño tiene cambios sin commitear); si hace falta cambiarlo, dejá la nota en el PR.
TDD: primero tests backend (leeway QR_TOKEN_LEEWAY_SECONDS=3 en verify_dynamic_qr_token; campos server_time/acceso_habilitado/motivo en GET /api/access/qr/generate/) y tests Vitest (hooks/useDynamicQr.test.jsx con vi.useFakeTimers: refresh a ≤5 s del vencimiento, refresh en visibilitychange, estado stale con un solo toast; overlay por motivo; QRCode con role="img"/aria-label y #000000 en alto contraste; round-trip decodificando la matriz generada). Luego implementá el hook useDynamicQr (calcula secondsLeft desde expires_at con el desfase de server_time), integralo en CredencialDigitalPage reemplazando el timer de 30 s, copy de bloqueo por motivo en QRDisplay (voseo), tamaño responsivo del QR (min(innerWidth-64, 280); pantalla completa 320) y aviso "Subí el brillo". No dejes que lib/qr.js caiga en silencio a una matriz en blanco.
Código en inglés; textos de UI en español rioplatense (voseo).
Terminado: `cd backend && pytest -q` (cov>=80 %) y `cd frontend && npx vitest run --coverage && npm run lint` verdes; validación manual en un celular real documentada en el PR.
```
