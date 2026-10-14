---
id: BK-SOC-02
titulo: La subida del apto médico desde "Mi Perfil" (RF08 self-service) no hace nada
tipo: bug
roles: [socio]
prioridad: P0
tamano: S
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-SOC-05, BK-SOC-06]
---

# BK-SOC-02 · La subida del apto médico desde "Mi Perfil" no hace nada

## 1. Resumen
`ProfilePage` muestra la sección "Certificado médico" y un botón "Subir certificado", pero el handler corta en silencio porque `GET /api/auth/profile/` **no devuelve `id`** del socio ni `certificado_medico_url`. Resultado: elegir un archivo no dispara ningún request y la pantalla siempre dice "No hay certificado cargado", aunque exista. Los tests lo esconden porque mockean un perfil con campos que el serializer real no tiene.

## 2. Objetivo de usuario
Como **socio** quiero **subir o reemplazar mi apto médico desde mi perfil y ver si ya está cargado** para **no depender de ir a recepción**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend serializer | `backend/apps/users/serializers.py:55-63` | `ProfileSerializer.Meta.fields = ('email','foto','rol','dni','nombre','apellido','telefono')`; `read_only_fields=('email','foto','rol','dni')`. **No incluye `id`, `numero_socio`, `estado` ni `certificado_medico_url`.** |
| Backend vista | `backend/apps/users/views.py:66-72` | `ProfileView(RetrieveUpdateAPIView)`, `IsAuthenticated`, `http_method_names=['get','patch']`, `get_object` = `get_object_or_404(Socio, usuario=request.user)` (staff ⇒ 404: ver BK-BUG-01). |
| Backend upload | `backend/apps/members/views.py:90-116` | `POST /api/members/socios/{id}/certificado-medico/` con `IsAdminOrOwnSocio` (`members/permissions.py`): el socio solo sobre su propio id. **Funciona** y está testeado (`members/tests/test_certificado_self_service.py:36-58`). |
| Frontend página | `frontend/src/pages/ProfilePage.jsx:74-97` | `handleCertUpload`: `if (!file || !profile?.id) return` → como `profile.id` es `undefined`, **retorna sin hacer nada** (sin toast). |
| Frontend página | `frontend/src/pages/ProfilePage.jsx:164-184` | Decide "Certificado cargado / No hay certificado cargado" con `profile?.certificado_medico_url` (siempre `undefined`). |
| Frontend test | `frontend/src/pages/ProfilePage.test.jsx:52,59,132-135` | `mockProfile` tiene `id: 1` y `certificado_medico_url`: **mock con campos inexistentes en el contrato real** (drift). |
| Frontend hook | `frontend/src/hooks/queries/useProfile.js:6-25` | `GET /auth/profile/` y `PATCH /auth/profile/`; `PROFILE_KEY=['profile']`. |
| Frontend validación | `frontend/src/pages/ProfilePage.jsx:186-193` | `accept=".pdf,.jpg,.jpeg,.png"` pero **sin chequeo de 5 MB** del lado cliente (el resto de la app usa `frontend/src/constants/files.js:4-14`). |

Verificación en vivo: **No verificado** (backend local apagado); contradicción confirmada por lectura de serializer y de test.

## 4. Alcance
**Incluye:** exponer `id`, `numero_socio`, `estado`, `certificado_medico_url` (solo lectura) en `GET/PATCH /api/auth/profile/`; usar `constants/files.js` para validar tipo/tamaño antes de subir; toast de error cuando falta `id`; arreglar los tests para que reflejen el contrato real; actualizar el cache de `['profile']` y de `['socioMembership']`/`['membresias','me']` tras subir.
**No incluye:** vigencia/fecha de vencimiento del apto (→ BK-SOC-06); seguridad del almacenamiento (→ BK-SOC-05); perfil de staff (→ BK-BUG-01).

