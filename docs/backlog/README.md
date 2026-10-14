# Backlog de brechas del proyecto en vivo

Documentación **en código** de todo lo que falta o está roto en Winnie The Gym, pensada para que un agente de IA (o una persona) tome una ficha y la implemente sin volver a investigar. Cada ficha cita `archivo:línea` verificado contra el commit `3bc4755` (2026-10-13).

- **88 fichas** en [`items/`](items/), una por ítem, con la plantilla [`_TEMPLATE.md`](_TEMPLATE.md) (frontmatter + 13 secciones).
- Prioridades: **P0 = 19**, P1 = 38, P2 = 18, P3 = 13.
- Figma (`WuBKhksfVVcBjNKbDVX5EM`, página "vistas live") es solo apoyo visual opcional. La fuente de verdad es el código.
- **Plan de entrega, PRs y tareas de Verificación y Validación (Postman, Newman, E2E, accesibilidad):** [`PLAN-DE-ENTREGA.md`](PLAN-DE-ENTREGA.md).
- **Qué hacer en cada uno de los 22 PRs, paso a paso, con el número de issue de cada ficha:** [`PLAN-DE-PRS.md`](PLAN-DE-PRS.md). Los 173 issues ya están creados en GitHub (88 fichas, 66 casos de prueba, 6 bugs QA y 13 tareas de entrega), organizados en milestones.
- Reportes de bugs con captura de pantalla, en el formato de la cátedra: [`docs/qa/bug-reports.md`](../qa/bug-reports.md).

## Cómo usar una ficha con un agente

1. Elegí una ficha (empezá por P0 sin dependencias, ver orden más abajo).
2. Pegale al agente el bloque de la **sección 13** de la ficha ("Prompt listo para un agente de IA"). Es autocontenido.
3. **TDD estricto** (el proyecto lo tiene activo): primero los tests de la sección 9, verlos fallar, después el código. Si un test que debería fallar pasa (p. ej. BK-PLT-12), el agente **frena y reporta**: no hay nada que arreglar.
4. Lo que la ficha marca como **"No verificado"** o **"a confirmar"** se confirma con el primer test o con una consulta de solo lectura antes de tocar código.
5. Con SDD: cada ficha equivale a un `/sdd-new <slug>`; la sección 4 (alcance) es el proposal y la 10 (criterios de aceptación) son los escenarios del spec.

## Comandos del proyecto (verificados en el repo)

| Qué | Comando | Fuente |
|---|---|---|
| Tests frontend | `cd frontend && npm test` (`vitest run`) | `frontend/package.json:11` |
| Lint frontend | `cd frontend && npm run lint` (`--max-warnings 0`) | `frontend/package.json:10` |
| Tests backend | `cd backend && pytest` (cobertura mínima 80, `core.settings.test`) | `backend/pytest.ini:2,10` |
| CI | `.github/workflows/ci.yml` | — |
| Datos de prueba | `python manage.py seed_demo_users` y `backend/seed_data.py` | `backend/apps/users/management/commands/` |

Las cuentas de prueba por rol salen de `seed_demo_users`; las contraseñas **no** se copian acá, leelas del comando. Frontend local `http://localhost:5173`, backend `http://localhost:8001`.

## Causas raíz transversales (arreglar una vez, cierra varias fichas)

1. **Paginación**: `PAGE_SIZE: 10` global y sin `page_size_query_param` (`backend/core/settings/base.py:181-182`). Solo `SocioPagination` acepta `page_size` (`backend/apps/members/views.py:21`). Los hooks mandan `limit`/`page_size` y el backend los ignora. Afecta BK-CLS-01, BK-FIN-01, BK-ACC-05, BK-BUG-06, BK-SOC-09 y otras. **Decisión previa**: paginación configurable global vs. endpoints de agregación (BK-FIN-01 propone `GET /api/reportes/resumen/`).
2. **Tests que mockean contratos inexistentes**: `usePagos.test.jsx` fija `socio_id` (el filtro real es `socio`), tests de perfil mockean campos que el serializer no devuelve, tests de aforo tapan el fallback REST. Los tests verdes no prueban el contrato. Al corregir cada ficha, corregí también el test.
3. **Estado del socio/membresía solo se valida al escanear** (BK-SOC-08, BK-CLS-04, BK-FIN-07, BK-ACC-10). Conviene una función de elegibilidad única en backend.
4. **Navegación móvil** repartida entre BK-BUG-07, BK-MOB-01 y BK-MOB-02 (ver solapes).

## Orden de ejecución sugerido

**Ola 0 — seguridad y rotura inmediata** (S/M, sin dependencias, independientes entre sí)
BK-FIN-07 (membresía gratis) · BK-MOB-12 (cámara bloqueada en prod, confirmar con `curl -sI`) · BK-CLS-01 y BK-ACC-05 (paginación/contratos) · BK-BUG-01 · BK-BUG-03 · BK-BUG-04 · BK-SOC-02 · BK-SOC-03 + BK-FIN-05 (misma causa, ver solapes) · BK-PLT-12 (primero el test).

**Ola 1 — flujos centrales rotos**
BK-ACC-01 (salida en terminal) · BK-SOC-01 / BK-BUG-02 (alta en recepción) · BK-CLS-02 · BK-CLS-04 · BK-FIN-01 · BK-FIN-08 · BK-MOB-02 · BK-MOB-01 · BK-MOB-08.

**Ola 2 — P1 restantes**: sesión y errores (BK-PLT-01, 04, 06), reglas de acceso y aforo (BK-ACC-02..07, 09, 10, 12), clases (BK-CLS-03, 05..08), socios (BK-SOC-04..08, 11), pagos (BK-FIN-02..04, 06, 09), mobile (BK-MOB-03..08).

**Ola 3 — P2/P3**: mejoras e ideas a validar. Las `solo-idea` (P3) son **propuestas**, no compromisos: requieren decisión del dueño (ver sección 11 de cada ficha).

Ítems XL con prerrequisitos de modelo: **BK-CLS-09** (sesiones por fecha) bloquea a CLS-02, 04, 05, 06, 07, 08, 12, 13; **BK-FIN-06** (ciclo de vida de membresías) depende de FIN-05, 07 y 09.

## Solapes entre áreas (decidir quién implementa)

| Tema | Fichas | Recomendación |
|---|---|---|
| Pagos de otros socios en ficha de socio | BK-SOC-03 = BK-FIN-05 | Implementar una sola vez (FIN-05 incluye además badges de estado); SOC-03 queda como referencia. |
| Alta en recepción rota | BK-BUG-02 ≈ BK-SOC-01 | Misma causa (zod sin `telefono`, `create` solo admin). Implementar SOC-01 (más completa) y cerrar BUG-02. |
| Gráfico/métricas de reportes | BK-BUG-08 ⊂ BK-FIN-01 | FIN-01 resuelve el gráfico. |
| Navegación móvil | BK-BUG-07 ∩ BK-MOB-01 / BK-MOB-02 | MOB-01/02 implementan; BUG-07 aporta el inventario de enlaces rotos. |
| Modal (foco, ids, bottom sheet) | BK-BUG-09 ∩ BK-MOB-06 / BK-MOB-11 | Un solo cambio en `Modal`; hacer BUG-09 primero. |
| "Crear staff" invisible | BK-BUG-03 ∩ BK-MOB-03 | BUG-03 primero (S); MOB-03 migra al contrato nuevo. |
| Asistencia / lista de espera | BK-BUG-04, BK-BUG-05 ∩ BK-CLS-02, BK-CLS-03 | BUG-04 (redirect) primero; BUG-05 y CLS-02/03 comparten pantallas. |
| Calendario admin | BK-CLS-07 ∩ BK-MOB-05 | Coordinar: grilla fija y agenda móvil. |
| Aforo/horarios no aplicados | BK-PLT-14 ∩ BK-ACC-06 / BK-ACC-11 | PLT-14 es el síntoma, ACC-06/11 la solución. |
| Estados offline/error | BK-PLT-03 (BK-MOB-10 lo referencia) | PLT-03 implementa. |
| Recuperación de contraseña/emails | BK-SOC-11 ∩ BK-PLT-06 | Mismas plantillas y `Site`; hacer juntos. |
| Instructor / multi-sede | BK-CLS-11 ∩ BK-PLT-11, BK-CLS-10 ∩ BK-PLT-10 | Ideas P3: decidir producto antes de modelar. |

