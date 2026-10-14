---
id: BK-CLS-04
titulo: Reglas de reserva sin validar en backend (membresía, planes habilitados, estado, concurrencia, ventana de cancelación)
tipo: bug
roles: [administrador, recepcionista, socio]
prioridad: P0
tamano: L
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-CLS-09, BK-CLS-10]
---

# BK-CLS-04 · Reglas de reserva sin validar en backend (membresía, planes habilitados, estado, concurrencia, ventana de cancelación)

## 1. Resumen
`inscribir_socio` solo controla duplicado y cupo. Cualquier socio, incluso con membresía vencida, suspendido o de baja, puede reservar cualquier clase; el campo "Planes habilitados para reservar esta clase" que el staff configura es puramente decorativo; se puede reservar una clase cancelada pasando `?incluir_canceladas=true`; el alta manual por staff saltea todas las reglas; dos reservas simultáneas pueden superar el cupo; y el corte de cancelación (`cancelacion_horas`) se calcula mal para clases con varios días. Son datos inconsistentes que hoy no hay forma de detectar.

## 2. Objetivo de usuario
Como **administrador** quiero **que solo puedan reservar los socios con membresía vigente y plan habilitado para esa clase** para **proteger el modelo de negocio (planes) y la capacidad real de las salas**.
Como **socio** quiero **mensajes claros de por qué no puedo reservar** para **saber si tengo que renovar mi plan o elegir otra clase**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend servicio | `backend/apps/classes/services.py:42-67` | `inscribir_socio`: solo chequea inscripción duplicada (`:52`) y cupo/lista de espera (`:55-61`). No chequea `socio.estado` (`members/models.py:9-12`: activo/suspendido/baja), ni `Membresia` activa/vigente (`memberships/models.py:27-49`), ni `clase.planes_habilitados`, ni `clase.estado`, ni `plan.clases_asignadas`. |
| Backend modelo | `backend/apps/classes/models.py:42` | `planes_habilitados = JSONField(default=list)`: lista de strings libres, sin FK a `PlanMembresia`. `rg planes_habilitados backend` solo aparece en modelo, serializer y tests/migraciones: nadie lo lee para validar. |
| Backend modelo | `backend/apps/memberships/models.py:12` | `PlanMembresia.clases_asignadas` existe (se carga en seeds y admin) pero ningún código de `apps/classes` lo consume: cupo mensual por plan no se aplica. |
| Backend vista | `backend/apps/classes/views.py:56-61,87-95` | `get_queryset` excluye canceladas solo si `incluir_canceladas != 'true'`; `inscribir` usa `self.get_object()`, entonces `POST /clases/{id}/inscribir/?incluir_canceladas=true` permite reservar una clase `cancelada`. |
| Backend vista | `backend/apps/classes/views.py:155-161` | `InscripcionClaseViewSet` crea inscripciones manuales (`IsReceptionistOrAdmin`) con `en_espera` y `asistio` escribibles, sin pasar por `inscribir_socio`: ignora cupo, lista de espera y planes. |
| Backend servicio | `backend/apps/classes/services.py:70-79` | `_next_clase_datetime` usa solo `clase.dia`; ignora `dias_recurrencia` (el form del frontend setea `dia` = primer día marcado, `CreateClassPage.jsx:92-99`). Para una clase L/X/V, el corte siempre se calcula contra el próximo lunes. Si hoy ya pasó la hora del día de la clase, calcula contra la semana siguiente: un socio puede "cancelar" una clase que ya ocurrió. |
| Backend servicio | `backend/apps/classes/services.py:52-67` | Sin `transaction.atomic()` ni `select_for_update`: lectura de `count()` + `create()` no atómica -> sobrecupo bajo concurrencia. |
| Backend servicio | `services.py:96-111` | `cancelar_inscripcion` elimina la fila: se pierde el historial (no hay estado "cancelada por el socio" ni auditoría de cancelaciones tardías). |
| Frontend admin | `frontend/src/pages/CreateClassPage.jsx:385-421` | Chips hardcodeados `['Básico', 'Premium', 'Gold']` para "Planes habilitados". Los planes reales del seed son "Pase Libre - Sede Central", "Pase x8 Clases" (`backend/seed_data.py:15-21`) y "Plan Demo" (`seed_demo_users.py:110`): los nombres nunca coinciden. |
| Frontend socio | `frontend/src/components/socio/ClassCard.jsx:27` | "Cancelación permitida hasta 2h antes" fijo; ignora `cancelacion_horas` de la clase. |
| Docs | `docs/qa/walkthrough-2026-09-22.md:271` | "Expired-member class restriction UI ... NON-CRITICAL" diferido: nunca se verificó qué pasa con un socio vencido. |
| Specs | `speckit/class-model-architecture-decision/explore.md` §1 puntos 2-4 | Documentan el bug de `_next_clase_datetime` y la falta de integridad de `planes_habilitados`. |

