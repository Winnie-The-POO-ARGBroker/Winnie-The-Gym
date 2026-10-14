---
id: BK-MOB-06
titulo: Modales como bottom sheet / pantalla completa en móvil (Modal: variante, footer fijo, scroll lock, foco)
tipo: mobile
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-BUG-09]   # BK-BUG-09 cubre ids únicos, trampa y restauración de foco del Modal; coordinar
---

# BK-MOB-06 · Modales como sheet en móvil

## 1. Resumen
`Modal` es un diálogo centrado de `max-w-lg` con `p-6`, `my-8` y scroll del overlay entero: en 375 px ocupa casi todo el ancho pero deja los botones de acción al final de un contenido largo (formularios de socio, plan, staff), no bloquea el scroll del fondo, no restaura el foco y usa clases de animación (`animate-in fade-in zoom-in-95`) que **no existen** porque `tailwindcss-animate` no está instalado. Es además la base necesaria para el sheet "Más" (BK-MOB-01) y los filtros en móvil (BK-MOB-04).

## 2. Objetivo de usuario
Como **usuario móvil** quiero **que los formularios y confirmaciones se abran como una hoja desde abajo con los botones siempre visibles** para **completarlos con una mano y sin perder las acciones detrás del teclado**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Props | `frontend/src/components/ui/Modal.jsx:17-25` | `isOpen, onClose, title, description, icon, maxWidth='max-w-lg', children`. Sin `footer`, sin variante. |
| Overlay | `Modal.jsx:57-62` | `fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto`; clic en el fondo cierra. |
| Panel | `Modal.jsx:63-70` | `relative w-full ${maxWidth} bg-bg-surface border rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8`. Sin `max-h`; el overlay scrollea. |
| Animación inexistente | `Modal.jsx:69`, `tailwind.config.js:63` (`plugins: []`), `frontend/package.json` | `animate-in/fade-in/zoom-in-95/duration-150` pertenecen a `tailwindcss-animate`, que no figura en dependencias ni plugins → no hacen nada. Sí existen `animate-fadeIn` y `animate-scaleUp` (`index.css:115-120`). |
| Cabecera | `Modal.jsx:71-101` | Cierra con botón `p-1.5` + ícono 20 px (≈ 32 px). IDs fijos `modal-title`/`modal-desc` (colisionan si hay dos modales montados). |
| Foco | `Modal.jsx:43-52` | Al abrir enfoca el primer elemento focuseable (en la práctica el botón cerrar); **no atrapa Tab** (Tab puede salir del diálogo) y **no devuelve el foco** al disparador al cerrar. |
| Teclado | `Modal.jsx:29-40` | Escape en `window`. |
| Scroll lock | `rg "overflow" Modal.jsx` | No hay bloqueo de scroll del `body` (en iOS el fondo se desplaza detrás). |
| Viewport | `Modal.jsx`, `ClassAttendeesModal.jsx:87`, `PlanFormModal.jsx:141` | Alturas con `vh`/`my-8`; los modales internos usan `max-h-[60vh]`. `rg "dvh\|svh" src` → sin resultados: con el teclado abierto o la barra del navegador, `vh` no coincide con el alto visible. |
| Consumidores | `components/admin/SocioFormModal.jsx:103`, `SocioDetailModal.jsx:244` (`max-w-xl`), `PlanFormModal.jsx:133` (`max-w-2xl`, formulario `-mx-6 -mb-6` con cuerpo `max-h-[60vh]`), `StaffFormModal.jsx:91`, `components/auth/ChangePasswordModal.jsx:54`, `components/classes/ClassAttendeesModal.jsx:43` (`max-w-3xl`), `CancelarClaseModal.jsx:43`, `pages/admin/AdminSociosPage.jsx:282` (confirmación de baja). |
| Modal propio | `components/socio/QRFullscreenModal.jsx:65-136` | No usa `Modal`: `fixed inset-0 z-50`, cerrar `absolute top-6 right-6` (sin safe-area), `Button size="sm"` (≈ 32 px), sin Escape, `text-[10.5px]`. |
| Tests | `components/ui/__tests__/Modal.test.jsx` | 4 casos (no renderiza cerrado; título/descripción/icono/contenido; Escape; click en backdrop). Más tests por modal en `components/**/__tests__` y `*.test.jsx`. |

## 4. Alcance
**Incluye:** (a) prop `mobileVariant` (`'sheet'` default | `'fullscreen'` | `'dialog'`) con clases responsive; (b) prop `footer` fijo con safe-area; (c) scroll lock; (d) foco: trap + restauración y (e) `useId` para IDs — **estos dos puntos son el alcance de BK-BUG-09**: si ese ítem ya se implementó, reutilizarlo; si no, hacerlo acá y cerrar BK-BUG-09; (f) animaciones propias (`slideUp`) respetando `prefers-reduced-motion`; (g) botón cerrar de 44 px; (h) migrar `PlanFormModal`, `SocioFormModal`, `StaffFormModal`, `ClassAttendeesModal` a `footer`/`fullscreen` donde corresponda; (i) ajustar `QRFullscreenModal`.
**No incluye:** gestos de arrastre para cerrar (opcional, ver §11), rediseño de contenidos, sheets anidados.