## Hallazgos sin ficha propia (a decidir o convertir en ficha)

Surgieron durante el relevamiento y están mencionados dentro de otras fichas, pero **no tienen ficha**:

- **Privacidad**: `GET /api/classes/clases/{id}/` expone nombre, apellido y número de socio de todos los inscriptos a cualquier usuario autenticado, incluido un socio (citado en BK-CLS-02). La auditoría Mongo guarda `model_to_dict` completo, incluido el hash de contraseña del `User` (citado en BK-PLT-13).
- **Permisos**: `POST /memberships/membresias/` es solo admin, la recepcionista no puede asignar plan (`backend/apps/memberships/views.py:57-60`); `GenerateQRView` es `IsAuthenticated` y emite QR a suspendidos (`backend/apps/access/views.py:36-47`).
- **Seguridad**: sin throttling en ningún endpoint DRF, incluido login y registro (citado en BK-ACC-12).
- **Datos**: `planes_habilitados` se guarda por nombre y no por id; DNI se valida distinto en 4 lugares y sin normalizar en backend (BK-SOC-07); `PlanMembresia.clases_asignadas` no se aplica en ningún lado; `dar_baja` no cancela membresías.
- **Paginación de staff y planes** truncada a 10 (`AdminUsuariosPage`, `usePlanesQuery`).
- **Doc incorrecta**: `docs/architecture.md:124` dice que el webhook llama a `renovar_membresia`, pero llama a `_activate_membership`.
- **Decisión de producto**: `/admin/socios` vs `/recepcion/socios` (páginas duplicadas); gestión de staff sin editar/desactivar/cambiar rol.

## Cómo leer el estado de una ficha

`estado_en_codigo`: `roto` (existe y falla) · `ui-parcial` · `backend-sin-ui` · `no-existe` · `solo-idea` (sin rastro en backend ni specs).

## Calidad y límites de este relevamiento

- Las **citas** (`archivo:línea`, 592 únicas) se validaron automáticamente: todos los archivos existen y las líneas caen dentro del rango. El **contenido** de las afirmaciones P0 más graves se contrastó a mano (BK-FIN-07, BK-FIN-05, BK-MOB-12, BK-ACC-01, BK-BUG-01, BK-CLS-01 en su parte de configuración). Las demás son lectura de código de cada agente: **tratalas como alta confianza, no como verdad absoluta**.
- **Nada se ejecutó**: el backend no estaba levantado durante el relevamiento. Lo que depende de runtime o de producción está marcado "No verificado" (p. ej. BK-SOC-04 default de dj-rest-auth, BK-SOC-05 storage de producción, BK-SOC-11 token de reseteo, BK-MOB-12 cabecera en el despliegue).
- Archivos con cambios del dueño sin commitear (`backend/loadtests/*`, `frontend/src/hooks/queries/usePlanes.test.jsx`, `frontend/src/hooks/useScreenWakeLock.js`): las fichas los marcan como **no tocar**.
- El `README.md` raíz promete brillo automático en recepción y el CHANGELOG menciona "notificación de acceso": ninguna de las dos existe en el código vigente (BK-MOB-10, BK-PLT-07).

## Índice completo por prioridad


### P0 — rompe algo hoy (19)

| id | título | tipo | prio | tamaño | estado en código | depende de |
|---|---|---|---|---|---|---|
| [BK-ACC-01](items/BK-ACC-01-terminal-registrar-salida.md) | Terminal de acceso sin flujo de salida (todo se registra como ENTRY) y salida bloqueada por membresía vencida | bug | P0 | M | roto | — |
| [BK-ACC-05](items/BK-ACC-05-contratos-rotos-aforo-y-logs.md) | Contratos frontend/backend desalineados en aforo y logs (limit ignorado, stats sin aforo_actual, "/200" hardcodeado) | bug | P0 | M | roto | — |
| [BK-BUG-01](items/BK-BUG-01-perfil-staff-devuelve-404.md) | El perfil de administrador/recepcionista nunca carga (GET /api/auth/profile/ devuelve 404) | bug | P0 | M | roto | — |
| [BK-BUG-02](items/BK-BUG-02-alta-socio-recepcion-falla-y-campos-falsos.md) | "Alta en Recepción" no puede crear socios (falta teléfono, 403 para recepcionista) y muestra campos que no existen | bug | P0 | M | roto | BK-FIN-01 |
| [BK-BUG-03](items/BK-BUG-03-crear-staff-boton-invisible-y-estado-activacion-falso.md) | El botón "Crear staff" no se renderiza (prop `actions` inexistente en TopBar) y el estado "Activo/Pendiente" es falso | bug | P0 | S | roto | — |
| [BK-BUG-04](items/BK-BUG-04-redirect-legacy-pierde-query-asistencia-clase-no-encontrada.md) | "Abrir terminal completa de asistencia" siempre termina en "Clase no encontrada" (el redirect legacy descarta ?id=) | bug | P0 | S | roto | — |
| [BK-CLS-01](items/BK-CLS-01-clases-truncadas-a-10-por-paginacion.md) | El listado de clases queda truncado a 10 registros (page_size ignorado) | bug | P0 | S | roto | — |
| [BK-CLS-02](items/BK-CLS-02-pasar-lista-roto-contrato-y-estado.md) | Pasar lista roto - modal y página de asistencia no respetan el contrato del backend | bug | P0 | M | roto | BK-CLS-09 |
| [BK-CLS-04](items/BK-CLS-04-reglas-de-reserva-sin-validar-en-backend.md) | Reglas de reserva sin validar en backend (membresía, planes habilitados, estado, concurrencia, ventana de cancelación) | bug | P0 | L | roto | BK-CLS-09,BK-CLS-10 |
| [BK-FIN-01](items/BK-FIN-01-reportes-metricas-reales.md) | Reportes - las métricas de la pantalla salen de datos truncados y de un gráfico fijo | bug | P0 | L | roto | BK-FIN-03,BK-FIN-05 |
| [BK-FIN-05](items/BK-FIN-05-pagos-membresias-ui-filtros-estados-bugs.md) | Ficha de socio y "Mis pagos" - historial de otro socio, estados cancelado/reembolsado en verde y datos crudos | bug | P0 | M | roto | — |
| [BK-FIN-07](items/BK-FIN-07-renovacion-self-service-me-renew-y-politica-de-apilado.md) | Renovación self-service - cerrar el endpoint que activa membresías gratis y definir la política de apilado de días | bug | P0 | M | roto | BK-FIN-08 |
| [BK-FIN-08](items/BK-FIN-08-pago-mercadopago-estados-webhook-retorno.md) | Pago con MercadoPago end-to-end - webhook robusto, estados completos (cancelado/reembolsado) y retorno del checkout confiable | bug | P0 | XL | ui-parcial | BK-FIN-07,BK-FIN-05 |
| [BK-MOB-01](items/BK-MOB-01-bottom-nav-staff-menu-mas.md) | Bottom nav de staff con menú "Más" (todas las rutas + perfil, tema y logout) | mobile | P0 | L | ui-parcial | BK-MOB-06,BK-MOB-08 |
| [BK-MOB-02](items/BK-MOB-02-navegacion-movil-socio.md) | Navegación móvil del socio sin callejones (Dashboard, Perfil y Mis Pagos sin nav; sin logout) | mobile | P0 | M | roto | BK-MOB-01,BK-MOB-06 |
| [BK-MOB-12](items/BK-MOB-12-permissions-policy-bloquea-camara-en-produccion.md) | La cabecera Permissions-Policy de Vercel bloquea la cámara y rompe el escaneo de QR en producción | bug | P0 | S | roto | — |
| [BK-SOC-01](items/BK-SOC-01-alta-recepcion-rota-sin-plan-ni-cobro.md) | El "Alta en Recepción" no puede crear socios (403 para recepcionista, teléfono faltante, plan y cobro de mentira) | bug | P0 | L | roto | BK-FIN-01 |
| [BK-SOC-02](items/BK-SOC-02-subida-apto-medico-en-perfil-no-funciona.md) | La subida del apto médico desde "Mi Perfil" (RF08 self-service) no hace nada | bug | P0 | S | roto | BK-SOC-05,BK-SOC-06 |
| [BK-SOC-03](items/BK-SOC-03-detalle-socio-pagos-de-otros-socios.md) | La pestaña "Pagos" del detalle de socio lista los pagos de TODOS los socios (filtro `socio_id` inexistente) | bug | P0 | S | roto | BK-FIN-01 |

