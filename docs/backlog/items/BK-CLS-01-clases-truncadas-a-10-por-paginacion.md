---
id: BK-CLS-01
titulo: El listado de clases queda truncado a 10 registros (page_size ignorado)
tipo: bug
roles: [administrador, recepcionista, socio]
prioridad: P0
tamano: S
estado_en_codigo: roto
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-CLS-01 · El listado de clases queda truncado a 10 registros (page_size ignorado)

## 1. Resumen
El frontend pide "todas las clases" con `?page_size=1000`, pero el backend usa `PageNumberPagination` de DRF sin `page_size_query_param`, así que ignora el parámetro y devuelve solo la primera página (10 clases ordenadas por `id`). Apenas el gimnasio tenga más de 10 clases, el calendario, la lista, el catálogo del socio, "Mis reservas" y el dashboard dejan de mostrar las demás sin ningún aviso. Es un bug latente (hoy el seed solo crea 3 clases) que rompe el flujo completo en producción real.

## 2. Objetivo de usuario
Como **recepcionista** quiero **ver todas las clases programadas en el calendario y en la lista** para **no ofrecerle a un socio una agenda incompleta ni perder clases de vista**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend config | `backend/core/settings/base.py:181-182` | `'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination'`, `'PAGE_SIZE': 10`. Sin `page_size_query_param` global. |
| Backend vista | `backend/apps/classes/views.py:48-54` | `ClaseViewSet` no define `pagination_class`, hereda la global. |
| Backend precedente | `backend/apps/members/views.py:18-21` | `SocioPagination` sí define `page_size = 10`, `page_size_query_param = 'page_size'`, `max_page_size = 100`. Clases no tiene algo equivalente. |
| Frontend hook | `frontend/src/hooks/queries/useClases.js:20-32` | `useClasesList` manda `params: { page_size: ALL_RECORDS_PAGE_SIZE, ...params }` y lee `res.data.results ?? res.data` (se queda con la primera página sin chequear `next`). |
| Frontend const | `frontend/src/constants/pagination.js:5` | `ALL_RECORDS_PAGE_SIZE = 1000` con comentario "workaround until backend supports dedicated endpoints". |
| Frontend consumidores | `frontend/src/pages/ClassSchedulePage.jsx:33`, `frontend/src/pages/socio/ClasesPage.jsx:68-75`, `frontend/src/hooks/queries/useDashboardData.js:73` | Todos asumen que reciben la lista completa. |
| Frontend duplicar | `frontend/src/pages/CreateClassPage.jsx:121` | `api.get('/classes/clases/')` sin params: toma `results[0]`. |
| Tests | `backend/apps/classes/tests/` (ningún test usa más de 10 clases ni `page_size`) | La falla no está cubierta. |

**No verificado en runtime**: el backend local (`localhost:8001`) no estaba levantado al relevar. La conclusión sale de leer la config (DRF `PageNumberPagination.page_size_query_param` es `None` por defecto) y de que ningún archivo de `apps/classes` redefine la paginación. Confirmarlo con el test de la sección 9 antes de tocar nada.

## 4. Alcance
**Incluye:**
- Clase `ClasePagination` con `page_size_query_param = 'page_size'` y `max_page_size = 1000`, asignada a `ClaseViewSet`.
- Test de regresión backend (25 clases, `?page_size=1000` devuelve 25).
- Ajustar `handleDuplicateFromExisting` solo en lo que toca a paginación (se rediseña en BK-CLS-06).

**No incluye:**
- Eliminar el workaround `ALL_RECORDS_PAGE_SIZE` de otros hooks (socios, pagos, etc.): otras áreas.
- Optimizar N+1 de `cupos_reservados` (se menciona en riesgos; ver BK-CLS-04/BK-CLS-12).
- Endpoint dedicado "agenda semanal" (queda como evolución en BK-CLS-09).

## 5. Contrato de API
**[EXISTE]** `GET /api/classes/clases/` — permiso `IsAuthenticated` (`views.py:70`).
- Query actual relevante: `page`, `search`, `categoria`, `dia`, `estado`, `hora_desde`, `hora_hasta`, `cupo_disponible`, `incluir_canceladas`, `ordering`.
- **[A CREAR]** query `page_size` (int, default 10, máximo 1000).
- Response: `{"count": N, "next": url|null, "previous": url|null, "results": [ClaseSerializer...]}` (campos en `serializers.py:30-54`: `id, nombre, categoria, descripcion, dia, hora, duracion_min, sala, instructor, instructor_nombre, cupo_maximo, cupos_reservados, lista_espera_max, cancelacion_horas, planes_habilitados, recurrencia, dias_recurrencia, estado, created_at, updated_at, user_inscrito`).
- Errores: `page_size` inválido o mayor al máximo se recorta al máximo (comportamiento DRF), `page` inexistente → `404 {"detail": "Invalid page."}`.

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
- Sin cambios obligatorios: el hook ya manda `page_size`. Una vez que el backend lo respete, ClassSchedulePage/ClasesPage reciben todas las clases.
- Defensa opcional: en `useClasesList` si la respuesta trae `next` no nulo, loguear `console.warn` en DEV (no mostrar al usuario).
- Convenciones del repo: queries en `frontend/src/hooks/queries/*.js` con factory de keys (`CLASES_QUERY_KEYS`), cliente HTTP `frontend/src/services/api.js` (axios, `baseURL = VITE_API_URL || '/api'`, JWT del `authStore` en interceptor).
- Estados de UI: sin cambios (loading con `EmptyState` "Cargando calendario...").
- Responsive: sin cambios.

