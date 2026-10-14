---
id: BK-SOC-13
titulo: El socio puede pedir su baja y la supresión de sus datos desde "Mi Perfil"
tipo: idea
roles: [socio, administrador]
prioridad: P3
tamano: M
estado_en_codigo: solo-idea
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-SOC-08, BK-SOC-07]
---

# BK-SOC-13 · Baja de cuenta autogestionada y supresión de datos

## 1. Resumen
Hoy solo un administrador puede dar de baja a un socio, y no existe ningún camino (ni proceso documentado) para que un socio pida eliminar sus datos personales y su certificado médico. Esto es una **idea a validar** con el dueño del producto: no hay rastro en backend ni en specs. Se propone una solicitud de baja iniciada por el socio, resuelta por un administrador, más un procedimiento de anonimización posterior.

## 2. Objetivo de usuario
Como **socio** quiero **pedir mi baja y que se borren mis datos personales desde mi perfil** para **ejercer mi derecho sobre mis datos sin tener que ir al gimnasio**; como **administrador** quiero **recibir y procesar esas solicitudes con trazabilidad**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend baja | `backend/apps/members/views.py:51-69`, `services.py:48-56` | `POST /api/members/socios/{id}/dar-baja/` (`IsAdminOnly`): `estado=baja`, `fecha_baja=hoy`; la cuenta `User` sigue activa (`openspec/changes/socios-membresias/spec.md:343`). |
| Backend perfil | `backend/apps/users/views.py:66-72` | `ProfileView` solo `GET/PATCH` (`http_method_names=['get','patch']`); **sin `DELETE`**. |
| Backend borrado | `backend/apps/members/models.py:14-18`, `payments/models.py:21-25` | `Socio.usuario` es `CASCADE`; `Pago.socio` es `PROTECT`: borrar usuario/socio con pagos falla (por diseño, para conservar el historial contable, `docs/database/schema.dbml:96`). |
| Backend datos sensibles | `backend/apps/members/models.py:23` | `certificado_medico_url`; ver BK-SOC-05 (almacenamiento). |
| Backend comando | `backend/apps/members/management/commands/cleanup_orphan_socios.py` | Único borrado existente: socios huérfanos de staff (dry-run por defecto). |
| Frontend perfil | `frontend/src/pages/ProfilePage.jsx:209-223` | Sección "Seguridad" solo con "Cambiar contraseña". Sin zona de peligro. |
| Docs | `docs/qa/*`, `speckit/*`, `openspec/*` | **No hay** requerimiento ni caso de prueba sobre supresión/baja autogestionada (`rg -i "supresi\|derecho al olvido\|eliminar cuenta"` ⇒ 0 resultados). |

## 4. Alcance (propuesta mínima)
**Incluye:** botón "Solicitar mi baja" en `/perfil` (con contraseña y confirmación) que crea una **solicitud**; listado de solicitudes para admin y acción "Aprobar" que ejecuta `dar_baja` + anonimización (nombre/apellido/teléfono/observaciones/certificado) conservando `Pago`/`Membresia` por razones contables; email de confirmación.
**No incluye:** borrado físico de pagos; retención legal específica (definir con asesoría); exportación de datos (portabilidad) — idea separada.

## 5. Contrato de API (propuesta, [A CREAR])
- `POST /api/auth/profile/solicitar-baja/` — `IsSocio`; body `{"password":"…","motivo":"opcional ≤300"}` (valida la contraseña actual; cuentas Google: reautenticación por otro medio, decisión §11); 201 `{"id","estado":"pendiente","created_at"}`; 400 si ya hay una pendiente; 403 si rol ≠ socio.
- `GET /api/members/solicitudes-baja/` — `IsAdminOnly`, paginado; `?estado=pendiente|aprobada|rechazada`.
- `POST /api/members/solicitudes-baja/{id}/resolver/` — `IsAdminOnly`; `{"accion":"aprobar"|"rechazar","comentario":"…"}`; aprobar ⇒ `dar_baja(socio)` + `anonimizar_socio(socio)` en `transaction.atomic()`.

## 6. Modelo de datos (propuesta)
`SolicitudBaja`: `socio FK(CASCADE)`, `motivo TextField(blank)`, `estado (pendiente|aprobada|rechazada)`, `resuelta_por FK(User, SET_NULL)`, `resuelta_en`, `created_at`. Anonimización: `nombre='Socio'`, `apellido=f'eliminado-{id}'`, `dni=f'ANON-{id}'` (único), `telefono=''`, `observaciones=''`, borrar objeto del certificado, `User.email='anon-{id}@eliminado.invalid'`, `is_active=False`, `set_unusable_password()`.

