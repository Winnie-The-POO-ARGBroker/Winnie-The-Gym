---
id: BK-BUG-10
titulo: Deuda técnica: API de React Query v4 usada con v5 (`isLoading` de mutaciones, `keepPreviousData`) y código muerto (ComingSoonPage, rama `mock-`, rutas alias)
tipo: deuda-tecnica
roles: [administrador, recepcionista, socio]
prioridad: P2
tamano: S
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-BUG-04]
---

# BK-BUG-10 · React Query v5 mal usado + código muerto

## 1. Resumen
`package.json` declara `@tanstack/react-query ^5`. En v5 las mutaciones **no tienen `isLoading`** (es `isPending`) y la opción `keepPreviousData` fue reemplazada por `placeholderData: keepPreviousData`. El código sigue usando la API de v4: los botones de baja/alta nunca se deshabilitan durante la petición (doble envío) y el listado de socios parpadea al paginar. Además hay código que ya no se usa: `ComingSoonPage` (la lista `COMING_SOON_PATHS` está vacía), la rama de tokens `mock-` en el interceptor de axios, el hook `saveAttendees`/mutación `remove` obsoletos y rutas alias duplicadas.

## 2. Objetivo de usuario
Como **administrador** quiero **que los botones se bloqueen mientras se procesa la acción y que la paginación no parpadee** para **evitar bajas/altas duplicadas** (y, como equipo, reducir superficie de código sin uso).

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Dependencias | `frontend/package.json:19` | `"@tanstack/react-query": "^5.0.0"` |
| Frontend página | `frontend/src/pages/admin/AdminSociosPage.jsx:302,309,312` | `disabled={baja.isLoading}`, `{baja.isLoading ? 'Procesando...' : 'Confirmar Baja'}` → siempre `undefined` en v5: el botón nunca se bloquea ni muestra "Procesando..." |
| Frontend página | `frontend/src/pages/admin/AdminSociosPage.jsx:326` | `isLoading={create.isLoading \|\| patch.isLoading \|\| certificado.isLoading}` hacia `SocioFormModal` → el formulario no se bloquea al guardar |
| Frontend hook | `frontend/src/hooks/queries/useSociosData.js:55` | `keepPreviousData: true` en `useQuery` (ignorado en v5; correcto: `placeholderData: keepPreviousData` importado de `@tanstack/react-query`) |
| Frontend hook | `frontend/src/hooks/queries/useSociosData.js:128-140` | `remove` (DELETE duro) marcado `@deprecated`; verificar usos antes de borrar (`rg "\.remove\b\|remove\("` en `frontend/src`; no verificado) |
| Código muerto | `frontend/src/App.jsx:16,40,141-143` | `import ComingSoonPage`, `const COMING_SOON_PATHS = []` y el `map` sobre él: ninguna ruta lo monta |
| Código muerto | `frontend/src/pages/ComingSoonPage.jsx:5-11` y `ComingSoonPage.test.jsx` | `PAGE_LABELS` con rutas que hoy redirigen (`/socios`, `/membresias`, `/clases`, `/reportes`, `/configuracion`) |
| Código muerto | `frontend/src/services/api.js:91-94` | `if (currentToken?.startsWith('mock-')) return Promise.reject(error)`: nada en `frontend/src` genera tokens `mock-` (verificado con `rg "mock-"`; solo aparecen tests) |
| Código obsoleto | `frontend/src/hooks/queries/useClassAttendees.js:61-65` | `saveAttendees = fetchAttendees` "kept for API compatibility with ClassAttendeesModal" |
| Rutas alias | `frontend/src/App.jsx:78-80,94-96,112,122-127,137-138` | `/clases` (redirige por rol), `/clases/crear`, `/clases/asistencia`, `/membresias`, `/socios`, `/reportes` (legacy) y duplicados `/recepcion/reportes`+`/admin/reportes`, `/configuracion`+`/admin/configuracion` |
| Estilo (menor) | `frontend/src/pages/ProfilePage.jsx:267,286` | Color de marca `'#ff5a36'` hardcodeado en handlers `onFocus` (con comentario) en lugar del token Tailwind `primary` (menor) |

## 4. Alcance
**Incluye:** reemplazar `isLoading` por `isPending` en mutaciones; `placeholderData: keepPreviousData`; auditoría (`rg`) de otros usos de la API v4 (`onSuccess` de `useQuery`, `cacheTime`, `isInitialLoading` no verificado); eliminar `ComingSoonPage` + test + `COMING_SOON_PATHS`; eliminar la rama `mock-`; decidir qué rutas alias se mantienen (conservar los redirects legacy **con** `search`, ver BK-BUG-04) y fusionar duplicados con un único path canónico.
**No incluye:** cambios de comportamiento de negocio, migrar a otra librería de estado, rediseño de navegación.

## 5. Contrato de API
Sin cambios.

## 6. Modelo de datos
Sin cambios.

