import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '../api'
import { getStaffList, createStaff, resendActivation } from '../staffService'

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('staffService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getStaffList', () => {
    it('requests GET /users/staff/ and returns data', async () => {
      const mockData = [{ id: 1, email: 'admin@winnie.local', rol: 'administrador' }]
      api.get.mockResolvedValueOnce({ data: mockData })

      const result = await getStaffList()

      expect(api.get).toHaveBeenCalledWith('/users/staff/')
      expect(result).toEqual(mockData)
    })

    it('propagates errors from the API', async () => {
      api.get.mockRejectedValueOnce(new Error('Network error'))
      await expect(getStaffList()).rejects.toThrow('Network error')
    })
  })

  describe('createStaff', () => {
    it('sends POST /users/staff/ with payload and returns created staff', async () => {
      const payload = {
        email: 'recep@winnie.local',
        rol: 'recepcionista',
        first_name: 'Juan',
        last_name: 'Pérez',
      }
      const mockResponse = { id: 5, ...payload }
      api.post.mockResolvedValueOnce({ data: mockResponse })

      const result = await createStaff(payload)

      expect(api.post).toHaveBeenCalledWith('/users/staff/', payload)
      expect(result.id).toBe(5)
      expect(result.rol).toBe('recepcionista')
    })

    it('propagates 400 error on duplicate email', async () => {
      api.post.mockRejectedValueOnce({ response: { status: 400, data: { email: ['already exists'] } } })
      await expect(createStaff({ email: 'dup@winnie.local' })).rejects.toBeTruthy()
    })
  })

  describe('resendActivation', () => {
    it('sends POST to resend-activation endpoint for given id', async () => {
      const mockDetail = { detail: 'Activation email sent.' }
      api.post.mockResolvedValueOnce({ data: mockDetail })

      const result = await resendActivation(3)

      expect(api.post).toHaveBeenCalledWith('/users/staff/3/resend-activation/')
      expect(result).toEqual(mockDetail)
    })

    it('works with string id', async () => {
      api.post.mockResolvedValueOnce({ data: { detail: 'ok' } })
      await resendActivation('7')
      expect(api.post).toHaveBeenCalledWith('/users/staff/7/resend-activation/')
    })
  })
})
