/**
 * Tests for the success message of useAnularPagoMutation (renewal undone vs plain annulment).
 * Mocked: services/api, sonner.
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
  default: { get: vi.fn(), post: vi.fn() },
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import { useAnularPagoMutation } from './usePagos'
import api from '../../services/api'
import { toast } from 'sonner'

describe('useAnularPagoMutation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mentions the restored membership and its end date when the backend restored one', async () => {
    api.post.mockResolvedValue({
      data: { id: 5, anulado: true, membresia_restaurada: { id: 3, fecha_fin: '2026-09-20' } },
    })
    const { result } = renderHookWithProviders(() => useAnularPagoMutation())

    await act(async () => { result.current.mutate({ id: 5, motivo: 'Error' }) })

    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1))
    expect(api.post).toHaveBeenCalledWith('/payments/pagos/5/anular/', { motivo: 'Error' })
    expect(toast.success).toHaveBeenCalledWith(
      'Pago anulado. Se restauró la membresía anterior (vigente hasta 20/09/2026).'
    )
  })

  it('keeps the existing message when nothing was restored', async () => {
    api.post.mockResolvedValue({ data: { id: 5, anulado: true, membresia_restaurada: null } })
    const { result } = renderHookWithProviders(() => useAnularPagoMutation())

    await act(async () => { result.current.mutate({ id: 5, motivo: 'Error' }) })

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Pago anulado correctamente'))
  })

  it('keeps the existing message when the field is absent (older backend)', async () => {
    api.post.mockResolvedValue({ data: { id: 5, anulado: true } })
    const { result } = renderHookWithProviders(() => useAnularPagoMutation())

    await act(async () => { result.current.mutate({ id: 5, motivo: 'Error' }) })

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Pago anulado correctamente'))
  })
})
