---
id: BK-PLT-13
titulo: Visor de auditoría para administradores (quién cambió qué)
tipo: feature
roles: [administrador]
prioridad: P2
tamano: L
estado_en_codigo: backend-sin-ui
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-PLT-12]
---

# BK-PLT-13 · Visor de auditoría para administradores

## 1. Resumen
El backend ya escribe un trail de auditoría en MongoDB (`audit_logs`) con snapshot, diff por campo, actor y `request_id`, pero no existe ningún endpoint ni pantalla para leerlo: solo se puede consultar entrando a la base. La iteración anterior lo dejó explícitamente diferido. Sin el fix de BK-PLT-12 el actor sale como `system` en cambios hechos por API, así que esa ficha va primero.

## 2. Objetivo de usuario
Como **administrador** quiero **buscar y ver el historial de cambios (quién, cuándo, qué campo, valor anterior/nuevo)** para **investigar errores o disputas de pagos, planes y socios**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend escritura | `backend/apps/common/audit.py:138-157,164-171` | `_dispatch` + `_AUDITED_MODELS` (`Socio`, `PlanMembresia`, `Membresia`, `Clase`, `User`, `Pago`). Payload: `timestamp` (ISO UTC con `Z`), `action` (`create`/`update`/`delete`), `model` (`app_label.model_name`), `instance_id`, `object_id`, `snapshot` (dict), `actor_id`, `actor_user_id`, `actor_email`, `actor_rol`, `request_id`, `diff` (solo en update: `{campo: {old, new}}`). |
| Backend Mongo | `backend/core/mongodb.py:46-87` | `get_collection(name)`, `log_audit_event(payload)` (solo escritura; no hay función de lectura). |
| Backend índices | `backend/apps/common/management/commands/create_mongo_indexes.py:49-58` | `audit_logs`: `timestamp desc`, `actor_id`, `action`, `model` + TTL (`audit_logs_ttl`) de `MONGO_RETENTION_DAYS` (default 90 días; `render.yaml`: `"90"`). |
| Backend API | `rg -i "audit_logs" backend/apps --glob '*views.py'` | Sin resultados: ninguna vista lee `audit_logs` (verificado). |
| Backend permisos | `backend/apps/access/permissions.py:35-46` | `IsAdminOnly` disponible. |
| Frontend | `frontend/src/components/layout/Sidebar.jsx:12-31` | Sin ítem de auditoría. `rg -il "audit" frontend/src` no devuelve ningún archivo (verificado): no hay página ni servicio. |
| Specs | `speckit/proposal.md:35` | "UI para logs de auditoría MongoDB — se escriben pero no se exponen; deferido a follow-up". Clasificación: (b) planificado/diferido, no construido. |
| Docs | `README.md:56,488` | Prometen "Logs de auditoría… trazabilidad completa" y "auditoría" como capacidad del admin. |
| Tests existentes | `backend/apps/common/tests/test_audit.py`, `test_audit_diff.py` | Cubren escritura contra Mongo real. |

## 4. Alcance
**Incluye:** endpoint de solo lectura paginado con filtros (modelo, acción, actor, rango de fechas, `instance_id`), pantalla admin con tabla y detalle expandible del diff, enlace desde modales de socio/plan ("Ver historial") opcional.
**No incluye:** edición/borrado de logs, exportación (idea posterior; el módulo de reportes `apps/reports` ya exporta CSV/PDF/XLSX), auditoría de lecturas, retención configurable desde UI, `qr_history`.

## 5. Contrato de API (propuesta, **[A CREAR]**)
`GET /api/auditoria/` — `IsAdminOnly`. Mongo no usa el paginador DRF por defecto (`PageNumberPagination`, `PAGE_SIZE=10`, `core/settings/base.py:181-182`); para mantener el mismo shape se implementa una paginación manual con `page` y `page_size` (máx. 100) devolviendo `{count, next, previous, results}`.
Query: `model` (p. ej. `memberships.planmembresia`), `action` (`create|update|delete`), `actor_id`, `instance_id`, `desde`, `hasta` (ISO 8601), `page`, `page_size`. Orden fijo `timestamp desc` (índice existente).
Item de `results`: `{id (str del _id), timestamp, action, model, instance_id, actor_id, actor_email, actor_rol, request_id, diff (objeto o null), snapshot (objeto)}`. Excluir `_id` de Mongo serializándolo a string.
Errores: 400 `{"desde": ["Formato de fecha inválido."]}` (estilo DRF por campo); 403 `{"detail": "..."}` para no admin; si Mongo no está disponible → 503 `{"detail": "El servicio de auditoría no está disponible."}` (hoy `get_collection` puede lanzar; el health check trata Mongo como no crítico, `core/urls.py`).
Seguridad: `snapshot` puede contener datos personales (DNI, teléfono) y, para `User`, campos como `password` (hash) porque `model_to_dict` serializa todos los campos (`audit.py:_serialize`): **redactar `password` y `google_id` al leer** (y mejor al escribir; ver riesgos).

## 6. Modelo de datos
Sin cambios en Postgres. Opcional: índice compuesto `(model, instance_id, timestamp)` en `create_mongo_indexes.py` para el filtro por instancia.