### P1 — alto valor (38)

| id | título | tipo | prio | tamaño | estado en código | depende de |
|---|---|---|---|---|---|---|
| [BK-ACC-02](items/BK-ACC-02-anti-passback-y-estado-atencion.md) | Anti-passback (doble entrada / salida sin entrada) y estado "Atención" en el terminal | feature | P1 | M | ui-parcial | BK-ACC-01 |
| [BK-ACC-03](items/BK-ACC-03-historial-de-accesos.md) | Pantalla de historial de accesos (filtros, búsqueda por socio, rango, motivo, exportación) | feature | P1 | L | backend-sin-ui | BK-ACC-05 |
| [BK-ACC-04](items/BK-ACC-04-actividad-del-socio.md) | Pestaña "Actividad" en el detalle del socio (staff) y "Mi actividad" para el socio | feature | P1 | M | backend-sin-ui | BK-ACC-03,BK-ACC-05 |
| [BK-ACC-06](items/BK-ACC-06-aforo-maximo-bloqueo-y-alertas.md) | Aforo máximo efectivo — alertas de umbral y bloqueo opcional de ingresos al llegar a capacidad | feature | P1 | L | ui-parcial | BK-ACC-05,BK-ACC-01 |
| [BK-ACC-07](items/BK-ACC-07-aforo-desfasado-presentes-y-cierre-de-dia.md) | Corregir aforo desfasado — lista de presentes, salida manual y cierre automático de día | feature | P1 | L | no-existe | BK-ACC-01,BK-ACC-02 |
| [BK-ACC-09](items/BK-ACC-09-terminal-robustez-y-accesibilidad.md) | Terminal de acceso — robustez (cámara, red, DNI), feedback sonoro/háptico y accesibilidad | ui-estado | P1 | M | ui-parcial | BK-ACC-01 |
| [BK-ACC-10](items/BK-ACC-10-qr-socio-expiracion-estados-y-rnf07.md) | QR del socio — renovación confiable del token, estados bloqueado/suspendido y cierre de RNF07 (legibilidad y luminosidad) | mobile | P1 | L | ui-parcial | — |
| [BK-ACC-12](items/BK-ACC-12-seguridad-y-auditoria-del-acceso.md) | Seguridad y auditoría del acceso (logs inmutables, auditoría Mongo que no reintenta ni expira, rate limiting, WebSocket) | deuda-tecnica | P1 | M | roto | — |
| [BK-BUG-05](items/BK-BUG-05-asistencia-acciones-simuladas-y-lista-espera-vacia.md) | AttendancePage: "Habilitar" y "Cerrar asistencia" son simulados, la lista de espera muestra datos vacíos y el plan está fijo | bug | P1 | M | ui-parcial | BK-BUG-04,BK-CLS-01 |
| [BK-BUG-06](items/BK-BUG-06-planes-admin-campos-fantasma-y-matriz-comparativa-falsa.md) | Planes: subtítulo, beneficios y matriz comparativa no existen en el backend (la UI los muestra/guarda igual) y borrar un plan con membresías devuelve 500 | bug | P1 | M | ui-parcial | — |
| [BK-BUG-07](items/BK-BUG-07-navegacion-enlaces-rotos-y-duplicados.md) | Navegación: enlaces que redirigen, ítems duplicados, bottom nav de 6 ítems en grilla de 5, socio sin menú en /dashboard y /perfil, y búsqueda del TopBar que no filtra | bug | P1 | M | roto | BK-MOB-01 |
| [BK-CLS-03](items/BK-CLS-03-lista-de-espera-promocion-y-notificacion.md) | Lista de espera - "Habilitar" es falso, promoción incompleta y sin notificación al promovido | bug | P1 | M | roto | BK-CLS-02,BK-CLS-04 |
| [BK-CLS-05](items/BK-CLS-05-cancelacion-de-clase-notificacion-y-consistencia.md) | Cancelación de clase - emails duplicables, bypass por PUT, sin aviso a la espera ni visibilidad posterior | bug | P1 | M | ui-parcial | BK-CLS-09 |
| [BK-CLS-06](items/BK-CLS-06-formulario-de-clase-edicion-copia-y-validaciones.md) | Formulario de clase - edición, copia y validaciones (datos demo precargados, día/recurrencia inconsistentes, sin validación backend) | bug | P1 | M | ui-parcial | BK-CLS-01,BK-CLS-09,BK-CLS-10 |
| [BK-CLS-07](items/BK-CLS-07-calendario-admin-horario-fijo-domingo-y-semanas.md) | Calendario admin - grilla de horas fija (clases a las 07:30 invisibles), sin domingo, navegación de semanas decorativa y sin mobile | bug | P1 | M | ui-parcial | BK-CLS-01,BK-CLS-09,BK-CLS-10 |
| [BK-CLS-08](items/BK-CLS-08-clases-del-socio-movil-espera-fecha-y-filtros.md) | Clases del socio (mobile) - sin lista de espera, "hoy" erróneo de noche, reservas sin día y filtros incompletos | mobile | P1 | M | ui-parcial | BK-CLS-01,BK-CLS-03,BK-CLS-04,BK-CLS-09 |
| [BK-CLS-09](items/BK-CLS-09-sesiones-por-fecha-y-edicion-de-series.md) | Sesiones de clase por fecha (SesionClase) y edición de series recurrentes | feature | P1 | XL | no-existe | BK-CLS-01 |
| [BK-FIN-02](items/BK-FIN-02-reportes-exportes-validacion-rangos-totales.md) | Exportes de reportes - validar parámetros, rangos de fechas, filtro por plan, totales y columnas numéricas | bug | P1 | M | ui-parcial | BK-FIN-01 |
| [BK-FIN-03](items/BK-FIN-03-morosidad-calculo-alertas-recordatorios.md) | Morosidad y vencimientos - criterio correcto de "moroso", alertas del dashboard y recordatorios automáticos | bug | P1 | L | ui-parcial | BK-FIN-05 |
| [BK-FIN-04](items/BK-FIN-04-pagos-listado-global-admin.md) | Pantalla "Pagos y facturación" (listado global con filtros, totales y exporte) | feature | P1 | L | backend-sin-ui | BK-FIN-05,BK-FIN-02 |
| [BK-FIN-06](items/BK-FIN-06-membresias-ciclo-de-vida.md) | Gestión del ciclo de vida de membresías desde la UI (suspender, reactivar, cancelar, renovar, congelar) | feature | P1 | XL | backend-sin-ui | BK-FIN-05,BK-FIN-07,BK-FIN-09 |
| [BK-FIN-09](items/BK-FIN-09-cobro-manual-anulacion-auditoria-medio.md) | Cobro manual - registrar quién cobró y con qué medio, anular/corregir cobros y evitar duplicados | feature | P1 | L | ui-parcial | BK-FIN-06,BK-FIN-07,BK-FIN-05 |
| [BK-MOB-03](items/BK-MOB-03-topbar-responsive-acciones.md) | TopBar responsive (acciones a íconos / menú, buscador colapsable, toolbar de pestañas) y fix de props ignoradas | mobile | P1 | M | roto | BK-MOB-07,BK-BUG-03 |
| [BK-MOB-04](items/BK-MOB-04-datatable-modo-cards-movil.md) | DataTable con modo cards en móvil (+ hook useMediaQuery y helper de viewport para tests) | mobile | P1 | L | ui-parcial | BK-MOB-07 |
| [BK-MOB-05](items/BK-MOB-05-calendario-clases-agenda-movil.md) | Calendario de clases (staff) como agenda por día en móvil y tablet | mobile | P1 | M | roto | BK-MOB-04,BK-MOB-03,BK-CLS-07 |
| [BK-MOB-06](items/BK-MOB-06-modal-sheet-movil.md) | Modales como bottom sheet / pantalla completa en móvil (Modal: variante, footer fijo, scroll lock, foco) | mobile | P1 | M | ui-parcial | BK-BUG-09 |
| [BK-MOB-07](items/BK-MOB-07-formularios-botones-tactiles-inputmode.md) | Formularios y botones táctiles (alto mínimo 44 px, fuente 16 px, inputMode/autoComplete, labels asociadas) | mobile | P1 | M | ui-parcial | — |
| [BK-MOB-08](items/BK-MOB-08-safe-area-viewport-dvh.md) | Safe-area insets, viewport-fit=cover, unidades dvh y theme-color | mobile | P1 | S | roto | — |
| [BK-PLT-01](items/BK-PLT-01-error-boundary-pagina-500.md) | Error Boundary global y página de error inesperado (500) | ui-estado | P1 | M | no-existe | — |
| [BK-PLT-04](items/BK-PLT-04-sesion-expirada-redireccion-con-next.md) | Sesión expirada: mensaje contextual en el login y retorno a la ruta original (`next`) | ui-estado | P1 | M | ui-parcial | — |
| [BK-PLT-06](items/BK-PLT-06-email-activacion-staff-y-reset-sin-marca.md) | Email de activación de staff y de reseteo de contraseña usan la plantilla genérica de Django (sin marca, texto inadecuado, dominio de Site sin configurar) | bug | P1 | M | ui-parcial | — |
| [BK-PLT-12](items/BK-PLT-12-auditoria-actor-siempre-system.md) | Auditoría: el actor de los eventos de API queda como `system` (la identidad del usuario JWT no llega al middleware) | bug | P1 | S | roto | — |
| [BK-SOC-04](items/BK-SOC-04-cambio-password-no-verifica-password-actual.md) | El cambio de contraseña no verifica la contraseña actual ni cierra las demás sesiones | bug | P1 | S | roto | — |
| [BK-SOC-05](items/BK-SOC-05-apto-medico-almacenamiento-publico-y-url-produccion.md) | Apto médico: bucket público con nombres predecibles y almacenamiento de producción que probablemente no se aplica | deuda-tecnica | P1 | M | roto | BK-SOC-02 |
| [BK-SOC-06](items/BK-SOC-06-vigencia-apto-medico-y-avisos.md) | Vigencia del apto médico (fecha de vencimiento, estados y avisos) — hoy "tiene archivo = vigente" | feature | P1 | L | ui-parcial | BK-SOC-02,BK-SOC-05 |
| [BK-SOC-07](items/BK-SOC-07-abm-admin-socios-contrato-email-reactivar-validaciones.md) | ABM de socios (admin): email invisible/no editable, sin "Reactivar", DELETE peligroso, validaciones inconsistentes y estados de carga rotos | deuda-tecnica | P1 | M | ui-parcial | BK-SOC-08 |
| [BK-SOC-08](items/BK-SOC-08-socio-suspendido-o-baja-sigue-operando-en-portal.md) | Un socio suspendido o dado de baja sigue reservando clases, generando QR y renovando; el portal no se lo informa | bug | P1 | M | roto | BK-SOC-07,BK-ACC-01 |
| [BK-SOC-11](items/BK-SOC-11-activacion-y-recuperacion-de-contrasena.md) | Activación de cuenta y recuperación de contraseña: link/token a validar, emails en inglés con dominio por defecto, sin reenvío para socios | bug | P1 | M | roto | BK-SOC-01,BK-SOC-07 |

