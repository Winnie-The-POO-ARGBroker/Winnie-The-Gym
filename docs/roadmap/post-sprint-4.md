# Roadmap post-Sprint 4 — 8 ítems P3 deferidos

> Issues cerradas como "deferred to post-defensa ISPC" con roadmap documentado.
> Formato: para cada ítem, el **qué**, el **por qué no ahora**, el **plan sugerido**, y la **prioridad relativa** post-sprint.

Las issues de este doc son todas **P3**: nice-to-have, no bloquean la defensa. Están cerradas con este PR para dejar el backlog limpio y el roadmap explícito.

---

## 1. Rendimiento percibido mobile — code-splitting + fuentes + skeletons (#206, BK-MOB-13)

### Qué
- Rutas con React.lazy + Suspense para code-splitting por página.
- Mover fuentes del `@import` bloqueante en `index.css` a `<link rel="preload">` o self-hosted.
- Skeletons de carga uniformes (ya existe `DataTable` cards skeleton del PR #322, extender a dashboards).

### Por qué no ahora
P3. El bundle actual (~500KB gzipped) carga rápido en 4G de recepción con wifi. Es optimización, no bug.

### Plan sugerido
- Sprint 5 Fase 1: lazy routes + reporte de bundle con `vite-bundle-visualizer`.
- Sprint 5 Fase 2: self-host de Inter + Roboto Mono (eliminar `@import` de Google Fonts).
- Sprint 6: Skeleton uniformes en DashboardSocio + DashboardAdmin + MisPagos.

### Prioridad
Media. Mejora la demo si corre lenta en el laptop del jurado. Baja si corre bien.

---

## 2. ComingSoonPage sin uso (#211, BK-PLT-05)

### Qué
`frontend/src/pages/ComingSoonPage.jsx` existe pero no se enlaza desde ningún lugar post-PR #322 (navConfig no lo incluye).

### Por qué no ahora
Es una decisión de 2 líneas de código. No agrega valor en la defensa.

### Plan sugerido
**Eliminar** en Sprint 5 Fase 0 (dentro del PR de code-splitting #206):
```bash
rm frontend/src/pages/ComingSoonPage.jsx frontend/src/pages/ComingSoonPage.test.jsx
```
+ removerla del routing si quedó algún alias legacy.

**Alternativa**: convertirla en genérico `<FeatureDisabledPage feature="...">` para secciones de rutas desactivadas por feature flag (ej.: `/comunicaciones` cuando #214 no está activo).

### Prioridad
Baja. Pure code cleanup.

---

## 3. Bandeja de notificaciones in-app (#213, BK-PLT-07)

### Qué
Campana en TopBar con contador de no-leídas + dropdown con lista + marcar como leída.

### Por qué no ahora
Requiere:
- Modelo `Notificacion(destinatario, titulo, body, read_at, link, created_at)`.
- Signals para generar notifs en eventos relevantes (membresía vence, cert vence, cobro recibido, clase cancelada).
- WebSocket channel `/ws/notificaciones/{user_id}/` con autenticación.
- Componente `NotificationBell` + `NotificationDropdown`.

Es XL. No es crítico para la defensa (el email del PR #318 ya cubre comunicaciones básicas).

### Plan sugerido
- Sprint 6 — modelo + signals + endpoint REST `GET /api/notificaciones/`.
- Sprint 7 — WebSocket push + componente UI.

### Prioridad
Media post-defensa. Alta UX impact si el usuario está logueado en el admin frecuentemente.

---

## 4. Comunicaciones masivas — email + push + WhatsApp (#214, BK-PLT-08)

### Qué
Página admin `/admin/comunicaciones` con editor + segmentación de destinatarios + envío por canal.

### Por qué no ahora
Scope XL + depende de:
- Integración WhatsApp Business API (compliance + costo).
- Push notifications requiere SW mejorado + VAPID keys + modelo `PushSubscription`.
- Templating engine robusto para emails HTML.

**El email transaccional ya funciona** (PR #318). Comunicaciones masivas es feature premium.

### Plan sugerido
- Sprint 7+ cuando el equipo tenga tiempo + presupuesto para WhatsApp Business.
- MVP: email masivo via Celery task + template Mustache.
- Fase 2: push via Service Worker (vía PR #325 ya hay SW shell).
- Fase 3: WhatsApp opcional.

### Prioridad
Baja. Los emails transaccionales cubren el caso real; masivo es growth hack.

---

## 5. Permisos granulares por rol (#215, BK-PLT-09)

### Qué
Matriz editable: admin puede definir qué puede hacer cada rol (ej.: "recepcionista puede ver reportes pero NO cobros manuales").

### Por qué no ahora
El modelo actual (3 roles fijos con permisos hardcoded en `IsAdmin`, `IsReceptionistOrAdmin`, etc.) **funciona**. Pasar a permisos granulares requiere:
- Modelo `Permission` + `Rol` + matriz M2M.
- UI para editar la matriz.
- Rewrite de todos los `permission_classes` para consultar el modelo dinámico.
- Cache de permisos para no hacer N queries por request.

Riesgo alto, valor dudoso en el MVP.

### Plan sugerido
**Deferir indefinidamente** hasta que haya una demanda real documentada (ej.: "ojalá recepcionista pudiera X pero no Y").
Alternativa: cuando se agrega el rol Instructor (ADR-002 PR #327), ese sería el momento de revisar si vale la matriz dinámica.

### Prioridad
Baja. Nice-to-have teórico, bajo valor práctico en el MVP.

---

## 6. Configuración ampliada — horarios + feriados + aforo por sala (#221, BK-PLT-15)

### Qué
Ampliar `GymConfig` con:
- Horarios por día (lun a dom con apertura/cierre configurable).
- Feriados (list de dates con bloqueo de reservas).
- Política de cancelación global (minutos antes para cancelar — ADR-001 addendum).
- Aforo máximo por sala (hoy es global).

### Por qué no ahora
El `aforo_bloqueo_al_llegar_max` del PR #319 cubre el 80% de la necesidad. Horarios por día + feriados son UX fine-tuning.

### Plan sugerido
- Sprint 5 — agregar `GymConfig.cancelacion_minutos_antes` (addendum de ADR-001). Pequeño.
- Sprint 6 — horarios por día + feriados (model + UI).
- Sprint 7 — aforo por sala (requiere modelo `Sala` que hoy es `CharField` libre).

### Prioridad
Media. Los horarios por día son muy demandados por el admin real.

---

## 7. Backups MongoDB + monitoreo tareas (#222, BK-PLT-16)

### Qué
- Script de backup diario de MongoDB (auditoría de accesos).
- Monitoreo de tareas Celery (ej.: Celery Flower o integración Sentry).
- Alertas si las tareas de vencimiento de membresía fallan.

### Por qué no ahora
Es **operación**, no feature. En la defensa ISPC el objetivo es demostrar funcionalidad; backups son un detalle de producción.

### Plan sugerido
- Sprint 5 — script bash `scripts/backup-mongo.sh` ejecutable manualmente + documentación.
- Sprint 5 — integrar Sentry para errores (ya hay refs en el código del frontend).
- Sprint 6 — Celery Beat dashboard + alertas.

### Prioridad
Alta **operacional** post-defensa (sin backups = pérdida de datos = juicio).
Baja para la defensa académica.

---

## 8. GDPR — baja + supresión de datos del socio (#235, BK-SOC-13)

### Qué
Socio puede pedir desde `/perfil`:
- Soft delete (dar de baja).
- **Hard delete** (supresión GDPR / Ley 25.326 Argentina — derecho al olvido).

### Por qué no ahora
Soft delete YA existe (`estado=baja` + `dar-baja` endpoint). Hard delete requiere:
- Cascada controlada (qué pasa con los AccessLogs del PR #319? Audit logs del PR #326?).
- Flujo de confirmación con password + email.
- Export de datos antes de borrar (derecho a portabilidad).

Riesgo alto si se implementa mal → data corruption.

### Plan sugerido
- Sprint 6 — proceso manual documentado: socio pide por email → admin ejecuta management command `supress_socio --id=X --confirm`.
- Sprint 7 — automatizar vía UI con doble confirmación + email.
- Sprint 8+ — audit log de la supresión en sí (quién borró qué).

### Prioridad
Media legalmente post-launch. Baja para la defensa académica (soft delete cubre el 95% del caso).

---

## Resumen tabla

| # | Issue | Scope | Esfuerzo | Prioridad post-S4 | Sprint target |
|---|---|---|---|:---:|:---:|
| 1 | #206 BK-MOB-13 | Perf mobile | M | Media | 5 |
| 2 | #211 BK-PLT-05 | Code cleanup | XS | Baja | 5 |
| 3 | #213 BK-PLT-07 | Notifs in-app | XL | Media | 6-7 |
| 4 | #214 BK-PLT-08 | Comunicaciones masivas | XL | Baja | 7+ |
| 5 | #215 BK-PLT-09 | Perm granulares | L | Baja | deferido |
| 6 | #221 BK-PLT-15 | Config ampliada | L | Media | 5-7 |
| 7 | #222 BK-PLT-16 | Backups + monitoreo | M | Alta (op) | 5 |
| 8 | #235 BK-SOC-13 | GDPR hard delete | L | Media (legal) | 6-8 |

---

## Consecuencias

- Las 8 issues quedan cerradas con este PR + referencia a este doc.
- El backlog visible al cierre Sprint 4 queda limpio (0 issues P3 abiertas de mi lado).
- Franco mantiene sus issues; cuando se reabran estos ítems en sprints siguientes, se usan como roadmap y se reabren issues nuevas con scope ajustado.
