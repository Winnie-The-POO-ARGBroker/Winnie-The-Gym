---
id: BK-MOB-04
titulo: DataTable con modo cards en móvil (+ hook useMediaQuery y helper de viewport para tests)
tipo: mobile
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: L
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-MOB-07]
---

# BK-MOB-04 · DataTable con modo cards en móvil

## 1. Resumen
Todas las tablas de la app son `<table>` dentro de un `overflow-x-auto`: a 375 px el usuario tiene que hacer scroll horizontal para ver columnas (Socios tiene 6 + acciones) y los botones de acción de la última columna quedan fuera de pantalla. No existe vista de cards. Esta ficha propone un modo `cards` en `DataTable` y migrar los tres consumidores que hoy no lo usan o no pueden adaptarse.

## 2. Objetivo de usuario
Como **recepcionista/admin/socio** quiero **ver cada fila como una tarjeta legible con sus acciones** para **consultar y operar listados desde el celular sin scroll horizontal**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Componente | `frontend/src/components/ui/DataTable.jsx:19-29,95-172` | Props: `columns [{key,label,sortable?,render?}]`, `data`, `loading`, `ordering`, `onSort`, `onRowClick`, `renderActions`, `emptyTitle`, `emptyMessage`. Render único: `<div className="overflow-x-auto"><table className="w-full">`. Celdas `px-4 py-3`. Skeleton de 5 filas (`:48-88`) también como tabla. |
| Orden | `DataTable.jsx:31-45` | Ciclo `null → asc → desc → null` con `ordering` estilo DRF (`'-nombre'`); `<th role="button" tabIndex=0 aria-sort>`. En cards no hay encabezados → se pierde el ordenamiento. |
| Consumidores | `pages/admin/AdminSociosPage.jsx:210-262`, `pages/recepcion/GestionSociosPage.jsx:198-226` | `DataTable` con `getSocioColumns()` (`components/admin/SocioColumns.jsx:9-103`: Socio, DNI, Teléfono, Estado, Certificado Médico, Fecha Alta) y `renderActions` con 1 (recepción) o 3 (admin: ver, editar, dar de baja) botones `p-1.5` + ícono `w-4` (≈ 28 px, bajo los 44 px). |
| Tabla propia | `pages/admin/AdminUsuariosPage.jsx:67-114` | `<table>` artesanal (Email, Nombre, Rol, Estado, Acciones con botón "Reenviar activación"); no usa `DataTable`. |
| Tabla propia | `pages/socio/HistorialPagosPage.jsx:53-90` | `<table>` artesanal (Fecha, Plan, Monto, Método, Estado) — **es una pantalla del socio móvil**. |
| Matriz | `components/admin/PlanComparativeTable.jsx:105-106` | Tabla comparativa de planes; es una matriz (columnas = planes) y se queda como scroll horizontal. |
| Paginación | `components/ui/Pagination.jsx:43-96` | `flex items-center justify-between gap-4` sin `flex-wrap`: texto "Mostrando X–Y de Z" + hasta 7 botones de página; los botones `p-2` + ícono 16 px (36 px) y `PageButton` aparte. A 375 px desborda. |
| Filtros | `components/ui/FilterPanel.jsx:44` | Dropdown absoluto `w-80` anclado a la izquierda del botón; con backdrop `fixed inset-0 z-20`. El recorte en el borde derecho en escritorio, el cierre con Escape y ARIA son alcance de BK-BUG-09; acá solo se agrega la variante sheet en móvil. |
| Búsqueda | `components/ui/SearchBar.jsx:47` | `text-sm` (14 px) → zoom automático en iOS Safari (<16 px). |
| Tests | `components/ui/DataTable.test.jsx` | 11 casos (headers, filas, empty, sort asc→desc, skeleton, `onRowClick`, `renderActions`). Usan `getByText` → si se renderizaran tabla y cards a la vez, habría duplicados. |
| matchMedia | `rg "matchMedia" src` | Sin resultados: no hay hook de media query ni mock en `setupTests.js` (que solo importa jest-dom). jsdom no implementa `window.matchMedia`. |

## 4. Alcance
**Incluye:** (a) hook `useMediaQuery`; (b) modo cards en `DataTable` (prop `mobileMode`, `col.mobile`); (c) control de ordenamiento móvil; (d) skeleton de cards; (e) migrar `AdminUsuariosPage` y `HistorialPagosPage` a `DataTable`; (f) `Pagination` compacta; (g) helper de tests de viewport.
**No incluye:** virtualización, selección múltiple, `PlanComparativeTable`, cambios de backend/paginación.

## 5. Contrato de API
Sin cambios de API (la paginación DRF `{count,next,previous,results}` y `ordering` se mantienen tal como los consumen `AdminSociosPage`/`GestionSociosPage`).

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
### Hook nuevo `frontend/src/hooks/useMediaQuery.js`
```js
export default function useMediaQuery(query, defaultValue = false) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia(query).matches : defaultValue)
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    if (!window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange(); mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}
```
Decisión: renderizar **uno solo** (tabla o cards) según `useMediaQuery('(max-width: 767px)')` en vez de duplicar el DOM con `md:hidden`/`hidden md:block`. Motivo: en jsdom no hay `matchMedia` → el default es escritorio (tabla) y los 11 tests actuales siguen verdes sin tocarlos; las pruebas móviles stubean `matchMedia`. Tradeoff: un parpadeo mínimo si el viewport cambia (rotación), aceptable. Alternativa descartada: CSS-only (duplica nodos y rompe `getByText`).

