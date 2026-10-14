---
id: BK-MOB-02
titulo: Navegación móvil del socio sin callejones (Dashboard, Perfil y Mis Pagos sin nav; sin logout)
tipo: mobile
roles: [socio, administrador]
prioridad: P0
tamano: M
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-MOB-01, BK-MOB-06]
---

# BK-MOB-02 · Navegación móvil del socio sin callejones

## 1. Resumen
El socio usa dos layouts distintos: `MemberLayout` (con su propia bottom nav) en Credencial, Clases y Checkout, y `AppLayout` en `/dashboard`, `/perfil` y `/socio/pagos`. En `AppLayout` el `Sidebar` está oculto bajo `md` y `AppBottomNav` devuelve `null` para el rol socio, así que **en esas tres pantallas el socio no tiene ninguna navegación en el celular**. Además "Mis Pagos" (`/socio/pagos`) solo se enlaza desde el Sidebar, o sea que es inalcanzable por UI en móvil, y no existe "Cerrar sesión" para el socio móvil.

## 2. Objetivo de usuario
Como **socio** quiero **moverme entre Inicio, Clases, mi QR, Pagos y Perfil y cerrar sesión desde el celular** para **no quedar atrapado en una pantalla sin salida**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Layout socio | `frontend/src/components/layout/MemberLayout.jsx:64-181` | Bottom nav propia de 5 columnas: Inicio (`/socio/credencial`), Clases (`/socio/clases`), QR (FAB, también `/socio/credencial`), Pagar (`/socio/checkout`), Perfil (`/perfil`). Inicio y QR apuntan a la misma ruta. |
| Sin ítem a Pagos | `MemberLayout.jsx:64-181` | No hay link a `/socio/pagos`. `rg "socio/pagos" src` solo encuentra el Sidebar (`Sidebar.jsx:44`) y la ruta (`App.jsx:133`). |
| Páginas con `AppLayout` | `DashboardPage.jsx:21`, `ProfilePage.jsx:107,136`, `HistorialPagosPage.jsx:36` | Usan `AppLayout`; para socio no hay Sidebar (<768) ni `AppBottomNav` (`AppBottomNav.jsx:27-28`). |
| Entrada al dashboard | `components/auth/EmailPasswordForm.jsx:50` | Tras login: `navigate(is_profile_complete ? '/dashboard' : '/completar-perfil')` → el socio aterriza en `/dashboard`, la pantalla sin nav. |
| Acciones del dashboard | `components/dashboard/views/SocioDashboardView.jsx:71,118` | Únicos puentes: `navigate('/socio/credencial')` y `navigate('/socio/clases')`. |
| Perfil sin salida | `MemberLayout.jsx:161-178` → `ProfilePage.jsx:136` | "Perfil" lleva a `AppLayout` sin nav: solo queda el botón atrás del navegador. |
| Logout | `Sidebar.jsx:65-68,181-187` | Único lugar con "Cerrar sesión". |
| Tema | `MemberLayout.jsx:37-54` | Toggle solo en el header de `MemberLayout` (`md:hidden`). |
| Marco "teléfono" | `MemberLayout.jsx:20,65` | `sm:max-w-sm` centra un marco de 384 px entre 640 y 768 px; a partir de `md` aparece el Sidebar y el marco ocupa todo (`md:max-w-none`). La bottom nav se ancla con `left-1/2 -translate-x-1/2 sm:max-w-sm`. |
| Admin en vistas socio | `App.jsx:130-131` | `/socio/credencial` y `/socio/clases` admiten `administrador`; su `MemberLayout` muestra el link "Pagar" (`/socio/checkout`), que está restringido a `socio` (`App.jsx:132`) → redirige a `/dashboard`. |
| Tests | `components/layout/MemberLayout.test.jsx` | Existe (139 líneas, mockea Sidebar y themeStore; 9 casos: children, título, subtítulo, Sidebar, `nav` y labels "Inicio, Clases, QR, Pagar, Perfil", `rightAction`). Hay que actualizarlo: el caso de la línea 115 fija los labels actuales. |

