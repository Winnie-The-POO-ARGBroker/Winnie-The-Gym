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
import api from '../../../services/api'

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
    // The access export only supports csv and xlsx: a PDF button would always answer 400.
    expect(screen.queryByText('PDF')).not.toBeInTheDocument()
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

  // Shape the backend really sends (AccessLogSerializer): user_nombre / user_apellido / user_dni
  const API_LOGS = [
    {
      id: 10,
      timestamp: '2026-01-15T10:30:00Z',
      user_nombre: 'Laura',
      user_apellido: 'Gómez',
      user_dni: '30111222',
      access_type: 'ENTRY',
      status: 'GRANTED',
      denial_reason: null,
      user_plan_nombre: 'Plan Premium',
    },
    {
      id: 11,
      timestamp: '2026-01-15T11:30:00Z',
      user_nombre: 'Laura',
      user_apellido: 'Gómez',
      user_dni: null,
      access_type: 'EXIT',
      status: 'GRANTED',
      denial_reason: null,
      user_plan_nombre: null,
    },
  ]

  it('shows the DNI from user_dni and a dash when it is missing', () => {
    useAccessLogs.mockReturnValue({ data: { results: API_LOGS, count: 2 }, isLoading: false })
    renderPage()
    expect(screen.getByText('DNI 30111222')).toBeInTheDocument()
    expect(screen.getByText('DNI —')).toBeInTheDocument()
    expect(screen.getAllByText('Laura Gómez')).toHaveLength(2)
  })

  it('renders the access type as Entrada / Salida instead of ENTRY / EXIT', () => {
    useAccessLogs.mockReturnValue({ data: { results: API_LOGS, count: 2 }, isLoading: false })
    renderPage()
    const cells = screen.getAllByRole('cell').map((c) => c.textContent)
    expect(cells).toContain('Entrada')
    expect(cells).toContain('Salida')
    expect(screen.queryByText('ENTRY')).not.toBeInTheDocument()
    expect(screen.queryByText('EXIT')).not.toBeInTheDocument()
  })

  it('filters by the backend access_type values (ENTRY / EXIT)', () => {
    renderPage()
    const select = screen.getByDisplayValue('Todos los tipos')
    const values = Array.from(select.querySelectorAll('option')).map((o) => o.value)
    expect(values).toEqual(['', 'ENTRY', 'EXIT'])
  })

  it('sends the export format as `fmt` (the backend ignores `format`)', async () => {
    api.get.mockResolvedValueOnce({ data: new Blob(['x']) })
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    renderPage()
    fireEvent.click(screen.getAllByText('CSV')[0])
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    const [url, config] = api.get.mock.calls[0]
    expect(url).toBe('/access/logs/export/')
    expect(config.params.fmt).toBe('csv')
    expect(config.params.format).toBeUndefined()
  })
})