## 4. Alcance
**Incluye:**
- Validar en `inscribir_socio`: estado de la clase (`activa`), socio `activo`, membresía `activa` con `fecha_inicio <= hoy <= fecha_fin`, plan habilitado para la clase.
- Convertir `planes_habilitados` en relación real (propuesta: `ManyToManyField` a `PlanMembresia`; lista vacía = todos los planes).
- Bloqueo `select_for_update` + `transaction.atomic` para cupo y espera.
- Corregir cálculo de próxima ocurrencia considerando `dias_recurrencia` (interino hasta BK-CLS-09).
- Hacer que el alta manual por staff use el mismo servicio (con `forzar` para sobrecupo solo admin).
- Ignorar `incluir_canceladas` en acciones de escritura.
- Que el frontend use `cancelacion_horas` real y muestre el motivo del rechazo.

**No incluye:**
- Cupo mensual por plan (`clases_asignadas`) como bloqueo duro: se deja como decisión abierta (sección 11) y ficha futura.
- Sanciones por no-show (BK-CLS-12).
- Modelo de ocurrencias por fecha (BK-CLS-09), que reemplaza el cálculo interino.

## 5. Contrato de API
- **[EXISTE]** `POST /api/classes/clases/{id}/inscribir/` — `IsSocio` (rol `socio` con perfil, `views.py:87`). Sin body. `201` -> `InscripcionClaseSerializer`.
  **Errores nuevos [A CREAR]** (todos `400`, formato `{"detail": "..."}` como `ValidationError({'detail': ...})`):
  - `"La clase está cancelada."`
  - `"Tu cuenta está suspendida o dada de baja. Consultá con recepción."` (`socio.estado != 'activo'`)
  - `"No tenés una membresía vigente. Renová tu plan para reservar."`
  - `"Tu plan ({plan}) no incluye esta clase."`
  - ya existentes: `"Ya estás inscripto en esta clase."`, `"La clase y su lista de espera están completas."`.
- **[EXISTE]** `POST /api/classes/clases/{id}/cancelar/` — `IsSocio`; `400 {"detail": "Fuera del margen para cancelar. El límite es N horas antes del inicio."}`; `400 {"detail": "No tenés una inscripción vigente en esta clase."}`.
- **[EXISTE]** `POST /api/classes/inscripciones/` (staff) body `{clase, socio, asistio, en_espera}`. **[A CREAR]** validar vía el mismo servicio; `en_espera` pasa a read-only (lo decide el cupo).
- **[A CREAR]** En `ClaseSerializer`: `planes_habilitados` pasa de `list[str]` a `list[int]` (ids) + `planes_habilitados_nombres` read-only (compatibilidad con la UI actual) — ver riesgos para la migración de datos.

## 6. Modelo de datos
- `Clase.planes = ManyToManyField('memberships.PlanMembresia', blank=True, related_name='clases')` (propuesta). Migración de datos: mapear nombres existentes en `planes_habilitados` a `PlanMembresia.nombre`; los que no matchean se descartan y se registran en el log de la migración. Mantener el JSON hasta el siguiente release.
- Opcional: `InscripcionClase.cancelada_at`, `estado` (`confirmada|espera|cancelada`) para conservar historial en vez de borrar (decisión abierta; depende de BK-CLS-09/12).
- Índice sugerido: `InscripcionClase(clase, en_espera)`.

