---
id: BK-MOB-12
titulo: La cabecera Permissions-Policy de Vercel bloquea la cámara y rompe el escaneo de QR en producción
tipo: bug
roles: [recepcionista, administrador]
prioridad: P0
tamano: S
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-MOB-12 · `Permissions-Policy: camera=()` bloquea el escáner de QR

## 1. Resumen
`frontend/vercel.json` envía en todas las respuestas `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Con una lista vacía, la función `camera` queda deshabilitada **para el propio origen** (no solo para iframes de terceros), por lo que `getUserMedia` del escáner de la terminal de accesos (`@yudiel/react-qr-scanner`) falla con `NotAllowedError` y la app cae siempre al modo "DNI manual". Impacta directamente el flujo móvil/tablet de recepción (validar QR en menos de 2 s es un requisito del producto). La cabecera se verificó leyendo la configuración; **no se verificó contra el despliegue real** (ver §9, paso manual).

## 2. Objetivo de usuario
Como **recepcionista** quiero **escanear el QR del socio con la cámara de mi celular o tablet en producción** para **validar el ingreso sin tipear el DNI**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Despliegue | `frontend/vercel.json:20-28` | Para `source: "/(.*)"`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. |
| Hosting | `docs/architecture.md:21,45-47,75` | El frontend se sirve desde Vercel (HTTPS) y las apps móviles usan ese mismo origen. |
| Escáner | `frontend/src/components/recepcion/ScannerPanel.jsx:5,48-66` | `<Scanner onScan onError ...>` de `@yudiel/react-qr-scanner` (dependencia en `frontend/package.json`), que abre la cámara con `getUserMedia`. |
| Fallback | `ScannerPanel.jsx:20-25`, `pages/recepcion/AccesoTerminalPage.jsx:102-105` | `onError` → `onCameraError` → `setCameraError(true); setIsManualMode(true)` y el aviso "No se pudo acceder a la cámara. Por favor, ingrese el DNI manualmente." Es decir, el bloqueo no se ve como un error de configuración sino como "falla de cámara". |
| Tests | `rg "Permissions-Policy" frontend` | Ninguno cubre `vercel.json`. No existe `ScannerPanel.test.jsx`. |
| Dev | `frontend/vite.config.js:37-57` | El servidor de desarrollo no agrega esa cabecera: en local la cámara funciona (por eso no se detecta en desarrollo). |

## 4. Alcance
**Incluye:** cambiar la cabecera a `camera=(self)`, test que impida la regresión, verificación en el despliegue y mensaje de error más específico en el escáner.
**No incluye:** otras cabeceras de seguridad (CSP, HSTS), cambios en el escáner o en el flujo manual, Wake Lock (BK-MOB-10).

## 5. Contrato de API
Sin cambios de API.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- `frontend/vercel.json:26` → `{ "key": "Permissions-Policy", "value": "camera=(self), microphone=(), geolocation=()" }` (mantiene deshabilitados micrófono y geolocalización, hoy sin uso: `rg "geolocation|getUserMedia" frontend/src` no muestra uso propio).
- `ScannerPanel.jsx`/`AccesoTerminalPage.jsx`: diferenciar el error (`error.name === 'NotAllowedError'`) y mostrar "El navegador bloqueó la cámara. Habilitá el permiso en la configuración del sitio" en lugar del mensaje genérico (texto UI en español rioplatense: "Habilitá la cámara en los permisos del sitio o ingresá el DNI manualmente").
- Estados de UI: cámara activa, permiso denegado (mensaje específico), sin cámara/otro error (mensaje actual), modo manual.
- Responsive: sin cambios de layout.

## 8. Archivos a crear / modificar
- Modificar `frontend/vercel.json`, `frontend/src/components/recepcion/ScannerPanel.jsx` o `AccesoTerminalPage.jsx` (mensaje).
- Crear `frontend/src/__tests__/vercelConfig.test.js` y `frontend/src/components/recepcion/ScannerPanel.test.jsx`.

## 9. Plan de pruebas (TDD)
Convención y comandos: ver BK-MOB-01 §9 (vitest + RTL; `cd frontend && npx vitest run <ruta>`).
1. `vercelConfig.test.js` (rojo hoy): lee `frontend/vercel.json` con `fs`/`import`, busca el header `Permissions-Policy` y verifica con regex que `camera` incluye `self` y que `microphone` y `geolocation` siguen vacíos.
2. `ScannerPanel.test.jsx`: mockear `@yudiel/react-qr-scanner` (`vi.mock`) para invocar `onError({ name: 'NotAllowedError' })` y comprobar que se llama `onCameraError` y que `AccesoTerminalPage` muestra el mensaje de permisos; con otro error, el mensaje genérico.
3. Manual en producción: `curl -sI https://<dominio-del-frontend>/ | rg -i permissions-policy` debe mostrar `camera=(self)`; abrir `/recepcion/acceso` en Android Chrome (HTTPS) con cuenta de recepción (seed `recepcion`, ver `seed_demo_users`; no imprimir contraseñas), aceptar el permiso y escanear un QR de `/socio/credencial`. En iOS Safari idem.
4. Verificar en DevTools > Application > Permissions Policy que `camera` figura como permitida.

## 10. Criterios de aceptación
- **Dado** producción en Vercel **cuando** el recepcionista abre `/recepcion/acceso` **entonces** el navegador pide permiso de cámara y, concedido, el escáner lee QR.
- **Dado** que el usuario deniega el permiso **entonces** ve un mensaje específico y puede usar el DNI manual.
- **Dado** `vercel.json` **entonces** `microphone` y `geolocation` permanecen deshabilitados y un test impide volver a bloquear la cámara.

## 11. Riesgos y decisiones abiertas
1. Confirmar en el despliegue real que la cabecera efectivamente se aplica (otro proxy/CDN podría sobrescribirla; No verificado).
2. ¿Hay más orígenes que deban usar la cámara (iframes, subdominios)? Recomendación: solo `self`.
3. Si se instala como PWA (BK-MOB-10) la política se mantiene; verificar permisos en modo `standalone`.

## 12. Referencias
BK-ACC-01 (terminal de accesos), BK-MOB-10, `docs/architecture.md` (Vercel). Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", módulo Acceso/Recepción (No verificado el frame exacto).

## 13. Prompt listo para un agente de IA
> Repo Winnie-The-Gym, `frontend/` (Vite + React, hosting Vercel). Bug: `frontend/vercel.json` define `Permissions-Policy: camera=(), microphone=(), geolocation=()`, lo que bloquea la cámara del propio sitio y rompe `ScannerPanel` (`@yudiel/react-qr-scanner`) en producción. TDD: creá `frontend/src/__tests__/vercelConfig.test.js` que lea `vercel.json` y exija `camera=(self)` con micrófono y geolocalización vacíos (debe fallar hoy), y `ScannerPanel.test.jsx` (mock de `@yudiel/react-qr-scanner`, `onError({name:'NotAllowedError'})` → `onCameraError`). Luego cambiá la cabecera a `camera=(self), microphone=(), geolocation=()` y mostrá en `AccesoTerminalPage`/`ScannerPanel` un mensaje específico cuando el error sea `NotAllowedError` ("Habilitá la cámara en los permisos del sitio o ingresá el DNI manualmente"). No toques otras cabeceras. Terminado: lint, `npx vitest run --coverage` y `npm run build` verdes; tras el deploy, `curl -sI` muestra `camera=(self)` y el escáner funciona en un celular.
