import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '../api'
import {
  getFilenameFromDisposition,
  triggerBlobDownload,
  parseBlobError,
  exportMorosidad,
  exportFacturacion,
  exportAsistencia,
  exportReport,
  getReportPlans,
} from '../reportsService'

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
  },
}))

describe('reportsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getFilenameFromDisposition', () => {
    it('extracts filename from standard format', () => {
      const header = 'attachment; filename="morosidad.csv"'
      expect(getFilenameFromDisposition(header, 'fallback.csv')).toBe('morosidad.csv')
    })

    it('extracts filename from UTF-8 format', () => {
      const header = "attachment; filename*=UTF-8''reporte%20morosidad.pdf"
      expect(getFilenameFromDisposition(header, 'fallback.pdf')).toBe('reporte morosidad.pdf')
    })

    it('returns fallback if header is missing or empty', () => {
      expect(getFilenameFromDisposition(undefined, 'default.xlsx')).toBe('default.xlsx')
      expect(getFilenameFromDisposition('', 'default.xlsx')).toBe('default.xlsx')
    })
  })

  describe('triggerBlobDownload', () => {
    it('creates object URL and simulates link click', () => {
      const mockBlob = new Blob(['data'], { type: 'text/csv' })
      const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/123')
      const revokeObjectURLMock = vi.fn()
      window.URL.createObjectURL = createObjectURLMock
      window.URL.revokeObjectURL = revokeObjectURLMock

      const appendChildSpy = vi.spyOn(document.body, 'appendChild')
      const removeChildSpy = vi.spyOn(document.body, 'removeChild')

      triggerBlobDownload(mockBlob, 'test.csv')

      expect(createObjectURLMock).toHaveBeenCalledWith(mockBlob)
      expect(appendChildSpy).toHaveBeenCalled()
      expect(removeChildSpy).toHaveBeenCalled()
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/123')
    })
  })

  describe('parseBlobError', () => {
    it('parses json text inside blob error response', async () => {
      const jsonError = JSON.stringify({ detail: 'Acceso no autorizado' })
      const errorBlob = new Blob([jsonError], { type: 'application/json' })
      const errorObj = {
        response: {
          data: errorBlob,
        },
      }

      const message = await parseBlobError(errorObj)
      expect(message).toBe('Acceso no autorizado')
    })

    it('returns error message if not blob', async () => {
      const errorObj = {
        message: 'Network error',
      }
      const message = await parseBlobError(errorObj)
      expect(message).toBe('Network error')
    })
  })

  describe('export endpoints', () => {
    beforeEach(() => {
      window.URL.createObjectURL = vi.fn().mockReturnValue('blob:test')
      window.URL.revokeObjectURL = vi.fn()
    })

    it('exportMorosidad requests correct endpoint with params', async () => {
      const mockBlob = new Blob(['csv content'], { type: 'text/csv' })
      api.get.mockResolvedValueOnce({
        data: mockBlob,
        headers: { 'content-disposition': 'attachment; filename="morosidad.csv"' },
      })

      const res = await exportMorosidad({ formato: 'csv', estado: 'vencida', plan_id: 3 })
      expect(api.get).toHaveBeenCalledWith('/reportes/morosidad/', {
        params: { formato: 'csv', estado: 'vencida', plan_id: 3 },
        responseType: 'blob',
      })
      expect(res.success).toBe(true)
      expect(res.filename).toBe('morosidad.csv')
    })

    it('exportFacturacion requests correct endpoint with params', async () => {
      const mockBlob = new Blob(['xlsx binary'], { type: 'application/octet-stream' })
      api.get.mockResolvedValueOnce({
        data: mockBlob,
        headers: { 'content-disposition': 'attachment; filename="facturacion_2026-09.xlsx"' },
      })

      const res = await exportFacturacion({ formato: 'xlsx', mes: '2026-09', metodo: 'mercado_pago' })
      expect(api.get).toHaveBeenCalledWith('/reportes/facturacion/', {
        params: { formato: 'xlsx', mes: '2026-09', metodo: 'mercado_pago' },
        responseType: 'blob',
      })
      expect(res.success).toBe(true)
      expect(res.filename).toBe('facturacion_2026-09.xlsx')
    })

    it('exportAsistencia requests correct endpoint with params', async () => {
      const mockBlob = new Blob(['pdf binary'], { type: 'application/pdf' })
      api.get.mockResolvedValueOnce({
        data: mockBlob,
        headers: { 'content-disposition': 'attachment; filename="asistencia.pdf"' },
      })

      const res = await exportAsistencia({ formato: 'pdf', fecha_desde: '2026-09-01', fecha_hasta: '2026-09-15' })
      expect(api.get).toHaveBeenCalledWith('/reportes/asistencia/', {
        params: { formato: 'pdf', fecha_desde: '2026-09-01', fecha_hasta: '2026-09-15' },
        responseType: 'blob',
      })
      expect(res.success).toBe(true)
      expect(res.filename).toBe('asistencia.pdf')
    })

    it('exportReport delegates to specific exporters', async () => {
      const mockBlob = new Blob(['test'], { type: 'text/csv' })
      api.get.mockResolvedValue({
        data: mockBlob,
        headers: {},
      })

      await exportReport('morosidad', { estado: 'vencida' }, 'csv')
      expect(api.get).toHaveBeenCalledWith('/reportes/morosidad/', expect.any(Object))

      await exportReport('facturacion', { mes: '2026-09' }, 'pdf')
      expect(api.get).toHaveBeenCalledWith('/reportes/facturacion/', expect.any(Object))

      await exportReport('asistencia', { fecha_desde: '2026-09-01' }, 'xlsx')
      expect(api.get).toHaveBeenCalledWith('/reportes/asistencia/', expect.any(Object))
    })

    it('exportReport throws on unsupported type', async () => {
      await expect(exportReport('desconocido')).rejects.toThrow(/no soportada/)
    })
  })

  describe('getReportPlans', () => {
    it('fetches planes from /memberships/planes/', async () => {
      const mockPlanes = [{ id: 1, nombre: 'Pase Libre' }, { id: 2, nombre: 'Musculación' }]
      api.get.mockResolvedValueOnce({ data: { results: mockPlanes } })

      const planes = await getReportPlans()
      expect(api.get).toHaveBeenCalledWith('/memberships/planes/')
      expect(planes).toEqual(mockPlanes)
    })

    it('returns empty array on network failure', async () => {
      api.get.mockRejectedValueOnce(new Error('Network error'))
      const planes = await getReportPlans()
      expect(planes).toEqual([])
    })

    it('propagates 401/403 auth error upstream', async () => {
      const authError = new Error('Unauthorized')
      authError.response = { status: 401 }
      api.get.mockRejectedValueOnce(authError)
      await expect(getReportPlans()).rejects.toThrow('Unauthorized')
    })
  })
})