### P2 — mejora (18)

| id | título | tipo | prio | tamaño | estado en código | depende de |
|---|---|---|---|---|---|---|
| [BK-ACC-08](items/BK-ACC-08-analitica-historica-de-aforo.md) | Analítica histórica de aforo (por hora y por día, horas pico, permanencia promedio) | feature | P2 | L | no-existe | BK-ACC-05,BK-ACC-01 |
| [BK-ACC-11](items/BK-ACC-11-horarios-y-reglas-de-acceso.md) | Horarios de apertura/cierre efectivos y reglas de acceso por plan o por clase | feature | P2 | L | ui-parcial | BK-ACC-01 |
| [BK-BUG-08](items/BK-BUG-08-datos-hardcodeados-en-ui-sede-central-grafico-reportes-y-form-clases.md) | Datos inventados en la UI: "Sede Central" en la credencial, gráfico de ingresos con curva fija, formulario de clases pre-llenado y placeholders de rol | bug | P2 | M | ui-parcial | BK-BUG-06 |
| [BK-BUG-09](items/BK-BUG-09-filterpanel-recortado-y-accesibilidad-de-modal.md) | FilterPanel se recorta en el borde derecho (desktop) y el Modal no atrapa el foco ni devuelve el foco / repite ids | bug | P2 | S | roto | — |
| [BK-BUG-10](items/BK-BUG-10-deuda-tecnica-react-query-v5-y-codigo-muerto.md) | Deuda técnica: API de React Query v4 usada con v5 (`isLoading` de mutaciones, `keepPreviousData`) y código muerto (ComingSoonPage, rama `mock-`, rutas alias) | deuda-tecnica | P2 | S | roto | BK-BUG-04 |
| [BK-CLS-10](items/BK-CLS-10-catalogo-de-disciplinas-salas-y-sedes.md) | Catálogo configurable de disciplinas, salas (y sedes) en lugar de listas hardcodeadas | feature | P2 | L | no-existe | BK-CLS-06 |
| [BK-CLS-12](items/BK-CLS-12-reportes-de-clases-ocupacion-asistencia-y-no-shows.md) | Reportes de clases (ocupación y asistencia por clase/instructor), no-shows y cierre automático | feature | P2 | L | no-existe | BK-CLS-09,BK-CLS-02,BK-CLS-11 |
| [BK-FIN-10](items/BK-FIN-10-comprobantes-recibos-de-pago.md) | Comprobantes / recibos de pago (número, PDF descargable y envío por email) | feature | P2 | L | no-existe | BK-FIN-05,BK-FIN-08,BK-FIN-09 |
| [BK-MOB-09](items/BK-MOB-09-tablet-landscape-breakpoints.md) | Layout de tablet (768–1024 px) y orientación landscape | mobile | P2 | L | no-existe | BK-MOB-01,BK-MOB-04,BK-MOB-05,BK-MOB-08 |
| [BK-MOB-10](items/BK-MOB-10-pwa-instalable-y-wake-lock.md) | PWA instalable (manifest, service worker de shell, íconos) y ampliar Wake Lock más allá de la credencial | feature | P2 | L | ui-parcial | BK-MOB-08,BK-MOB-12 |
| [BK-MOB-11](items/BK-MOB-11-accesibilidad-movil-contraste-foco-targets.md) | Accesibilidad móvil (contraste de tokens, foco visible, targets de 44 px, landmarks y elementos clickeables) | deuda-tecnica | P2 | M | ui-parcial | BK-MOB-07 |
| [BK-PLT-02](items/BK-PLT-02-pagina-403-sin-permisos.md) | Pantalla 403 "Sin permisos" y manejo correcto de 403 de la API | ui-estado | P2 | M | no-existe | — |
| [BK-PLT-03](items/BK-PLT-03-estado-offline-sin-conexion.md) | Banner de sin conexión y manejo global de errores de red / servidor dormido | ui-estado | P2 | M | ui-parcial | — |
| [BK-PLT-13](items/BK-PLT-13-visor-de-auditoria-admin.md) | Visor de auditoría para administradores (quién cambió qué) | feature | P2 | L | backend-sin-ui | BK-PLT-12 |
| [BK-PLT-14](items/BK-PLT-14-config-aforo-y-horarios-no-se-aplican.md) | La configuración de aforo máximo y horarios no se aplica en el backend (solo se muestra) | bug | P2 | M | ui-parcial | BK-ACC-06 |
| [BK-SOC-09](items/BK-SOC-09-portal-socio-datos-faltantes-y-estados-de-error.md) | Portal del socio (dashboard, credencial, pagos): datos faltantes, fechas crudas, "próximas clases" truncadas y sin estados de error | ui-estado | P2 | M | ui-parcial | BK-SOC-06,BK-SOC-08,BK-CLS-01 |
| [BK-SOC-10](items/BK-SOC-10-datos-personales-ampliados-nacimiento-emergencia.md) | Datos personales ampliados del socio (fecha de nacimiento, género, contacto de emergencia) y saludo de cumpleaños | feature | P2 | M | ui-parcial | BK-SOC-01,BK-SOC-07 |
| [BK-SOC-12](items/BK-SOC-12-detalle-socio-actividad-notas-internas-e-historial.md) | Detalle de socio para staff: pestaña Actividad, notas internas con autor e historial de cambios | feature | P2 | L | backend-sin-ui | BK-ACC-01,BK-SOC-03,BK-SOC-07 |

