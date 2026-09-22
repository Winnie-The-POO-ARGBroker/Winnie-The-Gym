import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '../api'
import { scanQR, manualAccess } from '../accessService'

vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
  },
}))

describe('accessService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('scanQR', () => {
    it('sends POST to /access/qr/scan/ with qr_token and ENTRY access type by default', async () => {
      const mockResult = { status: 'GRANTED', message: 'Acceso permitido' }
      api.post.mockResolvedValueOnce({ data: mockResult })

      const result = await scanQR('test-qr-token')

      expect(api.post).toHaveBeenCalledWith('/access/qr/scan/', {
        qr_token: 'test-qr-token',
        access_type: 'ENTRY',
      })
      expect(result).toEqual(mockResult)
    })

    it('sends EXIT access type when specified', async () => {
      api.post.mockResolvedValueOnce({ data: { status: 'GRANTED' } })

      await scanQR('exit-qr-token', 'EXIT')

      expect(api.post).toHaveBeenCalledWith('/access/qr/scan/', {
        qr_token: 'exit-qr-token',
        access_type: 'EXIT',
      })
    })

    it('propagates error on denied access', async () => {
      api.post.mockRejectedValueOnce({ response: { status: 403, data: { status: 'DENIED' } } })
      await expect(scanQR('invalid-token')).rejects.toBeTruthy()
    })
  })

  describe('manualAccess', () => {
    it('sends POST to /access/manual/ with DNI and ENTRY type by default', async () => {
      const mockResult = { status: 'GRANTED', socio: { nombre: 'Ana' } }
      api.post.mockResolvedValueOnce({ data: mockResult })

      const result = await manualAccess('12345678')

      expect(api.post).toHaveBeenCalledWith('/access/manual/', {
        dni: '12345678',
        access_type: 'ENTRY',
      })
      expect(result.status).toBe('GRANTED')
    })

    it('sends EXIT access type when specified', async () => {
      api.post.mockResolvedValueOnce({ data: { status: 'GRANTED' } })

      await manualAccess('87654321', 'EXIT')

      expect(api.post).toHaveBeenCalledWith('/access/manual/', {
        dni: '87654321',
        access_type: 'EXIT',
      })
    })
  })
})