## 7. Diseño frontend
- **Rutas/guard:** `/perfil` (`ProtectedRoute` sin `roles`, `App.jsx:75`); la zona de peligro solo para `rol==='socio'`. Admin: nueva sección o pestaña en `/admin/socios` (guard `roles=['administrador']`).
- **Convenciones:** `Modal` (`components/ui/Modal`, props `isOpen,onClose,title,description,icon`), `react-hook-form + zod`, `Button variant="danger"`, `sonner`, hooks en `hooks/queries/useProfile.js`.
- **Textos:** "Solicitar mi baja", "Vamos a dar de baja tu cuenta y anonimizar tus datos personales. Conservamos el historial de pagos que exige la contabilidad. Esta acción no se puede deshacer.", "Escribí tu contraseña para confirmar".
- **Estados:** loading del botón, error de contraseña inline, éxito con toast + mensaje "Tu solicitud está en revisión", y cierre de sesión al aprobarse.
- **Responsive:** modal estándar; 375 px sin scroll horizontal.

## 8. Archivos a crear / modificar
Backend: `members/models.py` (+migración), `members/serializers.py`, `members/views.py`, `members/services.py` (`anonimizar_socio`), `users/views.py`/`urls.py`, plantillas de email, tests. Frontend: `ProfilePage.jsx`, nuevo `components/auth/SolicitarBajaModal.jsx`, `hooks/queries/useProfile.js`, pantalla admin de solicitudes y tests.

## 9. Plan de pruebas (TDD)
**Backend** (`members/tests/test_solicitud_baja.py`, `APITestCase`, `make_*_factory`): password incorrecta ⇒ 400; solicitud duplicada ⇒ 400; staff/otro rol ⇒ 403; aprobar anonimiza y conserva `Pago` y `Membresia`; aprobar es atómico (si falla el borrado del archivo no queda a medias); rechazar no toca datos; `email` anonimizado no permite login.
Comando: `cd backend && pytest -q apps/members`.
**Frontend** (Vitest + RTL): el modal exige contraseña; error inline; éxito muestra el mensaje; solo se ve para socios.
Comando: `cd frontend && npx vitest run src/pages/ProfilePage.test.jsx src/components/auth && npm run lint`.
**Manual:** `socio.nuevo@winnie.local` solicita baja; admin la aprueba; el login posterior falla y el listado muestra el socio anonimizado.

## 10. Criterios de aceptación
- **Dado** un socio autenticado **cuando** confirma con su contraseña **entonces** se crea una solicitud pendiente y el admin la ve.
- **Dado** una solicitud aprobada **entonces** el socio queda en `baja`, sus datos personales anonimizados, su certificado eliminado y sus pagos conservados.
- **Dado** una cuenta anonimizada **entonces** no puede iniciar sesión.

## 11. Riesgos y decisiones abiertas
1. ¿Se necesita esta funcionalidad? (Validar con el dueño; **solo-idea**. Recomendado por defecto: implementar solo el procedimiento manual documentado + comando auditado antes que UI.)
2. ¿Qué datos deben conservarse por obligación contable/legal y por cuánto tiempo? (Recomendado: pagos/membresías; resto anonimizado.)
3. ¿Quién ejecuta: el admin (recomendado) o automático tras N días?
4. Cuentas Google sin contraseña: ¿reautenticar con Google antes de confirmar?

## 12. Referencias
- Ley 25.326 de Protección de Datos Personales (derechos del titular; consultar asesoría legal).
- `backend/apps/members/services.py` (`dar_baja`), `docs/database/schema.dbml`.
- Figma (opcional): n/a (idea sin diseño).

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1/DRF; React 18). Idea a validar: baja de cuenta autogestionada. NO implementes hasta que el dueño confirme las decisiones de la sección 11 (retención, quién ejecuta, cuentas Google).
Si se aprueba: TDD primero en backend/apps/members/tests/test_solicitud_baja.py (APITestCase + make_user_factory/make_socio_factory/make_membresia_factory de backend/conftest.py): password incorrecta 400, duplicada 400, rol no socio 403, aprobar anonimiza (nombre, apellido, dni único ANON-<id>, teléfono, observaciones, email, certificado) conservando Pago y Membresia en una transacción, rechazar no cambia nada, login imposible tras anonimizar. Luego modelo SolicitudBaja + migración (después de la última de members), endpoints POST /api/auth/profile/solicitar-baja/, GET /api/members/solicitudes-baja/ y POST .../{id}/resolver/ (IsAdminOnly) reutilizando members.services.dar_baja. Frontend: components/auth/SolicitarBajaModal.jsx en ProfilePage (solo rol socio) con contraseña, y pantalla admin de solicitudes; tests Vitest + RTL.
Terminado: pytest -q apps/members y npx vitest run && npm run lint verdes. No borres Pagos. Sin commits.
```
