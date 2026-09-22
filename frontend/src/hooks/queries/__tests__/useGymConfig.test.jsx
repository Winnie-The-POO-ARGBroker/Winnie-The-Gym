import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useGymConfig } from '../useGymConfig'

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}))

import api from '../../../services/api'

const mockConfig = {
  nombre_gym: 'Winnie The Gym',
  aforo_maximo: 200,
  hora_apertura: '07:00',
  hora_cierre: '23:00',
  telefono_contacto: '',
}

function wrapper({ children }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useGymConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches gym config from /config/gym/', async () => {
    api.get.mockResolvedValueOnce({ data: mockConfig })
    const { result } = renderHook(() => useGymConfig(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.aforo_maximo).toBe(200)
    expect(result.current.data.nombre_gym).toBe('Winnie The Gym')
    expect(api.get).toHaveBeenCalledWith('/config/gym/')
  })

  it('returns isPending=true initially', () => {
    api.get.mockResolvedValueOnce({ data: mockConfig })
    const { result } = renderHook(() => useGymConfig(), { wrapper })
    expect(result.current.isPending).toBe(true)
  })
})
