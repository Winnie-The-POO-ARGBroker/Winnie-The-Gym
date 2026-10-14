---
id: BK-MOB-10
titulo: PWA instalable (manifest, service worker de shell, íconos) y ampliar Wake Lock más allá de la credencial
tipo: feature
roles: [socio, recepcionista, administrador]
prioridad: P2
tamano: L
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-MOB-08, BK-MOB-12]
---

# BK-MOB-10 · PWA instalable y Wake Lock

## 1. Resumen
La app se usa como web móvil (la credencial QR del socio es el caso estrella) pero no es instalable: no hay `manifest`, ni service worker, ni íconos, y `index.html` apunta a un `/vite.svg` que no existe (no hay carpeta `frontend/public`). El PR #110 implementó Wake Lock + "brillo" + Fullscreen para la credencial; esta ficha documenta sus límites reales y propone extender el uso a la terminal de accesos y al monitor de aforo, además de la instalabilidad.

## 2. Objetivo de usuario
Como **socio** quiero **instalar Winnie en mi pantalla de inicio y que la pantalla no se apague mientras muestro el QR** para **entrar al gimnasio sin buscar la web ni perder el código**; como **recepcionista** quiero **que la tablet no se apague en la terminal de accesos** para **no desbloquearla entre ingresos**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| HTML | `frontend/index.html:5-7` | `<link rel="icon" href="/vite.svg">`, viewport y `<title>`. Sin `<link rel="manifest">`, sin `apple-touch-icon`, sin `theme-color` (ver BK-MOB-08). |
| Activos | `fd . frontend -E node_modules` | **No existe `frontend/public/`** ni `vite.svg`, ni íconos PNG/SVG de la marca (el logo es un componente React: `components/ui/WinnieLogo.jsx:1-20`). El favicon referenciado responde 404 en dev y prod. |
| PWA | `rg "serviceWorker\|manifest\|workbox\|vite-plugin-pwa\|beforeinstallprompt" frontend` (sin `node_modules`/`coverage`) | Sin resultados. `frontend/package.json` no incluye ningún plugin PWA. |
| Despliegue | `frontend/vercel.json:7-29` | Rewrite SPA `/((?!api\|assets\|.*\..*).*)` → `/index.html` (los paths con punto, p. ej. `/manifest.webmanifest` y `/sw.js`, se sirven como estáticos); cabeceras `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, **`Permissions-Policy: camera=(), microphone=(), geolocation=()`** (ver BK-MOB-12). `docs/architecture.md:75` indica Vercel como hosting del frontend. |
| Wake Lock (hook) | `frontend/src/hooks/useScreenWakeLock.js:12-140` | `useScreenWakeLock({ enabled })`: `navigator.wakeLock.request('screen')`, libera al desmontar/`enabled=false`, re-adquiere en `visibilitychange` visible, y "brillo" best-effort con `screen.brightness`/`screen.setBrightness` (APIs **no estándar**; la plataforma web no expone brillo: No verificado en dispositivos, es muy probable que sea no-op en Chrome/Safari). Retorna `{ isSupported, isActive, brightnessBoosted }`. (Nota: este archivo tiene cambios sin commitear del dueño; se describe el comportamiento, no líneas.) |
| Wake Lock (uso) | `pages/socio/CredencialDigitalPage.jsx:62-66` | Único consumidor: `useScreenWakeLock({ enabled: hasValidQR })`. El valor de retorno **no se usa**: el socio no ve si el bloqueo está activo ni se le avisa si el navegador no lo soporta. |
| Fullscreen | `components/socio/QRFullscreenModal.jsx:15-61` | `requestFullscreen`/variantes `webkit/moz/ms` al abrir y `exitFullscreen` al cerrar. En iPhone Safari el Fullscreen API de elementos arbitrarios no está soportado (comportamiento documentado por MDN/caniuse; No verificado en dispositivo): el modal igual funciona porque es `fixed inset-0`. |
| Terminal de accesos | `pages/recepcion/AccesoTerminalPage.jsx` / `components/recepcion/ScannerPanel.jsx:48-60` | Escáner de cámara continuo (`@yudiel/react-qr-scanner`), sin Wake Lock: en una tablet la pantalla se apaga entre escaneos. |
| Monitor de aforo | `pages/recepcion/AforoMonitorPage.jsx` | Pantalla "Tiempo real" por WebSocket, sin Wake Lock. |
| Tests | `hooks/__tests__/useScreenWakeLock.test.jsx` (7 casos: soporte, request/release, visibilitychange, `screen.brightness`, `setBrightness`), `components/socio/QRFullscreenModal.test.jsx` (9 casos) | El hook está probado con `navigator.wakeLock` mockeado. |
| Secure context | `vite.config.js:43-46` | `allowedHosts` incluye `.ngrok-free.dev` (HTTPS). Wake Lock y `getUserMedia` requieren contexto seguro: en dev por IP de LAN `http://` no funcionan. |

