---
id: BK-SOC-07
titulo: ABM de socios (admin): email invisible/no editable, sin "Reactivar", DELETE peligroso, validaciones inconsistentes y estados de carga rotos
tipo: deuda-tecnica
roles: [administrador, recepcionista]
prioridad: P1
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-SOC-08]
---

# BK-SOC-07 · ABM de socios (admin): contrato, reactivación y validaciones

## 1. Resumen
El ABM de `/admin/socios` funciona en el camino feliz (listar, buscar, filtrar por estado/certificado, ordenar, crear, editar, dar de baja) pero tiene huecos concretos: el **email** del socio no se devuelve ni se puede corregir; no hay forma explícita de **reactivar** un socio dado de baja (solo editando el select de estado); el endpoint `DELETE` borra en duro y puede devolver 500; las reglas de **DNI/teléfono** difieren en cuatro lugares; y los hooks usan APIs de react-query v4 que en la v5 instalada no existen (los botones nunca se deshabilitan "procesando").

## 2. Objetivo de usuario
Como **administrador** quiero **corregir el email de un socio, reactivar a quien volvió y no poder borrar socios por accidente, con validaciones claras** para **mantener limpia la base de socios sin intervenir en la base de datos**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Estados reales | `backend/apps/members/models.py:9-12` | `Socio.Estado`: `activo`, `suspendido`, `baja`. **"Vencido" y "Pendiente" no son estados de Socio**: son de `Membresia` (`memberships/models.py:29-34`: `activa, vencida, suspendida, cancelada, pendiente_pago`). La UI de socios (`SocioColumns.jsx:57-62`, `FilterPanel.jsx:51-56`, `SocioFormModal.jsx:221-223`, `SocioDetailModal.jsx:257-259`) usa solo los 3 correctos: **sin inconsistencia de estados**; el hueco es que el listado no muestra el estado de la membresía. |
| Modelo invariante | `backend/apps/members/models.py:38-42` | `save()`: si `estado==baja` fija `fecha_baja=hoy` (si no hay), si no, `fecha_baja=None` ⇒ reactivar por PATCH `estado=activo` funciona y limpia la fecha. |
| Serializer email | `backend/apps/members/serializers.py:16-19,90-92` | `email = EmailField(write_only=True, required=False)`; `update()` hace `validated_data.pop('email', None)`: **no se devuelve y se ignora al editar**. |
| Serializer usuario | `backend/apps/members/serializers.py:12-15,23-24` | `usuario` es `PrimaryKeyRelatedField` escribible: un admin puede enlazar cualquier `User` (incluido staff) sin pasar por `validate_email`. `fecha_baja` es escribible pero `save()` la pisa. |
| Vista DELETE | `backend/apps/members/views.py:33-34,44-45` | `ModelViewSet` completo: `destroy` habilitado (`IsAdminOnly`). `Membresia.socio` es `CASCADE` (`memberships/models.py:37-39`), `Pago.socio` es `PROTECT` (`payments/models.py:21-25`) ⇒ borrar un socio con pagos lanza `ProtectedError` (sin `EXCEPTION_HANDLER` en `base.py:174-189` ⇒ 500); sin pagos, borra el historial de membresías y deja al `User` huérfano. **Sin tests** (`rg destroy` en `members/tests`: 0). |
| Vista baja | `backend/apps/members/views.py:51-69`, `services.py:48-56` | `POST /{id}/dar-baja/` (admin) idempotente salvo 400 si ya está en baja. **No existe** acción inversa. No cancela membresías activas ni toca `User.is_active` (`openspec/.../spec.md:343` lo exige así). |
| Stats | `backend/apps/members/views.py:77-88` | `{total, activos, con_certificado, bajas}`; **no devuelve `suspendidos`** aunque `frontend/src/services/sociosService.js:30-31` lo documenta. |
| Búsqueda/orden | `backend/apps/members/views.py:36-41` | `search_fields=['nombre','apellido','dni','numero_socio']` (no email ni teléfono); `ordering_fields=[apellido,nombre,numero_socio,created_at,estado,dni]`; paginación `SocioPagination` `page_size=10`, `page_size_query_param='page_size'`, `max=100`. |
| Validaciones | `frontend/src/components/admin/SocioFormModal.jsx:64` / `CompleteProfilePage.jsx:15` / `RegisterPage.jsx:18` / `gestionSocios.schema.js:6` / backend | DNI: **7–10** dígitos (admin) vs **7–8** (perfil, registro) vs **7–12 sin regex** (recepción) vs backend **sin validación de formato** (`CharField(max_length=20, unique=True)`). Teléfono: backend **obligatorio** (`models.py:22`), el form admin lo trata como opcional (`SocioFormModal.jsx:183-193`, envía `''` ⇒ 400 "This field may not be blank."/traducido), `ProfilePage.jsx:21` exige mín. 8, `RegisterPage.jsx:19` lo declara opcional y envía `telefono: values.telefono \|\| ''` (`:55`) a `complete-profile`, que lo exige ⇒ registrarse sin teléfono crea la cuenta, devuelve 400 y deja al usuario en `/completar-perfil` tras un toast de error. |
| Mensajes en inglés | `backend/apps/users/serializers.py:47` | `ProfileCompleteSerializer.validate_dni`: `'This DNI is already registered.'`. |
| Edición form | `frontend/src/components/admin/SocioFormModal.jsx:36` | `email: socioToEdit.email || ''` ⇒ siempre vacío (el backend no lo envía); si el admin escribe uno, el backend lo ignora sin avisar. |
| Hooks v5 | `frontend/src/hooks/queries/useSociosData.js:55` | `keepPreviousData: true` (opción removida en TanStack Query v5; instalado `5.104.0`, `frontend/package.json:19`): al paginar la tabla vuelve a skeleton en cada página. Debe ser `placeholderData: keepPreviousData`. |
| Hooks v5 | `frontend/src/pages/admin/AdminSociosPage.jsx:302,309,312,326` | `baja.isLoading`, `create.isLoading || patch.isLoading || certificado.isLoading`: en v5 las mutaciones exponen `isPending`; `isLoading` es `undefined` ⇒ el botón "Procesando..." nunca aparece y el submit del modal nunca queda en `loading` (doble click ⇒ doble request). |
| Acciones fila | `frontend/src/pages/admin/AdminSociosPage.jsx:254-267` | El botón "Dar de baja" se oculta si `estado === 'baja'`; **no hay botón "Reactivar"**; el único camino es Editar → select Estado. Sin acción "Suspender" con motivo. |
| Edición masiva | `frontend/src/` | **No existe** (sin selección múltiple ni acciones en lote). |
| Detalle | `frontend/src/components/admin/SocioDetailModal.jsx:24-28` | Pestañas `Datos / Membresías / Pagos`; no muestra email, estado de la membresía vigente ni acciones (baja/reactivar). |

