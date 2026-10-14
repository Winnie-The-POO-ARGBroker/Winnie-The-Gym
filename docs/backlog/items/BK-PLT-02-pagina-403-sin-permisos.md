---
id: BK-PLT-02
titulo: Pantalla 403 "Sin permisos" y manejo correcto de 403 de la API
tipo: ui-estado
roles: [administrador, recepcionista, socio]
prioridad: P2
tamano: M
estado_en_codigo: no-existe
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-PLT-02 · Pantalla 403 "Sin permisos" y manejo correcto de 403 de la API

## 1. Resumen
Cuando un usuario entra a una ruta que su rol no permite, `ProtectedRoute` lo redirige en silencio a su home sin explicar nada. Además, cuando la API responde 403 el frontend lo trata como "sesión expirada". No existe una pantalla 403 ni un mensaje coherente de "no tenés permiso".

## 2. Objetivo de usuario
Como **recepcionista o socio** quiero **que me digan que no tengo permiso para esa pantalla** para **entender por qué no puedo entrar en lugar de ser rebotado sin explicación**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Frontend guard | `frontend/src/components/routing/ProtectedRoute.jsx:9` | Sin `accessToken` → `<Navigate to="/login" replace />`. |
| Frontend guard | `frontend/src/components/routing/ProtectedRoute.jsx:16-19` | Si `roles` no incluye `user.rol` → `<Navigate to={home} replace />` con `home = '/socio/credencial'` para socio, `'/dashboard'` para el resto. Sin toast ni mensaje. |
| Frontend guard | `frontend/src/components/routing/PublicRoute.jsx:6-9` | Misma lógica de `home` para usuarios ya logueados en `/login`. |
| Frontend rutas | `frontend/src/App.jsx:84-138` | Rutas con `roles={['administrador']}` (`/admin/socios` :105, `/admin/usuarios` :109, `/configuracion` :137-138) y `['administrador','recepcionista']` (clases, planes, recepción). Un recepcionista que abre `/admin/socios` termina en `/dashboard`. |
| Frontend 404 | `frontend/src/pages/NotFoundPage.jsx` | Existe 404; no hay 403. `rg "Forbidden\|403" frontend/src/pages` sin página dedicada (verificado). |
| Frontend errores API | `frontend/src/utils/errorHandling.js:17-18` | `if (status === 401 \|\| status === 403)` → `ClassifiedError('auth','Sesión expirada')`. Un 403 de permiso se rotula "Sesión expirada". |
| Frontend hook | `frontend/src/hooks/queries/usePlanes.js:44-47` | `case 'auth'`: `toast.error('Sesión expirada'); navigate('/login')`. Con un 403 el usuario sigue logueado y `PublicRoute` lo devuelve a su home: loop confuso. |
| Frontend componente | `frontend/src/components/pagos/HistorialPagosCard.jsx:65-66` | Único lugar que distingue 403: "No tenés permiso para ver el historial de este socio." |
| Frontend WebSocket | `frontend/src/hooks/useWebSocket.js:110-114` | Código 4403 → `setError('No tienes permisos para acceder a esta información en tiempo real.')` (texto con tuteo, inconsistente con el voseo del resto). |
| Backend permisos | `backend/apps/access/permissions.py:4,22,35` | `IsReceptionistOrAdmin`, `IsSocio`, `IsAdminOnly`; DRF responde 403 `{"detail": "..."}` por defecto (formato de error DRF estándar). |
| Interceptor | `frontend/src/services/api.js:93-150` | Solo maneja 401; no hay manejo global de 403. |

## 4. Alcance
**Incluye:** página `ForbiddenPage` (403) reutilizable; `ProtectedRoute` renderiza la página (o redirige con toast, según decisión) cuando el rol no alcanza; separar 401 de 403 en `classifyError` (nuevo tipo `forbidden`); unificar copy (voseo) en el caso 4403 del WebSocket.
**No incluye:** permisos granulares (BK-PLT-09), cambios de backend, página 500 (BK-PLT-01).

## 5. Contrato de API
Sin endpoints nuevos. Contrato existente a respetar: respuesta 403 de DRF `{"detail": "<mensaje>"}` (en español para algunos casos, p. ej. `CompleteProfileView` devuelve `'Solo los socios pueden completar el perfil de socio.'`, `backend/apps/users/views.py`). [EXISTE]

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Rutas:** sin ruta nueva en la URL; `ProtectedRoute` renderiza `<ForbiddenPage/>` en el lugar. Opcional: ruta `/403` sin guard para enlaces internos.
- **Guard:** `ProtectedRoute({ children, roles })` (`ProtectedRoute.jsx:6`). Cambiar el bloque de `:16-19`: si `roles && user && !roles.includes(user.rol)` → `return <ForbiddenPage />` (sin redirect). Mantener intactos los casos de `/login` y `/completar-perfil`.
- **Componente nuevo:** `frontend/src/pages/ForbiddenPage.jsx` con `AppLayout` + `TopBar` (patrón de `ComingSoonPage.jsx`) o pantalla completa (patrón `NotFoundPage.jsx`); props opcionales `message`. Botón "Ir a mi inicio" que usa la misma regla de `home` (extraerla a `frontend/src/utils/homeForRole.js`, hoy duplicada en `ProtectedRoute.jsx:17` y `PublicRoute.jsx:7`).
- **Errores de API:** en `errorHandling.js` separar: `401` → `auth`; `403` → nuevo tipo `forbidden` con mensaje `error.response?.data?.detail ?? 'No tenés permiso para realizar esta acción'`. Ajustar `usePlanes.js:44-47` para que `forbidden` muestre `toast.error(...)` sin `navigate('/login')`.
- **Estados de UI:** solo estado estático. Icono `ShieldAlert` de `lucide-react`.
- **Textos (es-AR):** título "No tenés permiso para ver esta sección"; descripción "Tu rol (Recepcionista) no incluye acceso a esta pantalla. Si creés que es un error, pedíselo a un administrador."; botón "Ir a mi inicio".
- **Responsive:** 375 px una columna centrada; 768 px dentro de `AppLayout` con sidebar visible.

