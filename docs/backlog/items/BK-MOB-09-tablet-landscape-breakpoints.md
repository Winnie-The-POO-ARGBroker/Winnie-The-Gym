---
id: BK-MOB-09
titulo: Layout de tablet (768–1024 px) y orientación landscape
tipo: mobile
roles: [administrador, recepcionista, socio]
prioridad: P2
tamano: L
estado_en_codigo: no-existe
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-MOB-01, BK-MOB-04, BK-MOB-05, BK-MOB-08]
---

# BK-MOB-09 · Layout de tablet y landscape

## 1. Resumen
La app solo distingue dos estados: móvil (< 768 px: sin Sidebar, bottom nav) y escritorio (≥ 768 px: Sidebar fijo de 256 px). No hay variante de tablet ni tratamiento de orientación. Consecuencias verificadas en el código: a 768 px el contenido útil mide 512 px (el Sidebar se come un tercio), a 1024 px 768 px; y un teléfono en landscape (p. ej. 812×375) cumple `min-width: 768px` y recibe el layout de escritorio con un Sidebar de pantalla completa y apenas ~300 px de alto útil. La tablet es además el dispositivo natural de la estación de recepción (`AccesoTerminalPage`).

## 2. Objetivo de usuario
Como **recepcionista con tablet** (o **socio con el teléfono rotado**) quiero **un layout que use bien el ancho y alto disponibles** para **operar el control de accesos y las listas sin que el menú me tape la pantalla**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Screens | `frontend/tailwind.config.js:5-62` | No define `screens`: se usan los defaults de Tailwind 3 (`sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`). Solo extiende `spacing.sidebar = '16rem'` (`:58-60`). |
| Orientación | `rg "landscape\|portrait\|orientation" src tailwind.config.js index.html` | Sin resultados: no existe ningún tratamiento de orientación. |
| Sidebar | `components/layout/Sidebar.jsx:72` | `hidden md:flex w-sidebar ... h-screen sticky top-0 z-50`: aparece a 768 px con ancho completo (256 px). |
| Bottom nav | `AppBottomNav.jsx:32`, `MemberLayout.jsx:65` | `md:hidden`. |
| Contenido | `AppLayout.jsx:8` | `main flex-1 ... pb-14 md:pb-0`; las páginas usan `p-6` o `p-6 md:p-10` (`ClassSchedulePage.jsx:177`, `AdminPlanesPage.jsx:97`, `CreateClassPage.jsx:167`, `AttendancePage.jsx:120`) y `max-w-[1840px]`. A 768 px: 768 − 256 = 512 px de `main`; con `md:p-10` quedan 432 px. |
| Grillas | `AforoMonitorPage.jsx:88` (`md:grid-cols-2 lg:grid-cols-3`), `ClassListDetailView.jsx:50` (`lg:grid-cols-12`), `CobroManualPage.jsx:155` (`lg:flex-row`), `GestionSociosPage.jsx:256` (`lg:grid-cols-3`), `AccesoTerminalPage.jsx:89` (`lg:grid-cols-2`), `AdminSociosPage.jsx:142` (`sm:grid-cols-2 lg:grid-cols-4`) | Los saltos están pensados para el ancho de viewport, no para el ancho disponible tras el Sidebar: a 768–1023 px (`md`) una grilla `md:grid-cols-2` da columnas de ~230 px; `lg:` recién se activa a 1024 px con 768 px de `main`. |
| Terminal de accesos | `pages/recepcion/AccesoTerminalPage.jsx:88-112` | `grid grid-cols-1 lg:grid-cols-2`: en tablet vertical (768–1023 px) el escáner y el resultado quedan apilados; el resultado (`ValidationResult.jsx:23`, `p-8`) queda debajo del escáner. |
| Landscape de teléfono | `Sidebar.jsx:72` + `AppLayout.jsx:6` | 812×375: `md:` activo → Sidebar `h-screen` (375 px) con logo, nav (`overflow-y-auto`), tema y footer de usuario dentro de 375 px, y `main` de 556 px × 375 px menos `TopBar` (~73 px) ≈ 300 px de alto útil. |
| MemberLayout | `components/layout/MemberLayout.jsx:14,20` | Entre 640 y 767 px muestra un marco `sm:max-w-sm` (384 px) centrado con sombra y bordes; desde 768 px (`md:`) pasa a pantalla completa con Sidebar. |
| Calendario | `ClassCalendarView.jsx:61,81` | `grid-cols-7`: a 768–1023 px las columnas miden ~60 px (ver BK-MOB-05). |
| Tests | `components/layout/` | Sin tests de Sidebar/AppBottomNav; `MemberLayout.test.jsx` no cubre breakpoints. |

