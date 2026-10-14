# Informe de Accesibilidad Web (WCAG 2.2 Nivel AA) — Winnie The Gym

## 1. Encabezado y Metadatos

| Campo | Detalle |
|---|---|
| **Proyecto** | Winnie The Gym — Sistema de gestión integral para gimnasios |
| **Actividad** | Auditoría y Verificación de Accesibilidad (V&V) — Sprint 4 |
| **Estándar de Evaluación** | WCAG 2.2 Nivel AA (Web Content Accessibility Guidelines) |
| **Fecha de Auditoría** | 13/10/2026 |
| **Responsables** | Magali Bechis (QA Lead), Franco Arce (Full-Stack Dev) |
| **Herramientas Utilizadas** | `axe-core` v4.10, `@axe-core/playwright`, Google Lighthouse v12, Screen Reader (NVDA / VoiceOver) |
| **Estado General** | Requiere Correcciones (Hallazgos identificados para mitigación) |

---

## 2. Resumen Ejecutivo

Como parte del Sprint 4 (enfocado en automatización, calidad y accesibilidad), se llevó a cabo una auditoría exhaustiva sobre las pantallas y componentes críticos de la aplicación web **Winnie The Gym** (`/login`, `/socio/credencial`, `/socio/clases`, `/socio/checkout`, `/admin/socios`, `/recepcion/acceso`). 

La evaluación combinó:
1. **Auditoría automatizada de motor estático y dinámico:** Invocación de reglas `axe-core` integradas en Playwright y análisis de métricas con Google Lighthouse (estableciendo como meta una puntuación $\ge 90$).
2. **Checklist manual estructurado:** Verificación de navegación 100% por teclado, visibilidad del indicador de foco, ratios de contraste lumínico en temas claro y oscuro, comportamiento responsivo con zoom al 200% y reflow a 320 px de ancho, y etiquetado ARIA para lectores de pantalla.

Se identificaron **5 hallazgos principales** (2 de severidad Alta, 2 de severidad Media y 1 de severidad Baja), destacándose deficiencias de contraste en tokens de texto terciario y botones principales, supresión masiva del anillo de foco con `outline-none` y elementos de tabla clickeables no accesibles por teclado.

---

## 3. Casos de Prueba de Accesibilidad (ACC-01 .. ACC-05)

### ACC-01 — Ratio de Contraste de Color (WCAG 1.4.3 Contraste Mínimo - Nivel AA)
* **Objetivo:** Verificar que todo texto legible cumpla un ratio de contraste mínimo de **4.5:1** para texto normal (< 18pt / 14pt negrita) y **3:1** para texto grande o elementos gráficos e interactivos esenciales.
* **Procedimiento:** Medición de contrastes en tema claro (fondo `#FFFFFF` / `#F8FAFC`) y tema oscuro (fondo `#121212` / `#1E1E1E`) sobre tokens de `colors.orange`, `colors.neutral`, `colors.dark.text` y componentes `Button`, `Badge` e inputs.
* **Resultado:** **FALLA PARCIAL.** El texto regular sobre fondo primario (`#ff5a36` con texto blanco) y los textos clasificados como `text-tertiary` no alcanzan el umbral de 4.5:1.

### ACC-02 — Navegación Exclusiva por Teclado y Foco Visible (WCAG 2.1.1 Teclado y 2.4.7 Foco Visible)
* **Objetivo:** Garantizar que toda la funcionalidad interactiva sea operable mediante teclado (`Tab`, `Shift+Tab`, `Enter`, `Espacio`, flechas) y que el elemento en foco cuente con un indicador visual perceptible.
* **Procedimiento:** Recorrido completo sin mouse en modales (`Modal.jsx`, `SocioFormModal.jsx`), navegación en barra lateral y bottom nav (`AppBottomNav.jsx`), filtros (`FilterPanel.jsx`) y tablas de datos.
* **Resultado:** **FALLA.** Se detectaron 55 usos de la clase Tailwind `outline-none` sin proveer un estilo `focus-visible:` compensatorio, lo que vuelve invisible la posición del cursor en navegación por teclado. Asimismo, las filas clickeables de tablas de socios y clases no poseen `tabIndex={0}` ni eventos de teclado.

