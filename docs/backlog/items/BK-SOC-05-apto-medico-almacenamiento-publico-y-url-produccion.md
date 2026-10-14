---
id: BK-SOC-05
titulo: Apto médico: bucket público con nombres predecibles y almacenamiento de producción que probablemente no se aplica
tipo: deuda-tecnica
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: M
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-SOC-02]
---

# BK-SOC-05 · Apto médico: privacidad y almacenamiento de producción

## 1. Resumen
El certificado médico es un dato de salud (sensible). Hoy se guarda en un bucket **público** de Supabase con un nombre derivado del número de socio y el apellido (`S-00012_gonzalez.pdf`), por lo que cualquiera que adivine el patrón lo descarga sin autenticarse. Además hay tres indicios, a confirmar en producción, de que la persistencia ni siquiera funciona como se documentó: (a) `DEFAULT_FILE_STORAGE` fue **eliminado en Django 5.1** y el proyecto usa 5.1.4; (b) la URL guardada se arma con `MEDIA_URL + path`, sin pasar por `storage.url()` (falta `/` y el nombre del bucket); (c) en producción el `DEBUG` es `False` y `static(MEDIA_URL)` solo se monta con `DEBUG`.

## 2. Objetivo de usuario
Como **administrador del gimnasio** quiero **que los aptos médicos solo los vean el propio socio y el personal autorizado, y que los archivos no se pierdan** para **cumplir con el resguardo de datos sensibles de salud y no perder documentación**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Config prod | `backend/core/settings/production.py:57` | `DEFAULT_FILE_STORAGE = 'apps.common.storages.SupabaseMediaStorage'`. |
| Dependencia | `backend/requirements/base.txt:1` | `Django==5.1.4`. En 5.1 se removieron los settings `DEFAULT_FILE_STORAGE` y `STATICFILES_STORAGE` (hay que usar `STORAGES`). `rg STORAGES` en el repo: **0 coincidencias** (solo `production.py:45,57` usan los nombres viejos). **No verificado en ejecución**: confirmar con `python manage.py shell -c "from django.core.files.storage import default_storage; print(type(default_storage))"` en prod/staging. |
| Storage | `backend/apps/common/storages.py:26-28` | `file_overwrite=False`, `default_acl=None`, `querystring_auth=False` ("Public bucket, no signed URLs by default"); `url()` (38-42) arma `{PUBLIC_URL_BASE}/{bucket}/{name}`. |
| Servicio | `backend/apps/members/services.py:94-107` | `safe_name = f'{numero_socio}_{slugify(apellido)}{ext}'`; borra el existente (`98-99`) y guarda; luego `media_url = f'{settings.MEDIA_URL}{stored_path}'` y `certificado_medico_url = request.build_absolute_uri(media_url)`. **No usa `default_storage.url(stored_path)`.** Con `MEDIA_URL = SUPABASE_STORAGE_PUBLIC_URL_BASE` (sin `/` final, `production.py:79`) el resultado sería `…/object/publiccertificados_medicos/S-00012_x.pdf` (sin bucket ni `/`). |
| Docs deploy | `docs/deploy.md:62` | "Nombre `fichas-medicas`, marcar como **Public** (para simplificar; en producción real → privado con URLs firmadas)". |
| Rutas | `backend/core/urls.py:170-176` | `static(MEDIA_URL, ...)` solo dentro de `if settings.DEBUG`. En dev el archivo se sirve desde `MEDIA_ROOT` (`base.py:126-127`). |
| Tests | `backend/apps/members/tests/test_certificado_upload.py:37-50` | Verifican `'/media/certificados_medicos/'` en la URL (almacenamiento local de dev); **no hay test con `SupabaseMediaStorage` ni de la forma de la URL en producción.** |
| Modelo | `backend/apps/members/models.py:23` | `certificado_medico_url = URLField(blank=True)` (guarda URL absoluta; `docs/database/schema.dbml:50` dice `varchar(200)`: una URL de Supabase puede acercarse a ese límite). |
| Frontend | `frontend/src/components/admin/SocioColumns.jsx:70-87`, `SocioDetailModal.jsx:112-120`, `ProfilePage.jsx:170-177` | Enlazan directo a `certificado_medico_url` con `target="_blank"`. |

