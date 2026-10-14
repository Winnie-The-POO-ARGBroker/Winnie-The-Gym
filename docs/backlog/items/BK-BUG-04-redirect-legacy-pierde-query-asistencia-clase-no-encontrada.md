---
id: BK-BUG-04
titulo: "Abrir terminal completa de asistencia" siempre termina en "Clase no encontrada" (el redirect legacy descarta ?id=)
tipo: bug
roles: [administrador, recepcionista]
prioridad: P0
tamano: S
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-BUG-04 · Redirect legacy descarta `?id=` → `AttendancePage` sin clase

## 1. Resumen
`ClassAttendeesModal` navega a `/clases/asistencia?id=<id>`. En `App.jsx` esa ruta es `<Navigate to="/admin/clases/asistencia" replace />`, y `Navigate` con un `to` sin query **descarta el search string**. `AttendancePage` lee la clase de `useSearchParams().get('id')`, no de `location.state`, así que llega sin `id`, dispara `toast.error('Clase no encontrada')` y vuelve a `/admin/clases`. Resultado: la terminal completa de asistencia es inalcanzable desde la UI (la hipótesis previa "se entra sin `state`" no es la causa: la página nunca usó `state`). El mismo patrón de redirect legacy existe en otras rutas.

## 2. Objetivo de usuario
Como **recepcionista/administrador** quiero **abrir la terminal de asistencia de una clase desde el modal de inscriptos** para **marcar presentes y ausentes con más espacio**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Frontend componente | `frontend/src/components/classes/ClassAttendeesModal.jsx:171-179` | Botón "Abrir terminal completa de asistencia": `onClose(); navigate(\`/clases/asistencia?id=${selectedClass.id}\`)` (usa la ruta **legacy**) |
| Frontend ruta | `frontend/src/App.jsx:89-91` | `/admin/clases/asistencia` → `ProtectedRoute roles=[administrador, recepcionista]` → `AttendancePage` |
| Frontend ruta | `frontend/src/App.jsx:94-96` | Legacy: `/clases/crear`→`/admin/clases/crear`, `/clases/asistencia`→`/admin/clases/asistencia`, `/membresias`→`/admin/planes`; todas con `<Navigate to="..." replace />` **sin** conservar `location.search` |
| Frontend página | `frontend/src/pages/AttendancePage.jsx:20-21,30-33` | `const classId = searchParams.get('id')`; `if (!classId) { toast.error('Clase no encontrada'); navigate('/admin/clases') }` ejecutado **durante el render** |
| Frontend hook | `frontend/src/hooks/queries/useClases.js:38-49` | `useClaseDetail(id)` con `enabled: !!id` |
| Frontend test | `frontend/src/pages/AttendancePage.test.jsx:152-159` | Verifica el toast/navigate cuando falta `id` (comportamiento actual), pero nada prueba el flujo modal → página |
| Otros redirects con el mismo riesgo | `frontend/src/App.jsx:112,126` | `/socios`→`/admin/socios`, `/reportes`→`/admin/reportes` (hoy nadie les pasa query; `TopBar.jsx:28` usa `/recepcion/socios?search=` que sí existe como ruta real) |

Otra llamada que ya usa la ruta nueva y funciona: `frontend/src/pages/ClassSchedulePage.jsx:89` → `/admin/clases/crear?id=<id>`.

## 4. Alcance
**Incluye:** (a) apuntar el modal a la ruta canónica `/admin/clases/asistencia?id=`; (b) hacer que los redirects legacy conserven `search`/`hash`; (c) mover el toast/redirect de "Clase no encontrada" a un `useEffect` (hoy se ejecuta en cada render, y con `StrictMode` doble); (d) mostrar estado de error cuando la clase no existe (404 del detalle).
**No incluye:** acciones simuladas de la página (BK-BUG-05), eliminación de las rutas legacy (BK-BUG-10).

## 5. Contrato de API
Sin cambios. Se usa **[EXISTE] `GET /api/classes/clases/{id}/`** (`ClaseDetailSerializer`, incluye `inscripciones` con `id, clase, socio, socio_nombre, socio_apellido, socio_numero, asistio, en_espera, created_at`) y **[EXISTE] `PATCH /api/classes/inscripciones/{id}/`** `{asistio: bool}` (`IsReceptionistOrAdmin`).

## 6. Modelo de datos
Sin cambios.

## 7. Diseño frontend
- **Rutas:** crear un helper en `App.jsx`:
  ```jsx
  function RedirectPreservingSearch({ to }) {
    const { search, hash } = useLocation()
    return <Navigate to={`${to}${search}${hash}`} replace />
  }
  ```
  y usarlo en las rutas legacy (`/clases/crear`, `/clases/asistencia`, `/membresias`, `/socios`, `/reportes`). Convención de rutas protegidas del repo: `<Route path="..." element={<ProtectedRoute roles={[...]}><Page/></ProtectedRoute>} />` (`App.jsx:83-91`).
