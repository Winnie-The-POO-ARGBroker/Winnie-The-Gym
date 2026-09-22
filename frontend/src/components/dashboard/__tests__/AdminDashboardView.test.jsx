import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AdminDashboardView from '../views/AdminDashboardView'

// Mock hooks that fire real HTTP requests
vi.mock('../../../hooks/queries/useDashboardData', () => ({
  useAccessLogs: () => ({ data: [], isLoading: false, isError: false }),
  useDashboardAlerts: () => ({ data: [], isLoading: false, isError: false }),
  useDashboardClasses: () => ({ data: [], isLoading: false, isError: false }),
  mapAccessLog: (log) => log,
  useAforoStats: () => ({
    data: { aforo_actual: 42, ingresos_hoy: 10, egresos_hoy: 5 },
  }),
}))

// WS disconnected — isConnecting=false, lastMessage=null
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

describe('AdminDashboardView — Aforo REST fallback', () => {
  it('shows REST aforo value when WebSocket has no message and is not connecting', () => {
    render(<AdminDashboardView navigate={vi.fn()} />)
    // AforoCard renders "{current} / {max}" — REST returns aforo_actual=42
    expect(screen.getByText(/42/)).toBeInTheDocument()
  })

  it('does NOT show spinner when WS is disconnected but REST data is available', () => {
    render(<AdminDashboardView navigate={vi.fn()} />)
    // Skeleton is rendered when loading=true; its absence means card rendered actual data
    // AforoCard shows "Aforo en vivo" text only when loading=false
    expect(screen.getByText(/aforo en vivo/i)).toBeInTheDocument()
  })
})
