---
id: BK-SOC-12
titulo: Detalle de socio para staff: pestaña Actividad, notas internas con autor e historial de cambios
tipo: feature
roles: [administrador, recepcionista]
prioridad: P2
tamano: L
estado_en_codigo: backend-sin-ui
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-ACC-01, BK-SOC-03, BK-SOC-07]   # BK-ACC: contrato/UX de historial de accesos
---

# BK-SOC-12 · Detalle de socio: actividad, notas internas e historial de cambios

## 1. Resumen
El detalle del socio (`SocioDetailModal`) muestra Datos, Membresías y Pagos. Faltan tres cosas que recepción necesita para atender: **qué hizo el socio** (ingresos y clases), **notas internas con autor y fecha** (hoy hay un único campo `observaciones` que solo un administrador puede editar) y **quién cambió qué** (la auditoría ya se escribe en MongoDB pero no hay API ni pantalla para leerla).

## 2. Objetivo de usuario
Como **recepcionista** quiero **ver los últimos ingresos y reservas del socio y dejar notas con mi nombre** y como **administrador** quiero **ver el historial de cambios de su ficha** para **atender reclamos, coordinar entre turnos y auditar modificaciones**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Frontend detalle | `frontend/src/components/admin/SocioDetailModal.jsx:24-28,293-298` | `TABS = Datos / Membresías / Pagos`. Sin pestaña Actividad ni Historial. Mismo modal en `/admin/socios` (`AdminSociosPage.jsx:330`) y `/recepcion/socios` (`GestionSociosPage.jsx:281`, sin `onEditar`). |
| Backend observaciones | `backend/apps/members/models.py:28` | `observaciones = TextField(blank=True, default='')`: un solo texto libre, sin autor ni fecha. Visible en el detalle (`SocioDetailModal.jsx:129-136`, "Observaciones y Salud"). |
| Backend permisos | `backend/apps/members/views.py:43-48` | `partial_update/update` → `IsAdminOnly`: **el recepcionista no puede agregar ni editar observaciones**. |
| Backend actividad (accesos) | `backend/apps/access/views.py:234-256`, `access/filters.py:6-18` | `GET /api/access/logs/` (`IsAuthenticated`; staff ve todo; socio solo lo propio) con filtros `user` (exact, id de **User**), `access_type`, `status`, `denial_reason`, `scanned_by`, `fecha_desde/hasta`; orden `-timestamp`. `SocioSerializer` expone `usuario` (id de User) ⇒ se puede pedir `?user=<usuario>`. **No hay UI.** |
| Backend actividad (clases) | `backend/apps/classes/filters.py:71-90`, `classes/views.py:155-161` | `GET /api/classes/inscripciones/` (`IsReceptionistOrAdmin`) con filtro `socio` (exact), `asistio`, `en_espera`, fechas; serializer con `clase, socio, asistio, en_espera, created_at` (sin nombre/hora de la clase). **No hay UI.** |
| Backend auditoría | `backend/apps/common/audit.py:138-195`, `core/mongodb.py:76-86` | Signals `pre_save/post_save/post_delete` para `Socio, PlanMembresia, Membresia, Clase, User, Pago` escriben en Mongo `audit_logs` documentos `{timestamp(ISO string), action(create|update|delete), model('members.socio'), instance_id, object_id, snapshot, actor_id, actor_user_id, actor_email, actor_rol, request_id, diff{campo:{old,new}}}`. **No existe ningún endpoint de lectura** (`rg audit_logs` en vistas: 0 resultados; solo `create_mongo_indexes.py` y tests). Índices por `timestamp`, `actor_id`, `action`, `model`; **no** por `instance_id`. |
| Retención | `backend/core/settings/base.py:404`, `create_mongo_indexes.py:48-60` | TTL de 90 días sobre `timestamp`. Ojo: el `timestamp` se guarda como **string ISO** (`audit.py:142`), y los índices TTL de Mongo solo expiran valores de tipo fecha: **No verificado** si la retención realmente se aplica (reportado a PLT). |
| Dependencia | `backend/apps/common/middleware.py` | Actor por `CurrentUserMiddleware` (thread-local). |

## 4. Alcance
**Incluye:** (1) pestaña **Actividad** con últimos N ingresos (`access/logs`) y reservas (`inscripciones`) del socio, solo lectura; (2) **notas internas**: modelo `NotaSocio` con autor/fecha, alta por recepción y admin, listado cronológico, borrado por autor/admin; (3) pestaña **Historial** (solo admin) que lee `audit_logs` filtrando `model='members.socio'` + `instance_id`, con diff legible (ocultando campos ruidosos).
**No incluye:** rediseñar la lógica de accesos (→ BK-ACC); edición de la ficha desde el historial/restaurar versiones; auditoría de lecturas; exportación; el campo `observaciones` actual (se mantiene como "Observaciones de salud/lesiones"; solo se evalúa permitir que recepción lo edite, ver §11).

