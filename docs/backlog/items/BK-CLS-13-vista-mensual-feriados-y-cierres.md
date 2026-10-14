---
id: BK-CLS-13
titulo: Vista mensual del calendario y gestión de feriados / cierres del gimnasio
tipo: idea
roles: [administrador, recepcionista, socio]
prioridad: P3
tamano: L
estado_en_codigo: solo-idea
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-CLS-09, BK-CLS-07]
---

# BK-CLS-13 · Vista mensual del calendario y gestión de feriados / cierres del gimnasio

## 1. Resumen
El calendario solo tiene vista semanal y no existe ningún concepto de feriado, cierre especial o vacaciones: una clase de lunes se repite aun el 25 de mayo o el 1 de enero, y cada cierre obliga a cancelar la clase manualmente (que hoy la cancela para siempre, ver BK-CLS-05). Tampoco hay vista mensual para ver de un vistazo la ocupación del mes. Es una idea a validar: depende de sesiones por fecha.

## 2. Objetivo de usuario
Como **administrador** quiero **cargar feriados y cierres (con rango de fechas) y ver el mes completo** para **que las clases de esos días se cancelen o no se generen, y los socios sean avisados**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend config | `backend/apps/common/models.py:4-14` | `GymConfig`: `hora_apertura` (07:00), `hora_cierre` (23:00), `aforo_maximo`, `nombre_gym`, `telefono_contacto`. Sin días de apertura, feriados ni cierres. |
| Backend | `rg -i "feriado|holiday|vacaciones" backend/apps frontend/src` | Sin resultados: no existe el concepto. |
| Backend zona horaria | `backend/core/settings/base.py:121-123,363` | `TIME_ZONE='America/Argentina/Buenos_Aires'`, `USE_TZ=True`, `CELERY_TIMEZONE`. Argentina no aplica horario de verano (no hay saltos DST). |
| Backend clases | `backend/apps/classes/models.py:34-44` | Plantilla semanal sin fechas (BK-CLS-09). |
| Frontend | `frontend/src/pages/ClassSchedulePage.jsx:25,114-176` | Solo pestañas "Calendario" (semanal) y "Lista y Detalle"; sin vista mensual. |
| Frontend | `frontend/src/pages/ClassSchedulePage.jsx:42-77` | Navegación semanal con rótulos calculados en el navegador (ver BK-CLS-07). |
| Frontend | `frontend/src/pages/admin/AdminConfiguracionPage.jsx` | Pantalla de configuración existente (solo `GymConfig`; contenido completo **no verificado**). |

## 4. Alcance
**Incluye (propuesta):**
- Modelo `CierreGimnasio` (rango de fechas, motivo, `afecta`: todo el gimnasio o una sala) y precarga opcional de feriados nacionales.
- Al crear/modificar un cierre: las sesiones afectadas pasan a `cancelada` con motivo automático y se notifica (reutiliza BK-CLS-05), o directamente no se generan.
- Vista mensual en `/admin/clases` (grilla de mes con conteo de clases, ocupación y marcas de cierre) y marca de cierre en la agenda del socio.
- Horario de apertura por día de la semana (extensión de `GymConfig`).

**No incluye:**
- Sincronización con calendarios externos (Google/ICS).
- Cierres por mantenimiento de equipos (otro dominio).

## 5. Contrato de API (propuesta, **[A CREAR]**)
- `GET /api/classes/cierres/?desde=&hasta=` (IsAuthenticated) -> `[{ "id", "fecha_desde", "fecha_hasta", "motivo", "afecta": "gimnasio|sala", "sala": id|null, "tipo": "feriado|cierre" }]`; `POST/PATCH/DELETE` `IsAdminOnly`.
  - `POST` body `{fecha_desde, fecha_hasta, motivo, afecta, sala}`; respuesta `201` con `sesiones_canceladas: n`, `socios_notificados: n`.
  - Errores: `400 {"fecha_hasta": ["Debe ser posterior o igual a fecha_desde."]}`.
- `GET /api/classes/sesiones/?desde=&hasta=` (BK-CLS-09) incluye `cerrada_por_cierre: bool`.
- `GET /api/classes/calendario-mensual/?mes=YYYY-MM` -> `[{ "fecha", "sesiones": n, "ocupacion_pct", "cerrado": bool, "motivo_cierre" }]`.
- Opcional: `PATCH /api/config/gym/` agrega `horarios` por día (`{"lunes": {"apertura": "07:00", "cierre": "23:00"}, ...}`) (hoy campos únicos, `common/serializers.py:9-15`).