## 5. Contrato de API
Sin cambios de API.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
### Props nuevas de `Modal`
```jsx
<Modal
  isOpen onClose title description icon maxWidth="max-w-2xl"
  mobileVariant="sheet"          // 'sheet' | 'fullscreen' | 'dialog'  (default 'sheet')
  footer={<>
    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
    <Button type="submit" form="plan-form">Guardar</Button>
  </>}
>
```
Para formularios, el botón submit del `footer` usa el atributo `form="<id>"` del `<form>` (el footer queda fuera del `<form>` para ser fijo).

### Clases (solo CSS; los tests existentes no cambian)
- Overlay: `fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-sm` + por variante: `sheet` → `items-end md:items-center md:p-4`; `fullscreen` → `items-stretch md:items-center md:p-4`; `dialog` → `items-center p-4`. Quitar `overflow-y-auto` del overlay.
- Panel: `relative w-full flex flex-col bg-bg-surface shadow-2xl border border-subtle` + `sheet` → `rounded-t-2xl max-h-[92dvh] md:rounded-2xl md:max-h-[90dvh] ${maxWidth} animate-slideUp md:animate-scaleUp`; `fullscreen` → `h-dvh rounded-none md:h-auto md:max-h-[90dvh] md:rounded-2xl`. Eliminar `my-8`, `p-6` global y `animate-in ...`.
- Estructura interna: cabecera `shrink-0 px-4 py-3 md:px-6 md:py-4 border-b` (con "agarre" visual `h-1 w-10 rounded-full bg-text-tertiary/40` solo en sheet); cuerpo `flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6`; footer `shrink-0 border-t border-subtle px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end`.
- Botón cerrar: `h-11 w-11` + `aria-label="Cerrar"` (hoy "Cerrar modal", `Modal.jsx:96`; mantener el actual para no romper tests existentes).
- `index.css`: agregar `@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }` y `.animate-slideUp { animation: slideUp .25s cubic-bezier(0.16,1,0.3,1) both }` dentro de `@layer utilities` (junto a `fadeIn`/`scaleUp`, `index.css:115-131`) y un `@media (prefers-reduced-motion: reduce)` que anule las animaciones.
### Comportamiento (JS)
- `useEffect` con `document.body.style.overflow = 'hidden'` al abrir y restauración del valor previo al cerrar/desmontar (contador global para modales apilados).
- Foco: guardar `document.activeElement` al abrir, `requestAnimationFrame(() => panelRef.current.focus())` con `tabIndex={-1}` en el panel (en lugar de forzar el primer input, para no abrir el teclado en móvil), keydown `Tab` que cicla dentro del panel, y al cerrar `previouslyFocused.focus()`.
- IDs con `useId()` (`aria-labelledby`/`aria-describedby`) en vez de `modal-title`/`modal-desc`.
- Teclado virtual: usar `dvh` y `scroll-padding`; al enfocar un `input` dentro del cuerpo `scrollIntoView({block:'center'})` solo si hace falta (No verificado el comportamiento en iOS; validar a mano).
### Migraciones
- `PlanFormModal.jsx:133-141`: quitar los márgenes negativos `-mx-6 -mb-6` y el `max-h-[60vh]` interno; pasar acciones a `footer`.
- `SocioFormModal.jsx:103-311`, `StaffFormModal.jsx:91-195`: `mobileVariant="fullscreen"` + `footer`.
- `ClassAttendeesModal.jsx:43-189`: `fullscreen`; quitar `max-h-[60vh]`; acciones al `footer`.
- `SocioDetailModal.jsx:244`, `ChangePasswordModal.jsx:54`, `CancelarClaseModal.jsx:43`, confirmación de baja en `AdminSociosPage.jsx:282`: `sheet` (default).
- `QRFullscreenModal.jsx`: cerrar `top-[max(1.5rem,env(safe-area-inset-top))] right-4`, botón ≥ 44 px, Escape, texto ≥ 12 px.
### Estados de UI / textos / responsive
Sin carga remota. Textos de acciones existentes ("Cancelar", "Guardar", etc.). 375 px: sheet o pantalla completa; 768 px+: diálogo centrado como hoy.

## 8. Archivos a crear / modificar
- Modificar `components/ui/Modal.jsx`, `index.css`, los 8 consumidores listados y `components/socio/QRFullscreenModal.jsx`.
- Tests: ampliar `components/ui/__tests__/Modal.test.jsx`; revisar los tests de cada modal por cambios de estructura (`SocioFormModal.test.jsx`, `__tests__/PlanFormModal.test.jsx`, `__tests__/StaffFormModal.test.jsx`, `__tests__/ChangePasswordModal.test.jsx`, `__tests__/CancelarClaseModal.test.jsx`, `QRFullscreenModal.test.jsx`).

