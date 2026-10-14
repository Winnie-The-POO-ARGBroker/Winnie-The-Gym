---
id: BK-SOC-01
titulo: El "Alta en Recepción" no puede crear socios (403 para recepcionista, teléfono faltante, plan y cobro de mentira)
tipo: bug
roles: [recepcionista, administrador]
prioridad: P0
tamano: L
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-FIN-01]   # id probable: cobro manual / activación de membresía
---

# BK-SOC-01 · El "Alta en Recepción" no puede crear socios

## 1. Resumen
La pestaña "Alta en Recepción" de `/recepcion/socios` es una maqueta: el recepcionista (rol para el que está pensada) recibe **403** porque `POST /api/members/socios/` es solo-admin; aun siendo admin, el body no incluye `telefono` (campo obligatorio del modelo) y el plan/cuota/cobro/renovación son valores hardcodeados que el backend ignora. Nunca se crea membresía ni cobro, y el texto promete "generar QR y enviarlo al email" (no ocurre). Es el flujo central de la HU03 / US03 del plan de pruebas.

## 2. Objetivo de usuario
Como **recepcionista** quiero **dar de alta a un socio nuevo con sus datos, el plan elegido, el apto médico (opcional) y registrar el primer cobro en una sola pantalla** para **dejarlo habilitado para ingresar sin pedirle nada a un administrador**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend permisos | `backend/apps/members/views.py:43-48` | `get_permissions`: `create/update/partial_update/destroy/dar_baja` → `IsAdminOnly()`; el resto (`list`, `retrieve`, `stats`) → `IsReceptionistOrAdmin()`. **El recepcionista no puede crear.** |
| Backend tests | `backend/apps/members/tests/test_socios_views.py:53,102` | Solo existen `test_create_socio_admin_201` y `test_socio_role_create_403`; **no hay test de recepcionista creando** (ni de que reciba 403). |
| Spec | `openspec/changes/socios-membresias/spec.md:45-47` y `docs/qa/plan-de-pruebas.md:88` | La spec dice "Admin and recepcionista MUST be able to list, create…"; US03: "como recepcionista, quiero registrar nuevos socios y subir su certificado médico". El código contradice la spec. |
| Backend modelo | `backend/apps/members/models.py:22` | `telefono = CharField(max_length=30)` sin `blank=True` → obligatorio en `SocioSerializer` (migración `0001_initial.py:21`). |
| Backend serializer | `backend/apps/members/serializers.py:11-38,61-88` | Campos: `id, usuario, email(write_only), numero_socio, nombre, apellido, dni, telefono, certificado_medico_url, estado, fecha_baja, observaciones, created_at`. Cualquier otro campo (`plan`, `cuota`, `cobro`, `renovacion`) se **ignora**. Si no viene `email` se crea el usuario `socio_<dni>@winniegym.com` (línea 66) y no se manda activación (`services.py:33-39`). |
| Frontend ruta | `frontend/src/App.jsx:123` | `/recepcion/socios` con `<ProtectedRoute roles={['administrador','recepcionista']}>`. Sidebar recepcionista: `components/layout/Sidebar.jsx:36`. |
| Frontend página | `frontend/src/pages/recepcion/GestionSociosPage.jsx:51-75` | `useForm` + `zodResolver(gestionSociosSchema)`; `onSubmit` llama `create.mutateAsync(data)` (`useSocioMutations().create`) con lo que devuelve zod. |
| Frontend schema | `frontend/src/pages/recepcion/gestionSocios.schema.js:3-25` | `z.object({nombre, apellido, dni(min7,max12), email(obligatorio), plan: enum['Básico','Premium','Gold'], cuota:string, cobro:string, renovacion: enum})`. **No tiene `telefono`**; zod (por defecto `strip`) descarta `fechaNacimiento`, `genero`, `telefono`, `venceMedico`, `observaciones` que las cards setean con `setValue`. Defaults: `plan:'Premium'`, `cuota:'$ 12.000'`, `cobro:'01/06'`. |
| Frontend cards | `frontend/src/components/recepcion/DatosPersonalesCard.jsx:18-28` | Inputs `FECHA NACIMIENTO` (`fechaNacimiento`), `GÉNERO` (`<option>` sin `value`, valor inicial `''`), `TELÉFONO` (`telefono`): ninguno existe en el backend ni en el schema. |
| Frontend cards | `frontend/src/components/recepcion/PlanPagoCard.jsx:12-45` | Plan `Premium · $ 12.000/mes` / `Básico · $ 8.000/mes` **hardcodeados** (no vienen de `GET /api/memberships/planes/`); "FECHA DE COBRO" y "RENOVACIÓN Automática mensual" no tienen respaldo (no existe autorrenovación ni débito recurrente en el backend). |
| Frontend cards | `frontend/src/pages/recepcion/GestionSociosPage.jsx:260` + `components/recepcion/SaludCard.jsx:7-30,108-115` | `<SaludCard onFileChange={() => {}} onChange={onChange} />`: el archivo seleccionado se descarta; `VENCE` y `OBSERVACIONES` escriben a `venceMedico`/`observaciones` que zod elimina. |
| Frontend sidebar | `frontend/src/components/recepcion/SocioResumenSidebar.jsx:50-57` | Botón "Crear y generar QR" y texto "Al crear se genera el QR de acceso y se envía al email del socio": **falso**; el QR es dinámico (30 s, `GET /api/access/qr/generate/`) y lo genera el propio socio; lo que se envía es el email de bienvenida (`backend/apps/common/signals.py:14-35`) y, si hay email real, el de activación (`services.py:23-45`). |
| Frontend hook | `frontend/src/hooks/queries/usePagos.js:57-62` | `useCobrarManualMutation` ya existe (consume `POST /api/payments/cobros-manuales/`, usado por `CobroManualPage`). |

