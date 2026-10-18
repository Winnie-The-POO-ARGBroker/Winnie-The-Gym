/**
 * useReportMetrics must not recompute "nuevas del mes" from membership rows:
 * the backend resumen (nuevas_mes / renovaciones_mes) is the single source.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { useReportMetrics } from './useReportes'
import { renderHookWithProviders, resetAllStores } from '../../test/test-utils'

vi.mock('../../services/api', () => ({ default: { get: vi.fn() } }))

import api from '../../services/api'

describe('useReportMetrics (nuevas del mes)', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
  })

  it('does not expose a client-side nuevasMesCount even when rows start this month', async () => {
    const hoy = new Date().toISOString()
    api.get.mockImplementation((url) => {
      if (url.includes('/memberships/membresias/')) {
        return Promise.resolve({
          data: { results: [{ id: 1, estado: 'activa', plan: { precio: 1 }, fecha_inicio: hoy, fecha_fin: hoy }] },
        })
      }
      return Promise.resolve({ data: { results: [] } })
    })

    const { result } = renderHookWithProviders(() => useReportMetrics())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).not.toHaveProperty('nuevasMesCount')
    expect(result.current.data.activasCount).toBe('1')
    expect(api.get).not.toHaveBeenCalledWith('/reportes/resumen/', expect.anything())
  })
})
