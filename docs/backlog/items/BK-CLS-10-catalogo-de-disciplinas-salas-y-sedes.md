---
id: BK-CLS-10
titulo: Catálogo configurable de disciplinas, salas (y sedes) en lugar de listas hardcodeadas
tipo: feature
roles: [administrador, recepcionista]
prioridad: P2
tamano: L
estado_en_codigo: no-existe
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-CLS-06]
---

# BK-CLS-10 · Catálogo configurable de disciplinas, salas (y sedes) en lugar de listas hardcodeadas

## 1. Resumen
Las disciplinas son un `TextChoices` del backend replicado a mano en cuatro lugares del frontend (con 5, 5, 6 y 8 ítems distintos); las salas son texto libre en la base y un `<select>` fijo "Sala A/B/C" en el formulario; las sedes no existen (solo aparecen como texto en planes y en la matriz comparativa). Agregar una disciplina o sala requiere deploy, el seed y la UI ya están desalineados y no hay capacidad por sala para validar el cupo.

## 2. Objetivo de usuario
Como **administrador** quiero **gestionar las disciplinas y salas del gimnasio desde Configuración** para **crear clases sin pedir cambios de código y con datos consistentes**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/classes/models.py:9-15` | `Categoria` `TextChoices`: funcional, spinning, crossfit, pilates, yoga, boxeo, hiit. Agregar una requiere migración + deploy. |
| Backend modelo | `models.py:37` | `sala = CharField(max_length=80, default='Sala A')`: texto libre sin catálogo ni capacidad. |
| Backend filtros | `backend/apps/classes/filters.py:24-31` | Filtra `sala` por `exact/icontains`. |
| Backend sedes | `rg -i sede backend/apps` | Sin modelo ni campo de sede; solo el nombre de plan "Pase Libre - Sede Central" (`backend/seed_data.py:15`). |
| Backend config | `backend/apps/common/models.py:4-14` | `GymConfig` singleton: `nombre_gym, aforo_maximo, hora_apertura, hora_cierre, telefono_contacto`. Sin salas/sedes. Endpoint `GET/PATCH /api/config/gym/` (`common/views.py:10-27`). |
| Backend seed | `backend/seed_data.py:40-65` | Salas "Box Principal", "Studio Ciclo Indoor", "Studio Zen" (no coinciden con "Sala A/B/C" del formulario). |
| Frontend | `frontend/src/pages/CreateClassPage.jsx:200-210` | Disciplinas: 5 `<option>` fijas (faltan boxeo, hiit). |
| Frontend | `CreateClassPage.jsx:282-290` | Salas fijas "Sala A (Principal)", "Sala B (Spinning / Reformer)", "Sala C (Yoga / Meditación)". |
| Frontend | `frontend/src/constants/disciplinas.js:1-32` | `DISCIPLINAS_CONFIG`: 5 disciplinas con colores `var(--color-disciplina-*)` definidos en `frontend/src/index.css:17-30`. |
| Frontend | `frontend/src/constants/clases.js:18-27` | `CATEGORIAS_CLASES` (socio): 8 chips con rótulos de marketing ("Power Yoga", "Pilates Reformer", "Boxeo & Funcional", "HIIT Circuit"). |
| Frontend | `frontend/src/components/classes/ClassListDetailView.jsx:14-21` | `CATEGORIAS_FILTRO`: 6 chips (sin boxeo/hiit). |
| Frontend | `frontend/src/pages/admin/AdminConfiguracionPage.jsx` (ruta `/configuracion` y `/admin/configuracion`, `roles={['administrador']}`, `frontend/src/App.jsx:136-138`) | Pantalla de configuración existente; hoy solo gestiona `GymConfig` (usa `useGymConfig/useUpdateGymConfig`, `frontend/src/hooks/queries/useGymConfig.js`). **No verificado**: contenido completo de la página. |
| Frontend | `frontend/src/components/admin/PlanComparativeTable.jsx:49-52`, `PlanFormModal.jsx:37,70` | "1 sede"/"2 sedes" hardcodeados en la matriz comparativa de planes (otra área). |

## 4. Alcance
**Incluye:**
- Modelos `Disciplina` y `Sala` administrables (CRUD admin, lectura para staff y socios) y migración de datos desde `categoria`/`sala` actuales.
- `Clase.disciplina` FK (conservando `categoria` en la API durante la transición) y `Clase.sala` FK; validar `cupo_maximo <= Sala.capacidad`.
- Selects del formulario y filtros alimentados por API; colores de disciplina configurables (token o hex).
- Sección "Clases" en Configuración para administrar ambos catálogos.

**No incluye:**
- Multi-sede completa (propuesta en decisiones abiertas).
- Instructores (BK-CLS-11).
- Horarios de apertura por día/feriados (BK-CLS-13).

## 5. Contrato de API
Todo **[A CREAR]** (app `classes`, router en `backend/apps/classes/urls.py`):
- `GET /api/classes/disciplinas/` (IsAuthenticated) -> `[{ "id", "slug", "nombre", "color", "activa", "orden" }]`; `POST/PATCH/DELETE` `IsAdminOnly` (de `apps.access.permissions`). Borrado con clases asociadas -> `409/400 {"detail": "Hay N clases usando esta disciplina. Desactivala en lugar de borrarla."}`.
- `GET /api/classes/salas/` (IsAuthenticated) -> `[{ "id", "nombre", "capacidad", "activa", "sede" }]`; escritura `IsAdminOnly`.
- `ClaseSerializer`: acepta `disciplina` (id) y `sala_id`; sigue devolviendo `categoria` (slug) y `sala` (nombre) para compatibilidad; agrega `disciplina_nombre`, `disciplina_color`.
- Validación: `400 {"cupo_maximo": ["La sala {nombre} admite hasta {capacidad} personas."]}`.
- Paginación: listas cortas; usar `pagination_class = None` o `page_size` alto (ver BK-CLS-01).

## 6. Modelo de datos
```python
class Disciplina(models.Model):
    slug = SlugField(unique=True); nombre = CharField(80); color = CharField(7, default='#FF5722')
    activa = BooleanField(default=True); orden = PositiveSmallIntegerField(default=0)
