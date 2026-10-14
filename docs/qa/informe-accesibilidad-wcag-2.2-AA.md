# Informe de accesibilidad — WCAG 2.2 AA (ACC-01..05)

> Cierre Sprint 4 · 2026-10-14 · Winnie The Gym.
> Audiencia: equipo de desarrollo + cátedra ISPC.

## 1. Alcance

Auditoría manual de accesibilidad sobre los flujos operativos del portal post-Sprint 4:

- **ACC-01** — Portal del socio (Credencial, Clases, Pagos, Perfil, Mis Pagos).
- **ACC-02** — Login + registro público (incluye flujos activación y reset).
- **ACC-03** — Terminal de recepción (acceso QR + DNI manual + aforo monitor).
- **ACC-04** — Admin ABM socios + staff.
- **ACC-05** — Admin ABM planes + clases + reportes.

Criterios de aceptación: WCAG 2.2 Nivel AA (teclado, contraste, foco visible, estructura semántica, formularios, labels, SPA + navegación anunciada, zoom 200% + reflow 320 px, lector de pantalla).

## 2. Metodología

- **Manual**: navegación por teclado completa (Tab/Shift+Tab/Enter/Esc/flechas), inspección de contraste con DevTools, verificación de `aria-*` y `role=` en el DOM, prueba con lector de pantalla (VoiceOver iOS, NVDA Windows preliminar).
- **Automatizada (pendiente Sprint 5)**: axe-core integrado en Playwright + Lighthouse accessibility ≥ 90 por página.

## 3. Hallazgos — pre-Sprint 4 (pre-PRs del cierre)

Base registrada antes de los fixes del Sprint 4:

| # | Pantalla | WCAG | Severidad | Descripción | Status |
|---|---|---|---|---|---|
| ACC-H1 | Terminal / Credencial | 1.4.3 contraste | Alta | `text-tertiary` con contraste 2.61:1 (claro) y 3.54:1 (oscuro) — bajo el 4.5:1 mínimo | Fix integrado (RNF07 modo alto contraste + ajustes de tokens post-cert médico) |
| ACC-H2 | Botones primarios | 1.4.3 | Alta | Blanco sobre primary 3.10:1 (debería ≥ 4.5:1 texto normal) | Fix integrado |
| ACC-H3 | 55 ocurrencias | 2.4.7 foco visible | Alta | Clases `outline-none` sin reemplazo de foco visible | Fix parcial — ver sección 4 |
| ACC-H4 | AdminSocios, Clases | 2.1.1 teclado | Alta | Filas clickeables sin equivalente de teclado | Fix parcial |
| ACC-H5 | Mobile (bottom nav socio) | 2.5.5 target size | Alta | Items < 44x44 px + socio sin bottom nav en dashboard/perfil/pagos | **Resuelto PR #318 + #322** |
| ACC-H6 | Mobile forms | 1.4.4 reflow + zoom | Media | Fuentes < 16 px disparan zoom automático en iOS | **Resuelto PR #322** |
| ACC-H7 | Safe-area (iOS notch) | 1.4.10 reflow | Media | `h-screen` + sin `viewport-fit=cover` → content cortado | **Resuelto PR #322** |
| ACC-H8 | Modales | 2.4.3 focus order + 2.1.2 no trap | Media | Foco no se restaura al cerrar, no hay trap durante abierto | Parcial — ver sección 5 |

## 4. Hallazgos restantes (post-Sprint 4)

### ACC-H3 restante — Foco visible

- `outline-none` sigue en algunos botones icon-only y radio buttons custom.
- **Prioridad**: Media. **Pantallas afectadas**: `AdminSociosPage` (botón Reactivar), `ClassAttendeesModal` (filas de asistencia), `QRDisplay` (toggle alto contraste).
- **Fix propuesto**: reemplazar `outline-none` por `focus-visible:ring-2 focus-visible:ring-primary-500` en todos los componentes UI base.

### ACC-H4 restante — Filas de tabla clickeables

- `AdminSociosPage` tabla (sin cards): filas tienen `onClick` pero no `role="button" tabIndex="0" onKeyDown`.
- Después del PR #322, en mobile la vista cards sí es tecleable (botones nativos). En desktop pendiente.

### ACC-H8 restante — Modal focus trap

- `Modal.jsx` restaura foco al abridor al cerrar (OK).
- Falta: trap de Tab dentro del modal mientras está abierto (hoy Tab sale del modal al background).
- **Fix propuesto**: usar `focus-trap-react` o implementación manual con sentinel elements.

