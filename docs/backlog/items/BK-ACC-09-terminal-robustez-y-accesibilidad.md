---
id: BK-ACC-09
titulo: Terminal de acceso — robustez (cámara, red, DNI), feedback sonoro/háptico y accesibilidad
tipo: ui-estado
roles: [administrador, recepcionista]
prioridad: P1
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-ACC-01]
---

# BK-ACC-09 · Terminal de acceso: robustez y accesibilidad

## 1. Resumen
El terminal funciona en el camino feliz pero falla de forma poco clara cuando la cámara se deniega, la red se cuelga o el DNI está mal tipeado, destruye y recrea la cámara después de cada escaneo, no da feedback sonoro diferenciado entre permitido/denegado y no avisa a lectores de pantalla. Hay además un bug de temporizadores que borra resultados nuevos antes de tiempo.

## 2. Objetivo de usuario
Como **recepcionista** quiero **un terminal que me diga claramente qué pasó (cámara, conexión, resultado) y me lo avise también con sonido** para **atender rápido sin mirar fijo la pantalla ni quedarme trabado**.

## 3. Estado actual en el código (evidencia)
| # | Archivo:línea | Qué hay hoy |
|---|---|---|
| 1 | `frontend/src/components/recepcion/ScannerPanel.jsx:21-26,55-58` y `AccesoTerminalPage.jsx:102-105` | Cualquier `onError` del `Scanner` setea `cameraError=true` + modo manual con el texto fijo "No se pudo acceder a la cámara. Por favor, ingrese el DNI manualmente." No distingue causa. La librería (`@yudiel/react-qr-scanner` **2.6.0**) entrega `IScannerError { kind, message, cause }` con `kind` ∈ `permission-denied \| no-camera \| in-use \| overconstrained \| insecure-context \| unsupported \| aborted \| security \| type-error \| unknown` (`node_modules/@yudiel/react-qr-scanner/dist/types/IScannerError.d.ts`); el código la ignora (solo hace `console.error`). |
| 2 | `ScannerPanel.jsx:43-47` | Mientras `isPaused` (procesando o resultado visible, 8 s) se **desmonta** el `<Scanner>` y se muestra "Validando acceso...". Al volver se reinicia la cámara cada vez (latencia, parpadeo, riesgo de re-prompt de permisos). El componente soporta la prop `paused` (`components/Scanner.d.ts:14`). |
| 3 | `ScannerPanel.jsx:59-62` | `components={{ audio: false, finder: false }}`: `audio` no existe en `IScannerComponents` de la v2.6.0 (solo `finder, torch, tracker, onOff, zoom`); el sonido se controla con la prop `sound` (default `true`, según el bundle `index.esm.mjs`). Resultado probable: pita al **decodificar**, igual para permitido y denegado, y no hay sonido distinto según el resultado del servidor. **No verificado en navegador real.** |
| 4 | `ScannerPanel.jsx:49-66` | Sin `formats` (acepta cualquier código de barras) ni `constraints` (`facingMode`), ni linterna (`components.torch`). |
| 5 | `frontend/src/services/api.js:9-11` | `axios.create({ baseURL })` **sin `timeout`**: si el backend no responde, `isProcessing` queda `true` y el terminal muestra "Validando acceso..." indefinidamente (`AccesoTerminalPage.jsx:24-59`). |
| 6 | `AccesoTerminalPage.jsx:35-54` | Errores sin cuerpo (red caída) → mensaje genérico `'Error al validar acceso'` + toast; no hay indicador de conectividad. El WS solo se usa para el aforo (`'--'` si no llegó, línea 22); no se informa su estado en el terminal. |
| 7 | `AccesoTerminalPage.jsx:57` | `setTimeout(() => setScanResult(null), 8000)` en `finally` sin guardar/limpiar el id: en modo manual (`ScannerPanel.jsx:39`, el botón no se deshabilita con resultado visible) un segundo resultado aparece y el timer anterior lo borra antes de tiempo. |
| 8 | `AccesoTerminalPage.jsx:61-65` y `ScannerPanel.jsx:31-38` | DNI: no se envía con Enter (sin `onKeyDown`/`<form>`), sin `inputMode="numeric"`, sin validación cliente (backend exige `^\d{7,8}$`, `serializers.py:25` → 400 `{"dni": [...]}` que cae en el mensaje genérico), no tolera puntos/espacios ("30.111.222"), y se vacía el campo antes de conocer la respuesta (`setManualDni('')`). |
| 9 | `AccesoTerminalPage.jsx:67-73` | Debounce global de 5 s (`SCAN_DEBOUNCE_MS`) por escaneo, no por token: un segundo socio que escanee dentro de 5 s es ignorado en silencio. |
| 10 | `frontend/src/components/recepcion/ValidationResult.jsx:22-104` | Sin `role="status"`/`aria-live` (único `role="alert"` del módulo está en `CobroManualPage.jsx:256`); el resultado es visual. El estado se comunica por color + ícono + texto (bien), pero no por sonido ni vibración. |
| 11 | `ValidationResult.jsx:5-11` | Mapa de motivos incompleto (faltan `INVALID_SIGNATURE`, `INVALID_TOKEN`, `NO_MEMBERSHIP`, `REDIS_UNAVAILABLE`); ver BK-ACC-02 que lo completa. |
| 12 | `AccesoTerminalPage.jsx:88-114` | El botón "Limpiar pantalla" (`onConfirmEntry`) y los de modo no tienen atajos de teclado. |
| 13 | Tests | `frontend/src/pages/recepcion/__tests__/AccesoTerminal.test.jsx` cubre manual OK, 403 y fallo de red (4 casos); mockea `Scanner` y `useWebSocket`. No hay tests de cámara denegada, timeout ni Enter. |