### P3 — ideas a validar (13)

| id | título | tipo | prio | tamaño | estado en código | depende de |
|---|---|---|---|---|---|---|
| [BK-CLS-11](items/BK-CLS-11-instructor-modelo-y-rol.md) | Instructor como entidad (y rol Instructor) en lugar de texto libre | idea | P3 | XL | solo-idea | BK-CLS-09,BK-CLS-10 |
| [BK-CLS-13](items/BK-CLS-13-vista-mensual-feriados-y-cierres.md) | Vista mensual del calendario y gestión de feriados / cierres del gimnasio | idea | P3 | L | solo-idea | BK-CLS-09,BK-CLS-07 |
| [BK-FIN-11](items/BK-FIN-11-caja-diaria-y-cierre-de-turno.md) | Caja diaria y cierre de turno para cobros manuales (idea a validar) | idea | P3 | L | solo-idea | BK-FIN-09,BK-FIN-04 |
| [BK-MOB-13](items/BK-MOB-13-rendimiento-percibido-lazy-routes-fuentes-skeletons.md) | Rendimiento percibido en móvil (code-splitting por ruta, fuentes sin @import bloqueante, skeletons de carga) | deuda-tecnica | P3 | M | ui-parcial | — |
| [BK-PLT-05](items/BK-PLT-05-comingsoon-page-codigo-muerto.md) | ComingSoonPage sin uso: decidir entre eliminarla o usarla para secciones planificadas | deuda-tecnica | P3 | S | ui-parcial | — |
| [BK-PLT-07](items/BK-PLT-07-bandeja-notificaciones-in-app.md) | Bandeja de notificaciones in-app (campana con leídas / no leídas) | feature | P3 | L | solo-idea | BK-PLT-08 |
| [BK-PLT-08](items/BK-PLT-08-comunicaciones-masivas-por-segmento.md) | Comunicaciones: envío masivo por segmento y canales (email / push / WhatsApp) | feature | P3 | XL | solo-idea | BK-PLT-06 |
| [BK-PLT-09](items/BK-PLT-09-permisos-granulares-matriz-editable.md) | Permisos granulares por rol (matriz editable) sobre los 3 roles fijos | idea | P3 | XL | solo-idea | BK-PLT-02,BK-PLT-12 |
| [BK-PLT-10](items/BK-PLT-10-multi-sede.md) | Multi-sede: modelo Sede y su impacto en QR, aforo, planes, clases y reportes | idea | P3 | XL | solo-idea | BK-PLT-14 |
| [BK-PLT-11](items/BK-PLT-11-instructor-entrenador-asignado-y-rutinas.md) | Rol Instructor, entrenador asignado y rutinas personalizadas | idea | P3 | XL | solo-idea | BK-PLT-09 |
| [BK-PLT-15](items/BK-PLT-15-configuracion-ampliada-horarios-feriados-politicas.md) | Configuración ampliada: horarios por día, feriados, política de cancelación global y aforo por sala | idea | P3 | L | solo-idea | BK-PLT-14 |
| [BK-PLT-16](items/BK-PLT-16-operacion-backups-mongo-y-monitoreo-de-tareas.md) | Operación: sin backups de MongoDB y sin monitoreo de las tareas programadas (vencimientos) | deuda-tecnica | P3 | M | no-existe | — |
| [BK-SOC-13](items/BK-SOC-13-baja-de-cuenta-autogestionada-y-supresion-de-datos.md) | El socio puede pedir su baja y la supresión de sus datos desde "Mi Perfil" | idea | P3 | M | solo-idea | BK-SOC-08,BK-SOC-07 |


## Índice por área


### BUG — Bugs y deuda técnica visible (10)

| id | título | tipo | prio | tamaño | estado en código | depende de |
|---|---|---|---|---|---|---|
| [BK-BUG-01](items/BK-BUG-01-perfil-staff-devuelve-404.md) | El perfil de administrador/recepcionista nunca carga (GET /api/auth/profile/ devuelve 404) | bug | P0 | M | roto | — |
| [BK-BUG-02](items/BK-BUG-02-alta-socio-recepcion-falla-y-campos-falsos.md) | "Alta en Recepción" no puede crear socios (falta teléfono, 403 para recepcionista) y muestra campos que no existen | bug | P0 | M | roto | BK-FIN-01 |
| [BK-BUG-03](items/BK-BUG-03-crear-staff-boton-invisible-y-estado-activacion-falso.md) | El botón "Crear staff" no se renderiza (prop `actions` inexistente en TopBar) y el estado "Activo/Pendiente" es falso | bug | P0 | S | roto | — |
| [BK-BUG-04](items/BK-BUG-04-redirect-legacy-pierde-query-asistencia-clase-no-encontrada.md) | "Abrir terminal completa de asistencia" siempre termina en "Clase no encontrada" (el redirect legacy descarta ?id=) | bug | P0 | S | roto | — |
| [BK-BUG-05](items/BK-BUG-05-asistencia-acciones-simuladas-y-lista-espera-vacia.md) | AttendancePage: "Habilitar" y "Cerrar asistencia" son simulados, la lista de espera muestra datos vacíos y el plan está fijo | bug | P1 | M | ui-parcial | BK-BUG-04,BK-CLS-01 |
| [BK-BUG-06](items/BK-BUG-06-planes-admin-campos-fantasma-y-matriz-comparativa-falsa.md) | Planes: subtítulo, beneficios y matriz comparativa no existen en el backend (la UI los muestra/guarda igual) y borrar un plan con membresías devuelve 500 | bug | P1 | M | ui-parcial | — |
| [BK-BUG-07](items/BK-BUG-07-navegacion-enlaces-rotos-y-duplicados.md) | Navegación: enlaces que redirigen, ítems duplicados, bottom nav de 6 ítems en grilla de 5, socio sin menú en /dashboard y /perfil, y búsqueda del TopBar que no filtra | bug | P1 | M | roto | BK-MOB-01 |
| [BK-BUG-08](items/BK-BUG-08-datos-hardcodeados-en-ui-sede-central-grafico-reportes-y-form-clases.md) | Datos inventados en la UI: "Sede Central" en la credencial, gráfico de ingresos con curva fija, formulario de clases pre-llenado y placeholders de rol | bug | P2 | M | ui-parcial | BK-BUG-06 |
| [BK-BUG-09](items/BK-BUG-09-filterpanel-recortado-y-accesibilidad-de-modal.md) | FilterPanel se recorta en el borde derecho (desktop) y el Modal no atrapa el foco ni devuelve el foco / repite ids | bug | P2 | S | roto | — |
| [BK-BUG-10](items/BK-BUG-10-deuda-tecnica-react-query-v5-y-codigo-muerto.md) | Deuda técnica: API de React Query v4 usada con v5 (`isLoading` de mutaciones, `keepPreviousData`) y código muerto (ComingSoonPage, rama `mock-`, rutas alias) | deuda-tecnica | P2 | S | roto | BK-BUG-04 |

