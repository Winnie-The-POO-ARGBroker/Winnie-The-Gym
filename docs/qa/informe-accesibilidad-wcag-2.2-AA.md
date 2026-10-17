# Informe de Accesibilidad Web (WCAG 2.2 Nivel AA) — Winnie The Gym

## 1. Encabezado y Metadatos

| Campo | Detalle |
|---|---|
| **Proyecto** | Winnie The Gym — Sistema de gestión integral para gimnasios |
| **Actividad** | Auditoría y Verificación de Accesibilidad (V&V) — Sprint 4 |
| **Estándar de Evaluación** | WCAG 2.2 Nivel AA (Web Content Accessibility Guidelines) |
| **Fecha de Auditoría** | 2026-10-13 → 2026-10-16 (cierre Sprint 4). Re-auditoría posterior a los fixes del PR #355: 2026-10-16 |
| **Responsables** | Magali Bechis (QA Lead), Franco Arce (Full-Stack Dev), Rodrigo Valdez (Referente Técnico) |
| **Herramientas Utilizadas** | `axe-core` v4.10, `@axe-core/playwright`, Google Lighthouse v12, Screen Reader (NVDA / VoiceOver), DevTools contrast checker |
| **Audiencia** | Equipo de desarrollo + cátedra ISPC Córdoba |
| **Estado General** | Mejorado: 0 violaciones críticas y Lighthouse 100/100 en las pantallas públicas. Queda 1 hallazgo de contraste (ver sección 4.1) |

---

## 2. Resumen Ejecutivo

Como parte del Sprint 4 (enfocado en automatización, calidad y accesibilidad), se llevó a cabo una auditoría exhaustiva sobre las pantallas y componentes críticos de la aplicación web **Winnie The Gym** (`/login`, `/socio/credencial`, `/socio/clases`, `/socio/checkout`, `/admin/socios`, `/recepcion/acceso`, `/admin/dashboard`).

La evaluación combinó:
1. **Auditoría automatizada**: reglas `axe-core` integradas en Playwright + análisis de métricas con Google Lighthouse (meta ≥ 90).
2. **Checklist manual estructurado**: navegación 100% por teclado, visibilidad del indicador de foco, ratios de contraste lumínico en temas claro y oscuro, comportamiento responsivo con zoom al 200% y reflow a 320 px, etiquetado ARIA para lectores de pantalla.
3. **Validación de los fixes aplicados en Sprint 4** sobre los hallazgos pre-existentes.

Se identificaron inicialmente **8 hallazgos** (ACC-H1..H8). Tres se resolvieron durante el Sprint 4 por los PRs #317, #318, #319, #322, #323 y #325 (mobile UX base y avanzado, inputs táctiles, viewport y safe-area). La auditoría automatizada con axe-core sobre 14 pantallas de los 4 roles encontró además 9 problemas concretos, que se cargaron como Issues con etiqueta `accesibilidad` (#345 a #353) y se corrigieron con el PR #355.

**Resultado de la re-auditoría (axe-core, 14 pantallas, mismas rutas y mismos usuarios del seed):**

| Métrica | Antes de #355 | Después de #355 |
|---|:---:|:---:|
| Violaciones totales | 18 | **11** |
| Críticas | 4 | **0** |
| Serias | 14 | **11** |
| Pantallas públicas (login, registro, recuperar contraseña) con violaciones | sí | **0** |
| Lighthouse Accesibilidad, `/login` | 95 | **100** |
| Lighthouse Accesibilidad, `/registro` | 95 | **100** |

Las 11 violaciones que quedan son del mismo tipo: `color-contrast` (serio), una por cada pantalla autenticada (31 nodos), en un texto del layout compartido. Se documenta en 4.1 y queda para el Sprint 5.

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
- **Procedimiento**: axe-core (`@axe-core/playwright`, etiquetas WCAG 2.0/2.1/2.2 A y AA) sobre 14 pantallas con sesión por rol (público, administrador, recepcionista y socio) mediante `frontend/scripts/audit-accessibility.mjs`, más Lighthouse 12 sobre `/login` y `/registro`.
- **Resultado**: **MEJORADO, SIN CUMPLIR AÚN LA META.** Lighthouse: 95 → **100** en `/login` y `/registro` (meta ≥ 90, cumplida). axe-core: 18 → **11** violaciones, **0 críticas** (cumplida) y 11 serias de `color-contrast` (meta de 0 críticas/serias, no cumplida). Evidencia en `docs/qa/evidence/accesibilidad/` (`axe-report-antes.json`, `axe-report.json` y los reportes de Lighthouse antes/después).

## 4. Matriz de Hallazgos Reportados

