---
id: BK-CLS-08
titulo: Clases del socio (mobile) - sin lista de espera, "hoy" erróneo de noche, reservas sin día y filtros incompletos
tipo: mobile
roles: [socio]
prioridad: P1
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-CLS-01, BK-CLS-03, BK-CLS-04, BK-CLS-09]
---

# BK-CLS-08 · Clases del socio (mobile) - sin lista de espera, "hoy" erróneo de noche, reservas sin día y filtros incompletos

## 1. Resumen
`/socio/clases` ("Agenda y Reservas") permite filtrar por día, turno, disciplina y texto, reservar y cancelar. Pero: cuando una clase se llena el botón se deshabilita ("Sin cupos disponibles") y el socio nunca puede anotarse en lista de espera aunque el backend lo soporta; después de las 21:00 (hora Argentina) el chip "Hoy" muestra las clases de mañana por un bug de UTC; "Mis reservas" no dice qué día es cada clase; el aviso "se reservó con éxito" aparece incluso si el backend lo dejó en espera; y falta el filtro por sala/instructor/"con cupo".

## 2. Objetivo de usuario
Como **socio** quiero **encontrar rápido una clase de hoy o de esta semana, anotarme en lista de espera si está llena y ver mis reservas con día y hora** para **organizar mi semana desde el celular**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Frontend ruta | `frontend/src/App.jsx:131` | `/socio/clases` -> `ClasesPage` con `<ProtectedRoute roles={['administrador','socio']}>`; layout `MemberLayout`. El `administrador` puede entrar pero `inscribir`/`cancelar` son `IsSocio` (403). |
| Frontend página | `frontend/src/pages/socio/ClasesPage.jsx:49-51` | `selectedDay` inicial = `new Date().toISOString().split('T')[0]` (fecha UTC). |
| Frontend util | `frontend/src/utils/agenda.js:10-24` | `generateDaysAgenda()`: `id = d.toISOString().split('T')[0]` (UTC) pero `diaNombre`/`diaNumero` salen de `d.getDay()/getDate()` (hora local). Después de las 21:00 ART el id es el día siguiente: el chip "Hoy" trae las clases de mañana (`getDiaParam` -> `ClasesPage.jsx:17-21`). |
| Frontend página | `ClasesPage.jsx:58-65` | Query `GET /classes/clases/?dia=<dia>&categoria=&search=&hora_hasta=11:59:59|hora_desde=12:00:00&page_size=1000`. Turnos: Todos/Mañana/"Tarde / Noche" (sin "Noche" separada). |
| Frontend página | `ClasesPage.jsx:73-90` | "Mis reservas": trae TODAS las clases (`useClasesList({})`) y filtra por `user_inscrito` en el cliente; sujeto al bug de BK-CLS-01 (solo 10) y no incluye lista de espera. |
| Frontend página | `ClasesPage.jsx:24-45` | `mapClase`: `fecha: undefined`; no mapea `cancelacion_horas`, `lista_espera_max`, `estado`, `planes_habilitados`. |
| Frontend componente | `frontend/src/components/socio/ClassCard.jsx:11,26-28` | Variante `booked`: muestra solo `"{horaInicio}h"` (sin día porque `fecha` es `undefined`) y "Cancelación permitida hasta 2h antes" fijo. |
| Frontend componente | `ClassCard.jsx:42-52,126-152` | `isFull` -> botón `disabled` "Sin cupos disponibles"; no hay acción de lista de espera ni estado "En lista de espera". `isBooked` = solo confirmadas. |
| Frontend componente | `ClassCard.jsx:68-76` | Badge por categoría con 3 colores; muestra `clase.categoria.toUpperCase()` ("HIIT", "BOXEO"). |
| Frontend hook | `frontend/src/hooks/queries/useInscripciones.js:20-30` | `inscribir.onSuccess` -> `toast.success('¡Cupo reservado con éxito!')` sin mirar `response.en_espera`; `cancelar.onSuccess` ignora `promovido_de_espera`. |
| Frontend constantes | `frontend/src/constants/clases.js:18-27` | `CATEGORIAS_CLASES` con rótulos "Power Yoga", "Pilates Reformer", "Boxeo & Funcional", "HIIT Circuit" (nombres de marketing) que no coinciden con `Clase.Categoria` (`models.py:9-15`). |
| Backend serializer | `backend/apps/classes/serializers.py:60-68` | `user_inscrito` solo cuenta `en_espera=False`. No existen `user_en_espera`, `posicion_espera` ni `en_lista_espera`. |
| Backend filtros | `backend/apps/classes/filters.py:15-31` | Soporta `categoria`, `dia`, `dia__in`, `sala`, `instructor`, `hora_desde/hasta`, `cupo_disponible`, `search` (nombre, instructor, sala, descripción). La UI solo usa `dia`, `categoria`, `search`, `hora_*`. |
| Backend vista | `backend/apps/classes/views.py:87-125` | `inscribir` crea en lista de espera si no hay cupo; `cancelar` promueve. |
| Docs | `docs/qa/walkthrough-2026-09-22.md` (sección mobile) | La reserva mobile (`M_Reservas`) está diseñada con navegación inferior; el estado de lista de espera no figura en la app real. |
| Tests | `frontend/src/pages/socio/ClasesPage.test.jsx`, `frontend/src/components/socio/ClassCard.test.jsx` | Cubren catálogo, reservar, cancelar con mocks. |

