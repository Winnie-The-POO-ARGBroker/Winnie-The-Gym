---
id: BK-PLT-14
titulo: La configuración de aforo máximo y horarios no se aplica en el backend (solo se muestra)
tipo: bug
roles: [administrador, recepcionista]
prioridad: P2
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-ACC-06]
---

# BK-PLT-14 · La configuración de aforo máximo y horarios no se aplica en el backend

## 1. Resumen
`AdminConfiguracionPage` permite editar `aforo_maximo`, `hora_apertura` y `hora_cierre` y se guardan en `GymConfig`, pero ninguna regla del backend los usa: el escaneo de QR y el acceso manual no rechazan por aforo completo ni por fuera de horario. El único uso real de `aforo_maximo` es mostrar la barra de ocupación en el frontend. El admin cree que está configurando un límite que no existe.

## 2. Objetivo de usuario
Como **administrador** quiero **que el aforo máximo y el horario configurados se respeten al validar accesos** para **evitar sobreocupación y entradas fuera de horario**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/common/models.py:10-14` | `GymConfig`: `nombre_gym`, `aforo_maximo` (int, default 200), `hora_apertura` (TimeField default `'07:00'`), `hora_cierre` (default `'23:00'`), `telefono_contacto`. Singleton `pk=1` (`:20-23`), `get()` crea si no existe (`:29-33`). |
| Backend API | `backend/apps/common/views.py:10-27` | `GymConfigView` (`RetrieveUpdateAPIView`): GET `AllowAny`, PATCH `IsAdminOnly`, PUT deshabilitado (`http_method_names = ['get','patch','head','options']`). Serializer `GymConfigSerializer.fields` = los 5 campos (`serializers.py:9-15`). Ruta `GET/PATCH /api/config/gym/` (`common/urls.py`, montada en `core/urls.py`). |
| Backend acceso | `backend/apps/access/views.py:60-143` (`ScanQRView.post`) | Solo valida token QR, usuario activo (`USER_SUSPENDED`) y membresía activa (`MEMBERSHIP_INACTIVE`, `has_active_membership`, `access/services.py:170`). No consulta `GymConfig`. |
| Backend búsqueda | `rg "aforo_maximo\|hora_apertura\|hora_cierre\|GymConfig" backend/apps --glob '*.py' --glob '!*test*' --glob '!migrations'` | Solo aparece en `common/` (modelo, vista, serializer). Ni `access`, ni `classes`, ni `reports` lo importan (verificado). |
| Backend aforo | `backend/apps/access/services.py:15-35` | `compute_aforo_actual()` devuelve `aforo_actual` (entradas − salidas) sin comparar con ningún máximo. |
| Frontend config | `frontend/src/pages/admin/AdminConfiguracionPage.jsx:12-18,36-47` | Schema Zod y valores por defecto de los 5 campos; guarda con `useUpdateGymConfig`. |
| Frontend uso | `frontend/src/components/dashboard/views/AdminDashboardView.jsx:48`, `RecepcionistaDashboardView.jsx:64`, `frontend/src/pages/recepcion/AforoMonitorPage.jsx:19` | Usan `gymConfig?.aforo_maximo ?? 200` para la barra de aforo. |
| Frontend hook | `frontend/src/hooks/queries/useGymConfig.js:14-31` | `useGymConfig` con `staleTime: Infinity`; `useUpdateGymConfig` hace `setQueryData` (sin invalidar, aunque el docstring dice "Invalidates"). |
| Tests | `backend/apps/common/tests/test_gym_config.py` | Cubre singleton, permisos GET/PATCH; no cubre reglas de acceso. |
| Docs | `backend/apps/common/models.py` | Sin comentarios que indiquen que es solo informativo. |

## 4. Alcance
**Coordinación:** el bloqueo/alertas por aforo lo detalla BK-ACC-06 (área ACC); implementar UNA sola vez. Esta ficha es dueña de la regla de HORARIO (`FUERA_DE_HORARIO`) y de las validaciones del serializer; el punto de `AFORO_COMPLETO` se documenta acá solo para dejar consistentes los códigos de rechazo.
**Incluye (decisión por defecto a confirmar):** en `ScanQRView` y `ManualAccessView` (`access/views.py:~156`), para accesos de tipo entrada: denegar con `denial_reason='AFORO_COMPLETO'` si `aforo_actual >= aforo_maximo`, y con `'FUERA_DE_HORARIO'` si la hora local (`America/Argentina/Buenos_Aires`, `TIME_ZONE`, `base.py:121`) está fuera de `[hora_apertura, hora_cierre]` (considerar cierre pasado medianoche); mostrar los nuevos motivos en la UI de acceso; aclaración en la página de configuración ("El aforo máximo bloquea nuevas entradas").
**No incluye:** horarios por día, feriados, aforo por sala/sede (BK-PLT-15, BK-PLT-10); bloqueo de salidas; override por staff (decisión abierta).

## 5. Contrato de API
- **[EXISTE]** `GET /api/config/gym/` → `{nombre_gym, aforo_maximo, hora_apertura, hora_cierre, telefono_contacto}` (200 sin auth); `PATCH` admin → mismo shape; 400 con errores por campo (DRF). Sin cambios.
- **[EXISTE, a extender]** `POST /api/access/qr/scan/` y `POST /api/access/manual/`: respuesta 403 `{status: 'DENIED', message: 'Acceso denegado: <motivo>', denial_reason: <motivo>, access_log: {...}}` (`views.py:134-143`); agregar motivos `AFORO_COMPLETO` y `FUERA_DE_HORARIO`. `AccessLog.denial_reason` es `CharField(max_length=50, choices=DenialReason.choices, null=True)` (`apps/access/models.py:57-63`): hay que agregar `AFORO_COMPLETO` y `FUERA_DE_HORARIO` a `DenialReason` y generar migración (solo cambia `choices`).
- Validación en `GymConfigSerializer`: `hora_cierre != hora_apertura` y `aforo_maximo >= 1` (hoy el backend no valida el mínimo; solo lo hace el schema Zod del frontend, `AdminConfiguracionPage.jsx:15`).

## 6. Modelo de datos
Sin cambios de modelo. Migración de `choices` en `AccessLog.denial_reason` (sin cambios de columna).

## 7. Diseño frontend
- Ruta existente `/configuracion` y `/admin/configuracion` (`roles=['administrador']`, `App.jsx:137-138`).
- Acceso/terminal: agregar los códigos a `DENIAL_REASONS` en `frontend/src/components/recepcion/ValidationResult.jsx:6-12` (hoy: `UNKNOWN_USER`, `USER_SUSPENDED`, `MEMBERSHIP_INACTIVE`, `REPLAY_ATTACK`, `TOKEN_EXPIRED`): "Aforo completo", "Fuera del horario del gimnasio".
- `AdminConfiguracionPage.jsx`: texto de ayuda bajo "Aforo máximo" y "Horarios".
- Estados: error inline ya existente (`errors.*`) más toast al guardar.
- Responsive: sin cambios.

## 8. Archivos a crear / modificar
- Modificar `backend/apps/access/services.py` (nueva función `check_gym_open_and_capacity(now)` que lee `GymConfig.get()` y `get_aforo_actual()`), `backend/apps/access/views.py` (ambas vistas), `backend/apps/common/serializers.py` (validaciones), tests.
- Frontend: `components/recepcion/ValidationResult.jsx` (mapeo de motivos), `AdminConfiguracionPage.jsx` (textos de ayuda); test del mapeo. Backend: `apps/access/models.py` (`DenialReason`) + migración.

## 9. Plan de pruebas (TDD)
Backend (pytest + `APITestCase`, factories de `backend/conftest.py`; ver tests de access en `backend/apps/access/tests/`): fijar la hora con `unittest.mock.patch` sobre `django.utils.timezone.now` (`freezegun` no está en `backend/requirements/`: verificado).
- Entrada con aforo = máximo → 403 `AFORO_COMPLETO` y `AccessLog` DENIED registrado.
- Entrada a las 06:59 con apertura 07:00 → 403 `FUERA_DE_HORARIO`; a las 07:00 → 200.
- Cierre pasada medianoche (apertura 20:00, cierre 02:00) funciona.
- Salida (`access_type` de salida) nunca se bloquea por aforo.
- `PATCH` con `aforo_maximo=0` → 400.
Frontend (Vitest): el mapeo de motivos devuelve el texto en voseo.
Manual: bajar `aforo_maximo` a 1 en `/configuracion` con admin, ingresar dos socios por la terminal.
Comandos: `cd backend && pytest apps/access apps/common -q`; `cd frontend && npx vitest run`.

## 10. Criterios de aceptación
- **Dado** aforo actual igual al máximo **cuando** un socio con membresía activa escanea **entonces** se deniega con motivo "Aforo completo".
- **Dado** una hora fuera del horario **cuando** escanea **entonces** se deniega con "Fuera del horario".
- **Dado** una salida **cuando** el gimnasio está lleno **entonces** se permite.

## 11. Riesgos y decisiones abiertas
- Cambia el comportamiento operativo (puede bloquear la puerta): ¿se quiere hard-block o solo alerta? **Recomendación:** hard-block para aforo con override explícito de recepción (campo `forzar_acceso`) y soft-warning para horario.
- `aforo_actual` se calcula con cache de 5 s (`AFORO_CACHE_TTL_SECONDS`, `services.py:12`): puede permitir sobrepasar por pocas personas; aceptable.
- ¿El horario aplica a staff? Recepción debería poder ingresar siempre.

## 12. Referencias
- BK-ACC-06 (aforo máximo efectivo), BK-BUG-08 (datos hardcodeados en UI).
- `speckit/spec.md` (REQ de configuración del gimnasio; mencionado en `speckit/proposal.md:26`, "config gimnasio"). Relacionados: BK-PLT-15, BK-PLT-10.

## 13. Prompt listo para un agente de IA
```
Contexto: backend/apps/common/models.py::GymConfig (singleton) tiene aforo_maximo, hora_apertura, hora_cierre editables en /configuracion, pero backend/apps/access/views.py (ScanQRView líneas 60-143, ManualAccessView) nunca los consulta; aforo_actual sale de access/services.py::get_aforo_actual.
Tarea (docs/backlog/items/BK-PLT-14-config-aforo-y-horarios-no-se-aplican.md): confirmá primero con el dueño la decisión de la sección 11. TDD primero: tests en apps/access/tests para AFORO_COMPLETO y FUERA_DE_HORARIO (hora congelada, cierre pasada medianoche, salidas permitidas) y validación aforo_maximo>=1 en GymConfigSerializer. Implementá check_gym_open_and_capacity en access/services.py, usalo en ambas vistas (agregá los valores a AccessLog.DenialReason + migración) y mapeá los motivos en frontend/src/components/recepcion/ValidationResult.jsx (DENIAL_REASONS).
Terminado: `cd backend && pytest -q` (>=80%) y `cd frontend && npm run lint && npx vitest run --coverage` verdes.
```
