/**
 * Test 16 (contract): PagosAdminPage > renders totales respecting filters
 * #186 — Pantalla Pagos admin
 */

import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PagosAdminPage from '../PagosAdminPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../hooks/queries/usePagos', () => ({
  usePagosAdmin: vi.fn(),
  usePagosTotales: vi.fn(),
  useAnularPagoMutation: vi.fn(),
}))

vi.mock('../../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}))

vi.mock('../../../components/layout/TopBar', () => ({
  default: ({ title, rightContent }) => (
    <div>
      <h1>{title}</h1>
      {rightContent}
    </div>
  ),
}))

vi.mock('../../../services/reportsService', () => ({
  exportReport: vi.fn().mockResolvedValue({ success: true, filename: 'test.csv' }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), loading: vi.fn() },
}))

import { usePagosAdmin, usePagosTotales, useAnularPagoMutation } from '../../../hooks/queries/usePagos'

const mockTotales = {
  total_aprobado: 150000,
  total_pendiente: 5000,
  total_rechazado: 2000,
  count: 10,
}

const mockPagos = [
  {
    id: 1,
    socio: 10,
    socio_nombre: 'Juan Pérez',
    socio_dni: '12345678',
    plan_nombre: 'Plan Mensual',
    monto: 15000,
    estado: 'aprobado',
    metodo: 'manual',
    medio_manual: 'efectivo',
    cobrado_por_nombre: 'Recep 1',
    paid_at: '2026-10-01T10:00:00Z',
    created_at: '2026-10-01T10:00:00Z',
  },
]

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PagosAdminPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('PagosAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePagosAdmin.mockReturnValue({
      data: { results: mockPagos, count: 1 },
      isLoading: false,
      isError: false,
    })
    usePagosTotales.mockReturnValue({
      data: mockTotales,
      isLoading: false,
    })
    useAnularPagoMutation.mockReturnValue({ mutate: vi.fn(), isPending: false })
  })

  it('renders page title', () => {
    renderPage()
    expect(screen.getByText('Pagos')).toBeInTheDocument()
  })

  it('renders totales cards with data', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('totales-cards')).toBeInTheDocument()
    })
  })

  it('renders Aprobados totales card', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Aprobados')).toBeInTheDocument()
    })
  })

  it('renders Pendientes totales card', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Pendientes')).toBeInTheDocument()
    })
  })

  it('renders total registros count', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Total registros')).toBeInTheDocument()
    })
  })

  it('renders payment rows from API', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    })
  })

  it('renders socio DNI in row', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/12345678/)).toBeInTheDocument()
    })
  })

  it('renders filter inputs', () => {
    renderPage()
    expect(screen.getByPlaceholderText(/Nombre, apellido o DNI/i)).toBeInTheDocument()
  })

  it('renders estado filter select', () => {
    renderPage()
    expect(screen.getByText('Todos')).toBeInTheDocument()
  })

  it('renders export CSV button', () => {
    renderPage()
    expect(screen.getAllByText('CSV').length).toBeGreaterThan(0)
  })
})