## 4. Alcance
**Incluye:**
- Fechas locales (zona `America/Argentina/Buenos_Aires`) en `generateDaysAgenda` y `selectedDay`.
- Estado de lista de espera en la tarjeta ("Anotarme en lista de espera (2/5)", "Estás #2 en lista de espera", "Salir de la lista").
- Toasts correctos según `en_espera` y `promovido_de_espera`.
- Mostrar día de la semana (y próxima fecha) en "Mis reservas".
- Texto de cancelación basado en `cancelacion_horas`.
- Filtros extra: "Solo con lugar", sala, instructor (chips/`Select`), turno "Noche".
- Rótulos de disciplina alineados al backend.
- Ocultar/deshabilitar reserva para `administrador`.

**No incluye:**
- Reservas por fecha concreta (BK-CLS-09).
- Reglas de plan/membresía (BK-CLS-04; este ítem solo muestra el mensaje del backend).
- Notificación push al promovido (BK-CLS-03 define email).
- Tabs inferiores/navegación (otra área: MOB).

## 5. Contrato de API
- **[EXISTE]** `GET /api/classes/clases/` (`IsAuthenticated`; query `dia, categoria, search, hora_desde, hora_hasta, cupo_disponible, sala, instructor, page_size`). Item (`ClaseSerializer`): `id, nombre, categoria, descripcion, dia, hora, duracion_min, sala, instructor, instructor_nombre, cupo_maximo, cupos_reservados, lista_espera_max, cancelacion_horas, planes_habilitados, recurrencia, dias_recurrencia, estado, created_at, updated_at, user_inscrito`.
- **[A CREAR]** en `ClaseSerializer`: `user_en_espera` (bool), `user_posicion_espera` (int|null, 1-based por `created_at`), `en_lista_espera` (int, total en espera). Mantener `user_inscrito` (solo confirmadas) por compatibilidad.
- **[EXISTE]** `POST /api/classes/clases/{id}/inscribir/` (IsSocio) -> `201 InscripcionClaseSerializer` con `en_espera: bool`; errores `400 {"detail": "Ya estás inscripto en esta clase."}` / `"La clase y su lista de espera están completas."`.
- **[EXISTE]** `POST /api/classes/clases/{id}/cancelar/` (IsSocio) -> `200 {"detail": "Inscripción cancelada.", "promovido_de_espera": bool}`; `400 {"detail": "Fuera del margen para cancelar. El límite es N horas antes del inicio."}`.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Ruta/guard:** `/socio/clases` en `frontend/src/App.jsx:131`; para esconder reservas al administrador usar `useAuthStore` (`frontend/src/stores/authStore.js`, campo `user.rol`).
- **Reutilizar:** `ClassCard` (props: `clase, variant ('catalog'|'booked'), onBook, onCancel`), `FilterButton`, `Card`, `Badge`, `Button`, `EmptyState`, `MemberLayout`.
- **Cambios:**
  - `utils/agenda.js`: construir `id` con fecha local (`new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(d)`) y exportar `todayLocalISO()` para `ClasesPage`.
  - `mapClase`: agregar `cancelacionHoras`, `listaEsperaMax`, `enListaEspera`, `isWaitlisted`, `posicionEspera`, `dia`.
  - `ClassCard`: variante `waitlisted` + botón "Anotarme en lista de espera" cuando `isFull && enListaEspera < listaEsperaMax`; "Cupo y lista de espera completos" cuando ambas llenas.
  - `useInscripciones.js`: leer `data.en_espera` para toast distinto; `cancelar` informa promoción.
  - Pestaña "Mis Reservas": agrupar "Confirmadas" y "En lista de espera", con día ("Lunes 08:00 h").
- **Query keys/hook:** `CLASES_QUERY_KEYS` (`useClases.js:7-12`), `useInscripcionesMutations()`; mutaciones invalidan `CLASES_QUERY_KEYS.all`.
- **Estados:** loading (`EmptyState` "Cargando clases..."), vacío por filtros (Card "No hay clases con estos filtros"), error de red: hoy no hay estado -> agregar; error de reserva: toast con `detail`.
- **Textos (voseo):** "Anotarme en lista de espera", "Estás #{n} en la lista. Te avisamos por email si se libera un lugar.", "Te anotaste en la lista de espera.", "¡Cupo reservado!", "Lunes · 08:00 h".
- **Responsive:** diseñada para 375 px: chips con scroll horizontal (`overflow-x-auto scrollbar-none`), botones de >= 44 px de alto (hoy `py-1.5 text-xs`: subir tamaño táctil), tipografías `text-[10px]` a >= 11-12 px; en 768 px 2 columnas de tarjetas.