Verificación en vivo contra la app: **No verificado** (backend local no estaba levantado al auditar). Las tres causas del fallo se verificaron por lectura de código (permiso, campo obligatorio, schema zod).

## 4. Alcance
**Incluye:**
- Permitir `create` de socio al recepcionista (backend) y test que lo fije.
- Reescribir el formulario de la pestaña "Alta en Recepción" para que envíe el contrato real: `nombre, apellido, dni, telefono, email(opcional), observaciones`.
- Plan elegido desde `GET /api/memberships/planes/` (solo `activo=true`), monto prellenado con `plan.precio` y editable (igual que `CobroManualPage`).
- Secuencia: crear socio → (opcional) subir apto → registrar primer cobro manual con `POST /api/payments/cobros-manuales/` (activa membresía).
- Resumen lateral con datos reales y texto de ayuda veraz.
- Manejo de falla parcial (socio creado pero cobro/apto falló).

**No incluye:**
- Campos nuevos del modelo (nacimiento, género, emergencia) → `BK-SOC-10`.
- Vigencia del apto (`VENCE`) → `BK-SOC-06`.
- Renovación automática / débito recurrente (no existe en backend; se elimina el control del formulario).
- MercadoPago en recepción (el cobro es manual; la contingencia MP es del área FIN).

## 5. Contrato de API
**[EXISTE] `POST /api/members/socios/`** — hoy `IsAdminOnly`; **cambio: `IsReceptionistOrAdmin` solo para `create`** (mantener `update/partial_update/destroy/dar_baja` en `IsAdminOnly`; ver decisión abierta).
Request JSON:
```json
{"nombre":"Ana","apellido":"González","dni":"30111222","telefono":"1155550000","email":"ana@mail.com","observaciones":""}
```
`telefono` es obligatorio (no vacío). `email` opcional: si falta, se crea `socio_<dni>@winniegym.com` sin activación. Response 201: `SocioSerializer` (`id, usuario, numero_socio, nombre, apellido, dni, telefono, certificado_medico_url, estado, fecha_baja, observaciones, created_at`; **no devuelve `email`**, ver BK-SOC-07).
Errores: `400 {"dni":["Ya existe socio con este dni."]}` (UniqueValidator DRF; el texto exacto depende de la traducción `es-ar`), `400 {"email":["Este email pertenece a un usuario de administración o staff."]}` / `["Este email ya está asociado a otro socio."]`, `403 {"detail":"..."}` (rol socio), `401`.

**[EXISTE] `POST /api/members/socios/{id}/certificado-medico/`** — `IsAdminOrOwnSocio` (recepcionista permitido). `multipart/form-data` con `archivo` (PDF/JPG/PNG ≤ 5 MB). Response 200: `SocioSerializer`. Errores 400 `{"archivo":["El archivo supera el tamaño máximo permitido (5 MB)."]}` etc. (`services.py:59-81`).

