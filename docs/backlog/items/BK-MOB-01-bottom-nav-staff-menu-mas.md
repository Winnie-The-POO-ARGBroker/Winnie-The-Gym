---
id: BK-MOB-01
titulo: Bottom nav de staff con menú "Más" (todas las rutas + perfil, tema y logout)
tipo: mobile
roles: [administrador, recepcionista]
prioridad: P0
tamano: L
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-MOB-06, BK-MOB-08]   # ver también BK-BUG-07 (defectos de ruteo/enlaces de la misma nav)
---

# BK-MOB-01 · Bottom nav de staff con menú "Más"

## 1. Resumen
Bajo `md` (<768 px) el `Sidebar` desaparece y lo único que queda es `AppBottomNav`, que expone 5 (admin) o 6 (recepcionista) ítems fijos. Resultado verificado en código: el admin NO llega a Planes, Clases, Usuarios, Cobros ni Aforo; el recepcionista tiene 6 ítems en una grilla de 5 columnas; y **nadie puede cerrar sesión, ver el perfil ni cambiar el tema en móvil** porque esas tres acciones viven solo en el `Sidebar` oculto. Hay que rediseñar la nav móvil con un ítem "Más" que abre un sheet con el resto de las rutas del rol y las acciones de cuenta.

## 2. Objetivo de usuario
Como **recepcionista o administrador** quiero **llegar a cualquier pantalla de mi rol y cerrar sesión desde el celular** para **operar el gimnasio sin depender de una notebook**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Layout | `frontend/src/components/layout/AppLayout.jsx:6-9` | `Sidebar` + `<main className="... pb-14 md:pb-0">` + `AppBottomNav`. Contenedor `h-screen overflow-hidden`. |
| Sidebar oculto | `frontend/src/components/layout/Sidebar.jsx:72` | `<aside className="hidden md:flex w-sidebar ...">`: no existe bajo 768 px. |
| Nav móvil | `frontend/src/components/layout/AppBottomNav.jsx:5-21` | `MOBILE_NAV`: admin = Dashboard, Acceso, Socios (`/recepcion/socios`), Reportes (`/recepcion/reportes`), Config. Recepcionista = 6 ítems (Dashboard, Clases, Acceso, Aforo, Socios, Reportes). |
| Grilla fija | `AppBottomNav.jsx:35` | `grid grid-cols-5` → el 6.º ítem del recepcionista cae a una segunda fila dentro de `h-14` (altura fija, `AppBottomNav.jsx:32`) y se corta. |
| Etiquetas | `AppBottomNav.jsx:52` | `text-[10px]` (por debajo del mínimo legible, ver BK-MOB-07/11). |
| Rol sin ítems | `AppBottomNav.jsx:27-28` | `if (!items) return null` → el socio no recibe nav en las páginas que usan `AppLayout` (ver BK-MOB-02). |
| Divergencia con Sidebar | `Sidebar.jsx:13-47` vs `AppBottomNav.jsx:5-21` | Dos listas independientes. Admin: Sidebar usa `/admin/socios` y `/admin/reportes`; la bottom nav usa `/recepcion/socios` y `/recepcion/reportes` (mismo `ReportesPage`, pero Socios cae en la vista de recepción `GestionSociosPage`, no en `AdminSociosPage`). |
| Logout | `Sidebar.jsx:65-68, 181-187` | `handleLogout` (`clearAuth()` + `navigate('/login',{replace:true})`) solo existe en el popup del footer del Sidebar. `rg clearAuth src` confirma que ningún otro componente de UI lo llama. |
| Perfil | `Sidebar.jsx:169` | `navigate('/perfil')` solo desde ese popup. |
| Tema | `Sidebar.jsx:122-144`, `MemberLayout.jsx:37-54` | `toggleTheme` en Sidebar (oculto) y en `MemberLayout` (solo socio). Staff móvil no tiene toggle. |
| Router | `frontend/src/App.jsx:83-138` | Guards `ProtectedRoute roles={[...]}` por ruta (ver tabla en §7). |
| `/membresias` | `App.jsx:96`, `Sidebar.jsx:16` | `/membresias` redirige a `/admin/planes`; el ítem "Membresías" del Sidebar apunta a la ruta legacy y nunca se marca activo (`Sidebar.jsx:94` compara `pathname === path`). |
| Tests | — | No existen `AppBottomNav.test.jsx` ni `Sidebar.test.jsx` (`fd "Sidebar.test|AppBottomNav.test" src` vacío). |
| Íconos | `frontend/src/constants/navIcons.js:14-25` | `NAV_ICON_MAP` solo tiene 10 claves; para el ítem "Más" hay que importar `Ellipsis` de `lucide-react` (existe en la v1.47.0 instalada; también `LogOut`, `Moon`, `Sun`, `User`). |

