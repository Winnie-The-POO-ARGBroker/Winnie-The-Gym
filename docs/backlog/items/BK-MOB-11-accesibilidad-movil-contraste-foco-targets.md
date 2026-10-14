---
id: BK-MOB-11
titulo: Accesibilidad móvil (contraste de tokens, foco visible, targets de 44 px, landmarks y elementos clickeables)
tipo: deuda-tecnica
roles: [administrador, recepcionista, socio]
prioridad: P2
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-MOB-07]
---

# BK-MOB-11 · Accesibilidad móvil

## 1. Resumen
La base ya tiene buenas prácticas puntuales (roles ARIA en pestañas de `GestionSociosPage`, `aria-sort` en `DataTable`, `role="alert"` en avisos de pago, modo de alto contraste para la credencial), pero hay brechas sistemáticas que pegan más en el celular: el color terciario del tema claro y oscuro no llega al contraste mínimo, el blanco sobre `primary` (`#ff5a36`) mide 3,1:1, hay 55 usos de `outline-none` frente a 39 estilos de foco, varios elementos clickeables son `div`/`tr` sin teclado, los targets táctiles son de 28–36 px, y no hay landmarks ni nombres accesibles consistentes en las navegaciones.

## 2. Objetivo de usuario
Como **usuario con baja visión, que usa lector de pantalla o teclado externo, o con poca precisión táctil**, quiero **contraste suficiente, foco visible y controles grandes y etiquetados** para **usar la app en el celular con el sol de frente o con una mano**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Contraste (tokens) | `frontend/src/index.css:9-11,39-41` | `--color-text-tertiary`: claro `rgba(18,18,18,0.40)`, oscuro `rgba(255,255,255,0.38)`. Calculado (fórmula WCAG 2.x, sobre `bg-surface`): claro **2,61:1**, oscuro **3,54:1** (mínimo AA texto normal 4,5:1). `text-secondary` sí cumple (claro 4,89:1, oscuro 7,13:1). |
| Uso del terciario | `AppBottomNav.jsx:45`, `MemberLayout.jsx:74,…`, `ClassCalendarView.jsx:63,85`, `Sidebar.jsx:86`, etc. | Ítems de nav inactivos, etiquetas "hs", encabezados de sección y placeholders usan `text-text-tertiary` con `text-[10px]`/`text-[11px]`. |
| Contraste (primario) | `tailwind.config.js:12`, `ui/Button.jsx:4` | `bg-primary text-white` → blanco sobre `#ff5a36` = **3,10:1** (solo cumple AA para texto grande ≥ 18,66 px bold / 24 px). Botones `text-sm font-semibold` no cumplen. Texto `text-orange-500` sobre blanco: 3,16:1; `error-500` sobre blanco: 3,68:1. `primary` sobre `bg-surface` oscuro: 5,37:1 (OK). |
| Alto contraste | `ui/HighContrastToggle.jsx`, `pages/socio/CredencialDigitalPage.jsx:134`, `index.css:136-150` | Existe modo `body.high-contrast` (RNF07 outdoor), pero el toggle solo está en la credencial del socio; staff y el resto de pantallas no lo tienen. |
| Foco | `rg "outline-none" src` | 55 ocurrencias; `rg "focus-visible\|focus:ring\|focus:border" src` → 39. Varios campos usan `outline-none appearance-none` sin reemplazo (p. ej. `RegisterPage.jsx:224`, `CompleteProfilePage.jsx:81`, `ProfilePage.jsx:285` que lo simula con `onFocus`/`onBlur` inline). Sin regla global `:focus-visible` en `index.css`. |
| Targets | `ui/Pagination.jsx:57,90` (`p-2` + ícono 16 px = 36 px), `pages/admin/AdminSociosPage.jsx:234-261` (`p-1.5` + 16 px = 28 px), `layout/TopBar.jsx:10-15` (`p-2` + 20 px = 36 px), `ui/Modal.jsx:94-99` (`p-1.5` + 20 px = 32 px), `ui/Button.jsx:10-14` (`sm` ≈ 28 px, `md` ≈ 40 px) | Por debajo de 44×44 px (WCAG 2.5.5 AAA / guías de plataformas; 24 px es el mínimo AA de 2.5.8). |
| Clickeables no semánticos | `classes/ClassCalendarView.jsx:102-104` (`div onClick`), `ui/DataTable.jsx:149-155` (`tr onClick`), `layout/Sidebar.jsx:153`, `ui/FilterPanel.jsx:113` (backdrops `div onClick`) | Las filas/tarjetas clickeables no son focuseables ni accionables con teclado/lector (solo los `th` ordenables tienen `tabIndex`/`onKeyDown`, `DataTable.jsx:110-122`). |
| Navegaciones | `layout/AppBottomNav.jsx:31`, `layout/MemberLayout.jsx:64`, `layout/Sidebar.jsx:81` | Tres `<nav>` sin `aria-label` (en pantalla solo hay uno visible según el ancho, pero el nombre falta); `NavLink` de react-router agrega `aria-current="page"` automáticamente. |
| Landmarks | `layout/AppLayout.jsx:8`, `layout/MemberLayout.jsx:59` | Hay `<main>`; no hay "saltar al contenido" ni `<header>` con rol banner distinguible fuera de `TopBar`/`MemberLayout`. |
| Íconos | `Sidebar.jsx:124` (`aria-label` en inglés "Switch to light mode"), `Sidebar.jsx:194` (botón de usuario sin `aria-label`/`aria-haspopup`/`aria-expanded`) | Mezcla de idiomas y estados no expuestos. |
| Modales | `ui/Modal.jsx:63-69`, `admin/SocioDetailModal.jsx:244` | `Modal` sin `title` no tiene nombre accesible (`SocioDetailModal` no pasa `title`); detalle de foco/IDs: ver BK-BUG-09. |
| Mensajes dinámicos | `rg "aria-live\|role=\"status\"\|role=\"alert\"" src` | Solo `CobroManualPage.jsx:256` y `PagoResultadoBanner.jsx:48`. El resultado de validación del escáner (`recepcion/ValidationResult.jsx`) y el contador/estado del QR no se anuncian. Toasts: `sonner` (`App.jsx:63`) los anuncia por su cuenta. |
| Movimiento | `rg "prefers-reduced-motion" src index.html` | Sin resultados; hay animaciones `animate-fadeIn`, `animate-scaleUp`, `animate-pulse` (`index.css:115-131`). |
| Formularios | ver BK-MOB-07 | Labels sin `htmlFor` en `Input`, Registro, CreateClass; errores sin `aria-describedby`. |
| Tests | `ui/__tests__/*.test.jsx`, `ui/DataTable.test.jsx` | No hay tests de contraste ni `jest-axe` (`rg "axe" frontend/package.json` → no está). |

