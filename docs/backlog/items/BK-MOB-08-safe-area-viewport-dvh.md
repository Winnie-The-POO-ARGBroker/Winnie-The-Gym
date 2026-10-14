---
id: BK-MOB-08
titulo: Safe-area insets, viewport-fit=cover, unidades dvh y theme-color
tipo: mobile
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: S
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-MOB-08 · Safe-area, viewport y alto dinámico

## 1. Resumen
El código ya intenta respetar el notch/home-indicator con `env(safe-area-inset-bottom)` en las dos bottom navs, pero `index.html` declara el viewport **sin `viewport-fit=cover`**, por lo que esas variables valen 0 en iOS (el padding nunca se aplica). Además los layouts usan `h-screen`/`min-h-screen` (100vh), que en navegadores móviles incluye la zona tapada por la barra del navegador, y las navs fijas calculan su alto con `h-14` en `box-sizing: border-box`, de modo que aun con inset el contenido se comprime.

## 2. Objetivo de usuario
Como **usuario de iPhone/Android** quiero **que la barra inferior no quede debajo del indicador de inicio ni de la barra del navegador** para **tocar la navegación sin errores y ver todo el contenido**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Viewport | `frontend/index.html:6` | `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` — sin `viewport-fit=cover`. Sin `theme-color`, sin `apple-mobile-web-app-*`, sin `color-scheme`. Favicon `/vite.svg` (`index.html:5`). |
| Nav staff | `components/layout/AppBottomNav.jsx:31-34` | `h-14` + `style={{ paddingBottom: 'max(0rem, env(safe-area-inset-bottom))' }}`: con `box-sizing: border-box` (`index.css:61-63`) el padding resta del alto fijo; sin `viewport-fit=cover` el valor es 0. |
| Nav socio | `components/layout/MemberLayout.jsx:64-66` | `h-14 ... pt-1.5 pb-2` + `paddingBottom: max(0.5rem, env(safe-area-inset-bottom))`: contenido útil ≈ 42 px o menos. |
| Relleno del contenido | `AppLayout.jsx:8` (`pb-14 md:pb-0`), `MemberLayout.jsx:59` (`pb-24 md:pb-4`) | No suman el inset inferior. |
| 100vh | `components/layout/AppLayout.jsx:6`, `Sidebar.jsx:72` (`h-screen`), `MemberLayout.jsx:14,20` (`min-h-screen` ×2), `pages/{Login,Register,ForgotPassword,ResetPassword,CompleteProfile,NotFound,AuthCallback}.jsx` (`min-h-screen`) | `h-screen = 100vh`. En AppLayout (`h-screen overflow-hidden`) el `main` scrollea internamente: en iOS Safari/Chrome Android el último contenido y el padding quedan detrás de la barra del navegador mientras esté visible. `rg "dvh\|svh\|lvh" src` → sin resultados. |
| Base CSS | `index.css:49-51` | `html, body, #root { height: 100% }`. |
| Modales | `Modal.jsx:58`, `QRFullscreenModal.jsx:70,79` | `fixed inset-0`, botón cerrar `absolute top-6 right-6` sin `env(safe-area-inset-top)`. |
| Zoom | `index.html:6` | No bloquea el zoom (correcto para accesibilidad); no agregar `user-scalable=no`/`maximum-scale`. |
| Teclado | — | No hay `interactive-widget` en el viewport ni manejo del teclado virtual (ver BK-MOB-06/07). |
| Tema | `App.jsx:57-59`, `main.jsx:13-19`, `index.css:3-42` | El tema (`dark`/`light`) se aplica con la clase `dark` en `<html>`; no se refleja en ninguna `<meta name="theme-color">`. |
| Tailwind | `frontend/package.json` (`tailwindcss ^3.4.0`), instalado `3.4.19` | Soporta `h-dvh`, `min-h-dvh`, `max-h-dvh`, `pb-[env(safe-area-inset-bottom)]` sin plugin. |
| Tests | `components/layout/MemberLayout.test.jsx` | No verifica estilos de safe-area; no existe test de `AppBottomNav`. |

