import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReportesPage from '../ReportesPage'
import * as reportsService from '../../../services/reportsService'

vi.mock('../../../services/reportsService', () => ({
  exportReport: vi.fn().mockResolvedValue({ success: true, filename: 'reporte.pdf' }),
  getReportPlans: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../hooks/queries/usePlanes', () => ({
  usePlanes: () => ({
    data: [],
    isPending: false,
  }),
}))

vi.mock('../../../hooks/queries/useReportes', () => ({
  useReportMetrics: vi.fn(() => ({
    data: {
      ingresosMesFormatted: '$ 0',
      vsAnteriorFormatted: '+0%',
      chartPath: 'M 0,80 L 100,70',
      asistenciaBars: [10, 10, 10, 10, 10, 10, 10],
      morososCount: 0,
      adeudadoFormatted: '$ 0',
      morosidadTasa: '0%',
      morosidadPct: 0,
      activasCount: '0',
      porVencerCount: 0,
      nuevasMesCount: 0,
    },
    isLoading: false,
  })),
}))

vi.mock('../../../hooks/useAuth', () => ({
  default: () => ({
    user: { rol: 'recepcionista', nombre: 'Test User', email: 'test@gym.test' },
    accessToken: 'mock-token',
    refreshToken: 'mock-refresh',
    setAuth: vi.fn(),
    updateRole: vi.fn(),
    clearAuth: vi.fn(),
  }),
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

describe('ReportesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders top bar, export buttons, tabs, and filters', async () => {
    await act(async () => {
      renderWithProviders(<ReportesPage />)
    })

    expect(screen.getByRole('heading', { name: /reportes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /exportar pdf/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /exportar excel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /exportar csv/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^resumen$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^morosidad$/i })).toBeInTheDocument()
  })

  it('triggers exportReport when clicking PDF export button', async () => {
    await act(async () => {
      renderWithProviders(<ReportesPage />)
    })

    const pdfBtn = screen.getByRole('button', { name: /exportar pdf/i })
    await act(async () => {
      fireEvent.click(pdfBtn)
    })

    expect(reportsService.exportReport).toHaveBeenCalledWith(
      'morosidad',
      expect.any(Object),
      'pdf'
    )
  })

  it('triggers exportReport when clicking Excel export button', async () => {
    await act(async () => {
      renderWithProviders(<ReportesPage />)
    })

    const excelBtn = screen.getByRole('button', { name: /exportar excel/i })
    await act(async () => {
      fireEvent.click(excelBtn)
    })

    expect(reportsService.exportReport).toHaveBeenCalledWith(
      'morosidad',
      expect.any(Object),
      'xlsx'
    )
  })

  it('switches tabs and updates active category', async () => {
    await act(async () => {
      renderWithProviders(<ReportesPage />)
    })

    const asistenciaTab = screen.getByRole('button', { name: /^asistencia$/i })
    await act(async () => {
      fireEvent.click(asistenciaTab)
    })

    // Now export should use asistencia
    const csvBtn = screen.getByRole('button', { name: /exportar csv/i })
    await act(async () => {
      fireEvent.click(csvBtn)
    })

    expect(reportsService.exportReport).toHaveBeenCalledWith(
      'asistencia',
      expect.any(Object),
      'csv'
    )
  })
})
