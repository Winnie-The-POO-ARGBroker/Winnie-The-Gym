---
id: BK-BUG-09
titulo: FilterPanel se recorta en el borde derecho (desktop) y el Modal no atrapa el foco ni devuelve el foco / repite ids
tipo: bug
roles: [administrador, recepcionista]
prioridad: P2
tamano: S
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-BUG-09 · FilterPanel recortado + accesibilidad de componentes compartidos

## 1. Resumen
El popover de `FilterPanel` se ancla con `left-0` y mide `w-80` (320 px), pero el botón vive en el extremo **derecho** de una fila `justify-between` dentro de un contenedor `overflow-auto`: el panel se extiende hacia la derecha, se recorta o provoca scroll horizontal. Además, `FilterPanel` no cierra con Escape ni expone estado ARIA, y `Modal` anuncia "focus trap" pero solo enfoca el primer elemento (el foco puede escapar con Tab, no se restaura al cerrar y los ids `modal-title`/`modal-desc` son fijos).

**Descartado tras revisar el código:** (a) "el modal de Plan no cerró con Escape": `Modal` registra `keydown` en `window` (`Modal.jsx:29-40`), `PlanFormModal` usa ese `Modal` y `Modal.test.jsx:41-55` ya prueba el cierre con Escape → no hay defecto reproducible por lectura (la falla observada fue de la automatización; si reaparece, abrir con DevTools y verificar que el foco no esté en un iframe); (b) "el botón eliminar socio no abrió diálogo": el icono de papelera en `AdminSociosPage` es "Dar de baja" (`AdminSociosPage.jsx:255-268`) y abre un `Modal` de confirmación (l.282-318). No es un borrado; el único problema real ahí es que el loading usa `baja.isLoading` (ver BK-BUG-10).

## 2. Objetivo de usuario
Como **recepcionista/administrador** quiero **abrir los filtros y ver todo el panel, y navegar los diálogos con teclado** para **filtrar sin que se corte la interfaz y sin perder el foco**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Frontend componente | `frontend/src/components/ui/FilterPanel.jsx:43-44` | Panel: `absolute top-full left-0 mt-2 z-30 w-80 …` |
| Frontend uso | `frontend/src/pages/admin/AdminSociosPage.jsx:193-206` y `frontend/src/pages/recepcion/GestionSociosPage.jsx:172-194` | `FilterPanel` como último hijo de `div.flex … justify-between` (extremo derecho en `sm:`); contenedor padre `div.flex-1 p-6 overflow-auto` |
| Frontend componente | `frontend/src/components/ui/FilterPanel.jsx:22-30,57-67,83-91` | Botones sin `type="button"`, sin `aria-expanded`/`aria-haspopup`, opciones sin `aria-pressed`; sin manejador de Escape; backdrop `fixed inset-0 z-20` |
| Frontend test | `frontend/src/components/ui/__tests__/FilterPanel.test.jsx` | Cubre abrir/cerrar, backdrop, `onChange`, badge/limpiar; no cubre posición ni teclado |
| Frontend componente | `frontend/src/components/ui/Modal.jsx:42-52` | "Focus trap / auto-focus": solo `focusable[0].focus()` al abrir; sin captura de Tab, sin restaurar el foco al elemento que abrió el modal |
| Frontend componente | `frontend/src/components/ui/Modal.jsx:67-68,81,86` | `aria-labelledby="modal-title"` y `aria-describedby="modal-desc"` con ids fijos (duplicados si hay dos modales montados, p. ej. `SocioDetailModal` + otro) |
| Frontend componente | `frontend/src/components/ui/Modal.jsx:63-70` | `Modal` sin `title` ni `icon` (usado así en `SocioDetailModal.jsx:244`) queda sin nombre accesible (`aria-labelledby` undefined, sin `aria-label`) |
| Frontend test | `frontend/src/components/ui/__tests__/Modal.test.jsx` | Cubre Escape, backdrop; no cubre foco/Tab |

## 4. Alcance
**Incluye:** anclar el popover a la derecha en desktop (`right-0`, y `max-w-[calc(100vw-2rem)]`), cierre con Escape, atributos ARIA, `type="button"`; en `Modal`: ids únicos (`useId`), trampa de foco real (Tab/Shift+Tab), restauración de foco, `aria-label` fallback.
**No incluye:** reemplazar por una librería de popover/dialog (Radix/Headless UI), rediseño de filtros, nuevos filtros.

## 5. Contrato de API
Sin cambios.

