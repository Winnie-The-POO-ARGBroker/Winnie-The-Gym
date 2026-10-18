/**
 * The download toasts must not cover the export buttons in the page header
 * (sonner's default is top-right), so they are pinned to the bottom-right.
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReportesPage from './ReportesPage'
import { exportReport } from '../../services/reportsService'

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('../../services/reportsService', () => ({
  exportReport: vi.fn(),
  getReportPlans: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../hooks/queries/usePlanes', () => ({
  usePlanes: () => ({ data: [], isPending: false }),
}))

vi.mock('../../hooks/queries/useReportes', () => ({
  useReportesResumen: vi.fn(() => ({
    data: {
      ingresosMesFormatted: '$ 0',
      vsAnteriorFormatted: '+0%',
      chartPath: 'M 0,80 L 100,70',
      asistenciaBars: [0, 0, 0, 0, 0, 0, 0],
      morososCount: 0,
      adeudadoFormatted: '$ 0',
      morosidadTasa: '0%',
      morosidadPct: 0,
      activasCount: '0',
      porVencerCount: 0,
      nuevasMesCount: 0,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
}))

vi.mock('../../hooks/useAuth', () => ({
  default: () => ({ user: { rol: 'recepcionista', email: 'r@gym.test' } }),
}))

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}))

vi.mock('../../components/layout/TopBar', () => ({
  default: ({ rightContent }) => <div>{rightContent}</div>,
}))

vi.mock('../../components/recepcion/ReportExportButtons', () => ({
  default: ({ onExport }) => (
    <button data-testid="export-xlsx" onClick={() => onExport('xlsx')}>Exportar Excel</button>
  ),
}))

import { toast } from 'sonner'

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ReportesPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ReportesPage — download toasts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows loading and success toasts at the bottom-right, keeping the text', async () => {
    exportReport.mockResolvedValueOnce({ filename: 'reporte.xlsx' })
    await act(async () => { renderPage() })

    fireEvent.click(screen.getByTestId('export-xlsx'))

    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    expect(toast.loading).toHaveBeenCalledWith(
      expect.stringContaining('Generando reporte'),
      expect.objectContaining({ position: 'bottom-right' }),
    )
    expect(toast.success).toHaveBeenCalledWith(
      'Reporte descargado: reporte.xlsx',
      expect.objectContaining({ id: 'toast-id', position: 'bottom-right' }),
    )
  })

  it('shows the error toast at the bottom-right too', async () => {
    exportReport.mockRejectedValueOnce(new Error('Sin datos'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await act(async () => { renderPage() })

    fireEvent.click(screen.getByTestId('export-xlsx'))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(toast.error).toHaveBeenCalledWith(
      'Sin datos',
      expect.objectContaining({ id: 'toast-id', position: 'bottom-right' }),
    )
  })
})