## 4. Alcance
**Incluye:** (a) `manifest.webmanifest` + íconos (192/512/maskable, apple-touch-icon 180) en `frontend/public/`; (b) service worker solo de *app shell* con actualización por aviso; (c) UI de instalación (Android `beforeinstallprompt` + instrucciones iOS); (d) Wake Lock en la terminal de accesos y opcionalmente en el monitor de aforo; (e) indicador discreto del estado del Wake Lock en la credencial; (f) cabeceras de Vercel para `sw.js`/manifest; (g) tests y checklist de Lighthouse/dispositivos.
**No incluye:** modo offline de datos (BK-PLT-03 lo trata como idea aparte), cachear respuestas de `/api` (los QR expiran cada 30 s y hay datos personales), notificaciones push (relacionado: BK-PLT-07, bandeja in-app), control real de brillo (no existe API web estándar).

## 5. Contrato de API
Sin cambios de API. El service worker debe **excluir** `/api/*` y `/ws/*` del precache y de cualquier estrategia de runtime (el proxy de dev usa `/api` y `/ws`, `vite.config.js:47-56`; en producción el rewrite de Vercel ya excluye `api`).

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
### PWA
- **Dependencia (propuesta):** `vite-plugin-pwa` como devDependency (Vite instalado: 6.4.3; confirmar que la versión elegida declara soporte para Vite 6: No verificado). Registro con `registerType: 'prompt'`.
- **Manifiesto** en un módulo propio `frontend/pwa-manifest.js` (exporta el objeto; lo importa `vite.config.js` y un test):
  ```js
  export default {
    name: 'Winnie The Gym', short_name: 'Winnie',
    start_url: '/', scope: '/', display: 'standalone', orientation: 'any',
    background_color: '#121212', theme_color: '#ff5a36',   // tokens: index.css:34 y tailwind.config.js:12
    lang: 'es-AR',
    icons: [ { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
             { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
             { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' } ],
  }
  ```
  `start_url: '/'` redirige a `/dashboard` (`App.jsx:146`) y `ProtectedRoute` envía a `/socio/credencial` a quien intente una ruta no permitida (`ProtectedRoute.jsx:16-19`). Decisión abierta: ¿`start_url` específico por rol? (el manifest es único).