## 5. Contrato de API
**Actividad — [EXISTE], sin cambios:** `GET /api/access/logs/?user=<usuario_id>&page_size` (ojo: paginación global, solo `page`; 10 por página). Campos de `AccessLogSerializer`: **No verificado en detalle** (leer `backend/apps/access/serializers.py` antes de armar la UI). `GET /api/classes/inscripciones/?socio=<id>&ordering=-created_at` (**No verificado** si `InscripcionClaseViewSet` define `ordering`; agregar `clase_nombre`, `clase_dia`, `clase_hora` al serializer para poder mostrarlas).
**Notas — [A CREAR]**
- `GET /api/members/socios/{id}/notas/` — `IsReceptionistOrAdmin`; paginado; `{"count":..,"results":[{"id","texto","autor_id","autor_nombre","autor_rol","created_at"}]}` (orden `-created_at`).
- `POST /api/members/socios/{id}/notas/` — body `{"texto":"..."}` (1–1000 caracteres); 201 con la nota; 400 `{"texto":["Escribí una nota."]}`.
- `DELETE /api/members/socios/{id}/notas/{nota_id}/` — autor o admin; 204; 403 en otro caso.
**Historial — [A CREAR]** `GET /api/members/socios/{id}/historial/` — `IsAdminOnly`; query `?page=`; response `{"results":[{"timestamp","accion":"update","actor_email","actor_rol","cambios":{"telefono":{"old":"…","new":"…"}}}], "degraded": false}`; si Mongo no responde ⇒ `200 {"results":[],"degraded":true}` (no 500; Mongo es no-crítico, `core/urls.py:80-100`). Excluir de `cambios` claves `updated_at, created_at` y enmascarar `certificado_medico_url` (mostrar "archivo actualizado").

## 6. Modelo de datos (propuesta)
`NotaSocio` en `backend/apps/members/models.py`: `socio = FK(Socio, CASCADE, related_name='notas')`, `autor = FK(User, SET_NULL, null=True, related_name='notas_socio')`, `texto = TextField(max 1000 en serializer)`, `created_at = DateTimeField(auto_now_add)`; `Meta.ordering = ['-created_at']`, índice `(socio, -created_at)`. Migración `members/migrations/0008_*` (la última existente es `0007`; coordinar numeración con BK-SOC-06/10). Agregar `NotaSocio` a `_AUDITED_MODELS`? (No necesario.) Para el historial: índice Mongo `(model, instance_id, timestamp desc)` en `create_mongo_indexes.py`.

## 7. Diseño frontend
- **Rutas/guard:** sin rutas nuevas; el modal se abre desde `/admin/socios` (admin) y `/recepcion/socios` (admin+recep). La pestaña **Historial** solo se muestra si `user.rol === 'administrador'` (`useAuth()`).
- **Convenciones:** hooks react-query v5 en `frontend/src/hooks/queries/` (`useSociosData.js` para notas/historial, `useActividadSocio.js` nuevo para accesos+inscripciones), `api` axios, `Skeleton`, `EmptyState`, `Badge`, `sonner`, `lucide-react`.
- **Componentes nuevos** (en `frontend/src/components/admin/`): `SocioActividadTab.jsx` (dos listas: "Últimos ingresos" con `Badge` granted/denied + motivo y "Reservas de clases"), `SocioNotasTab.jsx` (textarea + "Agregar nota", lista con autor/rol/fecha relativa, botón borrar para autor/admin), `SocioHistorialTab.jsx` (timeline: "Ana Pérez (administrador) cambió Teléfono de 1155… a 1166…"). Extender `TABS` en `SocioDetailModal.jsx`.
- **Estados de UI:** skeleton por pestaña, vacío ("Todavía no hay ingresos registrados." / "Sin notas." / "Sin cambios registrados."), error ("No pudimos cargar la actividad. Reintentar"), historial degradado ("El historial no está disponible en este momento.").
- **Textos (voseo):** "Agregar nota", "Escribí una nota interna (solo la ve el personal)", "Ver más".
- **Responsive:** el modal es `max-w-xl`; las pestañas pasan a scroll horizontal en 375 px (hoy son 3, serán 5-6).

## 8. Archivos a crear / modificar
- Backend: `members/models.py`, `members/migrations/0008_*.py`, `members/serializers.py` (`NotaSocioSerializer`), `members/views.py` (acciones `notas`, `historial`), `members/services.py` (lectura de Mongo con degradación), `classes/serializers.py` (campos de clase en inscripciones), `common/management/commands/create_mongo_indexes.py`, tests.
- Frontend: `SocioDetailModal.jsx` (+test), 3 componentes nuevos (+tests), `hooks/queries/useActividadSocio.js` y ampliar `useSociosData.js`, `services/sociosService.js`.

