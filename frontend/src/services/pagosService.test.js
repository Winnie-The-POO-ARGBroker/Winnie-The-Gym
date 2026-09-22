/**
 * Tests for pagosService pure functions.
 * Coverage uplift for pagosService.js functions.
 */

import { describe, it, expect, vi } from 'vitest'

// Mock api before importing the service
vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

import { resolverInitPoint, crearPreferencia, cobrarManual, listarPagos } from './pagosService'
import api from './api'

describe('pagosService', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── resolverInitPoint ──────────────────────────────────────────────────

  it('resolverInitPoint returns init_point when VITE_MP_SANDBOX is not true', () => {
    const preferencia = {
      init_point: 'https://www.mercadopago.com/checkout/v1/redirect?pref_id=123',
      sandbox_init_point: 'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=123',
    }
    // import.meta.env.VITE_MP_SANDBOX defaults to undefined in test env
    const result = resolverInitPoint(preferencia)
    expect(result).toBe(preferencia.init_point)
  })

  it('resolverInitPoint returns init_point when sandbox_init_point is null', () => {
    const preferencia = {
      init_point: 'https://www.mercadopago.com/real',
      sandbox_init_point: null,
    }
    const result = resolverInitPoint(preferencia)
    expect(result).toBe(preferencia.init_point)
  })

  // ── crearPreferencia ───────────────────────────────────────────────────

  it('crearPreferencia calls api.post with correct payload', async () => {
    api.post.mockResolvedValue({ data: { pago_id: 1, init_point: 'https://mp.com' } })
    const result = await crearPreferencia(5)
    expect(api.post).toHaveBeenCalledWith('/payments/preferencias/', { plan_id: 5 })
    expect(result).toEqual({ pago_id: 1, init_point: 'https://mp.com' })
  })

  // ── cobrarManual ───────────────────────────────────────────────────────

  it('cobrarManual calls api.post with payload', async () => {
    const payload = { socio_id: 1, plan_id: 2, monto: 5000 }
    api.post.mockResolvedValue({ data: { id: 99, estado: 'aprobado' } })
    const result = await cobrarManual(payload)
    expect(api.post).toHaveBeenCalledWith('/payments/cobros-manuales/', payload)
    expect(result).toEqual({ id: 99, estado: 'aprobado' })
  })

  // ── listarPagos ────────────────────────────────────────────────────────

  it('listarPagos calls api.get with params', async () => {
    api.get.mockResolvedValue({ data: { count: 1, results: [] } })
    const result = await listarPagos({ socio: 1, estado: 'aprobado' })
    expect(api.get).toHaveBeenCalledWith('/payments/pagos/', { params: { socio: 1, estado: 'aprobado' } })
    expect(result).toEqual({ count: 1, results: [] })
  })

  it('listarPagos uses empty params by default', async () => {
    api.get.mockResolvedValue({ data: { count: 0, results: [] } })
    await listarPagos()
    expect(api.get).toHaveBeenCalledWith('/payments/pagos/', { params: {} })
  })
})