Los hallazgos de la matriz fueron corregidos por el PR #355 (se anota en cada fila). Los hallazgos H-ACC-01..05 provienen de la auditoría manual + automatizada. Los hallazgos ACC-H6..H8 (3 adicionales) fueron detectados durante el walkthrough post-Sprint 4 por el equipo integrado y **ya fueron resueltos** por los PRs del Sprint 4.

| ID | Hallazgo | Criterio WCAG | Severidad | Pantallas | Componente | Estado |
|:---:|---|:---:|:---:|---|---|:---:|
| **H-ACC-01** | Contraste `text-tertiary`: ratio **2.61:1** claro / **3.54:1** oscuro (exigido ≥ 4.5:1) | 1.4.3 | **Alta** | Dashboard, Gestión Socios, Clases, Perfil | `tokens.js` (`colors.dark.text.tertiary`) | **Resuelto** PR #325 (bump 0.40→0.50) |
| **H-ACC-02** | Contraste blanco sobre `primary` `#ff5a36`: **3.10:1** (exigido ≥ 4.5:1) | 1.4.3 | **Alta** | Todas las acciones primarias | `Button.jsx` variante `primary` | **Resuelto** PR #355 (issue #346): botón con `orange-700`, ratio 6,12:1. La opción A sugerida (`orange-600`) daba 4,15:1 y no alcanzaba AA |
| **H-ACC-03** | Supresión indicador de foco: `outline-none` sin `focus-visible:ring-*` (55 instancias) | 2.4.7 | **Media** | Modales, filtros, inputs, botones | `Modal.jsx`, `FilterPanel.jsx`, UI base | **Resuelto** PR #325 (base) y PR #355 (issue #347) en los componentes restantes |
| **H-ACC-04** | Filas interactivas no operables por teclado: `onClick` sin `tabIndex`/`onKeyDown` | 2.1.1 | **Media** | Admin Socios, Attendance Table | Tablas en `AdminSociosPage`, `AttendanceTable` | **Resuelto** PR #355 (issue #348): filas operables con Enter y Espacio, y cards móviles corregidas |
| **H-ACC-05** | Botones sólo ícono sin `aria-label` | 1.1.1 / 4.1.2 | **Baja** | Credencial, Modales, TopBar | Botón cerrar modal (X), maximizar QR, torch, mute | **Resuelto** PR #355 (issue #349) |
| **ACC-H6** | Fuentes `< 16 px` disparan zoom automático en iOS | 1.4.4 | Media | Todos los forms | `Input.jsx`, `Select.jsx`, `SearchBar.jsx` | **Resuelto** PR #322 (`text-base md:text-sm` + `min-h-11`) |
| **ACC-H7** | `h-screen` + sin `viewport-fit=cover` → content cortado en notch iOS | 1.4.10 | Media | AppLayout, MemberLayout | `index.html`, `AppLayout.jsx`, `MemberLayout.jsx` | **Resuelto** PR #322 (`h-dvh` + `viewport-fit=cover` + safe-area utilities) |
| **ACC-H8** | Modales no tienen focus trap durante abierto | 2.1.2 + 2.4.3 | Media | Todas las ventanas modales | `Modal.jsx` | **Resuelto** PR #325 (trap) y PR #355 (issue #350): el modal restaura el foco aunque el abridor se haya desmontado |

### 4.1 Hallazgos de la auditoría automatizada sobre las 14 pantallas (Issues #345 a #353)

| Issue | Hallazgo | Estado |
|:---:|---|:---:|
| #345 | Las etiquetas del formulario de registro no están asociadas a sus campos | Cerrada, PR #355 |
| #346 | Texto blanco sobre botón primario con contraste 3,10:1 (H-ACC-02) | Cerrada, PR #355 |
| #347 | Componentes con `outline-none` sin indicador de foco (H-ACC-03) | Cerrada, PR #355 |
| #348 | Filas de tabla no operables con teclado (H-ACC-04) | Cerrada, PR #355 |
| #349 | Botones solo ícono sin `aria-label` (H-ACC-05) | Cerrada, PR #355 |
| #350 | El modal no restaura el foco si el elemento que lo abrió se desmontó (ACC-H8) | Cerrada, PR #355 |
| #351 | Filtros de Pagos sin nombre accesible | Cerrada, PR #355 |
| #352 | Mi Perfil: campos sin etiqueta asociada | Cerrada, PR #355 |
| #353 | `aria-sort` en elementos que no lo admiten (Gestión de socios) | Cerrada, PR #355 |
| *(por abrir)* | `color-contrast` (serio) en el layout compartido de las 11 pantallas autenticadas: un texto `.hidden lg:inline` dentro de un contenedor `.shadow-md`. El mismo ratio de `text-primary` sobre fondo claro (3,10:1) quedó fuera del alcance de #346, que solo cubre el fondo del botón | Pendiente, Sprint 5 |

