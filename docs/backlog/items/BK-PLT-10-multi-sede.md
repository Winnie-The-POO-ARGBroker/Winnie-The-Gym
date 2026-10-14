---
id: BK-PLT-10
titulo: Multi-sede: modelo Sede y su impacto en QR, aforo, planes, clases y reportes
tipo: idea
roles: [administrador, recepcionista, socio]
prioridad: P3
tamano: XL
estado_en_codigo: solo-idea
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-PLT-14]
---

# BK-PLT-10 · Multi-sede: modelo Sede y su impacto

## 1. Resumen
El sistema asume un único gimnasio. No existe modelo `Sede`; "Sede Central" aparece hardcodeada en la credencial del socio y en un plan de seed, y los planes muestran un texto "1 sede"/"2 sedes" que solo existe en el frontend. Todo (config, aforo, QR, clases, reportes) es global.

## 2. Objetivo de usuario
Como **administrador de una cadena** quiero **gestionar varias sedes con su propio aforo, horarios y clases, y definir en qué sedes puede entrar cada socio** para **operar más de un local con un solo sistema**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `rg -i "sede" backend --glob '*.py'` | Sin modelo/campo `Sede`; solo aparece en `backend/seed_data.py:15` (`"nombre": "Pase Libre - Sede Central"`, nombre de un plan). |
| Backend config | `backend/apps/common/models.py:4-14` | `GymConfig` singleton (`pk=1`, `save()` fuerza `pk=1`, `:20-23`; `delete()` es no-op, `:25-27`): un solo gimnasio. |
| Backend aforo | `backend/apps/access/services.py:11-35` | `AFORO_CACHE_KEY = 'aforo:current'`; `compute_aforo_actual()` cuenta entradas menos salidas global (clave de cache única). |
| Backend WS | `backend/apps/access/consumers.py:15` | Un único grupo `aforo_updates`. |
| Backend clases | `backend/apps/classes/models.py:37` | `sala = CharField(default='Sala A')` (texto libre, sin sede). |
| Backend planes | `backend/apps/memberships/models.py:9-16` | `PlanMembresia(nombre, duracion_dias, precio, clases_asignadas, activo, es_popular)`: sin campo de sedes ni `matriz_comparativa`. |
| Frontend credencial | `frontend/src/pages/socio/CredencialDigitalPage.jsx:50,180-183` | `sedeHabitual: 'Sede Central'` hardcodeado y etiqueta "Sede Habilitada". |
| Frontend planes | `frontend/src/components/admin/PlanFormModal.jsx:30-37,63-70` y `PlanComparativeTable.jsx:49-52` | `matriz_comparativa.acceso_multisede: '1 sede'` y, en la tabla, `plan.nombre === 'Gold' ? '2 sedes' : '1 sede'` por nombre. Datos que el backend ignora: `PlanMembresia` no tiene ese campo (ver hallazgo en la sección 11). |
| Frontend config | `frontend/src/pages/admin/AdminConfiguracionPage.jsx:12-18` | Un único formulario global. |
| Specs | `openspec/`, `speckit/` | Sin menciones (`rg -i "multi-?sede\|sucursal"` solo en `PlanFormModal`/`PlanComparativeTable`). |

## 4. Alcance
**Incluye (propuesta):** modelo `Sede`; FK nullable→obligatoria en `Clase`, `AccessLog`; `Membresia`/`PlanMembresia` con sedes habilitadas (M2M); aforo y config por sede; selector de sede activa para staff; QR valida contra la sede del lector; reportes filtrables por sede; migración que crea "Sede Central" y asigna todo lo existente.
**No incluye:** transferencias de socios entre sedes con reglas propias, facturación por sede, roles por sede (ver BK-PLT-09).

## 5. Contrato de API (propuesta, **[A CREAR]**)
- `GET/POST /api/sedes/`, `PATCH/DELETE /api/sedes/{id}/` — lectura `IsAuthenticated`, escritura `IsAdminOnly` (`apps/access/permissions.py:35`). Campos: `{id, nombre, direccion, telefono, aforo_maximo, hora_apertura, hora_cierre, activa}`.
- Parámetro `?sede=<id>` (y header opcional `X-Sede-ID`) en: `GET /api/classes/clases/`, `GET /api/access/stats/` (`AforoStatsView`, `access/urls.py:11`), `GET /api/access/logs/`, reportes (`/api/reportes/…`).
- `POST /api/access/qr/scan/` (`ScanQRView`, `access/views.py:60-143`) debe recibir `sede` (o inferirla del terminal) y rechazar con 403 si la membresía no habilita la sede; hoy responde 403 con `{status, message, denial_reason, access_log}` y `denial_reason` en `USER_SUSPENDED`/`MEMBERSHIP_INACTIVE`/errores de token; se agregaría `SEDE_NOT_ALLOWED`.