**[EXISTE] `GET /api/memberships/planes/`** — `IsAuthenticated`; filtro `?activo=true`; campos `id, nombre, duracion_dias, precio, clases_asignadas, activo, es_popular, socios_activos` (`memberships/serializers.py:18`). Paginado (page_size 10): usar el hook existente `usePlanesQuery` (`hooks/queries/usePlanesAdmin`) que ya resuelve esto en `CheckoutPage`.

**[EXISTE] `POST /api/payments/cobros-manuales/`** — `IsReceptionistOrAdmin`. Request: `{"socio_id":int,"plan_id":int,"monto":"12000.00","observacion":"opcional ≤200"}`. Response 201: `PagoSerializer` (`id, socio, socio_nombre, plan, plan_nombre, membresia, monto, moneda, metodo, estado, ..., paid_at, created_at`). Crea `Pago` aprobado + activa membresía + email de confirmación (`payments/services.py:149-189`).

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Ruta y guard:** sin cambios (`App.jsx:123`, `ProtectedRoute roles={['administrador','recepcionista']}`).
- **Convenciones del repo:** queries/mutations en `frontend/src/hooks/queries/*` con `useQuery/useMutation` de `@tanstack/react-query` v5 (usar `isPending`, no `isLoading` en mutaciones); cliente HTTP `frontend/src/services/api.js` (axios, Bearer, refresh automático); servicios en `frontend/src/services/*Service.js` (`sociosService.js`); toasts con `sonner`; íconos `lucide-react`; formularios `react-hook-form` + `zod` + `@hookform/resolvers/zod` (ya usado en esta página); componentes UI en `frontend/src/components/ui/` (`Card, Input, Select, Button, Modal, Badge`).
- **Reutilizar:** `GestionSociosPage.jsx` (pestaña `nuevo`), `DatosPersonalesCard` (props `formData, onChange`), `PlanPagoCard`, `SaludCard` (props `onFileChange(file|null)`, `onChange`, `currentCertificateUrl`), `SocioResumenSidebar` (props `nombre, apellido, dni, plan, cuota, cobro, renovacion, onSubmit`), `useSocioMutations().create/certificado` (`useSociosData.js:90-165`), `useCobrarManualMutation` (`usePagos.js:57`), `usePlanesQuery`.
- **Cambios:**
  1. `gestionSocios.schema.js`: `telefono: z.string().trim().min(8,'Teléfono inválido')`, `email` opcional (`.email().optional().or(z.literal(''))`), `planId: z.number({required_error:'Elegí un plan'})`, `monto: z.coerce.number().positive()`, `observaciones` opcional; eliminar `cobro` y `renovacion`; DNI con la misma regex que `CompleteProfilePage` (`/^\d{7,8}$/`) — alinear con BK-SOC-07.
  2. `DatosPersonalesCard`: sacar `FECHA NACIMIENTO`/`GÉNERO` hasta que exista BK-SOC-10; agregar `value`/`placeholder` correcto a `TELÉFONO`; mostrar errores por campo (hoy solo hay un bloque genérico arriba, `GestionSociosPage.jsx:246-254`).
  3. `PlanPagoCard`: `Select` alimentado por planes activos (`value=plan.id`, label `"{nombre} · ${precio}"`); campo `Monto` numérico prellenado y editable; quitar "Fecha de cobro" y "Renovación".
  4. `SaludCard`: guardar el `File` en estado del padre (`onFileChange`), ocultar `VENCE` hasta BK-SOC-06.
  5. `onSubmit`: `create` → si hay archivo `certificado` → `cobrarManual`. Si falla un paso posterior al alta, no hacer `reset()`: mostrar toast con el paso fallido y botón "Ir a cobro manual" (`/recepcion/cobros`) / "Reintentar subida".
  6. Botón y texto del sidebar: "Crear socio y cobrar" / "Se envía un email de bienvenida y, si cargás un email real, el link para crear su contraseña. El socio genera su QR desde la app." (sin prometer QR).