## 8. Archivos a crear / modificar
- `frontend/src/utils/agenda.js` (+ test), `frontend/src/pages/socio/ClasesPage.jsx`, `frontend/src/components/socio/ClassCard.jsx`, `frontend/src/hooks/queries/useInscripciones.js`, `frontend/src/constants/clases.js`.
- `backend/apps/classes/serializers.py`: `user_en_espera`, `user_posicion_espera`, `en_lista_espera`.
- Tests correspondientes.

## 9. Plan de pruebas (TDD)
Frontend (vitest + RTL; `renderWithProviders`, `resetAllStores`, `seedAuthStore`, `makeAuthedUser('socio')` de `frontend/src/test/test-utils.jsx`; `cd frontend && npx vitest run src/pages/socio src/components/socio src/utils src/hooks`):
- `generateDaysAgenda` con `vi.setSystemTime('2026-10-13T01:30:00Z')` (22:30 ART del 12/10): el primer chip es 12/10 "Hoy" y `selectedDay` es 12/10 (no 13/10).
- `ClassCard`: llena con espera libre muestra "Anotarme en lista de espera"; con `isWaitlisted` muestra "Estás #2..." y "Salir"; llena y espera llena muestra mensaje sin botón.
- `useInscripciones`: `inscribir` con `en_espera:true` dispara el toast de lista de espera.
- "Mis reservas" muestra el día; el texto de cancelación usa `cancelacion_horas`.
- Filtro "Solo con lugar" envía `cupo_disponible=true`.
Backend (`backend/apps/classes/tests/test_class_contract_fields.py`): `GET` como socio en espera devuelve `user_en_espera=true` y `user_posicion_espera=1`; `en_lista_espera` correcto.
Manual (Chrome DevTools, viewport 375x812): `socio.activo@winnie.local`; llenar una clase con cupo 1 y ver el botón de espera.

## 10. Criterios de aceptación
- **Dado** que son las 22:30 en Argentina **cuando** abro la agenda **entonces** "Hoy" muestra las clases de hoy.
- **Dado** una clase llena con lista de espera disponible **cuando** toco "Anotarme en lista de espera" **entonces** quedo en espera, veo "Estás #n" y el toast lo dice.
- **Dado** que reservé **cuando** miro "Mis reservas" **entonces** veo el día y la hora de cada clase.
- **Dado** una clase con `cancelacion_horas=6` **cuando** miro la tarjeta **entonces** dice "Cancelación permitida hasta 6 h antes".

## 11. Riesgos y decisiones abiertas
- Como la inscripción es a la plantilla semanal (BK-CLS-09), "Mis reservas" muestra "Lunes 08:00" recurrente, no una fecha; el copy debe decirlo ("Todos los lunes") hasta tener sesiones.
- ¿Se aceptan reservas con un tope por plan (`clases_asignadas`)? Pendiente de producto (BK-CLS-04).
- ¿Turno "Noche" (>= 19:00)? Recomendación: sí, 3 turnos: Mañana (< 12), Tarde (12-19), Noche (>= 19).

## 12. Referencias
- `speckit/class-model-architecture-decision/explore.md` §3 (consumidores frontend).
- Figma opcional: `M_Reservas` y `M_ClasesCalendario` (Mobile), página "vistas live".

## 13. Prompt listo para un agente de IA
Contexto: Winnie The Gym (React + Vite; Django REST). `frontend/src/pages/socio/ClasesPage.jsx` y `frontend/src/utils/agenda.js` usan `toISOString()` (UTC) para el día seleccionado: tras las 21:00 ART "Hoy" muestra mañana. `ClassCard.jsx` deshabilita la reserva cuando la clase está llena (no permite la lista de espera que el backend sí soporta) y la variante `booked` no muestra el día ni usa `cancelacion_horas`. `useInscripciones.js` ignora `en_espera`/`promovido_de_espera`.
Tarea (TDD): 1) backend: test en `test_class_contract_fields.py` y luego campos `user_en_espera`, `user_posicion_espera`, `en_lista_espera` en `ClaseSerializer` (ordenar por `created_at`); 2) frontend: tests (vitest/RTL) de la sección 9 con `vi.setSystemTime`; luego implementar fecha local con `Intl` y `timeZone: 'America/Argentina/Buenos_Aires'`, variante de tarjeta con lista de espera, toasts diferenciados, día en "Mis reservas", filtros extra, textos en voseo, objetivos táctiles de 44 px. Reglas del repo: toasts `sonner`, hooks en `frontend/src/hooks/queries`, UI en `frontend/src/components/ui`, rutas con `<ProtectedRoute roles=[...]>`. Comandos: `cd backend && pytest apps/classes -q`; `cd frontend && npx vitest run && npm run lint`. No tocar `useScreenWakeLock.js` ni `usePlanes.test.jsx`. Terminado: criterios de la sección 10 verdes, sin regresiones en `ClasesPage.test.jsx` ni `ClassCard.test.jsx`.
