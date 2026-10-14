---
id: BK-MOB-13
titulo: Rendimiento percibido en móvil (code-splitting por ruta, fuentes sin @import bloqueante, skeletons de carga)
tipo: deuda-tecnica
roles: [socio, recepcionista, administrador]
prioridad: P3
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-MOB-13 · Rendimiento percibido en móvil

## 1. Resumen
Hay evidencia concreta de tres costos para el primer render en un teléfono con red media: (1) todas las páginas se importan de forma estática en `App.jsx` salvo una, así que el socio descarga también el código de reportes, planes, usuarios, etc.; (2) la tipografía se pide con un `@import url(...)` dentro de `index.css`, que bloquea el render y encadena peticiones; (3) varias pantallas muestran texto "Cargando..." en vez de skeletons. La ficha es P3 porque **no hay métricas medidas todavía** (ver §9): el primer paso es medir.

## 2. Objetivo de usuario
Como **socio con datos móviles** quiero **que la credencial y la agenda aparezcan rápido y sin saltos** para **entrar al gimnasio sin esperar**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Rutas | `frontend/src/App.jsx:8-36` | 24 imports estáticos de páginas (Login, Register, Dashboard, Profile, socio/*, recepcion/*, admin/*, Reportes, etc.). |
| Lazy | `frontend/src/App.jsx:38,115-121` | Única ruta lazy: `AccesoTerminalPage` (`lazy(() => import(...))`) con `Suspense fallback={<Skeleton className="h-64 w-full" />}`. |
| Bundle (snapshot local) | `frontend/dist/assets/` (ignorado por git; `index.html` del 21-sep-2026, **posiblemente desactualizado**) | `index-*.js` 711 427 B (194 138 B gzip) con toda la app + vendors; `AccesoTerminalPage-*.js` 157 093 B (62 605 B gzip, lazy por el escáner QR); CSS 42 628 B. No se pudo regenerar el build en este entorno (`esbuild` con binario de otra plataforma en `node_modules`): re-medir. |
| Vite | `frontend/vite.config.js:4-36` | Sin `build.rollupOptions.output.manualChunks`, sin analizador de bundle. |
| Fuentes | `frontend/src/index.css:1` | `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400;500;600&display=swap')`: el CSS de fuentes se descarga después de parsear `index.css` (cadena CSS → CSS de Google → archivos woff2); `display=swap` evita el texto invisible pero no el retraso. `index.html` no tiene `preconnect`. |
| Providers | `frontend/src/main.jsx:30-41` | `GoogleOAuthProvider` envuelve toda la app (incluido el socio ya autenticado); `ReactQueryDevtools` solo en `DEV` (bien). Sentry inicializado antes del render (`main.jsx:8,11`). |
| Skeleton (componente) | `components/ui/Skeleton.jsx:1-3` | `animate-pulse rounded-lg bg-bg-raised`; usado en perfil, dashboard (`AforoCard`, `MovementList`, `AlertList`, `ClassCapacityList`), `DataTable`, historial de pagos, checkout. |
| Carga con texto | `pages/ClassSchedulePage.jsx:181-185,208-212` (`EmptyState` "Cargando calendario..."/"Cargando lista..."), `pages/socio/ClasesPage.jsx:257-261` ("Cargando clases..."), `pages/socio/CredencialDigitalPage.jsx:112` (`<div className="flex justify-center p-8">Cargando...</div>`), `pages/admin/AdminUsuariosPage.jsx:60`, `pages/recepcion/ReportesPage.jsx:137` | Sin skeleton ni reserva de espacio: provoca saltos de layout (CLS) al llegar los datos. |
| Datos | `main.jsx:21-28` | React Query `staleTime: 30_000`, `retry: 1`. |
| Tests | `fd "App.test" src` → ninguno | No hay test de rutas/lazy. |

## 4. Alcance
**Incluye:** (a) medir (Lighthouse móvil + analizador de bundle) y fijar un presupuesto; (b) `React.lazy` por grupo de rutas (admin/recepción vs socio) con `Suspense`; (c) `manualChunks` de vendors; (d) fuentes con `<link rel="preconnect">` + `<link rel="stylesheet">` en `index.html` (y/o autoalojadas); (e) skeletons para calendario, clases del socio, credencial, usuarios y reportes; (f) tests.
**No incluye:** SSR, cambio de librerías, caching offline (BK-MOB-10/BK-PLT-03), optimización de imágenes (no hay imágenes relevantes verificadas).

## 5. Contrato de API
Sin cambios de API.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
1. **Medir primero** (no se implementa nada hasta tener la línea base): agregar `rollup-plugin-visualizer` como devDependency (versión a confirmar compatible con Vite 6: No verificado) y correr Lighthouse en perfil móvil (4G lento) sobre `npm run build && npm run preview` para `/login`, `/socio/credencial` y `/dashboard`. Registrar LCP, TBT, CLS y bytes de JS inicial en `docs/qa/`.
2. **Lazy por ruta** (`App.jsx:8-36`): convertir a `lazy(() => import('./pages/...'))` las páginas de staff (`admin/*`, `recepcion/*`, `ClassSchedulePage`, `CreateClassPage`, `AttendancePage`) y dejar estáticas `LoginPage`, `DashboardPage`, `socio/CredencialDigitalPage` (ruta de entrada del socio). Envolver `<Routes>` en un único `<Suspense fallback={<RouteSkeleton />}>` (nuevo `components/ui/RouteSkeleton.jsx`: barra superior + 3 bloques `Skeleton`). Mantener el patrón ya usado para `AccesoTerminalPage` (`App.jsx:115-121`).
3. **Chunks de vendors** en `vite.config.js`: `build: { rollupOptions: { output: { manualChunks: { react: ['react','react-dom','react-router-dom'], query: ['@tanstack/react-query'], sentry: ['@sentry/react'] } } } }` (ajustar según el reporte del visualizador).
4. **Fuentes:** quitar el `@import` de `index.css:1`; en `index.html` agregar `<link rel="preconnect" href="https://fonts.googleapis.com">`, `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` y `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?...&display=swap">` (misma URL). Evaluar quitar los pesos no usados (700 de Inter, 600 de Roboto Mono): No verificado qué pesos se usan realmente.
5. **Skeletons** (reservar el alto final): `ClassSchedulePage.jsx:181-185,208-212` → grilla/lista de `Skeleton`; `ClasesPage.jsx:257-261` → 3 tarjetas `Skeleton h-24`; `CredencialDigitalPage.jsx:112` → tarjeta con cuadrado de QR (`Skeleton aspect-square w-56`); `AdminUsuariosPage.jsx:60` → `DataTable loading` (BK-MOB-04).
6. **Google OAuth:** evaluar montar `GoogleOAuthProvider` solo en `/login` y `/registro` (No verificado dónde se consume `useGoogleLogin`; `rg "react-oauth" src`).
- **Estados de UI:** skeleton (carga), vacío/error sin cambios. **Textos:** sin cambios. **Responsive:** beneficio principal en 375 px con red lenta.

## 8. Archivos a crear / modificar
- Modificar `src/App.jsx`, `vite.config.js`, `index.html`, `src/index.css`, `pages/ClassSchedulePage.jsx`, `pages/socio/{ClasesPage,CredencialDigitalPage}.jsx`, `pages/admin/AdminUsuariosPage.jsx`, `package.json`.
- Crear `components/ui/RouteSkeleton.jsx` (+ test), informe de línea base en `docs/qa/` (opcional).

## 9. Plan de pruebas (TDD)
Convención y comandos: ver BK-MOB-01 §9.
1. Línea base (manual, previa): Lighthouse móvil en `/login`, `/socio/credencial`, `/dashboard` + reporte del visualizador; guardar números.
2. `RouteSkeleton.test.jsx`: renderiza ≥ 3 `Skeleton` y es estable (sin texto "Cargando").
3. `App.test.jsx` (nuevo; no existe hoy): con `renderWithProviders(<App/>, { route: '/admin/socios', authState: { accessToken: 't', user: makeAuthedUser('admin') } })` (mockeando la página con `vi.mock`) se ve primero el fallback y luego la página (`findByText`); con rol socio en `/admin/socios` redirige sin cargar el chunk de admin.
4. Tests de páginas: `ClassSchedulePage` con query en `isLoading` renderiza skeletons (`getAllByTestId('skeleton')` si se agrega `data-testid`, o por clase `animate-pulse`) en lugar de "Cargando calendario...". Actualizar los tests existentes que busquen ese texto (`pages/__tests__/ClassSchedulePage.test.jsx`, `pages/socio/ClasesPage.test.jsx`, `pages/socio/CredencialDigitalPage.test.jsx`).
5. Test estático de `index.html`: contiene `rel="preconnect"` a `fonts.googleapis.com` y `index.css` ya no contiene `@import url(`.
6. Presupuesto en CI (opcional): script que falle si `dist/assets/index-*.js` supera el umbral definido tras la medición inicial (No definido: decidir con los números de la línea base).
7. Después de cambiar: repetir Lighthouse y comparar; verificar con la pestaña Network (throttling "Slow 4G") que el socio no descarga los chunks de admin.

## 10. Criterios de aceptación
- **Dado** un socio en `/socio/credencial` **entonces** no se descargan los chunks de admin/recepción.
- **Dado** `/login` **entonces** la fuente se pide con `preconnect` y `index.css` no tiene `@import` remoto.
- **Dado** la carga de calendario, clases o credencial **entonces** se muestran skeletons que ocupan el alto final (sin salto de layout).
- **Dado** la línea base **entonces** el JS inicial y el LCP mejoran respecto de ella (meta numérica a fijar tras medir).

## 11. Riesgos y decisiones abiertas
1. Sin medición previa no se justifica toda la ficha: recomendación, ejecutar solo el paso 1 y decidir con datos.
2. Lazy-loading agrega un salto de carga al navegar entre secciones de staff; mitigar con precarga al pasar el cursor/foco (`onMouseEnter` → `import()`), solo si se mide una regresión.
3. Autoalojar las fuentes mejora privacidad y velocidad pero requiere versionarlas (`frontend/public/`, hoy inexistente; ver BK-MOB-10).

## 12. Referencias
BK-MOB-04 (skeleton de cards), BK-MOB-10 (service worker/precache), BK-PLT-03 (estado offline). `docs/qa/plan-de-pruebas.md` (No verificado si define metas de rendimiento; `rg -i "rendimiento|performance" docs/qa`). Figma (opcional): no aplica.

## 13. Prompt listo para un agente de IA
> Repo Winnie-The-Gym, `frontend/` (Vite 6, React 18, react-router-dom 7, vitest/RTL). Objetivo: mejorar el rendimiento percibido en móvil **con datos**. Paso 0: agregá `rollup-plugin-visualizer`, generá el reporte de bundle y corré Lighthouse móvil en `/login`, `/socio/credencial` y `/dashboard`; guardá los números en `docs/qa/`. Luego, TDD: `RouteSkeleton.test.jsx`, `App.test.jsx` (fallback y carga lazy; el socio no importa páginas de admin), tests de skeleton en `ClassSchedulePage`, `ClasesPage` y `CredencialDigitalPage`, y test estático de `index.html`/`index.css` (preconnect y sin `@import url(`). Implementá: `React.lazy` para páginas de staff en `App.jsx` (siguiendo el patrón de `AccesoTerminalPage`), un único `Suspense` con `RouteSkeleton`, `manualChunks` en `vite.config.js`, fuentes por `<link>` con `preconnect`, y skeletons que reserven el alto final. Textos en español rioplatense. Terminado: lint, `npx vitest run --coverage` y `npm run build` verdes y mejora medible respecto de la línea base.
