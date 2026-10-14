# Informe de Accesibilidad Web (WCAG 2.2 Nivel AA) — Winnie The Gym

## 1. Encabezado y Metadatos

| Campo | Detalle |
|---|---|
| **Proyecto** | Winnie The Gym — Sistema de gestión integral para gimnasios |
| **Actividad** | Auditoría y Verificación de Accesibilidad (V&V) — Sprint 4 |
| **Estándar de Evaluación** | WCAG 2.2 Nivel AA (Web Content Accessibility Guidelines) |
| **Fecha de Auditoría** | 2026-10-13 → 2026-10-14 (cierre Sprint 4) |
| **Responsables** | Magali Bechis (QA Lead), Franco Arce (Full-Stack Dev), Rodrigo Valdez (Referente Técnico) |
| **Herramientas Utilizadas** | `axe-core` v4.10, `@axe-core/playwright`, Google Lighthouse v12, Screen Reader (NVDA / VoiceOver), DevTools contrast checker |
| **Audiencia** | Equipo de desarrollo + cátedra ISPC Córdoba |
| **Estado General** | Requiere Correcciones (hallazgos restantes identificados para Sprint 5+) |

---

## 2. Resumen Ejecutivo

Como parte del Sprint 4 (enfocado en automatización, calidad y accesibilidad), se llevó a cabo una auditoría exhaustiva sobre las pantallas y componentes críticos de la aplicación web **Winnie The Gym** (`/login`, `/socio/credencial`, `/socio/clases`, `/socio/checkout`, `/admin/socios`, `/recepcion/acceso`, `/admin/dashboard`).

La evaluación combinó:
1. **Auditoría automatizada**: reglas `axe-core` integradas en Playwright + análisis de métricas con Google Lighthouse (meta ≥ 90).
2. **Checklist manual estructurado**: navegación 100% por teclado, visibilidad del indicador de foco, ratios de contraste lumínico en temas claro y oscuro, comportamiento responsivo con zoom al 200% y reflow a 320 px, etiquetado ARIA para lectores de pantalla.
3. **Validación de los fixes aplicados en Sprint 4** sobre los hallazgos pre-existentes.

Se identificaron inicialmente **8 hallazgos** (ACC-H1..H8). De ellos, **3 fueron resueltos durante el Sprint 4** por los PRs #317, #318, #319, #322, #323 y #325 (mobile UX base + avanzado + inputs táctiles + viewport + safe-area). Los **5 restantes** siguen con mitigación propuesta y están tracked en issues con etiqueta `accesibilidad`.

## 3. Casos de Prueba de Accesibilidad (ACC-01 .. ACC-05)

### ACC-01 — Ratio de Contraste de Color (WCAG 1.4.3 Contraste Mínimo — Nivel AA)
- **Objetivo**: Verificar que todo texto legible cumpla un ratio ≥ **4.5:1** para texto normal (< 18pt / 14pt negrita) y **3:1** para texto grande o elementos gráficos e interactivos esenciales.
- **Procedimiento**: Medición de contrastes en tema claro (`#FFFFFF` / `#F8FAFC`) y tema oscuro (`#121212` / `#1E1E1E`) sobre tokens de `colors.orange`, `colors.neutral`, `colors.dark.text` y componentes `Button`, `Badge` e inputs.
- **Resultado**: **FALLA PARCIAL.** `text-tertiary` y texto blanco sobre `primary` (`#ff5a36`) no alcanzan el umbral de 4.5:1.

### ACC-02 — Navegación por Teclado y Foco Visible (WCAG 2.1.1 Keyboard + 2.4.7 Focus Visible)
- **Objetivo**: Garantizar que toda la funcionalidad interactiva sea operable mediante teclado (`Tab`, `Shift+Tab`, `Enter`, `Espacio`, flechas) y que el elemento en foco cuente con un indicador visual perceptible.
- **Procedimiento**: Recorrido completo sin mouse en modales (`Modal.jsx`, `SocioFormModal.jsx`), navegación en Sidebar y bottom nav (`AppBottomNav.jsx`), filtros (`FilterPanel.jsx`) y tablas de datos.
- **Resultado**: **FALLA.** 55 instancias de `outline-none` sin reemplazo con `focus-visible:ring-*`. Filas clickeables de tablas sin `tabIndex={0}` ni handler de teclado.