## 4. Alcance
**Incluye:** (a) una única fuente de verdad `navConfig` consumida por `Sidebar` y `AppBottomNav`; (b) 4 ítems primarios + "Más" por rol; (c) sheet "Más" con el resto de las rutas del rol agrupadas, "Mi perfil", toggle de tema y "Cerrar sesión"; (d) corregir los destinos inconsistentes (`/admin/socios`, `/admin/planes`); (e) tests.
**No incluye:** nav del socio (BK-MOB-02), cambios visuales del Sidebar de escritorio, nuevas pantallas, tablet (BK-MOB-09), PWA.

## 5. Contrato de API
Sin cambios de API.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend

### Rutas reales y permisos (de `App.jsx`)
| Ruta | Guard `roles` | Línea |
|---|---|---|
| `/dashboard`, `/perfil` | cualquier autenticado | 74-75 |
| `/admin/clases`, `/admin/clases/crear`, `/admin/clases/asistencia` | administrador, recepcionista | 83-91 |
| `/admin/planes` | administrador, recepcionista | 99-101 |
| `/admin/socios` | administrador | 104-106 |
| `/admin/usuarios` | administrador | 109-111 |
| `/recepcion/acceso` (lazy), `/aforo`, `/socios`, `/reportes`, `/cobros` | administrador, recepcionista | 115-127 |
| `/admin/reportes` | administrador, recepcionista | 125 |
| `/configuracion`, `/admin/configuracion` | administrador | 137-138 |
| `/socio/credencial`, `/socio/clases` | administrador, socio | 130-131 |
| `/socio/checkout`, `/socio/pagos` | socio | 132-133 |

### Propuesta de contenido (decisión por defecto; ver §11)
- **administrador** — primarios: Dashboard `/dashboard`, Acceso `/recepcion/acceso`, Socios `/admin/socios`, Clases `/admin/clases`, **Más**. En "Más": *Administración* → Planes `/admin/planes`, Usuarios `/admin/usuarios`, Reportes `/admin/reportes`, Configuración `/configuracion`; *Recepción* → Aforo `/recepcion/aforo`, Cobros manuales `/recepcion/cobros`; *Portal socio (vista)* → Mi credencial `/socio/credencial`, Reserva de clases `/socio/clases`; cuenta → Mi perfil `/perfil`, tema, Cerrar sesión.
- **recepcionista** — primarios: Dashboard, Acceso, Socios `/recepcion/socios`, Clases `/admin/clases`, **Más**. En "Más": Aforo, Cobros, Reportes `/recepcion/reportes`, Planes `/admin/planes` (la ruta lo permite aunque el Sidebar actual no lo liste: ver §11), Mi perfil, tema, Cerrar sesión.

### Componentes
1. **Nuevo** `frontend/src/constants/navConfig.js` (junto a `navIcons.js`). Forma:
   ```js
   export const NAV_BY_ROLE = {
     administrador: [
       { label: 'Dashboard', path: '/dashboard', icon: 'chart', mobile: 'primary' },
       { divider: true, label: 'Administración' },
       { label: 'Planes', path: '/admin/planes', icon: 'card', mobile: 'more' },
       // ...
     ],
     recepcionista: [ /* ... */ ],
     socio: [ /* ... (BK-MOB-02) */ ],
   }
   ```
   `Sidebar` pasa a `import { NAV_BY_ROLE } from '../../constants/navConfig'` (hoy declara la constante local en `Sidebar.jsx:12-47`) y `AppBottomNav` deriva `primary = items.filter(i => i.mobile === 'primary')` y `more = items.filter(i => i.mobile === 'more')`. Cambiar `Membresías /membresias` por `Planes /admin/planes` en el Sidebar corrige además el estado activo.
2. **Nuevo** `frontend/src/components/layout/MoreSheet.jsx` — usa `Modal` con la variante sheet de BK-MOB-06 (`<Modal variant="sheet" title="Más" ...>`). Contenido: secciones con `divider` como títulos (`text-xs uppercase`), cada ítem un `NavLink` de alto `min-h-12` (48 px) con ícono + label, que llama `onClose` al navegar; pie con `Mi perfil` (`navigate('/perfil')`), fila de tema (`useThemeStore().toggleTheme`) y `Cerrar sesión` (`clearAuth()` + `navigate('/login', {replace:true})`, igual que `Sidebar.jsx:65-68`; color `text-error-500`). Extraer esa lógica a un hook `useLogout()` en `frontend/src/hooks/useLogout.js` y usarlo también en `Sidebar.jsx`.
3. **Modificar** `AppBottomNav.jsx`: grilla `grid-cols-5` (4 primarios + botón "Más" como `<button type="button" aria-haspopup="dialog" aria-expanded={open}>` con `Ellipsis`). El ítem "Más" se marca activo si la ruta actual pertenece a `more` (`useLocation().pathname` + `matchPath`). Altura: `min-h-14` + `pb-[env(safe-area-inset-bottom)]` (BK-MOB-08) en vez de `h-14` + `paddingBottom` inline. Targets: cada ítem `min-h-[48px] min-w-[48px]`, label `text-[11px]` mínimo → idealmente `text-xs`.
4. `AppLayout.jsx`: cambiar `pb-14 md:pb-0` por `pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0` (hoy el padding no considera el safe-area) y cambiar `h-screen` por `h-dvh` (BK-MOB-08).
5. Convención de estado del sheet: `useState` local en `AppBottomNav` (el repo usa `useState` para modales: p.ej. `ClassSchedulePage.jsx:27`); el store `themeStore` ya existe (`frontend/src/stores/themeStore.js`).

