# Deploy — Winnie The Gym

Guía paso a paso para llevar el proyecto a producción con el stack acordado en la [wiki de Despliegue](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/wiki/Despliegue). Todo en free tiers, costo total: **$0**.

## 🎯 Target de deploy

```
Cliente ─── HTTPS ─────────────────→ Vercel (React SPA)
        └── HTTPS / WSS ───────────→ Render (Django + Channels + Celery)

Render Web  ├── PostgreSQL ────────→ Supabase (Session Pooler)
            ├── Storage médico ────→ Supabase Storage (fichas-medicas)
            ├── MongoDB ───────────→ MongoDB Atlas (auditoría + qr_history)
            ├── Redis ─────────────→ Upstash (broker Celery + Channel Layer)
            ├── Errors + perf ─────→ Sentry (backend + frontend)
            └── Emails ────────────→ Mailtrap Sending (API HTTP)

UptimeRobot ─ ping cada 5min ─────→ Render /api/health/
```

## 📋 Checklist previo — cuentas a crear

| Servicio | URL | Free tier |
|---|---|---|
| **Render** | https://render.com | Web + 2 workers |
| **Supabase** | https://supabase.com | 500 MB Postgres + 1 GB Storage |
| **MongoDB Atlas** | https://mongodb.com/atlas | 512 MB cluster shared |
| **Upstash** | https://upstash.com | 10.000 requests/día Redis |
| **Vercel** | https://vercel.com | Deploys ilimitados hobby |
| **UptimeRobot** | https://uptimerobot.com | 50 monitors HTTP |
| **Mailtrap** | https://mailtrap.io | (ya creada) |
| **MercadoPago** | https://mercadopago.com.ar/developers | (ya creada) |

**Tiempo estimado de setup total: 60-90 minutos** (la primera vez).

---

## 🗄️ 1) Supabase — Postgres + Storage

### 1.1 Crear proyecto
1. https://supabase.com → **New project**
2. Nombre: `winnie-the-gym`, password fuerte para la BD (guardala)
3. Región: cercana al equipo (`us-east-1` o `sa-east-1`)
4. Plan: **Free**

### 1.2 Obtener connection string
1. Settings → **Database**
2. En la sección **Connection string** elegir **Session pooler** (compatible con Django)
3. Copiar el string tipo:
   ```
   postgresql://postgres.<project-ref>:<password>@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```
4. Desglosarlo en las env vars de Render:
   - `DB_NAME=postgres`
   - `DB_USER=postgres.<project-ref>`
   - `DB_PASSWORD=<tu-password>`
   - `DB_HOST=aws-0-us-east-1.pooler.supabase.com`
   - `DB_PORT=5432`

### 1.3 Crear bucket de Storage
1. Storage → **Create bucket**
2. Nombre: `fichas-medicas`, marcar como **Public** (para simplificar; en producción real → privado con URLs firmadas)
3. Policy: Storage → Policies → agregar policy "Allow authenticated uploads" (o dejar público en free)

### 1.4 Credenciales S3 del Storage
1. Project Settings → **Storage** → **S3 Connection**
2. Copiar:
   - Endpoint: `https://<project-ref>.supabase.co/storage/v1/s3`
   - Access key + Secret key (generar si no existen)
3. Mapea a:
   - `SUPABASE_STORAGE_ENDPOINT=https://<project-ref>.supabase.co/storage/v1/s3`
   - `SUPABASE_STORAGE_ACCESS_KEY=<access-key>`
   - `SUPABASE_STORAGE_SECRET_KEY=<secret-key>`
   - `SUPABASE_STORAGE_PUBLIC_URL_BASE=https://<project-ref>.supabase.co/storage/v1/object/public`
   - `SUPABASE_STORAGE_BUCKET=fichas-medicas`

---

## 🍃 2) MongoDB Atlas

