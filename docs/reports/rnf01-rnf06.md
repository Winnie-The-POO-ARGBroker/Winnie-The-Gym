# RNF01 y RNF06 — Cómo capturar y evaluar

## Contexto

Del PDF Sprint 0:

- **RNF01**: "El tiempo de respuesta del backend para autorizar o denegar el acceso tras la lectura del QR no debe ser mayor a 2 segundos."
- **RNF06**: "El módulo principal de control de accesos (API de validación QR) debe garantizar una disponibilidad mínima del 99.9% durante el horario operativo habitual del gimnasio."

## Herramientas

- **Locust** para la carga sintética (`backend/loadtests/locustfile.py` — ver [su README](../../backend/loadtests/README.md))
- **Command Django `availability_report`** para el cálculo empírico de disponibilidad desde `AccessLog`
- **UptimeRobot** en producción (pinguea `/api/health/` cada 5 min — configurar según wiki `Despliegue.md`)

## RNF01 — Latencia del endpoint de validación QR

### Cómo capturar

```bash
# 1. Seedear usuarios de load test (una vez)
docker compose exec backend python manage.py shell -c "
from django.contrib.auth import get_user_model
U = get_user_model()
for r in ['socio', 'recepcionista', 'administrador']:
    email = f'{r[:5]}1@load.test'
    u, _ = U.objects.get_or_create(email=email, defaults=dict(username=email, rol=r))
    u.set_password('loadpass!'); u.save()
"

# 2. Correr Locust headless por 2 minutos con 50 usuarios
docker compose exec backend locust \
  -f loadtests/locustfile.py \
  --host http://localhost:8000 \
  --headless --users 50 --spawn-rate 5 --run-time 2m \
  --html /app/../docs/reports/rnf01-latency-$(date +%Y%m%d).html
```

### Cómo interpretar

El reporte HTML de Locust muestra por endpoint:

- **p50, p75, p95, p99** de latencia
- **Requests/segundo**
- **Fallos por segundo**

**Criterio de aprobación RNF01:** `p95(POST /api/access/qr/scan/) < 2000ms` bajo 50 usuarios concurrentes durante 2 minutos.

## RNF06 — Disponibilidad simulada del módulo QR

### Cómo capturar

```bash
# Reporte de últimos 30 días
docker compose exec backend python manage.py availability_report --days 30

# Reporte JSON para procesarlo o adjuntar a informes
docker compose exec backend python manage.py availability_report --days 30 --json
```

### Fórmula

```
disponibilidad = GRANTED / (GRANTED + DENIED[razón ∈ infra])
```

Donde:

- **GRANTED** son accesos exitosos
- **DENIED[infra]** = `TOKEN_EXPIRED` (falla técnica de round-trip)
- Se **excluyen** del denominador los denials legítimos de negocio (`MEMBERSHIP_INACTIVE`, `NO_MEMBERSHIP`, `USER_SUSPENDED`, `REPLAY_ATTACK`, `INVALID_SIGNATURE`, `INVALID_TOKEN`, `UNKNOWN_USER`) — no son falta de disponibilidad, son decisiones de negocio correctas.

### Cómo interpretar

**Criterio de aprobación RNF06:** `availability_percent >= 99.9%` sobre el rolling window elegido.

Ejemplo de output:

```
RNF06 — Disponibilidad simulada últimos 30 días
  GRANTED:                 1247
  DENIED (infra):          1
  DENIED (business skip):  38
  Availability:            99.9199%
  Target RNF06:            99.9%
  Cumple: SI
```

## Producción vs desarrollo

Este cálculo es una **aproximación empírica** basada en el histórico de accesos. Es útil para:

- Presentar evidencia en la defensa oral
- Detectar degradación cuando algo cambia (spike de `TOKEN_EXPIRED` puede indicar problema de reloj o de latencia entre backend y frontend)

Para tracking real en producción, la wiki `Despliegue.md` recomienda **UptimeRobot** con ping cada 5 minutos a `/api/health/` (que a partir del PR anterior chequea Postgres + Redis + Mongo reales).

## Archivos históricos

Los reportes generados quedan en `docs/reports/rnf01-latency-YYYYMMDD.html` (Locust) para poder comparar la evolución de la latencia entre sprints.