### API de `DataTable` (nuevas props, todas opcionales)
- `mobileMode?: 'cards' | 'scroll'` (default `'cards'`).
- `columns[].mobile?: 'title' | 'subtitle' | 'badge' | 'meta' | 'hidden'` (default `'meta'`). Reglas: la primera columna `title` es el encabezado de la card; `badge` se alinea a la derecha del título; `meta` se muestra como par etiqueta/valor (`<dt className="text-xs text-text-tertiary">{label}</dt><dd>{render}</dd>`) en `grid grid-cols-2 gap-x-3 gap-y-2`; `hidden` no se muestra.
- `renderActions(row)` se mantiene; en cards se coloca en un pie `border-t border-subtle pt-2 flex justify-end gap-2` y los botones reciben `min-h-11 min-w-11` desde los consumidores (ver BK-MOB-10/11).
- `onRowClick` en cards: el cuerpo (título + meta) es un `<button type="button" className="w-full text-left">`; el pie de acciones queda **fuera** de ese botón (no anidar botones).
- Orden en cards: barra superior `<label>Ordenar por</label><select>` con las columnas `sortable` + botón asc/desc, que reutiliza `handleSort`/`ordering` existentes (`DataTable.jsx:31-45`); `select` con `text-base`.
- Skeleton en cards: 4 tarjetas `Skeleton h-28 rounded-xl`.
- Clase raíz de cada card: `rounded-xl border border-subtle bg-bg-surface p-4 flex flex-col gap-3` dentro de `<ul className="flex flex-col gap-3">` / `<li>`.

### Prioridades de columnas
- **Socios** (`SocioColumns.jsx`): `nombre`→`title` (el `render` ya incluye Avatar + nombre + "Nº"), `estado`→`badge`, `dni`→`meta`, `telefono`→`meta`, `certificado`→`meta`, `created_at`→`hidden`. Acciones: Ver (recepción); Ver/Editar/Baja (admin) como botones de 44 px.
- **Usuarios**: migrar a `DataTable`: `email`→`title`, `estado` (`StatusBadge`)→`badge`, `nombre`→`meta`, `rol`→`meta`; acción "Reenviar activación" con texto (`variant="ghost"`).
- **Historial de pagos del socio**: migrar a `DataTable` con `Plan`→`title`, `Estado`→`badge`, `Monto`/`Fecha`/`Método`→`meta`. Sin `renderActions` ni orden.

### Paginación y barra de filtros
- `Pagination.jsx:43`: `flex flex-col items-center gap-2 sm:flex-row sm:justify-between`; botones `h-11 min-w-11`; en <sm ocultar los números de página intermedios y dejar Anterior / "Pág. 2 de 9" / Siguiente.
- `FilterPanel`: en <md abrir como sheet (`Modal variant="sheet"`, BK-MOB-06) en vez de dropdown `w-80`; chips `min-h-11`.
- `SearchBar`: `input` `text-base md:text-sm` (BK-MOB-07).

### Estados de UI
Loading: skeleton de cards. Vacío: `EmptyState` existente. Error: sin cambios (toasts `sonner` desde los hooks de query). Éxito: n/a.

### Textos
"Ordenar por", "Ascendente"/"Descendente", "Pág. {n} de {total}".

### Responsive
375 px cards a una columna; 640–767 px cards en `sm:grid sm:grid-cols-2`; ≥768 px tabla (BK-MOB-09 revisa 768–1024: ocultar columnas `hidden lg:table-cell` para Fecha Alta/Teléfono).

## 8. Archivos a crear / modificar
- Crear `frontend/src/hooks/useMediaQuery.js` (+ test), `frontend/src/test/viewport.js` (helper), `frontend/src/components/ui/DataCardList.jsx` (interno).
- Modificar `ui/DataTable.jsx`, `ui/Pagination.jsx`, `ui/FilterPanel.jsx`, `ui/SearchBar.jsx`, `admin/SocioColumns.jsx` (agregar `mobile`), `pages/admin/AdminSociosPage.jsx` y `pages/recepcion/GestionSociosPage.jsx` (botones de acción 44 px), `pages/admin/AdminUsuariosPage.jsx`, `pages/socio/HistorialPagosPage.jsx`.
- Ampliar `DataTable.test.jsx`; crear tests de `Pagination`/`useMediaQuery`.