## 4. Alcance
**Incluye:** (a) estrategia de layout para 768–1023 px: Sidebar compacto (rail de íconos) o mantener la bottom nav hasta `lg`; (b) variante de orientación: un teléfono en landscape no debe recibir el layout de escritorio; (c) ajuste de grillas por ancho disponible; (d) layout de dos paneles para la terminal de accesos en tablet; (e) quitar el marco `sm:max-w-sm` del socio; (f) tests y Playwright a 375/768/1024.
**No incluye:** diseño para pantallas ≥ 1440 px, modo kiosco, gestos, PWA (BK-MOB-10).

## 5. Contrato de API
Sin cambios de API.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
### Decisión de navegación en 768–1023 px (recomendación)
**Rail de íconos** (`w-16`) entre `md` y `lg`, Sidebar completo desde `lg`:
- `tailwind.config.js:58-60` → `spacing: { sidebar: '16rem', 'sidebar-rail': '4rem' }`.
- `Sidebar.jsx:72` → `className="hidden md:flex md:w-sidebar-rail lg:w-sidebar ..."`; los labels (`{label}` en `Sidebar.jsx:114`) con `hidden lg:inline` y `title={label}`/`aria-label={label}` en cada `NavLink`; encabezados de sección (`Sidebar.jsx:85-89`) con `hidden lg:block`; footer de usuario: solo `Avatar` en rail (`hidden lg:flex` para el nombre/rol); logo reducido (`WinnieLogo size="sm"` → versión solo ícono si existe: No verificado en `ui/WinnieLogo.jsx`).
- Resultado: a 768 px `main` pasa de 512 a 704 px.
Alternativa (menos trabajo): mantener `AppBottomNav`/`SocioBottomNav` hasta `lg` (`lg:hidden`) y mostrar el Sidebar recién a 1024 px (cambiar `md:` por `lg:` en `Sidebar.jsx:72`, `AppBottomNav`, `MemberLayout`, `AppLayout.jsx:8`). Tradeoff: tablets verticales sin navegación lateral y barra inferior estirada.

### Landscape / altura corta
Definir un breakpoint "escritorio real" que exija también alto: en `tailwind.config.js` agregar
```js
theme: { extend: { screens: { desk: { raw: '(min-width: 768px) and (min-height: 480px)' } } } }
```
y usarlo en los componentes de layout en lugar de `md:` para **Sidebar, bottom navs y paddings del layout**: `Sidebar.jsx:72` `hidden desk:flex`, `AppBottomNav.jsx:32` y `MemberLayout.jsx:65` `desk:hidden`, `AppLayout.jsx:8` `pb-14 desk:pb-0`. En un teléfono landscape (812×375) se mantiene la bottom nav (con altura reducida: `h-12 [@media(max-height:480px)]:h-12`) y el contenido usa todo el ancho. Las grillas de contenido siguen con `md:`/`lg:`.

### Grillas por ancho disponible
- `AforoMonitorPage.jsx:88`: dos paneles reales → `grid-cols-1 md:grid-cols-2` (quitar `lg:grid-cols-3` que deja una columna vacía).
- `AccesoTerminalPage.jsx:89`: `grid-cols-1 xl:grid-cols-2` y, para tablet, `md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]` con el resultado visible junto al escáner; `ValidationResult.jsx:23` `p-8` → `p-5 lg:p-8`.
- `GestionSociosPage.jsx:256` `lg:grid-cols-3` → `xl:grid-cols-3`; `CobroManualPage.jsx:155` `lg:flex-row` → `xl:flex-row` (con rail: `lg` ya da 768+ px, evaluar caso por caso en Playwright).
- Paddings de páginas: unificar `p-4 md:p-6 lg:p-10` (hoy `p-6 md:p-10`).
- `ClassCalendarView`: agenda hasta `lg` (BK-MOB-05).

### Socio / MemberLayout
- Eliminar el marco `sm:max-w-sm sm:shadow-2xl sm:border-x` (`MemberLayout.jsx:20`) o limitarlo a un `max-w-md` centrado solo cuando no hay Sidebar; en tablet usar el mismo `AppLayout` con Sidebar rail y contenido `max-w-3xl mx-auto`.

### Estados de UI / textos
Sin textos nuevos. Tooltips nativos (`title`) en el rail. Foco visible en los íconos del rail (BK-MOB-11).

### Responsive (matriz de verificación)
| Viewport | Esperado |
|---|---|
| 375×812 | Bottom nav, 1 columna |
| 812×375 (landscape teléfono) | Bottom nav compacta, sin Sidebar |
| 768×1024 (tablet vertical) | Rail de íconos + `main` 704 px |
| 1024×768 (tablet horizontal) | Sidebar completo, 2 columnas en terminal de accesos |

## 8. Archivos a crear / modificar
- Modificar `tailwind.config.js` (`screens.desk`, `spacing.sidebar-rail`), `components/layout/{Sidebar,AppLayout,AppBottomNav,MemberLayout}.jsx`, `pages/recepcion/{AccesoTerminalPage,AforoMonitorPage,GestionSociosPage,CobroManualPage}.jsx`, `components/recepcion/ValidationResult.jsx`.
- Ampliar `frontend/scripts/mobile-walkthrough.mjs` (viewports y roles) y crear `Sidebar.test.jsx` si no lo crea BK-MOB-01.