## 7. Diseño frontend
- **Ruta/guard:** `/socio/clases` usa `<ProtectedRoute roles={['administrador','socio']}>` (`frontend/src/App.jsx:131`). Nota: `administrador` entra a la pantalla pero `inscribir` es `IsSocio`: recibe 403 al reservar; recomendación: ocultar los botones de reserva si `rol !== 'socio'`.
- **Mutaciones:** `useInscripcionesMutations` (`frontend/src/hooks/queries/useInscripciones.js`) ya muestra `err.response.data.detail` en `toast.error` -> los mensajes nuevos llegan solos.
- **CreateClassPage:** reemplazar los chips fijos por la lista real de planes (`GET /api/memberships/planes/` - verificar la ruta exacta en `backend/apps/memberships/urls.py` y el hook existente en `frontend/src/hooks/queries/usePlanes.js`) y enviar ids.
- **ClassCard:** `Cancelación permitida hasta {cancelacionHoras}h antes` (agregar `cancelacionHoras: c.cancelacion_horas` en `mapClase`, `ClasesPage.jsx:24-45`).
- **Estados:** error inline en la tarjeta además del toast; si la membresía venció mostrar CTA "Renovar plan" hacia `/socio/checkout`.
- **Textos (voseo):** "Tu plan no incluye esta clase.", "Renová tu membresía para reservar.", "Ya no podés cancelar: el límite era {n} h antes."
- **Responsive:** tarjetas ya apiladas en una columna (`ClasesPage.jsx:255`); el mensaje de error debe caber en 375 px sin truncarse.

## 8. Archivos a crear / modificar
- `backend/apps/classes/services.py`: `inscribir_socio` (validaciones + atomic), `_next_clase_datetime` (usar `dias_recurrencia`), nuevo helper `plan_activo_del_socio(socio)`.
- `backend/apps/classes/views.py`: `inscribir`/`cancelar` ignoran `incluir_canceladas`; `InscripcionClaseViewSet.perform_create` delega al servicio.
- `backend/apps/classes/models.py` + migraciones `0011/0012` para `planes`.
- `backend/apps/classes/serializers.py`.
- `frontend/src/pages/CreateClassPage.jsx`, `frontend/src/pages/socio/ClasesPage.jsx`, `frontend/src/components/socio/ClassCard.jsx`.
- Tests (sección 9).

## 9. Plan de pruebas (TDD)
Backend (`backend/apps/classes/tests/`; patrón de `test_classes_services.py`: pytest con `make_socio`, y de `test_inscribir_flow.py`: `APITestCase`; fixtures `make_plan`, `make_membresia` en `backend/conftest.py:82-113`; correr `cd backend && pytest apps/classes -q`):
- socio sin membresía -> 400 mensaje de renovar; con membresía `vencida`/`suspendida`/`cancelada` -> 400; con `fecha_fin` ayer -> 400.
- socio `suspendido`/`baja` -> 400.
- clase con planes `[A]` y socio con plan `B` -> 400; plan `A` -> 201; lista vacía -> 201 para cualquier plan.
- clase `cancelada` + `?incluir_canceladas=true` -> 400/404 (no 201).
- alta manual por staff respeta cupo (sin `forzar`).
- concurrencia: 2 hilos con 1 cupo -> exactamente 1 confirmado y 1 en espera (`TransactionTestCase`).
- `cancelar_inscripcion` con clase L/X/V: el corte se calcula contra la próxima ocurrencia real (miércoles) y no el lunes; no permite cancelar si la ocurrencia de hoy ya empezó.
- permisos: recepcionista/admin -> 403 en `inscribir`.
Frontend (`frontend/src/pages/socio/ClasesPage.test.jsx`, `ClassCard.test.jsx`, `CreateClassPage.test.jsx`; vitest + RTL): `ClassCard` muestra `cancelacionHoras`; toast de error con el `detail`; `CreateClassPage` renderiza planes devueltos por el hook y envía ids.
Manual: con `socio.vencido@winnie.local` (seed demo) intentar reservar -> debe fallar con mensaje; con `socio.activo@winnie.local` reservar una clase de un plan habilitado.