- **Íconos:** generar desde el logo (`WinnieLogo.jsx`: barra con pesas sobre fondo `#ff5a36`) y colocarlos en `frontend/public/icons/`; reemplazar `/vite.svg` por `/icons/favicon.svg` en `index.html:5`.
- **`index.html`:** `<link rel="manifest" href="/manifest.webmanifest">`, `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`, `<meta name="mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` (si se usa `black-translucent` hay que aplicar `pt-safe`, BK-MOB-08).
- **Service worker (Workbox vía plugin):** precache de `index.html` + `assets/*` hasheados; `navigateFallback: '/index.html'` con `navigateFallbackDenylist: [/^\/api\//, /^\/ws\//, /^\/auth\//]`; sin runtime caching de API. Aviso de nueva versión con `sonner` (el repo usa `Toaster` de `sonner`, `App.jsx:63`): "Hay una versión nueva" + acción "Actualizar".
- **Vercel (`vercel.json`):** agregar header `Cache-Control: no-cache` para `/sw.js` y `/manifest.webmanifest`; mantener el resto.
- **Instalación (UI):** hook `frontend/src/hooks/usePwaInstall.js` que captura `beforeinstallprompt` y expone `{ canInstall, install, isStandalone, isIos }` (`isStandalone` con `window.matchMedia('(display-mode: standalone)')` o `navigator.standalone`). Botón "Instalar app" en el sheet "Más" (BK-MOB-01/02) y en `ProfilePage`; en iOS (sin `beforeinstallprompt`) texto: "Tocá Compartir y elegí 'Agregar a pantalla de inicio'".
### Wake Lock
- **Reutilizar** el hook existente: en `AccesoTerminalPage.jsx` `useScreenWakeLock({ enabled: !isManualMode })` (solo con cámara activa) y en `AforoMonitorPage.jsx` un toggle "Mantener pantalla encendida" (`enabled` controlado por estado, por defecto apagado para no consumir batería).
- **Indicador en la credencial:** usar el retorno del hook en `CredencialDigitalPage.jsx:66`: si `!isSupported` o `!isActive` con QR válido, mostrar un aviso discreto `text-xs`: "Tu pantalla puede apagarse. Subí el brillo para mostrar el QR." (copy honesto: el brillo no se puede forzar desde la web). Retirar la promesa de "brillo automático" del copy/README si existiera (`README.md:54` lo promete: "Wake Lock API y brillo automático"; además el README lo ubica en "recepción" cuando el hook solo se usa en la credencial del socio).
- **Contexto seguro:** documentar en README que Wake Lock y cámara requieren HTTPS (usar el túnel ngrok ya permitido en `vite.config.js:46`).
### Estados de UI / textos
Estados: instalable / ya instalada (ocultar botón) / iOS (instrucciones) / actualización disponible (toast con acción). Textos: "Instalar app", "Hay una versión nueva", "Actualizar", "Mantener pantalla encendida".
### Responsive
El botón de instalar vive en el sheet "Más" en móvil y en el menú de usuario del Sidebar en escritorio (`Sidebar.jsx:166-188`).

## 8. Archivos a crear / modificar
- Crear `frontend/public/icons/*` (favicon, 192, 512, maskable, apple-touch), `frontend/pwa-manifest.js`, `frontend/src/hooks/usePwaInstall.js` (+ test), componente `InstallAppButton.jsx`.
- Modificar `frontend/index.html`, `frontend/vite.config.js` (plugin PWA), `frontend/package.json`, `frontend/vercel.json`, `pages/recepcion/AccesoTerminalPage.jsx`, `pages/recepcion/AforoMonitorPage.jsx`, `pages/socio/CredencialDigitalPage.jsx`, `pages/ProfilePage.jsx`, `components/layout/MoreSheet.jsx` (BK-MOB-01).

## 9. Plan de pruebas (TDD)
Convención y comandos: ver BK-MOB-01 §9.
1. `pwa-manifest.test.js`: campos obligatorios (`name`, `short_name`, `start_url`, `display: 'standalone'`, `icons` con 192 y 512 y uno `maskable`); cada `src` existe en `frontend/public/` (`fs.existsSync`).
2. `index.html`: contiene `rel="manifest"`, `apple-touch-icon` y ya no `/vite.svg`.
3. `usePwaInstall.test.jsx`: sin evento → `canInstall=false`; tras `window.dispatchEvent(new Event('beforeinstallprompt'))` con `prompt` mockeado → `canInstall=true` y `install()` llama `prompt()`; `isStandalone` con `matchMedia` stub (ver `setViewport`/mock de BK-MOB-04).
4. `AccesoTerminalPage`: con cámara activa, se invoca `useScreenWakeLock({ enabled: true })`; en modo manual `enabled: false` (mock del hook con `vi.mock('../../hooks/useScreenWakeLock')`, patrón ya usado en el repo para hooks).
5. `CredencialDigitalPage`: con `isSupported=false` aparece el aviso; con `isActive=true` no.
6. `vercel.json`: test que lee el JSON y verifica que el header de `/sw.js` tiene `no-cache` y que el rewrite sigue excluyendo `api`.
7. Build: `npm run build` genera `dist/manifest.webmanifest` y `dist/sw.js` (`fd` en un paso de CI o test manual).
8. Manual: Lighthouse (categoría PWA) sobre `npm run build && npm run preview`; Android Chrome (instalar y abrir en `standalone`), iPhone Safari (Agregar a inicio), verificar que `/api` nunca se sirve desde caché y que tras un deploy aparece el toast de actualización. Probar Wake Lock en Android Chrome (HTTPS) y iOS ≥ 16.4; documentar el resultado (No verificado hoy).

