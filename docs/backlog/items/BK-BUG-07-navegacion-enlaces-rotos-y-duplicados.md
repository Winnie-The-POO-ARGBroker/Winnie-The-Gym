---
id: BK-BUG-07
titulo: Navegación: enlaces que redirigen, ítems duplicados, bottom nav de 6 ítems en grilla de 5, socio sin menú en /dashboard y /perfil, y búsqueda del TopBar que no filtra
tipo: bug
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: M
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-MOB-01]
---

# BK-BUG-07 · Defectos de ruteo y enlaces de navegación

## 1. Resumen
Solo se documentan defectos de **ruteo/enlaces**; el rediseño del bottom nav (p. ej. menú "Más") pertenece a BK-MOB-01. Hallazgos verificados: el sidebar de admin enlaza `/membresias` (que redirige a `/admin/planes`, por lo que el ítem nunca queda activo); el bottom nav del socio tiene "Inicio" y "QR" apuntando a la misma ruta; el bottom nav del recepcionista tiene 6 ítems en una grilla de 5 columnas; el socio **no tiene ningún menú** en `/dashboard`, `/perfil` ni `/socio/pagos` en mobile; admin y recepcionista usan páginas distintas para "Socios"; la búsqueda del TopBar navega a `/recepcion/socios?search=` pero la página ignora el parámetro. (Lo que NO es un defecto: `/recepcion/socios` y `/recepcion/reportes` sí existen como rutas reales; la hipótesis de que "el nav mobile de admin apunta a rutas que no existen" quedó descartada.)

## 2. Objetivo de usuario
Como **usuario de cualquier rol** quiero **que cada ítem del menú me lleve a la pantalla correcta y quede resaltado** para **orientarme y no quedar en un callejón sin salida**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Sidebar admin | `frontend/src/components/layout/Sidebar.jsx:16` | `{ label: 'Membresías', path: '/membresias', icon: 'card' }` |
| Router | `frontend/src/App.jsx:96` | `/membresias` → `<Navigate to="/admin/planes" replace />` |
| Sidebar activo | `frontend/src/components/layout/Sidebar.jsx:94` | `isActive = location.pathname === path` (match exacto): "Membresías" nunca se resalta en `/admin/planes`; tampoco se resalta "Clases" en `/admin/clases/crear` ni `/admin/clases/asistencia` |
| Sidebar admin | `frontend/src/components/layout/Sidebar.jsx:18-19` | "Socios" y "Usuarios" usan ambos el icono `people` |
| Sidebar rol | `frontend/src/components/layout/Sidebar.jsx:31-39` | Recepcionista no tiene "Planes" aunque `/admin/planes` lo permite; admin → `/admin/socios` (`AdminSociosPage`), recepcionista → `/recepcion/socios` (`GestionSociosPage`) |
| Bottom nav staff | `frontend/src/components/layout/AppBottomNav.jsx:5-21` | `administrador`: Dashboard, Acceso, Socios (`/recepcion/socios`), Reportes (`/recepcion/reportes`), Config; `recepcionista`: **6 ítems** (Dashboard, Clases, Acceso, Aforo, Socios, Reportes) |
| Bottom nav grilla | `frontend/src/components/layout/AppBottomNav.jsx:35` | `grid grid-cols-5` fijo → el 6.º ítem del recepcionista salta a una segunda fila dentro de `h-14` (queda cortado/solapado) |
| Bottom nav socio | `frontend/src/components/layout/AppBottomNav.jsx:27-28` | `MOBILE_NAV[rol]` solo define `administrador` y `recepcionista`; para `socio` retorna `null` |
| Layouts | `frontend/src/pages/DashboardPage.jsx:3`, `pages/ProfilePage.jsx:7`, `pages/socio/HistorialPagosPage.jsx:2` | Usan `AppLayout` (Sidebar `hidden md:flex` + `AppBottomNav`). Para `socio` en mobile no hay Sidebar ni bottom nav: **sin navegación** (solo `CredencialDigitalPage`, `ClasesPage`, `CheckoutPage` usan `MemberLayout`, que sí trae su nav) |
| Nav socio | `frontend/src/components/layout/MemberLayout.jsx:71-72,114-115` | "Inicio" → `/socio/credencial` y "QR" → `/socio/credencial` (misma ruta, dos ítems activos a la vez); "Inicio" no lleva a `/dashboard` |
| Nav socio | `frontend/src/components/layout/MemberLayout.jsx:141-158` | Hay "Pagar" (`/socio/checkout`) pero no "Mis Pagos" (`/socio/pagos`), que sí está en `Sidebar.jsx:44` |
| Acceso a /perfil en mobile | `frontend/src/components/layout/AppBottomNav.jsx:5-21` | Staff no tiene entrada a `/perfil` en mobile (solo en el popup del Sidebar desktop `Sidebar.jsx:168-177`); el socio sí (`MemberLayout.jsx:161-178`) |
| Redirect post-login | `frontend/src/components/auth/EmailPasswordForm.jsx:50` | Tras login → `/dashboard` para todos, incluido el socio (que en mobile queda sin menú) |
| Búsqueda TopBar | `frontend/src/components/layout/TopBar.jsx:25-31` | `navigate(\`/recepcion/socios?search=${...}\`)` |
| Página destino | `frontend/src/pages/recepcion/GestionSociosPage.jsx:32,38-45` | `const [search, setSearch] = useState('')`; no usa `useSearchParams` → el término se pierde |
| Rutas duplicadas | `frontend/src/App.jsx:122-127,137-138,112,126` | `/recepcion/reportes` y `/admin/reportes` montan la misma página (y `/reportes` redirige); `/configuracion` y `/admin/configuracion` también |
| Roles del portal socio | `frontend/src/App.jsx:130-134` | `/socio/credencial`, `/socio/clases`: `['administrador','socio']`; `/socio/checkout`, `/socio/pagos`: solo `socio`; el recepcionista es redirigido a `/dashboard` (`ProtectedRoute.jsx:16-19`) |

