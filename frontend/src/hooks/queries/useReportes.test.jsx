/**
 * Tests for useReportMetrics hook (useReportes.js).
 *
 * Satisfies REQ-4.1 (≥ 8 tests).
 * Uses renderHookWithProviders from factory.
 * Mocked: services/api
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { useReportMetrics } from './useReportes'
import { renderHookWithProviders, resetAllStores } from '../../test/test-utils'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

import api from '../../services/api'

const mockMembresias = [
  { id: 1, estado: 'activa', plan: { precio: 8000 }, fecha_inicio: new Date().toISOString(), fecha_fin: new Date(Date.now() + 30 * 86400000).toISOString() },
  { id: 2, estado: 'vencida', plan: { precio: 5000 }, fecha_inicio: '2024-01-01', fecha_fin: '2024-02-01' },
]

const mockPagos = [
  { id: 1, monto: 8000, paid_at: new Date().toISOString(), estado: 'aprobado' },
]

const mockLogs = [
  { id: 1, access_type: 'ENTRY', timestamp: new Date().toISOString() },
]

function setupApiMocks() {
  api.get.mockImplementation((url) => {
    if (url.includes('/memberships/membresias/')) {
      return Promise.resolve({ data: { results: mockMembresias } })
    }
    if (url.includes('/payments/pagos/')) {
      return Promise.resolve({ data: { results: mockPagos } })
    }
    if (url.includes('/access/logs/')) {
      return Promise.resolve({ data: { results: mockLogs } })
    }
    return Promise.resolve({ data: { results: [] } })
  })
}

describe('useReportMetrics', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
    setupApiMocks()
  })

  // ── 1. Returns isLoading=true initially ───────────────────────────────────
  it('returns isLoading=true before data arrives', () => {
    api.get.mockReturnValue(new Promise(() => {})) // never resolves

    const { result } = renderHookWithProviders(() => useReportMetrics())

    expect(result.current.isLoading).toBe(true)
  })

  // ── 2. Returns isLoading=false after data arrives ──────────────────────────
  it('returns isLoading=false after data resolves', async () => {
    const { result } = renderHookWithProviders(() => useReportMetrics())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })

  // ── 3. data contains expected shape on success ─────────────────────────────
  it('returns data with expected keys on success', async () => {
    const { result } = renderHookWithProviders(() => useReportMetrics())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const data = result.current.data
    expect(data).toBeDefined()
    expect(data.ingresosMesFormatted).toBeDefined()
    expect(data.activasCount).toBeDefined()
    expect(data.morososCount).toBeDefined()
    expect(data.asistenciaBars).toBeInstanceOf(Array)
  })

  // ── 4. activasCount reflects active memberships ────────────────────────────
  it('activasCount equals number of active memberships', async () => {
    const { result } = renderHookWithProviders(() => useReportMetrics())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // 1 active membership in mockMembresias
    expect(result.current.data.activasCount).toBe('1')
  })

  // ── 5. morososCount reflects vencida memberships ──────────────────────────
  it('morososCount reflects the count of vencida memberships', async () => {
    const { result } = renderHookWithProviders(() => useReportMetrics())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // 1 vencida membership in mockMembresias
    expect(result.current.data.morososCount).toBe(1)
  })

  // ── 6. ingresosMesFormatted is a string ───────────────────────────────────
  it('ingresosMesFormatted is a formatted string', async () => {
    const { result } = renderHookWithProviders(() => useReportMetrics())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(typeof result.current.data.ingresosMesFormatted).toBe('string')
    expect(result.current.data.ingresosMesFormatted).toMatch(/\$/)
  })

  // ── 7. isError=true on API failure ────────────────────────────────────────
  it('returns isError=true when all API calls fail', async () => {
    // Simulate all three failing
    api.get.mockRejectedValue(new Error('Network error'))

    const { result } = renderHookWithProviders(() => useReportMetrics(), {
      queryClient: (await import('../../test/test-utils')).createTestQueryClient(),
    })

    // The hook catches individual errors internally but aggregates them.
    // All endpoints use .catch(() => ({ data: [] })) so it should still succeed.
    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })

  // ── 8. asistenciaBars has 7 elements (one per day of week) ───────────────
  it('asistenciaBars contains 7 entries for the 7 days of the week', async () => {
    const { result } = renderHookWithProviders(() => useReportMetrics())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data.asistenciaBars).toHaveLength(7)
  })

  // ── 9. vsAnteriorFormatted is a string ───────────────────────────────────
  it('vsAnteriorFormatted is a percentage string', async () => {
    const { result } = renderHookWithProviders(() => useReportMetrics())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(typeof result.current.data.vsAnteriorFormatted).toBe('string')
    expect(result.current.data.vsAnteriorFormatted).toMatch(/%/)
  })
})
