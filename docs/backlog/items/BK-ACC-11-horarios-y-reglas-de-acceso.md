---
id: BK-ACC-11
titulo: Horarios de apertura/cierre efectivos y reglas de acceso por plan o por clase
tipo: feature
roles: [administrador, recepcionista, socio]
prioridad: P2
tamano: L
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-ACC-01]
---

# BK-ACC-11 · Horarios y reglas de acceso (por horario, por plan, por clase)

## 1. Resumen
`GymConfig.hora_apertura` y `hora_cierre` se guardan y se editan desde Configuración, pero **ningún código las usa**: el acceso se permite a cualquier hora, el socio no ve el horario y ningún job de cierre las lee. No existe ninguna regla de acceso por plan (p. ej. plan "mañana") ni por clase (acceder solo con reserva). Es una brecha entre lo que la pantalla de configuración promete y lo que el sistema hace.

## 2. Objetivo de usuario
- Como **administrador** quiero **que el horario del gimnasio se respete en el control de acceso y que ciertos planes tengan franjas horarias** para **hacer cumplir las condiciones comerciales de cada plan**.
- Como **socio** quiero **ver el horario y saber por qué no puedo entrar fuera de él** para **no llegar en vano**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/common/models.py:10-14` | `GymConfig.hora_apertura = TimeField(default='07:00')`, `hora_cierre = TimeField(default='23:00')`. Sin validación cruzada (cierre < apertura se acepta). |
| Backend API | `backend/apps/common/views.py:10-27`, `serializers.py:6-15` | `GET /api/config/gym/` público (`AllowAny`); `PATCH` solo `IsAdminOnly`. Serializer sin `validate()`. |
| Backend uso | `rg "hora_apertura\|hora_cierre" backend/apps --glob '!tests' --glob '!migrations'` | Solo `apps/common/{models,serializers}.py`. `apps/access` **no** los lee; no hay tarea de cierre (ver BK-ACC-07). |
| Backend plan | `backend/apps/memberships/models.py:8-24` | `PlanMembresia`: `nombre, duracion_dias, precio, clases_asignadas, activo, es_popular` (+ timestamps). **Sin** campos de franja horaria ni días habilitados. `PlanMembresiaSerializer.fields` (`serializers.py:18`) idem. |
| Backend clases | `backend/apps/classes/models.py:31-49,64-78` | `Clase` tiene `dia`, `hora`, `duracion_min`, `planes_habilitados` (JSON, restringe **reservas**), `InscripcionClase(clase, socio, asistio, en_espera)`. La asistencia a clases (`asistio`) es independiente de `AccessLog`. No hay vínculo acceso↔clase. |
| Backend acceso | `backend/apps/access/models.py:22-30`, `views.py:92-98,179-185` | `DenialReason` no tiene `OUTSIDE_HOURS` ni `PLAN_OUT_OF_SCHEDULE`; el escaneo solo evalúa token, `is_active` y membresía. |
| Frontend config | `frontend/src/pages/admin/AdminConfiguracionPage.jsx:13-19,104-135` | Inputs `type="time"` de apertura/cierre con zod (`^\d{2}:\d{2}$`); sin validar cierre > apertura. |
| Frontend socio | `frontend/src/pages/socio/CredencialDigitalPage.jsx:177-186,50` | Tarjeta "Sede Habilitada" con `Sede Central` hardcodeado y el nombre del plan; **no muestra el horario**. |
| Frontend planes | `frontend/src/components/admin/PlanFormModal.jsx`, `pages/admin/AdminPlanesPage.jsx` | Formulario de plan sin campos de horario (verificar campos exactos al implementar; **No verificado** línea a línea). |
| Specs | `speckit/spec.md:284-296` (REQ-3.7), `speckit/design.md:214-226`, `speckit/tasks.md:197` | REQ-3.7 solo pide **guardar y editar** `hora_apertura`/`hora_cierre` (singleton `GymConfig`); no define ninguna regla que los consuma. Una búsqueda `rg -i "horario\|franja" docs/architecture.md docs/database openspec speckit` no encontró reglas de horario por plan/clase (los únicos "horarios" son los de clases y los picos de Mongo). |

## 4. Alcance
**Incluye (fases):**
1. *Fase A — horario del gimnasio (P1 dentro de la ficha):* validar `hora_cierre` vs `hora_apertura`, mostrar el horario al socio y, opcionalmente, rechazar ENTRY fuera de horario (`OUTSIDE_HOURS`).
2. *Fase B — franja horaria por plan:* campos opcionales en `PlanMembresia` (`franja_desde`, `franja_hasta`, `dias_habilitados`) y regla `PLAN_OUT_OF_SCHEDULE`.
3. *Fase C (idea, validar con producto):* acceso condicionado a reserva de clase (`solo-idea`).

**No incluye:** feriados/días especiales con calendario (idea P3), múltiples sedes, cierre automático de día (BK-ACC-07), reservas de clases (área CLS).

## 5. Contrato de API (propuesta)
**[EXISTE → MODIFICAR] `PATCH /api/config/gym/`** — `IsAdminOnly`. Nuevo `validate()` en `GymConfigSerializer`: si `hora_cierre <= hora_apertura` → 400 `{"hora_cierre": ["El cierre debe ser posterior a la apertura."]}` (decisión abierta: horarios que cruzan medianoche). Campo nuevo **[A CREAR]** `acceso_horario_estricto` (bool, default `false`) y `tolerancia_minutos` (int 0-120, default 15).
**[EXISTE → MODIFICAR] `POST /api/access/qr/scan/` y `/manual/`** (`IsReceptionistOrAdmin`): en ENTRY, con `acceso_horario_estricto`, hora local fuera de `[apertura - tolerancia, cierre]` → 403 `status:"DENIED"`, `denial_reason:"OUTSIDE_HOURS"` (nuevo en `AccessLog.DenialReason`, label "Fuera del horario del gimnasio"). Con `override=true` (BK-ACC-02) recepción puede admitir igual. EXIT nunca se bloquea.
**[A CREAR] Fase B** — `PlanMembresia` + `PlanMembresiaSerializer.fields`: `franja_desde` (HH:MM|null), `franja_hasta` (HH:MM|null), `dias_habilitados` (lista de 0-6 o `[]` = todos). Validación: ambos horarios juntos o ninguno; `desde < hasta`. Regla en `evaluate_access` (BK-ACC-01): plan activo del socio fuera de franja/día → 403 `PLAN_OUT_OF_SCHEDULE` ("Tu plan no incluye este horario"). Permisos: crear/editar planes ya es `IsAdminOnly` (`memberships/views.py:39,59`).
**Respuesta** de escaneo: igual (`status, message, denial_reason, access_log`).

## 6. Modelo de datos (propuesta)
- `GymConfig`: `acceso_horario_estricto BooleanField(default=False)`, `tolerancia_minutos PositiveSmallIntegerField(default=15, validators=[MaxValueValidator(120)])`. Migración `backend/apps/common/migrations/0003_...` (existen `0001_gymconfig_initial.py`, `0002_gymconfig_default_row.py`).
- `PlanMembresia`: `franja_desde TimeField(null=True, blank=True)`, `franja_hasta TimeField(null=True, blank=True)`, `dias_habilitados JSONField(default=list, blank=True)` (mismo estilo que `Clase.planes_habilitados`/`dias_recurrencia`). Migración en `apps/memberships/migrations/`.
- `AccessLog.DenialReason`: `OUTSIDE_HOURS`, `PLAN_OUT_OF_SCHEDULE` (migración de choices en `apps/access`).

## 7. Diseño frontend
- **Config (Fase A):** en `AdminConfiguracionPage.jsx` ampliar el `schema` zod con `.refine(v => v.hora_cierre > v.hora_apertura, { path: ['hora_cierre'], message: 'El cierre debe ser posterior a la apertura' })` (comparación de strings `HH:MM` es válida), checkbox "Rechazar ingresos fuera de horario" y número "Tolerancia (min)". Textos: "Fuera de horario", "El gimnasio abre a las 07:00 y cierra a las 23:00".
- **Socio:** en `CredencialDigitalPage.jsx` (tarjeta "Sede Habilitada", línea 177-186) agregar `Horario: {hora_apertura} a {hora_cierre}` con `useGymConfig()` (`hooks/queries/useGymConfig.js`, público); si `acceso_horario_estricto` y ahora está fuera de horario, banner informativo "Ahora el gimnasio está cerrado. Abre a las 07:00." (no oculta el QR). Quitar `sedeHabitual: 'Sede Central'` hardcodeado o leer `nombre_gym`.
- **Terminal:** agregar `OUTSIDE_HOURS` y `PLAN_OUT_OF_SCHEDULE` a `DENIAL_REASONS` (`ValidationResult.jsx:5-11`); en `OUTSIDE_HOURS` mostrar estado "warning" con "Registrar igual" (BK-ACC-02).
- **Planes (Fase B):** en `components/admin/PlanFormModal.jsx` sección "Restricción horaria (opcional)": dos `input type="time"` y chips L-M-X-J-V-S-D; `PlanCard.jsx` muestra "Lun a Vie 07:00-12:00" cuando existe.
- **Estados:** loading skeleton existente; error de validación del servidor → toast con `Object.values(data).flat().join(' ')` (patrón de `AdminConfiguracionPage.jsx:47-54`); éxito: "Configuración actualizada correctamente." (ya existe).
- **Responsive:** formularios en 1 columna a 375 px, 2 columnas (`grid-cols-2`) para los horarios desde 768 px.

## 8. Archivos a crear / modificar
Backend: `apps/common/{models,serializers}.py` + migración; `apps/access/{models,services,views}.py` + migración; `apps/memberships/{models,serializers}.py` + migración (Fase B); tests `apps/common/tests/test_gym_config.py`, `apps/access/tests/test_access_hours.py` (nuevo), `apps/memberships/tests/` (planes).
Frontend: `AdminConfiguracionPage.jsx`, `CredencialDigitalPage.jsx`, `ValidationResult.jsx`, `PlanFormModal.jsx`, `PlanCard.jsx`, y tests (`CredencialDigitalPage.test.jsx`, etc.).

## 9. Plan de pruebas (TDD)
Backend (pytest; no hay `freezegun`: fijar la hora con `unittest.mock.patch('django.utils.timezone.localtime')` o `patch('django.utils.timezone.now')`; hora local `America/Argentina/Buenos_Aires`):
1. PATCH `hora_cierre=06:00` con apertura `07:00` → 400.
2. Estricto ON, 06:00 con apertura 07:00 y tolerancia 15 → ENTRY por DNI `403 OUTSIDE_HOURS`; 06:50 → 200; EXIT a cualquier hora → 200; estricto OFF → 200.
3. Con `override=true` (si BK-ACC-02 está) → 200.
4. Fase B: plan con franja 07:00-12:00 Lun-Vie: socio ENTRY sábado o 15:00 → `PLAN_OUT_OF_SCHEDULE`; dentro de franja → 200; plan sin franja → siempre 200.
5. Validaciones del serializer de plan (solo uno de los dos horarios → 400).
6. Permisos: recepcionista no puede `PATCH /api/config/gym/` (403, ya cubierto) ni crear planes.
Frontend (Vitest/RTL; patrón de `useGymConfig.test.jsx`): el form de config muestra el error de cierre ≤ apertura; la credencial muestra "Horario: 07:00 a 23:00" y el banner de "cerrado" con la hora simulada (`vi.setSystemTime`); `PlanFormModal` valida el par de horarios.
Manual: `admin@winnie.local` → Configuración: apertura 07:00/cierre 23:00, activar "Rechazar fuera de horario" y probar un ingreso cambiando la hora del servidor de pruebas.

## 10. Criterios de aceptación
- **Dado** apertura 07:00 y modo estricto, **cuando** se valida un ingreso a las 05:30, **entonces** se rechaza con "Fuera del horario del gimnasio" y queda auditado; la salida de alguien que sigue adentro se permite.
- **Dado** un socio, **cuando** abre su credencial, **entonces** ve el horario del gimnasio.
- **Dado** un plan con franja 07:00-12:00, **cuando** el socio intenta ingresar a las 18:00, **entonces** se rechaza con "Tu plan no incluye este horario".
- **Dado** una configuración con cierre anterior a la apertura, **cuando** el admin guarda, **entonces** ve un error claro y no se guarda.

## 11. Riesgos y decisiones abiertas
- Horarios que cruzan medianoche (24 h, turnos noche): recomendación: permitir `cierre < apertura` interpretándolo como "día siguiente" solo si se confirma el caso de uso; hoy se asume horario diurno.
- ¿Bloquear o solo avisar fuera de horario? Recomendación: `acceso_horario_estricto=false` por defecto + aviso al socio.
- Fase B cambia reglas comerciales de planes existentes; recomendación: campos nulos = sin restricción (no afecta a nadie hasta configurarlo).
- Fase C (acceso solo con reserva de clase): `solo-idea`; implica cruzar `InscripcionClase` (área CLS) con `AccessLog` y definir ventanas ±N min de la `Clase.hora`. Decidir con producto antes de diseñar.

## 12. Referencias
- `backend/apps/common/` (config singleton), `backend/apps/classes/models.py` (`planes_habilitados`, patrón de JSON), `docs/qa/plan-de-pruebas.md` (config del gimnasio).
- Figma (opcional): "vistas live" → Admin → Configuración; Socio → Credencial.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1 + DRF; React 18 + Vite + zod + react-hook-form + Vitest). Implementá la Fase A de docs/backlog/items/BK-ACC-11-horarios-y-reglas-de-acceso.md (leelo entero; Fase B solo si te lo piden). Asumí BK-ACC-01 hecho (existe evaluate_access en apps/access/services.py).
TDD: tests primero — backend/apps/common/tests/test_gym_config.py (cierre<=apertura => 400) y backend/apps/access/tests/test_access_hours.py (OUTSIDE_HOURS solo en ENTRY, con tolerancia, estricto ON/OFF; hora simulada con unittest.mock.patch, no hay freezegun); frontend: AdminConfiguracionPage (refine cierre>apertura), CredencialDigitalPage (muestra horario, banner "cerrado") y ValidationResult (copy de OUTSIDE_HOURS).
Implementación: campos acceso_horario_estricto y tolerancia_minutos en GymConfig (migración common 0003), validate() en GymConfigSerializer, DenialReason.OUTSIDE_HOURS (migración access), regla en evaluate_access, UI según sección 7 (voseo en textos, código en inglés). No toques backend/loadtests ni hooks/useScreenWakeLock.js.
Terminado: `cd backend && pytest -q` (cov>=80 %) y `cd frontend && npx vitest run --coverage && npm run lint` en verde.
```
