import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RecepcionistaDashboardView from '../views/RecepcionistaDashboardView'

vi.mock('../../../hooks/queries/useDashboardData', () => ({
  useAccessLogs: () => ({ data: [], isLoading: false, isError: false }),
  mapAccessLog: (log) => log,
  useAforoStats: () => ({
    data: { aforo_actual: 37, ingresos_hoy: 8, egresos_hoy: 3 },
  }),
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
