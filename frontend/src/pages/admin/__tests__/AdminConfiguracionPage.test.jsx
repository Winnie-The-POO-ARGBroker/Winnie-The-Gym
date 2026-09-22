import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import AdminConfiguracionPage from '../AdminConfiguracionPage'

vi.mock('../../../hooks/queries/useGymConfig', () => ({
  useGymConfig: vi.fn(),
  useUpdateGymConfig: vi.fn(),
}))

vi.mock('../../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}))

vi.mock('../../../components/layout/TopBar', () => ({
  default: ({ title }) => <div data-testid="topbar">{title}</div>,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { useGymConfig, useUpdateGymConfig } from '../../../hooks/queries/useGymConfig'
import { toast } from 'sonner'

const mockConfig = {
  nombre_gym: 'Winnie The Gym',
  aforo_maximo: 200,
  hora_apertura: '07:00',
  hora_cierre: '23:00',
  telefono_contacto: '',
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminConfiguracionPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AdminConfiguracionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUpdateGymConfig.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockConfig),
      isPending: false,
    })
  })

  it('shows skeleton when loading', () => {
    useGymConfig.mockReturnValue({ data: null, isPending: true })
    renderPage()
    // Loading state renders skeletons, no form
    expect(screen.queryByRole('textbox', { name: /nombre/i })).not.toBeInTheDocument()
  })

  it('renders form fields when config is loaded', () => {
    useGymConfig.mockReturnValue({ data: mockConfig, isPending: false })
    renderPage()
    expect(screen.getByRole('spinbutton')).toBeInTheDocument() // aforo_maximo
    expect(screen.getByText(/Configuración del Gimnasio/i)).toBeInTheDocument()
  })

  it('calls mutateAsync on valid submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(mockConfig)
    useUpdateGymConfig.mockReturnValue({ mutateAsync, isPending: false })
    useGymConfig.mockReturnValue({ data: mockConfig, isPending: false })

    renderPage()

    // Modify aforo to mark form dirty
    const aforoInput = screen.getByRole('spinbutton')
    fireEvent.change(aforoInput, { target: { value: '150' } })

    fireEvent.click(screen.getByRole('button', { name: /Guardar configuración/i }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalled()
    })
  })
})
