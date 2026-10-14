---
id: BK-PLT-08
titulo: Comunicaciones: envío masivo por segmento y canales (email / push / WhatsApp)
tipo: feature
roles: [administrador, recepcionista]
prioridad: P3
tamano: XL
estado_en_codigo: solo-idea
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-PLT-06]
---

# BK-PLT-08 · Comunicaciones: envío masivo por segmento y canales (email / push / WhatsApp)

## 1. Resumen
El sistema solo envía 4 emails transaccionales automáticos (más el de activación/reset). No hay forma de que el staff redacte y envíe un comunicado a un grupo (p. ej. "socios con membresía vencida", "inscriptos a Yoga"), ni recordatorios de clases, ni otros canales. Existe una base reutilizable (Celery + helper de emails + plantillas), pero ningún modelo, API ni pantalla de comunicaciones.

## 2. Objetivo de usuario
Como **administrador** quiero **enviar un mensaje a un segmento de socios y ver su resultado** para **avisar cierres por feriado, promociones o recordar vencimientos sin copiar emails a mano**.

## 3. Estado actual en el código (evidencia)
Inventario de qué se envía hoy y qué falta, con clasificación: **(a)** backend sin UI, **(b)** especificado/planificado pero no construido, **(c)** solo idea.

| Pieza | Clase | Archivo:línea / evidencia |
|---|---|---|
| Email de bienvenida al crear Socio | (a) construido sin UI (automático) | `backend/apps/common/signals.py:14-37` (`post_save` de `Socio`, plantilla `welcome`). |
| Alerta de vencimiento 7/3/1/0 días | (a) automático | `backend/apps/memberships/tasks.py:15,45-81`; deduplica con `Membresia.avisos_enviados` (JSONField, `memberships/models.py:52`); cron diario en `memberships/migrations/0004_seed_expiration_schedule.py`. |
| Confirmación de pago | (a) automático | `backend/apps/payments/services.py:47-` llamado en `:188` y `:306`. |
| Clase cancelada → inscriptos (no en espera) | (a) automático; (b) spec REQ-3.4 ya construido | `backend/apps/classes/signals.py:14-63`; spec en `speckit/spec.md` § REQ-3.4 y `speckit/design.md` § 3.4. Riesgo: el signal no compara el estado previo, por lo que guardar de nuevo una clase ya cancelada reenvía los emails (No verificado en ejecución). |
| Activación de staff / reset de contraseña | (a) automático, plantilla genérica | Ver BK-PLT-06. |
| Infra de envío | (a) reutilizable | `backend/apps/common/emails.py:25-71` (`send_templated_email`), `backend/apps/common/tasks.py:11-40` (`send_email_task` con `max_retries=3`, `enqueue_email`); base `emails/_base.html`; Anymail/Mailtrap (`core/settings/base.py:262-285`). |
| Envío masivo por segmento | (c) solo idea | Sin modelo, vista ni spec (`rg -i "campa|comunicaci|segment" backend frontend/src openspec speckit` sin resultados relevantes). |
| Recordatorio previo de clase (p. ej. 2 h antes) | (c) solo idea | Ninguna tarea periódica sobre `Clase` (verificado: solo hay 3 `tasks.py`: `access`, `common`, `memberships`). |
| Notificación por reserva / lista de espera promovida | (c) solo idea | `backend/apps/classes/services.py:82-` (`cancelar_inscripcion` promueve de la lista de espera) sin emails (verificado: no llama a `enqueue_email`). |
| Push web / app | (c) solo idea | Sin Service Worker/manifest (No verificado en `frontend/public`). |
| WhatsApp | (c) solo idea | Sin integración. El `Socio` tiene `telefono` (usado en `ProfileSerializer.fields`, `backend/apps/users/serializers.py:~60`) pero no hay verificación de opt-in. |
| Bandeja in-app | (c) solo idea | Ver BK-PLT-07. |
| Preferencias / consentimiento (opt-out) | (c) solo idea | No hay campo en `Socio`/`User`. |
| Frontend | — | No hay página de comunicaciones; `Sidebar.jsx:12-46` sin ítem. |

## 4. Alcance
**Incluye (propuesta, por fases):** Fase 1 email: modelo `Comunicacion` + `Destinatario` con segmentos predefinidos, vista previa del conteo, envío en lote por Celery con reporte (enviados/fallidos), pantalla `/admin/comunicaciones`. Fase 2: recordatorios automáticos de clases y lista de espera. Fase 3: push/WhatsApp (decisión de proveedor).
**No incluye:** editor visual de plantillas, A/B testing, automatizaciones por reglas, SMS.

## 5. Contrato de API (propuesta, **[A CREAR]**)
Bajo `api/comunicaciones/` con `IsAdminOnly` (`apps/access/permissions.py:35`) para crear/enviar y `IsReceptionistOrAdmin` (`:4`) para listar (decisión abierta).
- `GET /api/comunicaciones/segmentos/` → `[{clave, nombre, descripcion}]` (claves propuestas: `todos_activos`, `membresia_vencida`, `vence_en_7_dias`, `inscriptos_clase`, `sin_membresia`).
- `POST /api/comunicaciones/preview/` body `{segmento, params}` → `{count, muestra: [email,...]}` (máx. 5).
- `POST /api/comunicaciones/` body `{asunto, mensaje, segmento, params, canal: 'email'}` → 201 `{id, estado: 'encolada', total}`.
- `GET /api/comunicaciones/` paginado (PAGE_SIZE 10): `{id, asunto, segmento, canal, estado, total, enviados, fallidos, creada_por, creada_en}`.
Errores de validación en formato DRF por campo.

