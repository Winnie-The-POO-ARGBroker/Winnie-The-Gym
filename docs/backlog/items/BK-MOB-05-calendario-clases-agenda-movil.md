---
id: BK-MOB-05
titulo: Calendario de clases (staff) como agenda por día en móvil y tablet
tipo: mobile
roles: [administrador, recepcionista]
prioridad: P1
tamano: M
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-MOB-04, BK-MOB-03, BK-CLS-07]
---

# BK-MOB-05 · Calendario de clases como agenda por día

## 1. Resumen
El calendario semanal de staff (`ClassCalendarView`) es una grilla fija de **7 columnas** (hora + 6 días) y 15 filas de `min-h-[110px]`, sin scroll horizontal ni variante móvil: a 375 px cada columna mide ~46 px y las tarjetas de clase (texto de 9–11 px) quedan ilegibles; a 768–1023 px, con el Sidebar de 16 rem ocupando 256 px, cada columna mide ~60 px. El socio, en cambio, ya tiene una agenda por día (`socio/ClasesPage`). Falta lo equivalente para staff.

## 2. Objetivo de usuario
Como **recepcionista/admin** quiero **ver y abrir las clases de un día elegido en una lista vertical** para **consultar cupos y la lista de asistentes desde el celular o la tablet**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Grilla | `frontend/src/components/classes/ClassCalendarView.jsx:61,81` | `grid grid-cols-7` en encabezado y en cada fila; sin `overflow-x-auto` ni `min-w-*`. Filas `min-h-[110px]` × 15 horas (`HORAS_GRILLA`, `:6-22`, 08:00–22:00) ≈ 1650 px de alto. |
| Tarjeta de clase | `ClassCalendarView.jsx:101-149` | `rounded-xl p-2.5`; nombre `text-[11px]`, sala·hora `text-[11px]`, badge `LLENO` `text-[9px]`, botón "Lista" `text-[10px] px-2 py-0.5` (≈ 20 px de alto). `onClick` en un `div` (no focuseable). |
| Lógica de día | `ClassCalendarView.jsx:26-56` | `getClassesForSlot(diaKey, horaStr)`: usa `cls.dias_recurrencia` (`'L','M','X','J','V','S','D'`) o `cls.dia` normalizado; compara `parseInt(hora)` con la hora de la fila. |
| Padre | `frontend/src/pages/ClassSchedulePage.jsx:42-77,177,193-201` | Calcula `diasSemana` (Lunes..Sábado con `key,diaNum,label,short,fecha`) y `weekLabel` según `weekOffset`; contenedor `p-6 md:p-10`; `onSelectClass` cambia a la pestaña "lista". |
| Navegación de semana | `ClassSchedulePage.jsx:121-141` | Botones `text-xs px-3 py-1.5` dentro del `TopBar` (ver BK-MOB-03). |
| Ancho útil | `components/layout/Sidebar.jsx:72`, `tailwind.config.js:58-60` | A ≥ 768 px el `aside` mide `w-sidebar = 16rem` (256 px) → a 768 px el área de contenido es 512 px menos `p-10` (80 px) = 432 px para 7 columnas. |
| Lista + detalle | `components/classes/ClassListDetailView.jsx:50-71,148` | `grid grid-cols-1 lg:grid-cols-12`; lista `max-h-[650px]`; panel de detalle `sticky top-4`; filtros en `overflow-x-auto scrollbar-none`. Apilado en < lg; usable, pero el detalle queda debajo de la lista. |
| Referencia móvil | `pages/socio/ClasesPage.jsx:142-170` | Selector horizontal de días (`overflow-x-auto scrollbar-none`, botones `min-w-[50px]`) y lista de `ClassCard`; filtra por `dia` en el backend (`ClasesPage.jsx:59`). |
| Utilidad | `frontend/src/utils/agenda.js:1-26` | `generateDaysAgenda()` (7 días desde hoy; `id` con `toISOString()` → UTC). |
| Datos | `hooks/queries/useClases.js` (`useClasesList()` sin params en `ClassSchedulePage.jsx:33`) | Trae todas las clases; el filtrado por día es client-side. Campos usados por la UI: `id, nombre, categoria, sala, hora, dia, dias_recurrencia, cupos_reservados, cupo_maximo`. |
| Tests | `components/classes/ClassCalendarView.test.jsx` (9 casos) | Renderizan la grilla con `diasSemana` sin `diaNum`/`short`. |