## 4. Alcance
**Incluye:** exponer y permitir corregir `email` (con validación de unicidad y rol); acción `reactivar` (endpoint + botón); inhabilitar `DELETE` físico; unificar validación de DNI/teléfono en un único módulo frontend y en backend; `suspendidos` en stats; buscar por email/teléfono; arreglar `isLoading/keepPreviousData` para v5; columna/Badge de membresía en el listado (usa `?` ver §5); mensajes en español.
**No incluye:** edición masiva y exportación (se dejan como decisión abierta/`solo-idea`); campos nuevos del socio (→ BK-SOC-10); efectos de `suspendido/baja` fuera de acceso (→ BK-SOC-08); notas internas y auditoría (→ BK-SOC-12).

## 5. Contrato de API
**[EXISTE → CAMBIA] `GET /api/members/socios/` y `/{id}/`** (`IsReceptionistOrAdmin`) — `SocioSerializer` agrega `email` de **lectura** (`source='usuario.email'`) manteniéndolo escribible en create/update. Campos resultantes: `id, usuario, email, numero_socio, nombre, apellido, dni, telefono, certificado_medico_url, estado, fecha_baja, observaciones, created_at`. Búsqueda: `search_fields += ['usuario__email', 'telefono']`.
**[EXISTE → CAMBIA] `PATCH /api/members/socios/{id}/`** (`IsAdminOnly`) — si llega `email`: validar con `validate_email` (ya impide emails de staff y duplicados, `serializers.py:40-59`), actualizar `User.email` **y** `User.username` (en este proyecto `username=email`, `users/models.py:11-13`), error `400 {"email":["Este email ya está asociado a otro socio."]}`. Si el `User` tiene `google_id`, rechazar con `400 {"email":["La cuenta está vinculada a Google; no se puede cambiar el email."]}` (decisión §11).
**[A CREAR] `POST /api/members/socios/{id}/reactivar/`** — `IsAdminOnly`; sin body; pone `estado=activo` (el `save()` limpia `fecha_baja`); `400 {"detail":"El socio ya está activo."}`; 200 `SocioSerializer`. Servicio `reactivar(socio)` en `members/services.py` junto a `dar_baja`.
**[EXISTE → CAMBIA] `DELETE /api/members/socios/{id}/`** — responder `405` (excluir `destroy` del viewset: `http_method_names` o heredar de `mixins` sin `DestroyModelMixin`).
**[EXISTE → CAMBIA] `GET /api/members/socios/stats/`** — agregar `suspendidos`.
**Validación backend [A CREAR]:** `validate_dni` (solo dígitos, 7–8; documentar excepción para extranjeros), `validate_telefono` (dígitos, `+`, espacios y guiones; 8–20 caracteres normalizado), también en `ProfileCompleteSerializer` (mensajes en español).