## 7. Diseño frontend
- **Ruta:** `/admin/auditoria` con `<ProtectedRoute roles={['administrador']}>` (patrón `App.jsx:105,109`) + ítem "Auditoría" en `NAV_BY_ROLE.administrador` (`Sidebar.jsx`, icono nuevo en `constants/navIcons.js`, p. ej. `ScrollText` de `lucide-react`).
- **Página:** `pages/admin/AdminAuditoriaPage.jsx` con `AppLayout` + `TopBar`; filtros con `FilterPanel`/`Select`/`SearchBar` (`components/ui`); tabla con `DataTable` (`components/ui/DataTable.jsx`) y `Pagination`; fila expandible con el diff ("campo: antes → después").
- **Servicio y hook:** `services/auditService.js` (`api.get('/auditoria/', { params })`) y `hooks/queries/useAuditoria.js` con `useQuery({ queryKey: ['auditoria', params], queryFn, placeholderData: keepPreviousData })` (convención de `useGymConfig.js`).
- **Estados:** skeleton (`Skeleton`), vacío con `EmptyState` ("No hay eventos para esos filtros"), error (toast `sonner`; si 503 mensaje específico), éxito.
- **Textos (es-AR):** "Auditoría", "Quién", "Qué", "Cuándo", "Antes", "Después", "Sistema" para `actor_rol=system`.
- **Responsive:** a 375 px lista de tarjetas (una por evento); a 768 px tabla con scroll horizontal.

## 8. Archivos a crear / modificar
Backend: `apps/common/views.py` (`AuditLogListView`) o app nueva `apps/audit`; `serializers.py` (serializer no-model para dicts de Mongo); `urls.py`; ruta en `core/urls.py`; función `list_audit_events(filters, page, page_size)` en `core/mongodb.py`; tests. Frontend: página, servicio, hook, ruta, sidebar, tests.

## 9. Plan de pruebas (TDD)
- Backend (pytest, Mongo real como `test_audit.py:14-35` con limpieza de colección): admin lista con paginación y orden; filtros `model`, `action`, `actor_id`, rango; recepcionista y socio → 403; sin token → 401; `password` redactado en `snapshot` de `auth.user`/`users.user`; fecha inválida → 400; Mongo caído (patch `get_collection` con excepción) → 503. Correr `cd backend && pytest apps/common -q`.
- Frontend (Vitest/RTL): render de filas con datos mockeados (`vi.mock('../../services/auditService')`), filtros llaman al servicio con parámetros, vacío y error.
- Manual: con admin, cambiar el precio de un plan y verlo en la pantalla con su email como actor (requiere BK-PLT-12).

## 10. Criterios de aceptación
- **Dado** un cambio de precio de un plan **cuando** el admin abre Auditoría y filtra por `memberships.planmembresia` **entonces** ve la fila con actor, fecha y `precio: 1500.00 → 2000.00`.
- **Dado** un recepcionista **cuando** abre `/admin/auditoria` **entonces** ve 403 (BK-PLT-02) y la API responde 403.
- **Dado** un snapshot de usuario **cuando** se lista **entonces** no aparece el hash de contraseña.

## 11. Riesgos y decisiones abiertas
- Retención de 90 días por TTL (`MONGO_RETENTION_DAYS`): ¿alcanza para auditoría? **Recomendación:** documentarlo en la pantalla ("se conservan 90 días") o subirlo a 365.
- El snapshot guarda datos personales y el hash de contraseña en Mongo: decisión de privacidad (redactar al escribir en `audit.py::_serialize` es lo correcto; no verificado con el dueño).
- Mongo Atlas M0 sin backups (`docs/deploy.md:202`) → ver BK-PLT-16.
- Rendimiento: filtro por `actor_id`/`model`/`timestamp` cubierto por índices simples; consultas combinadas podrían necesitar índice compuesto.

## 12. Referencias
- `speckit/proposal.md:35`, `CHANGELOG.md:127`, `README.md:56`, `docs/qa/plan-de-pruebas.md:73`.
- Relacionados: BK-PLT-12, BK-PLT-09.

## 13. Prompt listo para un agente de IA
```
Contexto: Django 5 + DRF; la auditoría escribe en Mongo (apps/common/audit.py → core/mongodb.py::log_audit_event, colección audit_logs) pero no hay lectura. Frontend React + react-query + Tailwind (patrón: services/ + hooks/queries/ + pages/admin/).
Prerequisito: BK-PLT-12 (actor correcto). 
Tarea (docs/backlog/items/BK-PLT-13-visor-de-auditoria-admin.md): TDD primero (permisos IsAdminOnly, filtros, paginación {count,next,previous,results}, redacción de password/google_id, 503 si Mongo cae; tests de la página). Implementá GET /api/auditoria/, la lectura en core/mongodb.py, y en frontend pages/admin/AdminAuditoriaPage.jsx + services/auditService.js + hooks/queries/useAuditoria.js, ruta /admin/auditoria (roles ['administrador']) y entrada en Sidebar. Copy es-AR (voseo).
Terminado: `cd backend && pytest -q` (>=80%) y `cd frontend && npm run lint && npx vitest run --coverage` verdes.
```