## 4. Alcance
**Incluye:** (a) corregir tokens de color (terciario, primario con texto, error) o su uso; (b) regla global de foco visible; (c) targets de 44 px (con BK-MOB-04/07); (d) semántica de filas/tarjetas clickeables; (e) `aria-label` en navegaciones y acciones de ícono, textos en español; (f) skip link; (g) anunciar resultados del escáner con `role="status"`/`aria-live`; (h) `prefers-reduced-motion`; (i) toggle de alto contraste accesible desde "Más"/Perfil; (j) tests con `jest-axe` en componentes clave.
**No incluye:** rediseño de la paleta de marca (decisión de diseño abierta, ver §11), accesibilidad del lector QR por cámara, localización.

## 5. Contrato de API
Sin cambios de API.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
### Colores (propuesta)
- `index.css:9-11,39-41`: subir el terciario a ≥ 4,5:1 sobre `bg-surface`: claro `rgba(18,18,18,0.62)` (≈ 5,0:1) y oscuro `rgba(255,255,255,0.56)` (≈ 5,6:1) — **valores a validar con la herramienta de contraste del equipo**; esto vuelve `text-tertiary` casi igual a `text-secondary`: si se quiere conservar la jerarquía, usar el terciario solo para texto decorativo/deshabilitado y mover el resto a `secondary`. Placeholders (`placeholder:text-text-tertiary`) quedan exentos si hay label visible.
- Texto sobre `primary`: o bien texto oscuro (`#121212` sobre `#ff5a36` 6,04:1 calculado) o un `primary-strong` más oscuro para botones (calculado con blanco: `#d9381a` 4,63:1; `orange-700 #B82E08`, ya definido en `tailwind.config.js:20`, 6,12:1) en `tailwind.config.js:11-24` (`orange-600 #E63E0F` ya existe: blanco sobre `#E63E0F` = 4,15:1, no alcanza). Alternativa mínima: subir los botones primarios a `text-base font-bold` (≥ 18,66 px bold cuenta como texto grande). Decisión de diseño abierta (§11).
- `error-500` como texto: usar `error-600` (`#D42F2F`, definido en `tailwind.config.js:34`) en el tema claro.
### Foco y movimiento (`index.css`)
```css
@layer base {
  :focus-visible { outline: 2px solid var(--color-primary, #ff5a36); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
  }
}
```
Auditar los 55 `outline-none` y reemplazarlos por `focus-visible:ring-2 focus-visible:ring-primary` donde no exista alternativa; quitar el borde inline de `ProfilePage.jsx:286-287`.
### Semántica
- `DataTable` (y la card de BK-MOB-04): si hay `onRowClick`, la fila recibe `tabIndex={0}`, `role="button"` (en tabla: preferible un `<button>` en la primera celda) y `onKeyDown` Enter/Espacio; en cards el cuerpo es un `<button>`.
- `ClassCalendarView.jsx:102-110`: `div` → `button type="button"` (o `role="button" tabIndex=0 onKeyDown`).
- Backdrops `div onClick`: añadir `aria-hidden="true"` (el cierre accesible es el botón y Escape).
- `<nav aria-label="Navegación principal">` en `Sidebar.jsx:81`, `AppBottomNav.jsx:31`, `MemberLayout.jsx:64`; botón de usuario `aria-haspopup="menu" aria-expanded={menuOpen}`; `aria-label` del tema en español ("Cambiar a modo claro/oscuro", `Sidebar.jsx:124`).
- Skip link en `AppLayout`/`MemberLayout`: `<a href="#contenido" className="sr-only focus:not-sr-only ...">Saltar al contenido</a>` y `id="contenido"` en `main`.
- `ValidationResult.jsx`: contenedor `role="status" aria-live="polite"` (éxito/aviso) y `role="alert"` para denegaciones; contador del QR en `CredencialDigitalPage`: no anunciar cada segundo (usar `aria-live="off"` y un texto estático "Se actualiza cada 30 segundos").
- Targets: ver BK-MOB-07 (`Button`, `Input`) y BK-MOB-04 (acciones de card); `Pagination`/`TopBar` back/`Modal` cerrar → `h-11 w-11`.
- `HighContrastToggle` también en el sheet "Más" (BK-MOB-01/02) y Perfil, y persistido (No verificado si `HighContrastToggle.jsx` persiste el estado).
### Estados / textos
Textos accesibles nuevos: "Saltar al contenido", "Navegación principal", "Cambiar a modo oscuro/claro", "Se actualiza cada 30 segundos".
### Responsive
Aplica a todos los anchos; los targets de 44 px solo en móvil (`md:` revierte cuando corresponda).

