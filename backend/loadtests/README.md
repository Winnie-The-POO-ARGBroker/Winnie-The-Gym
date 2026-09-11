# Load tests — Winnie The Gym

Escenarios de prueba de carga contra el backend usando Locust. Sirven para validar los requerimientos no funcionales del PDF:

- **RNF01** — Validación QR bajo 2 segundos.
- **RNF06** — Disponibilidad ≥ 99.9% del módulo de accesos.

## Setup

Locust ya viene instalado en el `requirements/development.txt`. Si necesitás forzarlo:

```bash
docker compose exec backend pip install locust==2.31.5
```

## Correr los tests

Contra el backend local (Docker):

```bash
docker compose exec backend locust \
  -f loadtests/locustfile.py \
  --host http://localhost:8000
```

Después abrí `http://localhost:8089` en el browser para ver el UI.

Para una corrida headless con reporte HTML:

```bash
docker compose exec backend locust \
  -f loadtests/locustfile.py \
  --host http://localhost:8000 \
  --headless \
  --users 50 \
  --spawn-rate 5 \
  --run-time 2m \
  --html /app/../docs/reports/rnf01-rnf06-$(date +%Y%m%d).html
```

## Escenarios

- **SocioUser** (peso 3): login → generar QR (task pesada, 30% del tráfico) + health check (10%)
- **RecepcionistaUser** (peso 1): login → escanear QR (simula el molinete)
- **AdminUser** (peso 1): login → consultar reportes

## Credenciales

El script asume que existen usuarios con estas credenciales en la BD (creá manualmente o con management command):

```
socio1@load.test / loadpass!
recep1@load.test / loadpass!
admin1@load.test / loadpass!
```

Podés seedear con:

```bash
docker compose exec backend python manage.py shell -c "
from django.contrib.auth import get_user_model
U = get_user_model()
for r in ['socio', 'recepcionista', 'administrador']:
    email = f'{r[:5]}1@load.test'
    U.objects.get_or_create(email=email, defaults=dict(username=email, rol=r, password='loadpass!'))
    u = U.objects.get(email=email); u.set_password('loadpass!'); u.save()
"
```

## Interpretación de resultados

- **RNF01**: el reporte muestra el p95 y p99 de latencia por endpoint. `POST /api/access/qr/scan/` debe estar bajo 2000ms en p95.
- **RNF06**: el reporte muestra la tasa de fallo. Debe ser ≤ 0.1% (equivale a 99.9% de disponibilidad simulada bajo carga).

El resultado histórico se archiva en `docs/reports/` para trazabilidad de la evolución.
