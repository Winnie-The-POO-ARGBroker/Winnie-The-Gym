---
id: BK-FIN-10
titulo: Comprobantes / recibos de pago (número, PDF descargable y envío por email)
tipo: feature
roles: [socio, administrador, recepcionista]
prioridad: P2
tamano: L
estado_en_codigo: no-existe
verificado_contra: 3bc4755 (2026-10-13)
depende_de: [BK-FIN-05, BK-FIN-08, BK-FIN-09]
---

# BK-FIN-10 · Comprobantes / recibos de pago

## 1. Resumen
Hoy el único "comprobante" de un pago es el email de confirmación con monto y el id de MercadoPago. No hay número de comprobante, ni PDF, ni descarga desde la app, aunque el spec de "Mis pagos" lo prometía (columna "comprobante"). Se propone un recibo interno mínimo (no fiscal) con numeración, PDF generado en el backend y descarga para socio y staff. La factura electrónica fiscal es una decisión legal aparte.

## 2. Objetivo de usuario
Como **socio** quiero **descargar el comprobante de cada pago aprobado** para **tener constancia de lo que pagué**; como **recepcionista** quiero **entregar/enviar el recibo de un cobro manual en el momento** para **resolver reclamos sin buscar en la base**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/apps/payments/models.py:37-51` | `Pago` **no tiene** `numero_comprobante` ni ningún campo de comprobante. Identificadores disponibles: `id`, `mp_payment_id`, `mp_external_reference`. |
| Backend serializer | `backend/apps/payments/serializers.py:14-32` | `PagoSerializer` no expone comprobante (ni `raw_webhook`). |
| Backend email | `backend/apps/common/templates/emails/payment_confirmation.txt:1-10`, `backend/apps/payments/services.py:47-65` | Mail "Confirmamos tu pago en Winnie The Gym": plan, monto, moneda, fecha de vencimiento, `mp_payment_id`, link al panel. Sin adjunto ni número de recibo. Se envía solo en `approved` y cobro manual (`services.py:188,305-306`). |
| Backend PDF | `backend/apps/reports/exporters.py:50-87`, `backend/requirements/base.txt` | Existe `reportlab==4.2.5` y un exportador PDF **genérico de tablas** (A4 apaisado) para reportes; no hay generador de recibos. |
| Backend config del gimnasio | `backend/apps/common/models.py:4-14` | `GymConfig` solo tiene `nombre_gym`, `aforo_maximo`, `hora_apertura`, `hora_cierre`, `telefono_contacto`; **sin** razón social, CUIT, domicilio fiscal ni condición frente al IVA, datos que un recibo necesita. |
| Frontend socio | `frontend/src/pages/socio/HistorialPagosPage.jsx:58-62` | Columnas Fecha, Plan, Monto, Método, Estado: **sin** acción de descarga. |
| Frontend staff | `frontend/src/components/pagos/HistorialPagosCard.jsx:107-135`, `components/admin/SocioDetailModal.jsx:187-232` | Sin acción de comprobante. |
| Frontend descarga | `frontend/src/services/reportsService.js:30-40` | `triggerBlobDownload(blob, filename)` y `getFilenameFromDisposition` ya existen para descargas por `Blob` (reutilizables). |
| Spec | `speckit/spec.md:214-230` (REQ-3.3) | Pide "Tabla con sus pagos históricos (fecha, monto, plan, estado, método, **comprobante**)"; la implementación (`HistorialPagosPage`) quedó sin esa columna. No hay otro spec de comprobantes: `rg -i "comprobante|recibo"` en `docs`, `speckit`, `openspec`, `README.md` y `CHANGELOG.md` solo encuentra esa línea (las menciones a "factura/facturación" son del reporte mensual de ingresos). |
| DB docs | `docs/database/mer.md:147` | Reembolsos: "el registro contable persiste" (el recibo de un pago reembolsado debería seguir existiendo, con leyenda). |

## 4. Alcance
**Incluye (propuesta mínima, "recibo interno"):**
- Numeración correlativa de recibos (`R-AAAA-NNNNNN`) asignada al aprobarse un pago (MP o manual).
- PDF de una página generado con `reportlab` (datos del gimnasio, socio, plan, período cubierto, monto, medio, N.º de pago MP si aplica, leyenda "Comprobante de pago - Documento no válido como factura").
- Endpoint de descarga (socio: solo los propios; staff: cualquiera).
- Botones "Comprobante" en Mis pagos, ficha de socio, historial del cobro manual y tras registrar un cobro.
- Opcional: adjuntar el PDF al email de confirmación (decisión 3).

**No incluye:** factura electrónica ARCA/AFIP (decisión 1), notas de crédito por reembolso, cuenta corriente, envío por WhatsApp.

## 5. Contrato de API
**[A CREAR]** `GET /api/payments/pagos/{id}/comprobante/` (staff, `IsReceptionistOrAdmin`) y `GET /api/payments/pagos/mis-pagos/{id}/comprobante/` (socio, `IsSocio`, solo si `pago.socio.usuario == request.user`; de otro socio -> `404`).
- Response `200`: `application/pdf`, `Content-Disposition: attachment; filename="comprobante-R-2026-000123.pdf"`.
- Errores: `400` `{"detail": "El comprobante solo está disponible para pagos aprobados o reembolsados."}` (estados `pendiente/rechazado/cancelado`), `404`, `403`.
- `PagoSerializer` agrega `numero_comprobante` (str o `null`).
Implementación: `apps/payments/receipts.py::build_receipt_pdf(pago) -> bytes` (reportlab `SimpleDocTemplate`, A4 vertical), vistas con `HttpResponse(content_type='application/pdf')` como `export_pdf` (`reports/exporters.py:85-87`).

## 6. Modelo de datos (propuesta)
Migración `payments/0002_...` (coordinar con BK-FIN-08/09):
- `Pago.numero_comprobante = CharField(max_length=20, null=True, blank=True, unique=True)`; asignación al pasar a `aprobado` dentro de la misma transacción: `R-{año}-{pk:06d}` (simple, único, sin secuencias) o secuencia PostgreSQL dedicada si el contador debe ser sin saltos (decisión 2).
- `GymConfig`: `razon_social` (CharField 120, blank), `cuit` (CharField 13, blank), `domicilio` (CharField 200, blank), `condicion_iva` (CharField 40, blank) + exposición en `apps/common/serializers.py`/`AdminConfiguracionPage` (**No verificado** el formulario actual de configuración; ver `frontend/src/pages/admin/AdminConfiguracionPage.jsx` y `hooks/queries/useGymConfig.js`).
- Migración de datos: numerar retroactivamente los pagos `aprobado` existentes (por `paid_at`).

## 7. Diseño frontend
- **Rutas/guard:** sin rutas nuevas; acciones dentro de pantallas existentes (`/socio/pagos` `roles=['socio']`, ficha en `/admin/socios`, `/recepcion/cobros`).
- **Servicio nuevo** `frontend/src/services/pagosService.js::descargarComprobante(pagoId, { esSocio })`: `api.get(url, { responseType: 'blob' })` + `getFilenameFromDisposition` + `triggerBlobDownload` importados de `./reportsService` (mover a `src/utils/download.js` si se prefiere no acoplar servicios).
- **Hook** `useDescargarComprobante()` en `hooks/queries/usePagos.js` (`useMutation`; `toast.loading` -> `toast.success('Comprobante descargado')`/`toast.error`, mismo patrón que `ReportesPage.handleExport`, `ReportesPage.jsx:70-86`).
- **UI:** ícono `FileDown` (`lucide-react`) con `aria-label="Descargar comprobante"` en cada fila con estado aprobado/reembolsado (`HistorialPagosPage`, `HistorialPagosCard`, pestaña Pagos de `SocioDetailModal`, pantalla BK-FIN-04) y en el éxito de `CobroManualPage` ("Descargar comprobante").
- **Estados:** loading (botón con `loading`), error (toast con `detail`), vacío (no se muestra el botón para pendiente/rechazado/cancelado), éxito (descarga).
- **Textos (voseo):** "Descargar comprobante", "Generando comprobante...", "No hay comprobante para pagos pendientes o rechazados." Leyenda del PDF: "Comprobante de pago. Documento no válido como factura."
- **Responsive:** botón de ícono táctil de 44 px en filas mobile.

## 8. Archivos a crear / modificar
- Backend: `payments/models.py` + migración, `payments/receipts.py` (nuevo), `payments/services.py` (asignar número al aprobar, en webhook y cobro manual), `payments/views.py` (acciones `comprobante`), `payments/serializers.py`, `common/models.py` + migración (`GymConfig`), `payments/tests/test_comprobante.py`, plantilla email (opcional adjunto: `enqueue_email` hoy no soporta adjuntos, `common/tasks.py:30-42` y `common/emails.py:25-62` requerirían un parámetro `attachments`).
- Frontend: `services/pagosService.js`, `hooks/queries/usePagos.js`, `HistorialPagosPage.jsx`, `HistorialPagosCard.jsx`, `SocioDetailModal.jsx`, `CobroManualPage.jsx`, tests asociados.

## 9. Plan de pruebas (TDD)
**Backend** (`cd backend && pytest -q apps/payments/tests/test_comprobante.py`; `APITestCase` + `RefreshToken`, factories `conftest.py:23-75`; `Pago` creados directo como en `test_webhook.py:42-48`):
1. Al aprobarse un pago (webhook y cobro manual) se asigna `numero_comprobante` único; un segundo webhook no lo cambia.
2. `GET .../{id}/comprobante/` staff -> `200`, `Content-Type: application/pdf`, el cuerpo empieza con `%PDF-`; `Content-Disposition` con el número.
3. Socio descarga el propio; el de otro socio -> `404`.
4. Pago `pendiente`/`rechazado`/`cancelado` -> `400`.
5. Pago `reembolsado` -> PDF con la leyenda "Reembolsado" (verificar extrayendo texto con `pypdf` si se agrega, o comprobando que `build_receipt_pdf` recibe el estado).
6. Numeración retroactiva (migración de datos) ordena por `paid_at`.
**Frontend** (`npx vitest run`): botón visible solo para aprobado/reembolsado; click llama al servicio con `responseType: 'blob'` y dispara la descarga (mock de `window.URL.createObjectURL`; existe `frontend/src/services/__tests__/reportsService.test.js` como molde, **No verificado** su detalle); error muestra toast.
**Manual:** descargar con `socio.activo@winnie.local` y con `recepcion@winnie.local` desde la ficha; abrir el PDF y revisar datos.

## 10. Criterios de aceptación
- **Dado** un pago aprobado **cuando** el socio toca "Descargar comprobante" **entonces** obtiene un PDF con N.º de recibo, datos del gimnasio, plan, período y monto.
- **Dado** un pago rechazado o pendiente **entonces** no hay botón de comprobante.
- **Dado** el pago de otro socio **cuando** intento descargarlo **entonces** recibo `404`.
- **Dado** un cobro manual recién registrado **cuando** termina **entonces** puedo descargar el comprobante en el acto.

## 11. Riesgos y decisiones abiertas
1. **Factura fiscal:** ¿el gimnasio debe emitir factura electrónica (ARCA, ex AFIP)? Recomendación: arrancar con recibo interno claramente rotulado "no válido como factura" y validar con el contador; la factura real implica CUIT, punto de venta, CAE y un proveedor/WS (proyecto XL aparte).
2. **Numeración:** `R-AAAA-{pk}` (con saltos) vs. correlativa sin huecos por año (secuencia propia). Recomendación: la simple; los recibos internos no requieren correlatividad legal.
3. **Adjuntar PDF al mail:** requiere extender `send_templated_email` para adjuntos. Recomendación: v2; en v1 el mail incluye el link al panel.
4. **Datos fiscales del gimnasio:** quién los carga (pantalla de configuración) y si son obligatorios para emitir.
5. **Reembolsos:** ¿el comprobante de un pago reembolsado se anula o se emite un comprobante de reembolso? Recomendación: mismo PDF con marca "REEMBOLSADO" y fecha.
6. Privacidad: el PDF incluye nombre y DNI del socio; no loguear su contenido.

## 12. Referencias
- `speckit/spec.md:214-230` (REQ-3.3), `docs/database/mer.md:147`, `CHANGELOG.md:163,167`.
- Figma (solo apoyo visual opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", Mobile: Mis pagos.

## 13. Prompt listo para un agente de IA
```
Repo Winnie-The-Gym (Django/DRF + React/Vite). TDD estricto. Implementá el recibo interno de docs/backlog/items/BK-FIN-10-comprobantes-recibos-de-pago.md.