## 5. Contrato de API
**[EXISTE → CAMBIA] `GET/PATCH /api/auth/profile/`** — `IsAuthenticated`, solo usuarios con `Socio` (si no, 404). Response tras el cambio:
```json
{"id":12,"numero_socio":"S-00012","estado":"activo","email":"x@y.com","foto":"","rol":"socio",
 "dni":"30111222","nombre":"Ana","apellido":"G","telefono":"1155550000",
 "certificado_medico_url":"https://.../certificados_medicos/S-00012_g.pdf"}
```
`read_only_fields` pasa a `('id','numero_socio','estado','email','foto','rol','dni','certificado_medico_url')`. PATCH sigue aceptando solo `nombre, apellido, telefono`.
**[EXISTE] `POST /api/members/socios/{id}/certificado-medico/`** — `multipart/form-data` `archivo`; 200 `SocioSerializer`; 400 `{"archivo":[...]}` (tamaño >5 MB / extensión / content-type / magic bytes, `members/services.py:59-81`); 403 si el `id` no es el propio.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- **Ruta/guard:** `/perfil` con `<ProtectedRoute>` sin `roles` (`App.jsx:75`); la sección de apto ya está condicionada a `rol === 'socio'` (`ProfilePage.jsx:160`).
- **Convenciones:** react-query v5 (`useQuery/useMutation`, `isPending`), cliente `services/api.js`, toasts `sonner`, íconos `lucide-react`, forms `react-hook-form + zod`.
- **Cambios:**
  1. Mover la subida a un hook `useUploadMiCertificado()` en `frontend/src/hooks/queries/useProfile.js` (o reutilizar `useSocioMutations().certificado` de `useSociosData.js:153` pasando `profile.id`); en `onSuccess`: `qc.setQueryData(PROFILE_KEY, (old) => ({...old, certificado_medico_url: data.certificado_medico_url}))` y `qc.invalidateQueries(['socioMembership'])` + `['membresias','me']` (usados por dashboard y credencial).
  2. En `handleCertUpload`: validar con `MAX_CERT_FILE_SIZE` y `ALLOWED_CERT_EXTENSIONS` (`constants/files.js`) → `toast.error('El archivo supera los 5 MB permitidos.')`; si `!profile?.id` → `toast.error('No pudimos identificar tu ficha de socio. Recargá la página.')` (no silencio).
  3. Mostrar estado `loading` en el botón (ya existe `uploadingCert`).
- **Textos:** "Subir certificado" / "Reemplazar certificado", "Certificado cargado", "Aceptamos PDF, JPG o PNG de hasta 5 MB.", toast éxito "Certificado médico actualizado."
- **Estados:** loading (`Button loading`), error (toast con mensaje DRF), éxito (toast + badge verde), vacío (banner rojo actual).
- **Responsive:** la tarjeta es de ancho completo (`max-w-2xl`); verificar a 375 px que el botón `w-fit` no desborde.

## 8. Archivos a crear / modificar
- `backend/apps/users/serializers.py` — `ProfileSerializer.Meta.fields/read_only_fields`.
- `backend/apps/users/tests/test_views.py` — tests de contrato (ver §9).
- `frontend/src/pages/ProfilePage.jsx` — handler con validación y errores visibles.
- `frontend/src/hooks/queries/useProfile.js` — mutation de subida con actualización de cache.
- `frontend/src/pages/ProfilePage.test.jsx` — mock alineado al contrato + casos de subida.