## 4. Alcance
**Incluye:** configurar `STORAGES` (Django 5.1) para media y static; test/verificación del backend de storage activo; guardar en el modelo la **clave del objeto** (no la URL pública) y generar URLs firmadas de corta vida bajo demanda; bucket privado; nombres de archivo no predecibles (UUID); limpieza de archivos al reemplazar; migración de datos existentes.
**No incluye:** vigencia del apto (→ BK-SOC-06); antivirus/escaneo (se anota como decisión); permisos del endpoint de subida (ya correctos: `IsAdminOrOwnSocio`).

## 5. Contrato de API
**[EXISTE] `POST /api/members/socios/{id}/certificado-medico/`** — se mantiene; `SocioSerializer.certificado_medico_url` pasa a devolver una **URL firmada temporal** o la ruta del endpoint de descarga.
**[A CREAR — propuesta] `GET /api/members/socios/{id}/certificado-medico/`** — permisos: `IsAdminOrOwnSocio` (recep/admin o el propio socio). Responde `302` a una URL firmada (expira 5 min) o `200 {"url":"...","expira_en":300}`. 404 si no hay certificado; 403 si es de otro socio.
El listado `/api/members/socios/` no debería firmar una URL por fila (costo): exponer `tiene_certificado: bool` (derivado) y dejar la URL para el detalle/descarga.

## 6. Modelo de datos
Propuesta: `Socio.certificado_medico_url` se mantiene por compatibilidad pero se agrega `certificado_medico_key = CharField(max_length=255, blank=True)` (ruta del objeto en el bucket). Migración de datos: derivar `key` de las URLs existentes. Ampliar o reemplazar `URLField` (hoy `max_length=200` implícito en `URLField`). Alternativa: reemplazar por `FileField(upload_to=...)` con storage privado. (Decidir con BK-SOC-06, que también agrega campos de vigencia.)

## 7. Diseño frontend
- **Rutas:** sin rutas nuevas. Los enlaces "Ver certificado / Abrir archivo / Ver archivo" (3 lugares citados) pasan a un `<button>` que llama a `GET .../certificado-medico/` y hace `window.open(url)` (la URL firmada no se puede cachear en el listado).
- **Convenciones:** hook en `frontend/src/hooks/queries/useSociosData.js` (`useMutation` para "obtener enlace", `isPending` para spinner), cliente `services/sociosService.js` (agregar `getCertificadoUrl(id)`), toasts `sonner` para error.
- **Estados:** loading (spinner en el botón), error (`toast.error('No pudimos abrir el certificado. Intentá de nuevo.')`), vacío (ya existe "Sin certificado").
- **Textos:** "Ver certificado", "El enlace vence en 5 minutos".
- **Responsive:** abrir en pestaña nueva funciona igual a 375 px; en iOS Safari evitar `window.open` tras `await` (usar `window.location.assign` si falla el popup).

## 8. Archivos a crear / modificar
- `backend/core/settings/base.py` / `production.py` — migrar a `STORAGES = {'default': {'BACKEND': 'apps.common.storages.SupabaseMediaStorage'}, 'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'}}`.
- `backend/apps/common/storages.py` — `querystring_auth=True`, `default_acl='private'` si el proveedor lo soporta, `custom_domain=None`, expiración configurable.
- `backend/apps/members/services.py` — nombre `certificados_medicos/{uuid4}{ext}`, guardar `key`, borrar el objeto anterior, no armar URL con `MEDIA_URL`.
- `backend/apps/members/views.py` + `serializers.py` — `GET certificado-medico/` y `tiene_certificado`.
- `backend/apps/members/migrations/00NN_*.py` — campo `key` + data migration.
- `backend/apps/members/tests/test_certificado_storage.py` (nuevo).
- Frontend: `SocioColumns.jsx`, `SocioDetailModal.jsx`, `SocioFormModal.jsx`, `ProfilePage.jsx`, `sociosService.js`, `useSociosData.js` y sus tests.
- `docs/deploy.md` — bucket privado y variables.

