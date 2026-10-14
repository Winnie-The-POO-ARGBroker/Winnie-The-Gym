---
id: BK-CLS-06
titulo: Formulario de clase - edición, copia y validaciones (datos demo precargados, día/recurrencia inconsistentes, sin validación backend)
tipo: bug
roles: [administrador, recepcionista]
prioridad: P1
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-CLS-01, BK-CLS-09, BK-CLS-10]
---

# BK-CLS-06 · Formulario de clase - edición, copia y validaciones (datos demo precargados, día/recurrencia inconsistentes, sin validación backend)

## 1. Resumen
Sí existe un modo "Editar clase" (`/admin/clases/crear?id=<id>`, botón "Editar" en la vista Lista y Detalle), pero el formulario: arranca con datos de demo precargados, ignora el "Día principal" cuando hay recurrencia, ofrece solo 5 de las 7 disciplinas y sin Domingo, usa listas hardcodeadas de instructor/sala/planes que no coinciden con los datos reales, esconde los errores de validación de DRF y "Copiar de clase existente" es un atajo solo-DEV que copia siempre la primera clase. El backend no valida nada de negocio (cupo vs inscriptos, horarios, solapamientos). Editar una serie recurrente siempre modifica "toda la serie"; no hay otras opciones.

## 2. Objetivo de usuario
Como **recepcionista** quiero **crear, editar y copiar una clase con datos válidos y consistentes** para **mantener la agenda sin errores ni solapamientos**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Ruta | `frontend/src/App.jsx:86-88` | `/admin/clases/crear` con `<ProtectedRoute roles={['administrador','recepcionista']}>`; la edición reutiliza la misma ruta con `?id=` (no hay ruta `:id`). Legacy: `/clases/crear` redirige (`:94`). |
| Frontend | `frontend/src/pages/ClassSchedulePage.jsx:88-90` | `handleEditClass` -> `navigate('/admin/clases/crear?id=${cls.id}')`. El único acceso a editar es el botón "Editar" de la vista Lista y Detalle (`ClassListDetailView.jsx:307-313`); desde el calendario no hay editar. |
| Frontend | `frontend/src/pages/CreateClassPage.jsx:23-39` | Estado inicial con datos de demo: nombre "Funcional Intensivo", descripción, instructor "Carlos R.", `dias_recurrencia: ['L','X','V']`, `planes_habilitados: ['Premium','Gold']`. En alta, un click en "Publicar clase" crea una clase de ejemplo. |
| Frontend | `CreateClassPage.jsx:42-51` | En edición hace `setFormData({...existingClass})`: copia campos de solo lectura (`cupos_reservados`, `user_inscrito`, `instructor_nombre`, y `inscripciones[]` porque `useClaseDetail` usa `ClaseDetailSerializer`) y luego se reenvían en el PUT. |
| Frontend | `CreateClassPage.jsx:88-108` | `finalDia = reverseDiasMap[dias_recurrencia[0]]` sobrescribe el select "Día principal" si hay recurrencia (primer día **marcado**, no el más temprano). Si se desmarcan todos queda `recurrencia = 'Semanal - '`. |
| Frontend | `CreateClassPage.jsx:200-210` | Select de disciplina con 5 opciones (funcional, spinning, crossfit, pilates, yoga); el modelo tiene 7 (`models.py:9-15`, + boxeo, hiit). Una clase `boxeo/hiit` editada muestra la primera opción en el select aunque el estado conserva el valor. |
| Frontend | `frontend/src/constants/clases.js:5` y `constants/disciplinas.js:1-32` | `DIAS_SEMANA` sin Domingo; `DISCIPLINAS_CONFIG` solo 5 disciplinas: `boxeo/hiit` caen en la config "funcional" en calendario y lista. |
| Frontend | `CreateClassPage.jsx:282-308` | Salas "Sala A/B/C" y instructores "Carlos R./Sofia L./Pedro M./Ana T." hardcodeados. El seed usa salas "Box Principal", "Studio Ciclo Indoor", "Studio Zen" e instructores "Marcos Gómez", "Sofía Chen", "Lucas Silva" (`backend/seed_data.py:40-65`): al editar esas clases el `<select>` muestra otra opción que no coincide con el valor guardado. |
| Frontend | `CreateClassPage.jsx:385-421` | Planes hardcodeados `['Básico','Premium','Gold']` (ver BK-CLS-04). |
| Frontend | `CreateClassPage.jsx:119-140, 506-515` | "Copiar de clase existente": solo visible con `import.meta.env.DEV`; hace `GET /classes/clases/` (sin `page_size`) y clona `results[0]`; no hay selector. En producción no existe. No hay acción "Duplicar" en la lista. |
| Frontend | `frontend/src/hooks/queries/useClases.js:53-55,64-84` | `extractErrorMessage` solo lee `detail`/`message`: un 400 de DRF con `{"cupo_maximo": ["..."]}` se muestra como "Error al crear la clase". El update usa `PUT` con el payload completo. |
| Backend serializer | `backend/apps/classes/serializers.py:25-68` | Sin `validate`/`validate_*`: acepta `cupo_maximo=0`, `hora` fuera del horario del gimnasio, `dias_recurrencia` con valores arbitrarios, `dia` distinto de `dias_recurrencia[0]`, `cupo_maximo` menor a los inscriptos actuales, `planes_habilitados` con nombres inexistentes; no detecta solapamiento de sala o instructor. `recurrencia` (string) se guarda tal cual lo arma el frontend y duplica a `dias_recurrencia`. |
| Backend vista | `backend/apps/classes/views.py:63-70` | `create/update/partial_update` -> `IsReceptionistOrAdmin`. |
| Backend modelo | `backend/apps/classes/models.py:34-44` | `dia` (un solo día) + `dias_recurrencia` (JSON) coexisten; `filters.py:33-57` busca por ambos. |
| Series | (ninguna) | No existe concepto de "solo esta / esta y siguientes / toda la serie": la clase es una plantilla semanal única (`speckit/class-model-architecture-decision/explore.md` §1). Editar siempre afecta todas las semanas pasadas y futuras y a los ya inscriptos, sin aviso. |
| Tests | `frontend/src/pages/CreateClassPage.test.jsx`, `CreateClassPage.handlers.test.jsx`; backend `test_classes_crud.py`, `test_class_contract_fields.py` | Cubren el formulario con mocks y CRUD feliz; no hay tests de validaciones de negocio. |

