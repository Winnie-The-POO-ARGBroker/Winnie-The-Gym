---
id: BK-PLT-03
titulo: Banner de sin conexión y manejo global de errores de red / servidor dormido
tipo: ui-estado
roles: [administrador, recepcionista, socio]
prioridad: P2
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-PLT-03 · Banner de sin conexión y manejo global de errores de red / servidor dormido

## 1. Resumen
No existe un estado "sin conexión" global. Los errores de red aparecen solo como toasts sueltos en un par de pantallas (`RegisterPage`, `usePlanes`); el resto de las pantallas falla sin explicación. Además el backend de producción corre en Render Free y se duerme (cold start), situación que hoy se ve como errores de red genéricos. Mucho valor en el socio móvil (gimnasio con mala señal) y en la terminal de recepción.

## 2. Objetivo de usuario
Como **socio o recepcionista** quiero **ver un aviso persistente cuando no tengo conexión o el servidor no responde, y que la app se recupere sola** para **no pensar que la app está rota ni perder tiempo en la puerta del gimnasio**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Frontend utilidades | `frontend/src/utils/errorHandling.js:12-14` | `classifyError`: si `!error.response` → `ClassifiedError('network','Error de red')`. Solo lo usan `services/reportsService.js` y `hooks/queries/usePlanes.js` (verificado con `rg classifyError`). |
| Frontend hook | `frontend/src/hooks/queries/usePlanes.js:48-52` | `case 'network'`: `toast.error('Sin conexión', { action: { label: 'Reintentar', onClick: () => refetch() } })`. Único toast con reintento. |
| Frontend página | `frontend/src/pages/RegisterPage.jsx:107` | Literal `'Error de red. Revisá tu conexión e intentá de nuevo.'`. |
| Frontend cliente | `frontend/src/services/api.js:93-150` | Interceptor de respuesta solo contempla 401; los errores sin `response` pasan con `Promise.reject(error)` (línea ~150). |
| Frontend React Query | `frontend/src/main.jsx:21-28` | `QueryClient` con `staleTime: 30_000, retry: 1`. No hay `onlineManager`, ni `QueryCache` con `onError` global. |
| Búsqueda de offline | `rg "navigator.onLine\|'online'\|offline" frontend/src` | Sin resultados fuera de tests (verificado). No hay Service Worker ni manifest PWA verificados (No verificado). |
| WebSocket | `frontend/src/hooks/useWebSocket.js:77-141` | Reconexión con backoff y `isReconnecting`/`isConnecting`; el aforo (`AforoMonitorPage.jsx:38`) lo consume. No hay indicador global. |
| Infra | `render.yaml:23` (`plan: free`) y `docs/deploy.md:177-179` | Render Free duerme el servicio tras 15 min sin tráfico; UptimeRobot (ping /api/health/ cada 5 min) lo mantiene despierto. |
| Backend health | `backend/core/urls.py` (función `health`, ruta `api/health/`) | Responde `{status, service, version, checks}`; 200 si postgres+redis OK; 503 `unhealthy` si no. Reutilizable para "ping de recuperación". |

## 4. Alcance
**Incluye:** hook `useOnlineStatus` (eventos `online`/`offline` + ping opcional a `/api/health/`), banner global fijo "Sin conexión" (rol `status`/`aria-live`), integración con React Query (`onlineManager`) para pausar/reanudar, `QueryCache.onError` global que muestre un único toast de "no pudimos conectar con el servidor" (deduplicado) para errores `network` y 502/503/504, y estado de "servidor despertando" (timeout largo + mensaje).
**No incluye:** PWA/Service Worker/cola de acciones offline (idea aparte, ver decisiones abiertas), reintento de mutaciones, página 500 (BK-PLT-01).

## 5. Contrato de API
Usa endpoint existente **[EXISTE]** `GET /api/health/` (sin auth; ver `core/urls.py`). Respuesta: `{"status": "ok"|"degraded"|"unhealthy", "service": "winnie-the-gym-api", "version": "1.0.0", "checks": {"postgres": {"ok": bool, "critical": bool}, ...}}`; HTTP 503 si `postgres` o `redis` caen. Sin cambios de backend.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Rutas:** ninguna. El banner se monta una vez en `App.jsx` junto a `<Toaster/>` (línea 63).
- **Cliente HTTP:** `import api from '../services/api'` (axios, `baseURL = VITE_API_URL || '/api'`). Para el ping usar `axios` plano o `fetch` a `${baseURL}/health/` con timeout corto, SIN pasar por el interceptor.
- **Componentes/hooks nuevos:**
  - `frontend/src/hooks/useOnlineStatus.js` — devuelve `{ isOnline, isServerReachable }`; escucha `window` `online`/`offline`; cuando vuelve `online` hace ping a health antes de marcar `isServerReachable=true`.
  - `frontend/src/components/system/ConnectionBanner.jsx` — banner `fixed top-0 inset-x-0 z-50` con `role="status"` y `aria-live="polite"`; clases con tokens (`bg-warning-…` si existe; el token `warning-500` existe: se usa en `components/recepcion/ValidationResult.jsx` (`border-l-warning-500`)).
  - En `main.jsx`: crear `QueryClient` con `queryCache: new QueryCache({ onError })` y conectar `onlineManager.setEventListener` de `@tanstack/react-query` v5.