- **`ClassAttendeesModal.jsx:174`:** cambiar a `navigate(\`/admin/clases/asistencia?id=${selectedClass.id}\`)`.
- **`AttendancePage.jsx`:** envolver la validación en `useEffect(() => { if (!classId) { toast.error('Clase no encontrada'); navigate('/admin/clases', { replace: true }) } }, [classId, navigate])` y retornar `null`/skeleton mientras tanto. Manejar `isError` de `useClaseDetail` con `EmptyState` ("No encontramos la clase" + volver).
- **Estados:** loading (Skeleton existente), error/no encontrada (EmptyState + toast), éxito (render actual).
- **Textos:** "Clase no encontrada" (existente), botón "Volver a clases".
- **Responsive:** sin cambios (la página usa `xl:flex-row`; a 375/768 px apila).

## 8. Archivos a crear / modificar
- `frontend/src/App.jsx` — `RedirectPreservingSearch` y uso en rutas legacy.
- `frontend/src/components/classes/ClassAttendeesModal.jsx` — ruta canónica.
- `frontend/src/pages/AttendancePage.jsx` — `useEffect` para validación + estado de error.
- `frontend/src/pages/AttendancePage.test.jsx` y `frontend/src/components/classes/*.test.jsx` (si existe el de `ClassAttendeesModal`) — casos nuevos; `frontend/src/App.test.jsx` si existe (no verificado) o un test nuevo de routing.

## 9. Plan de pruebas (TDD)
Frontend (vitest + RTL + `MemoryRouter`; `renderWithProviders({route})` de `frontend/src/test/test-utils.jsx` acepta `route` inicial): **primero** un test de routing que renderice `<App/>` (o un `<Routes>` mínimo con las rutas legacy) en `/clases/asistencia?id=42` con usuario `recepcionista` y espere que `useLocation().search === '?id=42'` y `pathname === '/admin/clases/asistencia'`; idem `/clases/crear?id=7`. Test del modal: click en "Abrir terminal completa de asistencia" → `navigate` llamado con `/admin/clases/asistencia?id=<id>`. Test de página: sin `id` → un solo `toast.error` (no uno por render). `cd frontend && npx vitest run src/pages/AttendancePage.test.jsx src/components/classes`; `npm run lint`.
Manual: `recepcion@winnie.local` → Clases → abrir una clase con inscriptos → "Abrir terminal completa de asistencia" → debe cargar la clase.

## 10. Criterios de aceptación
- **Dado** el modal de inscriptos de una clase **cuando** se pulsa "Abrir terminal completa de asistencia" **entonces** se abre `/admin/clases/asistencia?id=<id>` con la clase cargada.
- **Dado** una URL legacy con query (`/clases/asistencia?id=3`) **cuando** se visita **entonces** se redirige conservando `?id=3`.
- **Dado** un `id` inexistente **entonces** se muestra un solo mensaje de error y se ofrece volver.

## 11. Riesgos y decisiones abiertas
1. ¿Eliminar de una vez las rutas legacy y dejar solo las `/admin/...`? Recomendación: conservar el helper unos sprints (links en emails/favoritos) y evaluar en BK-BUG-10.
2. `navigate` durante el render hoy también hace que `AttendancePage` renderice contenido vacío un frame; el `useEffect` lo evita.

## 12. Referencias
`docs/qa/walkthrough-2026-09-22.md` (recorrido QA previo). Figma (opcional): "vistas live", Clases → Asistencia.

## 13. Prompt listo para un agente de IA
> Repo Winnie The Gym (React 18 + react-router-dom 7). Bug: `ClassAttendeesModal.jsx:174` navega a `/clases/asistencia?id=X`, y en `frontend/src/App.jsx:95` esa ruta es `<Navigate to="/admin/clases/asistencia" replace />`, que descarta `?id=`; `AttendancePage` lee `searchParams.get('id')` y muestra "Clase no encontrada". TDD: primero escribí tests de routing que prueben que las rutas legacy (`/clases/crear`, `/clases/asistencia`, `/membresias`, `/socios`, `/reportes`) conservan `search`, un test del modal que espere `navigate('/admin/clases/asistencia?id=<id>')`, y un test de `AttendancePage` que exija un único `toast.error` y redirección vía `useEffect`. Luego implementá un componente `RedirectPreservingSearch` en `App.jsx` (usa `useLocation`), cambiá el modal a la ruta canónica, y mové la validación de `classId` de `AttendancePage.jsx:30-33` a un `useEffect`, agregando estado de error con `EmptyState` para 404 de `useClaseDetail`. Textos en español rioplatense. No toques las acciones simuladas de la página (otra ficha, BK-BUG-05). Terminado cuando `cd frontend && npx vitest run && npm run lint` pasan y el flujo manual con `recepcion@winnie.local` abre la clase. Sin commits.
