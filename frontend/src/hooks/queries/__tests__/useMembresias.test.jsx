import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useSocioMembresiaMe,
  useMembresiasPorSocio,
  useMembresiaActivaDeSocio,
} from '../useMembresias'

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

import api from '../../../services/api'

const mockMembresia = {
  id: 1,
  estado: 'activa',
  plan: { nombre: 'Plan Mensual' },
  fecha_fin: '2026-10-20',
}

function wrapper({ children }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useSocioMembresiaMe', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches from /memberships/me/ and returns data', async () => {
    api.get.mockResolvedValueOnce({ data: mockMembresia })
    const { result } = renderHook(() => useSocioMembresiaMe(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.estado).toBe('activa')
    expect(api.get).toHaveBeenCalledWith('/memberships/me/')
  })

  it('starts pending', () => {
    api.get.mockResolvedValueOnce({ data: mockMembresia })
    const { result } = renderHook(() => useSocioMembresiaMe(), { wrapper })
    expect(result.current.isPending).toBe(true)
  })
})

describe('useMembresiasPorSocio', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches membresias for a given socioId', async () => {
    api.get.mockResolvedValueOnce({ data: { results: [mockMembresia] } })
    const { result } = renderHook(() => useMembresiasPorSocio(5), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(api.get).toHaveBeenCalledWith('/memberships/membresias/', { params: { socio: 5 } })
  })

  it('does not fetch when socioId is falsy', () => {
    const { result } = renderHook(() => useMembresiasPorSocio(null), { wrapper })
    expect(result.current.isFetching).toBe(false)
    expect(api.get).not.toHaveBeenCalled()
  })

  it('handles non-paginated response (bare array)', async () => {
    api.get.mockResolvedValueOnce({ data: [mockMembresia] })
    const { result } = renderHook(() => useMembresiasPorSocio(3), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
  })
})

describe('useMembresiaActivaDeSocio', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the active membership when one exists', async () => {
    const inactiva = { id: 2, estado: 'vencida', plan: { nombre: 'Plan' } }
    api.get.mockResolvedValueOnce({ data: { results: [inactiva, mockMembresia] } })

    const { result } = renderHook(() => useMembresiaActivaDeSocio(7), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.estado).toBe('activa')
  })

  it('returns null when socio has no active membership', async () => {
    const inactiva = { id: 2, estado: 'vencida', plan: { nombre: 'Plan' } }
    api.get.mockResolvedValueOnce({ data: { results: [inactiva] } })

    const { result } = renderHook(() => useMembresiaActivaDeSocio(7), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('does not fetch when socioId is falsy', () => {
    const { result } = renderHook(() => useMembresiaActivaDeSocio(0), { wrapper })
    expect(result.current.isFetching).toBe(false)
  })
})
