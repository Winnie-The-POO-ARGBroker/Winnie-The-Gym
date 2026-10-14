---
id: BK-BUG-02
titulo: "Alta en Recepción" no puede crear socios (falta teléfono, 403 para recepcionista) y muestra campos que no existen
tipo: bug
roles: [recepcionista, administrador]
prioridad: P0
tamano: M
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-FIN-01]
---

# BK-BUG-02 · Alta de socio en recepción rota + campos falsos

## 1. Resumen
La pestaña "Alta en Recepción" (`/recepcion/socios`) arma un formulario que (a) nunca envía `telefono`, campo **obligatorio** en `Socio`, por lo que el POST falla con 400; (b) para un recepcionista falla igual con 403 porque `create` es `IsAdminOnly`; y (c) muestra "Fecha nacimiento", "Género", "Vence", plan/cuota/cobro/renovación que no existen en el modelo o no se persisten. Los datos de Plan están fijos en el código ("Premium · $ 12.000/mes").

## 2. Objetivo de usuario
Como **recepcionista** quiero **dar de alta a un socio nuevo con sus datos reales** para **que quede registrado y reciba el email de activación**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/members/models.py:19-28` | `Socio`: `dni` (unique), `nombre`, `apellido`, `telefono = CharField(max_length=30)` **sin** `blank`/`default` (obligatorio), `certificado_medico_url`, `numero_socio` (auto `S-00001`), `estado`, `fecha_baja`, `observaciones`. **No existen** `fecha_nacimiento` ni `genero` |
| Backend serializer | `backend/apps/members/serializers.py:11-38` | `SocioSerializer` fields: `id, usuario, email (write_only), numero_socio, nombre, apellido, dni, telefono, certificado_medico_url, estado, fecha_baja, observaciones, created_at`; `create` (l.61-88) crea/obtiene `User` con el email (o `socio_<dni>@winniegym.com`) y llama `dispatch_activation_email_for_socio` |
| Backend permisos | `backend/apps/members/views.py:43-48` | `get_permissions`: `create/update/partial_update/destroy/dar_baja` → `IsAdminOnly`; resto → `IsReceptionistOrAdmin`. El recepcionista **no puede** crear |
| Frontend ruta | `frontend/src/App.jsx:123` | `/recepcion/socios` abierto a `administrador` y `recepcionista` |
| Frontend página | `frontend/src/pages/recepcion/GestionSociosPage.jsx:51-75,239-277` | `react-hook-form` + `zodResolver(gestionSociosSchema)`; `create.mutateAsync(data)` con el output de zod; tab "nuevo" |
| Frontend schema | `frontend/src/pages/recepcion/gestionSocios.schema.js:3-25` | `z.object({nombre, apellido, dni, email, plan: enum['Básico','Premium','Gold'], cuota, cobro, renovacion})`; **sin `telefono`** (zod descarta claves no declaradas) ; defaults `plan:'Premium'`, `cuota:'$ 12.000'`, `cobro:'01/06'` |
| Frontend componente | `frontend/src/components/recepcion/DatosPersonalesCard.jsx:18-23,28` | Inputs `FECHA NACIMIENTO` (`fechaNacimiento`) y `GÉNERO` (`genero`, opciones sin `value`) que no existen en backend ni en el schema; `telefono` se pinta pero se descarta al validar |
| Frontend componente | `frontend/src/components/recepcion/PlanPagoCard.jsx:17-18,22,32` | Opciones fijas "Premium · $ 12.000/mes" y "Básico · $ 8.000/mes" (no lee `/memberships/planes/`); `Gold` está en el schema pero no en el select |
| Frontend componente | `frontend/src/components/recepcion/SaludCard.jsx:7-30,108-124` | `onFileChange` recibe `() => {}` en `GestionSociosPage.jsx:260` → el apto médico seleccionado se pierde; `venceMedico`/`observaciones` se guardan en el form pero el schema los descarta |
| Frontend componente | `frontend/src/components/recepcion/SocioResumenSidebar.jsx:50-57` | Botón "Crear y generar QR" y texto "se genera el QR de acceso y se envía al email": el backend solo envía mail de activación (`members/services.py:23-`); no hay creación de membresía |
| Frontend hook | `frontend/src/hooks/queries/useSociosData.js:95-104` | `useSocioMutations().create`: `createSocio(data)` → `POST /members/socios/`; `onError` → `toast.error(extractErrorMessage(...))` |
| Frontend alternativa OK | `frontend/src/components/admin/SocioFormModal.jsx:72-90` | El alta de admin (`/admin/socios`) sí arma `{nombre, apellido, dni, telefono, estado, observaciones, email?}` |

Resultado verificado por lectura: payload enviado = `{nombre, apellido, dni, email, plan, cuota, cobro, renovacion}` → DRF responde 400 `{"telefono":["This field is required."]}` (admin) o 403 (recepcionista). Los extras `plan/cuota/cobro/renovacion` se ignoran.

## 4. Alcance
**Incluye:** corregir el payload (enviar `telefono`, `observaciones`, `email`), validación zod alineada con el serializer, resolver el permiso del recepcionista, quitar/ocultar campos que no existen, subir el apto médico si se adjunta, texto honesto en el resumen.
**No incluye:** asignación de plan/membresía y cobro (ver BK-FIN-01 / flujo de membresías), fecha de nacimiento y género (si el negocio los quiere, es una feature separada con migración, ver sección 11), renovación automática.

## 5. Contrato de API
**[EXISTE] `POST /api/members/socios/`** — hoy `IsAdminOnly` (`apps.access.permissions`).
Request (campos del serializer): `nombre` (req, ≤100), `apellido` (req, ≤100), `dni` (req, único, ≤20), `telefono` (req, ≤30), `email` (opcional, write-only; si falta se usa `socio_<dni>@winniegym.com` y no se envía mail), `estado` (opcional, default `activo`), `observaciones` (opcional).
Response 201: `SocioSerializer` completo (incluye `numero_socio` generado).
Errores: 400 con dict por campo (p. ej. `{"dni":["socio with this dni already exists."]}`, `{"email":["Este email ya está asociado a otro socio."]}`, `{"email":["Este email pertenece a un usuario de administración o staff."]}`); 403 `{"detail":"You do not have permission to perform this action."}`.
**[EXISTE] `POST /api/members/socios/{id}/certificado-medico/`** (multipart, campo `archivo`; `IsAdminOrOwnSocio`, `members/views.py:44-45`): usado hoy por `uploadCertificado` en `sociosService` → hook `useSocioMutations().certificado`.
**[A MODIFICAR, decisión 11.1]** `get_permissions` para que `create` use `IsReceptionistOrAdmin` (resto sin cambios).

## 6. Modelo de datos
Sin cambios para el fix mínimo. Si el negocio exige fecha de nacimiento/género: **propuesta** `Socio.fecha_nacimiento = DateField(null=True, blank=True)` y `Socio.genero = CharField(max_length=20, blank=True)` + migración + serializer; no recomendado ahora.

## 7. Diseño frontend
- **Ruta/guard:** sin cambios (`ProtectedRoute roles={['administrador','recepcionista']}`).
- **Schema** (`gestionSocios.schema.js`): `{nombre, apellido, dni (7-12 → alinear con ≤20), telefono: z.string().trim().min(8,'Teléfono inválido'), email: z.string().trim().email().optional().or(z.literal('')), observaciones: z.string().optional()}`; eliminar `plan/cuota/cobro/renovacion` (o dejarlos fuera del payload hasta BK-FIN-01). Mismas validaciones que `ProfilePage.jsx:18-22`.
- **`DatosPersonalesCard`:** quitar `FECHA NACIMIENTO` y `GÉNERO` (y arreglar `Select` sin `value`); `telefono` ya está, solo falta que viaje.
- **`PlanPagoCard`:** ocultarla o convertirla en select alimentado por `usePlanesQuery()` (`hooks/queries/usePlanesAdmin.js`, `GET /memberships/planes/`) solo cuando exista el flujo de membresía (BK-FIN-01). Hasta entonces, no mostrar precios inventados.
- **`SaludCard`:** pasar `onFileChange={setCertificadoFile}` y, tras `create`, llamar `certificado.mutateAsync({id: res.id, archivo})` como hace `AdminSociosPage.handleSaveSocio` (`pages/admin/AdminSociosPage.jsx:87-110`).
- **`SocioResumenSidebar`:** cambiar botón a "Crear socio" y la nota a "Se enviará un email de activación si cargaste un email." (el QR lo genera el socio al ingresar).
- **Estados:** `Object.keys(errors).length>0` ya renderiza el resumen de errores (l.246-254); éxito = toast "Socio creado correctamente" (existente) + volver al listado; error backend = toast por `extractErrorMessage`.
- **Textos:** voseo ("Completá los datos del socio").
- **Responsive:** grilla `lg:grid-cols-3`; a 375/768 px queda una columna (sin cambios).

## 8. Archivos a crear / modificar
- `frontend/src/pages/recepcion/gestionSocios.schema.js` — schema y defaults reales.
- `frontend/src/pages/recepcion/GestionSociosPage.jsx` — estado del archivo de certificado, subida post-create, payload.
- `frontend/src/components/recepcion/DatosPersonalesCard.jsx`, `PlanPagoCard.jsx`, `SaludCard.jsx`, `SocioResumenSidebar.jsx` — quitar campos falsos / textos.
- `backend/apps/members/views.py` — `get_permissions` (si se aprueba 11.1).
- Tests: `frontend/src/pages/recepcion/GestionSociosPage.test.jsx`, `frontend/src/components/recepcion/DatosPersonalesCard.test.jsx` (existente), `backend/apps/members/tests/` (permisos).

## 9. Plan de pruebas (TDD)
Backend (pytest; `backend/pytest.ini`, fixtures `auth_client`, `make_user`, `make_socio` en `backend/conftest.py`; `cd backend && pytest apps/members -q`):
- `POST /api/members/socios/` como recepcionista con payload completo → 201 (si se aprueba 11.1) o 403 (si no); como administrador → 201 y `numero_socio` con formato `S-NNNNN`.
- Sin `telefono` → 400 con clave `telefono` (documenta el contrato).
- Email de usuario staff → 400; email duplicado → 400.
- `socio` autenticado → 403.
Frontend (vitest + RTL, `renderWithProviders` de `src/test/test-utils.jsx`; `GestionSociosPage.test.jsx` ya existe): llenar nombre/apellido/dni/teléfono/email y enviar → `createSocio` recibe exactamente `{nombre, apellido, dni, telefono, email, observaciones}`; sin teléfono muestra "Teléfono inválido" y no llama al servicio; no hay inputs de fecha de nacimiento/género; con archivo adjunto se llama `uploadCertificado`. `cd frontend && npx vitest run src/pages/recepcion`.
Manual: `recepcion@winnie.local` (seed `seed_demo_users`) → `/recepcion/socios` → "Alta en Recepción" → crear socio; verificar fila en el listado y mail de activación en Mailtrap/consola.

## 10. Criterios de aceptación
- **Dado** un recepcionista **cuando** completa nombre, apellido, DNI, teléfono y email válidos y confirma **entonces** el socio aparece en el listado con `numero_socio` y se muestra toast de éxito.
- **Dado** que falta el teléfono **cuando** confirma **entonces** ve el error de validación sin llamar al backend.
- **Dado** un DNI ya existente **cuando** confirma **entonces** ve el mensaje del backend en un toast y el formulario conserva sus datos.
- **Dado** el formulario **entonces** no aparecen campos que el backend no guarda.

## 11. Riesgos y decisiones abiertas
1. ¿El recepcionista puede crear socios? Hoy la UI dice que sí y el backend dice que no. Recomendación: sí, cambiar solo `create` a `IsReceptionistOrAdmin`.
2. ¿Se necesitan fecha de nacimiento y género? Recomendación: no hasta que haya un requisito (menores/aptos); si se piden, hacerlo con migración propia.
3. ¿Asignación de plan en el alta? Hoy `POST /memberships/membresias/` es `IsAdminOnly` (`memberships/views.py:57-60`). Depende de BK-FIN-01.

## 12. Referencias
`backend/apps/members/services.py` (activación), `docs/qa/`, Figma (opcional): "vistas live", Recepción → Alta de socio. Relacionados: BK-FIN-01 (membresía/cobro), BK-SOC-xx (gestión de socios).

## 13. Prompt listo para un agente de IA
> Repo Winnie The Gym. Bug: en `/recepcion/socios` → pestaña "Alta en Recepción" (`frontend/src/pages/recepcion/GestionSociosPage.jsx`) el POST `/api/members/socios/` falla: el schema zod (`gestionSocios.schema.js`) descarta `telefono`, que es obligatorio en `Socio` (`backend/apps/members/models.py:22`), y además `create` es `IsAdminOnly` (`members/views.py:43-45`) aunque la ruta sea para recepcionista. Además `DatosPersonalesCard` muestra Fecha de nacimiento/Género inexistentes en el modelo y `PlanPagoCard` tiene precios fijos. TDD: primero ampliá `GestionSociosPage.test.jsx` (payload exacto `{nombre,apellido,dni,telefono,email,observaciones}`, error de teléfono, sin campos falsos, subida de certificado) y agregá tests de permisos en `backend/apps/members/tests/` (usá fixtures `auth_client`/`make_socio` de `backend/conftest.py`). Luego: corregí el schema, el payload y los componentes de `components/recepcion/`; pasá `onFileChange` real a `SaludCard` y subí el archivo con `useSocioMutations().certificado` tras crear (copiá el patrón de `AdminSociosPage.handleSaveSocio`); cambiá `SocioResumenSidebar` a "Crear socio"; aplicá la decisión de permiso 11.1 (default: `IsReceptionistOrAdmin` solo para `create`). No inventes campos de modelo. Textos en español rioplatense. Terminado cuando `cd backend && pytest apps/members -q`, `cd frontend && npx vitest run && npm run lint` pasan y el alta manual funciona con `recepcion@winnie.local`. Sin commits.
