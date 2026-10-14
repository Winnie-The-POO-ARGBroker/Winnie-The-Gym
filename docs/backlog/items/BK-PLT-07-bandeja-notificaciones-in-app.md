---
id: BK-PLT-07
titulo: Bandeja de notificaciones in-app (campana con leídas / no leídas)
tipo: feature
roles: [administrador, recepcionista, socio]
prioridad: P3
tamano: L
estado_en_codigo: solo-idea
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-PLT-08]
---

# BK-PLT-07 · Bandeja de notificaciones in-app (campana con leídas / no leídas)

## 1. Resumen
Hoy toda comunicación al usuario sale por email; la app no guarda ni muestra notificaciones. No hay modelo `Notificacion`, ni endpoint, ni campana en el `TopBar`. Existe infraestructura reutilizable (Channels + Redis + Celery) pero solo para el aforo. Clasificación de la pieza: **(c) solo idea** (sin rastro en specs).

## 2. Objetivo de usuario
Como **socio** quiero **ver en la app los avisos de mi gimnasio (clase cancelada, membresía por vencer, pago confirmado) con indicador de no leídos** para **enterarme sin depender del email**. Como **staff** quiero **avisos operativos (membresías vencidas hoy, clase llena)**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelos | `backend/apps/*/models.py` | No existe modelo de notificaciones. `rg -i "notific" backend/apps --glob '!*test*' --glob '!migrations'` solo encuentra comentarios/rutas en `classes/views.py` y `payments/services.py` (verificado: no hay modelo). |
| Backend WS | `backend/apps/access/routing.py:6-8` | Única ruta WebSocket: `ws/aforo/`. |
| Backend WS | `backend/apps/access/consumers.py:18-60` | `AforoConsumer` (solo staff; cierra 4401/4403). Patrón de auth por `?token=` JWT (`backend/core/ws_auth.py`, usado en `core/asgi.py:19`). |
| Backend infra | `backend/core/settings/base.py:352-368` | Celery con broker Redis; `channels` con Redis (README:112 declara "WebSockets para … notificaciones" pero solo existe el de aforo). |
| Emails existentes | `backend/apps/common/signals.py:14-37`, `backend/apps/classes/signals.py:14-63`, `backend/apps/memberships/tasks.py:18-81`, `backend/apps/payments/services.py:47-` | Eventos de negocio que hoy emiten email y serían los productores de notificaciones in-app. |
| Frontend TopBar | `frontend/src/components/layout/TopBar.jsx:20-` | Sin campana ni contador; props: `title, subtitle, showLive, showSearch, onScan, rightContent, backAction`. |
| Frontend nav iconos | `frontend/src/constants/navIcons.js` | `NAV_ICON_MAP` sin icono de campana (`lucide-react` provee `Bell`). |
| Frontend WS | `frontend/src/hooks/useWebSocket.js:18-141` | Hook genérico `useWebSocket(path)` con reconexión/refresh de token (reutilizable). |

## 4. Alcance
**Incluye (propuesta):** modelo `Notificacion` por usuario, endpoints de listado/contador/marcar leída, campana con badge en `TopBar` (staff) y en `MemberLayout` (socio), productores desde los eventos de email existentes, polling (30–60 s) como primera versión; WebSocket `ws/notificaciones/` como mejora posterior.
**No incluye:** push del navegador/móvil (ver BK-PLT-08), preferencias por canal, notificaciones segmentadas masivas.

## 5. Contrato de API (propuesta, todo **[A CREAR]**)
Montar bajo `api/notificaciones/` en `backend/core/urls.py` (patrón: `path('api/<app>/', include(('apps.<app>.urls', '<app>'), namespace='<app>'))`). Permiso: `permissions.IsAuthenticated` filtrando por `request.user` (ver patrón de ownership en `AccessLogListView.get_queryset`, `backend/apps/access/views.py:239-`).
- `GET /api/notificaciones/` — paginado (DRF `PageNumberPagination`, `PAGE_SIZE=10`, `core/settings/base.py:181-182` → `{count,next,previous,results}`); query `?leida=true|false`. Item: `{id, tipo, titulo, mensaje, url, leida, creada_en}`.
- `GET /api/notificaciones/no-leidas/` → `{count: int}`.
- `POST /api/notificaciones/{id}/leer/` → 200 `{id, leida: true}`; 404 si es de otro usuario.
- `POST /api/notificaciones/leer-todas/` → 200 `{actualizadas: int}`.
Errores: formato DRF `{"detail": "..."}`.

## 6. Modelo de datos (propuesta)
App nueva `apps/notifications/` (convención: cada app autónoma, comunicación por servicios/signals según README:195):
```python
class Notificacion(models.Model):
    class Tipo(models.TextChoices):
        CLASE_CANCELADA = 'clase_cancelada'
        MEMBRESIA_POR_VENCER = 'membresia_por_vencer'
        PAGO_CONFIRMADO = 'pago_confirmado'
        GENERAL = 'general'
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notificaciones')
    tipo = models.CharField(max_length=40, choices=Tipo.choices)
    titulo = models.CharField(max_length=120)
    mensaje = models.TextField()
    url = models.CharField(max_length=200, blank=True)   # ruta interna del frontend
    leida = models.BooleanField(default=False)
    creada_en = models.DateTimeField(auto_now_add=True)
    class Meta:
        indexes = [models.Index(fields=['usuario', 'leida', '-creada_en'])]
        ordering = ['-creada_en']
```
Migración inicial; retención (borrar leídas > 90 días) con tarea Celery beat (`PeriodicTask`, ver `backend/apps/memberships/migrations/0004_seed_expiration_schedule.py`).

