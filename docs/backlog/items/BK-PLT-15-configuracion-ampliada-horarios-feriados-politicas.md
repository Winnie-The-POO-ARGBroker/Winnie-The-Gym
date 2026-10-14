---
id: BK-PLT-15
titulo: Configuración ampliada: horarios por día, feriados, política de cancelación global y aforo por sala
tipo: idea
roles: [administrador]
prioridad: P3
tamano: L
estado_en_codigo: solo-idea
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-PLT-14]
---

# BK-PLT-15 · Configuración ampliada: horarios por día, feriados, política de cancelación y aforo por sala

## 1. Resumen
La configuración del gimnasio es un singleton con 5 campos planos (nombre, aforo máximo, apertura, cierre, teléfono). Un gimnasio real necesita horarios distintos por día, feriados/cierres especiales, políticas globales (cancelación de reservas, ventana de reserva) y capacidad por sala. Hoy esas reglas existen solo parcialmente y por clase, no como configuración. Es una idea sin especificación; esta ficha propone un modelo mínimo.

## 2. Objetivo de usuario
Como **administrador** quiero **definir horarios por día, feriados y políticas generales desde la pantalla de configuración** para **que el sistema se comporte según cómo opera mi gimnasio sin tocar código**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/common/models.py:10-14` | Campos existentes: `nombre_gym` (100), `aforo_maximo` (int, 200), `hora_apertura`, `hora_cierre` (TimeField), `telefono_contacto` (20). Un solo horario para todos los días; sin feriados. |
| Backend persistencia | `backend/apps/common/models.py:20-33` | Singleton: `save()` fuerza `pk=1`; `delete()` no-op; `GymConfig.get()` hace `get_or_create(pk=1)`. Seed por data-migration `common/migrations/0002_*` con los defaults. |
| Backend API | `backend/apps/common/views.py:10-27`, `serializers.py:9-15` | `GET` público / `PATCH` admin; 5 campos expuestos. |
| Backend política por clase | `backend/apps/classes/models.py:39-41` | `cupo_maximo` (20), `lista_espera_max` (5), `cancelacion_horas` (2) por clase; `planes_habilitados` JSON (`:42`). `cancelar_inscripcion` aplica `cancelacion_horas` (`classes/services.py:82-106`). |
| Backend sala | `backend/apps/classes/models.py:37` | `sala = CharField(max_length=80, default='Sala A')`: texto libre, sin entidad ni capacidad propia. |
| Frontend | `frontend/src/pages/admin/AdminConfiguracionPage.jsx:12-18,87-160` | Formulario único "Datos del gimnasio" con los 5 campos (RHF + Zod). |
| Frontend nav | `Sidebar.jsx:29`, `AppBottomNav.jsx:11` | Acceso a `/configuracion` (admin). |
| Hook | `frontend/src/hooks/queries/useGymConfig.js:14-31` | Query con `staleTime: Infinity`. |
| Specs | `speckit/spec.md` § REQ-3.7 (líneas ~284-291) | Especificó solo el singleton de 5 campos (no incluye feriados ni políticas). |

## 4. Alcance
**Incluye (propuesta por fases):** F1 horarios por día de semana (`HorarioDia`); F2 feriados/cierres (`DiaEspecial`); F3 política global de cancelación y anticipación de reserva con override por clase; F4 entidad `Sala` con aforo propio para validar `cupo_maximo <= capacidad`.
**No incluye:** multi-sede (BK-PLT-10), aplicación en acceso/aforo (BK-PLT-14, prerrequisito para que los horarios tengan efecto), recordatorios (BK-PLT-08).

## 5. Contrato de API (propuesta, **[A CREAR]**)
Mantener `GET/PATCH /api/config/gym/` **[EXISTE]** sin romper contrato y agregar:
- `GET /api/config/horarios/` → `[{dia: 'lunes'|…|'domingo', abre: 'HH:MM'|null, cierra: 'HH:MM'|null, cerrado: bool}]` (público, igual que config); `PUT /api/config/horarios/` (IsAdminOnly) con la lista de 7 días completa; 400 si `abre >= cierra` salvo cierre pasada medianoche permitido explícitamente.
- `GET/POST /api/config/feriados/` y `DELETE /api/config/feriados/{id}/` (escritura IsAdminOnly): `{id, fecha, descripcion, cerrado: bool, abre?, cierra?}`.
- `GET/PATCH /api/config/gym/` agrega `cancelacion_horas_default` (int) y `reserva_anticipacion_dias` (int).
- `GET/POST/PATCH /api/classes/salas/` (lectura IsAuthenticated; escritura IsAdminOnly): `{id, nombre, capacidad}`.
Los códigos de día reutilizan `Clase.Dia` (`lunes`…`domingo`, `classes/models.py:22-29`).

## 6. Modelo de datos (propuesta)
`HorarioDia(dia unique, abre, cierra, cerrado)` (7 filas, seed); `DiaEspecial(fecha unique, descripcion, cerrado, abre null, cierra null)`; `Sala(nombre unique, capacidad)` y `Clase.sala_ref FK null` conviviendo con `sala` texto hasta migrar (data-migration que crea `Sala` por cada valor distinto); campos nuevos en `GymConfig` con defaults. Mantener `hora_apertura/hora_cierre` como fallback hasta deprecarlos.

## 7. Diseño frontend
- Ruta existente `/configuracion` (`roles=['administrador']`); reorganizar `AdminConfiguracionPage.jsx` en secciones/tabs: "Datos", "Horarios", "Feriados", "Políticas", "Salas".
- Componentes: tabla de 7 filas con dos `<input type="time">` (clase `inputCls` existente) y switch "Cerrado"; lista de feriados con `Modal` para alta; formulario con `react-hook-form` + `zod` (patrón actual de la página).
- Hooks: `useHorarios`, `useFeriados`, `useSalas` en `hooks/queries/` con mutations que invalidan su `queryKey` (`useGymConfig` usa `setQueryData`; elegir invalidación para listas).
- Estados: skeleton por sección, vacío ("No cargaste feriados"), error por campo y toast, éxito "Configuración actualizada correctamente." (copy ya usado).
- Textos (es-AR): "Horarios por día", "Cerrado", "Feriados y cierres especiales", "Política de cancelación (horas antes)".
- Responsive: tabla de horarios en tarjetas a 375 px.

## 8. Archivos a crear / modificar
Backend: modelos/serializers/vistas/migraciones en `apps/common` (y `apps/classes` para `Sala`), tests. Frontend: refactor de `AdminConfiguracionPage.jsx` en subcomponentes `components/admin/config/*`, hooks, tests.

## 9. Plan de pruebas (TDD)
- Backend (pytest/`APITestCase`; patrón `apps/common/tests/test_gym_config.py`: `RefreshToken.for_user` + `client.credentials`): GET público, PUT/POST solo admin (recepcionista y socio 403); validaciones de horas; unicidad de fecha; seed de 7 días; data-migration de `Sala`; `cupo_maximo > capacidad` → 400 en `ClaseSerializer`.
- Frontend (Vitest/RTL): edición de un día; marcar "Cerrado" deshabilita las horas; alta/baja de feriado.
- Manual: cargar un feriado y verificar el efecto una vez implementado BK-PLT-14.

## 10. Criterios de aceptación
- **Dado** el domingo configurado como cerrado **cuando** un socio escanea ese día **entonces** se deniega por horario (requiere BK-PLT-14).
- **Dado** un feriado cargado **cuando** se consulta `/api/config/feriados/` **entonces** aparece con su descripción.
- **Dado** una sala con capacidad 15 **cuando** se crea una clase con cupo 20 **entonces** 400 con mensaje por campo.

## 11. Riesgos y decisiones abiertas
- Mucho alcance para poco valor inmediato; **Recomendación:** empezar por F1 (horarios por día) solo si BK-PLT-14 se implementa.
- Zona horaria: usar `America/Argentina/Buenos_Aires` (`TIME_ZONE`, `core/settings/base.py:121`) para evaluar horarios.
- ¿Feriados nacionales automáticos (API externa) o carga manual? **Recomendación:** manual.
- La política global de cancelación entra en conflicto con `cancelacion_horas` por clase: definir prioridad (la de la clase gana).

## 12. Referencias
- `speckit/spec.md` § REQ-3.7, `backend/apps/classes/services.py`. Relacionados: BK-PLT-14, BK-PLT-10.

## 13. Prompt listo para un agente de IA
```
NO implementar sin que el dueño priorice las fases (sección 11 de docs/backlog/items/BK-PLT-15-configuracion-ampliada-horarios-feriados-politicas.md). 
Si se aprueba F1: TDD primero (apps/common/tests: GET público, PUT admin-only de 7 días, validaciones). Creá HorarioDia con seed por data-migration, endpoints GET/PUT /api/config/horarios/ sin romper /api/config/gym/, y en AdminConfiguracionPage.jsx una sección "Horarios por día" con RHF+Zod y hooks useHorarios en hooks/queries. Copy es-AR.
Terminado: `cd backend && pytest -q` (>=80%) y `cd frontend && npm run lint && npx vitest run --coverage` verdes.
```
