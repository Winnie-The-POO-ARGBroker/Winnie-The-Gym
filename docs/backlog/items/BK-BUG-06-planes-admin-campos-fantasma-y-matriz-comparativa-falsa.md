---
id: BK-BUG-06
titulo: Planes: subtítulo, beneficios y matriz comparativa no existen en el backend (la UI los muestra/guarda igual) y borrar un plan con membresías devuelve 500
tipo: bug
roles: [administrador, recepcionista]
prioridad: P1
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-BUG-06 · Campos fantasma en Planes y matriz comparativa inventada

## 1. Resumen
El formulario de plan (`PlanFormModal`) envía `subtitulo`, `beneficios`, `matriz_comparativa` y `socios_activos`, pero `PlanMembresia` solo tiene `nombre, duracion_dias, precio, clases_asignadas, activo, es_popular`. DRF ignora lo demás: lo que el admin carga **se pierde al recargar**. Las tarjetas muestran "Membresía estándar" y ninguna lista de beneficios; la pestaña "Comparativa" se rellena con valores inventados según el **nombre** del plan (`Básico`/`Premium`/`Gold`). Además: el modal se cierra antes de saber si el guardado funcionó, el recepcionista ve botones de edición que el backend rechaza con 403, borrar un plan con membresías produce 500 y el listado ignora la paginación (PAGE_SIZE 10).