## 4. Alcance
**Incluye:** apuntar "Membresías" a `/admin/planes` (y renombrar "Planes" o mantener el label); match de ruta activo por prefijo; iconos distintos; unificar el destino de "Socios" por rol; "Inicio" del socio → `/dashboard`; quitar el ítem QR duplicado o diferenciarlo (`/socio/credencial#qr` no es necesario: basta una sola entrada); dar navegación al socio en `AppLayout` (usar `MemberLayout` o mostrar bottom nav de socio) ; que la búsqueda del TopBar filtre; resolver el 6.º ítem del recepcionista (mínimo: 5 ítems; el menú "Más" lo define BK-MOB-01).
**No incluye:** rediseño visual del bottom nav ni agrupación "Más" (BK-MOB-01), eliminar rutas legacy (BK-BUG-10), cambios de permisos.

## 5. Contrato de API
Sin cambios. (La búsqueda usa **[EXISTE]** `GET /api/members/socios/?search=` — `SearchFilter` sobre `nombre, apellido, dni, numero_socio`, `members/views.py:36-41`.)

## 6. Modelo de datos
Sin cambios.

## 7. Diseño frontend
- **Rutas/guards:** convención actual `<Route path element={<ProtectedRoute roles={[...]}><Page/></ProtectedRoute>} />`. Para el socio, la opción más simple es agregar `socio` a `MOBILE_NAV` de `AppBottomNav.jsx` con: Inicio `/dashboard`, Clases `/socio/clases`, QR `/socio/credencial`, Pagos `/socio/pagos`, Perfil `/perfil` (5 ítems) y retirar la duplicación del `MemberLayout` (o hacer que `MemberLayout` reutilice `AppBottomNav`). Iconos disponibles en `frontend/src/constants/navIcons.js` (`NAV_ICON_MAP`: chart, people, card, monitor, chart-line, gear, scan, activity, home, calendar; lucide-react); falta uno de "usuario/perfil" (agregar `UserRound`).
- **`Sidebar.jsx`:** `isActive = location.pathname === path || location.pathname.startsWith(path + '/')`; `path:'/admin/planes'`; icono distinto para "Usuarios" (p. ej. `UserCog`); agregar "Planes" a recepcionista (solo lectura, ver BK-BUG-06) o dejarlo fuera conscientemente.
- **`GestionSociosPage.jsx`:** inicializar `search` desde `useSearchParams().get('search') ?? ''` (hook de react-router-dom v7) y agregar una prop `initialValue` a `SearchBar` (`components/ui/SearchBar.jsx:14-19`; hoy su estado interno arranca en `useState('')` y no acepta valor inicial) para que el input refleje el término.
- **Estados:** n/a (navegación). A11y: `aria-current="page"` ya lo aplica `NavLink`.
- **Textos:** "Planes", "Inicio", "Pagos", "Perfil".
- **Responsive:** verificar a 375 px que ningún ítem se corte (5 columnas) y a 768 px que aparezca el Sidebar (`md:`).

## 8. Archivos a crear / modificar
- `frontend/src/components/layout/Sidebar.jsx`, `AppBottomNav.jsx`, `MemberLayout.jsx`, `frontend/src/constants/navIcons.js`.
- `frontend/src/components/layout/TopBar.jsx` (sin cambios si la página lee el parámetro), `frontend/src/pages/recepcion/GestionSociosPage.jsx`.
- Tests: `frontend/src/components/layout/MemberLayout.test.jsx` (existente) y nuevos `Sidebar.test.jsx`/`AppBottomNav.test.jsx` (no existen: verificado con `fd -i "sidebar|bottomnav"`); `frontend/src/components/ui/SearchBar.jsx`.