## 9. Plan de pruebas (TDD)
Convención y comandos: ver BK-MOB-01 §9. Primero, en rojo (`Modal.test.jsx`):
1. Panel con `role="dialog"` y clases `rounded-t-2xl`/`max-h-[92dvh]` en `mobileVariant="sheet"`; `h-dvh` en `fullscreen`.
2. `footer` se renderiza fuera del contenedor de scroll (contenedor del body distinto del footer) y el botón submit con `form="id"` envía el formulario.
3. Al abrir: `document.body.style.overflow === 'hidden'`; al cerrar o desmontar, vuelve al valor previo; con dos modales apilados solo se restaura al cerrar el último.
4. Foco: tras abrir, `document.activeElement` es el panel (o dentro del diálogo); Tab desde el último elemento vuelve al primero; al cerrar, el foco regresa al botón que abrió el modal.
5. Dos modales a la vez tienen IDs distintos (`aria-labelledby` apunta al `h3` correcto).
6. Regresión: los 4 casos actuales siguen verdes.
7. `QRFullscreenModal`: Escape cierra.
8. Playwright (ampliar `mobile-walkthrough.mjs`): abrir "Nuevo plan"/"Nuevo socio" a 375×667; el botón de guardar está dentro del viewport sin scrollear y `document.body` no scrollea.
Manual: Safari iOS real o emulación (abrir teclado en un campo, verificar que el footer y el campo enfocado queden visibles).

## 10. Criterios de aceptación
- **Dado** 375 px **cuando** abro un formulario **entonces** aparece como sheet/pantalla completa con las acciones fijas abajo y respetando el safe-area.
- **Dado** un modal abierto **entonces** el fondo no se desplaza y al cerrarlo el foco vuelve al botón que lo abrió.
- **Dado** ≥ 768 px **entonces** el modal se ve centrado como hoy.
- **Dado** `prefers-reduced-motion` **entonces** no hay animación de entrada.

## 11. Riesgos y decisiones abiertas
1. ¿Pantalla completa o sheet para formularios largos? Recomendación: `fullscreen` para Socio/Plan/Staff/Asistentes, `sheet` para confirmaciones y detalle.
2. ¿Gesto de arrastre para cerrar? Recomendación: P3, solo agarre visual por ahora.
3. Alternativa a `useEffect` + `body.style`: librería (p. ej. Radix Dialog) — descartada: sumar dependencia; el repo ya implementa `Modal` propio.
4. El cambio de estructura puede romper selectores de tests de modales existentes: revisar uno por uno.

## 12. Referencias
Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", columna "05 · Mobile", módulos Socios/Planes (No verificado los frames exactos). BK-MOB-01, BK-MOB-04, BK-MOB-07, BK-MOB-08, BK-MOB-11.

## 13. Prompt listo para un agente de IA
> Repo Winnie-The-Gym, `frontend/` (React 18, Tailwind 3 sin plugins, vitest/RTL). Leé `src/components/ui/Modal.jsx` y su test `ui/__tests__/Modal.test.jsx`, `src/index.css` (keyframes `fadeIn`/`scaleUp`), y los consumidores `admin/{PlanFormModal,SocioFormModal,StaffFormModal,SocioDetailModal}.jsx`, `auth/ChangePasswordModal.jsx`, `classes/{ClassAttendeesModal,CancelarClaseModal}.jsx`, `socio/QRFullscreenModal.jsx`. TDD: ampliá `Modal.test.jsx` (variantes `sheet`/`fullscreen`, `footer` fuera del scroll, scroll lock con modales apilados, trap y restauración de foco, IDs únicos con `useId`, regresión de los 4 casos actuales). Luego reescribí `Modal.jsx` con la prop `mobileVariant` (default `'sheet'`) y `footer`, clases `items-end md:items-center`, `rounded-t-2xl max-h-[92dvh] md:rounded-2xl`, cuerpo `overflow-y-auto overscroll-contain`, footer con `pb-[max(1rem,env(safe-area-inset-bottom))]`, `animate-slideUp` (agregá el keyframe a `index.css` y `prefers-reduced-motion`), eliminá `animate-in fade-in zoom-in-95` (no existen sin `tailwindcss-animate`). Migrá los consumidores a `footer`/`fullscreen` y arreglá el botón cerrar de `QRFullscreenModal` con safe-area y ≥44 px. Mantené el `aria-label` "Cerrar modal" para no romper tests. UI en español rioplatense. Terminado: lint, `npx vitest run --coverage` y `npm run build` verdes; a 375 px los botones de guardar están visibles sin scroll.
