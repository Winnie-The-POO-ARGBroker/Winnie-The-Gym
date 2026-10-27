import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RecepcionistaDashboardView from '../views/RecepcionistaDashboardView'

const mockUseAccessLogs = vi.fn(() => ({ data: [], isLoading: false, isError: false }))

vi.mock('../../../hooks/queries/useDashboardData', () => ({
  useAccessLogs: (...args) => mockUseAccessLogs(...args),
  mapAccessLog: (log) => log,
  useAforoStats: () => ({
    data: { aforo_actual: 37, ingresos_hoy: 8, egresos_hoy: 3 },
  }),
  useAforoSnapshot: () => ({ data: undefined }),
}))

// WS disconnected
vi.mock('../../../hooks/useWebSocket', () => ({
  default: () => ({
    lastMessage: null,
    isConnecting: false,
    isConnected: false,
  }),
}))

vi.mock('../../../hooks/queries/useGymConfig', () => ({
  useGymConfig: () => ({ data: { aforo_maximo: 200 } }),
}))

describe('RecepcionistaDashboardView — Aforo REST fallback', () => {
  it('shows REST aforo value when WebSocket has no message', () => {
    render(<RecepcionistaDashboardView navigate={vi.fn()} />)
    expect(screen.getByText(/37/)).toBeInTheDocument()
  })

  it('does NOT show spinner when WS is disconnected but REST data is available', () => {
    render(<RecepcionistaDashboardView navigate={vi.fn()} />)
    expect(screen.getByText(/aforo en vivo/i)).toBeInTheDocument()
  })
})

describe('RecepcionistaDashboardView — Movimientos recientes', () => {
  beforeEach(() => mockUseAccessLogs.mockClear())

  it('requests exactly 10 movements', () => {
    render(<RecepcionistaDashboardView navigate={vi.fn()} />)
    expect(mockUseAccessLogs).toHaveBeenCalledWith(10, 10)
  })

  it('renders at most 10 rows even if the API returns 50', () => {
    const logs = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1, name: `Socio ${i + 1}`, membership: 'Plan', time: '10:08 p.m.', dayLabel: 'Hoy', type: 'entry', denied: false,
    }))
    mockUseAccessLogs.mockReturnValue({ data: logs, isLoading: false, isError: false })
    render(<RecepcionistaDashboardView navigate={vi.fn()} />)
    expect(screen.getAllByTestId('movement-entry')).toHaveLength(10)
  })

  it('still renders the denial text', () => {
    mockUseAccessLogs.mockReturnValue({
      data: [{ id: 1, name: 'Ana', membership: 'Plan', time: '10:00', dayLabel: 'Hoy', type: 'entry', denied: true, denialReason: 'Membresía inactiva o vencida' }],
      isLoading: false, isError: false,
    })
    render(<RecepcionistaDashboardView navigate={vi.fn()} />)
    expect(screen.getByText(/Entrada denegada/)).toBeInTheDocument()
    expect(screen.getByText(/Membresía inactiva o vencida/)).toBeInTheDocument()
  })
})
