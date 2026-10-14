---
id: BK-SOC-06
titulo: Vigencia del apto médico (fecha de vencimiento, estados y avisos) — hoy "tiene archivo = vigente"
tipo: feature
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: L
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-SOC-02, BK-SOC-05]
---

# BK-SOC-06 · Vigencia del apto médico y avisos de vencimiento

## 1. Resumen
El sistema solo sabe si hay un archivo cargado (`certificado_medico_url`), no cuándo se emitió ni cuándo vence. Por eso un apto de hace 3 años se muestra como "Al día" / "Vigente" en el listado, el detalle y el dashboard del socio, y no existe ningún aviso de "tu apto vence". La UI de recepción ya tiene un campo "VENCE" que no persiste en ningún lado.

## 2. Objetivo de usuario
Como **recepcionista** quiero **registrar cuándo vence el apto de un socio y ver a quién se le vence pronto** para **cumplir con el requisito del gimnasio y avisar a tiempo**; como **socio** quiero **ver cuándo vence mi apto y recibir un aviso antes** para **renovarlo sin perder el acceso a clases**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/members/models.py:23` | Solo `certificado_medico_url = URLField(blank=True)`. **No existen** fecha de emisión, de vencimiento ni estado de revisión. |
| Backend filtro | `backend/apps/members/filters.py:9,19-24` | `con_certificado` (bool) = URL no vacía. |
| Backend stats | `backend/apps/members/views.py:77-88` | `GET /api/members/socios/stats/` → `{total, activos, con_certificado, bajas}` (el front documenta `suspendidos` que **no existe**, `sociosService.js:31`). |
| Backend tareas | `backend/apps/memberships/tasks.py:15-82` | Solo hay job de vencimiento de **membresías** (7/3/1/0 días; dedup `Membresia.avisos_enviados`); programado en `backend/apps/memberships/migrations/0004_seed_expiration_schedule.py:8-24` (09:00 `America/Argentina/Buenos_Aires`). **No hay job de apto.** |
| Backend emails | `backend/apps/common/templates/emails/` | Existen `_base, clase_cancelada, expiration_alert, payment_confirmation, welcome` (+ `.txt`). No hay plantilla de apto. Envío: `apps/common/tasks.py:30-42 enqueue_email`. |
| Backend /me | `backend/apps/memberships/serializers.py:59-92` | `SocioMeSerializer.fields = (id, numero_socio, dni, nombre, apellido, estado, membresia_activa, certificado_medico_url, asistencias_mes)`. Sin datos de vigencia. |
| Frontend dashboard socio | `frontend/src/components/dashboard/views/SocioDashboardView.jsx:25,55-59` | `hasMedicalCert = !!certificado_medico_url` → texto "Vigente" / "Faltante". |
| Frontend listado | `frontend/src/components/admin/SocioColumns.jsx:64-89` | Columna "Certificado Médico": link "Al día" si hay URL; "Sin certificado" si no. |
| Frontend detalle | `frontend/src/components/admin/SocioDetailModal.jsx:102-127` | "Certificado vigente cargado" si hay URL. |
| Frontend recepción | `frontend/src/components/recepcion/SaludCard.jsx:108-124` | Input `VENCE` (`onChange('venceMedico', ...)`) y `OBSERVACIONES / LESIONES`: valores que `gestionSocios.schema.js` descarta (zod `strip`) → **UI sin backend**. |
| Frontend filtros | `frontend/src/components/ui/FilterPanel.jsx:72-96` | "Certificado médico: Todos / Con / Sin". Sin "Por vencer / Vencido". |
| Frontend credencial | `frontend/src/pages/socio/CredencialDigitalPage.jsx` | No menciona el apto. |

## 4. Alcance
**Incluye:** campos `certificado_emitido_en` y `certificado_vence_en`; estado derivado `apto_estado` (`sin_apto | vigente | por_vencer | vencido`); entrada de la fecha al subir (staff y socio); filtros y KPI; badges coherentes en listado/detalle/dashboard/credencial/perfil; job Celery diario con emails de aviso (30/7/0 días) y deduplicación; tests.
**No incluye:** bloquear el acceso/QR por apto vencido (decisión abierta, §11); validación médica del contenido; historial de certificados anteriores (propuesta futura); almacenamiento seguro (BK-SOC-05); campos de salud adicionales (condiciones, lesiones) → solo se mantiene `observaciones`.

## 5. Contrato de API
**[EXISTE → CAMBIA] `GET /api/members/socios/` y `/{id}/`** (`IsReceptionistOrAdmin`) — `SocioSerializer` agrega (solo lectura calculado + 2 editables):
`certificado_emitido_en: date|null`, `certificado_vence_en: date|null` (editables por admin/recep), `apto_estado: "sin_apto"|"vigente"|"por_vencer"|"vencido"` (SerializerMethodField; `por_vencer` ≤ 30 días; `sin_apto` si no hay URL o no hay fecha). Nuevo filtro en `SocioFilter`: `apto=<estado>` (ChoiceFilter) y `apto_vence_antes_de=<YYYY-MM-DD>`.
**[EXISTE → CAMBIA] `GET /api/members/socios/stats/`** — agregar `apto_por_vencer`, `apto_vencido` (y `sin_apto`).
**[EXISTE → CAMBIA] `POST /api/members/socios/{id}/certificado-medico/`** (`IsAdminOrOwnSocio`) — multipart: `archivo` (obligatorio) + `vence_en` (date, opcional; si falta y no hay `emitido_en`, `vence_en = hoy + 12 meses`, valor configurable) + `emitido_en` (opcional). Errores 400: `{"vence_en":["La fecha de vencimiento no puede ser anterior a hoy."]}`.
**[EXISTE → CAMBIA] `GET /api/memberships/me/`** (`IsSocio`) — agregar `apto: {"estado": "...", "vence_en": "YYYY-MM-DD"|null}`.
**[EXISTE → CAMBIA] `GET/PATCH /api/auth/profile/`** — coordinar con BK-SOC-02 (agregar `certificado_medico_url`, `apto_estado`, `certificado_vence_en`).
**Celery [A CREAR]:** tarea `members.check_expiring_aptos` (en `backend/apps/members/tasks.py`), ejecutada con `django_celery_beat` mediante migración de datos análoga a `memberships/migrations/0004_*.py`.

## 6. Modelo de datos
`Socio` (propuesta): `certificado_emitido_en = DateField(null=True, blank=True)`, `certificado_vence_en = DateField(null=True, blank=True, db_index=True)`, `avisos_apto_enviados = JSONField(default=dict, blank=True)` (misma estrategia de dedup que `Membresia.avisos_enviados`, `memberships/models.py:52`). Migración `members/migrations/0008_*` (la última existente es `0007_socio_textchoices_ordering.py`). Backfill: socios con URL y sin fecha → `certificado_vence_en = NULL` (estado `sin_apto` con aviso "fecha pendiente de cargar") para no inventar vigencias. Estado derivado como propiedad de modelo `Socio.apto_estado` (sin columna).

## 7. Diseño frontend
- **Rutas/guard:** sin rutas nuevas (`/admin/socios` solo admin, `/recepcion/socios` admin+recep, `/perfil`, `/dashboard`, `/socio/credencial`; ver `App.jsx:75,74,104,123,130`).
- **Convenciones:** react-query v5 (`useSociosData.js`, `useProfile.js`, `useDashboardData.js`), axios `services/api.js`, `sonner`, `lucide-react`, `Badge` (`components/ui/Badge.jsx`, variantes `success|warning|danger|neutral|live`).
- **Componentes:** crear `frontend/src/components/socio/AptoBadge.jsx` (props `{estado, venceEn, compact}`) que mapee `vigente→success "Vigente · vence 12/03/2027"`, `por_vencer→warning "Vence en N días"`, `vencido→danger "Vencido"`, `sin_apto→neutral/danger "Sin apto"`; usarlo en `SocioColumns`, `SocioDetailModal`, `SocioDashboardView`, `ProfilePage` y credencial. Reemplazar `hasMedicalCert` por `membershipData.apto`.
- **Formularios:** `SaludCard` (`VENCE` → `<Input type="date">` conectado al form y al upload), `SocioFormModal` (campo fecha junto al archivo), `ProfilePage` (el socio puede indicar la fecha de vencimiento del apto que sube; si no, default 12 meses con aviso).
- **Filtros:** `FilterPanel` agrega grupo "Apto médico: Todos / Vigente / Por vencer / Vencido / Sin apto" (param `apto`).
- **Estados de UI:** skeleton existente; error de upload por toast; éxito `toast.success('Apto cargado. Vence el 12/03/2027')`.
- **Textos (voseo):** "Tu apto médico vence en 7 días. Subí uno nuevo desde tu perfil.", "Apto vencido: subí uno nuevo para reservar clases" (solo si se decide bloquear).
- **Responsive:** `AptoBadge` en 375 px usa variante compacta (solo ícono + estado); en 768 px muestra la fecha.

## 8. Archivos a crear / modificar
- Backend: `members/models.py`, `members/migrations/*`, `members/serializers.py`, `members/filters.py`, `members/views.py` (stats + upload), `members/services.py` (parseo de fechas en `guardar_certificado_medico`), `members/tasks.py` (nuevo), `members/migrations/*_seed_apto_schedule.py` (nuevo), `common/templates/emails/apto_alert.{html,txt}` (nuevos), `memberships/serializers.py` (`SocioMeSerializer`), `users/serializers.py` (`ProfileSerializer`).
- Frontend: `components/socio/AptoBadge.jsx` (+test), `SocioColumns.jsx`, `SocioDetailModal.jsx`, `SocioFormModal.jsx`, `FilterPanel.jsx`, `SaludCard.jsx`, `SocioDashboardView.jsx`, `ProfilePage.jsx`, `services/sociosService.js` (`uploadCertificado(id, archivo, {venceEn})`), sus tests.

## 9. Plan de pruebas (TDD)
**Backend** (`backend/apps/members/tests/`, `APITestCase` + `make_user_factory/make_socio_factory`, fechas relativas a `date.today()` como en `memberships/tests/test_expiration_task.py:11-24` (no hay `freezegun` en `requirements/`)):
- `test_socios_models.py`: `apto_estado` en los 4 casos y en los bordes (vence hoy ⇒ `por_vencer`; ayer ⇒ `vencido`).
- `test_socios_views.py`: filtro `?apto=vencido`; stats con `apto_por_vencer`; PATCH `certificado_vence_en` por admin/recep OK, por socio 403.
- `test_certificado_*`: upload con `vence_en` válido/pasado/formato inválido ⇒ 200/400/400.
- `test_apto_task.py`: aviso a 30/7/0 días, dedup en segunda corrida, no envía a socios en `baja`, no envía si no hay email real (usar `django.core.mail.outbox`, `CELERY_TASK_ALWAYS_EAGER=True` en `core/settings/test.py:16`).
Comando: `cd backend && pytest -q apps/members apps/memberships`.
**Frontend** (Vitest + RTL): `AptoBadge.test.jsx` (4 estados + compacto); `SocioColumns.test.jsx` y `SocioDetailModal.test.jsx` (no dicen "Al día" con apto vencido); `SocioDashboardView.test.jsx` (usa `apto.estado`); `FilterPanel` (nuevo grupo llama `onChange('apto', 'vencido')`).
Comando: `cd frontend && npx vitest run src/components src/pages && npm run lint`.
**Manual:** con admin cargar apto con vencimiento en 5 días a `socio.activo@winnie.local`; en el listado filtrar "Por vencer"; ejecutar la tarea (`python manage.py shell -c "from apps.members.tasks import check_expiring_aptos; check_expiring_aptos()"`) y verificar el email en el backend de consola/Mailtrap; con el socio verificar el badge en `/dashboard` y `/perfil`.

## 10. Criterios de aceptación
- **Dado** un apto con `certificado_vence_en` pasado **cuando** se lista/abre el socio **entonces** se ve "Vencido" (no "Al día").
- **Dado** un apto que vence en ≤ 30 días **cuando** corre el job **entonces** el socio recibe un email una sola vez por umbral.
- **Dado** el listado **cuando** filtro por "Por vencer" **entonces** solo aparecen socios con vencimiento próximo y activos.
- **Dado** el dashboard del socio **cuando** su apto está por vencer **entonces** ve la fecha y un CTA a `/perfil`.
- El input "VENCE" de recepción persiste la fecha.

## 11. Riesgos y decisiones abiertas
1. ¿Un apto vencido **bloquea** reservas/acceso? (Recomendado: no bloquear en la primera versión; solo avisar y mostrar a recepción en el escaneo. Si se bloquea, tocar `apps/access` → BK-ACC.)
2. ¿Quién fija la fecha cuando el socio sube el archivo? (Recomendado: el socio la indica y recepción puede corregirla; marcar "pendiente de revisión" es una mejora posterior.)
3. ¿Vigencia por defecto? (Recomendado: 12 meses desde emisión, configurable en `GymConfig`, `apps/common/models.py`.)
4. ¿Umbrales de aviso? (Recomendado: 30 y 7 días antes + día de vencimiento.)
5. ¿Qué hacer con los aptos ya cargados sin fecha? (Recomendado: `sin_apto`/"fecha pendiente" y filtro para que recepción los complete.)

## 12. Referencias
- `openspec/changes/socios-membresias/spec.md` (RF08), `speckit/spec.md` REQ-3.1.
- Patrón a copiar: `backend/apps/memberships/tasks.py`, `.../migrations/0004_seed_expiration_schedule.py`, `common/templates/emails/expiration_alert.*`.
- Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", Recepción → Alta (Ficha de Salud) y Socio → Perfil.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1/DRF/Celery + React 18/Vite/react-query v5). Implementá la vigencia del apto médico.
Contexto verificado: Socio (backend/apps/members/models.py) solo tiene certificado_medico_url; la UI marca "Al día/Vigente" si hay URL (SocioColumns.jsx, SocioDetailModal.jsx, SocioDashboardView.jsx) y SaludCard.jsx tiene un input "VENCE" que no persiste (gestionSocios.schema.js lo descarta). Ya existe un job de vencimiento de membresías para copiar: backend/apps/memberships/tasks.py + migrations/0004_seed_expiration_schedule.py + templates en backend/apps/common/templates/emails/ y enqueue_email en apps/common/tasks.py.
TDD primero: tests en backend/apps/members/tests/ (apto_estado con bordes, filtro ?apto=, stats, upload con vence_en válido/pasado/inválido, task con dedup y outbox de Django) y en frontend (AptoBadge.test.jsx, SocioColumns/SocioDetailModal/SocioDashboardView/FilterPanel). Luego: campos certificado_emitido_en, certificado_vence_en (DateField null) y avisos_apto_enviados (JSONField) + migración; Socio.apto_estado derivado (por_vencer <= 30 días); SocioSerializer y SocioMeSerializer exponen apto_estado/fechas; POST certificado-medico acepta vence_en; tarea members.check_expiring_aptos (30/7/0 días, deduplicada, solo socios activos con email real) + migración de django_celery_beat a las 09:00 America/Argentina/Buenos_Aires; plantilla apto_alert.html/.txt en español rioplatense; frontend: componente AptoBadge usado en listado, detalle, dashboard, perfil; SaludCard y SocioFormModal con <Input type="date"> conectado; FilterPanel con grupo "Apto médico".
No bloquees el acceso por apto vencido (decisión abierta). Terminado: cd backend && pytest -q apps/members apps/memberships verde; cd frontend && npx vitest run && npm run lint verdes. No hagas commits.
```