## 6. Modelo de datos
Sin cambios de modelo (usa `User.email/username`). Si se acepta guardar `motivo` de baja/suspensión → BK-SOC-12.

## 7. Diseño frontend
- **Rutas/guard:** `/admin/socios` → `<ProtectedRoute roles={['administrador']}>` (`App.jsx:104-106`); `/socios` redirige a `/admin/socios` (`App.jsx:112`).
- **Convenciones:** react-query v5 (`isPending` en mutaciones, `placeholderData: keepPreviousData` importado de `@tanstack/react-query`), servicios en `services/sociosService.js`, hooks en `hooks/queries/useSociosData.js` (`useSocioMutations`), `sonner`, `lucide-react`, tabla `components/ui/DataTable.jsx` (props `columns, data, loading, ordering, onSort, onRowClick, renderActions, emptyTitle, emptyMessage`), `Pagination` (`currentPage, totalCount, pageSize, onPageChange`), `Modal` (`isOpen, onClose, title, description, icon, maxWidth`).
- **Cambios:**
  1. `useSociosData.js`: `placeholderData: keepPreviousData`; nueva mutation `reactivar` (`reactivarSocio(id)` en el servicio, toast "Socio reactivado").
  2. `AdminSociosPage.jsx`: reemplazar `*.isLoading` por `*.isPending`; en filas con `estado==='baja'` mostrar botón "Reactivar" (ícono `RotateCcw`) con modal de confirmación análogo al de baja; mostrar KPI "Suspendidos" (5 tarjetas o reemplazar "Con certificado" por el de apto cuando exista BK-SOC-06).
  3. `SocioFormModal.jsx`: el campo Email pasa a precargarse (ahora el backend lo devuelve) y se envía solo si cambió; error inline por campo `email/dni/telefono` leyendo `err.response.data` (hoy solo hay toast concatenado); `telefono` marcado obligatorio (`*`).
  4. Nuevo `frontend/src/constants/validation.js` (o `utils/`) con `DNI_REGEX`, `TELEFONO_REGEX` y mensajes; importarlo desde `SocioFormModal`, `CompleteProfilePage`, `RegisterPage`, `gestionSocios.schema.js`, `ProfilePage`.
  5. `SocioDetailModal.jsx`: mostrar email y estado, y acciones Baja/Reactivar para admin.
- **Estados de UI:** skeleton (`DataTable loading`), vacío (ya existe), error de carga del listado (**hoy no hay**: agregar `isError` con `EmptyState` + "Reintentar"), éxito por toast.
- **Textos:** "Reactivar socio", "¿Reactivar a Ana González? Volverá a figurar como activo; su membresía no cambia.", "El email ya está asociado a otro socio.".
- **Responsive:** la tabla ya es `overflow-x-auto`; a 375 px las acciones se apilan: revisar que los tres íconos no se solapen.

## 8. Archivos a crear / modificar
- `backend/apps/members/{serializers,views,services,filters}.py`, `backend/apps/users/serializers.py` (mensaje DNI), tests nuevos en `backend/apps/members/tests/`.
- `frontend/src/{services/sociosService.js,hooks/queries/useSociosData.js,pages/admin/AdminSociosPage.jsx,components/admin/{SocioFormModal,SocioDetailModal}.jsx,constants/validation.js,pages/{CompleteProfilePage,RegisterPage,ProfilePage}.jsx,pages/recepcion/gestionSocios.schema.js}` y sus tests.