1. https://mongodb.com/atlas → **Create cluster** (M0 Free)
2. Provider AWS, región cercana
3. **Database Access**: crear user `winnie_app` con password
4. **Network Access**: agregar `0.0.0.0/0` (Render no tiene IPs fijas en free)
5. **Connect** → **Drivers (Python)** → copiar connection string:
   ```
   mongodb+srv://winnie_app:<password>@cluster.xxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Mapea a: `MONGO_URI=<connection-string>` · `MONGO_DB_NAME=winnie_gym_logs`

---

## ⚡ 3) Upstash Redis

1. https://upstash.com → **Create Database**
2. Type: **Regional** · Region: cercana · TLS **enabled** (obligatorio en free)
3. Connect → tab **redis-cli**, copiar la URL `rediss://default:<token>@<host>:6379`
4. Mapea a:
   - `CELERY_BROKER_URL=rediss://default:<token>@<host>:6379/0`
   - `CELERY_RESULT_BACKEND=rediss://default:<token>@<host>:6379/1`
   - `REDIS_HOST=<host>` · `REDIS_PORT=6379`

**Nota:** el mismo Redis se usa para Celery + Django Channels + Django cache — separado por número de DB.

---

## 🐍 4) Render — Backend (web + 2 workers)

### 4.1 Preparación
- El repo ya tiene `render.yaml` en la raíz — Render lo detecta automáticamente.
- Dockerfile: `backend/Dockerfile.prod` (multi-stage, usa Daphne para ASGI).

### 4.2 Deploy
1. Render → **New** → **Blueprint**
2. Conectar la cuenta GitHub y elegir este repo
3. Elegir el branch `develop`
4. Confirmar — Render crea los 3 servicios (`winnie-backend`, `winnie-celery-worker`, `winnie-celery-beat`)
5. **NO despliega todavía** — primero cargar env vars

