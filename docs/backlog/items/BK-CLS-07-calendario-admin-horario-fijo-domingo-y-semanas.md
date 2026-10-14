---
id: BK-CLS-07
titulo: Calendario admin - grilla de horas fija (clases a las 07:30 invisibles), sin domingo, navegación de semanas decorativa y sin mobile
tipo: bug
roles: [administrador, recepcionista]
prioridad: P1
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-CLS-01, BK-CLS-09, BK-CLS-10]
---

# BK-CLS-07 · Calendario admin - grilla de horas fija (clases a las 07:30 invisibles), sin domingo, navegación de semanas decorativa y sin mobile

## 1. Resumen
La vista "Calendario" de `/admin/clases` tiene la grilla 08:00-22:00 hardcodeada y solo columnas lunes-sábado. Las clases fuera de ese rango (por ejemplo la "CrossFit WOD Pro" del seed, a las 07:30) o en domingo no se dibujan nunca, aunque el backend las acepta y cuentan en el subtítulo "N clases programadas". Los botones "Sem ant./Sem sig." solo cambian los rótulos de fecha: como `Clase` es una plantilla semanal, todas las semanas muestran lo mismo. La grilla de 7 columnas no tiene variante mobile.

## 2. Objetivo de usuario
Como **recepcionista** quiero **ver en el calendario todas las clases del gimnasio en su horario real** para **no dejar clases "fantasma" ni errores de programación**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Frontend componente | `frontend/src/components/classes/ClassCalendarView.jsx:6-22` | `HORAS_GRILLA` fija de `'08:00'` a `'22:00'` (15 filas). |
| Frontend componente | `ClassCalendarView.jsx:26-56` | `getClassesForSlot` hace match por hora entera (`clsHour === slotHour`): una clase a las `07:30` (`parseInt('07:30:00')=7`) no tiene fila; tampoco las posteriores a las 22:59. Los minutos no se representan (una clase 08:45 aparece en la fila 08:00 sin offset). |
| Frontend componente | `ClassCalendarView.jsx:61,81` | `grid-cols-7` fijo (1 columna de hora + 6 días) y filas `min-h-[110px]`, sin `overflow-x-auto` ni variante responsive. |
| Frontend componente | `ClassCalendarView.jsx:130` | Muestra `cls.hora` crudo: el serializer devuelve `HH:MM:SS` (p. ej. "07:30:00"). |
| Frontend componente | `ClassCalendarView.jsx:98-99` | Colores por `DISCIPLINAS_CONFIG[cls.categoria] || .funcional`: `boxeo`/`hiit` se ven como "funcional" (`constants/disciplinas.js` solo tiene 5; tokens CSS en `frontend/src/index.css:17-30` solo para 5). |
| Frontend página | `frontend/src/pages/ClassSchedulePage.jsx:51-58` | Solo 6 días (`Lunes`..`Sábado`): domingo oculto aunque `Clase.Dia` lo incluye (`models.py:26`) y `RECURRENCIA_DIAS` ofrece `D` (`constants/clases.js:15`). |
| Frontend página | `ClassSchedulePage.jsx:29,42-77,121-141` | `weekOffset` solo recalcula `fecha` de cada columna y la etiqueta "Semana del X al Y de {mes}". El mes se toma del sábado: una semana 28-oct a 02-nov dice "Semana del 28 al 2 de Noviembre". `new Date()` usa la zona del navegador y locale `es-ES` (backend: `TIME_ZONE = 'America/Argentina/Buenos_Aires'`, `base.py:121`). Sin botón "Hoy". |
| Frontend página | `ClassSchedulePage.jsx:33,118` | `useClasesList()` sin filtros ni fechas; subtítulo cuenta todas las plantillas. Depende de BK-CLS-01 (solo llegan 10). |
| Frontend página | `ClassSchedulePage.jsx:196-199` | Click en una clase salta a la pestaña "Lista" con esa clase seleccionada; desde el calendario no hay acciones (editar/cancelar). |
| Backend config | `backend/apps/common/models.py:12-13` y `views.py:10-27` | `GymConfig.hora_apertura = 07:00` y `hora_cierre = 23:00` (default), expuestas en `GET /api/config/gym/` (AllowAny) y consumidas por `frontend/src/hooks/queries/useGymConfig.js`. El calendario no las usa. |
| Backend seed | `backend/seed_data.py:34-44` | "CrossFit WOD Pro", lunes 07:30 -> invisible en la grilla. |
| Backend modelo | `backend/apps/classes/models.py:34-35` | `dia` + `hora` sin fecha: no hay noción de semana concreta (ver BK-CLS-09). |
| Docs | `docs/qa/walkthrough-2026-09-22.md` (Figma/mobile) | Mobile rediseñado como "selector de día + agenda" en Figma (`M_ClasesCalendario`), no implementado en la app real. |
| Tests | `frontend/src/components/classes/ClassCalendarView.test.jsx` | Verifica render básico con fixtures dentro de 08-22. |

