import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminUsuariosPage from '../AdminUsuariosPage'

const mockStaffList = [
  {
    id: 1,
    email: 'admin@gym.test',
    first_name: 'Admin',
    last_name: 'Gym',
    rol: 'administrador',
    is_active: true,
  },
  {
    id: 2,
    email: 'recep@gym.test',
    first_name: 'Recep',
    last_name: 'Gym',
    rol: 'recepcionista',
    is_active: true,
  },
]

const mockUseStaffList = vi.fn(() => ({ data: mockStaffList, isLoading: false }))
const mockUseResendActivation = vi.fn(() => ({ mutate: vi.fn(), isPending: false }))

// Mock hooks used by the page
vi.mock('../../../hooks/queries/useStaff', () => ({
  useStaffList: (...args) => mockUseStaffList(...args),
  useResendActivation: (...args) => mockUseResendActivation(...args),
}))

// Mock layout components to avoid heavy deps
vi.mock('../../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}))
vi.mock('../../../components/layout/TopBar', () => ({
  default: ({ title, actions }) => (
    <div data-testid="top-bar">
      <span>{title}</span>
      {actions}
    </div>
  ),
}))
vi.mock('../../../components/admin/StaffFormModal', () => ({
  default: ({ isOpen }) =>
    isOpen ? <div data-testid="staff-form-modal" /> : null,
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

describe('AdminUsuariosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title', () => {
    renderWithProviders(<AdminUsuariosPage />)
    expect(screen.getByText('Gestión de usuarios')).toBeInTheDocument()
  })

  it('renders staff table with email rows', async () => {
    renderWithProviders(<AdminUsuariosPage />)
    await waitFor(() => {
      expect(screen.getByText('admin@gym.test')).toBeInTheDocument()
      expect(screen.getByText('recep@gym.test')).toBeInTheDocument()
    })
  })

  it('shows Crear staff button', () => {
    renderWithProviders(<AdminUsuariosPage />)
    expect(screen.getByRole('button', { name: /crear staff/i })).toBeInTheDocument()
  })

  it('opens StaffFormModal when Crear staff button is clicked', async () => {
    renderWithProviders(<AdminUsuariosPage />)

    const btn = screen.getByRole('button', { name: /crear staff/i })
    fireEvent.click(btn)

    await waitFor(() => {
      expect(screen.getByTestId('staff-form-modal')).toBeInTheDocument()
    })
  })

  it('shows loading state when isLoading is true', () => {
    mockUseStaffList.mockReturnValueOnce({ data: undefined, isLoading: true })
    renderWithProviders(<AdminUsuariosPage />)
    expect(screen.getByText(/cargando usuarios/i)).toBeInTheDocument()
  })

  it('shows empty state when no staff', () => {
    mockUseStaffList.mockReturnValueOnce({ data: [], isLoading: false })
    renderWithProviders(<AdminUsuariosPage />)
    expect(screen.getByText(/no hay usuarios staff registrados/i)).toBeInTheDocument()
  })

  it('renders Reenviar activación button per row', async () => {
    renderWithProviders(<AdminUsuariosPage />)
    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /reenviar activación/i })
      expect(buttons).toHaveLength(2)
    })
  })

  it('displays correct rol labels', async () => {
    renderWithProviders(<AdminUsuariosPage />)
    await waitFor(() => {
      expect(screen.getByText('Administrador')).toBeInTheDocument()
      expect(screen.getByText('Recepcionista')).toBeInTheDocument()
    })
  })
})
