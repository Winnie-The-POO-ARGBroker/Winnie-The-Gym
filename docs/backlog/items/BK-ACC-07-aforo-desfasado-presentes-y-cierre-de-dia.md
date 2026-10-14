---
id: BK-ACC-07
titulo: Corregir aforo desfasado — lista de presentes, salida manual y cierre automático de día
tipo: feature
roles: [administrador, recepcionista]
prioridad: P1
tamano: L
estado_en_codigo: no-existe
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-ACC-01, BK-ACC-02]
---

# BK-ACC-07 · Aforo desfasado: presentes, salida manual y cierre de día

## 1. Resumen
El aforo se calcula como `ENTRY − EXIT` de los movimientos GRANTED **del día local**. Cada salida que no se registra (socio que se va sin escanear, salida denegada por membresía vencida, entrada duplicada) deja el aforo inflado hasta la medianoche, y no existe ninguna herramienta para corregirlo: ni lista de "quién está adentro", ni salida manual, ni cierre al cerrar el gimnasio.

## 2. Objetivo de usuario
Como **recepcionista/administrador** quiero **ver quién figura adentro y poder sacar a mano a quienes ya se fueron, y que el sistema cierre el día automáticamente** para **que el aforo en vivo y la permanencia sean confiables**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend servicio | `backend/apps/access/services.py:15-38` | `compute_aforo_actual`: filtra `timestamp__date=timezone.localdate()` y `status=GRANTED`; `max(entries - exits, 0)`. El "reset" diario es implícito (cambia el filtro de fecha a medianoche). No es por usuario. |
| Backend servicio | `services.py:45-129` | `compute_aforo_stats` recorre todos los logs del día en memoria cada 30 s (cache `aforo:stats`, TTL 30 s); `current = max(0, current - 1)` oculta salidas sin entrada. |
| Backend vistas | `backend/apps/access/views.py` (rutas en `urls.py:6-11`) | Solo `qr/generate`, `qr/scan`, `manual`, `logs`, `stats`. No hay "presentes" ni salida forzada ni cierre. |
| Backend tareas | `backend/apps/access/tasks.py:11-22` | Única tarea: `access.log_qr_event` (auditoría a Mongo). No hay tarea de cierre. |
| Backend beat | `backend/core/settings/base.py:363-368`; `backend/apps/memberships/migrations/0004_seed_expiration_schedule.py` | `CELERY_BEAT_SCHEDULER = django_celery_beat...DatabaseScheduler`; patrón de tarea periódica sembrada por migración (`CrontabSchedule` + `PeriodicTask.update_or_create`, TZ `America/Argentina/Buenos_Aires`). Sin tarea de aforo. |
| Backend config | `backend/apps/common/models.py:11-13` | `hora_cierre=TimeField(default='23:00')`: existe pero no se usa en ningún job (ver BK-ACC-11). |
| Backend causas | `views.py:92-98,179-185` | Una salida con membresía vencida/suspendido se deniega y no descuenta (corregido en BK-ACC-01). |
| Frontend | `frontend/src/pages/recepcion/AforoMonitorPage.jsx:16-102` | Monitor con `OccupancyCard`, `RecentEventsPanel`, `AforoStatBar`. **Sin** lista de presentes ni acciones de corrección. |
| Frontend | `frontend/src/components/recepcion/RecentEventsPanel.jsx` | Lista de eventos con `{id, type:'in'|'out', name, time}`; solo lectura. |
| Admin Django | `backend/apps/access/admin.py:5-11` | `readonly_fields` impiden editar, pero la única vía de "corrección" actual es manipular la base. |

## 4. Alcance
**Incluye:** endpoint de presentes; salida manual individual y masiva (con auditoría); tarea de cierre automático del día; panel "Presentes ahora" en el Monitor de Aforo; marca `source` de los logs correctivos.
**No incluye:** edición/borrado de logs históricos (deben ser inmutables, BK-ACC-12), aforo por franja, molinete físico, backfill de días anteriores.

## 5. Contrato de API (propuesta)
**[A CREAR] `GET /api/access/presentes/`** — `IsReceptionistOrAdmin`. Definición: usuarios cuyo **último** movimiento GRANTED del día local es `ENTRY`. Implementación sugerida (Postgres): `AccessLog.objects.filter(timestamp__date=today, status='GRANTED', user__isnull=False).order_by('user_id','-timestamp').distinct('user_id')` y luego filtrar `access_type='ENTRY'` en Python (o `Subquery`/`Window` si se pagina).
Response 200: `{ "count": int, "results": [{ "user": int, "user_nombre": str, "user_apellido": str, "user_dni": str, "entrada": ISO-8601, "minutos_adentro": int, "log_id": int }] }`. Sin paginación (máx ~aforo_maximo filas).

**[A CREAR] `POST /api/access/presentes/<user_id>/salida/`** — `IsReceptionistOrAdmin`. Body opcional `{ "motivo": "salio_sin_escanear"|"otro" }`. Crea `AccessLog(user, access_type=EXIT, status=GRANTED, scanned_by=request.user, source='MANUAL_CORRECTION')`. 201 `{ "access_log": AccessLogSerializer }`; 404 si el usuario no figura adentro (`{"detail": "El socio no figura adentro."}`).