Backend (backend/apps/payments): Pago.numero_comprobante (CharField 20, unique, null) con formato R-{año}-{pk:06d} asignado al pasar a 'aprobado' (en procesar_webhook y cobro_manual de services.py, dentro de la transacción) + migración (incl. numeración retroactiva por paid_at). GymConfig (apps/common/models.py) suma razon_social, cuit, domicilio, condicion_iva (blank) con migración. receipts.py::build_receipt_pdf(pago) -> bytes con reportlab (A4 vertical; datos del gimnasio, socio, plan, período fecha_inicio..fecha_fin de pago.membresia, monto, medio, mp_payment_id si aplica, leyenda 'Comprobante de pago. Documento no válido como factura.'; 'REEMBOLSADO' si corresponde). Endpoints: GET /api/payments/pagos/{id}/comprobante/ (IsReceptionistOrAdmin) y GET /api/payments/pagos/mis-pagos/{id}/comprobante/ (IsSocio, solo propios, otros 404); solo aprobado/reembolsado (400 en otros estados); PagoSerializer expone numero_comprobante.
Frontend: services/pagosService.js::descargarComprobante (api.get con responseType 'blob' + getFilenameFromDisposition y triggerBlobDownload de services/reportsService.js), useDescargarComprobante en hooks/queries/usePagos.js, botón FileDown 'Descargar comprobante' en HistorialPagosPage, HistorialPagosCard, SocioDetailModal (pestaña Pagos) y tras el éxito de CobroManualPage, visible solo para aprobado/reembolsado.
Tests primero: backend/apps/payments/tests/test_comprobante.py (APITestCase + RefreshToken; body empieza con %PDF-, 404 de otro socio, 400 por estado, numeración única e inmutable) y vitest (renderWithProviders; mock de createObjectURL).
Terminado cuando `cd backend && pytest -q` (cov>=80) y `cd frontend && npm run lint && npx vitest run --coverage && npm run build` pasan. Textos UI en español rioplatense. Sin commits.
```
