---
id: BK-MOB-03
titulo: TopBar responsive (acciones a íconos / menú, buscador colapsable, toolbar de pestañas) y fix de props ignoradas
tipo: mobile
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: M
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-MOB-07, BK-BUG-03]
---

# BK-MOB-03 · TopBar responsive

## 1. Resumen
`TopBar` es una fila `flex justify-between px-6 py-4` sin `flex-wrap`, sin truncado y con `h1` en `text-2xl`. Las páginas le inyectan 2-3 botones con texto, toggles de pestañas y un buscador, por lo que a 375 px el contenido se desborda, se corta o empuja el título. Además dos páginas le pasan props que `TopBar` no soporta (`actions`, `icon`), lo que deja **sin renderizar el botón "Crear staff"** de Usuarios (también en escritorio).

## 2. Objetivo de usuario
Como **staff** quiero **un encabezado que entre en 375 px con las acciones principales a mano** para **operar sin scroll horizontal ni botones cortados**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Header | `frontend/src/components/layout/TopBar.jsx:34` | `<header className="flex items-center justify-between px-6 py-4 border-b border-strong flex-shrink-0 bg-bg-surface">` — sin `flex-wrap`, sin `sticky`. |
| Título | `TopBar.jsx:39-40` | `h1 text-2xl font-bold` + `Badge variant="live"` en la misma fila, sin `truncate`. |
| Subtítulo | `TopBar.jsx:42-44` | `text-sm`, sin `truncate`; en `AdminSociosPage.jsx:128` es una frase de 66 caracteres. |
| Props soportadas | `TopBar.jsx:21` | `{ title, subtitle, showLive, showSearch, onScan, rightContent, backAction }`. **No hay** `actions`, `icon`, ni slot de toolbar. |
| Buscador + Escanear | `TopBar.jsx:52-84` | Form con ícono, input `w-32 lg:w-48`, `text-sm`; botón "Escanear QR" `px-4 py-2`. Usado en `DashboardPage.jsx:22-28` para admin y recepcionista (`showSearch={effectiveRole !== 'socio'}`). A 375 px: título + badge "En Vivo" + buscador + botón superan los 327 px útiles. |
| Props ignoradas | `frontend/src/pages/admin/AdminUsuariosPage.jsx:44-56` | Pasa `icon={<Users/>}` y `actions={<Button>Crear staff</Button>}`; `TopBar` las descarta → no hay forma de abrir `StaffFormModal` (`AdminUsuariosPage.jsx:119`, `isFormOpen`). `AdminConfiguracionPage.jsx:78-82` también pasa `icon` (ignorado, inocuo). |
| Planes | `pages/admin/AdminPlanesPage.jsx:47-96` | `rightContent`: toggle Tarjetas/Comparativa + "Duplicar" + "Nuevo plan" (4 controles con texto) y subtítulo `"N planes activos · N socios"`. |
| Clases | `pages/ClassSchedulePage.jsx:116-176` | `rightContent`: navegación de semana (Sem ant./hoy/Sem sig.) + toggle Calendario/Lista y Detalle + "Nueva clase". Subtítulo `"N clases programadas · Semana del X al Y de Mes"`. |
| Reportes | `pages/recepcion/ReportesPage.jsx:90-99` + `components/recepcion/ReportExportButtons.jsx:13-50` | 3 botones de export (PDF, Excel/XLSX, CSV) con texto en `flex items-center gap-2`. |
| Otras | `CreateClassPage.jsx:144-166`, `AttendancePage.jsx:96-119` | Dos botones con texto ("Cancelar"+"Publicar clase"; "Exportar"+"Cerrar asistencia"); títulos largos `Asistencia — {nombre}` sin truncar. |
| Otras | `AforoMonitorPage.jsx:81-86`, `AccesoTerminalPage.jsx:77-87`, `GestionSociosPage.jsx:86-112`, `AdminSociosPage.jsx:126-138` | Badge de conexión, pill de aforo, Cancelar+Crear socio / Nuevo socio. |
| Z-index | `Sidebar.jsx:71` (comentario) | Declara "header (z-20)" pero `TopBar` no define `z-*` ni `sticky`: el header se desplaza con el contenido (el scroll es del `<main className="overflow-auto">` de `AppLayout.jsx:8`). |
| Tests | — | No existe `TopBar.test.jsx` (`fd TopBar src` solo devuelve el componente). |