## 9. Plan de pruebas (TDD)
**Backend** (`members/tests/test_notas.py`, `test_historial.py`; `APITestCase`, `make_user_factory/make_socio_factory`; Mongo de tests `winnie_gym_logs_test`, `core/settings/test.py:21-24`; ver cómo `apps/common/tests/test_audit.py` limpia la colección):
- Notas: recepcionista y admin crean (201) y listan; autor borra la suya; recepcionista no borra la de otro (403); socio 403; `texto` vacío/>1000 ⇒ 400; `autor` queda seteado desde `request.user`.
- Historial: admin recibe cambios tras `PATCH telefono`; recepcionista 403; Mongo caído (mock de `get_collection` que lanza) ⇒ 200 `degraded:true`; `updated_at` no aparece en `cambios`.
- `inscripciones` serializer incluye `clase_nombre`.
Comando: `cd backend && pytest -q apps/members apps/classes apps/common/tests/test_audit.py` (requiere Mongo, igual que CI).
**Frontend** (Vitest + RTL, `vi.mock` de hooks como en `SocioDetailModal.test.jsx`): pestañas visibles según rol; crear/borrar nota actualiza la lista; Actividad vacío/error; Historial degradado; pestañas con foco por teclado.
Comando: `cd frontend && npx vitest run src/components/admin && npm run lint`.
**Manual:** recepción deja una nota en `socio.activo@winnie.local`; admin edita el teléfono y ve el cambio en Historial con su email; desactivar Mongo (`docker compose stop mongo`) y comprobar que el detalle sigue funcionando.

## 10. Criterios de aceptación
- **Dado** un socio con ingresos y reservas **cuando** staff abre "Actividad" **entonces** ve los últimos ingresos (con estado/motivo) y reservas con nombre de clase.
- **Dado** el detalle **cuando** recepción agrega una nota **entonces** queda guardada con su nombre y fecha y la ven admin y recepción (nunca el socio).
- **Dado** que un admin cambió el teléfono **cuando** otro admin abre "Historial" **entonces** ve quién, cuándo y de qué valor a cuál.
- **Dado** Mongo caído **cuando** se abre Historial **entonces** el detalle sigue operativo y se informa la indisponibilidad.

## 11. Riesgos y decisiones abiertas
1. ¿La recepción puede editar `observaciones` (salud/lesiones)? (Recomendado: sí, con auditoría; hoy no puede. Si se acepta, permitir `PATCH` solo de ese campo para `IsReceptionistOrAdmin` vía acción dedicada.)
2. ¿Las notas son visibles solo para staff? (Recomendado: sí; no exponer en `/me` ni en `profile`.)
3. Privacidad del historial: el `snapshot` contiene el socio completo; el endpoint devuelve solo `diff`. ¿Retención? Mongo 90 días (`MONGO_RETENTION_DAYS`): el historial más viejo no existirá (aclararlo en la UI).
4. ¿Cantidad de ítems en Actividad? (Recomendado: últimos 10 + "Ver más" con paginación `page`.)

## 12. Referencias
- `speckit/spec.md` REQ-3.5 (detalle con historial); `docs/reports/rnf01-rnf06.md` (RNF04 trazabilidad); `backend/apps/common/tests/test_audit.py`.
- Relacionados: BK-ACC (historial de accesos), BK-SOC-03 (pagos del detalle), BK-SOC-07 (acciones).
- Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", Admin → Socios → Detalle.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1/DRF + Mongo audit; React 18/react-query v5). Ampliá SocioDetailModal (frontend/src/components/admin/SocioDetailModal.jsx, hoy tabs Datos/Membresías/Pagos) con: Actividad, Notas y Historial (solo admin).
Hechos verificados: GET /api/access/logs/?user=<usuario_id> (staff ve todo, filtros en backend/apps/access/filters.py) y GET /api/classes/inscripciones/?socio=<id> ya existen; no hay modelo de notas (solo Socio.observaciones, editable solo por admin: members/views.py:43-48); la auditoría ya se escribe en Mongo 'audit_logs' (backend/apps/common/audit.py; documento con model='members.socio', instance_id, actor_email, actor_rol, diff) pero no hay endpoint de lectura; la paginación global solo acepta ?page (10 por página).
TDD: tests backend primero (members/tests/test_notas.py y test_historial.py: permisos por rol, autor automático, borrado por autor/admin, texto vacío/>1000, historial solo admin, Mongo caído => 200 degraded:true, updated_at no aparece). Luego NotaSocio (FK socio CASCADE, autor FK SET_NULL, texto, created_at) + migración 0008 (la última es 0007), acciones notas e historial en SocioViewSet, lectura de Mongo en members/services.py con degradación, índice (model, instance_id, timestamp) en create_mongo_indexes, y clase_nombre/clase_dia/clase_hora en InscripcionClaseSerializer. Frontend: SocioActividadTab, SocioNotasTab, SocioHistorialTab + hooks (useActividadSocio.js, ampliar useSociosData.js) + tabs por rol; tests Vitest + RTL con vi.mock.
Terminado: pytest -q apps/members apps/classes apps/common/tests/test_audit.py y npx vitest run src/components/admin && npm run lint verdes. No expongas notas al socio. Sin commits.
```
