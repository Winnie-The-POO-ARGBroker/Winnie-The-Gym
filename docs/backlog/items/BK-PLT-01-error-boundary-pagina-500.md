---
id: BK-PLT-01
titulo: Error Boundary global y página de error inesperado (500)
tipo: ui-estado
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: M
estado_en_codigo: no-existe
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-PLT-01 · Error Boundary global y página de error inesperado (500)

## 1. Resumen
Si un componente lanza una excepción durante el render, React desmonta todo el árbol y el usuario ve una pantalla en blanco. No hay ningún Error Boundary en el frontend ni página de "algo salió mal". Sentry está inicializado pero nunca recibe estos errores de render.

## 2. Objetivo de usuario
Como **cualquier usuario** quiero **ver una pantalla de error clara con una acción para recuperarme** para **no quedar frente a una pantalla en blanco cuando algo se rompe**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Frontend raíz | `frontend/src/main.jsx:30` | `createRoot(...).render(<StrictMode><QueryClientProvider>…<BrowserRouter><App/>…)` sin ningún Error Boundary entre medio. |
| Frontend App | `frontend/src/App.jsx:61-151` | `<Toaster/>` + `<Routes>`; no hay `errorElement` ni boundary. `rg "ErrorBoundary" frontend/src` no devuelve resultados (verificado). |
| Frontend Sentry | `frontend/src/lib/sentry.js:12-40` | `initSentry()` solo hace `Sentry.init` si existe `VITE_SENTRY_DSN`; sin DSN retorna sin hacer nada. |
| Frontend Sentry uso | `frontend/src/hooks/queries/usePlanes.js:55` | Único lugar con `Sentry.captureException` (error `server` de una mutación). Los errores de render no se reportan. |
| Dependencia | `frontend/package.json:18` | `@sentry/react ^8.30.0` ya instalado (incluye `Sentry.ErrorBoundary`, no verificado en el código fuente local porque `node_modules` no se inspeccionó). |
| Página 404 (modelo visual) | `frontend/src/pages/NotFoundPage.jsx:1-28` | Usa `WinnieLogo`, `Button variant="primary"` y tokens `bg-bg-base`, `text-primary`, `text-text-primary`, `text-text-secondary`. Es la referencia de estilo para la nueva pantalla. |
| Manejo de errores de red/API | `frontend/src/utils/errorHandling.js:17-25` | `classifyError` produce `ClassifiedError` con tipo `server` para status >= 500, solo usado en `reportsService.js` y `usePlanes.js`. No cubre errores de render. |

## 4. Alcance
**Incluye:** componente `ErrorBoundary` (clase) que captura errores de render, reporta a Sentry, muestra `ErrorFallbackPage` con botones "Reintentar" (resetea el boundary) y "Ir al inicio"; boundary global en `main.jsx`; boundary por ruta dentro de `AppLayout` para que un error en una página no tumbe el sidebar; tests.
**No incluye:** errores de `useQuery` (se manejan en cada hook), página 403 (ver BK-PLT-02), banner offline (BK-PLT-03), reintentos automáticos de chunks lazy (`AccesoTerminalPage` es `lazy`, App.jsx:38) — mencionarlo como decisión abierta.

## 5. Contrato de API
Sin cambios de API. Ningún endpoint nuevo.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Rutas y guard de rol:** sin ruta nueva. El fallback se renderiza en el lugar del árbol que falló. Las rutas se declaran en `App.jsx` como `<Route path=... element={<ProtectedRoute roles={[...]}><Page/></ProtectedRoute>}/>`.
- **Componentes a reutilizar:** `WinnieLogo` (`components/ui/WinnieLogo`), `Button` (`components/ui/Button.jsx`, props `variant: primary|secondary|ghost|danger`, `size: sm|md|lg`, `loading`, `onClick`), estructura de `NotFoundPage.jsx`.
- **Componentes nuevos:**
  - `frontend/src/components/errors/ErrorBoundary.jsx` — class component con `static getDerivedStateFromError`, `componentDidCatch(error, info)` → `Sentry.captureException(error, { extra: { componentStack: info.componentStack } })`, prop `fallback` (render-prop `({error, reset}) => node`) y prop `resetKeys` (array; si cambia, resetea — usar `location.pathname`).
  - `frontend/src/pages/ErrorFallbackPage.jsx` — pantalla completa con mismo estilo que 404.
- **Colocación:** envolver en `main.jsx` dentro de `StrictMode` y por fuera de `QueryClientProvider`; y envolver `{children}` de `AppLayout` (`components/layout/AppLayout.jsx`) con boundary con `resetKeys=[pathname]`.
- **Estados de UI:** el único estado es el de error. Mostrar el mensaje técnico (`error.message`) solo si `import.meta.env.DEV`.
- **Textos (es-AR, voseo):** título "Algo salió mal"; descripción "Tuvimos un problema inesperado. Ya registramos el error para revisarlo."; botones "Reintentar" y "Volver al inicio".
- **Responsive:** columna centrada `min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center` (igual que 404): a 375 px los botones apilados con `w-full max-w-xs`; a 768 px en fila.
- **Convenciones del repo:** toasts con `sonner`; iconos `lucide-react` (p. ej. `TriangleAlert`); lint `eslint ... --max-warnings 0` con `react/prop-types` apagado (`.eslintrc.cjs`).

