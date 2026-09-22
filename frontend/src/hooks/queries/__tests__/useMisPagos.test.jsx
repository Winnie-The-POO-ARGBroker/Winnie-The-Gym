import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMisPagos } from '../useMisPagos'

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

import api from '../../../services/api'

const mockPagos = [
  { id: 1, monto: '1000.00', estado: 'aprobado', metodo: 'manual', created_at: '2026-09-01T10:00:00Z' },
  { id: 2, monto: '1500.00', estado: 'aprobado', metodo: 'mercadopago', created_at: '2026-08-01T10:00:00Z' },
]

function wrapper({ children }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useMisPagos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches from /payments/pagos/mis-pagos/', async () => {
    api.get.mockResolvedValueOnce({ data: { results: mockPagos } })
    const { result } = renderHook(() => useMisPagos(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
    expect(api.get).toHaveBeenCalledWith('/payments/pagos/mis-pagos/')
  })

  it('handles non-paginated response', async () => {
    api.get.mockResolvedValueOnce({ data: mockPagos })
    const { result } = renderHook(() => useMisPagos(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
  })
})
