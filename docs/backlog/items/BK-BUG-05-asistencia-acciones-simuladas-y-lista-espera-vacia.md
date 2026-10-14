---
id: BK-BUG-05
titulo: AttendancePage: "Habilitar" y "Cerrar asistencia" son simulados, la lista de espera muestra datos vacíos y el plan está fijo
tipo: bug
roles: [administrador, recepcionista]
prioridad: P1
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-BUG-04, BK-CLS-01]
---

# BK-BUG-05 · Acciones simuladas en la terminal de asistencia

## 1. Resumen
Una vez que se llega a la página (ver BK-BUG-04), varias acciones solo muestran toasts de éxito sin llamar al backend ("Habilitar" de la lista de espera, "Cerrar asistencia"), la lista de espera lee campos que el serializer no devuelve (`nombre`, `plan`), la columna "DNI" muestra el número de socio y la columna "Plan" siempre dice "Pase". El usuario cree que guardó/promovió cuando no pasó nada.

## 2. Objetivo de usuario
Como **recepcionista** quiero **marcar asistencia, habilitar gente de la lista de espera y cerrar la asistencia con resultados reales** para **tener registro confiable de quién fue a la clase**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Frontend página | `frontend/src/pages/AttendancePage.jsx:35-44` | `handlePromoteFromWaitingList`: solo `toast.success(\`${waitingPerson.socio_nombre} habilitado e inscripto\`)` + `fetchAttendees()`; el `try/catch` no envuelve ninguna llamada de red. Además usa `socio_nombre` pero la lista renderiza `person.nombre` |
| Frontend página | `frontend/src/pages/AttendancePage.jsx:46-49` | `handleCloseAttendance`: `toast.success('Asistencia guardada y cerrada correctamente'); navigate('/clases')` — no persiste nada (cada toggle ya hace PATCH) y navega a una ruta legacy |
| Frontend página | `frontend/src/pages/AttendancePage.jsx:160-167` | Columna cabecera "DNI" pero el valor es `att.socio_numero` (número de socio) |
| Frontend página | `frontend/src/pages/AttendancePage.jsx:168-175` | Columna "Plan": literal `Pase` para todos |
| Frontend página | `frontend/src/pages/AttendancePage.jsx:58` | CSV de exportación con `"Pase"` fijo como plan |
| Frontend página | `frontend/src/pages/AttendancePage.jsx:308-329` (bloque lista de espera) | `Avatar name={person.nombre}`, `{person.nombre}`, `{person.plan}` → `undefined` (el serializer expone `socio_nombre`/`socio_apellido`, no `nombre` ni `plan`) |
| Frontend página | `frontend/src/pages/AttendancePage.jsx:72-76,152` | Cálculo de presentes/ausentes/tasa OK; `cls?.cupo_maximo || 20` usa 20 como fallback fijo |
| Backend serializer | `backend/apps/classes/serializers.py:5-24` | `InscripcionClaseSerializer.fields = ('id','clase','socio','socio_nombre','socio_apellido','socio_numero','asistio','en_espera','created_at')`. **No existen** `dni`, `plan`, `nombre` |
| Backend vista | `backend/apps/classes/views.py:155-161` | `InscripcionClaseViewSet` (`ModelViewSet`, `IsReceptionistOrAdmin`): `PATCH /api/classes/inscripciones/{id}/` actualiza `asistio` y (por ser ModelViewSet con el serializer) también `en_espera` |
| Frontend hook | `frontend/src/hooks/queries/useClassAttendees.js:31-53` | `toggleStatus` hace `PATCH /classes/inscripciones/{id}/ {asistio}` (real, con toast de error) |
| Frontend test | `frontend/src/pages/AttendancePage.test.jsx:136-149` | Fija como esperado el toast falso y `navigate('/clases')` |

Promoción real desde lista de espera: no verificado si existe lógica de promoción automática al cancelar (ver `backend/apps/classes/` `cancelar`, `views.py:114`); un `PATCH {en_espera:false}` sí está permitido por el serializer, pero sin chequear cupo.

## 4. Alcance
**Incluye:** quitar/implementar "Habilitar" (PATCH `en_espera:false` con validación de cupo en backend), corregir nombres de campos de la lista de espera, columna "Nº socio" honesta, quitar "Pase" fijo (mostrar plan solo si el backend lo devuelve), "Cerrar asistencia" → navegar a `/admin/clases` sin toast engañoso (o implementar cierre real si el negocio lo define).
**No incluye:** reglas de negocio de cierre de asistencia, notificaciones, reportes de asistencia (BK-CLS-xx / BK-FIN-xx).

## 5. Contrato de API
**[EXISTE] `PATCH /api/classes/inscripciones/{id}/`** body `{asistio: true|false|null}` o `{en_espera: false}`; permisos `IsReceptionistOrAdmin`; response `InscripcionClaseSerializer`.
**[A MODIFICAR/CREAR — propuesta]** campos de solo lectura `socio_dni` (`source='socio.dni'`) y `plan_nombre` (membresía activa del socio) en `InscripcionClaseSerializer`; validación en `update` para que `en_espera: false` falle con 400 `{"detail":"La clase no tiene cupo disponible."}` si `cupos_reservados >= cupo_maximo`. Alternativa: endpoint dedicado `POST /api/classes/inscripciones/{id}/promover/` [A CREAR]. Decisión en 11.

