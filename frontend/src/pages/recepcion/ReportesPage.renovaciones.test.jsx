import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReportesPage from './ReportesPage'

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
      ingresos: { mes_actual: 0, mes_anterior: 0, variacion_pct: 0, serie_6_meses: [] },
      morosos: { cantidad: 0, monto_total: 0, tasa_pct: 0 },
      membresias: { activas: 20, por_vencer_7d: 2, nuevas_mes: 7, renovaciones_mes: 13 },
      asistencia: { promedio_dia: {} },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
}))

vi.mock('../../hooks/useAuth', () => ({
  default: () => ({
    user: { rol: 'recepcionista', nombre: 'Test User', email: 'test@gym.test' },
    accessToken: 'mock-token',
    refreshToken: 'mock-refresh',
    setAuth: vi.fn(),
    updateRole: vi.fn(),
    clearAuth: vi.fn(),
  }),
}))

describe('ReportesPage - renovaciones/mes', () => {
  it('shows the backend renovaciones_mes next to nuevas_mes', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><ReportesPage /></MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText(/^nuevas\/mes$/i).nextElementSibling).toHaveTextContent('+7')
    expect(screen.getByText(/^renovaciones\/mes$/i).nextElementSibling).toHaveTextContent('13')
  })
})
