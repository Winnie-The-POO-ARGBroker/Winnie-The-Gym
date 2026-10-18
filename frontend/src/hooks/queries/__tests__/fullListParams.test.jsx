/**
 * Lists that must show every record ask the backend for a big page.
 * DRF's default page is 10, so without `page_size` these screens truncated silently.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ALL_RECORDS_PAGE_SIZE, REPORT_FETCH_LIMIT } from '../../../constants/pagination'

vi.mock('../../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

import api from '../../../services/api'
import { usePagosPorSocio } from '../usePagos'
import { useMisPagos } from '../useMisPagos'
import { useMembresiasPorSocio } from '../useMembresias'
import { useInstructores } from '../useInstructores'
import { useDisciplinas, useSalas } from '../useCatalogo'
import { useCierres } from '../useCierres'
import { usePlanesQuery } from '../usePlanesAdmin'
import { useReportMetrics } from '../useReportes'
import { getStaffList } from '../../../services/staffService'
import { getReportPlans } from '../../../services/reportsService'

function wrapper({ children }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

async function run(hook) {
  const { result } = renderHook(hook, { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
}

describe('full-list hooks send page_size', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockResolvedValue({ data: { count: 0, results: [] } })
  })

  it('usePagosPorSocio', async () => {
    await run(() => usePagosPorSocio(7))
    expect(api.get).toHaveBeenCalledWith('/payments/pagos/', {
      params: { socio: 7, page_size: ALL_RECORDS_PAGE_SIZE },
    })
  })

  it('useMisPagos', async () => {
    await run(() => useMisPagos())
    expect(api.get).toHaveBeenCalledWith('/payments/pagos/mis-pagos/', {
      params: { page_size: ALL_RECORDS_PAGE_SIZE },
    })
  })

  it('useMembresiasPorSocio', async () => {
    await run(() => useMembresiasPorSocio(7))
    expect(api.get).toHaveBeenCalledWith('/memberships/membresias/', {
      params: { socio: 7, page_size: ALL_RECORDS_PAGE_SIZE },
    })
  })

  it('useInstructores keeps caller filters and adds page_size', async () => {
    await run(() => useInstructores({ activo: true }))
    expect(api.get).toHaveBeenCalledWith('/classes/instructores/', {
      params: { activo: true, page_size: ALL_RECORDS_PAGE_SIZE },
    })
  })

  it('useDisciplinas and useSalas', async () => {
    await run(() => useDisciplinas())
    await run(() => useSalas())
    expect(api.get).toHaveBeenCalledWith('/classes/disciplinas/', { params: { page_size: ALL_RECORDS_PAGE_SIZE } })
    expect(api.get).toHaveBeenCalledWith('/classes/salas/', { params: { page_size: ALL_RECORDS_PAGE_SIZE } })
  })

  it('useCierres', async () => {
    await run(() => useCierres())
    expect(api.get).toHaveBeenCalledWith('/common/cierres/', { params: { page_size: ALL_RECORDS_PAGE_SIZE } })
  })

  it('usePlanesQuery and getReportPlans ask for the backend max (100)', async () => {
    await run(() => usePlanesQuery())
    await getReportPlans()
    expect(api.get).toHaveBeenCalledWith('/memberships/planes/', { params: { page_size: 100 } })
    expect(api.get.mock.calls.filter(([url]) => url === '/memberships/planes/')).toHaveLength(2)
  })

  it('getStaffList', async () => {
    await getStaffList()
    expect(api.get).toHaveBeenCalledWith('/users/staff/', { params: { page_size: ALL_RECORDS_PAGE_SIZE } })
  })

  it('useReportMetrics uses page_size (the backend ignores `limit`)', async () => {
    await run(() => useReportMetrics())
    const calls = api.get.mock.calls
    const byUrl = (u) => calls.find(([url]) => url === u)[1].params
    expect(byUrl('/memberships/membresias/')).toMatchObject({ ultima: true, page_size: REPORT_FETCH_LIMIT })
    expect(byUrl('/payments/pagos/')).toMatchObject({ estado: 'aprobado', page_size: REPORT_FETCH_LIMIT })
    expect(byUrl('/access/logs/')).toEqual({ page_size: REPORT_FETCH_LIMIT })
  })
})
