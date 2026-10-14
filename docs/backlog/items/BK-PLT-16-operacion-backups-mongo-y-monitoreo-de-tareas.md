---
id: BK-PLT-16
titulo: Operación: sin backups de MongoDB y sin monitoreo de las tareas programadas (vencimientos)
tipo: deuda-tecnica
roles: [administrador]
prioridad: P3
tamano: M
estado_en_codigo: no-existe
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-PLT-16 · Operación: sin backups de MongoDB y sin monitoreo de las tareas programadas

## 1. Resumen
Solo se documentan huecos con evidencia concreta: (1) MongoDB Atlas M0 no tiene backups y el propio `docs/deploy.md` lo deja "fuera de scope", pero Mongo guarda el historial de QR y la auditoría; (2) el scheduler y el worker de Celery corren dentro del mismo contenedor web (Render Free) y no hay ninguna alerta si la tarea diaria de vencimientos deja de correr o falla; el health check solo comprueba que haya algún worker respondiendo.

## 2. Objetivo de usuario
Como **responsable técnico** quiero **recuperar los datos de Mongo y enterarme si las alertas de vencimiento dejan de ejecutarse** para **no perder historial ni dejar de avisar a los socios sin darnos cuenta**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Docs backup | `docs/deploy.md:199-202` | Supabase: backups diarios (7 días) en el plan free. "MongoDB Atlas: M0 free NO tiene backups automáticos. Alternativa: workflow GitHub Actions que corre `mongodump` semanal… Fuera de scope de MVP." |
| CI | `.github/workflows/ci.yml` (jobs `backend` y `frontend`) | Solo test/lint/build; no hay workflow de backup ni de deploy/monitoreo (`fd . .github/workflows` → solo `ci.yml`). |
| Mongo uso | `backend/core/mongodb.py:63-87`, `backend/apps/common/management/commands/create_mongo_indexes.py:49-58` | `qr_history` y `audit_logs` con TTL de `MONGO_RETENTION_DAYS` (`render.yaml:125`, 90). La retención es por TTL; sin backup, un borrado accidental es irrecuperable. |
| Procesos | `backend/Procfile:10-12` | `web: daphne`, `worker: celery -A core worker -l info --concurrency=1`, `beat: celery -A core beat … DatabaseScheduler` en el mismo contenedor (honcho). |
| Render | `render.yaml:1-9,22-23,32` | Plan `free`; workers separados comentados; `healthCheckPath: /api/health/`. |
| Tarea programada | `backend/apps/memberships/tasks.py:45-81`, `backend/apps/memberships/migrations/0004_seed_expiration_schedule.py` | `check_expiring_memberships` diaria (PeriodicTask sembrada por migración). Devuelve un dict y hace `logger.info`; no notifica errores ni registra "última ejecución exitosa". |
| Health | `backend/core/urls.py` (`_check_celery`, `CRITICAL_CHECKS`) | `celery.control.ping(timeout=0.5)` comprueba workers, no beat ni la última ejecución del cron; Celery y Mongo son "no críticos" (solo degradan `status` a `degraded`, HTTP 200). |
| Sentry | `backend/core/settings/base.py:427-446`, `render.yaml:178-182` | Backend envía errores a Sentry solo si `SENTRY_DSN` está configurado (`docs/deploy.md` § 7: "opcional"). |
| Idempotencia | `backend/apps/memberships/tasks.py:62-66` | Si el cron falla un día, se saltea: `delta not in EXPIRATION_ALERT_DAYS` (7,3,1,0) → un día perdido en el umbral implica un aviso perdido (la membresía de `delta == 0` perdida queda `activa` pasada su fecha hasta que otra lógica la venza; No verificado si existe un barrido de membresías vencidas fuera de esta tarea). |
| Dev | `docker-compose.yml` | Servicios con `restart: unless-stopped` y `healthcheck` (Postgres, Redis, Mongo, etc.); no aplica a producción. |

## 4. Alcance
**Incluye:** (A) workflow `.github/workflows/mongo-backup.yml` semanal (cron) con `mongodump` comprimido hacia un artefacto/bucket (decisión de destino), con restauración documentada; (B) heartbeat de tareas: guardar `last_success_at` de `check_expiring_memberships` (cache Redis o `django_celery_beat`), exponerlo en `/api/health/` como check no crítico `expiring_task` y alertar si supera 36 h; (C) hacer el cron tolerante a días perdidos (procesar `delta <= 0` y umbrales no enviados en lugar de igualdad exacta).
**No incluye:** migrar a plan Starter con workers separados (`render.yaml` ya lo prevé comentado), observabilidad de métricas (Prometheus/Grafana), backups de Postgres (ya los hace Supabase).

