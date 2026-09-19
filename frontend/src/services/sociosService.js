import api from './api'

const SOCIOS_URL = '/members/socios/'

/**
 * Servicio para interactuar con la API de socios.
 * Todas las funciones devuelven la promise de axios.
 */

/**
 * Lista socios con paginación, búsqueda y filtros.
 * @param {Object} params - Parámetros de consulta
 * @param {number}  [params.page]           - Número de página (default 1)
 * @param {string}  [params.search]         - Búsqueda por nombre, apellido, dni, numero_socio
 * @param {string}  [params.estado]         - Filtro por estado: activo | suspendido | baja
 * @param {boolean} [params.con_certificado] - Filtro por certificado médico
 * @param {string}  [params.ordering]       - Campo de ordenación (ej: '-apellido')
 * @returns {Promise<{count, next, previous, results}>}
 */
export function getSocios(params = {}) {
  const queryParams = { ...params }
  if ('pageSize' in queryParams) {
    queryParams.page_size = queryParams.pageSize
    delete queryParams.pageSize
  }
  return api.get(SOCIOS_URL, { params: queryParams }).then((r) => r.data)
}

/**
 * Obtiene métricas globales de socios (activos, suspendidos, bajas, total).
 * @returns {Promise<{total: number, activos: number, suspendidos: number, bajas: number, con_certificado: number}>}
 */
export function getSociosStats() {
  return api.get(`${SOCIOS_URL}stats/`).then((r) => r.data)
}

/**
 * Obtiene el detalle de un socio por ID.
 * @param {number|string} id
 */
export function getSocio(id) {
  return api.get(`${SOCIOS_URL}${id}/`).then((r) => r.data)
}

/**
 * Crea un nuevo socio.
 * @param {Object} data - Datos del socio (nombre, apellido, dni, telefono, etc.)
 */
export function createSocio(data) {
  return api.post(SOCIOS_URL, data).then((r) => r.data)
}

/**
 * Actualiza un socio existente (PUT — reemplazo completo).
 * @param {number|string} id
 * @param {Object} data
 */
export function updateSocio(id, data) {
  return api.put(`${SOCIOS_URL}${id}/`, data).then((r) => r.data)
}

/**
 * Actualiza parcialmente un socio (PATCH).
 * @param {number|string} id
 * @param {Object} data - Solo los campos a modificar
 */
export function patchSocio(id, data) {
  return api.patch(`${SOCIOS_URL}${id}/`, data).then((r) => r.data)
}

/**
 * Elimina un socio.
 * @param {number|string} id
 */
export function deleteSocio(id) {
  return api.delete(`${SOCIOS_URL}${id}/`)
}

/**
 * Da de baja a un socio (estado → baja, fecha_baja → hoy).
 * @param {number|string} id
 */
export function darBajaSocio(id) {
  return api.post(`${SOCIOS_URL}${id}/dar-baja/`).then((r) => r.data)
}

/**
 * Sube el certificado médico del socio (RF08).
 * @param {number|string} id
 * @param {File} archivo - Archivo PDF, JPG o PNG (máx. 5 MB)
 */
export function uploadCertificado(id, archivo) {
  const formData = new FormData()
  formData.append('archivo', archivo)
  return api
    .post(`${SOCIOS_URL}${id}/certificado-medico/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}