- **Estados de UI:** offline (banner ámbar persistente), reconectando (spinner `lucide-react` `Loader2`), recuperado (toast `success` "Volviste a estar en línea" 2 s y `queryClient.invalidateQueries()`), servidor dormido (si una request supera ~8 s: toast `loading` "Estamos despertando el servidor, puede tardar unos segundos").
- **Textos (es-AR):** "Sin conexión. Algunas funciones no van a estar disponibles." / "Reconectando…" / "Volviste a estar en línea." / "No pudimos conectar con el servidor. Reintentá en unos segundos."
- **Responsive:** a 375 px el banner ocupa todo el ancho y empuja `AppBottomNav` no; debe ser `position: fixed` por encima del contenido sin tapar el `TopBar` (agregar `pt-` condicional) — verificar en `MemberLayout.jsx` también (layout socio distinto a `AppLayout`).

## 8. Archivos a crear / modificar
- Crear `frontend/src/hooks/useOnlineStatus.js` + `__tests__/useOnlineStatus.test.jsx`.
- Crear `frontend/src/components/system/ConnectionBanner.jsx` + test.
- Modificar `frontend/src/main.jsx` (QueryCache onError + onlineManager).
- Modificar `frontend/src/App.jsx` (montar banner).
- Modificar `frontend/src/pages/RegisterPage.jsx:107` para reutilizar el mensaje común (opcional).

## 9. Plan de pruebas (TDD)
Vitest + RTL + jsdom (`vite.config.js` test env). Escribir primero:
- `useOnlineStatus`: `window.dispatchEvent(new Event('offline'))` dentro de `act` → `isOnline=false`; `online` + ping mockeado OK → `isServerReachable=true`; ping falla → sigue false.
- `ConnectionBanner`: con `isOnline=false` renderiza `role="status"` con el texto; con `true` no renderiza nada.
- QueryCache: dos errores de red seguidos disparan UN solo toast (mock de `sonner` como en `services/__tests__/api.test.js`).
- Manual: DevTools → Network → Offline en `http://localhost:5173` con cada rol; luego Online y verificar que las queries se refrescan. Probar con backend apagado (`docker compose stop backend`).
Comandos: `cd frontend && npx vitest run && npm run lint`.

## 10. Criterios de aceptación
- **Dado** que el navegador pierde conexión **cuando** ocurre **entonces** aparece el banner en cualquier pantalla y desaparece al volver.
- **Dado** un error de red en cualquier `useQuery` **cuando** ocurre **entonces** el usuario ve a lo sumo un toast (no uno por query).
- **Dado** que vuelve la conexión **cuando** el ping a `/api/health/` responde 200 **entonces** se refrescan las queries activas.

## 11. Riesgos y decisiones abiertas
- ¿Hacer una PWA con Service Worker para credencial QR offline del socio? Es una idea mayor (`solo-idea`): el QR dinámico dura 30 s (`GenerateQRView`, `backend/apps/access/views.py:36-47`), por lo que offline no es utilizable. **Recomendación:** no incluir en este ítem.
- ¿Mostrar "servidor despertando"? Depende de si producción seguirá en plan Free (`render.yaml:23`).
- Evitar falsos positivos con `navigator.onLine` (puede ser `true` sin internet): por eso el ping.

## 12. Referencias
- `docs/deploy.md` § 6 (UptimeRobot), `render.yaml`.
- Figma (opcional): "vistas live", estados del sistema / offline (No verificado).

## 13. Prompt listo para un agente de IA
```
Contexto: frontend React 18 + Vite + @tanstack/react-query v5 + axios (frontend/src/services/api.js) + sonner + Vitest/RTL. No hay estado offline global; solo toasts sueltos (usePlanes.js:48-52, RegisterPage.jsx:107). QueryClient se crea en frontend/src/main.jsx.
Tarea (docs/backlog/items/BK-PLT-03-estado-offline-sin-conexion.md): TDD primero: tests de useOnlineStatus y ConnectionBanner y del dedupe de toasts. Luego implementá hooks/useOnlineStatus.js (eventos online/offline + ping GET {VITE_API_URL||'/api'}/health/ sin pasar por el interceptor), components/system/ConnectionBanner.jsx (role="status", aria-live) montado en App.jsx, y QueryCache.onError + onlineManager en main.jsx. Copy en español rioplatense. Tokens de color verificados en uso: warning-500, success-500, error-500, bg-bg-surface (ver ValidationResult.jsx).
Terminado: `cd frontend && npm run lint && npx vitest run --coverage` verdes.
```
