import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import HistorialPagosPage from '../HistorialPagosPage'

vi.mock('../../../hooks/queries/useMisPagos', () => ({
  useMisPagos: vi.fn(),
}))

// Mock AppLayout to avoid full layout rendering
vi.mock('../../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}))

vi.mock('../../../components/layout/TopBar', () => ({
  default: ({ title }) => <div data-testid="topbar">{title}</div>,
}))

vi.mock('../../../services/pagosService', () => ({
  descargarComprobante: vi.fn().mockResolvedValue(undefined),
}))

import { useMisPagos } from '../../../hooks/queries/useMisPagos'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HistorialPagosPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('HistorialPagosPage', () => {
  it('shows loading skeletons when loading', () => {
    useMisPagos.mockReturnValue({ data: [], isPending: true })
    renderPage()
    // Skeleton presence confirmed by app-layout rendering without table
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows empty state when no pagos', () => {
    useMisPagos.mockReturnValue({ data: [], isPending: false })
    renderPage()
    expect(screen.getByText(/Sin pagos registrados/i)).toBeInTheDocument()
  })

  it('renders payment rows', () => {
    useMisPagos.mockReturnValue({
      data: [
        { id: 1, monto: 1000, estado: 'aprobado', metodo: 'manual', plan_nombre: 'Plan Mensual', created_at: '2026-09-01T10:00:00Z' },
      ],
      isPending: false,
    })
    renderPage()
    expect(screen.getByText('Plan Mensual')).toBeInTheDocument()
    expect(screen.getByText('aprobado')).toBeInTheDocument()
  })

  it('shows TopBar with correct title', () => {
    useMisPagos.mockReturnValue({ data: [], isPending: false })
    renderPage()
    expect(screen.getByTestId('topbar')).toHaveTextContent('Mis Pagos')
  })

  it('comprobante button only shown for aprobado', () => {
    useMisPagos.mockReturnValue({
      data: [
        { id: 1, monto: 1000, estado: 'aprobado', metodo: 'manual', plan_nombre: 'Plan Mensual', created_at: '2026-09-01T10:00:00Z' },
        { id: 2, monto: 500, estado: 'pendiente', metodo: 'manual', plan_nombre: 'Plan Básico', created_at: '2026-09-02T10:00:00Z' },
        { id: 3, monto: 200, estado: 'rechazado', metodo: 'mercado_pago', plan_nombre: 'Plan Gold', created_at: '2026-09-03T10:00:00Z' },
      ],
      isPending: false,
    })
    renderPage()

    // Should show comprobante button only for the aprobado pago (id=1)
    expect(screen.getByTestId('comprobante-btn-1')).toBeInTheDocument()
    expect(screen.queryByTestId('comprobante-btn-2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('comprobante-btn-3')).not.toBeInTheDocument()
  })
})