## 4. Alcance
**Incluye:** (a) `TopBar` responsive (padding, truncado, `flex-wrap`, sticky opcional); (b) nueva prop `actions` con modo ícono/menú en móvil; (c) slot `toolbar` para toggles y navegación de semana; (d) buscador colapsable; (e) migrar las páginas listadas; (f) migrar el botón "Crear staff" de `AdminUsuariosPage` al contrato `actions` (el fix funcional de que hoy no se renderiza es BK-BUG-03; coordinar para no duplicar); (g) tests.
**No incluye:** rediseño visual del header de escritorio, `MemberLayout` header (ya es compacto), nav (BK-MOB-01/02).

## 5. Contrato de API
Sin cambios de API.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
### API propuesta de `TopBar` (retrocompatible con `rightContent`)
```jsx
<TopBar
  title subtitle showLive backAction
  showSearch onScan                    // se mantienen
  rightContent={...}                   // se mantiene (solo md+ si hay `actions`)
  actions={[                           // NUEVO
    { id: 'nuevo', label: 'Nuevo plan', icon: Plus, onClick, variant: 'primary',
      mobile: 'icon' },                // 'icon' | 'menu' | 'hidden'
    { id: 'duplicar', label: 'Duplicar', icon: Copy, onClick, mobile: 'menu' },
  ]}
  toolbar={<ViewToggle .../>}          // NUEVO: fila propia bajo el header en <md
/>
```
- **md+:** `actions` se renderizan como `Button` con ícono + label (igual que hoy). `toolbar` se renderiza a la derecha junto a las acciones (comportamiento actual).
- **<md:** `mobile: 'icon'` → botón cuadrado `h-11 w-11` con `aria-label={label}` (máx. 1 por página: la acción primaria). `mobile: 'menu'` → entradas de un menú "⋯" (botón `Ellipsis`, `aria-haspopup="menu"`), implementado como `Modal variant="sheet"` (BK-MOB-06) o dropdown absoluto. `toolbar` baja a una segunda fila `px-4 pb-3 overflow-x-auto scrollbar-none` (la utilidad `scrollbar-none` ya existe en `index.css:107`).
- **Estructura Tailwind** (cambios sobre `TopBar.jsx:34-46`): `header` → `px-4 py-3 md:px-6 md:py-4 flex flex-wrap items-center gap-x-3 gap-y-2 sticky top-0 z-20`; contenedor del título `min-w-0 flex-1`; `h1` → `text-lg md:text-2xl truncate`; subtítulo → `text-xs md:text-sm truncate`; el `Badge live` pasa a `shrink-0`. `backAction` botón → `min-h-11 min-w-11` (hoy `p-2` con ícono de 20 px = 36 px).
- **Buscador (`showSearch`)**: <md → botón-ícono `Search` (44 px) que alterna `searchOpen` y muestra una fila completa `w-full` bajo el header con el `<form>` actual (`TopBar.jsx:54-75`); `input` con `text-base md:text-sm` (evita el zoom de iOS, ver BK-MOB-07) y `enterKeyHint="search"`. md+ sin cambios. "Escanear QR" → `mobile: 'icon'` con `ScanLine` y `aria-label="Escanear QR"`.
- **Migración por página** (todas conservan el comportamiento md+):
  - `DashboardPage.jsx:22-28`: `showSearch` + `onScan` sin cambios (el componente se adapta).
  - `AdminPlanesPage.jsx:47-96`: `toolbar` = toggle Tarjetas/Comparativa; `actions` = Nuevo plan (`icon`), Duplicar (`menu`).
  - `ClassSchedulePage.jsx:116-176`: `toolbar` = navegación de semana + toggle de vista; `actions` = Nueva clase (`icon`).
  - `ReportesPage.jsx:90-99`: `ReportExportButtons` → una sola acción "Exportar" que abre menú con PDF/Excel/CSV en <md (agregar prop `compact` al componente).
  - `CreateClassPage.jsx:144-166`: Cancelar redundante en móvil (ya hay `backAction`) → `mobile: 'hidden'`; Publicar → `icon` `Check`. Idealmente además botón primario fijo al pie del formulario (BK-MOB-07).
  - `AttendancePage.jsx:96-119`: Exportar `menu`, Cerrar asistencia `icon`.
  - `GestionSociosPage.jsx:86-112`, `AdminSociosPage.jsx:126-138`: Nuevo socio `icon`.
  - **`AdminUsuariosPage.jsx:44-56`: reemplazar `actions={<Button/>}` (prop JSX) por el nuevo contrato `actions=[{ id:'crear-staff', label:'Crear staff', icon: Plus, onClick: () => setIsFormOpen(true), variant:'primary', mobile:'icon' }]`; quitar `icon` ya que `TopBar` no lo soporta (o implementar `icon` como ícono antes del título; decisión menor).** Este fix deja de tener a "Crear staff" invisible también en escritorio.