### FIN — Pagos, membresías y reportes (11)

| id | título | tipo | prio | tamaño | estado en código | depende de |
|---|---|---|---|---|---|---|
| [BK-FIN-01](items/BK-FIN-01-reportes-metricas-reales.md) | Reportes - las métricas de la pantalla salen de datos truncados y de un gráfico fijo | bug | P0 | L | roto | BK-FIN-03,BK-FIN-05 |
| [BK-FIN-02](items/BK-FIN-02-reportes-exportes-validacion-rangos-totales.md) | Exportes de reportes - validar parámetros, rangos de fechas, filtro por plan, totales y columnas numéricas | bug | P1 | M | ui-parcial | BK-FIN-01 |
| [BK-FIN-03](items/BK-FIN-03-morosidad-calculo-alertas-recordatorios.md) | Morosidad y vencimientos - criterio correcto de "moroso", alertas del dashboard y recordatorios automáticos | bug | P1 | L | ui-parcial | BK-FIN-05 |
| [BK-FIN-04](items/BK-FIN-04-pagos-listado-global-admin.md) | Pantalla "Pagos y facturación" (listado global con filtros, totales y exporte) | feature | P1 | L | backend-sin-ui | BK-FIN-05,BK-FIN-02 |
| [BK-FIN-05](items/BK-FIN-05-pagos-membresias-ui-filtros-estados-bugs.md) | Ficha de socio y "Mis pagos" - historial de otro socio, estados cancelado/reembolsado en verde y datos crudos | bug | P0 | M | roto | — |
| [BK-FIN-06](items/BK-FIN-06-membresias-ciclo-de-vida.md) | Gestión del ciclo de vida de membresías desde la UI (suspender, reactivar, cancelar, renovar, congelar) | feature | P1 | XL | backend-sin-ui | BK-FIN-05,BK-FIN-07,BK-FIN-09 |
| [BK-FIN-07](items/BK-FIN-07-renovacion-self-service-me-renew-y-politica-de-apilado.md) | Renovación self-service - cerrar el endpoint que activa membresías gratis y definir la política de apilado de días | bug | P0 | M | roto | BK-FIN-08 |
| [BK-FIN-08](items/BK-FIN-08-pago-mercadopago-estados-webhook-retorno.md) | Pago con MercadoPago end-to-end - webhook robusto, estados completos (cancelado/reembolsado) y retorno del checkout confiable | bug | P0 | XL | ui-parcial | BK-FIN-07,BK-FIN-05 |
| [BK-FIN-09](items/BK-FIN-09-cobro-manual-anulacion-auditoria-medio.md) | Cobro manual - registrar quién cobró y con qué medio, anular/corregir cobros y evitar duplicados | feature | P1 | L | ui-parcial | BK-FIN-06,BK-FIN-07,BK-FIN-05 |
| [BK-FIN-10](items/BK-FIN-10-comprobantes-recibos-de-pago.md) | Comprobantes / recibos de pago (número, PDF descargable y envío por email) | feature | P2 | L | no-existe | BK-FIN-05,BK-FIN-08,BK-FIN-09 |
| [BK-FIN-11](items/BK-FIN-11-caja-diaria-y-cierre-de-turno.md) | Caja diaria y cierre de turno para cobros manuales (idea a validar) | idea | P3 | L | solo-idea | BK-FIN-09,BK-FIN-04 |

### ACC — Control de acceso y aforo (12)

| id | título | tipo | prio | tamaño | estado en código | depende de |
|---|---|---|---|---|---|---|
| [BK-ACC-01](items/BK-ACC-01-terminal-registrar-salida.md) | Terminal de acceso sin flujo de salida (todo se registra como ENTRY) y salida bloqueada por membresía vencida | bug | P0 | M | roto | — |
| [BK-ACC-02](items/BK-ACC-02-anti-passback-y-estado-atencion.md) | Anti-passback (doble entrada / salida sin entrada) y estado "Atención" en el terminal | feature | P1 | M | ui-parcial | BK-ACC-01 |
| [BK-ACC-03](items/BK-ACC-03-historial-de-accesos.md) | Pantalla de historial de accesos (filtros, búsqueda por socio, rango, motivo, exportación) | feature | P1 | L | backend-sin-ui | BK-ACC-05 |
| [BK-ACC-04](items/BK-ACC-04-actividad-del-socio.md) | Pestaña "Actividad" en el detalle del socio (staff) y "Mi actividad" para el socio | feature | P1 | M | backend-sin-ui | BK-ACC-03,BK-ACC-05 |
| [BK-ACC-05](items/BK-ACC-05-contratos-rotos-aforo-y-logs.md) | Contratos frontend/backend desalineados en aforo y logs (limit ignorado, stats sin aforo_actual, "/200" hardcodeado) | bug | P0 | M | roto | — |
| [BK-ACC-06](items/BK-ACC-06-aforo-maximo-bloqueo-y-alertas.md) | Aforo máximo efectivo — alertas de umbral y bloqueo opcional de ingresos al llegar a capacidad | feature | P1 | L | ui-parcial | BK-ACC-05,BK-ACC-01 |
| [BK-ACC-07](items/BK-ACC-07-aforo-desfasado-presentes-y-cierre-de-dia.md) | Corregir aforo desfasado — lista de presentes, salida manual y cierre automático de día | feature | P1 | L | no-existe | BK-ACC-01,BK-ACC-02 |
| [BK-ACC-08](items/BK-ACC-08-analitica-historica-de-aforo.md) | Analítica histórica de aforo (por hora y por día, horas pico, permanencia promedio) | feature | P2 | L | no-existe | BK-ACC-05,BK-ACC-01 |
| [BK-ACC-09](items/BK-ACC-09-terminal-robustez-y-accesibilidad.md) | Terminal de acceso — robustez (cámara, red, DNI), feedback sonoro/háptico y accesibilidad | ui-estado | P1 | M | ui-parcial | BK-ACC-01 |
| [BK-ACC-10](items/BK-ACC-10-qr-socio-expiracion-estados-y-rnf07.md) | QR del socio — renovación confiable del token, estados bloqueado/suspendido y cierre de RNF07 (legibilidad y luminosidad) | mobile | P1 | L | ui-parcial | — |
| [BK-ACC-11](items/BK-ACC-11-horarios-y-reglas-de-acceso.md) | Horarios de apertura/cierre efectivos y reglas de acceso por plan o por clase | feature | P2 | L | ui-parcial | BK-ACC-01 |
| [BK-ACC-12](items/BK-ACC-12-seguridad-y-auditoria-del-acceso.md) | Seguridad y auditoría del acceso (logs inmutables, auditoría Mongo que no reintenta ni expira, rate limiting, WebSocket) | deuda-tecnica | P1 | M | roto | — |

### SOC — Socios, perfil y salud (13)