## 8. Archivos a crear / modificar
- Modificar `index.css`, `tailwind.config.js` (token primario), `components/ui/{Button,Pagination,Modal,DataTable}.jsx`, `components/layout/{AppLayout,AppBottomNav,MemberLayout,Sidebar,TopBar}.jsx`, `components/classes/ClassCalendarView.jsx`, `components/recepcion/ValidationResult.jsx`, `pages/socio/CredencialDigitalPage.jsx`, `pages/{RegisterPage,CompleteProfilePage,ProfilePage}.jsx`.
- `package.json`: devDependency `jest-axe` (propuesta; versión a confirmar compatible con vitest 4: No verificado) y `vitest.d.ts`/setup (`expect.extend(toHaveNoViolations)` en `setupTests.js`).
- Tests nuevos: `a11y.test.jsx` por componente clave; `contrast.test.js` (ver §9).

## 9. Plan de pruebas (TDD)
Convención y comandos: ver BK-MOB-01 §9 (vitest + RTL; `renderWithProviders`; `cd frontend && npx vitest run <ruta>`).
1. `contrast.test.js`: lee `index.css` (regex sobre las variables `--color-*`), mezcla alfa sobre el fondo y calcula la razón WCAG; falla si `text-secondary` o `text-tertiary` < 4,5:1 sobre `bg-surface`/`bg-base` en `:root` y `.dark`. Funciona sin jsdom CSS.
2. `Button.test.jsx`: variante `primary` usa la clase aprobada de contraste (la que se decida) y `size="icon"` mide `h-11 w-11`.
3. `AppBottomNav`/`MemberLayout`/`Sidebar` tests: `getByRole('navigation', { name: 'Navegación principal' })`; el botón de usuario expone `aria-expanded` que alterna.
4. `DataTable.test.jsx`: con `onRowClick`, la fila es alcanzable con Tab y Enter dispara el callback; las acciones internas no.
5. `ClassCalendarView.test.jsx`: cada clase es un `button` con nombre accesible (`nombre`, hora).
6. `ValidationResult` test: `getByRole('status')` en éxito/aviso y `getByRole('alert')` en error.
7. `jest-axe` en `Modal`, `DataTable`, `AppBottomNav`, `TopBar`: `expect(await axe(container)).toHaveNoViolations()`.
8. Manual: VoiceOver (iOS) y TalkBack (Android) recorriendo Login → Dashboard → Socios → un modal; teclado externo (Tab/Shift+Tab, Enter/Espacio, Escape); Lighthouse Accessibility ≥ 95 en `/login`, `/dashboard`, `/admin/socios`; probar a pleno sol con alto contraste.