## 4. Alcance
**Incluye:** (a) mensajes de cámara por `error.kind` + botón "Reintentar cámara"; (b) `paused` en vez de desmontar; (c) `formats={['qr_code']}`, `constraints={{ facingMode: 'environment' }}`, linterna; (d) timeout y mensaje de "Sin conexión" + indicador de estado de conexión; (e) formulario de DNI con Enter, `inputMode`, normalización y validación 7-8 dígitos; (f) beeps distintos (Web Audio) y vibración según resultado, silenciables; (g) `aria-live` y foco; (h) arreglar el temporizador; (i) debounce por token.
**No incluye:** modo offline con cola de validaciones (ver decisión abierta), lectores USB tipo "keyboard wedge", impresión de comprobantes, molinete físico.

## 5. Contrato de API
Sin cambios obligatorios de backend. Opcionales:
- **[A CREAR, opcional] `GET /api/health/`** ya existe (`backend/core/urls.py:145`, `path('api/health/', health)`) — devuelve `{ status, service, version, checks }` (`backend/core/urls.py:120-132`, con chequeos de dependencias y un `http_status` que puede ser de error). Es útil como ping de conectividad, pero hace chequeos de dependencias: no pollearlo cada pocos segundos (recomendado cada 30-60 s, o confiar en `navigator.onLine` + el estado del WebSocket).
- `POST /api/access/manual/` mantiene 400 `{"dni": ["..."]}` para DNI inválido; el front debe mapearlo a "El DNI debe tener 7 u 8 números".

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Ruta/guard:** sin cambios (`/recepcion/acceso`, `App.jsx:115-121`).
- **Cámara (`ScannerPanel.jsx`):** `onError={(e) => onCameraError(e)}` y en la página `cameraError` pasa a objeto `{ kind }`. Copy por `kind`:
  - `permission-denied`: "Bloqueaste el acceso a la cámara. Habilitala desde el candado de la barra de direcciones y tocá «Reintentar cámara»."
  - `no-camera`: "No encontramos una cámara en este equipo. Usá el ingreso por DNI."
  - `in-use`: "La cámara está siendo usada por otra aplicación o pestaña."
  - `insecure-context`: "La cámara solo funciona con HTTPS. Abrí el terminal desde la URL segura."
  - resto: "No pudimos iniciar la cámara."
  Botón "Reintentar cámara" (ya existe "Activar cámara", `ScannerPanel.jsx:83-86`; reutilizarlo y también limpiar `cameraError`).