## 9. Plan de pruebas (TDD)
**Backend** (`backend/apps/users/tests/test_views.py`, `APITestCase` + `make_user_factory`/`make_socio_factory`; clase de perfil en líneas ~145-200): 
- `test_profile_get_includes_id_numero_socio_estado_certificado` (con y sin certificado: `''`).
- `test_profile_patch_ignores_id_estado_certificado` (campos read-only no mutan).
- `test_socio_upload_certificado_then_profile_shows_url` (flujo completo con `SimpleUploadedFile('apto.pdf', b'%PDF-1.4 body', content_type='application/pdf')`).
Comando: `cd backend && pytest -q apps/users/tests/test_views.py apps/members/tests/test_certificado_self_service.py`.
**Frontend** (`ProfilePage.test.jsx`, Vitest + RTL, `vi.mock('../hooks/queries/useProfile')` y `vi.mock('../services/api')`): 
- Con perfil **sin** `id` (contrato viejo) no debe quedar mudo: aparece toast de error.
- Archivo de 6 MB → toast "supera los 5 MB", **no** se llama a `api.post`.
- Archivo válido → `api.post('/members/socios/12/certificado-medico/', FormData)` y el banner pasa a "Certificado cargado".
- Mover el mock a un helper que replique exactamente los campos del serializer.
Comando: `cd frontend && npx vitest run src/pages/ProfilePage.test.jsx && npm run lint`.
**Manual:** `socio.nuevo@winnie.local` (seed, sin certificado) → `/perfil` → subir PDF → banner "Certificado cargado" → `/dashboard` muestra "Apto Médico: Vigente" (hasta que exista BK-SOC-06).

## 10. Criterios de aceptación
- **Dado** un socio **cuando** abre `/perfil` **entonces** `GET /api/auth/profile/` devuelve `id`, `numero_socio`, `estado`, `certificado_medico_url`.
- **Dado** un socio sin certificado **cuando** sube un PDF ≤ 5 MB **entonces** se hace `POST .../certificado-medico/`, aparece "Certificado cargado" con link y el dashboard refleja el cambio sin recargar.
- **Dado** un archivo > 5 MB o de tipo no permitido **cuando** lo elige **entonces** ve el error sin que salga ningún request.
- Ninguna acción del usuario queda sin feedback (toast).

## 11. Riesgos y decisiones abiertas
1. ¿Exponer también `fecha_baja`/`observaciones` en el perfil? (Recomendado: **no**, `observaciones` son notas internas.)
2. Un socio en `baja`/`suspendido` ¿puede subir apto? (Recomendado: sí, para poder reactivarse; ver BK-SOC-08.)
3. Al reemplazar el certificado, el archivo anterior se pisa (mismo nombre, `services.py:95-99`): ¿guardar historial? (BK-SOC-06/05.)

## 12. Referencias
- `speckit/spec.md` REQ-3.1 (líneas 180-196): pedía `IsAdminOrOwnSocio` + sección en `ProfilePage` (implementado a medias).
- `docs/qa/plan-de-pruebas.md` líneas 352-381 (flujo end-to-end "sube su certificado" en `/perfil`).
- Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", Mobile → Perfil.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1/DRF + React 18/Vite/react-query v5). Bug: en frontend/src/pages/ProfilePage.jsx la subida del apto médico no hace nada porque handleCertUpload retorna si !profile?.id, y GET /api/auth/profile/ (ProfileSerializer en backend/apps/users/serializers.py:55-63) no devuelve id ni certificado_medico_url. El test frontend/src/pages/ProfilePage.test.jsx mockea esos campos, ocultando el bug.
TDD: (1) backend/apps/users/tests/test_views.py: tests que exijan id, numero_socio, estado y certificado_medico_url (read-only) en GET y que PATCH los ignore. (2) Agregá esos campos a ProfileSerializer (read_only). (3) Frontend: validá tipo/tamaño con frontend/src/constants/files.js antes de subir, mostrá toast.error si falta id (no silencio), hacé la subida con una mutation en hooks/queries/useProfile.js que actualice el cache ['profile'] e invalide ['socioMembership'] y ['membresias','me']. (4) Reescribí los mocks de ProfilePage.test.jsx para que coincidan con el contrato real y agregá casos: sin id -> toast, 6 MB -> toast y sin request, PDF válido -> POST a /members/socios/{id}/certificado-medico/ y banner verde.
Terminado cuando: cd backend && pytest -q apps/users apps/members verde; cd frontend && npx vitest run src/pages/ProfilePage.test.jsx y npm run lint verdes. No toques el perfil de staff (es BK-BUG-01), ni cambies el modelo Socio. No hagas commits.
```