## 4. Alcance
**Incluye:**
- Alta sin datos de demo (estado inicial vacío con placeholders) y edición sin campos de solo lectura en el payload (usar `PATCH` con solo los campos modificados).
- `dia` derivado: el "Día principal" se elimina o se deriva siempre de `dias_recurrencia` ordenado (lunes primero); `recurrencia` pasa a ser calculado en el backend.
- 7 disciplinas y 7 días en selects/config (hasta que BK-CLS-10 los vuelva configurables).
- Validaciones de backend (serializer `validate`) con mensajes por campo, y mostrar errores por campo en el formulario.
- "Copiar de clase existente" real (selector) disponible en todos los entornos + acción "Duplicar" en la lista.
- Reglas de edición de serie para el modelo actual: documentadas en UI ("Los cambios aplican a todas las fechas").

**No incluye:**
- Editar "solo esta fecha / esta y siguientes" (requiere BK-CLS-09; ver contrato `alcance` abajo como propuesta).
- Catálogo configurable de salas/instructores/disciplinas (BK-CLS-10) y rol instructor (BK-CLS-11).
- Notificar a los inscriptos cuando cambia día/hora/sala (propuesta en decisiones abiertas).

## 5. Contrato de API
- **[EXISTE]** `POST /api/classes/clases/` y `PUT/PATCH /api/classes/clases/{id}/` — `IsReceptionistOrAdmin`. Campos escribibles (`serializers.py:32-54`): `nombre, categoria, descripcion, dia, hora, duracion_min, sala, instructor, cupo_maximo, lista_espera_max, cancelacion_horas, planes_habilitados, recurrencia, dias_recurrencia, estado`. Solo lectura: `id, instructor_nombre, cupos_reservados, created_at, updated_at, user_inscrito`.
- **Validaciones [A CREAR]** (400 con errores por campo, formato DRF `{"campo": ["mensaje"]}`):
  - `cupo_maximo`: `>= 1` y `>= cupos_reservados` actuales ("El cupo no puede ser menor a los {n} inscriptos actuales.").
  - `lista_espera_max >= 0`; `duracion_min` entre 15 y 240; `cancelacion_horas` entre 0 y 168.
  - `dias_recurrencia` subconjunto de `L,M,X,J,V,S,D`, sin repetidos; `dia` se deriva del primero ordenado; `recurrencia` read-only calculada ("Semanal - L/X/V").
  - `hora` y `hora + duracion_min` dentro de `GymConfig.hora_apertura/hora_cierre` (`GET /api/config/gym/`, `backend/apps/common/models.py:12-13`).
  - Solapamiento: misma `sala` y día con rangos que se pisan -> `{"sala": ["La sala ya está ocupada de 10:00 a 11:00 por 'Yoga'."]}`; ídem `instructor` (si no es vacío).
  - `categoria` en `Clase.Categoria` (ya validado por choices).