## 7. Diseño frontend
- **Rutas:** `/notificaciones` (lista completa) envuelta en `<ProtectedRoute>` sin `roles` (patrón `App.jsx:74`); el popover de la campana cubre el uso rápido.
- **Hooks (`frontend/src/hooks/queries/useNotificaciones.js`):** `useNotificaciones(params)`, `useNotificacionesNoLeidas()` (`refetchInterval: 45_000`), `useMarcarLeida()` y `useMarcarTodasLeidas()` (mutations con `invalidateQueries`); convención de las demás queries: `useQuery({ queryKey, queryFn })` con `api` de `services/api.js` (ver `useGymConfig.js`).
- **Componentes:** `components/notifications/NotificationBell.jsx` (icono `Bell` + badge numérico), `NotificationList.jsx` (items con estado leído/no leído); usar `EmptyState` (`components/ui/EmptyState.jsx`, props `icon,title,message`) y `Skeleton` para carga. Insertar la campana vía `rightContent` de `TopBar` o dentro de la cabecera de `MemberLayout.jsx`.
- **Estados:** loading skeleton, vacío ("No tenés notificaciones"), error (toast `sonner`), éxito silencioso.
- **Textos (es-AR):** "Notificaciones", "Marcar todas como leídas", "Ver todas".
- **Responsive:** a 375 px la lista abre como pantalla completa (`/notificaciones`) en vez de popover.

## 8. Archivos a crear / modificar
Crear `backend/apps/notifications/{models,serializers,views,urls,services,tests}`; registrar app en `INSTALLED_APPS` (`core/settings/base.py`) y URLs en `core/urls.py`; productores: llamar `notificar(usuario, tipo, ...)` desde `classes/signals.py`, `memberships/tasks.py`, `payments/services.py` junto a cada `enqueue_email`. Frontend: hook, componentes, ruta en `App.jsx`, campana en `TopBar.jsx` y `MemberLayout.jsx`.

## 9. Plan de pruebas (TDD)
- Backend (pytest + `APITestCase`, fixtures `make_user_factory` de `backend/conftest.py`): usuario solo ve las suyas (otro usuario → 404 en `leer`); contador; `leer-todas`; paginación; productor: cancelar una clase (`cancelar_clase`) crea una `Notificacion` por inscripto no en espera; `check_expiring_memberships` crea una por umbral. Correr `cd backend && pytest apps/notifications -q`.
- Frontend (Vitest + RTL): `NotificationBell` muestra badge con el conteo mockeado; click en item llama `leer` y navega a `url`; vacío y error.
- Manual: cancelar una clase como admin y ver la campana del socio inscripto (cuentas de `seed_demo_users`).

## 10. Criterios de aceptación
- **Dado** un socio inscripto **cuando** se cancela la clase **entonces** ve una notificación no leída y el badge incrementa; al abrirla queda leída.
- **Dado** otro usuario **cuando** intenta leer una notificación ajena **entonces** recibe 404.

## 11. Riesgos y decisiones abiertas
- ¿Polling o WebSocket? **Recomendación:** polling 45 s primero (Render Free tiene recursos limitados; un consumer por usuario aumenta carga).
- ¿Duplicar cada email como notificación o solo algunos tipos? **Recomendación:** los 4 existentes.
- Privacidad: no guardar datos sensibles en `mensaje`.

## 12. Referencias
- README:112 (WebSockets "y notificaciones"), `docs/architecture.md:77`. Sin especificación en `openspec/` ni `speckit/` (búsqueda `rg -i "notificaci|bandeja"` solo devuelve el soft-cancel de clases, REQ-3.4 de `speckit/spec.md`).
- Figma (opcional): No verificado.

## 13. Prompt listo para un agente de IA
```
Contexto: Django 5 + DRF + Celery + Channels; frontend React + react-query + Tailwind. No existe ninguna notificación in-app. Los eventos que hoy envían email: classes/signals.py (clase cancelada), memberships/tasks.py (vencimientos), payments/services.py (pago), common/signals.py (bienvenida).
Tarea (docs/backlog/items/BK-PLT-07-bandeja-notificaciones-in-app.md): TDD primero. Creá la app backend/apps/notifications con modelo Notificacion, endpoints GET /api/notificaciones/, GET no-leidas/, POST {id}/leer/, POST leer-todas/ (IsAuthenticated, filtrado por request.user), servicio notificar(), y llamalo junto a los enqueue_email existentes. Frontend: hooks en hooks/queries/useNotificaciones.js, NotificationBell en TopBar/MemberLayout y página /notificaciones. Copy es-AR (voseo).
Terminado: pytest -q (cobertura >= 80) y `npm run lint && npx vitest run --coverage` verdes. Confirmá con el dueño las decisiones abiertas antes de agregar WebSocket.
```