### 4.3 Cargar variables de entorno
1. En Render → **Env Groups** → `winnie-shared`
2. Rellenar los `sync: false` con los valores de los pasos 1-3:
   - Postgres (5 vars)
   - MongoDB (1 var)
   - Redis (3 vars: URLs con TLS)
   - Supabase Storage (4 vars)
   - Mailtrap (1 var: `MAILTRAP_API_TOKEN`)
   - MP (4 vars: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`, `MP_APP_ID`)
   - Google OAuth (2 vars)
   - Sentry (1 var: `SENTRY_DSN` opcional)
3. Ajustar `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` con los subdominios reales que Render y Vercel te generen
4. Trigger manual deploy en `winnie-backend`

### 4.4 Verificación post-deploy
```bash
# Health check completo (postgres + redis + mongo)
curl https://winnie-backend.onrender.com/api/health/

# Swagger accesible
curl -I https://winnie-backend.onrender.com/api/docs/
```

### 4.5 Registrar el nuevo webhook en MercadoPago
- Panel MP → tu app → **Notificaciones**
- URL: `https://winnie-backend.onrender.com/api/payments/webhook/`
- Reemplaza la URL de ngrok que teníamos en dev

---

## ⚛️ 5) Vercel — Frontend

### 5.1 Deploy
1. Vercel → **Add new project** → import repo
2. Framework: detecta Vite automáticamente
3. Root directory: `frontend`
4. Build command: `npm run build` (ya está en `frontend/vercel.json`)
5. Output: `dist`

### 5.2 Env vars (Settings → Environment Variables)
```
VITE_API_URL=https://winnie-backend.onrender.com/api
VITE_WS_BASE_URL=wss://winnie-backend.onrender.com
VITE_GOOGLE_CLIENT_ID=<mismo que backend GOOGLE_CLIENT_ID>
VITE_MP_PUBLIC_KEY=<MP_PUBLIC_KEY sandbox>
VITE_MP_ENV=sandbox
VITE_SENTRY_DSN=<sentry frontend DSN — opcional>
VITE_SENTRY_ENVIRONMENT=production
```

### 5.3 Deploy y verificar
1. Redeploy tras cargar las env vars
2. Abrir la URL de Vercel (ej: `winnie-the-gym.vercel.app`)
3. Verificar login con Google y que las requests van al backend Render (revisar Network tab del browser)

---

## 🏓 6) UptimeRobot — Keep-alive

Render free duerme el servicio tras 15 min sin tráfico. UptimeRobot lo mantiene despierto y actúa como healthcheck externo.

1. UptimeRobot → **Add New Monitor**
2. Monitor type: **HTTP(s)**
3. URL: `https://winnie-backend.onrender.com/api/health/`
4. Monitoring interval: **5 minutes**
5. Save

---

## 📊 7) Sentry (opcional, altamente recomendado)

1. https://sentry.io → **Create project**
2. Backend: elegir platform **Django** → copiar DSN → cargar como `SENTRY_DSN` en Render
3. Frontend: crear un segundo project con platform **React** → copiar DSN → cargar como `VITE_SENTRY_DSN` en Vercel

Sin DSN, el código no envía nada (opt-in explícito).

---

## 🔄 8) Backup periódico (compromiso "Recuperar" de las 4R)

- **Supabase**: `Database` → `Backups`. En free tier hay backups diarios automáticos con retención 7 días. Configurar aquí no requiere acción.
- **MongoDB Atlas**: `Backup` → M0 free NO tiene backups automáticos. Alternativa: workflow GitHub Actions que corre `mongodump` semanal y sube a un bucket. Fuera de scope de MVP.

---

## ✅ Checklist final post-deploy

- [ ] `GET https://<render>/api/health/` → `200` con los 3 probes en OK
- [ ] `GET https://<render>/api/docs/` → renderiza Swagger UI
- [ ] Frontend Vercel abre y muestra el login
- [ ] Login con Google funciona end-to-end (crea User + Socio en Supabase Postgres)
- [ ] `POST /api/payments/preferencias/` devuelve `init_point` real de MP
- [ ] Webhook MP registrado y verificado con un pago sandbox
- [ ] `ws://<render>/ws/aforo/?token=<jwt>` acepta conexión admin
- [ ] Subida de certificado médico persiste en Supabase Storage
- [ ] UptimeRobot verde
- [ ] Sentry recibe eventos (si está configurado): crear una excepción de prueba

---

## 🩹 Troubleshooting común

### `daphne` no arranca / puerto ocupado
El `render.yaml` usa el `CMD` del `Dockerfile.prod` que hace `daphne -b 0.0.0.0 -p ${PORT}`. Render setea `PORT` automáticamente — no lo overridees.

### `DisallowedHost` al conectarse
Actualizar `ALLOWED_HOSTS` en el env group con el subdominio real que Render asignó (ej: `winnie-backend-xxx.onrender.com`).

### WebSocket 404
- Verificar que `daphne` está en `INSTALLED_APPS` (ya está en el código, no debería fallar)
- Verificar que el frontend usa `wss://` en producción, no `ws://`
- Chequear logs de Render por `websocket disconnect code=1006`

### Supabase Storage 403 al subir
- Verificar que el bucket `fichas-medicas` existe y tiene policy que permite `INSERT`/`UPLOAD` desde el user autenticado con S3
- La access key + secret deben tener permisos de `storage:objects:insert`

### Emails no llegan a inbox real
- Mailtrap Sending con dominio `demomailtrap.co` **solo entrega al owner** de la cuenta (`fodrii2001@gmail.com`)
- Para entregar a cualquier email hay que verificar un dominio propio (issue #63 abierta)

### Celery Beat no dispara el job
- Verificar que el servicio `winnie-celery-beat` está corriendo en Render
- La schedule fue creada por la data migration `memberships.0004_seed_expiration_schedule`; si no aparece, correr `python manage.py migrate` desde el shell de Render

### Render free duerme
- UptimeRobot con ping cada 5min lo mantiene despierto
- Si aún así se duerme, verificar que la URL del monitor es correcta y responde 200

---

## 📎 Recursos

- Wiki original: [Despliegue](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/wiki/Despliegue)
- Decisiones técnicas: [`.atl/decisions/data-devops-hardening.md`](.atl/decisions/data-devops-hardening.md)
- Arquitectura general: [`docs/architecture.md`](architecture.md)
- Blueprint Render: [`render.yaml`](../render.yaml)
- Vercel config: [`frontend/vercel.json`](../frontend/vercel.json)