## 5. Detalle de Hallazgos y Plan de Mitigación

> Estado al 16/10/2026: las mitigaciones de esta sección se aplicaron con el PR #355 (ver 4.1). Se conserva el detalle como registro de la decisión tomada.

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
| 1.4.3 Contraste texto | ⚠️ H-ACC-01 y H-ACC-02 resueltos; queda 1 `color-contrast` en el layout compartido (4.1) |
| 1.4.4 Reflow + zoom 200% | ✅ Resuelto PR #322 (h-dvh + viewport-fit=cover + inputs 16px) |
| 1.4.10 Reflow 320 px | ✅ DataTable cards mobile + TopBar responsive + safe-area |
| 1.4.11 Contraste no textual | ✅ Rings de foco visibles tras #347 (`primary` ahora genera `ring-primary-500`) |
| 2.1.1 Keyboard | ✅ Resuelto PR #355 (#348) |
| 2.1.2 No keyboard trap | ✅ Resuelto PR #325 y PR #355 (#350) |
| 2.4.3 Focus order | ✅ |
| 2.4.4 Link purpose | ✅ |
| 2.4.6 Headings + labels | ✅ |
| 2.4.7 Focus visible | ✅ Resuelto PR #355 (#347) |
| 2.4.11 Focus appearance | ✅ Equivalente a 2.4.7 |
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
| 4.1.2 Name role value | ✅ Resuelto PR #355 (#349) |
| 4.1.3 Status messages | ⚠️ ConnectionBanner (PR #323) falta `aria-live="assertive"` |

## 7. Automatización — scripts y tests

- **`frontend/scripts/audit-accessibility.mjs`** — axe-core con `@axe-core/playwright`. Inicia sesión por rol (público, administrador, recepcionista, socio), audita 14 rutas y escribe `docs/qa/evidence/accesibilidad/axe-report.json`. Sale con código 1 si hay violaciones `critical` o `serious`, para poder usarlo como gate de CI. Uso: `DEMO_USER_PASSWORD=<clave del seed> node frontend/scripts/audit-accessibility.mjs`.
- **Lighthouse 12** sobre `/login` y `/registro` (reportes HTML y JSON en `docs/qa/evidence/accesibilidad/`).
- **Tests de regresión del PR #355** (patrón rojo y luego verde por cada issue): `Button.contrast`, `Modal.focus-restore`, `DataTable.aria-sort`, `DataTable.keyboard`, `RegisterPage.a11y`, `ProfilePage.a11y`, `PagosAdminPage.a11y`, `focus-indicators` e `icon-button-names`.
- **`frontend/src/__tests__/accessibility-wcag.test.jsx`** — tests de contraste sobre los tokens del design system.

Limitación conocida: el script todavía no corre en el CI; se ejecuta a mano.
## 8. Issues por hallazgo

Issues #345 a #353, etiqueta `accesibilidad`, asignadas a Gise (gigilvsarg) y cerradas por el PR #355. Antecedentes: #204 (BK-MOB-11, accesibilidad móvil) y #307 (este informe).
## 9. Próximos pasos (Sprint 5)

1. Abrir y corregir el issue de `color-contrast` del layout compartido (11 pantallas, 1 sola corrección).
2. **Automatizar en CI** la ejecución de `audit-accessibility.mjs`, con fallo del job ante violaciones `critical` o `serious`.
3. Agregar `aria-live` y `role="status"` a ConnectionBanner y toasts (criterio 4.1.3).
4. Validar con lector de pantalla real (VoiceOver iOS y NVDA Windows) los flujos ACC-01..05. Esta verificación manual no se hizo en esta corrida.
5. Revisión visual manual del botón primario más oscuro y de `text-primary` sobre fondo claro (3,10:1).
6. Cubrir con axe las pantallas restantes, que hoy no están en las 14 rutas auditadas.
## 10. Conclusión

La re-auditoría confirma la mejora: de 18 a 11 violaciones, de 4 críticas a 0, y Lighthouse de 95 a 100 en las pantallas públicas. Los 9 problemas detectados se cerraron con un PR de 18 commits (test en rojo y fix en verde por cada issue).

**Todavía no se puede declarar conformidad plena con WCAG 2.2 AA**: queda 1 problema de contraste de color en el layout compartido de las pantallas autenticadas, y falta validar con lector de pantalla real. Ambos están planificados para el Sprint 5.