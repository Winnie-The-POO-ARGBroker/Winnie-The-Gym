import { describe, it, expect, vi, beforeEach } from 'vitest'
import api, { generateUUID } from '../api'
import useAuthStore from '../../stores/authStore'

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('api service - X-Request-ID y generador UUID', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ accessToken: null })
  })

  describe('generateUUID', () => {
    it('genera un UUID v4 con formato estándar', () => {
      const id = generateUUID()
      expect(typeof id).toBe('string')
      expect(id).toMatch(UUID_V4_REGEX)
    })

    it('genera identificadores únicos en llamadas sucesivas', () => {
      const id1 = generateUUID()
      const id2 = generateUUID()
      expect(id1).not.toBe(id2)
    })

    it('funciona correctamente usando el fallback cuando crypto.randomUUID no está disponible', () => {
      const originalRandomUUID = crypto.randomUUID
      try {
        delete crypto.randomUUID
        const fallbackId = generateUUID()
        expect(fallbackId).toMatch(UUID_V4_REGEX)
      } finally {
        if (originalRandomUUID) {
          crypto.randomUUID = originalRandomUUID
        }
      }
    })
  })

  describe('interceptor de request', () => {
    it('inyecta header X-Request-ID si no viene provisto en la solicitud', () => {
      // Obtenemos los manejadores registrados en api.interceptors.request
      const requestHandlers = api.interceptors.request.handlers
      expect(requestHandlers.length).toBeGreaterThan(0)

      const interceptor = requestHandlers[0].fulfilled
      const config = { headers: {} }

      const updatedConfig = interceptor(config)

      expect(updatedConfig.headers['X-Request-ID']).toBeDefined()
      expect(updatedConfig.headers['X-Request-ID']).toMatch(UUID_V4_REGEX)
    })

    it('respeta el header X-Request-ID si ya viene definido (ej: desde BFF o cliente)', () => {
      const requestHandlers = api.interceptors.request.handlers
      const interceptor = requestHandlers[0].fulfilled
      const customId = 'bff-predefined-trace-id-123'

      const config = {
        headers: {
          'X-Request-ID': customId,
        },
      }

      const updatedConfig = interceptor(config)

      expect(updatedConfig.headers['X-Request-ID']).toBe(customId)
    })

    it('respeta el header x-request-id en minúsculas y no lo sobreescribe', () => {
      const requestHandlers = api.interceptors.request.handlers
      const interceptor = requestHandlers[0].fulfilled
      const customId = 'lowercase-trace-id-456'

      const config = {
        headers: {
          'x-request-id': customId,
        },
      }

      const updatedConfig = interceptor(config)

      expect(updatedConfig.headers['x-request-id']).toBe(customId)
      expect(updatedConfig.headers['X-Request-ID']).toBeUndefined()
    })

    it('adjunta Authorization Bearer cuando hay un token en el authStore', () => {
      useAuthStore.setState({ accessToken: 'mock-jwt-token' })
      const requestHandlers = api.interceptors.request.handlers
      const interceptor = requestHandlers[0].fulfilled

      const config = { headers: {} }
      const updatedConfig = interceptor(config)

      expect(updatedConfig.headers.Authorization).toBe('Bearer mock-jwt-token')
      expect(updatedConfig.headers['X-Request-ID']).toMatch(UUID_V4_REGEX)
    })
  })
})
