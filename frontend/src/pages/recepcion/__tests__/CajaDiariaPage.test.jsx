import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CajaDiariaPage from '../CajaDiariaPage'
import api from '../../../services/api'
import { useStaffList } from '../../../hooks/queries/useStaff'

// Stub AppLayout + TopBar to speed up renders and avoid Sidebar noise.
vi.mock('../../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}))
vi.mock('../../../components/layout/TopBar', () => ({
  default: ({ title }) => <div data-testid="top-bar">{title}</div>,
}))

vi.mock('../../../services/api', () => ({
  default: { get: vi.fn() },
}))

vi.mock('../../../hooks/queries/useStaff', () => ({
  useStaffList: vi.fn(() => ({
    data: [{ id: 2, username: 'maria', first_name: 'Maria', last_name: 'Lopez' }],
  })),
}))

// Mutable holder so individual tests can switch the role
let currentUser = { rol: 'recepcionista', id: 1 }

vi.mock('../../../stores/authStore', () => ({
  default: vi.fn((selector) => selector({ user: currentUser })),
}))

const CAJA_MOCK = {
  fecha: '2026-10-14',
  operador: null,
  cobros_por_medio: {
    efectivo:      { count: 3, total: 9000 },
    transferencia: { count: 1, total: 5000 },
    debito:        { count: 2, total: 4000 },
    credito:       { count: 0, total: 0 },
    otro:          { count: 1, total: 1500 },
  },
  total_cobros: 19500,
  total_anulaciones: 500,
  diferencia: null,
}

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CajaDiariaPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('CajaDiariaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockResolvedValue({ data: CAJA_MOCK })
    currentUser = { rol: 'recepcionista', id: 1 }
  })

  it('renderiza cards por medio de pago', async () => {
    renderWithProviders()

    expect(await screen.findByTestId('card-medio-efectivo')).toBeInTheDocument()
    expect(screen.getByTestId('card-medio-transferencia')).toBeInTheDocument()
    expect(screen.getByTestId('card-medio-debito')).toBeInTheDocument()
    expect(screen.getByTestId('card-medio-credito')).toBeInTheDocument()
    expect(screen.getByTestId('card-medio-otro')).toBeInTheDocument()
  })

  it('muestra el total de cobros y anulaciones', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('caja-total-cobros')).toBeInTheDocument()
      expect(screen.getByTestId('caja-total-anulaciones')).toBeInTheDocument()
    })
  })

  it('llama a la API con la fecha correcta', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/payments/caja/',
        expect.objectContaining({
          params: expect.objectContaining({ fecha: expect.any(String) }),
        })
      )
    })
  })

  it('no muestra el selector de operador para recepcionista', async () => {
    renderWithProviders()
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    expect(screen.queryByTestId('caja-operador-select')).not.toBeInTheDocument()
  })

  it('muestra el selector de operador para administrador', async () => {
    currentUser = { rol: 'administrador', id: 99 }
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('caja-operador-select')).toBeInTheDocument()
    })
  })
  it('no se rompe cuando la API de staff devuelve el listado paginado { count, results }', async () => {
    currentUser = { rol: 'administrador', id: 99 }
    vi.mocked(useStaffList).mockReturnValue({
      data: { count: 1, results: [{ id: 2, username: 'maria', first_name: 'Maria', last_name: 'Lopez' }] },
    })

    renderWithProviders()

    expect(await screen.findByTestId('caja-operador-select')).toBeInTheDocument()
    expect(screen.queryByText(/algo salió mal/i)).not.toBeInTheDocument()
  })
})