- **Scanner:** `<Scanner paused={isPaused} formats={['qr_code']} constraints={{ facingMode: 'environment' }} sound={false} components={{ finder: false, torch: true }} .../>` (el sonido lo maneja la app). Quitar el placeholder que desmonta (líneas 43-47) y superponer "Validando acceso..." sobre el video congelado.
- **Conectividad:** hook `useOnlineStatus()` (`window` `online`/`offline`) + `isConnected/isReconnecting` de `useWebSocket` → chip en `TopBar.rightContent` junto al aforo: "En línea" / "Sin conexión — usá DNI cuando vuelva". Deshabilitar escaneo mientras `offline`.
- **Timeout:** en `accessService.js` pasar `{ timeout: 8000 }` a `api.post` (axios soporta `timeout` por request; sin cambiar el cliente global); mapear `err.code === 'ECONNABORTED'` / `!err.response` a "No hay conexión con el servidor. Reintentá en unos segundos." y **no** mostrar resultado rojo de "Acceso denegado" (no es un rechazo del socio).
- **DNI:** envolver en `<form onSubmit>` con `type="submit"`; `inputMode="numeric"`, `autoComplete="off"`, `maxLength={10}`; normalizar `dni.replace(/\D/g, '')`; validar `/^\d{7,8}$/` antes de llamar (mensaje inline `text-error-500` "Ingresá 7 u 8 números"); limpiar el campo **solo** en éxito.
- **Feedback:** utilitario `frontend/src/utils/feedback.js` con `playTone('success'|'denied'|'warning')` (Web Audio API, dos tonos distintos) y `navigator.vibrate?.([...])`; preferencia "Sonido" persistida en `localStorage` (try/catch como `useHighContrast.js`). Interruptor en el TopBar.
- **Accesibilidad:** contenedor del resultado con `role="status" aria-live="polite"` (y `assertive` para denegado); mover el foco al botón "Limpiar pantalla" o devolverlo al input DNI; `aria-label` en el scanner; asegurar contraste AA de los textos sobre `bg-success-500/20`.
- **Timers:** guardar el id en un `useRef`, `clearTimeout` antes de programar otro y en `useEffect` cleanup; con resultado visible, nuevo escaneo reemplaza el resultado inmediatamente.
- **Debounce por token:** `lastScanRef = { token, at }`; solo se ignora el mismo token dentro de 5 s.
- **Estados:** loading ("Validando acceso..." superpuesto), éxito/denegado/advertencia (`ValidationResult`), error de red (banner ámbar, no resultado), vacío ("Esperando escaneo...", ya existe, `ValidationResult.jsx:29-34`).
- **Textos (voseo):** ver copy arriba; "Escaneá el QR del socio o ingresá el DNI".
- **Responsive:** terminal pensado para tablet/notebook; a 768 px la grilla `lg:grid-cols-2` pasa a 1 columna (ya así), a 375 px el scanner ocupa ancho completo con altura mínima 250 px (`min-h-[250px]`, `ScannerPanel.jsx:44,48`).

## 8. Archivos a crear / modificar
`frontend/src/components/recepcion/ScannerPanel.jsx`, `pages/recepcion/AccesoTerminalPage.jsx`, `components/recepcion/ValidationResult.jsx`, `services/accessService.js` (timeout), `hooks/useOnlineStatus.js` (nuevo), `utils/feedback.js` (nuevo) y sus tests (`ScannerPanel.test.jsx` nuevo, ampliar `AccesoTerminal.test.jsx`).

## 9. Plan de pruebas (TDD)
Convención: Vitest + RTL, mocks como en `__tests__/AccesoTerminal.test.jsx:1-34` (el mock de `Scanner` debe exponer `onError`/`onScan` para dispararlos desde el test, p. ej. `Scanner: ({ onError, onScan }) => <button onClick={() => onError({ kind: 'permission-denied' })}>err</button>`). Comando: `cd frontend && npx vitest run src/pages/recepcion src/components/recepcion && npm run lint`.
1. `onError({kind:'permission-denied'})` → texto de permisos y botón "Reintentar cámara" que limpia el error y vuelve a modo cámara; `kind:'no-camera'` → copy de no cámara.
2. `Scanner` recibe `paused={true}` mientras se procesa y **sigue montado** (el mock recibe la prop).
3. `manualAccess` rechaza con `{ code: 'ECONNABORTED' }` → banner "No hay conexión…" y **no** `ValidationResult` rojo ni consumo de DNI (campo conserva el valor).
4. DNI: Enter envía; "30.111.222" se normaliza a `30111222`; "123" muestra error inline y no llama al servicio.
5. Timer: dos resultados seguidos (`vi.useFakeTimers`) — el segundo permanece 8 s completos.
6. Debounce por token: dos tokens distintos en < 5 s se procesan ambos; el mismo token una sola vez.
7. `feedback.playTone` se llama con `'success'`/`'denied'` según el resultado (mock de `AudioContext`/`navigator.vibrate`).
8. `ValidationResult` tiene `role="status"`; `aria-live` cambia a `assertive` en error.
Backend: sin tests nuevos (salvo `health` si se usa).
Manual: Chrome → bloquear cámara en el candado; DevTools → Network → Offline/Slow 3G; escanear dos QR seguidos de distintos socios.