### Estados de UI
Sin carga remota. Estados: sheet cerrado/abierto, ítem activo, ítem "Más" activo cuando la ruta actual está dentro. Foco: al abrir, foco al primer ítem; al cerrar, devolver foco al botón "Más" (BK-MOB-06/11).

### Textos (voseo)
Botón: "Más". Título del sheet: "Más opciones". Pie: "Mi perfil", "Modo oscuro"/"Modo claro", "Cerrar sesión".

### Responsive
375 px: 5 columnas de ~75 px, labels ≤ 9 caracteres ("Dashboard" es el más largo: `truncate`). 768 px+: `md:hidden` oculta la nav y aparece el Sidebar (sin cambios).

## 8. Archivos a crear / modificar
- Crear `frontend/src/constants/navConfig.js`, `frontend/src/components/layout/MoreSheet.jsx`, `frontend/src/hooks/useLogout.js`.
- Modificar `Sidebar.jsx` (consumir `navConfig`, `useLogout`, corregir `/membresias`), `AppBottomNav.jsx`, `AppLayout.jsx`.
- Crear tests: `AppBottomNav.test.jsx`, `MoreSheet.test.jsx`, `Sidebar.test.jsx` (hoy inexistentes), `navConfig.test.js`.

## 9. Plan de pruebas (TDD)
Convención: tests co-ubicados `*.test.jsx`, vitest 4 + RTL 16 + jest-dom, `vite.config.js` (`environment: 'jsdom'`, `setupFiles: ./setupTests.js` que solo importa jest-dom). Helpers en `frontend/src/test/test-utils.jsx`: `renderWithProviders(ui, { route, authState })`, `makeAuthedUser('admin' | 'recepcion' | 'socio')`, `resetAllStores()`. Comandos: `cd frontend && npx vitest run src/components/layout`; CI corre `npm run lint` (`--max-warnings 0`), `npx vitest run --coverage` (umbrales 68/68/65/68) y `npm run build`. jsdom no carga Tailwind: no se puede verificar `md:hidden` por layout; se asertan clases y estructura.
Primero escribir (rojo):
1. `navConfig.test.js`: para cada rol, todas las rutas de `NAV_BY_ROLE[rol]` existen en una lista de rutas permitidas para ese rol (copiar la tabla de §7 como fixture) → impide que se liste una ruta que el guard rechaza. Exactamente 4 ítems `mobile: 'primary'` por rol de staff; sin `path` duplicados; ninguna ruta `/membresias`.
2. `AppBottomNav.test.jsx` (admin): renderiza 4 links + botón "Más"; no renderiza Planes/Usuarios hasta abrir "Más"; al abrir, el diálogo contiene links a `/admin/planes`, `/admin/usuarios`, `/recepcion/cobros`, `/recepcion/aforo`, `/configuracion`.
3. Ídem recepcionista: 4 + Más; sin ítem `/admin/usuarios` ni `/configuracion`.
4. Cerrar sesión: click → `useAuthStore.getState().accessToken === null` y navegación a `/login` (usar `MemoryRouter` con `Routes`).
5. Toggle de tema cambia `themeStore.theme`.
6. `rol` desconocido/`socio` en `AppBottomNav` → `null` (mantener hasta BK-MOB-02).
7. A11y: el botón "Más" tiene `aria-expanded` que alterna; el diálogo tiene `role="dialog"` y Escape lo cierra.
Manual (cuentas seed `admin`/`recepcion`, ver `seed_demo_users`; no imprimir contraseñas): DevTools a 375×812, iPhone SE y Pixel 7: llegar a Planes, Usuarios, Cobros y Aforo con ≤ 2 toques; cerrar sesión; a 768 px aparece el Sidebar y no la bottom nav.