## 4. Alcance
**Incluye:** unificar la nav móvil del socio en un único componente usado por `MemberLayout` y por `AppLayout`; agregar acceso a Mis Pagos, Perfil, tema y Cerrar sesión; eliminar la duplicación Inicio/QR; que el admin no vea "Pagar".
**No incluye:** nav de staff (BK-MOB-01), rediseño de la credencial, nuevas pantallas.

## 5. Contrato de API
Sin cambios de API.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Fuente única:** `NAV_BY_ROLE.socio` en `frontend/src/constants/navConfig.js` (creado en BK-MOB-01). Propuesta de ítems:
  - Primarios (4 + FAB central): Inicio `/dashboard`, Clases `/socio/clases`, **QR** `/socio/credencial` (FAB), Pagar `/socio/checkout`, **Más**.
  - "Más": Mis pagos `/socio/pagos`, Mi perfil `/perfil`, tema, Cerrar sesión.
  - Decisión: "Inicio" debería ser `/dashboard` (es donde aterriza el login) y "QR" es la credencial; así desaparece el duplicado.
- **Componente:** extraer de `MemberLayout.jsx:64-181` a `frontend/src/components/layout/SocioBottomNav.jsx` y que `AppBottomNav` renderice `SocioBottomNav` cuando `rol === 'socio'` (en vez de `return null`, `AppBottomNav.jsx:27-28`). Así `/dashboard`, `/perfil` y `/socio/pagos` ganan nav sin cambiar sus páginas. `MemberLayout` pasa a usar el mismo componente (borrar el `<nav>` inline).
- **Rol admin dentro de vistas socio:** `SocioBottomNav` recibe `role`; si es `administrador`, ocultar "Pagar" y "Mis pagos" y mostrar un ítem "Volver al panel" → `/dashboard`.
- **Más/sheet:** reutilizar `MoreSheet` de BK-MOB-01 (mismo contenido de cuenta). 
- **Layout:** quitar el marco `sm:max-w-sm` de `MemberLayout` entre 640–768 px o decidirlo en BK-MOB-09 (tablet). Padding inferior: `pb-24` actual (`MemberLayout.jsx:59`) → `pb-[calc(4rem+env(safe-area-inset-bottom))]`.
- **Estados:** nav activa por `NavLink`; FAB con anillo cuando `/socio/credencial` está activa (ya existe, `MemberLayout.jsx:121-123`).
- **Textos:** "Inicio", "Clases", "QR", "Pagar", "Más", "Mis pagos", "Mi perfil", "Cerrar sesión".
- **Responsive:** 375 px 5 columnas; 768 px+ Sidebar (el Sidebar del socio ya lista Dashboard, Credencial, Clases, Mis Pagos, Pagar, `Sidebar.jsx:40-46`).

## 8. Archivos a crear / modificar
- Crear `frontend/src/components/layout/SocioBottomNav.jsx` (+ test).
- Modificar `AppBottomNav.jsx` (rama socio), `MemberLayout.jsx` (usar `SocioBottomNav`, quitar nav inline, ajustar padding), `navConfig.js`.
- Tests: ampliar `MemberLayout.test.jsx`; nuevos `SocioBottomNav.test.jsx` y caso socio en `AppBottomNav.test.jsx`.