## 4. Alcance
**Incluye:** (a) `viewport-fit=cover` y `theme-color` dinámico; (b) reemplazar `h-screen`/`min-h-screen` por `h-dvh`/`min-h-dvh` (con fallback); (c) navs con alto `min-h` + padding-bottom por clase Tailwind y `pb` del contenido que suma el inset; (d) insets laterales para landscape; (e) inset superior para cabeceras fijas/pantalla completa; (f) utilidades CSS reutilizables.
**No incluye:** PWA/instalabilidad (BK-MOB-10), nav nueva (BK-MOB-01/02), diseño de landscape (BK-MOB-09).

## 5. Contrato de API
Sin cambios de API.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
1. **`frontend/index.html:6`:** `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />` (opcional, solo Chrome Android: `, interactive-widget=resizes-content` para que el teclado reduzca el layout; ver §11). Agregar `<meta name="theme-color" content="#121212" />` y `<meta name="color-scheme" content="light dark" />`.
2. **`App.jsx:57-59`:** dentro del `useEffect` del tema, actualizar la meta: `document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#121212' : '#F5F5F4')` (valores de `--color-bg-base` en `index.css:4,34`).
3. **Utilidades en `index.css`** (`@layer utilities`, junto a `scrollbar-none`, `index.css:106-113`): `.pb-safe { padding-bottom: env(safe-area-inset-bottom); }`, `.pt-safe { padding-top: env(safe-area-inset-top); }`, `.pl-safe`, `.pr-safe`. (Alternativa sin CSS custom: clases arbitrarias `pb-[env(safe-area-inset-bottom)]`.)
4. **Nav staff (`AppBottomNav.jsx:32-35`):** `className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-bg-surface border-t border-subtle pb-safe pl-safe pr-safe"` y el grid interno `h-14` (el alto de la barra = 56 px + inset); quitar el `style` inline.
5. **Nav socio (`MemberLayout.jsx:64-68`):** igual; eliminar `h-14 ... pt-1.5 pb-2` y el `style`; grid interno `h-14`.
6. **Relleno del contenido:** `AppLayout.jsx:8` `pb-14 md:pb-0` → `pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0`; `MemberLayout.jsx:59` `pb-24 md:pb-4` → `pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-4`.
7. **Alto dinámico:** `AppLayout.jsx:6` `h-screen` → `h-dvh`; `Sidebar.jsx:72` `h-screen` → `h-dvh` (es `sticky`, solo ≥ md); `MemberLayout.jsx:14,20` y las 7 páginas de auth/404: `min-h-screen` → `min-h-dvh`. Para navegadores sin soporte de `dvh` (iOS < 15.4, Chrome < 108) agregar fallback en `index.css`: `@supports not (height: 100dvh) { .h-dvh { height: 100vh } .min-h-dvh { min-height: 100vh } }`.
8. **Cabeceras y pantalla completa:** `QRFullscreenModal.jsx:79` → `top-[max(1.5rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))]`; el panel del Modal fullscreen (BK-MOB-06) usa `pt-safe`. En modo PWA `standalone` con status bar translúcida (BK-MOB-10) el `TopBar` y `MemberLayout` header requieren `pt-safe`.
9. **Landscape con notch:** las navs fijas llevan `pl-safe pr-safe` (punto 4); el contenido de `AppLayout`/`MemberLayout` usa `pl-safe pr-safe` en el contenedor principal (ver BK-MOB-09).
- **Estados de UI / textos:** no aplica. **Responsive:** 375 px con home-indicator (iPhone X+) y con botones de navegación de Android; ≥ 768 px sin cambios (los insets valen 0).

## 8. Archivos a crear / modificar
- Modificar `frontend/index.html`, `frontend/src/App.jsx`, `frontend/src/index.css`, `components/layout/{AppLayout,AppBottomNav,MemberLayout,Sidebar}.jsx`, `components/socio/QRFullscreenModal.jsx`, `pages/{LoginPage,RegisterPage,ForgotPasswordPage,ResetPasswordPage,CompleteProfilePage,NotFoundPage,AuthCallback}.jsx` (solo `min-h-screen`).
- Crear tests: `components/layout/AppBottomNav.test.jsx` (si no lo crea BK-MOB-01), ampliar `MemberLayout.test.jsx`.