## 6. Modelo de datos (propuesta)
```python
class CierreGimnasio(models.Model):
    fecha_desde = DateField(); fecha_hasta = DateField(); motivo = CharField(200)
    tipo = CharField(choices=[('feriado','Feriado'),('cierre','Cierre')])
    sala = FK('classes.Sala', null=True, blank=True)   # null = todo el gimnasio (requiere BK-CLS-10)
    creado_por = FK(User, null=True)
    class Meta: ordering = ['fecha_desde']
```
Migración nueva `0012+`; comando `manage.py cargar_feriados --anio 2026` (fuente a definir; no inventar feriados: tomar de lista oficial aportada por el dueño).

## 7. Diseño frontend
- **Ruta/guard:** pestaña "Mes" dentro de `/admin/clases` (`frontend/src/App.jsx:83-85`, roles `administrador`/`recepcionista`); ABM de cierres en `/configuracion` (solo `administrador`, `App.jsx:136-138`).
- **Reutilizar:** `ClassSchedulePage` (tabs con estado `activeTab`), `EmptyState`, `Modal`, `DataTable`.
- **Nuevo:** `ClassMonthView.jsx` en `frontend/src/components/classes/`, hook `useCierres.js` y `useCalendarioMensual(mes)` en `frontend/src/hooks/queries/` (TanStack Query + `api`), sección "Cierres y feriados" en `AdminConfiguracionPage`.
- **Estados:** loading `Skeleton`, vacío "No hay cierres cargados", error toast, éxito "Cierre cargado. Cancelamos {n} clases y avisamos a {m} socios."
- **Textos (voseo):** "Cerrado por feriado", "¿Cargás un cierre?", "Las clases de esos días se cancelan automáticamente."
- **Responsive:** en 375 px la vista mensual muestra puntos por día y al tocar abre el detalle del día.

## 8. Archivos a crear / modificar
- Backend: `classes/models.py` (o `common`), serializers, views, migraciones, servicio de cancelación masiva reutilizando `cancelar_sesion`, tests.
- Frontend: `ClassMonthView.jsx`, `ClassSchedulePage.jsx`, `AdminConfiguracionPage.jsx`, hooks, tests.

## 9. Plan de pruebas (TDD)
Backend (`backend/apps/classes/tests/test_cierres.py`; `cd backend && pytest apps/classes -q`): crear cierre cancela solo las sesiones del rango y de la sala; notifica una vez por socio; rango inválido -> 400; permisos (recepción lectura, solo admin escribe; socio lectura).
Frontend (vitest/RTL): vista mensual pinta días cerrados; modal de cierre valida fechas; el calendario semanal marca el día cerrado.
Manual: `admin@winnie.local` -> Configuración -> cierre del 25/12 -> ver sesión cancelada y email.

## 10. Criterios de aceptación
- **Dado** un cierre del 24 al 26/12 **cuando** lo guardo **entonces** las sesiones de esos días quedan canceladas con motivo y los inscriptos reciben aviso.
- **Dado** el mes de diciembre **cuando** abro la vista mensual **entonces** veo esos días marcados como cerrados.
- **Dado** un socio **cuando** mira un día cerrado **entonces** ve "Cerrado: {motivo}" y no puede reservar.

## 11. Riesgos y decisiones abiertas
1. ¿Quién mantiene la lista de feriados? Recomendación: carga manual del admin + import anual desde archivo oficial.
2. ¿Cierre cancela o simplemente no genera sesiones? Recomendación: no generar si es futuro lejano; cancelar con aviso si ya hay reservas.
3. ¿Horario por día de la semana? Hoy `GymConfig` es único: confirmar si el gimnasio cierra más temprano sábados/domingos.
4. ¿Cierre por sala o solo global? Recomendación: ambos, con sala opcional.

## 12. Referencias
- `speckit/class-model-architecture-decision/explore.md` (sesiones por fecha).
- BK-CLS-05 (cancelación + notificación), BK-CLS-07 (calendario), BK-CLS-10 (salas).
- Ver también (otras áreas): BK-PLT-15 (configuración ampliada: horarios, feriados, políticas) y BK-PLT-14.
- Figma opcional: Calendario de clases en "vistas live" (solo semanal).

## 13. Prompt listo para un agente de IA
Contexto: Winnie The Gym. No existe modelo de feriados/cierres ni vista mensual; `GymConfig` (`backend/apps/common/models.py`) solo tiene horario único. Prerrequisito: sesiones por fecha (BK-CLS-09); si no existen, detenerte. Es una IDEA: pedir al dueño las decisiones de la sección 11 antes de implementar y trabajar con SDD.
Tarea (TDD): `test_cierres.py` (sección 9) -> modelo `CierreGimnasio`, endpoints (`IsAdminOnly` escritura), servicio que cancela sesiones del rango reutilizando la cancelación de sesión y emails; frontend: `ClassMonthView.jsx`, hooks `useCierres.js`/`useCalendarioMensual`, sección en `AdminConfiguracionPage.jsx`. Comandos: `cd backend && pytest apps/classes -q`; `cd frontend && npx vitest run && npm run lint`. Terminado: criterios de la sección 10 verdes.