## 10. Criterios de aceptación
- **Dado** Android Chrome sobre HTTPS **cuando** abro la app **entonces** puedo instalarla y abre en modo `standalone` con ícono y color de marca.
- **Dado** iPhone Safari **entonces** hay instrucciones claras para agregarla a inicio y el ícono es el de Winnie.
- **Dado** un deploy nuevo **entonces** el usuario ve "Hay una versión nueva" y puede actualizar sin perder la sesión.
- **Dado** la terminal de accesos con cámara activa **entonces** la pantalla no se apaga.
- **Dado** un navegador sin Wake Lock **entonces** el socio ve un aviso honesto en la credencial.
- Ninguna respuesta de `/api/*` queda cacheada por el service worker.

## 11. Riesgos y decisiones abiertas
1. ¿Vale la pena el service worker o alcanza con manifest (instalable en Android requiere SW con `fetch` handler en navegadores más viejos; Chrome moderno exige manifest + HTTPS)? Recomendación: SW mínimo de shell con `prompt`, por el riesgo de versiones viejas cacheadas (mitigado con el aviso).
2. `start_url` único para todos los roles (recomendado `/`).
3. Brillo: no hay API web estándar; recomendación: mantener el intento best-effort pero no prometerlo en la UI.
4. Una PWA con `black-translucent` exige safe-area superior (BK-MOB-08).
5. El hook `useScreenWakeLock.js` tiene cambios locales sin commitear del dueño: coordinar antes de tocarlo.

## 12. Referencias
BK-PLT-03 (banner offline; no incluye PWA), BK-PLT-07 (notificaciones in-app), BK-MOB-08, BK-MOB-12; PR #110 (commit `cf05fe5`, Wake Lock/brillo/Fullscreen); `docs/qa/plan-de-pruebas.md` (riesgo de compatibilidad móvil del QR). Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", columna "05 · Mobile", módulo Credencial (No verificado el frame exacto).

## 13. Prompt listo para un agente de IA
> Repo Winnie-The-Gym, `frontend/` (Vite 6, React 18, vitest/RTL, hosting Vercel, `vercel.json`). Objetivo: PWA instalable + Wake Lock extendido. Leé `index.html`, `vite.config.js`, `vercel.json`, `src/hooks/useScreenWakeLock.js` (el dueño tiene cambios sin commitear: no lo reescribas, solo consumilo), `src/pages/socio/CredencialDigitalPage.jsx`, `src/pages/recepcion/{AccesoTerminalPage,AforoMonitorPage}.jsx`, `src/components/ui/WinnieLogo.jsx`. TDD primero: `pwa-manifest.test.js` (campos + íconos existentes), test de `index.html` (manifest, apple-touch-icon, sin `/vite.svg`), `usePwaInstall.test.jsx` (`beforeinstallprompt`), tests de páginas (`useScreenWakeLock` mockeado: `enabled` según cámara; aviso en credencial si `!isSupported`), test de `vercel.json` (no-cache en `/sw.js`, rewrite sigue excluyendo `api`). Luego creá `frontend/public/icons/*` (desde el logo), `frontend/pwa-manifest.js`, configurá `vite-plugin-pwa` (`registerType: 'prompt'`, precache de shell, `navigateFallbackDenylist` para `/api`, `/ws`, `/auth`; sin runtime caching de API), `usePwaInstall` + botón "Instalar app" con instrucciones iOS, y Wake Lock en la terminal de accesos. Textos en español rioplatense. Terminado: lint, `npx vitest run --coverage`, `npm run build` (con `dist/manifest.webmanifest` y `dist/sw.js`) y Lighthouse PWA sin errores bloqueantes.
