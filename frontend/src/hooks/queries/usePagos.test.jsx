/**
 * Tests for usePagos hooks.
 *
 * Coverage uplift: 0% → ~85%.
 * Mocked: services/pagosService, services/api, sonner.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { renderHookWithProviders } from '../../test/test-utils'

vi.mock('../../services/pagosService', () => ({
  crearPreferencia: vi.fn(),
  resolverInitPoint: vi.fn(),
  cobrarManual: vi.fn(),
}))

vi.mock('../../services/api', () => ({
  default: { get: vi.fn() },
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import { usePagosPorSocio, useCrearPreferenciaMutation, useCobrarManualMutation } from './usePagos'
import { crearPreferencia, resolverInitPoint, cobrarManual } from '../../services/pagosService'
import api from '../../services/api'
import { toast } from 'sonner'

describe('usePagosPorSocio', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── 1. Fetches pagos when socioId is set ──────────────────────────────────
  it('fetches pagos from API for a given socioId', async () => {
    const PAGOS = [{ id: 1, monto: 5000 }]
    api.get.mockResolvedValue({ data: { results: PAGOS } })
    const { result } = renderHookWithProviders(() => usePagosPorSocio(10))
    await waitFor(() => expect(result.current.data).toEqual(PAGOS))
    expect(api.get).toHaveBeenCalledWith('/payments/pagos/', expect.objectContaining({ params: { socio_id: 10 } }))
  })

  // ── 2. Does not fetch when socioId is null ────────────────────────────────
  it('does not call api.get when socioId is null', () => {
    renderHookWithProviders(() => usePagosPorSocio(null))
    expect(api.get).not.toHaveBeenCalled()
  })

  // ── 3. Returns raw array when results not wrapped ─────────────────────────
  it('returns data directly when no results wrapper', async () => {
    const PAGOS = [{ id: 2, monto: 9000 }]
    api.get.mockResolvedValue({ data: PAGOS })
    const { result } = renderHookWithProviders(() => usePagosPorSocio(5))
    await waitFor(() => expect(result.current.data).toEqual(PAGOS))
  })
})

describe('useCrearPreferenciaMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete window.location
    window.location = { href: '' }
  })

  // ── 4. Calls crearPreferencia with planId ──────────────────────────────────
  it('calls crearPreferencia with planId on mutate', async () => {
    crearPreferencia.mockResolvedValue({ init_point: 'https://mp.com/pay', sandbox_init_point: null })
    resolverInitPoint.mockReturnValue('https://mp.com/pay')
    const { result } = renderHookWithProviders(() => useCrearPreferenciaMutation())

    await act(async () => {
      result.current.mutate(3)
    })

    expect(crearPreferencia).toHaveBeenCalledWith(3)
  })

  // ── 5. Redirects to init_point URL on success ─────────────────────────────
  it('sets window.location.href to init_point on success', async () => {
    crearPreferencia.mockResolvedValue({ init_point: 'https://mp.com/pay/123' })
    resolverInitPoint.mockReturnValue('https://mp.com/pay/123')
    const { result } = renderHookWithProviders(() => useCrearPreferenciaMutation())

    await act(async () => {
      result.current.mutate(3)
    })

    await waitFor(() => {
      expect(window.location.href).toBe('https://mp.com/pay/123')
    })
  })

  // ── 6. Shows toast.error when URL is null ─────────────────────────────────
  it('shows toast.error when resolverInitPoint returns null', async () => {
    crearPreferencia.mockResolvedValue({})
    resolverInitPoint.mockReturnValue(null)
    const { result } = renderHookWithProviders(() => useCrearPreferenciaMutation())

    await act(async () => {
      result.current.mutate(3)
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('URL de pago válida'))
    })
  })

  // ── 7. Shows toast.error on crearPreferencia failure ──────────────────────
  it('shows toast.error when crearPreferencia rejects', async () => {
    crearPreferencia.mockRejectedValue({ response: { data: { detail: 'Plan inactivo' } } })
    const { result } = renderHookWithProviders(() => useCrearPreferenciaMutation())

    await act(async () => {
      result.current.mutate(3)
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Plan inactivo')
    })
  })
})

describe('useCobrarManualMutation', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── 8. Calls cobrarManual with payload ────────────────────────────────────
  it('calls cobrarManual with payload on mutate', async () => {
    cobrarManual.mockResolvedValue({ id: 5, monto: 9000 })
    const { result } = renderHookWithProviders(() => useCobrarManualMutation())

    await act(async () => {
      result.current.mutate({ socio_id: 1, plan_id: 2, monto: 9000 })
    })

    expect(cobrarManual).toHaveBeenCalledWith({ socio_id: 1, plan_id: 2, monto: 9000 })
  })

  // ── 9. Shows toast.error on failure ──────────────────────────────────────
  it('shows toast.error when cobrarManual fails', async () => {
    cobrarManual.mockRejectedValue({ response: { data: { detail: 'Socio no encontrado' } } })
    const { result } = renderHookWithProviders(() => useCobrarManualMutation())

    await act(async () => {
      result.current.mutate({ socio_id: 99, plan_id: 2, monto: 9000 })
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Socio no encontrado')
    })
  })
})