## 9. Plan de pruebas (TDD)
**Backend** (`test_socios_views.py`, `APITestCase`, `make_user_factory`/`make_socio_factory`, helper `_auth_client`): 
- `test_get_devuelve_email`; `test_patch_email_actualiza_user_y_username`; `test_patch_email_de_staff_400`; `test_patch_email_duplicado_400`; `test_patch_email_google_400` (user con `google_id`).
- `test_reactivar_baja_200_limpia_fecha_baja`; `test_reactivar_activo_400`; `test_reactivar_recep_403`; `test_reactivar_sin_auth_401`.
- `test_delete_socio_405` (y no existe borrado en cascada).
- `test_dni_no_numerico_400`, `test_telefono_invalido_400`; `test_stats_incluye_suspendidos`; `test_search_por_email`.
Comando: `cd backend && pytest -q apps/members`.
**Frontend** (`SocioFormModal.test.jsx`, `SocioColumns.test.jsx`, `useSociosData.test.jsx` en `hooks/__tests__/`, nueva `AdminSociosPage.test.jsx`; `vi.mock('../hooks/queries/useSociosData')`): precarga de email; botón Reactivar solo en filas `baja` y llama la mutation; botón "Confirmar Baja" `disabled` mientras `isPending`; DNI inválido muestra el mensaje compartido; `placeholderData` evita el skeleton al cambiar de página (verificar que `isPlaceholderData` mantiene filas).
Comando: `cd frontend && npx vitest run src/components/admin src/hooks src/pages && npm run lint`.
**Manual:** admin (`admin@winnie.local`, seed) → dar de baja a `socio.nuevo@winnie.local` → fila con "Reactivar" → reactivar → estado Activo y `fecha_baja` vacía; editar email y verificar login con el nuevo.

## 10. Criterios de aceptación
- **Dado** un socio **cuando** el admin abre "Editar" **entonces** ve su email actual y puede cambiarlo; un email ya usado devuelve error en el campo.
- **Dado** un socio en baja **cuando** el admin pulsa "Reactivar" y confirma **entonces** `estado=activo` y `fecha_baja=null`.
- **Dado** `DELETE /api/members/socios/{id}/` **entonces** 405 (nunca 500).
- **Dado** un DNI o teléfono inválido **entonces** el mismo mensaje aparece en admin, perfil, registro y recepción.
- Los botones de confirmación quedan deshabilitados mientras la mutation está pendiente; paginar no parpadea.

## 11. Riesgos y decisiones abiertas
1. ¿Se permite cambiar el email de cuentas con Google? (Recomendado: no.)
2. ¿Formato de DNI: solo 7–8 dígitos o admitir pasaportes/extranjeros? (Recomendado: 7–8 dígitos hoy; revisar si hay socios extranjeros.)
3. ¿Reactivar debe reactivar también la membresía? (Recomendado: no; la renovación pasa por cobro.)
4. ¿Edición masiva (suspender/exportar CSV)? (**solo-idea**; recomendado diferir hasta tener demanda; la exportación podría vivir en el módulo de reportes.)
5. `DELETE` físico: ¿se necesita para casos legales (supresión)? (Recomendado: management command auditado, no endpoint.)

## 12. Referencias
- `openspec/changes/socios-membresias/spec.md` (CRUD socio, dar de baja `soft delete`).
- `docs/database/schema.dbml:42-60` (tabla `members_socio`).
- Auditoría de ABM por Mongo: `backend/apps/common/audit.py` (registra cambios de `Socio`).
- Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", Admin → Socios.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1/DRF; React 18 + @tanstack/react-query 5.104). Tarea: endurecer el ABM de socios (/admin/socios).
Verificado: (a) SocioSerializer (backend/apps/members/serializers.py) tiene email write_only y update() lo descarta -> SocioFormModal.jsx:36 siempre queda vacío; (b) no existe acción inversa a dar-baja; (c) DELETE /api/members/socios/{id}/ está habilitado y puede dar 500 (Pago.socio PROTECT) o borrar historial (Membresia CASCADE); (d) DNI se valida distinto en SocioFormModal (7-10), CompleteProfilePage/RegisterPage (7-8), gestionSocios.schema.js (7-12) y no en backend; (e) useSociosData.js:55 usa keepPreviousData (v4) y AdminSociosPage.jsx usa mutation.isLoading (en v5 es isPending).
TDD primero en backend/apps/members/tests/test_socios_views.py (APITestCase + make_user_factory/make_socio_factory): GET devuelve email; PATCH email actualiza User.email y username, rechaza emails de staff/duplicados/cuentas Google; POST /{id}/reactivar/ (IsAdminOnly) 200/400/403/401; DELETE 405; validate_dni (7-8 dígitos) y validate_telefono; stats con suspendidos; search por email. Luego implementá (services.reactivar junto a dar_baja, excluir destroy del viewset, serializers, filtros).
Frontend: constants/validation.js compartido; useSociosData -> placeholderData: keepPreviousData y mutation reactivar; AdminSociosPage -> isPending, botón "Reactivar" en filas baja con Modal de confirmación, error state del listado; SocioFormModal -> email precargado, teléfono obligatorio, errores por campo; actualizá/creá los tests (Vitest + RTL, vi.mock de hooks).
Terminado: cd backend && pytest -q apps/members verde; cd frontend && npx vitest run && npm run lint verdes. No toques BK-SOC-08 (reglas de negocio por estado). Sin commits.
```
