/**
 * Test: ReportesPage renders ingresos from server summary (not client calc).
 * Contract item #10 — fix #183.
 *
 * The page now uses useReportesResumen which calls /api/reportes/resumen/
 * instead of aggregating raw data client-side. This test verifies that
 * the rendered income figure matches the server-provided mes_actual value.
 */
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReportesPage from '../recepcion/ReportesPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../services/reportsService', () => ({
  exportReport: vi.fn().mockResolvedValue({ success: true, filename: 'reporte.pdf' }),
  getReportPlans: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../hooks/useAuth', () => ({
  default: () => ({
    user: { rol: 'administrador', nombre: 'Admin', email: 'admin@gym.test' },
    accessToken: 'mock-token',
    refreshToken: 'mock-refresh',
    setAuth: vi.fn(),
    updateRole: vi.fn(),
    clearAuth: vi.fn(),
  }),
}))

// ── Server-side summary mock — simulates the new endpoint ─────────────────────

const SERVER_SUMMARY = {
  ingresos: {
    mes_actual: 42000,
    mes_anterior: 35000,
    variacion_pct: 20,
    serie_6_meses: [25000, 28000, 31000, 35000, 38000, 42000],
  },
  morosos: { cantidad: 7, monto_total: 14000, tasa_pct: 12.5 },
  membresias: { activas: 55, por_vencer_7d: 4, nuevas_mes: 10 },
  asistencia: { promedio_dia: { lun: 20, mar: 25, mie: 18, jue: 22, vie: 30, sab: 12, dom: 5 } },
}

vi.mock('../../hooks/queries/useReportes', () => ({
  useReportesResumen: vi.fn(() => ({
    data: SERVER_SUMMARY,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ReportesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders ingresos from server summary not client calc', async () => {
    await act(async () => {
      renderWithProviders(<ReportesPage />)
    })

    // The page must render the server-provided mes_actual (42000) formatted as ARS.
    // Client-side calc would give 0 because no raw pagos are fetched anymore.
    // We look for the formatted value — Argentine locale uses dots for thousands.
    const incomeText = screen.getByText(/42\.000|42,000|\$ 42/i)
    expect(incomeText).toBeInTheDocument()
  })

  it('renders the page heading and tabs', async () => {
    await act(async () => {
      renderWithProviders(<ReportesPage />)
    })

    expect(screen.getByRole('heading', { name: /reportes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^resumen$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^morosidad$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^asistencia$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^ingresos$/i })).toBeInTheDocument()
  })

  it('shows error state with Reintentar button when isError=true', async () => {
    const { useReportesResumen } = await import('../../hooks/queries/useReportes')
    useReportesResumen.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    })

    await act(async () => {
      renderWithProviders(<ReportesPage />)
    })

    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
  })

  it('shows loading spinner when isLoading=true', async () => {
    const { useReportesResumen } = await import('../../hooks/queries/useReportes')
    useReportesResumen.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    })

    await act(async () => {
      renderWithProviders(<ReportesPage />)
    })

    expect(screen.getByText(/cargando analíticas/i)).toBeInTheDocument()
  })
})