## 6. Modelo de datos (propuesta)
`apps/communications/`: `Comunicacion(asunto, mensaje, segmento, params JSON, canal, estado[borrador|encolada|enviando|completada], creada_por FK User, total, enviados, fallidos, creada_en)` y `EntregaComunicacion(comunicacion FK, socio FK, estado, error, enviada_en)` con índice `(comunicacion, estado)`. Para opt-out: `Socio.acepta_comunicaciones = BooleanField(default=True)` (migración en `apps/members`). Cambio de modelo en app distinta: coordinar con el dueño de BK de socios (SOC).

## 7. Diseño frontend
- **Ruta:** `/admin/comunicaciones` con `<ProtectedRoute roles={['administrador']}>` (patrón `App.jsx:105`); ítem en `NAV_BY_ROLE.administrador` de `Sidebar.jsx`.
- **Páginas/componentes:** `pages/admin/AdminComunicacionesPage.jsx` con `AppLayout` + `TopBar`; formulario con `react-hook-form` + `zod` (`zodResolver`, como `AdminConfiguracionPage.jsx:10-18`); `Select`/`Input`/`Button` de `components/ui`; lista histórica con `DataTable` + `Pagination`; confirmación con `Modal`.
- **Hooks:** `hooks/queries/useComunicaciones.js` (`useSegmentos`, `usePreviewSegmento`, `useCrearComunicacion`, `useComunicaciones`).
- **Estados:** preview en vivo (loading con `Skeleton`), vacío ("Todavía no enviaste comunicaciones"), error (toast), éxito ("Comunicación encolada para N socios").
- **Textos (es-AR):** "Nueva comunicación", "Segmento", "Vista previa: se enviará a N socios", "Enviar ahora".
- **Responsive:** formulario en una columna a 375 px; tabla con scroll horizontal.

## 8. Archivos a crear / modificar
Backend: `apps/communications/` (modelos, serializers, views, urls, `tasks.py::enviar_comunicacion`, `segments.py`, tests), plantilla `emails/comunicacion.html/.txt`, registrar en `INSTALLED_APPS` y `core/urls.py`. Frontend: página, hook, ruta, sidebar.

## 9. Plan de pruebas (TDD)
- Backend: cada segmento devuelve los socios correctos (fixtures `make_socio_factory`, `make_plan_factory`, `make_membresia_factory` en `backend/conftest.py`); permisos (recepcionista 403 en POST, socio 403 en todo); envío con `CELERY_TASK_ALWAYS_EAGER` (`core/settings/test.py:16`) y `mail.outbox` (patrón `test_welcome_signal.py`); socios sin email o con opt-out excluidos; fallo parcial no corta el lote.
- Frontend: formulario valida asunto/mensaje; preview muestra conteo; envío deshabilitado con 0 destinatarios.
- Manual: crear 2 socios con distintos vencimientos y enviar al segmento `vence_en_7_dias`; ver el email en Mailtrap.

## 10. Criterios de aceptación
- **Dado** el segmento `membresia_vencida` **cuando** el admin envía **entonces** se encola una entrega por socio con email y la comunicación queda `completada` con conteos.
- **Dado** un socio sin email u opt-out **cuando** se envía **entonces** no recibe y no cuenta como fallido.
- **Dado** un recepcionista **cuando** llama al POST **entonces** 403.

## 11. Riesgos y decisiones abiertas
- Cuota/reputación del proveedor de email (Mailtrap sandbox: ver `docs/deploy.md`); límite de lote y throttling con `countdown` (el riesgo ya aparece en `speckit/design.md:312`).
- ¿Quién puede enviar: solo admin o también recepción? **Recomendación:** solo admin.
- ¿Canal WhatsApp (API oficial de pago) o push? **Recomendación:** postergar; validar demanda.
- Cumplimiento: Ley 25.326 (Argentina) exige opt-out/consentimiento para comunicaciones comerciales (No verificado el detalle legal; consultar).
- Worker en Render Free (`backend/Procfile`, `--concurrency=1`): lotes grandes serán lentos.

## 12. Referencias
- `speckit/spec.md` § REQ-3.4, `speckit/design.md` §§ 3.4 y riesgos (línea ~312), `CHANGELOG.md:365` ("Notificaciones por email: bienvenida, notificación de acceso, alerta de vencimiento"; la "notificación de acceso" no se encontró en el código vigente: No verificado).
- Relacionados: BK-PLT-06, BK-PLT-07, BK-CLS-03 (notificación al promover de lista de espera), BK-CLS-05 (cancelación de clase y notificaciones), BK-FIN-03 (recordatorios de morosidad).

## 13. Prompt listo para un agente de IA
```
Contexto: Django 5 + DRF + Celery (apps/common/tasks.py::enqueue_email, emails.py::send_templated_email, plantillas en apps/common/templates/emails/) y frontend React. No existe módulo de comunicaciones.
Tarea (docs/backlog/items/BK-PLT-08-comunicaciones-masivas-por-segmento.md), SOLO Fase 1 (email) y solo tras confirmar decisiones abiertas con el dueño: TDD primero (segmentos, permisos IsAdminOnly, envío eager con mail.outbox, exclusión de sin-email/opt-out). Creá apps/communications (modelos Comunicacion/EntregaComunicacion, segments.py, tasks.enviar_comunicacion, endpoints segmentos/preview/crear/listar), y en frontend pages/admin/AdminComunicacionesPage.jsx con react-hook-form+zod, hooks en hooks/queries/useComunicaciones.js, ruta /admin/comunicaciones con roles ['administrador'] y entrada en Sidebar. Copy es-AR.
Terminado: pytest -q (>=80% cobertura) y `npm run lint && npx vitest run --coverage` verdes.
```