## 8. Archivos a crear / modificar
- `backend/apps/classes/pagination.py` (nuevo): `ClasePagination(PageNumberPagination)`.
- `backend/apps/classes/views.py`: `pagination_class = ClasePagination` en `ClaseViewSet` (y evaluar lo mismo en `InscripcionClaseViewSet`).
- `backend/apps/classes/tests/test_classes_pagination.py` (nuevo).

## 9. Plan de pruebas (TDD)
Convención backend: tests por app en `backend/apps/classes/tests/`, `APITestCase` + `make_user_factory`/`make_socio_factory` de `backend/conftest.py`, auth con `RefreshToken.for_user(user).access_token` (ver `test_soft_cancel.py:10-12`). Correr: `cd backend && pytest apps/classes -q` (usa `core.settings.test`, `--cov-fail-under=80` en `pytest.ini`).
1. (rojo primero) Crear 25 clases; `GET /api/classes/clases/?page_size=1000` como recepcionista → `len(results) == 25`.
2. `GET /api/classes/clases/` sin `page_size` → `len(results) == 10` y `next` no nulo.
3. `?page_size=5000` → máximo 1000 (o 25 si hay 25).
4. Socio autenticado también puede listar (200).
Frontend: sin tests nuevos obligatorios; `useClases.test.jsx` ya mockea `api.get`.
Manual: sembrar 12 clases (shell Django), entrar como `recepcion@winnie.local` a `/admin/clases` y verificar que aparecen las 12 en la vista Lista y en el calendario.

## 10. Criterios de aceptación
- **Dado** 25 clases activas **cuando** el frontend pide `/api/classes/clases/?page_size=1000` **entonces** la respuesta trae 25 resultados.
- **Dado** que no se manda `page_size` **cuando** se lista **entonces** se mantiene el tamaño por defecto 10.
- **Dado** 12 clases **cuando** un socio abre `/socio/clases` **entonces** el catálogo filtrado por día muestra todas las clases de ese día, no solo las del primer lote.

## 11. Riesgos y decisiones abiertas
- ¿Máximo 1000 está bien? Recomendación: sí por ahora; la agenda real de un gimnasio tiene decenas de plantillas. Si se avanza con BK-CLS-09 (sesiones por fecha) conviene un endpoint de rango de fechas en vez de "traer todo".
- `cupos_reservados` y `user_inscrito` hacen 1 y 1 consultas por clase (`models.py:54-56`, `serializers.py:60-68`): con 1000 clases son 2000 queries. Recomendación: `annotate(Count)` en `get_queryset` en el mismo cambio o en BK-CLS-04.
- `filter_cupo_disponible` itera todo el queryset en Python (`filters.py:59-68`).

## 12. Referencias
- `speckit/class-model-architecture-decision/explore.md` §1 (N+1 en `cupos_reservados`).
- Figma opcional: no aplica (bug de datos).

## 13. Prompt listo para un agente de IA
Contexto: repo Winnie The Gym (Django REST + React). `frontend/src/hooks/queries/useClases.js` pide `/classes/clases/?page_size=1000` pero `backend/core/settings/base.py:181-182` usa `PageNumberPagination` con `PAGE_SIZE=10` y sin `page_size_query_param`, por lo que solo llegan 10 clases.
Tarea (TDD): 1) crear `backend/apps/classes/tests/test_classes_pagination.py` (APITestCase, `make_user_factory(rol='recepcionista')`, auth con `RefreshToken.for_user`) con los casos 1-4 de la sección 9 y verlos fallar; 2) crear `backend/apps/classes/pagination.py` con `class ClasePagination(PageNumberPagination): page_size = 10; page_size_query_param = 'page_size'; max_page_size = 1000` (modelo: `SocioPagination` en `backend/apps/members/views.py:18-21`); 3) asignar `pagination_class = ClasePagination` en `ClaseViewSet` (`backend/apps/classes/views.py`); 4) correr `cd backend && pytest apps/classes -q` y que quede todo verde. No tocar archivos de otras áreas ni `backend/loadtests/*`. Definición de terminado: tests nuevos verdes, suite de `apps/classes` verde, sin cambios de contrato en los campos de respuesta.