- **Estados de UI:** botón con `loading` mientras corre la secuencia (usar `loading` de `components/ui/Button`); error inline por campo + toast con el mensaje del backend (`extractErrorMessage` en `useSociosData.js:28`); éxito: `toast.success('Socio creado y cobro registrado')` y volver a la pestaña "listado".
- **Textos:** "Teléfono (obligatorio)", "Plan", "Monto cobrado", "Apto médico (opcional)", "Observaciones / lesiones".
- **Responsive:** el grid `lg:grid-cols-3` ya colapsa a 1 columna a 375 px; verificar que el sidebar sticky (`lg:sticky`) no tape el botón en mobile (el botón de submit debe quedar al final del flujo).

## 8. Archivos a crear / modificar
- `backend/apps/members/views.py` — `create` → `IsReceptionistOrAdmin` (líneas 43-48).
- `backend/apps/members/tests/test_socios_views.py` — nuevos tests (ver §9).
- `frontend/src/pages/recepcion/gestionSocios.schema.js` — schema nuevo.
- `frontend/src/pages/recepcion/GestionSociosPage.jsx` — `onSubmit` secuencial, estado del archivo, errores por campo.
- `frontend/src/components/recepcion/{DatosPersonalesCard,PlanPagoCard,SaludCard,SocioResumenSidebar}.jsx` — ver §7.
- Tests existentes a actualizar: `DatosPersonalesCard.test.jsx`, `PlanPagoCard.test.jsx`, `SaludCard.test.jsx`, `SocioResumenSidebar.test.jsx` (en la misma carpeta) y un nuevo `GestionSociosPage.test.jsx`.

## 9. Plan de pruebas (TDD)
**Convención backend:** `APITestCase` + `make_user_factory`/`make_socio_factory` (`backend/conftest.py:23-46`), helper `_auth_client` por archivo (JWT con `RefreshToken.for_user`). Comando: `cd backend && pytest -q apps/members/tests/test_socios_views.py` (requiere Postgres con la sequence `socio_numero_seq`, Redis y Mongo: en CI vía `services:`; local `docker compose exec backend pytest -q ...`; `pytest.ini` exige 80 % de cobertura solo en la corrida completa).
Casos (escribir primero):
- `test_create_socio_recepcionista_201`: recepcionista crea con `telefono`; 201 y `numero_socio` `S-xxxxx`.
- `test_create_socio_sin_telefono_400`: body sin `telefono` → 400 `{"telefono":[...]}`.
- `test_update_socio_recepcionista_403` y `test_dar_baja_recepcionista_403` (se mantienen admin-only).
- `test_create_socio_dni_duplicado_400`, `test_create_socio_socio_role_403` (ya existe, mantener).
**Convención frontend:** Vitest 4 + RTL + `@testing-library/jest-dom` (`frontend/setupTests.js`), `vi.mock` de hooks/servicios; tests colocados junto al componente. Comando: `cd frontend && npx vitest run src/pages/recepcion src/components/recepcion`; lint: `npm run lint` (CI usa `--max-warnings 0`).
- `GestionSociosPage.test.jsx`: completar formulario válido → se llama `create` con `{nombre,apellido,dni,telefono,email,observaciones}` (sin `plan/cuota/cobro/renovacion`), luego `cobrarManual` con `{socio_id, plan_id, monto}`.
- Con archivo adjunto: se llama `certificado` entre ambos pasos.
- Falla de cobro tras alta exitosa: no se resetea el form, aparece el aviso con link a `/recepcion/cobros`.
- Validación: sin teléfono / sin plan muestra error por campo.
- Los planes se renderizan desde el mock de `usePlanesQuery`, no hay texto "$ 12.000" hardcodeado.
**Manual (navegador):** login `recepcion@winnie.local` (cuenta de `seed_demo_users`) → `/recepcion/socios` → "Alta en Recepción" → crear socio con email real de prueba → verificar en "Listado" el nuevo socio y en `/recepcion/cobros` el pago aprobado; login como ese socio (tras activar contraseña) → `/socio/credencial` muestra QR.

## 10. Criterios de aceptación
- **Dado** un recepcionista autenticado **cuando** envía `POST /api/members/socios/` con datos válidos **entonces** recibe 201 (hoy 403).
- **Dado** el formulario de alta **cuando** el recepcionista elige un plan activo y confirma **entonces** se crea el socio, se registra un `Pago` manual aprobado y el socio queda con `membresia_activa` (ver `/api/memberships/me/` con su sesión).
- **Dado** que el alta tuvo éxito pero el cobro falló **cuando** se muestra el error **entonces** el socio no se duplica al reintentar y hay un atajo a `/recepcion/cobros`.
- **Dado** el formulario **cuando** falta teléfono o plan **entonces** se muestra error inline sin llamar al backend.
- El texto del sidebar no promete envío de QR por email.