## 8. Archivos a crear / modificar
- Crear `frontend/src/pages/ForbiddenPage.jsx` + `ForbiddenPage.test.jsx`.
- Crear `frontend/src/utils/homeForRole.js` + test.
- Modificar `frontend/src/components/routing/ProtectedRoute.jsx`, `PublicRoute.jsx` (usar helper).
- Modificar `frontend/src/components/routing/ProtectedRoute.test.jsx` (casos 4 y 6 hoy esperan redirect: cambiar a esperar la página 403).
- Modificar `frontend/src/utils/errorHandling.js` y `frontend/src/utils/__tests__/errorHandling.test.js`.
- Modificar `frontend/src/hooks/queries/usePlanes.js` (case `forbidden`).
- Modificar `frontend/src/hooks/useWebSocket.js:113` (copy en voseo) y su test `hooks/__tests__/useWebSocket.test.jsx`.

## 9. Plan de pruebas (TDD)
Vitest + RTL; `vi.mock('../../hooks/useAuth', () => ({ default: vi.fn() }))` y `MemoryRouter` como en `ProtectedRoute.test.jsx` (casos existentes en líneas ~46-105 son la plantilla).
- `ProtectedRoute`: socio en ruta `roles=['administrador','recepcionista']` → texto "No tenés permiso" (antes esperaba `SocioHome`). Recepcionista en `roles=['administrador']` → idem. Admin con `roles=['socio']` → idem. Sin token → sigue yendo a `/login`.
- `errorHandling.test.js`: 403 → `type 'forbidden'`, 401 → `'auth'`.
- `ForbiddenPage`: botón "Ir a mi inicio" navega a `/dashboard` (staff) o `/socio/credencial` (socio).
- Manual: entrar con `recepcionista@winniegym.com` (seed `seed_demo_users`, ver `docs/deploy.md`) a `/admin/usuarios`; con un socio a `/recepcion/aforo`.
Comandos: `cd frontend && npx vitest run && npm run lint`.

## 10. Criterios de aceptación
- **Dado** un recepcionista **cuando** abre `/admin/usuarios` **entonces** ve la pantalla 403 con su rol nombrado y un botón a su inicio, sin redirección silenciosa.
- **Dado** un 403 de la API **cuando** responde `{"detail": "..."}` **entonces** el frontend muestra ese detalle y NO muestra "Sesión expirada" ni cierra sesión.
- **Dado** un token ausente **cuando** abre una ruta protegida **entonces** va a `/login` (sin cambios).

## 11. Riesgos y decisiones abiertas
- ¿Página 403 inline o redirect + toast? **Recomendación:** página inline (la URL queda visible y se evita el efecto de "salto").
- Los tests existentes que asumen el redirect se rompen a propósito: actualizarlos en el mismo PR.
- `/socio/credencial` permite `administrador` y `socio` (App.jsx:130); no cambiar esa regla aquí.

## 12. Referencias
- `frontend/src/components/routing/ProtectedRoute.test.jsx`, `frontend/src/pages/ComingSoonPage.jsx`.
- Relacionado: BK-PLT-09 (permisos granulares), BK-PLT-04 (sesión expirada).
- Figma (opcional): archivo `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", estados del sistema (No verificado).

## 13. Prompt listo para un agente de IA
```
Contexto: frontend React 18 + react-router-dom v7 + Vitest/RTL. ProtectedRoute (frontend/src/components/routing/ProtectedRoute.jsx líneas 16-19) hoy redirige en silencio si el rol no está en `roles`. errorHandling.js (líneas 17-18) trata 401 y 403 como 'Sesión expirada'.
Tarea (ver docs/backlog/items/BK-PLT-02-pagina-403-sin-permisos.md): TDD primero — actualizá ProtectedRoute.test.jsx para esperar la pantalla 403, agregá tests de errorHandling (403 → 'forbidden') y de ForbiddenPage. Luego creá pages/ForbiddenPage.jsx, utils/homeForRole.js, cambiá ProtectedRoute/PublicRoute para usarlos, agregá el tipo 'forbidden' en classifyError y ajustá usePlanes.js (sin navigate('/login') en 403). Copy en español rioplatense. Corregí el copy con tuteo de useWebSocket.js:113.
Terminado cuando: `cd frontend && npm run lint && npx vitest run --coverage` pasa (umbrales 68/68/65/68).
```