### ACC-03 — Estructura Semántica, Formularios y Atributos ARIA (WCAG 1.3.1 y 4.1.2)
* **Objetivo:** Validar la jerarquía de encabezados (`h1`-`h6`), asociación explícita de `label` con inputs mediante `htmlFor`/`id`, y correcta semántica de controles interactivos con ARIA.
* **Procedimiento:** Inspección de DOM en formularios de login, alta/edición de socios y filtros. Verificación de lectura con lectores de pantalla.
* **Resultado:** **PASS CON OBSERVACIONES.** Los inputs de formularios están correctamente asociados con sus labels mediante React Hook Form, pero botones de sólo ícono (ej. cerrar modal o alternar visibilidad) carecen de `aria-label` descriptivo.

### ACC-04 — Zoom al 200% y Reflow a 320 px (WCAG 1.4.4 y 1.4.10)
* **Objetivo:** Asegurar que la interfaz soporte ampliación de texto hasta 200% y redimensión a un ancho de viewport de 320 px (dispositivos móviles pequeños) sin truncamiento de contenido ni aparición de barra de desplazamiento horizontal bidireccional.
* **Procedimiento:** Ejecución de pruebas con emulación móvil de 320 px y zoom de navegador al 200% en pantallas de credencial QR, catálogo de clases y dashboard.
* **Resultado:** **PASS.** El layout responsive implementado con TailwindCSS y el refactor de `AppBottomNav` y modales responsivos evitan el desbordamiento horizontal (`scrollWidth <= innerWidth`).

### ACC-05 — Auditoría Automatizada con axe-core y Puntuación Lighthouse
* **Objetivo:** Alcanzar un score Lighthouse de Accesibilidad $\ge 90$ y 0 violaciones de impacto `critical` o `serious` según las reglas estándar de `axe-core`.
* **Procedimiento:** Análisis automatizado sobre build de producción local en rutas `/login`, `/socio/credencial` y `/recepcion/acceso`.
* **Resultado:** **FALLA (Score Lighthouse: 84/100).** Las violaciones automatizadas reportadas por axe coinciden con los problemas de contraste de color (`color-contrast`) y elementos con roles no interactivos (`click-events-have-key-events`).

---

## 4. Matriz de Hallazgos Reportados

| ID | Hallazgo | Criterio WCAG | Severidad | Pantalla(s) Afectada(s) | Componente / Elemento | Estado |
|:---:|---|:---:|:---:|---|---|:---:|
| **H-ACC-01** | Contraste insuficiente en textos secundarios y terciarios (`text-tertiary`): ratio medido de **2.61:1** en tema claro y **3.54:1** en tema oscuro (exigido ≥ 4.5:1). | WCAG 1.4.3 (Contraste Mínimo) | **Alta** | Dashboard, Gestión de Socios, Clases, Perfil | `tokens.js` (`colors.dark.text.tertiary`), textos de ayuda y fechas | Reportado |
| **H-ACC-02** | Contraste insuficiente en botón primario (`primary`): texto blanco `#FFFFFF` sobre fondo anaranjado `#ff5a36` arroja un ratio de **3.10:1** (exigido ≥ 4.5:1 para texto normal). | WCAG 1.4.3 (Contraste Mínimo) | **Alta** | Todas las pantallas con acciones principales | `Button.jsx` (variante `primary`), botones de submit | Reportado |
| **H-ACC-03** | Supresión del indicador visual de foco: uso generalizado de `outline-none` (55 instancias) sin reemplazo de `focus-visible:ring-2`. | WCAG 2.4.7 (Foco Visible) | **Media** | Modales, filtros, inputs de texto y botones | `Modal.jsx`, `FilterPanel.jsx`, inputs de formularios | Reportado |
| **H-ACC-04** | Filas interactivas no operables por teclado: elementos `<tr>` o `<div>` con manejador `onClick` carecen de `tabIndex="0"` y `onKeyDown`. | WCAG 2.1.1 (Teclado) | **Media** | Gestión de Socios, Toma de Asistencia | Tablas de datos en `AdminSociosPage`, `AttendanceTable` | Reportado |
| **H-ACC-05** | Botones de acción sólo icono carecen de etiqueta accesible (`aria-label`) para tecnologías asistivas. | WCAG 1.1.1 / 4.1.2 (Nombre accesible) | **Baja** | Credencial Digital, Modales, TopBar | Botón cerrar modal (`X`), botón maximizar QR | Reportado |

