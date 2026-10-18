import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import CreateClassPage from './CreateClassPage'
import { renderWithProviders, resetAllStores } from '../test/test-utils'

const mockCreateMutate = vi.fn()
let searchParams = ''

vi.mock('../hooks/queries/useClases', () => ({
  useClasesMutations: vi.fn(),
  useClaseDetail: vi.fn(),
  useClasesList: vi.fn(),
}))
vi.mock('../hooks/queries/useCatalogo', () => ({
  useDisciplinas: vi.fn(() => ({ data: [], isPending: false })),
  useSalas: vi.fn(() => ({ data: [], isPending: false })),
}))
vi.mock('../hooks/queries/usePlanesAdmin', () => ({ usePlanesQuery: vi.fn() }))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => vi.fn(), useSearchParams: () => [new URLSearchParams(searchParams), vi.fn()] }
})
vi.mock('../components/layout/AppLayout', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../components/layout/TopBar', () => ({ default: ({ title }) => <h1>{title}</h1> }))
vi.mock('../services/api', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { results: [] } }), post: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

import { useClasesMutations, useClaseDetail, useClasesList } from '../hooks/queries/useClases'
import { usePlanesQuery } from '../hooks/queries/usePlanesAdmin'

const PLANES = [
  { id: 1, nombre: 'Básico', activo: true },
  { id: 9, nombre: 'Plan test 2', activo: true },
  { id: 10, nombre: 'Plan viejo', activo: false },
]

describe('CreateClassPage — planes habilitados', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllStores()
    searchParams = ''
    useClasesMutations.mockReturnValue({
      create: { mutate: mockCreateMutate, isPending: false },
      update: { mutate: vi.fn(), isPending: false },
      cancelar: { mutate: vi.fn(), isPending: false },
    })
    useClaseDetail.mockReturnValue({ data: null, isLoading: false })
    useClasesList.mockReturnValue({ data: [], isFetching: false })
    usePlanesQuery.mockReturnValue({ data: PLANES, isPending: false, isError: false })
  })

  it('ofrece los planes reales activos, no una lista fija', async () => {
    renderWithProviders(<CreateClassPage />)

    expect(await screen.findByRole('button', { name: 'Plan test 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Básico' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Plan viejo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Premium' })).not.toBeInTheDocument()
  })

  it('guarda el nombre del plan elegido al publicar', async () => {
    renderWithProviders(<CreateClassPage />)
    fireEvent.change(await screen.findByPlaceholderText(/Funcional Intensivo/i), { target: { value: 'Clase Test' } })
    fireEvent.change(screen.getByDisplayValue('Sin instructor asignado'), { target: { value: 'Carlos R.' } })
    fireEvent.click(screen.getByRole('button', { name: 'L' }))
    fireEvent.click(screen.getByRole('button', { name: 'Plan test 2' }))
    fireEvent.click(screen.getAllByText('Publicar clase')[0])

    await waitFor(() => expect(mockCreateMutate).toHaveBeenCalled())
    expect(mockCreateMutate.mock.calls[0][0].planes_habilitados).toEqual(['Plan test 2'])
  })

  it('mantiene visible un plan ya habilitado que ya no existe, para poder quitarlo', async () => {
    searchParams = 'id=2'
    useClaseDetail.mockReturnValue({
      data: { id: 2, nombre: 'Funcional', dia: 'lunes', hora: '07:00', instructor: 'Carlos R.', dias_recurrencia: ['L'], planes_habilitados: ['Gold'], cupo_maximo: 25 },
      isLoading: false,
    })
    renderWithProviders(<CreateClassPage />)

    expect(await screen.findByRole('button', { name: 'Gold' })).toBeInTheDocument()
  })

  it('mientras cargan los planes no ofrece ninguno inventado', async () => {
    usePlanesQuery.mockReturnValue({ data: undefined, isPending: true, isError: false })
    renderWithProviders(<CreateClassPage />)

    expect(await screen.findByText(/cargando planes/i)).toBeInTheDocument()
    for (const nombre of ['Básico', 'Premium', 'Gold']) {
      expect(screen.queryByRole('button', { name: nombre })).not.toBeInTheDocument()
    }
  })

  it('si los planes no se pueden cargar avisa en vez de ofrecer una lista falsa', async () => {
    usePlanesQuery.mockReturnValue({ data: undefined, isPending: false, isError: true })
    renderWithProviders(<CreateClassPage />)

    expect(await screen.findByText(/no se pudieron cargar los planes/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Premium' })).not.toBeInTheDocument()
  })

  it('si todavía no hay planes creados lo dice', async () => {
    usePlanesQuery.mockReturnValue({ data: [], isPending: false, isError: false })
    renderWithProviders(<CreateClassPage />)

    expect(await screen.findByText(/no hay planes creados/i)).toBeInTheDocument()
  })
})
