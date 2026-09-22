/**
 * Tests for useInscripcionesMutations.
 *
 * Coverage uplift: 0% → ~90%.
 * Mocked: services/api, sonner.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { renderHookWithProviders } from '../../test/test-utils'

vi.mock('../../services/api', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

import { useInscripcionesMutations } from './useInscripciones'
import api from '../../services/api'
import { toast } from 'sonner'

describe('useInscripcionesMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockResolvedValue({ data: [] })
  })

  // ── 1. inscribir calls api.post with correct URL ──────────────────────────
  it('inscribir calls api.post with correct endpoint', async () => {
    api.post.mockResolvedValue({ data: {} })
    const { result } = renderHookWithProviders(() => useInscripcionesMutations())

    await act(async () => {
      result.current.inscribir.mutate(42)
    })

    expect(api.post).toHaveBeenCalledWith('/classes/clases/42/inscribir/')
  })

  // ── 2. inscribir success shows toast.success ──────────────────────────────
  it('inscribir shows toast.success on success', async () => {
    api.post.mockResolvedValue({ data: {} })
    const { result } = renderHookWithProviders(() => useInscripcionesMutations())

    await act(async () => {
      result.current.inscribir.mutate(1)
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('¡Cupo reservado con éxito!')
    })
  })

  // ── 3. inscribir error shows toast.error ──────────────────────────────────
  it('inscribir shows toast.error on failure', async () => {
    api.post.mockRejectedValue({ response: { data: { detail: 'Sin cupos disponibles' } } })
    const { result } = renderHookWithProviders(() => useInscripcionesMutations())

    await act(async () => {
      result.current.inscribir.mutate(1)
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Sin cupos disponibles')
    })
  })

  // ── 4. cancelar calls api.post with correct URL ───────────────────────────
  it('cancelar calls api.post with correct endpoint', async () => {
    api.post.mockResolvedValue({ data: {} })
    const { result } = renderHookWithProviders(() => useInscripcionesMutations())

    await act(async () => {
      result.current.cancelar.mutate(7)
    })

    expect(api.post).toHaveBeenCalledWith('/classes/clases/7/cancelar/')
  })

  // ── 5. cancelar success shows toast.info ─────────────────────────────────
  it('cancelar shows toast.info on success', async () => {
    api.post.mockResolvedValue({ data: {} })
    const { result } = renderHookWithProviders(() => useInscripcionesMutations())

    await act(async () => {
      result.current.cancelar.mutate(7)
    })

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith('Reserva cancelada correctamente')
    })
  })

  // ── 6. hook returns inscribir and cancelar ────────────────────────────────
  it('returns inscribir and cancelar mutation objects', () => {
    const { result } = renderHookWithProviders(() => useInscripcionesMutations())
    expect(result.current.inscribir).toBeDefined()
    expect(result.current.cancelar).toBeDefined()
    expect(typeof result.current.inscribir.mutate).toBe('function')
    expect(typeof result.current.cancelar.mutate).toBe('function')
  })
})