## 4. Alcance
**Incluye:** (a) `ClassAgendaView` para < `lg` (1024 px) con selector de día y lista vertical; (b) extraer la lógica de "clases de un día" a una util compartida; (c) mover navegación de semana al toolbar (BK-MOB-03); (d) targets táctiles y tipografía mínima en las tarjetas; (e) tests.
**No incluye:** edición de clases desde la agenda (existe en la pestaña Lista y Detalle), arrastrar y soltar, vista del socio (ya existe), cambios de backend.

## 5. Contrato de API
Sin cambios de API: se reutiliza `useClasesList()` ya existente (`GET` de clases, sin parámetros). Opcional (propuesta, no requerida): pasar `{ dia }` como hace `ClasesPage.jsx:59` para reducir payload; No verificado el contrato exacto del backend para `dia` con staff.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Util nueva** `frontend/src/utils/classSchedule.js`: `export const DIA_KEY_TO_REC = { Lunes:'L', Martes:'M', 'Miércoles':'X', Jueves:'J', Viernes:'V', 'Sábado':'S', Domingo:'D' }` y `getClassesForDay(classes, diaKey)` (misma lógica de `ClassCalendarView.jsx:29-51` sin el filtro por hora), más `sortByHora`. `ClassCalendarView` pasa a usarla (refactor sin cambio de comportamiento).
- **Componente nuevo** `frontend/src/components/classes/ClassAgendaView.jsx` (props idénticas a `ClassCalendarView`: `classes`, `diasSemana`, `onSelectClass`, `onOpenAttendees`):
  - Estado `selectedDia` (default: hoy si `weekOffset === 0` y hoy está en `diasSemana`; si no, el lunes) → el padre pasa `weekOffset` o `defaultDiaKey`.
  - Selector: `<div role="tablist" className="flex gap-2 overflow-x-auto scrollbar-none pb-2">` con un `button role="tab" aria-selected` por día (`min-h-14 min-w-14`, `short` arriba y `diaNum` abajo; puntito si el día tiene clases). Reutilizar el patrón de `socio/ClasesPage.jsx:142-170` o extraer `DaySelector` compartido.
  - Lista: `<ul className="flex flex-col gap-3">`, tarjetas por clase ordenadas por `hora`: izquierda hora (`text-base font-bold`), centro nombre (con color `DISCIPLINAS_CONFIG[cls.categoria]`, `borderLeftWidth: 4px` igual que hoy), sala, `cupos_reservados/cupo_maximo` y badge `LLENO`; derecha botón "Lista" (`min-h-11 px-4 text-sm`). La tarjeta completa es un `button` que llama `onSelectClass(cls)`; el botón "Lista" va **fuera** del botón principal (no anidar).
  - Texto mínimo `text-sm` (14 px) para nombre y datos, `text-xs` para secundarios.
- **Selección en `ClassSchedulePage.jsx:193`:**
  ```jsx
  const isCompact = useMediaQuery('(max-width: 1023px)')   // hook de BK-MOB-04
  ...
  isCompact
    ? <ClassAgendaView classes={classes} diasSemana={diasSemana} onSelectClass={...} onOpenAttendees={handleOpenAttendees} />
    : <ClassCalendarView ... />
  ```
- **Paddings:** `ClassSchedulePage.jsx:177` `p-6 md:p-10` → `p-4 md:p-6 lg:p-10`.
- **Navegación de semana:** se mueve a `toolbar` del `TopBar` (BK-MOB-03). En la agenda, además, flechas ‹ › junto al selector de día (opcional).
- **Estados de UI:** cargando (`EmptyState` existente, `ClassSchedulePage.jsx:181-185`), sin clases en el día ("No hay clases este día" + sugerencia de ver otro día), error: sin cambios.
- **Textos:** "No hay clases este {día}", "Ver lista" → "Lista" (botón), "LLENO".
- **Responsive:** < 1024 px agenda; ≥ 1024 px grilla actual. Landscape en teléfono (~667–812 px) usa agenda.

## 8. Archivos a crear / modificar
- Crear `utils/classSchedule.js`, `components/classes/ClassAgendaView.jsx` (+ `.test.jsx`), opcional `components/ui/DaySelector.jsx`.
- Modificar `components/classes/ClassCalendarView.jsx` (usar la util; hacer la tarjeta un `button`), `pages/ClassSchedulePage.jsx`.
- Tests: `utils/classSchedule.test.js`; ampliar `ClassSchedulePage` tests (`pages/__tests__/ClassSchedulePage.test.jsx`, `pages/ClassSchedulePage.handlers.test.jsx`).