- **Estados de UI:** `searchOpen`, `menuOpen`; sin carga remota.
- **Textos:** "Buscar socio", "Escanear QR", "Más acciones" (aria-label del menú), "Cerrar búsqueda".
- **Responsive:** 375 px: título truncado + hasta 2 botones-ícono de 44 px + (opcional) buscador; 768 px: botones con texto como hoy.

## 8. Archivos a crear / modificar
- Modificar `components/layout/TopBar.jsx` (+ `ActionsMenu` interno o `components/layout/TopBarActions.jsx`).
- Modificar `components/recepcion/ReportExportButtons.jsx` (prop `compact`).
- Modificar las 9 páginas listadas en §7 (solo la llamada a `TopBar`).
- Crear `components/layout/TopBar.test.jsx` (hoy inexistente). Actualizar tests de páginas que dependen del texto de los botones (`ClassSchedulePage.handlers.test.jsx`, `AdminPlanesPage.handlers.test.jsx`, `ReportesPage.handlers.test.jsx`, `CreateClassPage.handlers.test.jsx`, `AdminSociosPage.handlers.test.jsx`, `GestionSociosPage.test.jsx`): como en jsdom no hay CSS, tanto el botón-ícono como el de texto existirían → asegurar un único elemento accesible por `name` (usar `aria-label` en el botón-ícono y `hidden md:inline` en el texto sin duplicar nodos).

## 9. Plan de pruebas (TDD)
Convención y comandos: ver BK-MOB-01 §9 (vitest + RTL, `renderWithProviders`; `cd frontend && npx vitest run src/components/layout/TopBar.test.jsx`). jsdom no aplica CSS → se testea estructura/atributos y se complementa con Playwright.
1. `TopBar.test.jsx`: renderiza `title`, `subtitle`, `Badge` "En Vivo" con `showLive`; `h1` tiene clases `truncate` y `text-lg md:text-2xl`.
2. Con `actions`, cada acción aparece como botón accesible por `name` (`getByRole('button', { name: 'Nuevo plan' })`) y dispara `onClick`.
3. `mobile: 'menu'`: el botón "Más acciones" existe y al hacer click lista la acción; `mobile: 'hidden'` no aparece en el menú.
4. `showSearch`: botón "Buscar socio" alterna el form; submit navega a `/recepcion/socios?search=...` (comportamiento actual de `TopBar.jsx:25-31`).
5. **Regresión del bug (BK-BUG-03 señala que el test existente lo oculta porque mockea `TopBar`: NO mockear `TopBar` acá):** `AdminUsuariosPage` (con `renderWithProviders` y auth admin, mockeando `useStaffList`/`useResendActivation` de `hooks/queries/useStaff`) → `getByRole('button', { name: /crear staff/i })` existe y al click abre `StaffFormModal`.
6. Playwright (extender `frontend/scripts/mobile-walkthrough.mjs`, hoy solo rutas socio con `devices['iPhone SE']`): para admin/recepcionista en `/dashboard`, `/admin/planes`, `/admin/clases`, `/recepcion/reportes` a 375, 768 y 1024: `document.documentElement.scrollWidth <= window.innerWidth` y cada botón del header con `getBoundingClientRect()` ≥ 44×44 y dentro del viewport. (Playwright no corre en CI: `ci.yml` solo ejecuta lint, vitest y build.)
Manual: cuentas seed admin y recepcionista en DevTools 375×812.