## 9. Plan de pruebas (TDD)
Convención y comandos: ver BK-MOB-01 §9 (vitest + RTL + `renderWithProviders`, `makeAuthedUser('socio')`; `cd frontend && npx vitest run src/components/layout`). jsdom no aplica Tailwind.
1. `SocioBottomNav.test.jsx`: rol socio → links a `/dashboard`, `/socio/clases`, `/socio/credencial`, `/socio/checkout`, botón "Más"; "Más" abre sheet con `/socio/pagos`, `/perfil`, "Cerrar sesión".
2. Cerrar sesión limpia el store y navega a `/login`.
3. `AppBottomNav.test.jsx` con socio: ya no devuelve `null`.
4. Render de `DashboardPage`/`ProfilePage`/`HistorialPagosPage` con socio incluye `navigation` (landmark `nav`).
5. Admin dentro de `MemberLayout`: no existe link a `/socio/checkout`.
6. `MemberLayout.test.jsx` existente sigue verde (mockea `Sidebar`).
Manual: login como socio → aterriza en `/dashboard` y se ve la nav; entrar a Mis pagos y Perfil y volver; cerrar sesión; a 768 px aparece el Sidebar.

## 10. Criterios de aceptación
- **Dado** un socio en `/dashboard`, `/perfil` o `/socio/pagos` a 375 px **entonces** ve la bottom nav.
- **Dado** un socio **cuando** abre "Más" **entonces** accede a Mis pagos, Perfil, tema y Cerrar sesión.
- **Dado** un admin en `/socio/credencial` **entonces** no ve "Pagar" y tiene un modo de volver al panel.
- No hay dos ítems que apunten al mismo destino.

## 11. Riesgos y decisiones abiertas
1. ¿"Inicio" = `/dashboard` o `/socio/credencial`? Recomendación: `/dashboard` y que la credencial sea el FAB QR.
2. ¿Mantener el marco de 384 px entre 640 y 768 px? Recomendación: eliminarlo (ver BK-MOB-09).
3. El test `MemberLayout.test.jsx:115` fija los labels actuales; hay que actualizarlo en el mismo PR.
4. Solapamiento con BK-BUG-07: ese ítem (P1, depende de BK-MOB-01) lista los mismos defectos de enlaces del socio. Recomendación: implementar BK-MOB-01/02 y dejar en BK-BUG-07 solo lo que quede (p. ej. el parámetro `search` del TopBar que la página ignora).

## 12. Referencias
`frontend/scripts/mobile-walkthrough.mjs` (rutas socio a 375×667; no valida navegación). Figma (opcional): archivo `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", columna "05 · Mobile", módulo Socio (No verificado el frame exacto). BK-MOB-01, BK-BUG-07 (defectos de enlaces/ruteo que esta ficha implementa como componente: "Inicio"→`/dashboard`, ítem QR duplicado, socio sin menú; coordinar para no implementarlo dos veces), BK-CLS-08 (agenda del socio).

## 13. Prompt listo para un agente de IA
> Repo Winnie-The-Gym, `frontend/` (React 18, Tailwind 3, react-router-dom 7, vitest/RTL). Problema: el socio no tiene navegación móvil en `/dashboard`, `/perfil` y `/socio/pagos` (usan `AppLayout`, cuyo `AppBottomNav` retorna `null` para `socio`), `/socio/pagos` solo se enlaza desde el Sidebar y no hay logout en móvil. Leé `components/layout/{MemberLayout,AppBottomNav,AppLayout,Sidebar}.jsx`, `constants/navConfig.js` (BK-MOB-01) y `App.jsx`. TDD primero: `SocioBottomNav.test.jsx`, caso socio en `AppBottomNav.test.jsx`, ampliar `MemberLayout.test.jsx`. Después extraé la nav inline de `MemberLayout.jsx:64-181` a `SocioBottomNav.jsx` (Inicio `/dashboard`, Clases, QR FAB `/socio/credencial`, Pagar, Más → Mis pagos, Perfil, tema, logout vía `useLogout`), usala desde `AppBottomNav` para el rol socio y desde `MemberLayout`, ocultá "Pagar"/"Mis pagos" si `role==='administrador'`. Textos en español rioplatense. Terminado: lint, `npx vitest run --coverage` y `npm run build` verdes; manualmente a 375 px el socio navega entre todas sus pantallas y cierra sesión.