**[A CREAR] `POST /api/access/presentes/cerrar/`** — `IsAdminOnly` (`permissions.py:35-47`). Body `{ "confirmar": true }` (400 si falta). Crea un EXIT por cada presente (`source='MANUAL_CORRECTION'`). 200 `{ "cerrados": int }`.

Todos disparan el `post_save` existente (`ws_signals.py:21-39`) → el aforo en vivo se actualiza solo.

**[A CREAR] tarea Celery** `access.auto_close_day` (`backend/apps/access/tasks.py`): corre cada 15 min (crontab `*/15`, sembrada con migración como en `memberships/0004`), lee `GymConfig.get().hora_cierre` y, si `now >= hora_cierre + ACCESS_AUTOCLOSE_GRACE_MINUTES` (setting nuevo, default 30) y quedan presentes, crea los EXIT con `source='AUTO_CLOSE'`, **timestamp fijado a la hora de cierre** (hay que crear y luego `AccessLog.objects.filter(pk=...).update(timestamp=cierre_dt)` porque el campo es `auto_now_add`, `models.py:40-44`). Idempotente (si no quedan presentes no hace nada). Devuelve `{ "cerrados": int, "run_at": iso }` como `check_expiring_memberships`.

## 6. Modelo de datos (propuesta)
`AccessLog.source` (`CharField(max_length=20)`, choices `QR, MANUAL, OVERRIDE, MANUAL_CORRECTION, AUTO_CLOSE`, default `QR`) — compartido con BK-ACC-02; migración `0004_accesslog_source` (la siguiente a `0003_accesslog_choices_textchoices.py`; si 02 ya la creó, solo agregar los valores). Índice `Index(fields=['user','-timestamp'])`.

## 7. Diseño frontend
- **Ruta/guard:** sin ruta nueva; el panel vive en `/recepcion/aforo` (`App.jsx:122`, roles administrador y recepcionista). El botón "Cerrar día" solo se renderiza si `user.rol === 'administrador'` (`useAuth`, ver `Sidebar.jsx` para el patrón).
- **Componente nuevo:** `frontend/src/components/recepcion/PresentesPanel.jsx` (usa `Card`, `Skeleton`, `EmptyState`, `Button`, `Modal` de `components/ui/`): lista de presentes con nombre, DNI, hora de entrada, "hace 3 h 20 min" (`getTimeAgo` de `utils/formatDate`), búsqueda local, y botón "Registrar salida" por fila.
- **Hooks (`frontend/src/hooks/queries/useAccessPresentes.js`):** `usePresentes()` (`queryKey ['accessPresentes']`, `refetchInterval: 30000`), `useRegistrarSalidaMutation()` y `useCerrarDiaMutation()` (`useMutation`, `onSuccess` → `qc.invalidateQueries(['accessPresentes'])` + `toast.success`, `onError` → `toast.error(err.response?.data?.detail ?? 'No se pudo registrar la salida')`; copiar `extractErrorMessage` de `usePagos.js:28-30`).
- **Servicio:** `accessService.js` → `getPresentes()`, `registrarSalida(userId, motivo)`, `cerrarDia()`.
- **Estados:** loading skeleton de 4 filas; vacío "No hay nadie adentro ahora mismo."; error "No pudimos cargar los presentes" + "Reintentar"; éxito: toast "Salida registrada para Juan Pérez".
- **Confirmación (cerrar día):** `Modal` con "Vas a registrar la salida de 37 personas. ¿Confirmás?" (botón destructivo ámbar).
- **Textos (voseo):** "Presentes ahora", "Registrar salida", "Cerrar día", "Salió sin escanear".
- **Responsive:** a 375 px el panel pasa debajo del `OccupancyCard` en una columna; filas apiladas con botón a ancho completo; a 768 px grilla `md:grid-cols-2`.
- Mostrar una insignia "auto" en `RecentEventsPanel` para eventos con `source` `AUTO_CLOSE`/`MANUAL_CORRECTION` (requiere exponer `source` en `AccessLogSerializer`).

## 8. Archivos a crear / modificar
Backend: `apps/access/{models,services,views,urls,tasks,serializers}.py`, migraciones (modelo + seed beat `access/migrations/0005_seed_autoclose_schedule.py`), `core/settings/base.py` (`ACCESS_AUTOCLOSE_GRACE_MINUTES`), tests `apps/access/tests/test_presentes.py` y `test_auto_close.py`.
Frontend: `components/recepcion/PresentesPanel.jsx` (+test), `hooks/queries/useAccessPresentes.js` (+test), `services/accessService.js`, `pages/recepcion/AforoMonitorPage.jsx` (+ `AforoMonitorPage.test.jsx`).