## 10. Criterios de aceptación
- **Dado** el dashboard de admin a 375 px **entonces** el header no genera scroll horizontal y el buscador y el escaneo son accesibles (ícono → fila de búsqueda).
- **Dado** Planes/Clases/Reportes a 375 px **entonces** las acciones secundarias están en un menú y las pestañas en una fila propia.
- **Dado** cualquier título largo **entonces** se trunca con elipsis sin empujar los botones.
- **Dado** un admin en Usuarios (cualquier ancho) **entonces** ve y puede usar "Crear staff".

## 11. Riesgos y decisiones abiertas
1. ¿`sticky top-0` en el header? Recomendación: sí en móvil (el `main` es el scroller, `AppLayout.jsx:8`); validar solapamiento con `Modal`/`Sidebar` (z-50).
2. ¿Menú como dropdown o sheet? Recomendación: sheet (reutiliza BK-MOB-06) por tamaño de targets.
3. Hallazgo para el dueño del backlog de bugs: el botón "Crear staff" invisible es un bug funcional independiente de móvil (documentado en BK-BUG-03, que lo resuelve con `rightContent`; esta ficha migra luego el botón al contrato `actions`).

## 12. Referencias
Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", columna "05 · Mobile", módulos Dashboard/Planes/Clases (No verificado el nombre exacto de los frames). BK-MOB-06, BK-MOB-07, BK-MOB-09.

## 13. Prompt listo para un agente de IA
> Repo Winnie-The-Gym, `frontend/` (React 18, Tailwind 3, lucide-react, vitest/RTL). Leé `src/components/layout/TopBar.jsx` y las páginas que lo usan (`DashboardPage`, `admin/AdminPlanesPage`, `ClassSchedulePage`, `recepcion/ReportesPage`, `CreateClassPage`, `AttendancePage`, `recepcion/GestionSociosPage`, `admin/AdminSociosPage`, `admin/AdminUsuariosPage`). Hacé TDD: creá `TopBar.test.jsx` (title truncado, `actions` con `mobile: 'icon'|'menu'|'hidden'`, buscador colapsable, `toolbar`) y un test de regresión de `AdminUsuariosPage` que exija el botón "Crear staff" (hoy `TopBar` descarta las props `actions`/`icon`). Luego implementá en `TopBar.jsx` las props `actions` y `toolbar` (retrocompatible con `rightContent`), con `header` = `px-4 py-3 md:px-6 md:py-4 flex flex-wrap ... sticky top-0 z-20`, `h1` `text-lg md:text-2xl truncate`, botones-ícono `h-11 w-11` con `aria-label`, buscador con `text-base md:text-sm`. Migrá las páginas conservando el comportamiento md+. Mantené un único elemento por `name` accesible para no romper los tests existentes (`*.handlers.test.jsx`). Código en inglés, textos UI en español rioplatense. Terminado cuando `npm run lint`, `npx vitest run --coverage` y `npm run build` pasan y a 375/768/1024 no hay overflow horizontal en esas pantallas.