---

## 5. Detalle de Hallazgos y Plan de Mitigación

### Hallazgo H-ACC-01: Contraste insuficiente en textos terciarios
* **Problema:** En `frontend/src/styles/tokens.js`, la definición de texto terciario utiliza valores con opacidad excesivamente baja (`rgba(255,255,255,0.38)` sobre `#121212` y `#A1A1AA` sobre `#FFFFFF`), generando fatiga visual y dificultades de lectura en usuarios con baja visión o en condiciones de alta luminosidad ambiental.
* **Solución propuesta:**
  * En tema oscuro: Elevar el canal alfa a un mínimo de `0.65` (`rgba(255, 255, 255, 0.65)`), alcanzando un contraste de 4.75:1.
  * En tema claro: Reemplazar el token `neutral-400` (`#A1A1AA`) por `neutral-600` (`#52525B`), garantizando un contraste superior a 5.2:1.

### Hallazgo H-ACC-02: Contraste insuficiente en botón primario
* **Problema:** El color corporativo `#ff5a36` (Naranja 500) combinado con texto `#FFFFFF` no alcanza el contraste exigido por WCAG AA (3.10:1 vs 4.5:1).
* **Solución propuesta:**
  * Opción A: Ajustar el tono del botón primario a `orange-600` (`#E63E0F`) para elementos interactivos con texto blanco (alcanza ratio 4.62:1).
  * Opción B: Utilizar texto oscuro (`neutral-950` / `#0A0A0B`) cuando se mantenga el fondo `#ff5a36` o aplicar tipografía con peso negrita y tamaño $\ge 18\text{pt}$ (donde el requerimiento desciende a 3:1).

### Hallazgo H-ACC-03: Supresión de indicador de foco
* **Problema:** Múltiples componentes incluyen `outline-none` en sus clases de Tailwind para eliminar el borde azul por defecto de los navegadores, pero olvidan definir estilos `focus-visible`.
* **Solución propuesta:**
  * Reemplazar sistemáticamente `outline-none` por:
    ```css
    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
    ```
  * Asegurar un offset perceptible tanto en tema claro como en tema oscuro (`focus-visible:ring-offset-slate-900`).

### Hallazgo H-ACC-04: Operabilidad por teclado en tablas interactivas
* **Problema:** Al interactuar con la lista de socios o clases, los usuarios que navegan con teclado no pueden seleccionar filas porque no son focuseables.
* **Solución propuesta:**
  * Agregar `tabIndex={0}`, `role="button"` y el handler:
    ```jsx
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectRow(item);
      }
    }}
    ```

---

## 6. Conclusión y Checklist de Cierre

La aplicación demuestra una sólida base estructural, destacándose por su adaptabilidad responsiva (ACC-04) y robustez en la validación de formularios (ACC-03). La resolución de los 5 hallazgos reportados permitirá elevar el score de Lighthouse por encima de **96/100** y garantizar la conformidad plena con el estándar **WCAG 2.2 AA**, asegurando una experiencia inclusiva para todos los usuarios y socias del gimnasio.
