# Esquemas MongoDB — Winnie The Gym

Complemento no relacional del sistema. Postgres es la fuente de verdad transaccional; MongoDB persiste eventos históricos y auditoría con las siguientes ventajas:

- **Escritura de alto volumen sin bloquear el core**: los accesos por QR pueden generar picos concurrentes en horarios pico (~cientos por minuto). Mongo absorbe la ráfaga sin comprometer las transacciones de Postgres.
- **Documento flexible**: los eventos de auditoría cambian de shape según el modelo (`Socio` vs `Pago` vs `Clase`) — sin necesidad de una tabla con nullables o de EAV.
- **Retención automática**: TTL indexes eliminan documentos antiguos sin cron jobs manuales (compromiso 4R del PDF).

**Conexión:** `core/mongodb.py` (Singleton `MongoClient` + helpers `get_collection`, `log_qr_event`, `log_audit_event`).

**Base de datos:** `winnie_gym_logs` (configurable via `MONGO_DB_NAME`).

---

## Colección `qr_history`

Historial completo de eventos de generación y escaneo de QR. **Escrita de forma asíncrona vía Celery task `access.log_qr_event`** (previamente `Thread(daemon=True)`) para no bloquear la respuesta del endpoint de validación.

### Documento tipo

```json
{
  "_id": ObjectId("..."),
  "postgres_access_log_id": 1523,
  "timestamp": "2026-09-11T14:32:17.582Z",
  "access_type": "ENTRY",
  "status": "GRANTED",
  "denial_reason": null,
  "user_id": 42,
  "scanned_by_id": 7,
  "qr_jti": "e6a8f9c1..."
}
```

### Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `_id` | ObjectId | Autogenerado |
| `postgres_access_log_id` | int | FK lógica a `access_accesslog.id` para join si es necesario |
| `timestamp` | ISO 8601 string | Momento del evento (UTC) |
| `access_type` | string | `ENTRY` o `EXIT` |
| `status` | string | `GRANTED` o `DENIED` |
| `denial_reason` | string \| null | Uno de: `TOKEN_EXPIRED`, `INVALID_SIGNATURE`, `INVALID_TOKEN`, `REPLAY_ATTACK`, `MEMBERSHIP_INACTIVE`, `NO_MEMBERSHIP`, `USER_SUSPENDED`, `UNKNOWN_USER` |
| `user_id` | int \| null | ID del socio (nullable si `UNKNOWN_USER`) |
| `scanned_by_id` | int \| null | ID del operador que escaneó |
| `qr_jti` | string \| null | JTI del token QR consumido (anti-replay) |

### Índices

| Índice | Motivo |
|---|---|
| `_id` | Default MongoDB |
| `timestamp` (desc) | Query frecuente: eventos recientes |
| `user_id` | Historial de accesos por socio |
| `qr_jti` | Trazabilidad de un token específico |
| `postgres_access_log_id` | Join lookup contra Postgres |
| **TTL `timestamp`** | Retención automática (90 días) |

Provisionados via `python manage.py create_mongo_indexes`.

### Justificación de usar Mongo (vs Postgres)

- El volumen crece linealmente con la operación diaria (ingresos + egresos por socio) → tabla Postgres se vuelve pesada rápido.
- No hay JOINs contra este dataset — solo lecturas por rango temporal + filtros simples.
- La estructura es plana y estable → no requiere schema migrations.
- El TTL nativo evita mantener un cron de cleanup.

---

## Colección `audit_logs`

Trail de acciones administrativas sobre modelos críticos (`Socio`, `PlanMembresia`, `Membresia`, `Clase`, `Pago`). Escrita vía signals `post_save` / `post_delete` — cero código en las views, cobertura total.

### Documento tipo

```json
{
  "_id": ObjectId("..."),
  "timestamp": "2026-09-11T14:35:02.104Z",
  "action": "update",
  "model": "memberships.Membresia",
  "instance_id": 87,
  "actor_id": 3,
  "actor_email": "admin@winnie.local",
  "actor_rol": "administrador",
  "changes": {
    "estado": ["activa", "vencida"],
    "fecha_fin": ["2026-10-11", "2026-10-11"]
  },
  "snapshot": {
    "socio_id": 42,
    "plan_id": 2,
    "estado": "vencida",
    "fecha_inicio": "2026-09-11",
    "fecha_fin": "2026-10-11"
  }
}
```

### Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `_id` | ObjectId | Autogenerado |
| `timestamp` | ISO 8601 string | Momento del evento (UTC) |
| `action` | string | `create` \| `update` \| `delete` |
| `model` | string | `"<app_label>.<ModelName>"` |
| `instance_id` | int | PK del objeto afectado |
| `actor_id` | int \| null | ID del `User` que ejecutó (nullable si el trigger fue interno) |
| `actor_email` | string \| null | Email del actor (redundante pero útil si el user se elimina) |
| `actor_rol` | string \| null | `administrador`, `recepcionista`, `socio` o `system` |
| `changes` | object \| null | Diff `{field: [before, after]}` — solo campos que cambiaron (update) |
| `snapshot` | object | Estado post-cambio del objeto (create/update); estado previo (delete) |

### Índices

| Índice | Motivo |
|---|---|
| `_id` | Default MongoDB |
| `timestamp` (desc) | Query frecuente: últimas acciones |
| `actor_id` | Auditoría por usuario |
| `action` | Filtrar por tipo de operación |
| `model` | Filtrar por modelo (ej. "todos los cambios en Membresia") |
| **TTL `timestamp`** | Retención automática (90 días) |

### Justificación de usar Mongo (vs Postgres)

- El shape del `snapshot` / `changes` es distinto por modelo → schema-less encaja natural.
- El volumen es alto pero las queries son puntuales (por actor, por modelo, por fecha) → no requiere JOINs.
- Separar la auditoría del core evita que un incidente en el trail (ej. Mongo down) rompa las escrituras de negocio.
- Análisis forense a posteriori se hace desde el shell de Mongo con `.find()` — no requiere ETL.

---

## Política de retención (compromiso 4R del PDF)

- **90 días** por default en ambas colecciones (TTL index sobre `timestamp`).
- Configurable via env: `MONGO_RETENTION_DAYS`.
- Recuperación de datos históricos más allá de 90 días requiere backup — no soportado en dev.

## Comandos operativos

```bash
# Recrear índices y TTLs (idempotente)
docker compose exec backend python manage.py create_mongo_indexes

# Ver estadísticas
docker compose exec mongo mongosh -u admin -p admin --authenticationDatabase admin winnie_gym_logs \
  --eval 'db.getCollectionNames().forEach(c => print(c + ": " + db[c].countDocuments()))'

# Ver TTL configurado
docker compose exec mongo mongosh -u admin -p admin --authenticationDatabase admin winnie_gym_logs \
  --eval 'db.qr_history.getIndexes()'
```