## 5. Hallazgos nuevos del Sprint 4 (menores)

- **ConnectionBanner** (PR #323): rol `role="alert"` presente pero `aria-live="assertive"` faltante — tecnicismo con lectores de pantalla. Impacto bajo porque es informativo.
- **InternalErrorPage** (PR #323): heading `<h1>` falta un `<main>` wrapper → navegación por landmarks subóptima.
- **AForMonitorPage** (PR #319): nuevo panel "Presentes ahora" tiene tabla con botones de salida — targets OK (44 px) pero falta `aria-label` descriptivo por fila.

## 6. Cumplimiento global al cierre Sprint 4

| Criterio WCAG 2.2 AA | Estado |
|---|---|
| 1.1.1 Contenido no textual | ✅ Imágenes de screenshots tienen alt, QRs tienen label |
| 1.3.1 Info y relaciones | ✅ Headings, listas, labels asociadas (post PR #322 inputs táctiles) |
| 1.4.3 Contraste texto | ⚠️ Tokens principales OK, 2 bordes de componentes con contraste insuficiente (ACC-H3 restante) |
| 1.4.4 Reflow + zoom 200% | ✅ Resuelto PR #322 (h-dvh + viewport-fit=cover + inputs 16px) |
| 1.4.10 Reflow 320 px | ✅ DataTable cards mobile + TopBar responsive + safe-area |
| 1.4.11 Contraste no textual | ⚠️ Mismo que 1.4.3 — bordes de focus en algunos componentes |
| 2.1.1 Keyboard | ⚠️ Filas clickeables de tablas desktop sin fallback (ACC-H4 restante) |
| 2.1.2 No keyboard trap | ⚠️ Modales no tienen trap (ACC-H8 restante) |
| 2.4.3 Focus order | ✅ |
| 2.4.4 Link purpose | ✅ |
| 2.4.6 Headings + labels | ✅ |
| 2.4.7 Focus visible | ⚠️ ACC-H3 restante en algunos componentes |
| 2.4.11 Focus appearance | ⚠️ Equivalente a 2.4.7 |
| 2.5.1 Pointer gestures | ✅ |
| 2.5.3 Label in name | ✅ |
| 2.5.5 Target size | ✅ Resuelto PR #322 (min-h-11) |
| 2.5.7 Dragging | N/A (no hay drag) |
| 2.5.8 Target size minimum | ✅ |
| 3.1.1 Lang | ✅ `<html lang="es">` |
| 3.2.1 On focus | ✅ |
| 3.2.2 On input | ✅ |
| 3.2.6 Consistent help | ✅ |
| 3.3.1 Error identification | ✅ Resuelto PR #317 (ChangePasswordModal inline errors) + validation.js |
| 3.3.2 Labels / instructions | ✅ Resuelto PR #322 (labels con `useId` + `htmlFor`) |
| 3.3.3 Error suggestion | ✅ |
| 3.3.7 Redundant entry | ✅ |
| 3.3.8 Accessible authentication | ✅ (OAuth Google como alternativa) |
| 4.1.2 Name role value | ⚠️ Algunos botones icon-only (torch, mute) sin `aria-label` |
| 4.1.3 Status messages | ⚠️ ConnectionBanner falta `aria-live` |

## 7. Issues abiertas por hallazgo

- #204 BK-MOB-11 — Accesibilidad móvil (contraste tokens, foco visible, targets, landmarks) — **Franco**
- #307 BK-ACC-05 — Este informe + 5 issues de accesibilidad etiquetadas (ACC-01..05)

Las issues con la etiqueta `accesibilidad` cubren los hallazgos restantes de ACC-H3, ACC-H4 y ACC-H8 más los menores de secciones 5.

## 8. Próximos pasos (Sprint 5)

1. **Automatizar** auditorías con axe-core via Playwright + Lighthouse ≥ 90.
2. **Cerrar ACC-H3 restante** con migración de `outline-none` → `focus-visible:ring-*`.
3. **Cerrar ACC-H4** con `role="button" tabIndex="0" onKeyDown` en filas clickeables de tablas desktop.
4. **Cerrar ACC-H8** con `focus-trap-react` o equivalente.
5. **Agregar `aria-live="assertive"` + `role="status"`** a ConnectionBanner y toasts.
6. **Validar con lector de pantalla real** (VoiceOver + NVDA) los 5 flujos ACC-01..05.
