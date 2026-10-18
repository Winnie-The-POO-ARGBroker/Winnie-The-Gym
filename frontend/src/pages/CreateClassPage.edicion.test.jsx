import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import CreateClassPage from './CreateClassPage'
import { renderWithProviders, resetAllStores } from '../test/test-utils'

const mockUpdateMutate = vi.fn()

vi.mock('../hooks/queries/useClases', () => ({
  useClasesMutations: vi.fn(),
  useClaseDetail: vi.fn(),
  useClasesList: vi.fn(),
}))
vi.mock('../hooks/queries/useCatalogo', () => ({
  useDisciplinas: vi.fn(() => ({ data: [], isPending: false })),
  useSalas: vi.fn(() => ({ data: [], isPending: false })),
}))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams('id=5'), vi.fn()],
  }
})
vi.mock('../components/layout/AppLayout', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../components/layout/TopBar', () => ({ default: ({ title }) => <h1>{title}</h1> }))
vi.mock('../services/api', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { results: [] } }), post: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

import { useClasesMutations, useClaseDetail, useClasesList } from '../hooks/queries/useClases'
import { toast } from 'sonner'

describe('CreateClassPage en modo edición', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllStores()
    useClasesMutations.mockReturnValue({
      create: { mutate: vi.fn(), isPending: false },
      update: { mutate: mockUpdateMutate, isPending: false },
      cancelar: { mutate: vi.fn(), isPending: false },
    })
    useClasesList.mockReturnValue({ data: [], isFetching: false })
    // A legacy class: no instructor and no recurrence days.
    useClaseDetail.mockReturnValue({
      data: { id: 5, nombre: 'Clase vieja', dia: 'lunes', hora: '09:00', instructor: '', dias_recurrencia: [], cupo_maximo: 20 },
      isLoading: false,
    })
  })

  it('deja guardar un cambio en una clase sin instructor ni días (el PATCH es parcial)', async () => {
    renderWithProviders(<CreateClassPage />)
    await waitFor(() => expect(screen.getByDisplayValue('Clase vieja')).toBeInTheDocument())

    fireEvent.click(screen.getAllByText(/Guardar|Publicar/i)[0])

    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalled())
    expect(toast.error).not.toHaveBeenCalled()
  })
})