## 7. Diseño frontend
- **Ruta/guard:** canónicas: `/admin/reportes` (staff) y `/admin/configuracion` (admin); mantener `/recepcion/reportes` solo si el bottom nav del recepcionista lo usa (hoy sí: `AppBottomNav.jsx:19-20`, `Sidebar.jsx:38`) → primero apuntar esos enlaces a `/admin/reportes` y luego dejar `/recepcion/reportes` como redirect que preserve search.
- **`AdminSociosPage.jsx`:** usar `baja.isPending`, `create.isPending || patch.isPending || certificado.isPending`.
- **`useSociosData.js`:** `import { keepPreviousData } from '@tanstack/react-query'` y `placeholderData: keepPreviousData`.
- **Estados:** botón en loading con texto "Procesando..." (ya previsto en el JSX).
- **Textos:** sin cambios.
- **Responsive:** n/a.

## 8. Archivos a crear / modificar
- `frontend/src/pages/admin/AdminSociosPage.jsx`, `frontend/src/hooks/queries/useSociosData.js`.
- Borrar: `frontend/src/pages/ComingSoonPage.jsx`, `frontend/src/pages/ComingSoonPage.test.jsx`; editar `frontend/src/App.jsx` (import, constante y bloque `COMING_SOON_PATHS.map`).
- `frontend/src/services/api.js` (rama `mock-`) y su test si existe (`frontend/src/services/__tests__` — verificar).
- `frontend/src/hooks/queries/useClassAttendees.js` (`saveAttendees`) y `ClassAttendeesModal.jsx` si lo consume.

## 9. Plan de pruebas (TDD)
Vitest + RTL (`cd frontend && npx vitest run`; coverage gates en CI: `npx vitest run --coverage`, umbrales lines/branches/statements 68 y functions 65 en `frontend/vite.config.js:19-23`; el lint corre con `--max-warnings 0`):
- `AdminSociosPage`: con la mutación `baja` en `isPending`, el botón "Confirmar Baja" está `disabled` y muestra "Procesando..." (mockear `useSocioMutations` devolviendo `{ baja: { isPending: true, mutateAsync } , ...}`); el modal de socio recibe `isLoading` verdadero durante `create/patch`.
- `useSociosList`: al cambiar de página, `data` previa se mantiene (`isPlaceholderData === true`) hasta que llega la nueva.
- Tras borrar `ComingSoonPage`, la suite y `npm run build` siguen verdes; `rg ComingSoon frontend/src` sin resultados.
- Interceptor `api.js`: un 401 con token que empieza con `mock-` ya no se trata distinto (test que lo documente o eliminar el caso).
Manual: `admin@winnie.local` → Socios → dar de baja a uno → el botón queda deshabilitado hasta la respuesta; paginar sin parpadeo del listado.

## 10. Criterios de aceptación
- **Dado** una baja en curso **entonces** el botón de confirmar está deshabilitado y muestra "Procesando...".
- **Dado** la paginación del listado de socios **entonces** se mantienen las filas anteriores hasta cargar la nueva página.
- **Dado** el repo **entonces** no existen `ComingSoonPage`, `COMING_SOON_PATHS` ni la rama `mock-`, y `npm run lint` / `npx vitest run` / `npm run build` pasan.

## 11. Riesgos y decisiones abiertas
1. Los tests existentes mockean `isLoading` en mutaciones (verificado en `frontend/src/pages/admin/AdminSociosPage.handlers.test.jsx:89-92`): hay que actualizarlos a `isPending`.
2. ¿Se puede borrar la rama `mock-`? Recomendación: sí, salvo que el dueño tenga un flujo de demo fuera del repo (no verificado).
3. ¿Mantener rutas legacy? Recomendación: sí, con redirect que preserve query (BK-BUG-04), y revisión en un sprint.

## 12. Referencias
Guía de migración de TanStack Query v5 (isLoading→isPending, keepPreviousData→placeholderData). `CHANGELOG.md`. Relacionados: BK-BUG-04, BK-BUG-07.

## 13. Prompt listo para un agente de IA
> Repo Winnie The Gym (React 18, `@tanstack/react-query` ^5). Limpiá deuda: (1) en `frontend/src/pages/admin/AdminSociosPage.jsx:302-326` reemplazá `baja.isLoading`, `create.isLoading`, `patch.isLoading`, `certificado.isLoading` por `isPending` (en v5 las mutaciones no tienen `isLoading`); (2) en `frontend/src/hooks/queries/useSociosData.js:55` reemplazá `keepPreviousData: true` por `placeholderData: keepPreviousData` (import desde `@tanstack/react-query`); (3) buscá con `rg` otros usos de API v4 y corregilos; (4) borrá `frontend/src/pages/ComingSoonPage.jsx`, su test, el import, `COMING_SOON_PATHS` y el `map` en `App.jsx`; (5) eliminá la rama `mock-` de `frontend/src/services/api.js:91-94` (nada genera esos tokens). TDD: primero tests de `AdminSociosPage` (botón deshabilitado con `isPending: true`) y de `useSociosList` (`isPlaceholderData`), actualizando los mocks de los tests existentes. No toques los archivos con cambios sin commitear del dueño (`frontend/src/hooks/queries/usePlanes.test.jsx`, `frontend/src/hooks/useScreenWakeLock.js`). Terminado cuando `cd frontend && npx vitest run && npm run lint && npm run build` pasan. Sin commits.