## 9. Plan de pruebas (TDD)
Convención y comandos: ver BK-MOB-01 §9. Helper nuevo `frontend/src/test/viewport.js`:
```js
export function setViewport(width) {
  window.innerWidth = width
  window.matchMedia = vi.fn().mockImplementation((query) => {
    const max = /max-width:\s*(\d+)px/.exec(query)
    const min = /min-width:\s*(\d+)px/.exec(query)
    const matches = (max ? width <= +max[1] : true) && (min ? width >= +min[1] : true)
    return { matches, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
             addListener: vi.fn(), removeListener: vi.fn(), onchange: null, dispatchEvent: vi.fn() }
  })
}
```
(restaurar en `afterEach`). Primero, en rojo:
1. `useMediaQuery.test.js`: sin `matchMedia` devuelve `defaultValue`; con `setViewport(375)` y query `(max-width: 767px)` → `true`; reacciona al evento `change`.
2. `DataTable.test.jsx` (nuevo `describe('mobile cards')` con `setViewport(375)`): no existe `<table>`; hay una card por fila con `title` y `badge`; las columnas `hidden` no se muestran; `meta` muestra etiqueta y valor; `onRowClick` se dispara al click en el cuerpo; `renderActions` se renderiza una vez por fila y el click en acción **no** dispara `onRowClick`.
3. Orden móvil: cambiar el `select` llama `onSort('nombre')`; botón de dirección alterna `'-nombre'`.
4. `mobileMode="scroll"` mantiene la tabla a 375 px.
5. Con `setViewport(1024)` o sin `matchMedia`: los 11 tests actuales siguen verdes (regresión).
6. `AdminUsuariosPage`: a 375 px la card de un staff muestra email, estado y botón "Reenviar activación"; a 1024 px la tabla.
7. `HistorialPagosPage`: a 375 px muestra cards con monto formateado (`formatMonto`) y estado.
8. `Pagination`: con `totalCount=95`, `pageSize=10` a 375 px existen Anterior/Siguiente y el texto "Pág. 1 de 10".
9. Playwright (`npm run mobile:check`, ampliar): `/admin/socios` a 375: `scrollWidth <= innerWidth` y `table` ausente.
Manual: seed admin → `/admin/socios`; recepcionista → `/recepcion/socios`; socio → `/socio/pagos` (accesible tras BK-MOB-02).

## 10. Criterios de aceptación
- **Dado** 375 px **cuando** abro Socios **entonces** veo tarjetas con nombre, estado, DNI, teléfono y certificado, sin scroll horizontal, y botones de acción de ≥ 44 px.
- **Dado** ≥ 768 px **entonces** la tabla actual se ve igual que hoy.
- **Dado** una lista ordenable **entonces** puedo ordenar desde un selector en móvil.
- **Dado** la paginación a 375 px **entonces** no desborda.
- **Dado** el historial de pagos del socio a 375 px **entonces** cada pago es una card legible.

## 11. Riesgos y decisiones abiertas
1. ¿Una o dos columnas de metadatos en la card? Recomendación: 2 columnas en ≥ 360 px.
2. ¿Mostrar el Certificado Médico como ícono con tooltip? En móvil no hay hover: mantener texto ("Al día"/"Sin certificado").
3. `useMediaQuery` vs CSS puro: ver §7 (recomendación: JS, por la compatibilidad con los tests actuales).
4. Fuera de alcance móvil pero relacionado: acciones por fila sin `aria-label` en algunos consumidores (BK-MOB-11).

## 12. Referencias
Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", columna "05 · Mobile", módulo Socios (No verificado el frame exacto). BK-MOB-06, BK-MOB-07, BK-MOB-09, BK-MOB-10, BK-MOB-11.

## 13. Prompt listo para un agente de IA
> Repo Winnie-The-Gym, `frontend/` (React 18, Tailwind 3, vitest 4 + RTL). Leé `src/components/ui/{DataTable,DataTable.test,Pagination,FilterPanel,SearchBar}.jsx`, `src/components/admin/SocioColumns.jsx`, `src/pages/{admin/AdminSociosPage,admin/AdminUsuariosPage,recepcion/GestionSociosPage,socio/HistorialPagosPage}.jsx` y `setupTests.js`. TDD: primero `src/test/viewport.js` (`setViewport(width)` que stubea `window.matchMedia`), `useMediaQuery.test.js` y los casos "mobile cards" de `DataTable.test.jsx` (sin `<table>` a 375 px, card por fila, columnas `mobile: 'hidden'` ocultas, acciones sin disparar `onRowClick`, orden vía `select`). Luego implementá `hooks/useMediaQuery.js` y el modo `cards` en `DataTable` (`mobileMode`, `col.mobile: 'title'|'subtitle'|'badge'|'meta'|'hidden'`; render de UNA sola variante según `(max-width: 767px)` para no romper los tests existentes), anotá `SocioColumns.jsx`, migrá `AdminUsuariosPage` y `HistorialPagosPage` a `DataTable`, y hacé responsive `Pagination` (`flex-col sm:flex-row`, botones `h-11 min-w-11`). UI en español rioplatense. Terminado: lint, `npx vitest run --coverage` (umbrales 68/68/65/68) y `npm run build` verdes; a 375 px no hay `<table>` ni overflow horizontal en Socios, Usuarios e Historial de pagos.
