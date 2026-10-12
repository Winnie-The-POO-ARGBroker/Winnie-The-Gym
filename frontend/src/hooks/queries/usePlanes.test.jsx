/**
 * Tests for usePlanes hook.
 *
 * Coverage uplift: 0% → ~100%.
 * Mocked: services/reportsService.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithProviders, createTestQueryClient } from '../../test/test-utils'

vi.mock('../../services/reportsService', () => ({
  getReportPlans: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
}))

import { usePlanes } from './usePlanes'
import { getReportPlans } from '../../services/reportsService'
import { toast } from 'sonner'
import * as Sentry from '@sentry/react'

const PLANES_MOCK = [
  { id: 1, nombre: 'Básico', activo: true },
  { id: 2, nombre: 'Premium', activo: true },
]

describe('usePlanes', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── 1. Returns plans data from reportsService ──────────────────────────────
  it('fetches plans via getReportPlans', async () => {
    getReportPlans.mockResolvedValue(PLANES_MOCK)
    const { result } = renderHookWithProviders(() => usePlanes())
    await waitFor(() => expect(result.current.data).toEqual(PLANES_MOCK))
    expect(getReportPlans).toHaveBeenCalled()
  })

  // ── 2. Returns isLoading initially ────────────────────────────────────────
  it('returns isLoading true initially before data resolves', () => {
    getReportPlans.mockResolvedValue(PLANES_MOCK)
    const { result } = renderHookWithProviders(() => usePlanes())
    // Initially loading
    expect(result.current.isLoading).toBe(true)
  })

  // ── 3. Error branches in useEffect ────────────────────────────────────────
  it('handles auth error with toast and redirect to login', async () => {
    const authError = { type: 'auth', message: 'Token expirado' }
    getReportPlans.mockRejectedValue(authError)
    const { result } = renderHookWithProviders(() => usePlanes())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Sesión expirada')
  })

  it('handles server error with toast and sentry report', async () => {
    const serverError = { type: 'server', message: 'Internal Server Error' }
    getReportPlans.mockRejectedValue(serverError)
    const testClient = createTestQueryClient()
    testClient.setDefaultOptions({
      queries: { retry: false, gcTime: 0, staleTime: 0, retryDelay: 0 },
    })
    const { result } = renderHookWithProviders(() => usePlanes(), {
      queryClient: testClient,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Error interno, intentá más tarde')
    expect(Sentry.captureException).toHaveBeenCalled()
  })

  it('handles network error with retry toast action', async () => {
    const networkError = { type: 'network', message: 'Sin conexión' }
    getReportPlans.mockRejectedValue(networkError)
    const testClient = createTestQueryClient()
    testClient.setDefaultOptions({
      queries: { retry: false, gcTime: 0, staleTime: 0, retryDelay: 0 },
    })
    const { result } = renderHookWithProviders(() => usePlanes(), {
      queryClient: testClient,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Sin conexión', expect.any(Object))
  })

  it('handles notfound error silently without toast', async () => {
    const notfoundError = { type: 'notfound', message: 'No plans' }
    getReportPlans.mockRejectedValue(notfoundError)
    const { result } = renderHookWithProviders(() => usePlanes())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).not.toHaveBeenCalled()
  })
})
