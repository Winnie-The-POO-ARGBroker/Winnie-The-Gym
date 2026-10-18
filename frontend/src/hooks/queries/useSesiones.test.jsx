import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { useSesionesByRange } from './useSesiones'
import { renderHookWithProviders, resetAllStores } from '../../test/test-utils'
import { ALL_RECORDS_PAGE_SIZE } from '../../constants/pagination'

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import api from '../../services/api'

describe('useSesionesByRange', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
  })

  it('asks for the whole range, not just the first page of 10', async () => {
    // A week with the seeded catalog has about 30 sessions; the API paginates by
    // 10 unless told otherwise, so the calendar was showing a third of them.
    api.get.mockResolvedValue({ data: { count: 0, results: [] } })

    renderHookWithProviders(() => useSesionesByRange({ fechaDesde: '2026-10-19', fechaHasta: '2026-10-25' }))

    await waitFor(() => expect(api.get).toHaveBeenCalled())
    expect(api.get).toHaveBeenCalledWith(
      '/classes/sesiones/',
      expect.objectContaining({
        params: expect.objectContaining({
          fecha_desde: '2026-10-19',
          fecha_hasta: '2026-10-25',
          page_size: ALL_RECORDS_PAGE_SIZE,
        }),
      })
    )
  })
})
