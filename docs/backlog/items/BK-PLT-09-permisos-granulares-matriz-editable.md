---
id: BK-PLT-09
titulo: Permisos granulares por rol (matriz editable) sobre los 3 roles fijos
tipo: idea
roles: [administrador]
prioridad: P3
tamano: XL
estado_en_codigo: solo-idea
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-PLT-02, BK-PLT-12]
---

# BK-PLT-09 · Permisos granulares por rol (matriz editable)

## 1. Resumen
Los permisos hoy son 3 roles fijos (`administrador`, `recepcionista`, `socio`) y 3 clases de permiso de DRF + listas de roles hardcodeadas en las rutas del frontend. No existe modelo de permisos ni pantalla para editarlos. Una matriz editable es una idea sin especificación; esta ficha deja la propuesta mínima y los riesgos.

## 2. Objetivo de usuario
Como **administrador** quiero **definir qué puede hacer cada rol (p. ej. permitir a recepción gestionar planes pero no cobros)** para **adaptar el sistema a la operación de cada gimnasio sin pedir cambios de código**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/users/models.py:23-31` | `User.Rol` (`ADMINISTRADOR`, `RECEPCIONISTA`, `SOCIO`) y `rol = CharField(max_length=20, choices=..., default=SOCIO)`. Hereda `is_staff`/`is_superuser` de `AbstractUser`. |
| Backend alta de staff | `backend/apps/users/serializers.py:98-107` | `is_staff = is_superuser = (rol == administrador)`: el admin es superusuario de Django (acceso total al admin de Django). |
| Backend permisos | `backend/apps/access/permissions.py:4-19` | `IsReceptionistOrAdmin`: `is_staff or is_superuser` o rol en (`administrador`,`recepcionista`). |
| Backend permisos | `backend/apps/access/permissions.py:22-32` | `IsSocio`: `rol == 'socio'` y `hasattr(user, 'socio')`. |
| Backend permisos | `backend/apps/access/permissions.py:35-46` | `IsAdminOnly`: `rol == 'administrador'` o `is_superuser`. Re-exportado en `users/permissions.py`. |
| Backend permisos objeto | `backend/apps/members/permissions.py:4-27` | `IsAdminOrOwnSocio` (ownership). |
| Backend uso | `rg "IsAdminOnly\|IsReceptionistOrAdmin\|IsSocio" backend/apps/*/views.py` | Aplicados por vista o `get_permissions()` por acción (ej. `classes/views.py:63-70`, `members/views.py:43-48`, `memberships/views.py:37-40,57-60`, `payments/views.py:41-44`, `common/views.py:24-27`). Unos 17 puntos. |
| Backend WS | `backend/apps/access/consumers.py:59-` | `_is_authorized` con rol/`is_staff` para el aforo. |
| Backend sesión | `backend/apps/users/middleware.py:9` | `STAFF_ROLES = {'administrador','recepcionista'}` para inactividad. |
| Frontend rutas | `frontend/src/App.jsx:84-138` | `ProtectedRoute roles={[...]}` hardcodeado por ruta (17 apariciones de literales de rol en `App.jsx`). |
| Frontend nav | `frontend/src/components/layout/Sidebar.jsx:12-46`, `AppBottomNav.jsx:5-19` | `NAV_BY_ROLE`/`MOBILE_NAV` por rol. |
| Frontend dashboard | `frontend/src/pages/DashboardPage.jsx:14` | `const effectiveRole = user?.rol \|\| 'administrador'` (si no hay user, asume admin; hoy lo protege `ProtectedRoute`). |
| Frontend usuario | `frontend/src/components/admin/StaffFormModal.jsx` | Selector de rol al crear staff (2 literales). Sin edición de rol de un usuario existente (No verificado en `AdminUsuariosPage`). |
| Specs | `openspec/`, `speckit/` | Sin menciones de permisos granulares (`rg -i "granular\|matriz de permisos"` sin resultados). |

## 4. Alcance
**Incluye (propuesta mínima):** catálogo fijo de "capacidades" (strings), tabla rol→capacidades editable solo por admin, una clase DRF `HasCapability` y un endpoint que expone las capacidades del usuario para que el frontend oculte/ruteé. Los 3 roles siguen existiendo; el admin conserva todas las capacidades (no editable) para evitar lock-out.
**No incluye:** roles personalizados creados por el usuario, permisos por objeto/sede, asignación de capacidades a usuarios individuales.

## 5. Contrato de API (propuesta, **[A CREAR]**)
- `GET /api/auth/me/capabilities/` (IsAuthenticated) → `{"rol": "recepcionista", "capacidades": ["socios.ver", "cobros.crear", ...]}`. (Alternativa: añadir `capacidades` a `UserDetailsSerializer`, `users/serializers.py`; No verificado su shape actual.)
- `GET /api/permisos/matriz/` (IsAdminOnly) → `{"capacidades": [{clave, descripcion}], "roles": {"recepcionista": ["socios.ver", ...], "socio": [...]}}`.
- `PUT /api/permisos/matriz/` (IsAdminOnly) body `{"rol": "recepcionista", "capacidades": ["..."]}` → 200 matriz actualizada; 400 si el rol es `administrador` ("El rol administrador no es editable.") o la capacidad no existe.

## 6. Modelo de datos (propuesta)
`RolCapacidad(rol CharField, capacidad CharField, unique_together=(rol, capacidad))` en `apps/users`. Seed por data-migration con los permisos equivalentes al comportamiento actual (para que no cambie nada al desplegar). Cache por rol en Redis (invalidar al guardar).
Capacidades iniciales sugeridas (mapeadas a las vistas actuales): `socios.ver`, `socios.editar`, `socios.baja`, `planes.ver`, `planes.editar`, `clases.ver`, `clases.crear`, `clases.cancelar`, `acceso.escanear`, `aforo.ver`, `cobros.crear`, `reportes.ver`, `usuarios.gestionar`, `config.editar`.

## 7. Diseño frontend
- **Ruta:** `/admin/permisos` con `ProtectedRoute roles={['administrador']}`; entrada en Sidebar.
- **Guard:** extender `ProtectedRoute` con prop `capability` además de `roles` (retrocompatible); resolver capacidades desde un store/hook `useCapabilities()` (`hooks/queries/useCapabilities.js`, `staleTime` largo) y un componente `<Can capability="cobros.crear">`.
- **Página:** `pages/admin/AdminPermisosPage.jsx`: tabla (capacidad × rol) con checkboxes (`DataTable` o tabla propia), botón "Guardar cambios" con `useMutation`.
- **Estados:** skeleton, error (toast), éxito ("Permisos actualizados"), columna `administrador` deshabilitada.
- **Textos (es-AR):** "Permisos por rol", "El rol Administrador siempre tiene todos los permisos."
- **Responsive:** a 375 px, una tarjeta por rol con lista de switches.

## 8. Archivos a crear / modificar
Backend: modelo+migración+seed, `permissions.py::HasCapability`, vistas matriz/capacidades, reemplazar gradualmente las clases actuales (mantener las existentes como alias). Frontend: store/hook, `Can`, página, ajuste de `ProtectedRoute`, `Sidebar`, `AppBottomNav`, tests.

## 9. Plan de pruebas (TDD)
- Backend (pytest + `APITestCase`): la matriz por defecto reproduce exactamente los permisos actuales (test parametrizado por endpoint×rol contra la tabla vigente, usando `make_user_factory(rol=...)`); quitar `cobros.crear` a recepción → 403 en `POST` de cobro manual; admin siempre permitido; PUT con rol admin → 400; cache invalidado.
- Frontend (Vitest/RTL): `<Can>` oculta; `ProtectedRoute capability` renderiza 403 (BK-PLT-02).
- Manual: quitar `reportes.ver` a recepción y verificar sidebar y 403 en `/api/reportes/`.

## 10. Criterios de aceptación
- **Dado** la matriz por defecto **cuando** se despliega **entonces** ningún usuario gana ni pierde acceso.
- **Dado** que el admin quita una capacidad a recepción **cuando** recepción llama al endpoint correspondiente **entonces** recibe 403 y la UI oculta la acción.

## 11. Riesgos y decisiones abiertas
- Riesgo de lock-out y de regresiones silenciosas de seguridad: mantener tests de contrato por endpoint (matriz completa).
- `is_superuser` para admins amplía el alcance del admin de Django: ¿mantener? **Recomendación:** fuera de alcance, pero registrar como deuda.
- ¿Realmente hace falta? **Recomendación:** validar con el dueño; con 3 roles y un gimnasio pequeño puede ser sobreingeniería (P3).
- Auditoría de cambios de permisos: depende de BK-PLT-12/13.

## 12. Referencias
- `backend/apps/access/permissions.py`, `frontend/src/App.jsx`. Sin spec previa.

## 13. Prompt listo para un agente de IA
```
NO empezar sin aprobación del dueño (ver sección 11 de docs/backlog/items/BK-PLT-09-permisos-granulares-matriz-editable.md).
Contexto: roles fijos en backend/apps/users/models.py:23-31; permisos DRF en apps/access/permissions.py (IsAdminOnly, IsReceptionistOrAdmin, IsSocio); listas de roles hardcodeadas en frontend/src/App.jsx.
Tarea: TDD primero — test parametrizado que fije el comportamiento actual por endpoint×rol. Luego modelo RolCapacidad + seed equivalente, HasCapability, endpoints /api/auth/me/capabilities/ y /api/permisos/matriz/ (GET/PUT, IsAdminOnly), y en frontend useCapabilities, <Can>, ProtectedRoute con prop capability y pages/admin/AdminPermisosPage.jsx. El rol administrador no es editable.
Terminado: pytest -q (>=80%) y `npm run lint && npx vitest run --coverage` verdes; el test de contrato demuestra que el comportamiento por defecto no cambió.
```