## 2. Objetivo de usuario
Como **administrador** quiero **que lo que cargo en un plan (beneficios, características) se guarde y se vea igual en tarjetas y comparativa** para **mostrar ofertas reales y no datos de ejemplo**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/memberships/models.py:8-16` | `PlanMembresia`: `nombre` (unique), `duracion_dias`, `precio`, `clases_asignadas`, `activo`, `es_popular`, `created_at`, `updated_at`. **No existen** `subtitulo`, `beneficios`, `matriz_comparativa` |
| Backend serializer | `backend/apps/memberships/serializers.py:13-28` | `PlanMembresiaSerializer.fields = ('id','nombre','duracion_dias','precio','clases_asignadas','activo','es_popular','socios_activos')`; `socios_activos` = `SerializerMethodField` (membresías `estado='activa'`); `duracion_dias` validada 30–365 |
| Backend vista | `backend/apps/memberships/views.py:29-40` | `PlanMembresiaViewSet(ModelViewSet)`; escritura (`create/update/partial_update/destroy`) → `IsAdminOnly`; lectura → `IsAuthenticated` |
| Backend modelo | `backend/apps/memberships/models.py:41-45` | `Membresia.plan = ForeignKey(..., on_delete=PROTECT)` y no hay `ProtectedError` handling ni `EXCEPTION_HANDLER` (`rg` en `backend/` sin resultados) → `DELETE` de plan con membresías = 500 (inferido; no ejecutado) |
| Backend config | `backend/core/settings/base.py:181-182` | `PageNumberPagination`, `PAGE_SIZE: 10` |
| Frontend ruta | `frontend/src/App.jsx:99-101` | `/admin/planes` → `roles=['administrador','recepcionista']` (el recepcionista ve la pantalla, pero no tiene entrada en su sidebar; el backend le niega escribir) |
| Frontend modal | `frontend/src/components/admin/PlanFormModal.jsx:19-41,52-74` | Estado inicial con `subtitulo`, 3 `beneficios` de ejemplo ("Pase libre al gimnasio"…), `matriz_comparativa` {pase_libre:'✔', reservas_clases:'Todas', entrenador_asignado:false, …, acceso_multisede:'1 sede', congelar_plan:'1 mes'} |
| Frontend modal | `frontend/src/components/admin/PlanFormModal.jsx:122-129` | `onSave({...formData, ..., socios_activos: formData.socios_activos \|\| (isDuplicate ? 0 : 15)})` — **15 inventado**; y luego `onClose()` inmediato (cierra aunque la mutación falle y descarta lo tipeado) |
| Frontend página | `frontend/src/pages/admin/AdminPlanesPage.jsx:25-27,29-35` | `handleSavePlan` también cierra en `onSuccess`; `handleDeletePlan` bloquea solo si `planes.length <= 1` (mensaje dice "al menos un plan activo", pero cuenta todos) |
| Frontend componente | `frontend/src/components/admin/PlanCard.jsx:38,56` | `plan.subtitulo \|\| 'Membresía estándar'`; `plan.beneficios?.map(...)` → siempre vacío con la API real |
| Frontend componente | `frontend/src/components/admin/PlanComparativeTable.jsx:13-73` | Siete filas con fallback por nombre: `plan.nombre === 'Básico' ? '3x/sem' : '✔'`, `'Todas + prioridad'`, `'2 sedes'`, `'2 meses'`… Colores por `plan.nombre === 'Gold'` (l.80-83,115-116) |
| Frontend componente | `frontend/src/components/admin/PlanDistributionChart.jsx:43-47,71-73` | Colores por nombre `Básico`/`Premium`/`Gold` |
| Frontend hook | `frontend/src/hooks/queries/usePlanesAdmin.js:14-24,33-39` | `GET /memberships/planes/` → `res.data.results ?? res.data` (solo página 1 de 10); `savePlan`: `PATCH` o `POST {...planData, activo:true}`; `extractErrorMessage` lee solo `detail`/`message` (los errores de campo `{"precio":[...]}` caen en "Error al guardar el plan") |

## 4. Alcance
**Incluye:** decidir y ejecutar la fuente de verdad de beneficios/matriz (ver 11.1), quitar valores inventados (`15`, fallbacks por nombre), cerrar el modal solo en éxito, manejar `ProtectedError` (400 con mensaje claro), paginación/`page_size` del listado admin, restringir las acciones de escritura a administrador en UI.
**No incluye:** rediseño visual de tarjetas/comparativa, precios por sede, descuentos, pasarela de pago (BK-FIN-xx).

## 5. Contrato de API
**[EXISTE]** `GET/POST /api/memberships/planes/`, `GET/PATCH/PUT/DELETE /api/memberships/planes/{id}/` (campos arriba). Filtros: `PlanMembresiaFilter` (`memberships/filters.py`, no revisado en detalle), búsqueda `nombre`, orden `nombre, precio, duracion_dias, created_at`.
**[A MODIFICAR] `DELETE`**: capturar `ProtectedError` en `PlanMembresiaViewSet.destroy` → `400 {"detail":"No se puede eliminar un plan con membresías asociadas. Archivalo en su lugar."}`.
**[A MODIFICAR — propuesta, opción A recomendada]** agregar al modelo/serializer `subtitulo` (CharField ≤120, blank) y `beneficios` (JSONField list de `{texto: str, incluido: bool}`, default `[]`). La matriz comparativa se **deriva** de `beneficios` (una fila por texto distinto) en lugar de tener 7 claves fijas. Opción B: eliminar subtítulo/beneficios/matriz de la UI hasta que el negocio los defina.

## 6. Modelo de datos
Opción A (propuesta): `PlanMembresia.subtitulo = CharField(max_length=120, blank=True, default='')`, `PlanMembresia.beneficios = JSONField(default=list, blank=True)`; migración `0002_...` en `apps/memberships/migrations/` (revisar la numeración vigente; no verificado). Sin tocar `Membresia`. Opción B: sin cambios de modelo.

## 7. Diseño frontend
- **Rutas/guard:** `/admin/planes` mantener acceso de lectura a recepcionista; ocultar "Nuevo plan", "Duplicar", "Editar", "Archivar", "Eliminar" si `user.rol !== 'administrador'` (`useAuth()` de `hooks/useAuth`).
- **`PlanFormModal.jsx`:** no enviar `socios_activos` (es read-only); quitar `onClose()` de `handleSubmit` (el cierre ya ocurre en `AdminPlanesPage.handleSavePlan.onSuccess`); mostrar errores de campo del backend (`err.response.data.precio` etc.) por campo; inicializar `beneficios` vacío (o con una sugerencia solo como placeholder), no con datos de ejemplo guardables. Escape/overlay ya cierran vía `Modal` (BK-BUG-09).
- **`PlanComparativeTable.jsx`:** construir filas desde `plan.beneficios` de todos los planes; sin fallbacks por nombre; colores por `plan.es_popular` / orden, no por `'Gold'`.
- **`usePlanesAdmin.js`:** pedir `?page_size=100` (o recorrer `next`) y extender `extractErrorMessage` para errores por campo (patrón de `hooks/queries/useSociosData.js:28-43`).
- **Estados:** loading (`loading` ya existe), vacío (`EmptyState` existe), error de guardado inline + toast, éxito toast (existente).
- **Textos:** "Plan creado exitosamente", "No se puede eliminar un plan con membresías asociadas. Archivalo en su lugar."
- **Responsive:** grilla de tarjetas `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` ya adapta a 375/768 px; la tabla comparativa usa `overflow-x-auto`.

## 8. Archivos a crear / modificar
- `backend/apps/memberships/models.py`, `serializers.py`, `views.py` (destroy), nueva migración y tests en `backend/apps/memberships/tests/`.
- `frontend/src/components/admin/PlanFormModal.jsx`, `PlanCard.jsx`, `PlanComparativeTable.jsx`, `PlanDistributionChart.jsx`, `frontend/src/pages/admin/AdminPlanesPage.jsx`, `frontend/src/hooks/queries/usePlanesAdmin.js`.
- Tests existentes a adaptar: `frontend/src/pages/admin/AdminPlanesPage.test.jsx`, `AdminPlanesPage.handlers.test.jsx`, `frontend/src/hooks/queries/usePlanes.test.jsx` (este último tiene cambios sin commitear del dueño: **no tocarlo**).

## 9. Plan de pruebas (TDD)
Backend (`cd backend && pytest apps/memberships -q`; fixtures `auth_client`, `make_plan`, `make_membresia`): `DELETE` de plan con membresía → 400 (no 500) con mensaje; `DELETE` sin membresías → 204; `POST/PATCH` con `beneficios` válido persiste y se devuelve (opción A); recepcionista y socio → 403 en escritura, 200 en lectura; `socios_activos` no es escribible.
Frontend (vitest + RTL, `renderWithProviders`): `PlanFormModal` no llama `onClose` al enviar, no envía `socios_activos`; la tabla comparativa no contiene valores sin origen en la API (render con planes sin `beneficios` → celdas vacías o estado "Sin datos"); recepcionista no ve botones de escritura. `cd frontend && npx vitest run src/pages/admin src/components/admin`.
Manual: `admin@winnie.local` → Planes → crear plan con 2 beneficios → recargar → siguen ahí; intentar borrar un plan con socios activos → mensaje claro.

## 10. Criterios de aceptación
- **Dado** un plan guardado con beneficios **cuando** se recarga la página **entonces** tarjeta y comparativa muestran los mismos beneficios.
- **Dado** un plan nuevo sin beneficios **entonces** la comparativa no muestra ✔/valores inventados.
- **Dado** un error de validación del backend **cuando** se guarda **entonces** el modal permanece abierto con el error junto al campo.
- **Dado** un plan con membresías **cuando** se elimina **entonces** se muestra un 400 amigable, no un error de servidor.
- **Dado** un recepcionista **entonces** no ve acciones de escritura.

## 11. Riesgos y decisiones abiertas
1. ¿Beneficios/matriz son requisito de producto? Recomendación: opción A mínima (`subtitulo` + `beneficios` JSON); si no, opción B (quitar de la UI).
2. ¿Eliminar vs. archivar? Recomendación: solo archivar (`activo=false`) cuando hay membresías (ya existe `toggleActive`).
3. Migración: planes existentes tendrán `beneficios=[]`; los seeds (`seed_demo_users`/`seed_data.py`) deberían poblarlos (no verificado dónde se siembran los planes).

## 12. Referencias
`docs/database/` (modelo de datos), `openspec/changes/` (buscar "planes"). Figma (opcional): "vistas live", Admin → Planes (Tarjetas y Comparativa). Relacionados: BK-BUG-08 (hardcodes), BK-FIN-xx.

## 13. Prompt listo para un agente de IA
> Repo Winnie The Gym. Problema: `frontend/src/components/admin/PlanFormModal.jsx` envía `subtitulo`, `beneficios`, `matriz_comparativa` y `socios_activos` (con un `15` inventado, l.127) pero `PlanMembresia` (`backend/apps/memberships/models.py:8`) no tiene esos campos, así que nada se persiste; `PlanComparativeTable.jsx` rellena celdas por nombre de plan (`Básico/Premium/Gold`); el modal se cierra antes de que termine la mutación; `DELETE` de un plan con membresías revienta (FK `PROTECT`, sin handler); `usePlanesQuery` solo trae la primera página. Implementá la opción A de la ficha: agregar `subtitulo` y `beneficios` (JSONField list `{texto, incluido}`) con migración, serializer y tests; derivar la comparativa de `beneficios`; manejar `ProtectedError` con 400 y mensaje; quitar `socios_activos` y `onClose()` del submit; paginar/`page_size` en el hook; ocultar acciones de escritura al recepcionista. TDD: primero tests en `backend/apps/memberships/tests/` y en `frontend/src/pages/admin/AdminPlanesPage.test.jsx`/`components/admin`. No modifiques `frontend/src/hooks/queries/usePlanes.test.jsx` (cambios del dueño sin commitear). UI en español rioplatense. Terminado cuando `cd backend && pytest apps/memberships -q` y `cd frontend && npx vitest run && npm run lint` pasan. Sin commits.