## 9. Plan de pruebas (TDD)
Frontend (vitest + RTL; `renderWithProviders({ route, authState })` de `frontend/src/test/test-utils.jsx` siembra el store de auth): `Sidebar` rol admin en `/admin/planes` marca activo el ítem de planes y no hay `href="/membresias"`; en `/admin/clases/crear` queda activo "Clases"; `AppBottomNav` rol recepcionista renderiza ≤ 5 ítems (o el menú Más de BK-MOB-01), rol socio renderiza Inicio/Clases/QR/Pagos/Perfil con `href` únicos (sin duplicados); `DashboardPage` como socio muestra navegación; `GestionSociosPage` en `/recepcion/socios?search=ana` llama `useSociosList` con `search:'ana'`. `cd frontend && npx vitest run src/components/layout src/pages/recepcion`; `npm run lint`.
Manual (375 px, devtools): `socio.activo@winnie.local` → login → `/dashboard` → debe haber forma de llegar a Clases/QR/Perfil; `recepcion@winnie.local` → barra inferior sin ítems cortados; `admin@winnie.local` → buscar "ana" en el TopBar → listado filtrado.

## 10. Criterios de aceptación
- **Dado** un administrador en `/admin/planes` **entonces** el ítem de planes del Sidebar está resaltado y su `href` es `/admin/planes`.
- **Dado** un socio en mobile en `/dashboard`, `/perfil` o `/socio/pagos` **entonces** ve una barra inferior con navegación.
- **Dado** el menú del socio **entonces** no hay dos ítems con el mismo destino.
- **Dado** un recepcionista en mobile **entonces** todos los ítems son visibles y tocables.
- **Dado** una búsqueda desde el TopBar **entonces** el listado de socios llega filtrado.

## 11. Riesgos y decisiones abiertas
1. ¿Admin y recepcionista deben compartir la misma pantalla de socios? Hoy admin: `/admin/socios` (KPIs, editar, baja); recepcionista: `/recepcion/socios` (listado + alta con bugs, BK-BUG-02, sin editar/baja). Recomendación: una sola página con acciones condicionadas por rol (decisión de producto; vinculada a BK-SOC-xx).
2. ¿Inicio del socio = `/dashboard` o `/socio/credencial`? Recomendación: `/dashboard` (ya tiene `SocioDashboardView`), y la credencial como "QR".
3. El menú "Más" para staff lo resuelve BK-MOB-01; este ítem solo garantiza enlaces correctos.

## 12. Referencias
`docs/architecture.md`; `docs/qa/walkthrough-2026-09-22.md`. Figma (opcional): "vistas live", Mobile → navegación. Relacionados: BK-MOB-01 (existente en `docs/backlog/items/BK-MOB-01-bottom-nav-staff-menu-mas.md`), BK-BUG-02, BK-BUG-06, BK-BUG-10.

## 13. Prompt listo para un agente de IA
> Repo Winnie The Gym (React 18, react-router-dom 7, lucide-react). Corregí los defectos de navegación sin rediseñar el bottom nav (eso es BK-MOB-01). (1) `frontend/src/components/layout/Sidebar.jsx`: cambiar `/membresias` por `/admin/planes`, hacer el estado activo por prefijo (`pathname === path || pathname.startsWith(path + '/')`), distinguir el icono de "Usuarios". (2) `AppBottomNav.jsx`: agregar nav para `socio` (Inicio `/dashboard`, Clases `/socio/clases`, QR `/socio/credencial`, Pagos `/socio/pagos`, Perfil `/perfil`) porque hoy devuelve `null` y el socio queda sin menú en `/dashboard`, `/perfil` y `/socio/pagos` (páginas con `AppLayout`); asegurar que ningún rol supere 5 ítems (el recepcionista hoy tiene 6 en `grid-cols-5`; sacá "Aforo" o dejá un TODO enlazando a BK-MOB-01). (3) `MemberLayout.jsx`: eliminar el ítem duplicado (Inicio y QR apuntan a `/socio/credencial`) y reusar la misma definición de nav. (4) `GestionSociosPage.jsx`: leer `?search=` con `useSearchParams` como valor inicial del buscador. TDD: primero escribí tests en `frontend/src/components/layout/` (Sidebar, AppBottomNav, MemberLayout) y `GestionSociosPage.test.jsx` con `renderWithProviders({route, authState})` de `frontend/src/test/test-utils.jsx`. Mostrá UI en español rioplatense. Terminado cuando `cd frontend && npx vitest run && npm run lint` pasan y a 375 px el socio puede navegar desde `/dashboard`. Sin commits.