class Sala(models.Model):
    nombre = CharField(80, unique=True); capacidad = PositiveIntegerField(); activa = BooleanField(default=True)
    sede = ForeignKey('Sede', null=True, blank=True, on_delete=SET_NULL)   # solo si se aprueba multi-sede
```
- `Clase.disciplina = FK(Disciplina, PROTECT, null=True)` y `Clase.sala_ref = FK(Sala, PROTECT, null=True)` con migración de datos (crear `Disciplina` por cada `Categoria`; `Sala` por cada valor distinto de `sala`; capacidad inicial = `cupo_maximo` máximo observado). Después deprecar `categoria`/`sala` texto.
- Migraciones `0011+` con `RunPython` reversible.

## 7. Diseño frontend
- **Ruta/guard:** Configuración: `/configuracion` y `/admin/configuracion` con `<ProtectedRoute roles={['administrador']}>` (`frontend/src/App.jsx:136-138`).
- **Hooks nuevos** `frontend/src/hooks/queries/useCatalogoClases.js`: `useDisciplinas()`, `useSalas()`, `useCatalogoMutations()`; patrón y keys como `useGymConfig.js` (`GYM_CONFIG_KEY`) con `staleTime` largo.
- **Componentes:** pestaña/sección "Clases" en `AdminConfiguracionPage` con `DataTable` (`frontend/src/components/ui/DataTable.jsx`) + `Modal` de formulario; `Select` en `CreateClassPage` poblado por hooks; `ClassListDetailView`, `ClassCalendarView`, `ClasesPage` y `ClassCard` consumen color/nombre de la disciplina por API (reemplazan `DISCIPLINAS_CONFIG`/`CATEGORIAS_CLASES`/`CATEGORIAS_FILTRO`).
- **Estados:** loading con `Skeleton`; vacío "Todavía no cargaste salas"; error con toast; éxito "Sala creada".
- **Textos (voseo):** "Nueva disciplina", "Capacidad de la sala", "Desactivar (las clases existentes se conservan)", "No podés borrar una sala con clases asignadas".
- **Responsive:** tablas con scroll horizontal en 375 px; formularios en modal a ancho completo.

## 8. Archivos a crear / modificar
- Backend: `models.py`, `serializers.py`, `views.py`, `urls.py`, `admin.py`, migraciones, `seed_data.py` (alinear), tests.
- Frontend: `constants/disciplinas.js` y `constants/clases.js` (eliminar listas), `hooks/queries/useCatalogoClases.js`, `CreateClassPage.jsx`, `ClassListDetailView.jsx`, `ClassCalendarView.jsx`, `ClasesPage.jsx`, `ClassCard.jsx`, `AdminConfiguracionPage.jsx`.

## 9. Plan de pruebas (TDD)
Backend (`backend/apps/classes/tests/test_catalogo.py`; `APITestCase`; `cd backend && pytest apps/classes -q`):
- CRUD de disciplinas y salas: admin 2xx; recepcionista 403 en escritura y 200 en lectura; socio 200 en lectura, 403 en escritura.
- No se puede borrar una disciplina/sala en uso.
- `cupo_maximo > capacidad` -> 400.
- Migración de datos: clases existentes conservan su disciplina y sala.
- Compatibilidad: respuesta de `ClaseSerializer` mantiene `categoria` y `sala`.
Frontend (vitest/RTL; `npx vitest run src/pages src/components src/hooks`): formulario carga opciones por API; filtros de socio y admin usan el catálogo; la sección de Configuración crea/edita.
Manual: `admin@winnie.local` -> `/configuracion` -> crear "Boxeo" y sala "Box 2 (cap. 12)" -> crear clase con ambas.

## 10. Criterios de aceptación
- **Dado** que creo una disciplina nueva **cuando** abro "Nueva clase" **entonces** aparece en el select sin deploy.
- **Dado** una sala con capacidad 12 **cuando** creo una clase con cupo 20 **entonces** veo el error de capacidad.
- **Dado** una clase existente **cuando** abro la lista **entonces** mantiene su disciplina y sala tras la migración.
- **Dado** una disciplina en uso **cuando** intento borrarla **entonces** se me ofrece desactivarla.

## 11. Riesgos y decisiones abiertas
- ¿Hay una o varias sedes? No hay evidencia en el código más allá de textos de planes. Recomendación: no modelar `Sede` hasta que producto lo confirme (campo `sede` nullable ya previsto).
- ¿El color es libre (hex) o de una paleta? Recomendación: paleta fija de tokens con contraste AA en tema claro/oscuro (`frontend/src/index.css`).
- ¿Las salas tienen capacidad hoy? No: definir con el dueño; si no se conoce, no validar (campo opcional).
- Rótulos de marketing ("Power Yoga") vs nombre de disciplina: recomendación: el nombre lo define el catálogo.

## 12. Referencias
- `speckit/class-model-architecture-decision/explore.md` §1 (modelo actual).
- Ver también (otras áreas): BK-PLT-10 (multi-sede) y BK-BUG-08 (hardcodeos).
- Figma opcional: formulario "Crear clase" (selects de actividad y sala).

## 13. Prompt listo para un agente de IA
Contexto: Winnie The Gym. Disciplinas = `Clase.Categoria` (TextChoices) y `sala` es `CharField` libre en `backend/apps/classes/models.py`; el frontend las replica en `CreateClassPage.jsx`, `constants/disciplinas.js`, `constants/clases.js` y `ClassListDetailView.jsx`. Seed usa salas distintas a las del formulario.
Tarea (TDD): 1) tests en `backend/apps/classes/tests/test_catalogo.py` (sección 9) -> ver fallar; 2) modelos `Disciplina`, `Sala`, FK en `Clase` con migraciones de datos reversibles, serializers/viewsets (`IsAdminOnly` escritura, `IsAuthenticated` lectura), validación `cupo_maximo <= capacidad`, compatibilidad `categoria`/`sala` en la respuesta; 3) frontend: `useCatalogoClases.js`, sección "Clases" en `frontend/src/pages/admin/AdminConfiguracionPage.jsx`, reemplazo de listas hardcodeadas por datos de API, tests vitest/RTL. Comandos: `cd backend && pytest apps/classes -q`; `cd frontend && npx vitest run && npm run lint`. No tocar `backend/loadtests/*`. Terminado: criterios de la sección 10 verdes y seeds/tests existentes actualizados.
