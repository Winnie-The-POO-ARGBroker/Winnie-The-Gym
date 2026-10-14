---
id: BK-PLT-05
titulo: ComingSoonPage sin uso: decidir entre eliminarla o usarla para secciones planificadas
tipo: deuda-tecnica
roles: [administrador, recepcionista, socio]
prioridad: P3
tamano: S
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-PLT-05 · ComingSoonPage sin uso: decidir entre eliminarla o usarla para secciones planificadas

## 1. Resumen
`ComingSoonPage` está importada y cableada en `App.jsx`, pero la lista `COMING_SOON_PATHS` está vacía, así que nunca se monta. Además sus etiquetas apuntan a rutas legacy (`/socios`, `/membresias`, …) que hoy son redirects. Es código muerto que puede confundir a quien agregue una sección nueva.

## 2. Objetivo de usuario
Como **equipo de desarrollo** quiero **que el patrón "próximamente" sea explícito o desaparezca** para **no mantener código que no se ejecuta y tener un camino claro para anunciar módulos futuros (comunicaciones, rutinas)**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Frontend app | `frontend/src/App.jsx:16` | `import ComingSoonPage from './pages/ComingSoonPage'`. |
| Frontend app | `frontend/src/App.jsx:40` | `const COMING_SOON_PATHS = []` (vacío). |
| Frontend app | `frontend/src/App.jsx:140-143` | `COMING_SOON_PATHS.map(path => <Route ... element={<ProtectedRoute><ComingSoonPage/></ProtectedRoute>} />)` → no genera rutas. |
| Frontend página | `frontend/src/pages/ComingSoonPage.jsx:5-11` | `PAGE_LABELS` para `/socios`, `/membresias`, `/clases`, `/reportes`, `/configuracion`; todas hoy son rutas reales o redirects (`App.jsx:94-96,112,126,137-138`). |
| Frontend página | `frontend/src/pages/ComingSoonPage.jsx:28-30` | Copy: "Próximamente" / "Esta sección está en desarrollo y estará disponible pronto." |
| Frontend test | `frontend/src/pages/ComingSoonPage.test.jsx` | Existe test del componente aislado (mantiene la cobertura del archivo, aunque no se use). |
| Sidebar | `frontend/src/components/layout/Sidebar.jsx:12-46` | `NAV_BY_ROLE` no incluye ítems "próximamente". |

## 4. Alcance
**Incluye:** decisión y ejecución de una de las dos opciones: (A) eliminar `ComingSoonPage`, su test, el import y `COMING_SOON_PATHS`; o (B) conservarla como mecanismo oficial: renombrar a `FeaturePlaceholderPage` con título/subtítulo por props o por un mapa actualizado, y registrar rutas planificadas (p. ej. `/admin/comunicaciones`, BK-PLT-08) con un ítem en el sidebar marcado con `Badge`.
**No incluye:** construir las secciones futuras.

## 5. Contrato de API
Sin cambios de API.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Opción A (recomendada si no hay módulos inminentes):** borrar archivos; verificar que `npm run lint` no reporte imports huérfanos; restar tests (la cobertura global baja un poco: baseline ~82% líneas según README, umbral 68).
- **Opción B:** `ComingSoonPage` toma `title`/`subtitle` de `props` en vez de `PAGE_LABELS` hardcodeado; `App.jsx` define `const COMING_SOON = [{ path: '/admin/comunicaciones', title: 'Comunicaciones', subtitle: '...' , roles: ['administrador'] }]` y pasa `roles` a `ProtectedRoute`. Componentes reutilizados: `AppLayout`, `TopBar` (props `title`, `subtitle`, `icon`, `rightContent`), `Badge` (`components/ui/Badge.jsx`, variante `live` conocida; otras No verificadas).
- **Textos (es-AR):** "Próximamente" / "Estamos trabajando en esta sección. Te avisamos cuando esté lista."
- **Responsive:** la página ya es centrada; a 375 px usa `AppBottomNav` por `AppLayout`.

## 8. Archivos a crear / modificar
- A: eliminar `frontend/src/pages/ComingSoonPage.jsx` y `.test.jsx`; editar `App.jsx` (líneas 16, 40, 140-143).
- B: modificar `ComingSoonPage.jsx` y su test, `App.jsx`, y opcionalmente `Sidebar.jsx`.

## 9. Plan de pruebas (TDD)
- A: no hay tests nuevos; correr `cd frontend && npm run lint && npx vitest run --coverage` y confirmar umbrales.
- B: primero actualizar `ComingSoonPage.test.jsx` para pasar `title`/`subtitle` por props y verificar que se renderizan; test en `App` no existe (No verificado `App.test.jsx`), agregar uno que navegue a la ruta y espere el texto "Próximamente" para un rol permitido y la redirección para un rol no permitido.
- Manual: abrir la ruta planificada con admin y con recepcionista.

## 10. Criterios de aceptación
- **Dado** el repo **cuando** se corre `rg "COMING_SOON_PATHS\|ComingSoonPage" frontend/src` **entonces** o no hay resultados (A) o todas las referencias están en uso real (B).
- **Dado** (B) un usuario sin rol permitido **cuando** abre la ruta **entonces** ve 403/redirect según BK-PLT-02.

## 11. Riesgos y decisiones abiertas
- ¿Hay módulos en el roadmap inmediato? **Recomendación por defecto:** opción A y recrear el patrón cuando haga falta (YAGNI).
- Puede haber enlaces externos a las rutas legacy; no tocar los `Navigate` de `App.jsx:94-96`.

## 12. Referencias
- `frontend/src/pages/ComingSoonPage.jsx`, `frontend/src/App.jsx`.
- Relacionados: BK-PLT-08 (comunicaciones), BK-PLT-11 (rutinas).

## 13. Prompt listo para un agente de IA
```
Contexto: frontend/src/App.jsx importa ComingSoonPage y define COMING_SOON_PATHS = [] (líneas 16, 40, 140-143): código muerto. Sus PAGE_LABELS (ComingSoonPage.jsx:5-11) apuntan a rutas que ya son reales.
Tarea (docs/backlog/items/BK-PLT-05-comingsoon-page-codigo-muerto.md, opción A salvo que el dueño pida B): eliminá ComingSoonPage.jsx, ComingSoonPage.test.jsx, el import y el bloque COMING_SOON_PATHS de App.jsx. No toques los Navigate legacy.
Terminado: `cd frontend && npm run lint && npx vitest run --coverage` verdes y `rg "ComingSoon" frontend/src` sin resultados.
```