## 9. Plan de pruebas (TDD)
Convención y comandos: ver BK-MOB-01 §9. jsdom no evalúa `env()`/`dvh`: se asertan clases y atributos; la verificación real es manual/Playwright.
1. Test de contenido de `index.html` (Vitest con `fs.readFileSync('index.html')`): contiene `viewport-fit=cover`, `name="theme-color"` y **no** contiene `user-scalable=no` ni `maximum-scale`.
2. `AppBottomNav.test.jsx`: el `nav` tiene la clase `pb-safe` (o `pb-[env(safe-area-inset-bottom)]`) y ya no tiene `style` con `paddingBottom`; el contenedor interno mantiene `h-14`.
3. `MemberLayout.test.jsx`: idem para su `nav`; el `main` usa `pb-[calc(5rem+env(safe-area-inset-bottom))]`.
4. `AppLayout`: la raíz usa `h-dvh` y no `h-screen`.
5. Test de tema (`App`): al cambiar `theme` en `themeStore`, `meta[name="theme-color"]` cambia de `#121212` a `#F5F5F4`.
6. Playwright (ampliar `frontend/scripts/mobile-walkthrough.mjs` con `devices['iPhone 14']` y `devices['Pixel 7']`): `getComputedStyle(nav).paddingBottom` y que el último elemento del contenido sea alcanzable por scroll (`scrollTop + clientHeight >= scrollHeight - 1`) sin quedar bajo la nav.
Manual: iPhone con home-indicator (Safari y modo "Agregar a inicio"), Android con navegación por gestos y por botones; rotar a landscape con notch.

## 10. Criterios de aceptación
- **Dado** un iPhone con home-indicator **cuando** miro la bottom nav **entonces** los íconos quedan por encima del indicador y los targets mantienen ≥ 44 px.
- **Dado** el scroll hasta el final de cualquier pantalla **entonces** el último elemento queda visible sobre la nav.
- **Dado** el navegador móvil con barra dinámica **entonces** el layout ocupa exactamente el alto visible (sin recortes) en AppLayout y MemberLayout.
- **Dado** el cambio de tema **entonces** el color de la barra del navegador acompaña.

## 11. Riesgos y decisiones abiertas
1. `viewport-fit=cover` hace que el contenido se extienda bajo el notch en landscape: hay que aplicar `pl-safe/pr-safe` (punto 9) o se verá recortado. Recomendación: aplicarlo junto con BK-MOB-09.
2. `interactive-widget=resizes-content`: mejora el comportamiento del teclado en Chrome Android pero no tiene efecto en iOS; recomendación: incluirlo y validar con los formularios de BK-MOB-07.
3. El tema por defecto es oscuro (`main.jsx:15-16`) y la clase `dark` se aplica después de cargar JS: `theme-color` inicial `#121212` coincide con ese default.

## 12. Referencias
`docs/qa/` y `docs/reports/`: sin mención específica de safe-area (No verificado exhaustivamente). Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", columna "05 · Mobile". BK-MOB-01, BK-MOB-02, BK-MOB-06, BK-MOB-09, BK-MOB-10.

## 13. Prompt listo para un agente de IA
> Repo Winnie-The-Gym, `frontend/` (Vite 6, React 18, Tailwind 3.4.19, vitest/RTL). Objetivo: safe-area y viewport. Leé `index.html`, `src/index.css`, `src/App.jsx` (efecto del tema, líneas 57-59), `src/components/layout/{AppLayout,AppBottomNav,MemberLayout,Sidebar}.jsx` y `src/components/socio/QRFullscreenModal.jsx`. TDD primero: test de `index.html` (viewport con `viewport-fit=cover`, `theme-color`, sin `user-scalable=no`), `AppBottomNav.test.jsx`/`MemberLayout.test.jsx` (clase `pb-safe`, sin `style.paddingBottom`, `pb-[calc(...+env(safe-area-inset-bottom))]` en el contenido), `AppLayout` con `h-dvh`, y el test del `theme-color` dinámico. Luego implementá: meta viewport/theme-color, utilidades `.pb-safe .pt-safe .pl-safe .pr-safe` y fallback `@supports not (height: 100dvh)` en `index.css`, reemplazo de `h-screen`/`min-h-screen` por `h-dvh`/`min-h-dvh` en layouts y 7 páginas de auth/404, y safe-area en `QRFullscreenModal`. No bloquees el zoom. Terminado: lint, `npx vitest run --coverage` y `npm run build` verdes y verificación manual en iPhone con home-indicator.
