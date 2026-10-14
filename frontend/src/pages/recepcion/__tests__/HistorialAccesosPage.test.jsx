import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HistorialAccesosPage from '../HistorialAccesosPage'

// Mock layout components — avoid router/auth complexity
vi.mock('../../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}))

vi.mock('../../../components/layout/TopBar', () => ({
  default: ({ title, subtitle, rightContent }) => (
    <div data-testid="top-bar">
      <span>{title}</span>
      <span>{subtitle}</span>
      <div>{rightContent}</div>
    </div>
  ),
}))

// Mock the hook — we control what data is returned per test
vi.mock('../../../hooks/queries/useAccessLogs', () => ({
  useAccessLogs: vi.fn(() => ({
    data: { results: [], count: 0 },
    isLoading: false,
  })),
}))

// Intercept api export calls (blob download)
vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

import { useAccessLogs } from '../../../hooks/queries/useAccessLogs'

const SAMPLE_LOGS = [
  {
    id: 1,
    timestamp: '2026-01-15T10:30:00Z',
    socio_nombre: 'Carlos Pérez',
    socio_dni: '30123456',
    access_type: 'ENTRADA',
    status: 'GRANTED',
    denial_reason: null,
    user_plan_nombre: 'Plan Premium',
  },
  {
    id: 2,
    timestamp: '2026-01-15T08:00:00Z',
    socio_nombre: 'Ana Gómez',
    socio_dni: '25000001',
    access_type: 'ENTRADA',
    status: 'DENIED',
    denial_reason: 'MEMBERSHIP_INACTIVE',
    user_plan_nombre: null,
  },
  {
    id: 3,
    timestamp: '2026-01-14T17:00:00Z',
    socio_nombre: 'Juan López',
    socio_dni: '33456789',
    access_type: 'SALIDA',
    status: 'GRANTED',
    denial_reason: null,
    user_plan_nombre: 'Plan Básico',
  },
]

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <HistorialAccesosPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('HistorialAccesosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page title', () => {
    renderPage()
    expect(screen.getByText('Historial de accesos')).toBeInTheDocument()
  })

  it('shows empty state when no logs', () => {
    useAccessLogs.mockReturnValue({ data: { results: [], count: 0 }, isLoading: false })
    renderPage()
    expect(screen.getByText(/Sin resultados/i)).toBeInTheDocument()
  })

  it('renders table rows for each log', () => {
    useAccessLogs.mockReturnValue({ data: { results: SAMPLE_LOGS, count: 3 }, isLoading: false })
    renderPage()
    expect(screen.getByText('Carlos Pérez')).toBeInTheDocument()
    expect(screen.getByText('Ana Gómez')).toBeInTheDocument()
    expect(screen.getByText('Juan López')).toBeInTheDocument()
  })

  /**
   * Test #11 from contract: "filters by DNI and shows denied rows"
   * Verifies that:
   * 1. Searching by DNI calls useAccessLogs with search param
   * 2. DENIED rows are shown with their human-readable denial reason
   */
  it('filters by DNI and shows denied rows', async () => {
    // First render shows all logs including a DENIED one
    useAccessLogs.mockReturnValue({
      data: { results: SAMPLE_LOGS, count: 3 },
      isLoading: false,
    })
    renderPage()

    // Confirm a DENIED row is rendered with its human-readable reason
    expect(screen.getByText('Ana Gómez')).toBeInTheDocument()
    // Denial reason label from ACCESS_DENIAL_REASONS map
    // (may appear both in dropdown option AND in table cell — use getAllByText)
    expect(screen.getAllByText('Membresía inactiva o vencida').length).toBeGreaterThan(0)
    // There should be at least one DENIED badge (use getAllByText to handle multiple)
    expect(screen.getAllByText('Denegado').length).toBeGreaterThan(0)

    // Now type a DNI in the search box
    const searchInput = screen.getByPlaceholderText(/Buscar por DNI/i)
    fireEvent.change(searchInput, { target: { value: '25000001' } })

    // useAccessLogs should now be called with search param
    await waitFor(() => {
      expect(useAccessLogs).toHaveBeenCalledWith(
        expect.objectContaining({ search: '25000001' })
      )
    })
  })

  it('shows loading skeletons while fetching', () => {
    useAccessLogs.mockReturnValue({ data: null, isLoading: true })
    renderPage()
    // Loading state renders skeleton rows — we just check that the table body is NOT showing records
    expect(screen.queryByText('Carlos Pérez')).not.toBeInTheDocument()
  })

  it('renders export buttons', () => {
    renderPage()
    expect(screen.getAllByText('CSV').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Excel').length).toBeGreaterThan(0)
    expect(screen.getAllByText('PDF').length).toBeGreaterThan(0)
  })

  it('shows correct status badges', () => {
    useAccessLogs.mockReturnValue({ data: { results: SAMPLE_LOGS, count: 3 }, isLoading: false })
    renderPage()
    expect(screen.getAllByText('Permitido').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Denegado').length).toBeGreaterThanOrEqual(1)
  })

  it('shows DNI for each log entry', () => {
    useAccessLogs.mockReturnValue({ data: { results: SAMPLE_LOGS, count: 3 }, isLoading: false })
    renderPage()
    expect(screen.getByText('DNI 30123456')).toBeInTheDocument()
    expect(screen.getByText('DNI 25000001')).toBeInTheDocument()
  })
})