## 9. Plan de pruebas (TDD)
Convención y comandos: ver BK-MOB-01 §9; jsdom no aplica media queries → RTL asserta clases; el comportamiento real se verifica con Playwright.
1. `Sidebar.test.jsx`: `aside` con clases `md:w-sidebar-rail lg:w-sidebar`; cada `NavLink` expone `aria-label`/`title` con su label aun cuando el texto se oculta con `lg:inline`.
2. Tests de clase en `AppBottomNav`/`MemberLayout`/`AppLayout`: usan `desk:hidden`/`hidden desk:flex`/`pb-14 desk:pb-0`.
3. Test de configuración: importar `tailwind.config.js` y comprobar `theme.extend.screens.desk.raw` y `spacing['sidebar-rail']`.
4. Playwright (`npm run mobile:check`, ampliado): para `/dashboard`, `/recepcion/acceso`, `/recepcion/aforo`, `/admin/clases`, `/admin/socios` con admin y recepcionista y `/socio/credencial`, `/socio/clases` con socio, en `375×812`, `812×375`, `768×1024`, `1024×768`: sin overflow horizontal (`scrollWidth <= innerWidth`), nav esperada visible (`aside` o `nav`), y a 812×375 el área de contenido ≥ 250 px de alto. Guardar capturas en `docs/qa/screenshots/mobile/` (ruta ya usada por el script).
Manual: tablet o emulación iPad (768×1024 y 1024×768), rotación en teléfono.

## 10. Criterios de aceptación
- **Dado** 768×1024 **entonces** el `main` mide ≥ 700 px y el menú lateral es un rail de íconos con `title`.
- **Dado** un teléfono en landscape (812×375) **entonces** no aparece el Sidebar de escritorio y la bottom nav no tapa el contenido.
- **Dado** la terminal de accesos en tablet **entonces** escáner y resultado de validación se ven a la vez sin scroll.
- **Dado** 1024×768 **entonces** Sidebar completo y grillas de 2 columnas sin cortes.

## 11. Riesgos y decisiones abiertas
1. Rail de íconos (recomendado, mayor trabajo) vs. mantener la bottom nav hasta `lg` (menor trabajo).
2. Umbral de altura del breakpoint `desk` (propuesto 480 px; validar con dispositivos reales: No verificado).
3. ¿La terminal de accesos es un caso de uso prioritario en tablet? Si sí, subir la prioridad de esta ficha a P1 y considerar un "modo kiosco".
4. Hallazgo para BK-ACC-01 (terminal de accesos): en teléfono (1 columna) el resultado de validación queda debajo del escáner (`AccesoTerminalPage.jsx:89-111`); No verificado a nivel de píxel si se ve sin scroll a 375×667.

## 12. Referencias
Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live" — no hay columna de tablet verificada (No verificado). `frontend/scripts/mobile-walkthrough.mjs` (iPhone SE, solo socio). BK-MOB-01, BK-MOB-02, BK-MOB-05, BK-MOB-08, BK-ACC-01.

## 13. Prompt listo para un agente de IA
> Repo Winnie-The-Gym, `frontend/` (React 18, Tailwind 3.4.19, vitest/RTL, Playwright como devDependency). Objetivo: layout de tablet y landscape. Leé `tailwind.config.js`, `src/components/layout/{Sidebar,AppLayout,AppBottomNav,MemberLayout}.jsx`, `src/pages/recepcion/{AccesoTerminalPage,AforoMonitorPage,GestionSociosPage,CobroManualPage}.jsx`, `src/components/recepcion/ValidationResult.jsx` y `scripts/mobile-walkthrough.mjs`. TDD: tests de clases para `Sidebar` (rail `md:w-sidebar-rail lg:w-sidebar`, `aria-label`/`title` por ítem), `AppBottomNav`/`MemberLayout`/`AppLayout` (`desk:` en lugar de `md:`), y del config de Tailwind. Luego implementá: `screens.desk = { raw: '(min-width: 768px) and (min-height: 480px)' }` y `spacing['sidebar-rail']='4rem'`; Sidebar en modo rail entre `md` y `lg`; layouts keyed a `desk:`; grillas por ancho disponible; terminal de accesos en dos paneles en tablet; quitá el marco `sm:max-w-sm` de `MemberLayout`. Ampliá `scripts/mobile-walkthrough.mjs` con viewports 375×812, 812×375, 768×1024, 1024×768 y roles admin/recepción/socio (cuentas seed; no imprimas contraseñas). Terminado: lint, `npx vitest run --coverage` y `npm run build` verdes y la matriz de viewports sin overflow horizontal.