## 10. Criterios de aceptación
- **Dado** el tema claro u oscuro **entonces** todo texto informativo cumple ≥ 4,5:1 (texto normal) y los botones primarios cumplen AA.
- **Dado** navegación por teclado **entonces** todo control interactivo muestra foco visible y las filas/tarjetas clickeables se activan con Enter/Espacio.
- **Dado** un lector de pantalla **entonces** las navegaciones tienen nombre, los íconos tienen etiqueta en español y el resultado de un escaneo se anuncia.
- **Dado** `prefers-reduced-motion` **entonces** no hay animaciones.
- **Dado** móvil **entonces** los controles táctiles miden ≥ 44×44 px.

## 11. Riesgos y decisiones abiertas
1. Paleta de marca: cambiar el color de texto sobre `primary` o oscurecer el naranja afecta la identidad visual. Recomendación: botones primarios con `#121212`/negro sobre naranja (alto contraste) o un naranja más oscuro solo para botones, validado con diseño.
2. Subir el terciario achata la jerarquía tipográfica: definir qué elementos pasan a `secondary`.
3. `jest-axe` agrega una devDependency y puede producir falsos positivos en jsdom (contraste no evaluado sin CSS): usarlo para estructura/roles y mantener `contrast.test.js` para colores.
4. Solapamiento con BK-BUG-09 (ids únicos, trampa y restauración de foco del `Modal`): implementar allí; esta ficha solo cubre nombre accesible sin `title` y targets.

## 12. Referencias
BK-BUG-09, BK-MOB-04, BK-MOB-06, BK-MOB-07. WCAG 2.2 (1.4.3 contraste, 2.4.7 foco visible, 2.5.8 tamaño del objetivo). `docs/qa/plan-de-pruebas.md` (RNF07: alto contraste outdoor; No verificado el detalle). Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", columna "05 · Mobile" (No verificado el frame exacto).

## 13. Prompt listo para un agente de IA
> Repo Winnie-The-Gym, `frontend/` (React 18, Tailwind 3, vitest/RTL, tokens CSS en `src/index.css`). Objetivo: accesibilidad móvil. Leé `src/index.css`, `tailwind.config.js`, `src/components/ui/{Button,Pagination,Modal,DataTable,HighContrastToggle}.jsx`, `src/components/layout/*`, `src/components/classes/ClassCalendarView.jsx`, `src/components/recepcion/ValidationResult.jsx`. TDD: primero `contrast.test.js` (calcula contraste WCAG de `--color-text-secondary/tertiary` sobre `bg-surface`/`bg-base` en `:root` y `.dark`, falla bajo 4,5:1), tests de `navigation` con nombre accesible, filas clickeables operables por teclado en `DataTable`, clases de calendario como `button`, `role="status"/"alert"` en `ValidationResult` y (opcional) `jest-axe`. Luego ajustá los tokens (consultá la decisión de color con el dueño antes de cambiar el naranja), agregá `:focus-visible` global y `prefers-reduced-motion` en `index.css`, `aria-label` en español, skip link, targets `h-11 w-11`. No cambies el diseño ≥768 px salvo contraste/foco. Textos en español rioplatense. Terminado: lint, `npx vitest run --coverage` y `npm run build` verdes y Lighthouse Accessibility ≥ 95 en `/login`, `/dashboard` y `/admin/socios`.