## 6. Modelo de datos
Sin cambios (campos `asistio` y `en_espera` ya existen en `InscripcionClase`; no verificado el nombre exacto de constraints).

## 7. Diseño frontend
- **Ruta/guard:** `/admin/clases/asistencia`, `roles=['administrador','recepcionista']` (`App.jsx:89`).
- **Hook nuevo:** en `hooks/queries/useClassAttendees.js` agregar `promoteMutation = useMutation({ mutationFn: (id) => api.patch(\`/classes/inscripciones/${id}/\`, { en_espera: false }), onSuccess: invalidate byClass + toast.success('<nombre> fue inscripto a la clase'), onError: toast.error(detail) })` siguiendo el patrón de `toggleMutation` (l.31-45). Exponer `promoteFromWaitingList`.
- **Página:** usar `person.socio_nombre`/`socio_apellido` en la lista de espera; reemplazar `Pase` por `att.plan_nombre ?? '—'`; renombrar la cabecera a "Nº SOCIO" si no se agrega `socio_dni`; `Cerrar asistencia` → `navigate('/admin/clases')` (sin toast de éxito inventado) o botón "Volver".
- **Estados:** loading (Skeleton ya existe), vacío (EmptyState ya existe), error en mutaciones (toast), éxito real tras confirmación del backend.
- **Textos:** "Habilitar" → toast "<Nombre> fue inscripto a la clase."; cupo lleno → "La clase no tiene cupo disponible."
- **Responsive:** la grilla `grid-cols-[3fr_2fr_2fr_220px]` no colapsa a 375 px (desborda); fuera de alcance, ver BK-MOB-xx.

## 8. Archivos a crear / modificar
- `frontend/src/pages/AttendancePage.jsx`, `frontend/src/hooks/queries/useClassAttendees.js`, `frontend/src/pages/AttendancePage.test.jsx`.
- `backend/apps/classes/serializers.py` (campos de lectura), `backend/apps/classes/views.py`/`serializers.py` (validación de cupo), `backend/apps/classes/tests/`.

## 9. Plan de pruebas (TDD)
Backend (pytest; `auth_client`, `make_socio`, `make_plan`, `make_membresia` de `backend/conftest.py`; `cd backend && pytest apps/classes -q`): PATCH `en_espera:false` con cupo libre → 200; con cupo lleno → 400; `socio` → 403; serializer incluye `socio_dni`/`plan_nombre` (si se aprueba).
Frontend (vitest + RTL, mocks de hooks como en `AttendancePage.test.jsx`): lista de espera muestra nombre real (`socio_nombre socio_apellido`); "Habilitar" llama a la mutación (no hay toast hasta `onSuccess`); "Cerrar asistencia" ya no muestra el toast falso; CSV no contiene "Pase" fijo. `cd frontend && npx vitest run src/pages/AttendancePage.test.jsx`.
Manual: clase con cupo lleno y un socio en espera → cancelar una inscripción → "Habilitar".

## 10. Criterios de aceptación
- **Dado** un socio en lista de espera **cuando** se pulsa "Habilitar" y hay cupo **entonces** pasa a confirmados y la lista se actualiza desde el backend.
- **Dado** que no hay cupo **entonces** se muestra el error del backend y nada cambia.
- **Dado** la lista de espera **entonces** cada fila muestra nombre y apellido reales.
- **Dado** "Cerrar asistencia" **entonces** no se anuncia un guardado que no ocurrió.

## 11. Riesgos y decisiones abiertas
1. ¿Existe "cierre" de asistencia como estado de la clase? Hoy no (no hay campo). Recomendación: eliminar el botón o renombrarlo a "Volver".
2. Promoción: ¿endpoint dedicado o PATCH? Recomendación: endpoint dedicado con validación de cupo transaccional (evita race condition de dos recepcionistas).
3. Revisar si ya hay promoción automática al cancelar (no verificado).

## 12. Referencias
`backend/apps/classes/views.py:87-150` (inscribir/cancelar). Figma (opcional): "vistas live", Clases → Asistencia.

## 13. Prompt listo para un agente de IA
> Repo Winnie The Gym. En `frontend/src/pages/AttendancePage.jsx` hay acciones simuladas: `handlePromoteFromWaitingList` (l.35-44) y `handleCloseAttendance` (l.46-49) solo muestran toasts; la lista de espera usa `person.nombre`/`person.plan` que el serializer (`backend/apps/classes/serializers.py:5-24`) no devuelve (devuelve `socio_nombre`, `socio_apellido`); la columna "Plan" dice "Pase" fijo. TDD: primero tests backend en `backend/apps/classes/tests/` (PATCH `en_espera:false` con/sin cupo, permisos) y tests frontend en `AttendancePage.test.jsx` (nombres reales, mutación real de promoción, sin toast falso de cierre). Luego implementá `promoteMutation` en `useClassAttendees.js` (copiá el patrón de `toggleMutation`), validación de cupo en backend, corregí los campos de la lista de espera y la columna "Plan"/"Nº socio", y reemplazá el cierre simulado por navegación a `/admin/clases`. Confirmá la decisión 11.1/11.2 con el dueño del producto si podés. Español rioplatense en la UI. Terminado cuando `cd backend && pytest apps/classes -q` y `cd frontend && npx vitest run && npm run lint` pasan. Sin commits.