## 4. Alcance
**Incluye:**
- Rango de horas derivado de `GymConfig` (`hora_apertura`-`hora_cierre`) y ampliado automáticamente si hay una clase fuera de rango.
- Posicionar por minuto (clase 08:45 con offset) o, mínimo, agrupar por hora mostrando `HH:MM`.
- Mostrar domingo cuando exista al menos una clase en domingo (o siempre, configurable).
- Normalizar la hora a `HH:MM` en la UI.
- Navegación de semanas honesta: etiquetas correctas (mes de inicio/fin), botón "Hoy", y mientras no exista BK-CLS-09, rotular "Plantilla semanal" (sin fechas) o no ofrecer navegación.
- Variante mobile (< md): selector de día + lista del día (como `ClasesPage`).
- Agregar `boxeo` y `hiit` a `DISCIPLINAS_CONFIG` y `index.css`.

**No incluye:**
- Calendario con datos por fecha real (BK-CLS-09) ni vista mensual / feriados / cierres (BK-CLS-13).
- Drag & drop para mover clases.
- Catálogo de salas/disciplinas (BK-CLS-10).

## 5. Contrato de API
- **[EXISTE]** `GET /api/config/gym/` (AllowAny) -> `{"nombre_gym": str, "aforo_maximo": int, "hora_apertura": "HH:MM:SS", "hora_cierre": "HH:MM:SS", "telefono_contacto": str}` (`common/serializers.py:9-15`). Sin cambios.
- **[EXISTE]** `GET /api/classes/clases/?page_size=1000` (ver BK-CLS-01). Campos usados: `id, nombre, categoria, dia, hora, duracion_min, sala, instructor, cupo_maximo, cupos_reservados, dias_recurrencia, estado`.
- **[A CREAR / opcional]** `hora_fin` calculado en `ClaseSerializer` (`hora + duracion_min`), porque `ClassListDetailView.jsx:207` ya lo consume (`current.hora_fin`) y hoy renderiza "(08:00 - )".

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Ruta/guard:** `/admin/clases` -> `ClassSchedulePage` (`frontend/src/App.jsx:83-85`, `<ProtectedRoute roles={['administrador','recepcionista']}>`).
- **Reutilizar:** `ClassCalendarView` (props: `classes`, `diasSemana`, `onSelectClass`, `onOpenAttendees`), `useGymConfig()`, `useClasesList()`, `EmptyState`.
- **Nuevo:** `frontend/src/utils/agenda.js` o `frontend/src/utils/clases.js` con `buildHourRange({ apertura, cierre, classes })`, `formatHora(hora)` (corta segundos), `getWeekDays({ offset, includeSunday })` (no hay `date-fns` ni `dayjs` en `frontend/package.json`: helpers propios con `Intl.DateTimeFormat('es-AR')`).
- **Mobile:** componente `ClassDayAgenda` (selector horizontal de día tipo `ClasesPage`) renderizado cuando `window.matchMedia('(max-width: 767px)')` o con clases `hidden md:block` / `md:hidden`.
- **Estados:** loading (`EmptyState` "Cargando calendario..."), vacío ("No hay clases programadas"), error: hoy no existe estado de error en la página (`useClasesList` -> `isError`): agregar `EmptyState` con "No pudimos cargar el calendario. Reintentá".
- **Textos (voseo):** botón "Hoy", "Semana del 28 de oct. al 2 de nov.", "Plantilla semanal (las clases se repiten todas las semanas)".
- **Responsive:** 375 px: selector de día + tarjetas verticales; 768 px: grilla con scroll horizontal y columna de horas sticky; >= 1024 px: grilla completa.

## 8. Archivos a crear / modificar
- `frontend/src/components/classes/ClassCalendarView.jsx`: rango dinámico, domingo, minutos, responsive.
- `frontend/src/pages/ClassSchedulePage.jsx`: `diasSemana` incluye domingo condicional, etiqueta de semana, botón "Hoy", `isError`.
- `frontend/src/constants/disciplinas.js`, `frontend/src/index.css`: `boxeo`, `hiit`.
- `frontend/src/utils/clases.js` (nuevo) + tests.
- `backend/apps/classes/serializers.py`: `hora_fin` (opcional).