## 8. Archivos a crear / modificar
- Crear `frontend/src/components/errors/ErrorBoundary.jsx` y `ErrorBoundary.test.jsx`.
- Crear `frontend/src/pages/ErrorFallbackPage.jsx` y `ErrorFallbackPage.test.jsx`.
- Modificar `frontend/src/main.jsx` (envolver `<App/>`).
- Modificar `frontend/src/components/layout/AppLayout.jsx` (boundary por página).
- Opcional: `frontend/src/lib/sentry.js` sin cambios (`captureException` es no-op sin `init`).

## 9. Plan de pruebas (TDD)
Convención: Vitest + React Testing Library, tests colocados junto al archivo (`*.test.jsx`) o en `__tests__/`; `vite.config.js` define `globals: true`, `environment: 'jsdom'`, `setupFiles: './setupTests.js'`. Comandos: `cd frontend && npx vitest run` (o `docker compose exec frontend npx vitest run --coverage`); lint: `npm run lint`. Umbrales de cobertura: líneas 68, ramas 68, funciones 65, statements 68.
Escribir primero:
- `ErrorBoundary.test.jsx`: componente hijo que hace `throw new Error('boom')` → se renderiza el fallback con "Algo salió mal"; `vi.mock('@sentry/react')` y verificar `captureException` llamado una vez con el error; silenciar `console.error` con `vi.spyOn`.
- Click en "Reintentar" con hijo que deja de fallar (flag mutable) → vuelve a renderizar el hijo.
- Cambio de `resetKeys` resetea el estado de error.
- `ErrorFallbackPage`: botón "Volver al inicio" navega a `/dashboard` (usar `MemoryRouter`).
- Manual: en dev, agregar temporalmente un `throw` en `DashboardPage`; verificar pantalla de error, que el sidebar sigue funcionando (boundary por página) y que "Reintentar" funciona. Probar con las tres cuentas de `seed_demo_users`.

## 10. Criterios de aceptación
- **Dado** un error de render en cualquier página **cuando** ocurre **entonces** el usuario ve "Algo salió mal" con "Reintentar" y "Volver al inicio", no una pantalla blanca.
- **Dado** un error de render dentro de una página con `AppLayout` **cuando** ocurre **entonces** el sidebar/bottom-nav siguen operativos.
- **Dado** que Sentry tiene DSN **cuando** se captura el error **entonces** se envía con el component stack.
- **Dado** que se navega a otra ruta **cuando** el boundary estaba en estado de error **entonces** se resetea.

## 11. Riesgos y decisiones abiertas
- ¿Usar `Sentry.ErrorBoundary` directamente o un boundary propio? **Recomendación:** boundary propio (testeable, sin acoplar la UI a Sentry) que llama a `Sentry.captureException`.
- Chunks lazy (`AccesoTerminalPage`) que fallan al cargar tras un deploy: ¿recargar la página automáticamente una vez? Recomendación: mostrar el fallback con botón "Recargar".
- No mostrar `error.message` en producción para no filtrar detalles internos.

## 12. Referencias
- `frontend/src/pages/NotFoundPage.jsx`, `frontend/src/lib/sentry.js`.
- `docs/deploy.md` § 7 (Sentry opcional, `VITE_SENTRY_DSN`).
- Figma (opcional): archivo `WuBKhksfVVcBjNKbDVX5EM`, página "vistas live", estados del sistema (No verificado qué frame corresponde).

## 13. Prompt listo para un agente de IA
```
Contexto: repo Winnie The Gym, frontend React 18 + Vite + react-router-dom v7 + Tailwind (tokens bg-bg-base, text-text-primary, etc.), tests con Vitest + RTL. No existe ningún Error Boundary (main.jsx monta <App/> directo). Sentry se inicializa en frontend/src/lib/sentry.js solo si hay VITE_SENTRY_DSN.
Tarea: (1) TDD primero: escribí ErrorBoundary.test.jsx y ErrorFallbackPage.test.jsx según el plan de BK-PLT-01 (docs/backlog/items/BK-PLT-01-error-boundary-pagina-500.md). (2) Implementá frontend/src/components/errors/ErrorBoundary.jsx (class component, prop fallback render-prop y resetKeys, Sentry.captureException en componentDidCatch) y frontend/src/pages/ErrorFallbackPage.jsx replicando el estilo de NotFoundPage.jsx con textos en español rioplatense ("Algo salió mal", "Reintentar", "Volver al inicio"). (3) Envolvé <App/> en main.jsx y los children de AppLayout.jsx con resetKeys=[pathname]. 
Definición de terminado: `cd frontend && npm run lint && npx vitest run --coverage` verdes (umbrales 68/68/65/68), sin tocar archivos no listados.
```