## 10. Criterios de aceptación
- **Dado** que se bloqueó la cámara, **cuando** se abre el terminal, **entonces** se explica cómo habilitarla, se ofrece el DNI y un botón "Reintentar cámara" que funciona sin recargar.
- **Dado** que el servidor tarda más de 8 s, **cuando** se valida un acceso, **entonces** aparece "No hay conexión con el servidor" (no "Acceso denegado") y el terminal vuelve a estar listo.
- **Dado** un escaneo permitido y otro denegado, **cuando** se muestran, **entonces** suenan tonos distintos y el resultado es anunciado por lectores de pantalla.
- **Dado** dos socios que escanean con 2 s de diferencia, **cuando** se procesan, **entonces** ambos se validan.

## 11. Riesgos y decisiones abiertas
- **Modo offline / cola:** no recomendable validar localmente (el QR rota cada 30 s y el anti-replay vive en Redis del servidor, `utils.py:58-96`). Recomendación: no encolar; ante corte, usar DNI manual y registrar luego (si hace falta, ficha futura de "carga diferida con motivo"). Es `solo-idea`.
- Sonidos: ¿permitidos en el salón? Recomendación: activos por defecto con interruptor y volumen bajo.
- `getUserMedia` exige HTTPS o `localhost`; en producción ya hay HTTPS (Vercel/Render, `docs/deploy.md`).
- Beep nativo de la librería: confirmar en navegador real antes de fijar `sound={false}` (punto 3 de la evidencia no está verificado en runtime).

## 12. Referencias
- Librería: `frontend/node_modules/@yudiel/react-qr-scanner/dist/components/Scanner.d.ts` (props `paused`, `sound`, `formats`, `constraints`, `allowMultiple`, `scanDelay`).
- `docs/qa/evidence/frontend/04-acceso-*.png`, `docs/qa/plan-de-pruebas.md` (terminal de acceso).
- Figma (opcional): "vistas live" → Recepción → Acceso (estados éxito/denegado/atención).

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (React 18 + Vite + Vitest/RTL, JS sin TypeScript, Tailwind con tokens bg-bg-surface/border-subtle/text-primary, sonner para toasts, lucide-react). Implementá docs/backlog/items/BK-ACC-09-terminal-robustez-y-accesibilidad.md (leelo entero; la tabla de la sección 3 es la evidencia). Archivos: frontend/src/pages/recepcion/AccesoTerminalPage.jsx, components/recepcion/ScannerPanel.jsx, components/recepcion/ValidationResult.jsx, services/accessService.js.
TDD: escribí primero los 8 tests de la sección 9 en pages/recepcion/__tests__/AccesoTerminal.test.jsx y components/recepcion/ScannerPanel.test.jsx (el mock de '@yudiel/react-qr-scanner' debe exponer onError/onScan y registrar las props recibidas). Luego implementá: mensajes por error.kind de IScannerError (v2.6.0), prop paused en lugar de desmontar el Scanner, formats=['qr_code'] + constraints facingMode environment + sound={false}, timeout 8000 por request en accessService (axios) con mensaje de "sin conexión" que NO se muestra como acceso denegado, hook useOnlineStatus, form de DNI (Enter, inputMode numeric, normalizar a dígitos, validar /^\d{7,8}$/, limpiar solo en éxito), utils/feedback.js (Web Audio + vibrate, preferencia en localStorage con try/catch), role="status"/aria-live en ValidationResult, timers con useRef+cleanup, debounce por token. Mantené compatibilidad con BK-ACC-01/02 si ya están.
Textos de UI en español rioplatense (voseo); código e identificadores en inglés. No toques backend/loadtests ni hooks/useScreenWakeLock.js.
Terminado: `cd frontend && npx vitest run --coverage && npm run lint` (max-warnings 0) en verde, cobertura >= umbrales de vite.config.js.
```