## 11. Riesgos y decisiones abiertas
1. ¿El recepcionista puede crear **pero no editar** socios? (Recomendado por defecto: crear sí, editar/baja solo admin, coherente con `openspec` que habla de "partially update" para ambos → confirmar si también debe poder `partial_update`.)
2. ¿Secuencia en cliente o endpoint compuesto atómico `POST /api/members/socios/alta-completa/`? (Recomendado: secuencia en cliente + atajo de recuperación; endpoint compuesto solo si se ve fallo parcial en uso real.)
3. ¿Qué hacer con "Fecha de cobro" y "Renovación automática"? (Recomendado: quitarlos; no hay modelo.)
4. ¿Teléfono obligatorio en alta pero opcional en registro (`RegisterPage.jsx:19` lo declara opcional y luego `CompleteProfile` lo exige)? Ver BK-SOC-07.
5. Si no se carga email real el socio no podrá iniciar sesión nunca (usuario `socio_<dni>@winniegym.com`, sin activación): ¿exigir email siempre? (Recomendado: sí exigirlo en recepción.)

## 12. Referencias
- `openspec/changes/socios-membresias/spec.md` (Socio CRUD admin/recepcionista); `docs/qa/plan-de-pruebas.md` US03 y caso "Crear un nuevo socio con email y subir certificado médico" (línea 440).
- Cobro manual: `backend/apps/payments/views.py:112-127`, `frontend/src/pages/recepcion/CobroManualPage.jsx`.
- Relacionados: BK-SOC-07 (contrato ABM), BK-SOC-10 (datos ampliados), BK-SOC-06 (vigencia apto), BK-FIN-01 (cobro manual).
- Figma (opcional): archivo `WuBKhksfVVcBjNKbDVX5EM`, página "vistas live", módulo Recepción → Socios.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1 + DRF en backend/, React 18 + Vite + react-query v5 en frontend/). Tarea: arreglar el "Alta en Recepción" (frontend/src/pages/recepcion/GestionSociosPage.jsx, pestaña "nuevo").
Problemas verificados: (1) POST /api/members/socios/ es IsAdminOnly (backend/apps/members/views.py:43-48) y el recepcionista debe poder crear; (2) Socio.telefono es obligatorio y el schema zod (gestionSocios.schema.js) no lo incluye, además zod descarta campos desconocidos; (3) plan/cuota/cobro/renovación están hardcodeados y nunca llegan al backend; (4) SaludCard recibe onFileChange={() => {}} y el apto se pierde; (5) el sidebar promete "generar QR y enviarlo por email" (falso).
Hacé TDD. Primero tests backend en backend/apps/members/tests/test_socios_views.py (APITestCase, make_user_factory/make_socio_factory de backend/conftest.py): recepcionista crea socio -> 201; sin telefono -> 400; recepcionista update/dar-baja -> 403. Luego cambiá get_permissions para que solo `create` sea IsReceptionistOrAdmin.
Frontend (react-hook-form + zod, sonner, lucide-react; mutations con isPending): nuevo schema {nombre, apellido, dni(/^\d{7,8}$/), telefono(min 8), email opcional, planId, monto, observaciones}; planes desde usePlanesQuery (solo activo) con monto prellenado = plan.precio; onSubmit: useSocioMutations().create -> (si hay archivo) .certificado -> useCobrarManualMutation (POST /api/payments/cobros-manuales/ {socio_id, plan_id, monto}). Si falla un paso posterior, no resetear el form y mostrar aviso con link a /recepcion/cobros. Quitá "fecha de cobro", "renovación", "fecha nacimiento" y "género" (no existen en backend). Corregí el texto del SocioResumenSidebar. Actualizá los tests *.test.jsx de las cards y agregá GestionSociosPage.test.jsx.
Definición de terminado: pytest -q apps/members verde; npx vitest run src/pages/recepcion src/components/recepcion verde; npm run lint sin warnings; flujo manual con recepcion@winnie.local crea socio + pago aprobado + membresía activa. No modificar archivos fuera de este alcance ni hacer commits.
```