## 9. Plan de pruebas (TDD)
**Backend** (`APITestCase`, `override_settings(STORAGES=...)` con `InMemoryStorage`/`FileSystemStorage` en `tmp`; `SimpleUploadedFile('apto.pdf', b'%PDF-1.4 body', content_type='application/pdf')` como en `test_certificado_self_service.py:33`):
- `test_upload_guarda_con_nombre_no_predecible` (el nombre no contiene `numero_socio` ni apellido).
- `test_upload_reemplaza_y_borra_objeto_anterior`.
- `test_serializer_no_expone_url_publica_permanente`.
- `test_get_certificado_propio_200`, `test_get_certificado_ajeno_403`, `test_get_sin_certificado_404`, `test_get_recep_200`.
- `test_default_storage_backend_en_produccion`: con `core.settings.production` importado (env mínimo) `settings.STORAGES['default']['BACKEND']` es `SupabaseMediaStorage` (detecta el setting removido).
Comando: `cd backend && pytest -q apps/members`.
**Frontend:** tests de `SocioDetailModal`/`ProfilePage` con `vi.mock('../../services/sociosService')`: click en "Ver certificado" llama `getCertificadoUrl` y abre la URL (`vi.spyOn(window,'open')`).
**Manual (staging):** subir apto como socio; intentar abrir la URL del objeto **sin** firma ⇒ 403/404; abrir desde la app ⇒ funciona; reemplazar ⇒ el anterior ya no existe.

## 10. Criterios de aceptación
- **Dado** un apto subido **cuando** alguien accede a la URL del bucket sin firma **entonces** no puede descargarlo.
- **Dado** un socio/staff autorizado **cuando** pide el certificado **entonces** obtiene un enlace temporal válido; otro socio recibe 403.
- **Dado** el entorno de producción **cuando** se inspecciona `default_storage` **entonces** es `SupabaseMediaStorage` y los archivos persisten tras un redeploy.
- Los nombres de archivo no revelan identidad.

## 11. Riesgos y decisiones abiertas
1. ¿Se confirma ya que prod usa el storage local efímero? (Primera acción: correr el comando del §3 en Render; si es así, **los aptos ya subidos pueden haberse perdido**.)
2. ¿Migrar bucket a privado rompe los enlaces existentes guardados en DB? (Recomendado: data migration que derive `key` y regenere.)
3. ¿Retención y borrado al dar de baja al socio (derecho de supresión, Ley 25.326)? (Recomendado: conservar mientras haya relación + plazo definido por el dueño.)
4. ¿Escaneo antivirus? (Recomendado: diferir; ya hay validación de magic bytes.)

## 12. Referencias
- Release notes de Django 5.1 (eliminación de `DEFAULT_FILE_STORAGE`/`STATICFILES_STORAGE`).
- `docs/deploy.md` (líneas 60-75, 231); `backend/apps/common/storages.py`.
- Figma (opcional): n/a (cambio de infraestructura).

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django 5.1.4, django-storages[s3], Supabase Storage). Objetivo: proteger y estabilizar el almacenamiento del apto médico.
Hechos verificados: backend/core/settings/production.py:57 usa DEFAULT_FILE_STORAGE (removido en Django 5.1; no hay STORAGES en el repo); backend/apps/members/services.py:94-107 arma la URL con settings.MEDIA_URL + path (no usa default_storage.url) y nombra el archivo S-xxxxx_apellido.ext; backend/apps/common/storages.py deja el bucket público (querystring_auth=False); docs/deploy.md:62 manda marcar el bucket como público.
TDD primero (backend/apps/members/tests/test_certificado_storage.py, APITestCase, make_user_factory/make_socio_factory de backend/conftest.py): nombre de archivo no predecible, reemplazo borra el anterior, GET /api/members/socios/{id}/certificado-medico/ (IsAdminOrOwnSocio) devuelve URL firmada de corta vida o 403/404, y un test que importe core.settings.production y afirme STORAGES['default']['BACKEND'] == SupabaseMediaStorage.
Implementación: migrar a STORAGES en settings, guardar la clave del objeto (campo nuevo certificado_medico_key + data migration), querystring_auth=True, quitar el armado manual de URL, exponer tiene_certificado en SocioSerializer. Frontend: reemplazar los enlaces directos (SocioColumns.jsx, SocioDetailModal.jsx, SocioFormModal.jsx, ProfilePage.jsx) por un botón que pide el enlace firmado vía sociosService.getCertificadoUrl y abre la URL; tests con vi.mock. Actualizá docs/deploy.md.
No uses credenciales reales. Terminado: pytest -q apps/members verde, npx vitest run src/components/admin src/pages/ProfilePage.test.jsx y npm run lint verdes. No hagas commits.
```