- **[A CREAR / propuesta, depende de BK-CLS-09]** `PATCH /api/classes/series/{id}/?alcance=solo_esta|esta_y_siguientes|toda` con `fecha` de la ocurrencia.
- **[EXISTE]** `GET /api/classes/clases/{id}/` (detalle con `inscripciones`) usado para precargar el formulario.

## 6. Modelo de datos
Sin cambios obligatorios. Recomendado: tornar `recurrencia` derivada (campo calculado en serializer) y deprecar `dia` en favor de `dias_recurrencia` (migración de datos: si `dias_recurrencia` está vacío, poblarlo con la letra de `dia`). Esto converge con BK-CLS-09.

## 7. Diseño frontend
- **Rutas:** mantener `/admin/clases/crear` y agregar alias `/admin/clases/:id/editar` (opcional) con el mismo guard `<ProtectedRoute roles={['administrador','recepcionista']}>` en `frontend/src/App.jsx`; mientras tanto seguir con `?id=`.
- **Reutilizar:** `Button`, `TopBar` (`title`, `backAction`, `rightContent`), `AppLayout`, `toast` de `sonner`. Hooks: `useClaseDetail`, `useClasesMutations` (`create`, `update`), `useClasesList`.
- **Cambios:** estado inicial vacío; migrar el formulario a `react-hook-form` + `zod` (como `CancelarClaseModal`) o, como mínimo, estado de errores por campo; `useClasesMutations.update` -> `PATCH`; helper `extractFieldErrors(err)` que mapea `err.response.data` por campo.
- **Selector "Copiar de clase existente":** `Modal` con `Select` poblado por `useClasesList()`; opción "Ninguno" para no copiar nada; al elegir, precarga el formulario (sin `id`, `nombre` + " (Copia)", `cupos_reservados` no se envía). Acción "Duplicar" en `ClassListDetailView` que navega con `?copiar=<id>`.
- **Estados de UI:** loading del detalle con `Skeleton`; errores inline bajo cada input y toast resumen; éxito `toast.success('Clase "{nombre}" actualizada con éxito')` (ya existe).
- **Textos (voseo):** "Cuando guardes, los cambios aplican a todas las fechas de esta clase.", "El cupo no puede ser menor a los {n} inscriptos.", "La sala ya está ocupada ese día y horario.", "Copiar de clase existente", "Ninguno".
- **Responsive:** el formulario ya usa `grid-cols-2 sm:grid-cols-4`; a 375 px las 4 columnas de "Horario y lugar" pasan a 2; verificar que los chips de días (`w-11 h-11`) no desborden; en `< xl` la vista previa queda debajo del form.

## 8. Archivos a crear / modificar
- `backend/apps/classes/serializers.py`: `validate()` + `recurrencia` derivada; tests nuevos.
- `backend/apps/classes/services.py`: `validar_solapamiento(clase_data, instance=None)` (reutilizable).
- `frontend/src/pages/CreateClassPage.jsx`, `frontend/src/hooks/queries/useClases.js`, `frontend/src/constants/clases.js`, `frontend/src/constants/disciplinas.js` (agregar `boxeo`, `hiit` y colores CSS `--color-disciplina-boxeo/hiit` en el tema), `frontend/src/components/classes/ClassListDetailView.jsx` (acción Duplicar y filtros de categorías).
- Nuevo `frontend/src/components/classes/CopiarClaseModal.jsx` + test.

