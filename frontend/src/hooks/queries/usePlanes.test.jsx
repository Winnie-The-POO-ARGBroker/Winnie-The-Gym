/**
 * Tests for usePlanes hook.
 *
 * Coverage uplift: 0% → ~100%.
 * Mocked: services/reportsService.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithProviders } from '../../test/test-utils'

vi.mock('../../services/reportsService', () => ({
  getReportPlans: vi.fn(),
}))

import { usePlanes } from './usePlanes'
import { getReportPlans } from '../../services/reportsService'

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
})