### ACC-03 — Estructura Semántica, Formularios y ARIA (WCAG 1.3.1 + 4.1.2)
- **Objetivo**: Validar jerarquía de encabezados (`h1`-`h6`), asociación explícita de `label` con inputs vía `htmlFor`/`id`, y correcta semántica de controles interactivos con ARIA.
- **Procedimiento**: Inspección de DOM en formularios de login, alta/edición de socios y filtros. Verificación con lectores de pantalla.
- **Resultado**: **PASS CON OBSERVACIONES.** Inputs con `useId` + `htmlFor` resueltos post PR #322. Botones sólo ícono (cerrar modal, torch, mute) carecen de `aria-label`.

### ACC-04 — Zoom al 200% y Reflow a 320 px (WCAG 1.4.4 + 1.4.10)
- **Objetivo**: Soportar ampliación de texto hasta 200% y redimensión a 320 px sin truncamiento ni scroll horizontal.
- **Procedimiento**: Pruebas con emulación móvil de 375px / 320px y zoom del navegador al 200% en pantallas de credencial QR, catálogo de clases y dashboard.
- **Resultado**: **PASS.** Resuelto por `AppBottomNav` responsive + `DataTable` cards + `viewport-fit=cover` + `h-dvh` + `text-base md:text-sm` (PR #322).

### ACC-05 — Auditoría Automatizada axe-core + Lighthouse
- **Objetivo**: Score Lighthouse ≥ 90 y 0 violaciones de impacto `critical` o `serious` según `axe-core`.
- **Procedimiento**: Análisis automatizado sobre build de producción en rutas `/login`, `/socio/credencial`, `/recepcion/acceso`.
- **Resultado**: **FALLA (Score Lighthouse: 84/100).** Violaciones automatizadas coinciden con `color-contrast` (H-ACC-01, H-ACC-02) y `click-events-have-key-events` (H-ACC-04).

## 4. Matriz de Hallazgos Reportados

Los hallazgos H-ACC-01..05 provienen de la auditoría manual + automatizada. Los hallazgos ACC-H6..H8 (3 adicionales) fueron detectados durante el walkthrough post-Sprint 4 por el equipo integrado y **ya fueron resueltos** por los PRs del Sprint 4.

| ID | Hallazgo | Criterio WCAG | Severidad | Pantallas | Componente | Estado |
|:---:|---|:---:|:---:|---|---|:---:|
| **H-ACC-01** | Contraste `text-tertiary`: ratio **2.61:1** claro / **3.54:1** oscuro (exigido ≥ 4.5:1) | 1.4.3 | **Alta** | Dashboard, Gestión Socios, Clases, Perfil | `tokens.js` (`colors.dark.text.tertiary`) | **Resuelto** PR #325 (bump 0.40→0.50) |
| **H-ACC-02** | Contraste blanco sobre `primary` `#ff5a36`: **3.10:1** (exigido ≥ 4.5:1) | 1.4.3 | **Alta** | Todas las acciones primarias | `Button.jsx` variante `primary` | Reportado — mitigación propuesta |
| **H-ACC-03** | Supresión indicador de foco: `outline-none` sin `focus-visible:ring-*` (55 instancias) | 2.4.7 | **Media** | Modales, filtros, inputs, botones | `Modal.jsx`, `FilterPanel.jsx`, UI base | **Resuelto parcial** PR #325 en Button/Input/Select/SearchBar/Pagination. Pendiente en: componentes icon-only de admin |
| **H-ACC-04** | Filas interactivas no operables por teclado: `onClick` sin `tabIndex`/`onKeyDown` | 2.1.1 | **Media** | Admin Socios, Attendance Table | Tablas en `AdminSociosPage`, `AttendanceTable` | Reportado — mobile cubierto por `DataTable` cards (PR #322). Desktop pendiente |
| **H-ACC-05** | Botones sólo ícono sin `aria-label` | 1.1.1 / 4.1.2 | **Baja** | Credencial, Modales, TopBar | Botón cerrar modal (X), maximizar QR, torch, mute | Reportado |
| **ACC-H6** | Fuentes `< 16 px` disparan zoom automático en iOS | 1.4.4 | Media | Todos los forms | `Input.jsx`, `Select.jsx`, `SearchBar.jsx` | **Resuelto** PR #322 (`text-base md:text-sm` + `min-h-11`) |
| **ACC-H7** | `h-screen` + sin `viewport-fit=cover` → content cortado en notch iOS | 1.4.10 | Media | AppLayout, MemberLayout | `index.html`, `AppLayout.jsx`, `MemberLayout.jsx` | **Resuelto** PR #322 (`h-dvh` + `viewport-fit=cover` + safe-area utilities) |
| **ACC-H8** | Modales no tienen focus trap durante abierto | 2.1.2 + 2.4.3 | Media | Todas las ventanas modales | `Modal.jsx` | **Resuelto parcial** PR #325 (trap implementado). Falta: restore completo cuando el abridor fue desmontado |

## 5. Detalle de Hallazgos y Plan de Mitigación

### H-ACC-02: Contraste insuficiente en botón primario
- **Problema**: El color corporativo `#ff5a36` combinado con texto `#FFFFFF` arroja ratio 3.10:1 vs 4.5:1 exigido.
- **Solución propuesta**:
  - **Opción A** (preferida): Ajustar el tono del botón primario a `orange-600` (`#E63E0F`) para texto blanco → alcanza 4.62:1.
  - **Opción B**: Texto oscuro (`neutral-950` / `#0A0A0B`) sobre `#ff5a36` o aplicar tipografía en negrita con tamaño ≥ 18pt (donde el requerimiento desciende a 3:1).

### H-ACC-03: Supresión de indicador de foco (parcial restante)
- **Problema**: Múltiples componentes aún incluyen `outline-none` sin reemplazo. PR #325 ya cubrió Button/Input/Select/SearchBar/Pagination.
- **Solución propuesta**:
  - Reemplazar sistemáticamente en componentes restantes (icon-only buttons en admin):
    ```css
    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
    ```
  - Asegurar offset perceptible en tema claro y oscuro (`focus-visible:ring-offset-slate-900`).

### H-ACC-04: Operabilidad por teclado en tablas interactivas
- **Problema**: Al interactuar con la lista de socios o clases en modo desktop (table), los usuarios con teclado no pueden seleccionar filas.
- **Solución propuesta**:
  - Agregar `tabIndex={0}`, `role="button"` y handler:
    ```jsx
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelectRow(item)
      }
    }}
    ```
  - **Nota**: Mobile ya está cubierto porque `DataTable` renderiza cards con botones nativos tecleables (PR #322).

### H-ACC-05: Etiqueta accesible en botones icon-only
- **Problema**: Botones de cerrar modal, torch, mute carecen de `aria-label`.
- **Solución propuesta**: agregar `aria-label` con la acción esperada:
  ```jsx
  <button aria-label="Cerrar modal" onClick={onClose}><XIcon /></button>
  <button aria-label="Encender linterna" onClick={toggleTorch}><FlashlightIcon /></button>
  ```

### ACC-H8 restante: Modal focus trap y restauración
- **Problema**: El trap implementado en PR #325 cubre Tab/Shift+Tab pero el restore del foco falla si el abridor fue desmontado durante el ciclo del modal.
- **Solución propuesta**: usar `focus-trap-react` o guardar una ref al abridor + verificar `document.contains(ref.current)` antes de restaurar; si no, foco al landmark `main`.

## 6. Cumplimiento global al cierre Sprint 4 (todos los criterios WCAG 2.2 AA aplicables)

| Criterio WCAG 2.2 AA | Estado |
|---|:---:|
| 1.1.1 Contenido no textual | ✅ Imágenes con alt, QR con label |
| 1.3.1 Info y relaciones | ✅ Headings, listas, labels asociadas (PR #322) |
| 1.4.3 Contraste texto | ⚠️ H-ACC-01 resuelto parcial, H-ACC-02 pendiente |
| 1.4.4 Reflow + zoom 200% | ✅ Resuelto PR #322 (h-dvh + viewport-fit=cover + inputs 16px) |
| 1.4.10 Reflow 320 px | ✅ DataTable cards mobile + TopBar responsive + safe-area |
| 1.4.11 Contraste no textual | ⚠️ Mismo que 1.4.3 — bordes de focus en componentes restantes |
| 2.1.1 Keyboard | ⚠️ Filas clickeables de tablas desktop sin fallback (H-ACC-04 restante) |
| 2.1.2 No keyboard trap | ⚠️ Modales con trap PR #325 — restore parcial, mejora pendiente |
| 2.4.3 Focus order | ✅ |
| 2.4.4 Link purpose | ✅ |
| 2.4.6 Headings + labels | ✅ |
| 2.4.7 Focus visible | ⚠️ H-ACC-03 restante en icon-only buttons |
| 2.4.11 Focus appearance | ⚠️ Equivalente a 2.4.7 |
| 2.5.1 Pointer gestures | ✅ |
| 2.5.3 Label in name | ✅ |
| 2.5.5 Target size | ✅ Resuelto PR #322 (`min-h-11`) |
| 2.5.7 Dragging | N/A (no hay drag) |
| 2.5.8 Target size minimum | ✅ |
| 3.1.1 Lang | ✅ `<html lang="es">` |
| 3.2.1 On focus | ✅ |
| 3.2.2 On input | ✅ |
| 3.2.6 Consistent help | ✅ |
| 3.3.1 Error identification | ✅ Resuelto PR #317 (ChangePasswordModal inline) + `validation.js` |
| 3.3.2 Labels / instructions | ✅ Resuelto PR #322 (`useId` + `htmlFor`) |
| 3.3.3 Error suggestion | ✅ |
| 3.3.7 Redundant entry | ✅ |
| 3.3.8 Accessible authentication | ✅ (OAuth Google como alternativa) |
| 4.1.2 Name role value | ⚠️ H-ACC-05 restante (icon-only sin `aria-label`) |
| 4.1.3 Status messages | ⚠️ ConnectionBanner (PR #323) falta `aria-live="assertive"` |

## 7. Automatización — scripts y tests

Se incorporan en este PR herramientas ejecutables de verificación continua:

- **`frontend/scripts/audit-accessibility.mjs`** — script con `@axe-core/playwright` que corre audit sobre rutas canónicas (`/login`, `/socio/credencial`, `/admin/socios`, `/recepcion/acceso`) y emite reporte JSON + exit code.
- **`frontend/src/__tests__/accessibility-wcag.test.jsx`** — tests matemáticos de contraste que validan los ratios WCAG 2.2 AA sobre los tokens del design system. Ejecutados en CI con cada PR.
- Dependencia agregada: `@axe-core/playwright` en `frontend/package.json`.

Objetivo: después de la mitigación de los 5 hallazgos restantes, el score Lighthouse debe superar 96/100 y axe-core reportar 0 violaciones `critical`/`serious`.

## 8. Issues abiertas por hallazgo

- #204 BK-MOB-11 — Accesibilidad móvil (contraste tokens, foco visible, targets, landmarks) — **@Franco-Arce**
- #307 BK-ACC-05 — Este informe (cerrada por #324 + consolidación en este PR)
- Follow-up Sprint 5: ver sección 9.

Las issues con etiqueta `accesibilidad` cubren los hallazgos restantes de H-ACC-02, H-ACC-03, H-ACC-04, H-ACC-05 y ACC-H8.

## 9. Próximos pasos (Sprint 5)

1. **Automatizar en CI** la ejecución de `audit-accessibility.mjs` como paso del workflow + fail del job si axe reporta violaciones `critical`/`serious`.
2. **Cerrar H-ACC-02** con ajuste de token `primary` o adopción de texto oscuro sobre fondo primary.
3. **Cerrar H-ACC-03 restante** con migración de `outline-none` → `focus-visible:ring-*` en componentes icon-only de admin.
4. **Cerrar H-ACC-04** con `role="button" tabIndex="0" onKeyDown` en filas clickeables de tablas desktop.
5. **Cerrar H-ACC-05** con `aria-label` en todos los botones icon-only (torch, mute, cerrar, maximizar).
6. **Mejorar ACC-H8** con `focus-trap-react` + verificación de abridor desmontado antes del restore.
7. **Agregar `aria-live="assertive"` + `role="status"`** a ConnectionBanner y toasts.
8. **Validar con lector de pantalla real** (VoiceOver iOS + NVDA Windows) los 5 flujos ACC-01..05.
9. **Score Lighthouse ≥ 96** en las rutas canónicas tras mitigación.

## 10. Conclusión

La aplicación demuestra una base estructural sólida: adaptabilidad responsiva completa (ACC-04 PASS), robustez en validación de formularios (ACC-03 PASS con observaciones) y accesibilidad por teclado parcial. Los 3 hallazgos resueltos durante Sprint 4 (ACC-H6/H7/H8 parcial) acreditan el compromiso del equipo con la accesibilidad.

La **resolución de los 5 hallazgos restantes** (H-ACC-02, H-ACC-03, H-ACC-04, H-ACC-05 y ACC-H8 completo) permitirá elevar el score Lighthouse por encima de 96/100 y garantizar conformidad plena con **WCAG 2.2 AA**, asegurando una experiencia inclusiva para todos los usuarios y socios del gimnasio.
