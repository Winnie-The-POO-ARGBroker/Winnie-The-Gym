# Load tests — Winnie The Gym

Escenarios de prueba de carga contra el backend usando **Locust**. Validan los requerimientos no funcionales del sistema:

- **RNF01** — Validación de código QR bajo 2 segundos (p95 en `/api/access/qr/scan/`).
- **RNF06** — Disponibilidad ≥ 99.9% del módulo de accesos bajo concurrencia simulada.

---

## 1. Setup y Prerrequisitos

Locust y Faker ya se encuentran integrados en el contenedor de backend a través de `requirements/development.txt`.

Verificá que los servicios estén activos:
```bash
docker compose up -d
```

---

## 2. Flujo Canónico de Poblado de Usuarios

Para ejecutar pruebas de carga representativas, el backend debe poblarse con un volumen adecuado de usuarios sintéticos con roles y perfiles realistas.

### Generación con `seed_load_test_users` (Recomendado)
Genera usuarios sintéticos con perfiles Faker, credenciales configurables y membresías activas:

```bash
docker compose exec backend python manage.py seed_load_test_users --count 100 --purge
```

**Parámetros disponibles:**
- `--count N`: Volumen de usuarios a generar (por defecto: `100`).
- `--purge`: Elimina usuarios sintéticos previos que coincidan con el prefijo antes de generar.
- `--prefix <prefijo>`: Prefijo para las cuentas generadas (por defecto: `loadtest_`, creando `loadtest_00000@loadtest.local`).
- Contraseña por defecto: `LoadTest123!` (o la definida en la variable de entorno `LOAD_TEST_PASSWORD`).

**Distribución de roles automática (90/8/2%):**
- **Socios (90%):** Con registro `Socio` (DNI, teléfono) y `Membresia` activa asociada con fechas válidas.
- **Recepcionistas (8%):** Para simulación de terminales de escaneo en molinetes.
- **Administradores (2%):** Para consultas de reportes (con `is_staff=False` e `is_superuser=False` por seguridad defensiva).

### Usuarios fijos (Compatibilidad retroactiva)
Alternativamente, se pueden sembrar 3 usuarios puntuales para pruebas rápidas:
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

---

## 3. Variables de Entorno de Locust

`locustfile.py` se sincroniza automáticamente con el pool de usuarios generados mediante las siguientes variables de entorno (con valores por defecto acordes a `seed_load_test_users`):

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `LOAD_TEST_USERS_COUNT` | `100` | Cantidad total de usuarios que se sembraron con el comando |
| `LOAD_TEST_PREFIX` | `loadtest_` | Prefijo de los emails generados |
| `LOAD_TEST_DOMAIN` | `loadtest.local` | Dominio de los correos sintéticos |
| `LOAD_TEST_PASSWORD` | `LoadTest123!` | Contraseña compartida de los usuarios |

Si generaste un volumen distinto (por ejemplo, `--count 500`), ejecutá Locust indicando la variable:
```bash
docker compose exec -e LOAD_TEST_USERS_COUNT=500 backend locust -f loadtests/locustfile.py ...
```

---

## 4. Ejecución de Pruebas de Carga

### Modo Interactivo (Web UI)
Inicia el servidor web de Locust:
```bash
docker compose exec backend locust -f loadtests/locustfile.py --host http://localhost:8000
```
Abrí `http://localhost:8089` en el navegador para iniciar y monitorear la prueba en tiempo real.

### Modo Headless con Reporte HTML (CI / Benchmark Canónico)
Ejecuta la corrida de forma desatendida y genera un reporte HTML con percentiles:
```bash
docker compose exec backend locust \
  -f loadtests/locustfile.py \
  --host http://localhost:8000 \
  --headless \
  --users 50 \
  --spawn-rate 5 \
  --run-time 2m \
  --html docs/reports/rnf01-rnf06-$(date +%Y%m%d).html
```

---

## 5. Escenarios de Carga y Pesos de Tráfico

`locustfile.py` distribuye la concurrencia entre tres perfiles según el flujo de negocio del gimnasio:

1. **SocioUser** (Peso 3 - 60% del tráfico simulado):
   - Inicia sesión como uno de los socios del pool sintético.
   - Generación de código QR (`GET /api/access/qr/generate/`).
   - Consulta de estado de membresía (`GET /api/memberships/me/`).
   - Consulta de clases disponibles (`GET /api/classes/clases/`).
2. **RecepcionistaUser** (Peso 1 - 20% del tráfico simulado):
   - Inicia sesión como recepcionista.
   - Escaneo de credenciales QR en molinete (`POST /api/access/qr/scan/`).
   - Auditoría de accesos recientes (`GET /api/access/logs/`).
3. **AdminUser** (Peso 1 - 20% del tráfico simulado):
   - Inicia sesión como administrador.
   - Generación de reportes de morosidad (`GET /api/reportes/morosidad/?formato=csv`).
   - Sonda de salud (`GET /api/health/`).

---

## 6. Interpretación de Resultados y SLAs

- **RNF01 (Latencia QR < 2s):** En la tabla de estadísticas o el reporte HTML, verificar la columna **95%** para `POST /api/access/qr/scan/`. Debe ser inferior a `2000 ms`.
- **RNF06 (Disponibilidad ≥ 99.9%):** La tasa de fallo general agregada (`Failures`) no debe superar el `0.1%` de las solicitudes totales bajo carga sostenida.

Los reportes HTML generados se archivan bajo `docs/reports/` para seguimiento y trazabilidad entre sprints.
