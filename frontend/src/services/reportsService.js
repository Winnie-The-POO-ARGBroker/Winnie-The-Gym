import api from './api'

/**
 * Helper to extract filename from Content-Disposition header.
 */
export function getFilenameFromDisposition(contentDisposition, fallbackFilename) {
  if (!contentDisposition) return fallbackFilename

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const match = contentDisposition.match(/filename=["']?([^"';]+)["']?/i)
  if (match && match[1]) {
    return match[1].trim()
  }

  return fallbackFilename
}

/**
 * Triggers a download in the browser from a Blob response.
 */
export function triggerBlobDownload(blob, filename) {
  const blobObject = blob instanceof Blob ? blob : new Blob([blob])
  const url = window.URL.createObjectURL(blobObject)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Parses error from Axios response when responseType is 'blob'.
 */
export async function parseBlobError(error) {
  if (error.response?.data instanceof Blob) {
    try {
      const text = await error.response.data.text()
      const json = JSON.parse(text)
      return json.detail || json.error || json.message || text
    } catch {
      // Raw string text or parse error
    }
  }
  return error.response?.data?.detail || error.response?.data?.message || error.message || 'Error al exportar el reporte'
}

/**
 * Export Morosidad report (CSV, XLSX, PDF).
 */
export async function exportMorosidad({ formato = 'csv', estado, plan_id } = {}) {
  const params = { formato }
  if (estado) params.estado = estado
  if (plan_id) params.plan_id = plan_id

  try {
    const response = await api.get('/reportes/morosidad/', {
      params,
      responseType: 'blob',
    })
    const filename = getFilenameFromDisposition(
      response.headers?.['content-disposition'],
      `morosidad.${formato}`
    )
    triggerBlobDownload(response.data, filename)
    return { success: true, filename }
  } catch (err) {
    const msg = await parseBlobError(err)
    throw new Error(msg)
  }
}

/**
 * Export Facturación mensual report (CSV, XLSX, PDF).
 */
export async function exportFacturacion({ formato = 'csv', mes, metodo } = {}) {
  const params = { formato }
  if (mes) params.mes = mes
  if (metodo) params.metodo = metodo

  try {
    const response = await api.get('/reportes/facturacion/', {
      params,
      responseType: 'blob',
    })
    const filename = getFilenameFromDisposition(
      response.headers?.['content-disposition'],
      `facturacion${mes ? `_${mes}` : ''}.${formato}`
    )
    triggerBlobDownload(response.data, filename)
    return { success: true, filename }
  } catch (err) {
    const msg = await parseBlobError(err)
    throw new Error(msg)
  }
}

/**
 * Export Asistencia report (CSV, XLSX, PDF).
 */
export async function exportAsistencia({ formato = 'csv', fecha_desde, fecha_hasta } = {}) {
  const params = { formato }
  if (fecha_desde) params.fecha_desde = fecha_desde
  if (fecha_hasta) params.fecha_hasta = fecha_hasta

  try {
    const response = await api.get('/reportes/asistencia/', {
      params,
      responseType: 'blob',
    })
    const filename = getFilenameFromDisposition(
      response.headers?.['content-disposition'],
      `asistencia.${formato}`
    )
    triggerBlobDownload(response.data, filename)
    return { success: true, filename }
  } catch (err) {
    const msg = await parseBlobError(err)
    throw new Error(msg)
  }
}

/**
 * Fetch available membership plans for report filtering.
 */
export async function getReportPlans() {
  try {
    const response = await api.get('/memberships/planes/')
    return response.data?.results || response.data || []
  } catch (error) {
    const status = error.response?.status
    if (status === 401 || status === 403) {
      throw error
    }
    console.error('Error fetching plans for report filter:', error)
    return []
  }
}

/**
 * Unified report export dispatcher based on category/type.
 */
export async function exportReport(tipo, filters = {}, formato = 'csv') {
  const normalizedTipo = (tipo || '').toLowerCase().trim()
  if (normalizedTipo === 'morosidad') {
    return exportMorosidad({
      formato,
      estado: filters.estado,
      plan_id: filters.plan_id,
    })
  } else if (normalizedTipo === 'facturacion') {
    return exportFacturacion({
      formato,
      mes: filters.mes,
      metodo: filters.metodo,
    })
  } else if (normalizedTipo === 'asistencia') {
    return exportAsistencia({
      formato,
      fecha_desde: filters.fecha_desde,
      fecha_hasta: filters.fecha_hasta,
    })
  } else {
    throw new Error(`Categoría de reporte "${tipo}" no soportada para exportación directa.`)
  }
}
