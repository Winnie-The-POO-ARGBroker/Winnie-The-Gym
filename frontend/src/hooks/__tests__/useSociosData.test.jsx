import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSociosList, useSocioMutations } from '../queries/useSociosData'
import * as sociosService from '../../services/sociosService'

vi.mock('../../services/sociosService')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useSociosData hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useSociosList obtiene la lista paginada de socios', async () => {
    const mockData = {
      count: 2,
      results: [
        { id: 1, nombre: 'Juan', apellido: 'Pérez' },
        { id: 2, nombre: 'María', apellido: 'López' },
      ],
    }
    sociosService.getSocios.mockResolvedValueOnce(mockData)

    const { result } = renderHook(() => useSociosList({ page: 1 }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockData)
  })

  it('useSocioMutations.create ejecuta createSocio exitosamente', async () => {
    const nuevo = { id: 10, nombre: 'Esteban', apellido: 'Quito' }
    sociosService.createSocio.mockResolvedValueOnce(nuevo)

    const { result } = renderHook(() => useSocioMutations(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.create.mutateAsync(nuevo)
    })

    expect(sociosService.createSocio).toHaveBeenCalledWith(nuevo)
  })

  it('useSocioMutations.baja ejecuta darBajaSocio', async () => {
    sociosService.darBajaSocio.mockResolvedValueOnce({ id: 5, estado: 'baja' })

    const { result } = renderHook(() => useSocioMutations(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.baja.mutateAsync(5)
    })

    expect(sociosService.darBajaSocio).toHaveBeenCalledWith(5)
  })

  it('useSocioMutations.certificado ejecuta uploadCertificado', async () => {
    sociosService.uploadCertificado.mockResolvedValueOnce({ id: 1, certificado_medico_url: 'url' })
    const dummyFile = new File([''], 'test.pdf')

    const { result } = renderHook(() => useSocioMutations(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.certificado.mutateAsync({ id: 1, archivo: dummyFile })
    })

    expect(sociosService.uploadCertificado).toHaveBeenCalledWith(1, dummyFile)
  })
})
