---
id: BK-ACC-06
titulo: Aforo máximo efectivo — alertas de umbral y bloqueo opcional de ingresos al llegar a capacidad
tipo: feature
roles: [administrador, recepcionista]
prioridad: P1
tamano: L
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-ACC-05, BK-ACC-01]
---

# BK-ACC-06 · Aforo máximo efectivo (alertas y bloqueo)

## 1. Resumen
`GymConfig.aforo_maximo` existe, se edita desde Configuración y se usa **solo para dibujar** barras/anillos en el frontend. El backend nunca lo lee: no hay alerta al acercarse al tope ni forma de impedir ingresos cuando el gimnasio está lleno. Los colores de umbral están además duplicados e inconsistentes (70/90 % en un componente, 85 % en otro).

## 2. Objetivo de usuario
Como **administrador** quiero **configurar un umbral de alerta y (opcionalmente) bloquear nuevos ingresos al llegar al máximo** para **cumplir el límite de capacidad y que recepción reciba un aviso a tiempo**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/common/models.py:4-36` | `GymConfig` singleton (pk=1, `get()`); campos `nombre_gym`, `aforo_maximo=IntegerField(default=200)`, `hora_apertura`, `hora_cierre`, `telefono_contacto`. Sin validadores. |
| Backend API | `backend/apps/common/views.py:10-27`, `serializers.py:6-15` | `GET /api/config/gym/` (AllowAny) / `PATCH` (`IsAdminOnly`). El serializer no valida: un `aforo_maximo` de `-5` o `0` se acepta (los tests `backend/apps/common/tests/test_gym_config.py` no cubren validación). |
| Backend uso | `rg "aforo_maximo\|GymConfig" backend/apps --glob '!tests' --glob '!migrations'` | Solo `apps/common/*`. **Ningún código de `apps/access` lo consulta.** |
| Backend aforo | `backend/apps/access/services.py:15-38,154-163` | `compute_aforo_actual` / `get_aforo_actual` (cache 5 s). Sin comparación con el máximo. |
| Backend WS | `backend/apps/access/ws_signals.py:21-39`, `consumers.py:18-52` | Solo mensajes `aforo.snapshot` y `aforo.update` con `{aforo_actual, ingresos_hoy, egresos_hoy}`. No hay tipo de mensaje de alerta. |
| Backend notificaciones | `backend/apps/common/tasks.py:11-30`, `emails.py`, `templates/emails/*.html`, `apps/memberships/tasks.py:45-90`, `memberships/migrations/0004_seed_expiration_schedule.py` | Infra reutilizable: `enqueue_email(template_base, subject, to, context, category)`, Celery + `django_celery_beat` (`DatabaseScheduler`, `base.py:368`), tarea diaria sembrada por migración. Plantillas existentes: `expiration_alert`, `payment_confirmation`, `welcome`, `clase_cancelada`. No hay tarea ni plantilla de aforo. |
| Frontend config | `frontend/src/pages/admin/AdminConfiguracionPage.jsx:14-18,36-45,104-135` | Form `react-hook-form` + `zod` (`aforo_maximo: z.coerce.number().int().min(1).max(9999)`, `hora_*` `HH:MM`), `useGymConfig`/`useUpdateGymConfig`, `toast` de sonner. Mensaje de error de API: `Object.values(data).flat().join(' ')`. |
| Frontend cache | `frontend/src/hooks/queries/useGymConfig.js:16-22` | `staleTime: Infinity`; otros navegadores no se enteran de un cambio de tope hasta recargar. |
| Frontend umbrales | `frontend/src/components/dashboard/AforoCard.jsx:29-34` | Color: ≥ 90 % error, ≥ 70 % warning, resto success. |
| Frontend umbrales | `frontend/src/components/recepcion/OccupancyCard.jsx:5-6` | `isHighCapacity = pct > 85` (otro criterio). Sin aviso textual. |
| Frontend terminal | `frontend/src/pages/recepcion/AccesoTerminalPage.jsx:84` | `Aforo N/200` fijo (se corrige en BK-ACC-05). |
| Frontend WS | `frontend/src/hooks/useWebSocket.js:68-75` | `lastMessage` guarda solo el último mensaje (cualquier tipo); no hay manejo por `type`. |

## 4. Alcance
**Incluye:** validación de `aforo_maximo`; dos campos de configuración nuevos (umbral de alerta %, bloqueo al llegar al máximo); motivo de denegación `AFORO_FULL`; mensaje WS `aforo.alert`; aviso en Monitor, Terminal y toast; (opcional) email a administradores; unificación de umbrales en el frontend.
**No incluye:** reservas de turno/franjas, lista de espera para entrar, aforo por sala/clase (hay capacidad de clases en el área CLS), notificaciones push móviles.

## 5. Contrato de API (propuesta)
**[EXISTE → MODIFICAR] `GET|PATCH /api/config/gym/`** — campos actuales `nombre_gym, aforo_maximo, hora_apertura, hora_cierre, telefono_contacto`; **[A CREAR]** `aforo_alerta_pct` (int 1-100, default 90) y `aforo_bloqueo_activo` (bool, default `false`). Validaciones en `GymConfigSerializer`: `aforo_maximo >= 1` → 400 `{"aforo_maximo": ["El aforo máximo debe ser mayor a 0."]}`; `aforo_alerta_pct` entre 1 y 100.

**[EXISTE → MODIFICAR] `POST /api/access/qr/scan/` y `/manual/`** — si `access_type == 'ENTRY'` y `aforo_bloqueo_activo` y `get_aforo_actual(use_cache=False)['aforo_actual'] >= aforo_maximo` → `403`, `status: "DENIED"`, `denial_reason: "AFORO_FULL"` (nuevo valor de `AccessLog.DenialReason`, label "Aforo completo"), log DENIED creado (no suma al aforo). La regla va dentro de la función `evaluate_access` propuesta en BK-ACC-01.

**[A CREAR] mensaje WebSocket** `ws/aforo/` (`AforoConsumer`): `{ "type": "aforo.alert", "nivel": "warning"|"full"|"ok", "aforo_actual": int, "aforo_maximo": int, "porcentaje": int }`. Se emite desde `ws_signals.broadcast_aforo_on_access` solo cuando **cambia de nivel** (estado en cache `aforo:alert_level`, con histéresis: vuelve a `ok` recién 5 puntos por debajo del umbral). Se agrega el handler `aforo_alert` en `consumers.py` (patrón de `aforo_update`, línea 49).
**[A CREAR, opcional] email** `aforo_alert` (plantilla `backend/apps/common/templates/emails/aforo_alert.html`) a usuarios `rol='administrador'` activos vía `enqueue_email(..., category='aforo_alert')` en el mismo cambio de nivel `warning→full`, con cooldown de 30 min en cache.

## 6. Modelo de datos (propuesta)
`GymConfig`: `aforo_alerta_pct = PositiveSmallIntegerField(default=90, validators=[MinValueValidator(1), MaxValueValidator(100)])`, `aforo_bloqueo_activo = BooleanField(default=False)`; `aforo_maximo` con `MinValueValidator(1)`. Migración `backend/apps/common/migrations/0003_...` (existen `0001` y `0002_gymconfig_default_row.py`; verificar el último número al implementar). Ampliar `AccessLog.DenialReason` con `AFORO_FULL` (migración de choices en `apps/access`).

## 7. Diseño frontend
- **Config:** en `AdminConfiguracionPage.jsx` agregar al schema zod `aforo_alerta_pct: z.coerce.number().int().min(1).max(100)` y `aforo_bloqueo_activo: z.boolean()`; inputs debajo de "Aforo máximo" con el mismo `inputCls`; checkbox "Bloquear ingresos al llegar al máximo". Textos: "Avisar al llegar al (%)", "Bloquear ingresos al llegar al máximo", ayuda "Recepción verá el aviso y los ingresos nuevos serán rechazados con el motivo «Aforo completo»".
- **Hook:** `frontend/src/hooks/useAforoAlert.js` — recibe `lastMessage` del `useWebSocket('/ws/aforo/')` y, cuando `type==='aforo.alert'`, dispara `toast.warning('Aforo al 90 % (180/200)')` / `toast.error('Aforo completo (200/200)')` (sonner) una vez por cambio de nivel. Usarlo en `AforoMonitorPage.jsx`, `AccesoTerminalPage.jsx` y dashboards de staff.
- **Umbrales únicos:** `frontend/src/utils/aforo.js` → `getAforoLevel(current, max, alertPct) -> 'ok'|'warning'|'full'` y usarlo en `AforoCard.jsx:29-34` y `OccupancyCard.jsx:5-6` (hoy 70/90 vs 85).
- **Terminal:** banner persistente ámbar/rojo sobre `ScannerPanel` cuando el nivel ≠ `ok`; `ValidationResult` con `DENIAL_REASONS.AFORO_FULL = 'Aforo completo: no se admiten más ingresos'`.
- **Estados:** loading = skeleton existente; error de guardado = toast con mensaje del serializer; cambio de config invalida `['gymConfig']` (ya se hace con `setQueryData`); como `staleTime: Infinity`, además refrescar el config al recibir un `aforo.alert` o reducir `staleTime` a 5 min.
- **Responsive:** el banner ocupa el ancho completo a 375 px; el badge de aforo del TopBar se mantiene.

## 8. Archivos a crear / modificar
Backend: `apps/common/{models,serializers}.py` + migración; `apps/access/{models,services,ws_signals,consumers,views}.py` + migración; `apps/common/tasks.py`/template (opcional); tests `apps/common/tests/test_gym_config.py`, `apps/access/tests/test_aforo_alert.py` (nuevo), `test_aforo_websocket.py` (ampliar).
Frontend: `AdminConfiguracionPage.jsx`, `hooks/useAforoAlert.js` (+test), `utils/aforo.js` (+test), `AforoCard.jsx`, `OccupancyCard.jsx`, `AforoMonitorPage.jsx`, `AccesoTerminalPage.jsx`, `ValidationResult.jsx`.

## 9. Plan de pruebas (TDD)
Backend (pytest; los tests WS usan `pytest.mark.django_db(transaction=True)` + `pytest.mark.asyncio` + `WebsocketCommunicator(application, '/ws/aforo/?token=...')`, ver `apps/access/tests/test_aforo_websocket.py:1-36,78-103`):
1. PATCH `aforo_maximo=0` → 400; `aforo_alerta_pct=101` → 400; no-admin → 403 (ya cubierto en `test_gym_config.py`).
2. Con `aforo_maximo=2`, `aforo_bloqueo_activo=True`, dos entradas GRANTED → la 3ª ENTRY por DNI es `403 AFORO_FULL`; un EXIT sigue permitido; con bloqueo apagado la 3ª es 200.
3. WS: al cruzar de 89 % a 90 % llega un `aforo.alert` `nivel='warning'` (y solo uno si entran más personas sin cambiar de nivel); al llegar a 100 % `nivel='full'`; bajando de 85 % `nivel='ok'`.
4. (opcional) email encolado una vez por cooldown (`mail.outbox` con `EMAIL_BACKEND` locmem en `core/settings/test.py`).
Frontend (Vitest): `getAforoLevel` (tabla de casos); `useAforoAlert` dispara un toast por cambio de nivel (mock de `sonner`); `AdminConfiguracionPage` valida 1-100 y muestra el error del servidor; `OccupancyCard`/`AforoCard` usan el mismo nivel; el terminal muestra el banner y el motivo `AFORO_FULL`.
Manual: configurar aforo 3 / umbral 66 % / bloqueo ON en `/admin/configuracion` (cuenta `admin@winnie.local`), registrar 3 ingresos con DNIs demo y ver aviso y rechazo.

## 10. Criterios de aceptación
- **Dado** aforo máximo 200 y umbral 90 %, **cuando** el aforo llega a 180, **entonces** recepción y administración ven un aviso una sola vez y el indicador cambia de color en todas las pantallas por igual.
- **Dado** bloqueo activo y aforo completo, **cuando** se valida una entrada, **entonces** se rechaza con "Aforo completo" y queda registrado; las salidas siguen funcionando.
- **Dado** que se registran salidas hasta bajar del umbral menos 5 puntos, **cuando** vuelve a subir, **entonces** se emite una nueva alerta (histéresis).

## 11. Riesgos y decisiones abiertas
- ¿Bloquear o solo advertir por defecto? Recomendación: solo advertir (`aforo_bloqueo_activo=false`); bloquear exige que las salidas se registren de forma confiable (BK-ACC-01/02/07), si no el aforo estará inflado y se rechazaría gente de más.
- Condición de carrera en el chequeo `aforo >= max` (dos escaneos simultáneos): aceptable con tolerancia ±1; si importa, serializar con `select_for_update` sobre `GymConfig`.
- Destinatarios del email (¿todos los admin?): recomendación: admins activos; recepción ve el aviso en pantalla.

## 12. Referencias
- `CHANGELOG.md:130-132` (WS de aforo), `docs/architecture.md` (flujo de acceso y WebSocket), `backend/apps/memberships/tasks.py` (patrón de tarea + email + beat).
- Figma (opcional): "vistas live" → Recepción → Aforo.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1, DRF, Channels 4 + Redis, Celery + django_celery_beat; React 18 + Vite + TanStack Query v5 + sonner + zod + react-hook-form; Vitest). Implementá docs/backlog/items/BK-ACC-06-aforo-maximo-bloqueo-y-alertas.md. Asumí hechas BK-ACC-01 (evaluate_access en apps/access/services.py) y BK-ACC-05 (endpoint /api/access/aforo/ y max real en el terminal).
TDD: primero tests backend (apps/common/tests/test_gym_config.py, apps/access/tests/test_aforo_alert.py; WS con WebsocketCommunicator como en apps/access/tests/test_aforo_websocket.py) y tests Vitest (utils/aforo.test.js, hooks/useAforoAlert.test.jsx). Después: validadores y campos nuevos en GymConfig (aforo_alerta_pct, aforo_bloqueo_activo) con migración; DenialReason.AFORO_FULL; regla de bloqueo en evaluate_access solo para ENTRY; mensaje WS 'aforo.alert' con histéresis desde ws_signals.broadcast_aforo_on_access + handler aforo_alert en consumers.py; UI: campos en AdminConfiguracionPage, hook useAforoAlert (toast sonner), utils/aforo.js único para umbrales (AforoCard y OccupancyCard), banner y motivo en el terminal. Email opcional con enqueue_email.
UI en español rioplatense (voseo); código en inglés. No toques backend/loadtests ni hooks/useScreenWakeLock.js.
Terminado: `cd backend && pytest -q` (cov>=80 %) y `cd frontend && npx vitest run --coverage && npm run lint` verdes.
```
