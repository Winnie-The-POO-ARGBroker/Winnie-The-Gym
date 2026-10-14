---
id: BK-SOC-10
titulo: Datos personales ampliados del socio (fecha de nacimiento, género, contacto de emergencia) y saludo de cumpleaños
tipo: feature
roles: [administrador, recepcionista, socio]
prioridad: P2
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-SOC-01, BK-SOC-07]
---

# BK-SOC-10 · Datos personales ampliados del socio

## 1. Resumen
El modelo `Socio` solo guarda `nombre, apellido, dni, telefono, observaciones`. No hay fecha de nacimiento (no se puede saber la edad ni detectar menores), ni género, ni **contacto de emergencia** (dato operativo clave ante una descompensación en el gimnasio), ni domicilio. La pantalla de Alta en Recepción ya dibuja "FECHA NACIMIENTO" y "GÉNERO" pero los descarta. El saludo de cumpleaños es una idea sin rastro en backend.

## 2. Objetivo de usuario
Como **recepcionista** quiero **registrar la fecha de nacimiento y un contacto de emergencia del socio** para **saber a quién llamar ante una emergencia y aplicar reglas por edad**; como **socio** quiero **mantener esos datos desde mi perfil**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/members/models.py:19-28` | Campos: `usuario, dni, nombre, apellido, telefono, certificado_medico_url, numero_socio, estado, fecha_baja, updated_at, observaciones, created_at`. **No existen** `fecha_nacimiento`, `genero`, contacto de emergencia ni dirección (`rg -i "nacimiento\|emergencia\|direccion\|genero" backend/apps` fuera de tests ⇒ 0 resultados). |
| DB docs | `docs/database/schema.dbml:42-60`, `docs/database/mer.md:51` | Tabla `members_socio` sin esos campos (coherente con el modelo). |
| Backend serializers | `backend/apps/members/serializers.py:23-37`, `backend/apps/users/serializers.py:40-63` | `SocioSerializer`, `ProfileCompleteSerializer` (`dni,nombre,apellido,telefono`) y `ProfileSerializer` (`email,foto,rol,dni,nombre,apellido,telefono`) no incluyen los campos. |
| Frontend recepción | `frontend/src/components/recepcion/DatosPersonalesCard.jsx:18-23` | `Input` "FECHA NACIMIENTO" (`fechaNacimiento`, placeholder `dd/mm/aaaa`) y `Select` "GÉNERO" (`genero`, opciones `Femenino/Masculino/Otro` **sin `value`**): se llenan pero `gestionSocios.schema.js:3-14` (zod `strip`) los elimina. |
| Frontend perfil | `frontend/src/pages/ProfilePage.jsx:18-22,254-298` | Zod: `nombre, apellido, telefono`; solo esos tres editables; DNI de solo lectura. |
| Frontend alta admin | `frontend/src/components/admin/SocioFormModal.jsx:14-22` | `nombre, apellido, dni, telefono, email, estado, observaciones`. |
| Frontend completar perfil | `frontend/src/pages/CompleteProfilePage.jsx:12-24` | `nombre, apellido, dni, telefono`. |
| Emails | `backend/apps/common/templates/emails/` | No hay plantilla ni tarea de cumpleaños. |

## 4. Alcance
**Incluye (propuesta mínima):** `fecha_nacimiento` (opcional), `genero` (opcional, con "Prefiero no decirlo"), contacto de emergencia (`nombre`, `telefono`, opcional pero recomendado) en modelo, serializers de admin/recepción/perfil y formularios; validación de fecha (no futura, edad razonable); mostrar edad y contacto en el detalle de staff; aviso en UI si falta contacto de emergencia.
**No incluye:** domicilio (se recomienda **no** pedirlo: minimización de datos, no hay caso de uso); autorización de menores y reglas por edad (decisión abierta); saludo de cumpleaños (se describe como **solo-idea** en §11, no se implementa aquí); ficha de salud estructurada (alergias, medicación) → futura, se mantiene `observaciones`.

## 5. Contrato de API (propuesta)
**[EXISTE → CAMBIA] `GET/POST/PATCH /api/members/socios/` y `/{id}/`** (`IsReceptionistOrAdmin` lectura; crear → ver BK-SOC-01; editar/baja → admin, ver BK-SOC-07): agregar a `SocioSerializer.Meta.fields`:
`fecha_nacimiento: date|null`, `genero: "femenino"|"masculino"|"otro"|"no_informa"|""`, `contacto_emergencia_nombre: str(≤100)`, `contacto_emergencia_telefono: str(≤30)`; calculado de solo lectura `edad: int|null`.
Errores: `400 {"fecha_nacimiento":["La fecha de nacimiento no puede ser futura."]}`, `{"fecha_nacimiento":["Revisá la fecha: la edad no puede superar 100 años."]}`, `{"contacto_emergencia_telefono":["Ingresá un teléfono válido."]}`; si se carga nombre sin teléfono (o viceversa): `{"contacto_emergencia_telefono":["Completá el teléfono del contacto de emergencia."]}`.
**[EXISTE → CAMBIA] `GET/PATCH /api/auth/profile/`** (`IsAuthenticated`, solo con `Socio`): agregar los mismos campos editables (excepto `edad`, solo lectura) a `ProfileSerializer`.
**[EXISTE → CAMBIA] `POST /api/auth/complete-profile/`**: campos opcionales nuevos en `ProfileCompleteSerializer` (no bloquear el alta rápida).

## 6. Modelo de datos (propuesta)
`Socio`: `fecha_nacimiento = DateField(null=True, blank=True)`, `genero = CharField(max_length=20, choices=Genero.choices, blank=True, default='')`, `contacto_emergencia_nombre = CharField(max_length=100, blank=True, default='')`, `contacto_emergencia_telefono = CharField(max_length=30, blank=True, default='')`. Migración `members/migrations/0008_*` (la última es `0007_socio_textchoices_ordering.py`; coordinar con BK-SOC-06 que también agrega campos: una sola migración o encadenadas). Propiedad `Socio.edad`. Actualizar `docs/database/schema.dbml` y `mer.md`.

## 7. Diseño frontend
- **Rutas/guard:** sin rutas nuevas (`/recepcion/socios`, `/admin/socios`, `/perfil`, `/completar-perfil`; ver `App.jsx:69,75,104,123`).
- **Convenciones:** formularios con `react-hook-form` + `zod` (`ProfilePage`, `CompleteProfilePage`, `GestionSociosPage`) y `useState` (`SocioFormModal`); componentes `Input`/`Select` en `components/ui/` (props `label, icon, ...inputProps` y `children` en Select); validaciones compartidas en `frontend/src/constants/validation.js` (BK-SOC-07).
- **Cambios:** `DatosPersonalesCard` → `<Input type="date" max={hoy}>` para nacimiento y `Select` con `value` explícito (`''` "Prefiero no decirlo", `femenino`, `masculino`, `otro`); nueva sección "Contacto de emergencia" (nombre + teléfono) en la misma card; los mismos campos en `SocioFormModal`, `ProfilePage` (sección "Datos personales") y opcionales en `CompleteProfilePage`; `SocioDetailModal` pestaña Datos: edad + contacto con link `tel:`; banner suave en el detalle si falta contacto de emergencia ("Sin contacto de emergencia").
- **Estados de UI:** errores inline por campo; éxito con toast existente.
- **Textos:** "Fecha de nacimiento", "Género", "Prefiero no decirlo", "Contacto de emergencia", "Nombre y apellido", "Teléfono del contacto".
- **Responsive:** grids `grid-cols-1 sm:grid-cols-2` ya usados; en 375 px un campo por fila.

## 8. Archivos a crear / modificar
- Backend: `members/models.py`, `members/migrations/0008_*.py`, `members/serializers.py` (+ validaciones), `users/serializers.py` (`ProfileSerializer`, `ProfileCompleteSerializer`), `members/admin.py` (campos), `docs/database/*`, tests.
- Frontend: `DatosPersonalesCard.jsx`, `gestionSocios.schema.js`, `SocioFormModal.jsx`, `SocioDetailModal.jsx`, `ProfilePage.jsx`, `CompleteProfilePage.jsx` y tests respectivos.

## 9. Plan de pruebas (TDD)
**Backend** (`members/tests/test_socios_models.py`, `test_socios_views.py`, `users/tests/test_views.py`; `APITestCase`, `make_user_factory/make_socio_factory`): 
- Modelo: `edad` correcta (cumpleaños hoy/mañana, 29 feb); `fecha_nacimiento` futura inválida.
- API: crear/editar con y sin campos nuevos (retrocompatible: todos opcionales); nombre sin teléfono de emergencia ⇒ 400; `GET /api/auth/profile/` los devuelve y `PATCH` los actualiza; `edad` ignorada en escritura.
Comando: `cd backend && pytest -q apps/members apps/users`.
**Frontend** (Vitest + RTL): `DatosPersonalesCard.test.jsx` (los campos llaman `onChange('fechaNacimiento'…)`, `max` = hoy); `ProfilePage.test.jsx` (guarda los campos nuevos, error por fecha futura); `SocioDetailModal.test.jsx` (muestra edad y contacto; aviso si falta).
Comando: `cd frontend && npx vitest run src/components src/pages && npm run lint`.
**Manual:** recepción crea socio con nacimiento y contacto → detalle muestra edad y link `tel:`; el socio edita su contacto en `/perfil`.

## 10. Criterios de aceptación
- **Dado** el alta (recepción/admin) **cuando** se completan nacimiento, género y contacto de emergencia **entonces** se persisten y se ven en el detalle.
- **Dado** una fecha de nacimiento futura **cuando** se guarda **entonces** hay error inline y el backend responde 400.
- **Dado** socios existentes **cuando** se migra **entonces** nada se rompe (campos vacíos) y el detalle muestra "Sin contacto de emergencia".
- El socio puede editar estos datos desde `/perfil`; no puede editar `dni` ni `estado`.

## 11. Riesgos y decisiones abiertas
1. ¿Se necesita domicilio? (Recomendado: no.) ¿Obra social/condiciones de salud? (Recomendado: posponer; usar `observaciones` y la futura ficha de salud.)
2. ¿Menores de 18? (Recomendado: pedir autorización de tutor como regla de negocio futura; por ahora solo calcular `edad`.)
3. Datos personales y de salud: informar finalidad en el alta (Ley 25.326). ¿Casilla de consentimiento? (Recomendado: texto informativo en el formulario.)
4. **solo-idea — cumpleaños:** saludo por email el día del cumpleaños con tarea Celery diaria (patrón de `memberships/tasks.py` + plantilla `birthday.{html,txt}` + dedup por año). Propuesta mínima; validar con el dueño si aporta valor y si se necesita opt-out.

## 12. Referencias
- `docs/database/schema.dbml`, `docs/database/mer.md` (modelo actual); `openspec/changes/socios-membresias/design.md`.
- Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", Recepción → Alta (Datos personales).

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1/DRF; React 18). Agregá a Socio los campos opcionales fecha_nacimiento (DateField), genero (choices femenino|masculino|otro|no_informa, blank), contacto_emergencia_nombre y contacto_emergencia_telefono (CharField blank) + propiedad edad. Hoy la UI de recepción (frontend/src/components/recepcion/DatosPersonalesCard.jsx:18-23) ya muestra FECHA NACIMIENTO/GÉNERO pero gestionSocios.schema.js los descarta y el modelo (backend/apps/members/models.py) no los tiene.
TDD: tests en backend/apps/members/tests (edad con bordes, fecha futura inválida, crear/editar con y sin campos nuevos, contacto con nombre sin teléfono => 400) y backend/apps/users/tests/test_views.py (profile GET/PATCH). Luego migración members/0008_* (la última es 0007), SocioSerializer/ProfileSerializer/ProfileCompleteSerializer, validaciones con mensajes en español. Frontend: DatosPersonalesCard (<Input type="date">, Select con values, sección Contacto de emergencia), SocioFormModal, ProfilePage, CompleteProfilePage (opcional), SocioDetailModal (edad, link tel:, aviso si falta contacto), gestionSocios.schema.js; tests Vitest + RTL. Actualizá docs/database/schema.dbml y mer.md.
No pidas domicilio. No implementes el saludo de cumpleaños. Terminado: pytest -q apps/members apps/users y npx vitest run && npm run lint verdes. Sin commits.
```