## 5. Contrato de API
**[EXISTE]** `GET /api/health/` → `{status, service, version, checks: {postgres, redis, mongo, celery}}`; se agregaría `checks.expiring_task: {ok, critical: false}` (en `DEBUG` también `error`). Sin otros endpoints.

## 6. Modelo de datos
Sin cambios de modelo (heartbeat en cache). Alternativa: tabla `TaskHeartbeat` si se quiere persistencia (No necesaria para el alcance mínimo).

## 7. Diseño frontend
Sin cambios de frontend. (Opcional: el admin podría ver el estado del health en Configuración; fuera de alcance.)

## 8. Archivos a crear / modificar
- Crear `.github/workflows/mongo-backup.yml` (secrets `MONGO_URI`, destino del artefacto).
- Modificar `backend/apps/memberships/tasks.py` (heartbeat + lógica tolerante), `backend/core/urls.py` (nuevo check), `docs/deploy.md` (procedimiento de restauración y alerta de UptimeRobot por palabra clave `degraded`).
- Tests en `backend/apps/memberships/tests/` y `backend/apps/common/tests/test_observability.py` (existe; leerlo antes para seguir su patrón).

## 9. Plan de pruebas (TDD)
Backend (pytest; `core.settings.test` con `CELERY_TASK_ALWAYS_EAGER=True`; factories `make_membresia_factory` de `backend/conftest.py`):
- Tarea ejecutada con éxito escribe `last_success_at`; el health devuelve `expiring_task.ok=true`.
- Sin ejecución en > 36 h (cache vacío o viejo) → `ok=false` y `status='degraded'`, HTTP 200.
- Membresía con `fecha_fin = hoy - 1` y `estado=activa` (cron saltado un día) → pasa a `vencida` y se envía el aviso final una sola vez (`avisos_enviados`).
- El umbral 3 no enviado por salto se envía al día siguiente sin duplicar.
Manual: ejecutar `docker compose exec backend python manage.py shell -c "from apps.memberships.tasks import check_expiring_memberships as t; print(t())"` y consultar `/api/health/`. Para el backup: disparar el workflow manualmente (`workflow_dispatch`) y restaurar en un Mongo local con `mongorestore`.
Comandos: `cd backend && pytest apps/memberships apps/common -q`.

## 10. Criterios de aceptación
- **Dado** que pasaron más de 36 h sin ejecución exitosa del cron **cuando** se consulta `/api/health/` **entonces** `checks.expiring_task.ok` es `false` y `status` es `degraded`.
- **Dado** un día de cron perdido **cuando** corre al siguiente **entonces** no quedan membresías `activa` con `fecha_fin` vencida ni avisos duplicados.
- **Dado** el workflow semanal **cuando** corre **entonces** produce un dump descargable y el procedimiento de restauración está documentado.

## 11. Riesgos y decisiones abiertas
- ¿Dónde guardar los dumps (artefacto de GitHub con retención corta, S3, Drive)? Los artefactos del repo pueden ser públicos si el repo lo es: **Recomendación:** no subir datos personales a artefactos de un repo público; usar bucket privado.
- ¿Vale la pena si la auditoría/QR se descarta a los 90 días? **Recomendación:** priorizar (B) y (C); (A) solo si el dueño considera crítico el historial.
- Mongo "no crítico" en health: mantener para no despertar a UptimeRobot por blips.

## 12. Referencias
- `docs/deploy.md` §§ 6-8, `render.yaml`, `backend/Procfile`, `docs/architecture.md`.
- Relacionados: BK-PLT-13 (retención de auditoría), BK-PLT-08 (emails).

## 13. Prompt listo para un agente de IA
```
Contexto: backend Django + Celery (worker+beat en el mismo contenedor, backend/Procfile). La tarea diaria memberships.check_expiring_memberships (apps/memberships/tasks.py) solo procesa delta exacto en (7,3,1,0) y no deja constancia de su última ejecución; /api/health/ (core/urls.py) solo hace celery.control.ping.
Tarea (docs/backlog/items/BK-PLT-16-operacion-backups-mongo-y-monitoreo-de-tareas.md), en este orden: TDD primero para (C) tolerancia a días perdidos y (B) heartbeat + check no crítico expiring_task en /api/health/; luego implementalo. (A) el workflow de backup de Mongo solo tras confirmar el destino con el dueño. No toques render.yaml ni secrets.
Terminado: `cd backend && pytest -q` verde con cobertura >= 80 y docs/deploy.md actualizado.
```
