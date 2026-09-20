import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CobroManualPage from '../CobroManualPage'
import api from '../../../services/api'

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
  }
}))

// Mock the React Query hooks used by the page
vi.mock('../../../hooks/queries/usePlanesAdmin', () => ({
  usePlanesQuery: vi.fn(() => ({
    data: [{ id: 1, nombre: 'Plan Mensual', precio: '1000.00', activo: true, duracion_dias: 30 }],
    isLoading: false,
  })),
}))

vi.mock('../../../hooks/queries/usePagos', () => ({
  useCobrarManualMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}))

// Mock de useDebounce para evitar timers en tests
vi.mock('../../../hooks/useDebounce', () => ({
  default: (val) => val
}))

// Mock pagos history sidebar
vi.mock('../../../components/pagos/HistorialPagosCard', () => ({
  default: () => <div data-testid="historial-pagos" />,
}))

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('CobroManualPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    api.get.mockImplementation((url) => {
      if (url === '/members/socios/') {
        return Promise.resolve({ data: [{ id: 1, nombre: 'Juan', apellido: 'Perez', dni: '12345678', numero_socio: 'S-0001' }] })
      }
      return Promise.resolve({ data: [] })
    })
  })

  it('renderiza correctamente y muestra planes', async () => {
    renderWithProviders(<CobroManualPage />)

    await waitFor(() => {
      expect(screen.getByText(/Plan Mensual/i)).toBeInTheDocument()
    })
  })

  it('permite buscar y seleccionar un socio con teclado', async () => {
    renderWithProviders(<CobroManualPage />)

    const input = screen.getByPlaceholderText(/Ej: Juan García o 30123456/i)
    fireEvent.change(input, { target: { value: 'Juan' } })

    // Espera que aparezca la sugerencia
    await waitFor(() => {
      expect(screen.getByText(/Juan Perez/i)).toBeInTheDocument()
    })

    // Simular teclado
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    // El chip de socio debe aparecer
    await waitFor(() => {
      expect(screen.getByText(/Socio #S-0001/i)).toBeInTheDocument()
    })
  })
})