## 9. Plan de pruebas (TDD)
Convención y comandos: ver BK-MOB-01 §9; helper de viewport `setViewport(width)` y `useMediaQuery` de BK-MOB-04 (`frontend/src/test/viewport.js`).
1. `classSchedule.test.js`: `getClassesForDay` devuelve clases por `dias_recurrencia` y por `dia` con acentos ("Miércoles"/"miercoles"); ignora el resto; `sortByHora` ordena.
2. `ClassAgendaView.test.jsx`: con 2 clases el lunes y 1 el martes, por defecto muestra el día seleccionado; click en la pestaña "Mar" cambia la lista; `role="tab"` con `aria-selected`; botón "Lista" llama `onOpenAttendees` y **no** `onSelectClass`; clase llena muestra "LLENO"; día vacío muestra el mensaje.
3. `ClassSchedulePage`: con `setViewport(375)` renderiza agenda (no existe `grid-cols-7`), con `setViewport(1280)` o sin `matchMedia` renderiza `ClassCalendarView` (los tests actuales no cambian).
4. `ClassCalendarView.test.jsx` sigue verde tras el refactor a la util.
5. Playwright (ampliar `scripts/mobile-walkthrough.mjs`): `/admin/clases` a 375 y 768: sin overflow horizontal y las tarjetas con texto ≥ 14 px (`getComputedStyle`).
Manual: seed admin; a 375 px elegir distintos días, abrir "Lista" y tocar una clase (pasa a Lista y Detalle).

## 10. Criterios de aceptación
- **Dado** 375 px **cuando** abro Calendario **entonces** veo un selector de días y la lista de clases del día seleccionado, sin columnas comprimidas.
- **Dado** 768–1023 px **entonces** también se usa la agenda (la grilla de 7 columnas no entra).
- **Dado** ≥ 1024 px **entonces** se muestra la grilla semanal como hoy.
- **Dado** una clase llena **entonces** muestra "LLENO" y el botón "Lista" mide ≥ 44 px de alto.

## 11. Riesgos y decisiones abiertas
1. Umbral de la agenda: `< lg` (1024) en vez de `< md`. Recomendación: `< lg` por el ancho real con Sidebar.
2. Cubierto por BK-CLS-07 (calendario admin: grilla 08:00–22:00 fija, sin domingo, semanas decorativas y "variante mobile (< md)"): esta ficha y BK-CLS-07 deben implementarse de forma coordinada; si BK-CLS-07 se hace primero, esta ficha se limita al umbral `lg`, targets táctiles y reutilización de `useMediaQuery`. Hoy la grilla no muestra clases fuera de 08:00–22:00 ni del domingo (`HORAS_GRILLA`, `diasSemana` sin domingo). La agenda debería listar cualquier hora; decidir si agrega domingo.
3. `generateDaysAgenda()` y `ClasesPage.jsx:50` usan `toISOString()` (UTC): pasadas las 21:00 hora de Argentina el "hoy" por defecto es el día siguiente (documentado en BK-CLS-08). No se corrige aquí.

## 12. Referencias
Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", columna "05 · Mobile", módulo Clases (No verificado el frame exacto). BK-MOB-03, BK-MOB-04, BK-MOB-09, BK-CLS-07, BK-CLS-08.

## 13. Prompt listo para un agente de IA
> Repo Winnie-The-Gym, `frontend/` (React 18, Tailwind 3, vitest/RTL). Problema: `components/classes/ClassCalendarView.jsx` usa `grid grid-cols-7` fijo y es ilegible en móvil/tablet. Leé ese archivo y su test, `pages/ClassSchedulePage.jsx`, `pages/socio/ClasesPage.jsx` (selector de días), `constants/disciplinas.js` y `utils/agenda.js`. TDD primero: `utils/classSchedule.test.js`, `ClassAgendaView.test.jsx` y los casos de `ClassSchedulePage` con `setViewport(375)`/`setViewport(1280)` (helpers de BK-MOB-04: `useMediaQuery` y `src/test/viewport.js`). Luego creá `utils/classSchedule.js` (`getClassesForDay`, `sortByHora`; refactor de `ClassCalendarView` sin cambiar comportamiento), `ClassAgendaView.jsx` (tablist de días `overflow-x-auto scrollbar-none`, lista de tarjetas con hora, nombre, sala, cupos, badge LLENO, botón "Lista" de ≥44 px fuera del botón principal) y usalo en `ClassSchedulePage` cuando `useMediaQuery('(max-width: 1023px)')`. UI en español rioplatense. Terminado: lint, `npx vitest run --coverage` y `npm run build` verdes; a 375 y 768 px `/admin/clases` no tiene overflow horizontal.