## 9. Plan de pruebas (TDD)
Backend (pytest, `APITestCase`; para tareas llamar directamente `auto_close_day()` — Celery corre eager en tests, `core/settings/test.py`; para fijar la hora usar `unittest.mock.patch('django.utils.timezone.now')`, no hay `freezegun` en `requirements/`):
1. `GET /presentes/`: A entra, B entra y sale, C entra → `[A, C]`; entradas de ayer no aparecen.
2. Roles: socio 403, anónimo 401; `cerrar/` con recepcionista → 403 (solo admin).
3. `POST /presentes/<id>/salida/` crea EXIT GRANTED con `source='MANUAL_CORRECTION'`, `scanned_by` correcto y baja `compute_aforo_actual`; usuario que no está adentro → 404.
4. `cerrar/` sin `confirmar` → 400; con `confirmar` cierra a todos y el aforo queda en 0.
5. `auto_close_day`: antes de `hora_cierre + gracia` no hace nada; después cierra, deja `timestamp == hora_cierre` y `source='AUTO_CLOSE'`; segunda corrida cerrada → `cerrados == 0` (idempotente).
6. WS: la salida manual emite `aforo.update` (patrón `test_aforo_websocket.py:78-103`).
Frontend (Vitest/RTL; mock de `../../services/api` o de los hooks): render skeleton/vacío/lista; clic en "Registrar salida" llama a la mutation y muestra el toast; "Cerrar día" abre el modal y solo existe para administrador; error → toast.
Manual: con `admin@winnie.local` registrar 2 ingresos por DNI desde el terminal, abrir el Monitor, sacar a uno desde "Presentes ahora" y confirmar que el aforo baja a 1 en otra pestaña (WS).

## 10. Criterios de aceptación
- **Dado** que dos socios figuran adentro pero ya se fueron, **cuando** recepción registra su salida desde "Presentes ahora", **entonces** el aforo baja en todos los clientes y los logs quedan marcados como corrección manual con el nombre de quien la hizo.
- **Dado** hora de cierre 23:00 y gracia 30 min, **cuando** son las 23:31 y quedan 5 presentes, **entonces** el sistema registra 5 salidas a las 23:00 y el aforo queda en 0.
- **Dado** un administrador, **cuando** usa "Cerrar día" y confirma, **entonces** todos los presentes salen; un recepcionista no ve ese botón.

## 11. Riesgos y decisiones abiertas
- ¿Fuente de verdad del aforo: diferencia ENTRY−EXIT (actual) o presencia por usuario? Recomendación: presencia por usuario (consistente con "presentes" y con el anti-passback de BK-ACC-02); migrar `compute_aforo_actual` a `len(presentes)` en esta ficha o en BK-ACC-02.
- Gimnasios 24 h o turnos que cruzan medianoche: hoy el corte es la fecha local; recomendación: definir "día operativo" desde `hora_apertura` (decisión de producto).
- Backdatear el `timestamp` del cierre falsea la hora real de la operación; alternativa: guardar timestamp real y calcular permanencia contra `hora_cierre`. Recomendación: backdatear y dejar `source` como evidencia.
- Volumen: `distinct('user_id')` es específico de PostgreSQL (la base del proyecto es Postgres según `docs/architecture.md`); si se usa otra DB en tests, adaptar.

## 12. Referencias
- `docs/qa/plan-de-pruebas.md` (US08 aforo), `docs/architecture.md` (flujo QR → WS), `backend/apps/memberships/tasks.py` y `migrations/0004_seed_expiration_schedule.py` (patrón de tarea beat).
- Figma (opcional): "vistas live" → Recepción → Aforo.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1 + DRF + Channels + Celery/django_celery_beat sobre Postgres; React 18 + Vite + TanStack Query v5 + Vitest). Implementá docs/backlog/items/BK-ACC-07-aforo-desfasado-presentes-y-cierre-de-dia.md. Asumí hechas BK-ACC-01 y BK-ACC-02 (AccessLog.source ya existe; si no, crealo según la ficha).
TDD backend primero (backend/apps/access/tests/test_presentes.py y test_auto_close.py; APITestCase + factories de backend/conftest.py; hora simulada con unittest.mock.patch('django.utils.timezone.now'), no hay freezegun): GET /api/access/presentes/, POST /api/access/presentes/<user_id>/salida/ (IsReceptionistOrAdmin), POST /api/access/presentes/cerrar/ (IsAdminOnly, requiere {"confirmar": true}), tarea access.auto_close_day (cada 15 min, cierra tras GymConfig.hora_cierre + ACCESS_AUTOCLOSE_GRACE_MINUTES, source='AUTO_CLOSE', timestamp = hora de cierre vía .update(), idempotente) y seed del PeriodicTask por migración copiando memberships/migrations/0004_seed_expiration_schedule.py.
Luego frontend con tests RTL primero: services/accessService.js (getPresentes, registrarSalida, cerrarDia), hooks/queries/useAccessPresentes.js, components/recepcion/PresentesPanel.jsx integrado en pages/recepcion/AforoMonitorPage.jsx; botón "Cerrar día" solo para rol administrador con Modal de confirmación; toasts con sonner; textos en español rioplatense.
No toques backend/loadtests ni hooks/useScreenWakeLock.js.
Terminado: pytest -q (cov>=80 %) y `npx vitest run --coverage && npm run lint` en verde.
```
