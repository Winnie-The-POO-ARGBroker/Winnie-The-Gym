import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '../api'
import {
  getSocios,
  getSocio,
  createSocio,
  updateSocio,
  patchSocio,
  deleteSocio,
  darBajaSocio,
  uploadCertificado,
  getSociosStats,
} from '../sociosService'

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('sociosService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getSocios solicita lista paginada con parámetros correctos', async () => {
    const mockResponse = { data: { count: 1, results: [{ id: 1, nombre: 'Ana' }] } }
    api.get.mockResolvedValueOnce(mockResponse)

    const res = await getSocios({
      page: 2,
      pageSize: 15,
      search: 'Ana',
      estado: 'activo',
      con_certificado: true,
      ordering: '-created_at',
    })

    expect(api.get).toHaveBeenCalledWith('/members/socios/', {
      params: {
        page: 2,
        page_size: 15,
        search: 'Ana',
        estado: 'activo',
        con_certificado: true,
        ordering: '-created_at',
      },
    })
    expect(res).toEqual(mockResponse.data)
  })

  it('getSocio solicita detalle por ID', async () => {
    const mockSocio = { id: 42, nombre: 'Carlos', dni: '12345678' }
    api.get.mockResolvedValueOnce({ data: mockSocio })

    const res = await getSocio(42)
    expect(api.get).toHaveBeenCalledWith('/members/socios/42/')
    expect(res).toEqual(mockSocio)
  })

  it('createSocio envía POST con los datos del nuevo socio', async () => {
    const payload = { nombre: 'Lucía', apellido: 'Gómez', dni: '39485721' }
    api.post.mockResolvedValueOnce({ data: { id: 5, ...payload } })

    const res = await createSocio(payload)
    expect(api.post).toHaveBeenCalledWith('/members/socios/', payload)
    expect(res.id).toBe(5)
  })

  it('updateSocio y patchSocio envían PUT y PATCH', async () => {
    api.put.mockResolvedValueOnce({ data: { id: 10, nombre: 'Modificado' } })
    api.patch.mockResolvedValueOnce({ data: { id: 10, telefono: '112233' } })

    await updateSocio(10, { nombre: 'Modificado' })
    expect(api.put).toHaveBeenCalledWith('/members/socios/10/', { nombre: 'Modificado' })

    await patchSocio(10, { telefono: '112233' })
    expect(api.patch).toHaveBeenCalledWith('/members/socios/10/', { telefono: '112233' })
  })

  it('deleteSocio envía DELETE a la ruta correspondiente', async () => {
    api.delete.mockResolvedValueOnce({ status: 204 })
    await deleteSocio(99)
    expect(api.delete).toHaveBeenCalledWith('/members/socios/99/')
  })

  it('darBajaSocio envía POST al endpoint de baja', async () => {
    api.post.mockResolvedValueOnce({ data: { id: 8, estado: 'baja' } })
    const res = await darBajaSocio(8)
    expect(api.post).toHaveBeenCalledWith('/members/socios/8/dar-baja/')
    expect(res.estado).toBe('baja')
  })

  it('uploadCertificado envía POST con FormData y encabezado multipart', async () => {
    api.post.mockResolvedValueOnce({ data: { id: 3, certificado_medico_url: 'http://example.com/cert.pdf' } })
    const dummyFile = new File(['fake content'], 'apto.pdf', { type: 'application/pdf' })

    const res = await uploadCertificado(3, dummyFile)
    expect(api.post).toHaveBeenCalledWith(
      '/members/socios/3/certificado-medico/',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    expect(res.certificado_medico_url).toBe('http://example.com/cert.pdf')
  })

  it('getSociosStats solicita endpoint /members/socios/stats/', async () => {
    const mockStats = { total: 10, activos: 7, suspendidos: 1, bajas: 2, con_certificado: 5 }
    api.get.mockResolvedValueOnce({ data: mockStats })

    const res = await getSociosStats()
    expect(api.get).toHaveBeenCalledWith('/members/socios/stats/')
    expect(res).toEqual(mockStats)
  })
})