## 9. Plan de pruebas (TDD)
Backend (`backend/apps/classes/tests/test_classes_crud.py` o nuevo `test_classes_validation.py`; `APITestCase`, `make_user_factory(rol='recepcionista')`, `RefreshToken`):
- `cupo_maximo=0` -> 400 campo `cupo_maximo`; `cupo_maximo` menor a inscriptos en PATCH -> 400.
- `dias_recurrencia=['Z']` -> 400; duplicados -> 400; `recurrencia` se devuelve calculada.
- `hora=06:00` con apertura 07:00 -> 400; `hora=22:30` + 60 min con cierre 23:00 -> 400.
- Solapamiento sala/instructor mismo día -> 400; PATCH de la misma clase sin cambios -> 200 (excluye a sí misma).
- Socio -> 403.
Frontend (vitest + RTL, `renderWithProviders`; archivos `CreateClassPage.test.jsx`, `CreateClassPage.handlers.test.jsx`; `npx vitest run src/pages/CreateClassPage*.test.jsx`):
- Alta arranca con campos vacíos; no se puede publicar sin nombre.
- Edición precarga; el PATCH solo incluye campos modificados y no incluye `cupos_reservados`/`inscripciones`.
- Los 7 días y 7 disciplinas aparecen; clase `boxeo` se muestra seleccionada.
- Error 400 por campo aparece bajo el input correcto.
- "Copiar de clase existente" visible sin `DEV`, precarga la clase elegida con nombre "(Copia)".
Manual: `admin@winnie.local` -> `/admin/clases` -> Lista -> Editar una clase del seed (salas "Box Principal" etc.) y verificar que sala/instructor se ven correctos.

## 10. Criterios de aceptación
- **Dado** que abro "Nueva clase" **cuando** la página carga **entonces** ningún campo viene con datos de ejemplo.
- **Dado** una clase con 18 inscriptos **cuando** bajo el cupo a 10 **entonces** veo "El cupo no puede ser menor a los 18 inscriptos actuales." y no se guarda.
- **Dado** que marco días M/J **cuando** guardo **entonces** `dia='martes'`, `recurrencia='Semanal - M/J'` y la clase aparece en martes y jueves.
- **Dado** una clase de boxeo **cuando** la edito **entonces** el select de disciplina muestra "Boxeo".
- **Dado** una sala ocupada **cuando** creo otra clase que se pisa **entonces** el backend responde 400 con el mensaje de solapamiento.

## 11. Riesgos y decisiones abiertas
- Editar día/hora de una clase con inscriptos: ¿se avisa por email? Recomendación: sí, con template `clase_modificada` (ficha derivada) y confirmación en UI.
- ¿Se permite solapar salas (clases simultáneas en un mismo espacio grande)? Recomendación: bloquear por defecto con override de admin.
- ¿Instructor vacío permitido? Hoy el default es `''` (`models.py:38`). Recomendación: obligatorio una vez que exista catálogo.
- Semántica de "solo esta / esta y siguientes / toda la serie": requiere BK-CLS-09 (instancias por fecha). Hasta entonces, mostrar siempre el aviso "aplica a todas las fechas".

## 12. Referencias
- `speckit/class-model-architecture-decision/explore.md` §1 (puntos 1, 3, 5) y §10.
- `docs/qa/walkthrough-2026-09-22.md` (línea 121: "Editar clase" y "Copiar de clase" faltan en Figma).
- Ver también (otras áreas): BK-BUG-08 (datos hardcodeados en el formulario de clases) y BK-MOB-07 (formularios táctiles).
- Figma opcional: "Crear clase" / "Editar clase" en la página "vistas live" (Hi-Fi y Mobile).

## 13. Prompt listo para un agente de IA
Contexto: Winnie The Gym. `frontend/src/pages/CreateClassPage.jsx` sirve para alta y edición (`?id=`), pero arranca con datos demo, pisa `dia` con el primer día de `dias_recurrencia`, ofrece 5 disciplinas/6 días, listas hardcodeadas de sala/instructor/plan, `useClases.js` solo muestra `detail` y el update es `PUT`; "Copiar de clase existente" es solo `DEV` y clona `results[0]`. `backend/apps/classes/serializers.py` no valida nada.
Tarea (TDD): 1) tests backend de la sección 9 en `backend/apps/classes/tests/test_classes_validation.py` (ver fallar); implementar `validate()` en `ClaseSerializer` (cupo vs inscriptos, rangos, `dias_recurrencia` válidos, horario vs `GymConfig`, solapamiento de sala/instructor, `recurrencia` calculada). 2) tests frontend (vitest/RTL) para estado inicial vacío, PATCH solo con cambios, 7 disciplinas/días, errores por campo, `CopiarClaseModal`; luego implementar. Convenciones: toasts `sonner`, iconos `lucide-react`, hooks en `frontend/src/hooks/queries`, componentes UI en `frontend/src/components/ui` (`Modal`, `Select`, `Button`), textos en voseo. Comandos: `cd backend && pytest apps/classes -q`; `cd frontend && npx vitest run src/pages src/components/classes && npm run lint`. No tocar `backend/loadtests/*` ni los archivos modificados del dueño. Terminado: criterios de la sección 10 verdes y sin regresiones en tests existentes de `CreateClassPage*.test.jsx` y `test_classes_crud.py`.