## 10. Criterios de aceptación
- **Dado** un socio con membresía vencida **cuando** reserva una clase **entonces** recibe 400 "No tenés una membresía vigente..." y no se crea inscripción.
- **Dado** una clase habilitada solo para el plan "Pase Libre" **cuando** reserva un socio con "Pase x8" **entonces** 400 "Tu plan (Pase x8 Clases) no incluye esta clase.".
- **Dado** 1 cupo libre **cuando** dos socios reservan a la vez **entonces** uno queda confirmado y el otro en espera, nunca 2 confirmados.
- **Dado** una clase cancelada **cuando** se intenta reservar con cualquier query param **entonces** se rechaza.
- **Dado** una clase L/X/V **cuando** el socio cancela un martes **entonces** el límite se calcula contra el miércoles.

## 11. Riesgos y decisiones abiertas
- ¿Lista vacía de planes significa "todos" o "ninguno"? Recomendación: "todos" (compatibilidad con clases creadas sin elegir planes; hoy el default del modelo es `[]`).
- ¿`clases_asignadas` (por plan) se aplica como cupo mensual de reservas? No hay definición de producto: `0` en `Plan Demo` y `12`/`10` en seeds de carga. Recomendación: preguntar al dueño; implementarlo en ficha aparte.
- ¿Un socio con membresía `pendiente_pago`? El enum existe pero está "reserved - never writable". Recomendación: tratar como no vigente.
- ¿Se conserva historial de cancelaciones? Recomendación: sí, con `estado` en `InscripcionClase`, necesario para BK-CLS-12.
- Migración de `planes_habilitados` existente: la mayoría de los nombres de la UI ("Básico/Premium/Gold") no existe como plan real; se pierden. Avisar al dueño.

## 12. Referencias
- `speckit/class-model-architecture-decision/explore.md` §1 (puntos 2, 3, 4) y §10 (preguntas 4 y 8).
- `docs/qa/walkthrough-2026-09-22.md:271`.
- Commit `11b0297` (el mensaje habla de "plan validation" pero el código actual no valida planes al reservar).
- Figma opcional: módulo Clases/Socio - reserva.

## 13. Prompt listo para un agente de IA
Contexto: Winnie The Gym, Django REST. `backend/apps/classes/services.py::inscribir_socio` solo valida duplicado y cupo. Faltan: clase `activa`, `Socio.estado == 'activo'`, `Membresia` (`backend/apps/memberships/models.py`) con `estado='activa'` y fechas vigentes, plan habilitado (`Clase.planes_habilitados` es un JSON de nombres libres), atomicidad (`transaction.atomic` + `select_for_update`), y `_next_clase_datetime` ignora `dias_recurrencia`. `ClaseViewSet.get_queryset` permite `?incluir_canceladas=true` también en acciones de escritura y `InscripcionClaseViewSet` crea inscripciones sin pasar por el servicio.
Tarea (TDD): escribir primero los tests de la sección 9 en `backend/apps/classes/tests/` (usar `make_plan`, `make_membresia`, `make_socio` de `backend/conftest.py`), verlos fallar y luego implementar: validaciones con `ValidationError({'detail': '<mensaje en español rioplatense>'})`, relación M2M `planes` a `PlanMembresia` con migración de datos desde el JSON (lista vacía = todos), corrección de `_next_clase_datetime` para múltiples días, bloqueo transaccional, y que `InscripcionClaseViewSet.perform_create` use el servicio. Frontend: `CreateClassPage.jsx` debe listar planes reales y enviar ids; `ClasesPage.jsx`/`ClassCard.jsx` deben usar `cancelacion_horas`. Comandos: `cd backend && pytest apps/classes -q`; `cd frontend && npx vitest run src/pages src/components/socio && npm run lint`. No tocar `backend/loadtests/*`. Terminado: todos los criterios de la sección 10 verdes, cobertura de `apps/classes` no baja de 80%, sin romper `test_inscribir_flow.py` ni `test_cancel_flow.py` (ajustar fixtures para que los socios de test tengan membresía activa).