## 9. Plan de pruebas (TDD)
Frontend (vitest + RTL; `frontend/src/components/classes/ClassCalendarView.test.jsx`, `frontend/src/pages/__tests__/ClassSchedulePage.test.jsx`, nuevo `frontend/src/utils/clases.test.js`; correr `cd frontend && npx vitest run src/components/classes src/pages src/utils`):
- Clase a las `07:30:00` con `GymConfig` 07:00-23:00 aparece en la fila 07:00; clase a las `23:15` extiende el rango.
- Clase en domingo muestra columna Domingo; sin clases en domingo, no se muestra (según decisión).
- `formatHora('07:30:00') === '07:30'`.
- `getWeekDays` cruzando fin de mes y de año, etiqueta correcta.
- `weekOffset` y botón "Hoy" vuelven a 0.
- `boxeo`/`hiit` usan su color.
- Mobile: con viewport 375 renderiza selector de día (mock de `matchMedia`).
Backend: `hora_fin` en el serializer (en `test_class_contract_fields.py`).
Manual: `admin@winnie.local` -> `/admin/clases` con el seed (la clase de 07:30 debe verse); redimensionar a 375 px y a 768 px.

## 10. Criterios de aceptación
- **Dado** una clase a las 07:30 **cuando** abro el calendario **entonces** la veo en el lunes a las 07:30.
- **Dado** una clase de domingo **cuando** abro el calendario **entonces** hay columna Domingo.
- **Dado** que navego a la semana siguiente **cuando** cruza de mes **entonces** la etiqueta muestra ambos meses correctamente.
- **Dado** un celular de 375 px **cuando** abro el calendario **entonces** puedo ver las clases del día sin scroll horizontal de la página.

## 11. Riesgos y decisiones abiertas
- ¿Mostrar siempre domingo? Recomendación: solo si hay clases o si `GymConfig` indica que abre domingos (hoy `GymConfig` no tiene días de apertura: ver BK-CLS-13).
- ¿Qué hace la navegación de semanas sin sesiones por fecha? Recomendación: ocultar los botones hasta BK-CLS-09 o rotularlos "plantilla".
- Zona horaria: si el navegador no está en Argentina, `new Date()` calcula otra semana. Recomendación: usar `Intl` con `timeZone: 'America/Argentina/Buenos_Aires'`.
- Solapes visuales: dos clases en la misma hora/sala se apilan; la validación real está en BK-CLS-06.

## 12. Referencias
- `speckit/class-model-architecture-decision/explore.md` §3 ("ClassCalendarView renders classes by dia weekday - no date concept").
- `docs/qa/walkthrough-2026-09-22.md` (hallazgos mobile `M_ClasesCalendario`).
- Ver también (otras áreas): BK-MOB-05 (calendario/agenda móvil) y BK-PLT-14 (horarios del gimnasio no se aplican).
- Figma opcional: "Calendario de clases" Hi-Fi y `M_ClasesCalendario` (Mobile), página "vistas live".

## 13. Prompt listo para un agente de IA
Contexto: Winnie The Gym (React + Vite). `frontend/src/components/classes/ClassCalendarView.jsx` dibuja una grilla fija 08:00-22:00 con 6 días (lunes-sábado); clases fuera de rango (seed: CrossFit lunes 07:30) o en domingo no se ven. `frontend/src/pages/ClassSchedulePage.jsx` calcula las fechas de la semana con `new Date()` y `weekOffset` (solo cambia rótulos). Existe `useGymConfig()` (`GET /api/config/gym/`, `hora_apertura`/`hora_cierre`).
Tarea (TDD, tests primero con vitest + RTL, `renderWithProviders` de `frontend/src/test/test-utils.jsx`): 1) crear `frontend/src/utils/clases.js` con `buildHourRange`, `formatHora`, `getWeekDays` + `clases.test.js`; 2) ampliar `ClassCalendarView.test.jsx` (clase 07:30 visible, domingo condicional, boxeo/hiit con color propio, mobile con selector de día); 3) implementar: rango desde `useGymConfig`, domingo condicional, minutos, etiqueta de semana con ambos meses y botón "Hoy", estado de error, variante mobile (`md:hidden`/`hidden md:block`), `boxeo`/`hiit` en `constants/disciplinas.js` e `index.css`. Convenciones: Tailwind con tokens (`bg-bg-surface`, `text-text-primary`, `border-subtle`), iconos `lucide-react`, textos en voseo. Comandos: `cd frontend && npx vitest run && npm run lint` (`--max-warnings 0`). No tocar `frontend/src/hooks/useScreenWakeLock.js` ni `usePlanes.test.jsx`. Terminado: criterios de la sección 10 cumplidos y sin romper tests existentes de calendario/página.