## 10. Criterios de aceptación
- **Dado** un administrador a 375 px **cuando** abre "Más" **entonces** ve Planes, Usuarios, Reportes, Configuración, Aforo, Cobros, Mi credencial, Reserva de clases, Mi perfil, tema y Cerrar sesión.
- **Dado** un recepcionista a 375 px **entonces** la nav muestra exactamente 5 columnas sin desborde y "Más" lista Aforo, Cobros, Reportes, Planes y cuenta.
- **Dado** cualquier staff **cuando** toca "Cerrar sesión" **entonces** se limpia la sesión y llega a `/login`.
- **Dado** que se agrega una ruta al `navConfig` **entonces** aparece en Sidebar y en "Más" sin tocar dos archivos.
- Los targets táctiles de la nav miden ≥ 44×44 px y respetan el safe-area inferior.

## 11. Riesgos y decisiones abiertas
1. ¿Qué 4 ítems primarios por rol? Recomendación: los de mayor frecuencia (Dashboard, Acceso, Socios, Clases). Alternativa: Acceso como botón central destacado (FAB como el QR del socio).
2. ¿El recepcionista debe ver "Planes"? La ruta lo permite (`App.jsx:100`) pero el Sidebar no lo lista. Recomendación: sí en "Más" (solo lectura/gestión según decisión del dueño); si no, quitar `'recepcionista'` del guard.
3. ¿El admin usa `/admin/socios` (gestión completa) en móvil? Recomendación: sí; `/recepcion/socios` queda para recepcionista.
4. Dependencia de orden: implementar BK-MOB-06 (Modal sheet) primero, o dentro de este ítem con un sheet mínimo.
5. Hallazgo cruzado: `AdminUsuariosPage` pasa `actions`/`icon` a `TopBar` que no los soporta (`TopBar.jsx:21`) → el botón "Crear staff" nunca se renderiza (documentado en BK-BUG-03; ver también BK-MOB-03).

## 12. Referencias
BK-BUG-07 (enlaces rotos/duplicados de la nav: `/membresias`, "Socios" por rol; depende de esta ficha). Esta ficha ya corrige `/membresias` → `/admin/planes` y la divergencia Sidebar/bottom nav; en BK-BUG-07 queda lo restante (p. ej. el parámetro `search` del TopBar que `GestionSociosPage` ignora).
`openspec/`/`speckit/`: sin spec específica de nav móvil (`rg "mobile-walkthrough|mobile:check"` en `speckit/`, `docs/`, `openspec/` y `README.md` no devuelve resultados; el script `frontend/scripts/mobile-walkthrough.mjs` viene del commit `4b4584f`). `docs/qa/plan-de-pruebas.md` (riesgo de compatibilidad móvil). Figma (opcional): archivo `WuBKhksfVVcBjNKbDVX5EM`, página "vistas live", columna "05 · Mobile" (No verificado el nombre exacto del frame). BK-MOB-02, BK-MOB-06, BK-MOB-08, BK-MOB-11.

## 13. Prompt listo para un agente de IA
> Repo Winnie-The-Gym, frontend React 18 + Vite + Tailwind 3 + react-router-dom 7 + zustand + vitest/RTL (cwd `frontend/`). Objetivo: rediseñar la bottom nav móvil de staff. Leé `src/components/layout/{AppLayout,AppBottomNav,Sidebar}.jsx`, `src/constants/navIcons.js`, `src/App.jsx` (guards `ProtectedRoute roles`), `src/stores/themeStore.js`, `src/hooks/useAuth.js` y `src/components/ui/Modal.jsx`. Hacé TDD: primero `navConfig.test.js`, `AppBottomNav.test.jsx`, `MoreSheet.test.jsx`, `Sidebar.test.jsx` (usá `renderWithProviders`/`makeAuthedUser` de `src/test/test-utils.jsx`; jsdom no aplica Tailwind). Luego creá `src/constants/navConfig.js` (fuente única con `mobile: 'primary'|'more'`), `src/hooks/useLogout.js`, `src/components/layout/MoreSheet.jsx` (Modal variante sheet de BK-MOB-06), y modificá `AppBottomNav` (4 primarios + "Más", `grid-cols-5`, targets ≥44 px, labels ≥ 11 px), `Sidebar` (consumir navConfig, `/admin/planes` en vez de `/membresias`) y `AppLayout` (`pb-[calc(3.5rem+env(safe-area-inset-bottom))]`). Admin primarios: Dashboard, Acceso, Socios `/admin/socios`, Clases; Más: Planes, Usuarios, Reportes `/admin/reportes`, Configuración, Aforo, Cobros, Mi credencial, Reserva de clases, perfil, tema, logout. Recepcionista: Dashboard, Acceso, Socios `/recepcion/socios`, Clases; Más: Aforo, Cobros, Reportes `/recepcion/reportes`, Planes, perfil, tema, logout. UI en español rioplatense, código en inglés. Terminado cuando `npm run lint`, `npx vitest run --coverage` y `npm run build` pasan y a 375 px todas las rutas del rol son alcanzables en ≤ 2 toques.