## 6. Modelo de datos
Sin cambios.

## 7. Diseño frontend
- **`FilterPanel.jsx`:** clase del panel → `absolute top-full right-0 mt-2 z-30 w-80 max-w-[calc(100vw-2rem)]`. Agregar `useEffect` que, con `open`, escuche `keydown` Escape y cierre (mismo patrón que `Modal.jsx:29-40`); `aria-expanded={open}`, `aria-haspopup="true"`, `type="button"` en todos los botones, `aria-pressed` en las opciones.
- **`Modal.jsx`:** `const titleId = useId()` / `descId = useId()`; guardar `document.activeElement` al abrir y restaurarlo en el cleanup; en `onKeyDown` del contenedor, si `Tab` en el último focusable → foco al primero y viceversa; `aria-label={title ? undefined : 'Diálogo'}` cuando no hay título (o permitir prop `ariaLabel`).
- **Estados:** n/a. Convenciones: componentes compartidos en `frontend/src/components/ui/`, tests en `frontend/src/components/ui/__tests__/`.
- **Textos:** sin cambios; `aria-label` "Diálogo".
- **Responsive:** a 375 px el panel debe quedar dentro del viewport (326 px útiles); a 768 px alineado al borde derecho del botón.

## 8. Archivos a crear / modificar
- `frontend/src/components/ui/FilterPanel.jsx`, `frontend/src/components/ui/Modal.jsx`.
- `frontend/src/components/ui/__tests__/FilterPanel.test.jsx`, `Modal.test.jsx`.

## 9. Plan de pruebas (TDD)
Vitest + RTL (`@testing-library/react`, ``fireEvent` (`@testing-library/user-event` no está en `package.json`)); correr `cd frontend && npx vitest run src/components/ui`:
- `FilterPanel`: el panel abierto tiene la clase `right-0` (y no `left-0`); `fireEvent.keyDown(window,{key:'Escape'})` lo cierra; el toggle tiene `aria-expanded` que alterna.
- `Modal`: con dos `Modal` abiertos los ids de título son distintos; Tab desde el último focusable vuelve al primero; al cerrar, el foco vuelve al botón que lo abrió; sin `title` el diálogo tiene nombre accesible.
- Regresión: los tests existentes siguen verdes.
Manual (1440 px y 375 px): `admin@winnie.local` → `/admin/socios` → "Filtros": el panel no se corta; Escape lo cierra; abrir/cerrar un modal con teclado.

## 10. Criterios de aceptación
- **Dado** el listado de socios en desktop **cuando** se abre "Filtros" **entonces** el panel queda completo dentro de la ventana, alineado al botón.
- **Dado** el panel abierto **cuando** se presiona Escape **entonces** se cierra.
- **Dado** un modal abierto **cuando** se navega con Tab **entonces** el foco no sale del diálogo y, al cerrar, vuelve al disparador.

## 11. Riesgos y decisiones abiertas
1. Si el contenedor sigue con `overflow-auto`, un popover absoluto puede igual recortarse verticalmente en pantallas bajas; recomendación: probar con portal (`createPortal`) solo si `right-0` no alcanza.
2. ¿Adoptar una librería accesible (Radix)? Recomendación: no por ahora; el cambio es de ~30 líneas.

## 12. Referencias
`docs/qa/walkthrough-2026-09-22.md`. Figma (opcional): "vistas live", Admin → Socios → Filtros.

## 13. Prompt listo para un agente de IA
> Repo Winnie The Gym (React 18, Tailwind). Dos arreglos en componentes compartidos. (1) `frontend/src/components/ui/FilterPanel.jsx:44`: el panel usa `left-0 w-80` y se recorta cuando el botón está al borde derecho; pasalo a `right-0` con `max-w-[calc(100vw-2rem)]`, agregá cierre con Escape (patrón de `Modal.jsx:29-40`), `aria-expanded/aria-haspopup`, `aria-pressed` y `type="button"`. (2) `frontend/src/components/ui/Modal.jsx`: ids únicos con `useId` (hoy `modal-title`/`modal-desc` fijos), trampa de foco real con Tab/Shift+Tab, restaurar el foco al cerrar y nombre accesible cuando no hay `title`. TDD: primero ampliá `frontend/src/components/ui/__tests__/FilterPanel.test.jsx` y `Modal.test.jsx` (clase `right-0`, Escape, ids distintos con dos modales, foco). No cambies la API de props. Terminado cuando `cd frontend && npx vitest run src/components/ui && npm run lint` pasan. Sin commits.