| id | título | tipo | prio | tamaño | estado en código | depende de |
|---|---|---|---|---|---|---|
| [BK-SOC-01](items/BK-SOC-01-alta-recepcion-rota-sin-plan-ni-cobro.md) | El "Alta en Recepción" no puede crear socios (403 para recepcionista, teléfono faltante, plan y cobro de mentira) | bug | P0 | L | roto | BK-FIN-01 |
| [BK-SOC-02](items/BK-SOC-02-subida-apto-medico-en-perfil-no-funciona.md) | La subida del apto médico desde "Mi Perfil" (RF08 self-service) no hace nada | bug | P0 | S | roto | BK-SOC-05,BK-SOC-06 |
| [BK-SOC-03](items/BK-SOC-03-detalle-socio-pagos-de-otros-socios.md) | La pestaña "Pagos" del detalle de socio lista los pagos de TODOS los socios (filtro `socio_id` inexistente) | bug | P0 | S | roto | BK-FIN-01 |
| [BK-SOC-04](items/BK-SOC-04-cambio-password-no-verifica-password-actual.md) | El cambio de contraseña no verifica la contraseña actual ni cierra las demás sesiones | bug | P1 | S | roto | — |
| [BK-SOC-05](items/BK-SOC-05-apto-medico-almacenamiento-publico-y-url-produccion.md) | Apto médico: bucket público con nombres predecibles y almacenamiento de producción que probablemente no se aplica | deuda-tecnica | P1 | M | roto | BK-SOC-02 |
| [BK-SOC-06](items/BK-SOC-06-vigencia-apto-medico-y-avisos.md) | Vigencia del apto médico (fecha de vencimiento, estados y avisos) — hoy "tiene archivo = vigente" | feature | P1 | L | ui-parcial | BK-SOC-02,BK-SOC-05 |
| [BK-SOC-07](items/BK-SOC-07-abm-admin-socios-contrato-email-reactivar-validaciones.md) | ABM de socios (admin): email invisible/no editable, sin "Reactivar", DELETE peligroso, validaciones inconsistentes y estados de carga rotos | deuda-tecnica | P1 | M | ui-parcial | BK-SOC-08 |
| [BK-SOC-08](items/BK-SOC-08-socio-suspendido-o-baja-sigue-operando-en-portal.md) | Un socio suspendido o dado de baja sigue reservando clases, generando QR y renovando; el portal no se lo informa | bug | P1 | M | roto | BK-SOC-07,BK-ACC-01 |
| [BK-SOC-09](items/BK-SOC-09-portal-socio-datos-faltantes-y-estados-de-error.md) | Portal del socio (dashboard, credencial, pagos): datos faltantes, fechas crudas, "próximas clases" truncadas y sin estados de error | ui-estado | P2 | M | ui-parcial | BK-SOC-06,BK-SOC-08,BK-CLS-01 |
| [BK-SOC-10](items/BK-SOC-10-datos-personales-ampliados-nacimiento-emergencia.md) | Datos personales ampliados del socio (fecha de nacimiento, género, contacto de emergencia) y saludo de cumpleaños | feature | P2 | M | ui-parcial | BK-SOC-01,BK-SOC-07 |
| [BK-SOC-11](items/BK-SOC-11-activacion-y-recuperacion-de-contrasena.md) | Activación de cuenta y recuperación de contraseña: link/token a validar, emails en inglés con dominio por defecto, sin reenvío para socios | bug | P1 | M | roto | BK-SOC-01,BK-SOC-07 |
| [BK-SOC-12](items/BK-SOC-12-detalle-socio-actividad-notas-internas-e-historial.md) | Detalle de socio para staff: pestaña Actividad, notas internas con autor e historial de cambios | feature | P2 | L | backend-sin-ui | BK-ACC-01,BK-SOC-03,BK-SOC-07 |
| [BK-SOC-13](items/BK-SOC-13-baja-de-cuenta-autogestionada-y-supresion-de-datos.md) | El socio puede pedir su baja y la supresión de sus datos desde "Mi Perfil" | idea | P3 | M | solo-idea | BK-SOC-08,BK-SOC-07 |

### CLS — Clases y asistencia (13)

| id | título | tipo | prio | tamaño | estado en código | depende de |
|---|---|---|---|---|---|---|
| [BK-CLS-01](items/BK-CLS-01-clases-truncadas-a-10-por-paginacion.md) | El listado de clases queda truncado a 10 registros (page_size ignorado) | bug | P0 | S | roto | — |
| [BK-CLS-02](items/BK-CLS-02-pasar-lista-roto-contrato-y-estado.md) | Pasar lista roto - modal y página de asistencia no respetan el contrato del backend | bug | P0 | M | roto | BK-CLS-09 |
| [BK-CLS-03](items/BK-CLS-03-lista-de-espera-promocion-y-notificacion.md) | Lista de espera - "Habilitar" es falso, promoción incompleta y sin notificación al promovido | bug | P1 | M | roto | BK-CLS-02,BK-CLS-04 |
| [BK-CLS-04](items/BK-CLS-04-reglas-de-reserva-sin-validar-en-backend.md) | Reglas de reserva sin validar en backend (membresía, planes habilitados, estado, concurrencia, ventana de cancelación) | bug | P0 | L | roto | BK-CLS-09,BK-CLS-10 |
| [BK-CLS-05](items/BK-CLS-05-cancelacion-de-clase-notificacion-y-consistencia.md) | Cancelación de clase - emails duplicables, bypass por PUT, sin aviso a la espera ni visibilidad posterior | bug | P1 | M | ui-parcial | BK-CLS-09 |
| [BK-CLS-06](items/BK-CLS-06-formulario-de-clase-edicion-copia-y-validaciones.md) | Formulario de clase - edición, copia y validaciones (datos demo precargados, día/recurrencia inconsistentes, sin validación backend) | bug | P1 | M | ui-parcial | BK-CLS-01,BK-CLS-09,BK-CLS-10 |
| [BK-CLS-07](items/BK-CLS-07-calendario-admin-horario-fijo-domingo-y-semanas.md) | Calendario admin - grilla de horas fija (clases a las 07:30 invisibles), sin domingo, navegación de semanas decorativa y sin mobile | bug | P1 | M | ui-parcial | BK-CLS-01,BK-CLS-09,BK-CLS-10 |
| [BK-CLS-08](items/BK-CLS-08-clases-del-socio-movil-espera-fecha-y-filtros.md) | Clases del socio (mobile) - sin lista de espera, "hoy" erróneo de noche, reservas sin día y filtros incompletos | mobile | P1 | M | ui-parcial | BK-CLS-01,BK-CLS-03,BK-CLS-04,BK-CLS-09 |
| [BK-CLS-09](items/BK-CLS-09-sesiones-por-fecha-y-edicion-de-series.md) | Sesiones de clase por fecha (SesionClase) y edición de series recurrentes | feature | P1 | XL | no-existe | BK-CLS-01 |
| [BK-CLS-10](items/BK-CLS-10-catalogo-de-disciplinas-salas-y-sedes.md) | Catálogo configurable de disciplinas, salas (y sedes) en lugar de listas hardcodeadas | feature | P2 | L | no-existe | BK-CLS-06 |
| [BK-CLS-11](items/BK-CLS-11-instructor-modelo-y-rol.md) | Instructor como entidad (y rol Instructor) en lugar de texto libre | idea | P3 | XL | solo-idea | BK-CLS-09,BK-CLS-10 |
| [BK-CLS-12](items/BK-CLS-12-reportes-de-clases-ocupacion-asistencia-y-no-shows.md) | Reportes de clases (ocupación y asistencia por clase/instructor), no-shows y cierre automático | feature | P2 | L | no-existe | BK-CLS-09,BK-CLS-02,BK-CLS-11 |
| [BK-CLS-13](items/BK-CLS-13-vista-mensual-feriados-y-cierres.md) | Vista mensual del calendario y gestión de feriados / cierres del gimnasio | idea | P3 | L | solo-idea | BK-CLS-09,BK-CLS-07 |