## 6. Modelo de datos (propuesta)
`Sede(nombre unique, direccion, telefono, aforo_maximo, hora_apertura, hora_cierre, activa)`; `Clase.sede FK`; `AccessLog.sede FK`; `PlanMembresia.sedes M2M`; los campos de `GymConfig` (`aforo_maximo`, horarios) migran a `Sede` y `GymConfig` conserva solo datos de marca (`nombre_gym`, `telefono_contacto`). Cache de aforo con clave `aforo:current:{sede_id}` y grupo WS `aforo_updates_{sede_id}`. Auditoría (`apps/common/audit.py:164-171`): agregar `Sede` a `_AUDITED_MODELS`. Migraciones de datos en 3 pasos (crear Sede Central → asignar FKs → hacer NOT NULL).

## 7. Diseño frontend
- Rutas: `/admin/sedes` (`roles=['administrador']`). Selector global de sede en `TopBar`/`Sidebar` para staff (store zustand `sedeStore` persistido como `themeStore`).
- `CredencialDigitalPage.jsx:50`: tomar la sede del backend en lugar del literal.
- `PlanFormModal`/`PlanComparativeTable`: reemplazar texto libre por multiselect de sedes.
- Textos (es-AR): "Sedes", "Sede activa", "Esta membresía no habilita esta sede".
- Responsive: selector de sede colapsable en `AppBottomNav` a 375 px.

## 8. Archivos a crear / modificar
Backend: nueva app `apps/sedes` (o dentro de `common`), cambios en `classes`, `access` (services, consumers, views), `memberships`, `reports`, `common`. Frontend: página admin, store, hooks con `sede` en las `queryKey`, ajustes en credencial, planes, aforo, reportes.

## 9. Plan de pruebas (TDD)
- Backend: migración de datos idempotente; aforo por sede aislado; QR de sede no habilitada → rechazo y `AccessLog` registrado; permisos de `/api/sedes/`.
- Frontend: cambio de sede invalida queries (`queryKey` incluye sede); credencial muestra la sede real.
- Manual: crear 2 sedes y probar el flujo de acceso con cada una.

## 10. Criterios de aceptación
- **Dado** 2 sedes con aforos distintos **cuando** se escanean QRs **entonces** cada monitor muestra su ocupación y el límite propio.
- **Dado** un plan con solo la sede A **cuando** el socio escanea en B **entonces** el acceso se rechaza con motivo.

## 11. Riesgos y decisiones abiertas
- Es un cambio transversal (XL) con migración de datos; ¿hay un segundo local real? **Recomendación:** no avanzar sin demanda concreta (P3).
- ¿El socio pertenece a una sede o a la cadena? ¿Los precios varían por sede?
- **Hallazgo relacionado (fuera de área, ver informe):** `PlanFormModal` envía `matriz_comparativa`, pero `PlanMembresia` no define ese campo (`memberships/models.py:9-16`) ni lo expone el serializer (`rg matriz backend/apps` sin resultados): esos datos no se persisten. Verificar con FIN.

## 12. Referencias
- `backend/seed_data.py`, `frontend/src/pages/socio/CredencialDigitalPage.jsx`, `docs/architecture.md`. Relacionados: BK-BUG-08 (literal "Sede Central" en UI), BK-BUG-06 (matriz comparativa de planes), BK-ACC-06.

## 13. Prompt listo para un agente de IA
```
NO implementar sin aprobación explícita del dueño (ver sección 11 de docs/backlog/items/BK-PLT-10-multi-sede.md). 
Si se aprueba: TDD primero (migración de datos, aforo por sede, rechazo de QR en sede no habilitada, permisos). Creá el modelo Sede, migrá GymConfig.aforo_maximo/horarios a Sede, agregá FK a Clase y AccessLog y M2M en PlanMembresia, parametrizá aforo (cache y grupo WS por sede) y reportes con ?sede=, y en frontend un store de sede activa, página /admin/sedes y reemplazo del literal 'Sede Central' (CredencialDigitalPage.jsx:50).
Terminado: pytest -q (>=80%) y `npm run lint && npx vitest run --coverage` verdes; migración probada sobre datos de seed_data.py.
```