### PLT — Plataforma, estados, notificaciones e ideas (16)

| id | título | tipo | prio | tamaño | estado en código | depende de |
|---|---|---|---|---|---|---|
| [BK-PLT-01](items/BK-PLT-01-error-boundary-pagina-500.md) | Error Boundary global y página de error inesperado (500) | ui-estado | P1 | M | no-existe | — |
| [BK-PLT-02](items/BK-PLT-02-pagina-403-sin-permisos.md) | Pantalla 403 "Sin permisos" y manejo correcto de 403 de la API | ui-estado | P2 | M | no-existe | — |
| [BK-PLT-03](items/BK-PLT-03-estado-offline-sin-conexion.md) | Banner de sin conexión y manejo global de errores de red / servidor dormido | ui-estado | P2 | M | ui-parcial | — |
| [BK-PLT-04](items/BK-PLT-04-sesion-expirada-redireccion-con-next.md) | Sesión expirada: mensaje contextual en el login y retorno a la ruta original (`next`) | ui-estado | P1 | M | ui-parcial | — |
| [BK-PLT-05](items/BK-PLT-05-comingsoon-page-codigo-muerto.md) | ComingSoonPage sin uso: decidir entre eliminarla o usarla para secciones planificadas | deuda-tecnica | P3 | S | ui-parcial | — |
| [BK-PLT-06](items/BK-PLT-06-email-activacion-staff-y-reset-sin-marca.md) | Email de activación de staff y de reseteo de contraseña usan la plantilla genérica de Django (sin marca, texto inadecuado, dominio de Site sin configurar) | bug | P1 | M | ui-parcial | — |
| [BK-PLT-07](items/BK-PLT-07-bandeja-notificaciones-in-app.md) | Bandeja de notificaciones in-app (campana con leídas / no leídas) | feature | P3 | L | solo-idea | BK-PLT-08 |
| [BK-PLT-08](items/BK-PLT-08-comunicaciones-masivas-por-segmento.md) | Comunicaciones: envío masivo por segmento y canales (email / push / WhatsApp) | feature | P3 | XL | solo-idea | BK-PLT-06 |
| [BK-PLT-09](items/BK-PLT-09-permisos-granulares-matriz-editable.md) | Permisos granulares por rol (matriz editable) sobre los 3 roles fijos | idea | P3 | XL | solo-idea | BK-PLT-02,BK-PLT-12 |
| [BK-PLT-10](items/BK-PLT-10-multi-sede.md) | Multi-sede: modelo Sede y su impacto en QR, aforo, planes, clases y reportes | idea | P3 | XL | solo-idea | BK-PLT-14 |
| [BK-PLT-11](items/BK-PLT-11-instructor-entrenador-asignado-y-rutinas.md) | Rol Instructor, entrenador asignado y rutinas personalizadas | idea | P3 | XL | solo-idea | BK-PLT-09 |
| [BK-PLT-12](items/BK-PLT-12-auditoria-actor-siempre-system.md) | Auditoría: el actor de los eventos de API queda como `system` (la identidad del usuario JWT no llega al middleware) | bug | P1 | S | roto | — |
| [BK-PLT-13](items/BK-PLT-13-visor-de-auditoria-admin.md) | Visor de auditoría para administradores (quién cambió qué) | feature | P2 | L | backend-sin-ui | BK-PLT-12 |
| [BK-PLT-14](items/BK-PLT-14-config-aforo-y-horarios-no-se-aplican.md) | La configuración de aforo máximo y horarios no se aplica en el backend (solo se muestra) | bug | P2 | M | ui-parcial | BK-ACC-06 |
| [BK-PLT-15](items/BK-PLT-15-configuracion-ampliada-horarios-feriados-politicas.md) | Configuración ampliada: horarios por día, feriados, política de cancelación global y aforo por sala | idea | P3 | L | solo-idea | BK-PLT-14 |
| [BK-PLT-16](items/BK-PLT-16-operacion-backups-mongo-y-monitoreo-de-tareas.md) | Operación: sin backups de MongoDB y sin monitoreo de las tareas programadas (vencimientos) | deuda-tecnica | P3 | M | no-existe | — |

### MOB — Mobile y responsive (13)

| id | título | tipo | prio | tamaño | estado en código | depende de |
|---|---|---|---|---|---|---|
| [BK-MOB-01](items/BK-MOB-01-bottom-nav-staff-menu-mas.md) | Bottom nav de staff con menú "Más" (todas las rutas + perfil, tema y logout) | mobile | P0 | L | ui-parcial | BK-MOB-06,BK-MOB-08 |
| [BK-MOB-02](items/BK-MOB-02-navegacion-movil-socio.md) | Navegación móvil del socio sin callejones (Dashboard, Perfil y Mis Pagos sin nav; sin logout) | mobile | P0 | M | roto | BK-MOB-01,BK-MOB-06 |
| [BK-MOB-03](items/BK-MOB-03-topbar-responsive-acciones.md) | TopBar responsive (acciones a íconos / menú, buscador colapsable, toolbar de pestañas) y fix de props ignoradas | mobile | P1 | M | roto | BK-MOB-07,BK-BUG-03 |
| [BK-MOB-04](items/BK-MOB-04-datatable-modo-cards-movil.md) | DataTable con modo cards en móvil (+ hook useMediaQuery y helper de viewport para tests) | mobile | P1 | L | ui-parcial | BK-MOB-07 |
| [BK-MOB-05](items/BK-MOB-05-calendario-clases-agenda-movil.md) | Calendario de clases (staff) como agenda por día en móvil y tablet | mobile | P1 | M | roto | BK-MOB-04,BK-MOB-03,BK-CLS-07 |
| [BK-MOB-06](items/BK-MOB-06-modal-sheet-movil.md) | Modales como bottom sheet / pantalla completa en móvil (Modal: variante, footer fijo, scroll lock, foco) | mobile | P1 | M | ui-parcial | BK-BUG-09 |
| [BK-MOB-07](items/BK-MOB-07-formularios-botones-tactiles-inputmode.md) | Formularios y botones táctiles (alto mínimo 44 px, fuente 16 px, inputMode/autoComplete, labels asociadas) | mobile | P1 | M | ui-parcial | — |
| [BK-MOB-08](items/BK-MOB-08-safe-area-viewport-dvh.md) | Safe-area insets, viewport-fit=cover, unidades dvh y theme-color | mobile | P1 | S | roto | — |
| [BK-MOB-09](items/BK-MOB-09-tablet-landscape-breakpoints.md) | Layout de tablet (768–1024 px) y orientación landscape | mobile | P2 | L | no-existe | BK-MOB-01,BK-MOB-04,BK-MOB-05,BK-MOB-08 |
| [BK-MOB-10](items/BK-MOB-10-pwa-instalable-y-wake-lock.md) | PWA instalable (manifest, service worker de shell, íconos) y ampliar Wake Lock más allá de la credencial | feature | P2 | L | ui-parcial | BK-MOB-08,BK-MOB-12 |
| [BK-MOB-11](items/BK-MOB-11-accesibilidad-movil-contraste-foco-targets.md) | Accesibilidad móvil (contraste de tokens, foco visible, targets de 44 px, landmarks y elementos clickeables) | deuda-tecnica | P2 | M | ui-parcial | BK-MOB-07 |
| [BK-MOB-12](items/BK-MOB-12-permissions-policy-bloquea-camara-en-produccion.md) | La cabecera Permissions-Policy de Vercel bloquea la cámara y rompe el escaneo de QR en producción | bug | P0 | S | roto | — |
| [BK-MOB-13](items/BK-MOB-13-rendimiento-percibido-lazy-routes-fuentes-skeletons.md) | Rendimiento percibido en móvil (code-splitting por ruta, fuentes sin @import bloqueante, skeletons de carga) | deuda-tecnica | P3 | M | ui-parcial | — |
