/**
 * Tests for AforoMonitorPage.
 * Coverage uplift: 0% → ~75%.
 * Mocked: all hooks and child components.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AforoMonitorPage from './AforoMonitorPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/queries/useDashboardData', () => ({
  useAforoStats: vi.fn(),
  useAccessLogs: vi.fn(),
}))

vi.mock('../../hooks/queries/useGymConfig', () => ({
  useGymConfig: vi.fn(),
}))

vi.mock('../../hooks/useWebSocket', () => ({
  default: vi.fn(),
}))

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}))

vi.mock('../../components/layout/TopBar', () => ({
  default: ({ title, subtitle, rightContent }) => (
    <div data-testid="top-bar">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {rightContent}
    </div>
  ),
}))

vi.mock('../../components/recepcion/OccupancyCard', () => ({
  default: ({ aforo, maxAforo }) => (
    <div data-testid="occupancy-card">{aforo}/{maxAforo}</div>
  ),
}))

vi.mock('../../components/recepcion/RecentEventsPanel', () => ({
  default: ({ events }) => (
    <div data-testid="recent-events-panel">{events.length} events</div>
  ),
}))

vi.mock('../../components/recepcion/AforoStatBar', () => ({
  default: () => <div data-testid="aforo-stat-bar">AforoStatBar</div>,
}))

vi.mock('../../components/ui/Badge', () => ({
  default: ({ children }) => <span data-testid="badge">{children}</span>,
}))

vi.mock('../../utils/formatDate', () => ({
  getTimeAgo: vi.fn(() => 'hace 5 min'),
}))

import { useAforoStats, useAccessLogs } from '../../hooks/queries/useDashboardData'
import { useGymConfig } from '../../hooks/queries/useGymConfig'
import useWebSocket from '../../hooks/useWebSocket'

function setupMocks({ isConnected = true, isConnecting = false, stats = null, logs = [], gymConfig = null } = {}) {
  useAforoStats.mockReturnValue({ data: stats })
  useAccessLogs.mockReturnValue({ data: logs })
  useGymConfig.mockReturnValue({ data: gymConfig })
  useWebSocket.mockReturnValue({ isConnected, isConnecting, lastMessage: null })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AforoMonitorPage />
    </MemoryRouter>
  )
}

describe('AforoMonitorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  // ── 1. Title renders ──────────────────────────────────────────────────────
  it('renders "Monitor de Aforo" title', () => {
    renderPage()
    expect(screen.getByText('Monitor de Aforo')).toBeInTheDocument()
  })

  // ── 2. OccupancyCard renders ──────────────────────────────────────────────
  it('renders OccupancyCard', () => {
    renderPage()
    expect(screen.getByTestId('occupancy-card')).toBeInTheDocument()
  })

  // ── 3. RecentEventsPanel renders ──────────────────────────────────────────
  it('renders RecentEventsPanel', () => {
    renderPage()
    expect(screen.getByTestId('recent-events-panel')).toBeInTheDocument()
  })

  // ── 4. AforoStatBar renders ───────────────────────────────────────────────
  it('renders AforoStatBar', () => {
    renderPage()
    expect(screen.getByTestId('aforo-stat-bar')).toBeInTheDocument()
  })

  // ── 5. Connected status badge renders ─────────────────────────────────────
  it('shows "Conectado" badge when WebSocket is connected', () => {
    setupMocks({ isConnected: true, isConnecting: false })
    renderPage()
    expect(screen.getByText('Conectado')).toBeInTheDocument()
  })

  // ── 6. Connecting status badge renders ────────────────────────────────────
  it('shows "Reconectando" badge when WebSocket is connecting', () => {
    setupMocks({ isConnected: false, isConnecting: true })
    renderPage()
    expect(screen.getByText('Reconectando...')).toBeInTheDocument()
  })

  // ── 7. Disconnected status badge renders ──────────────────────────────────
  it('shows "Desconectado" badge when WebSocket is disconnected', () => {
    setupMocks({ isConnected: false, isConnecting: false })
    renderPage()
    expect(screen.getByText('Desconectado')).toBeInTheDocument()
  })

  // ── 8. Access logs are mapped to recent events ────────────────────────────
  it('maps access logs to recent events for RecentEventsPanel', () => {
    const logs = [
      { id: 1, user_nombre: 'Juan', user_apellido: 'Pérez', access_type: 'ENTRY', timestamp: '2026-09-21T10:00:00Z' },
    ]
    setupMocks({ logs })
    renderPage()
    expect(screen.getByText('1 events')).toBeInTheDocument()
  })

  // ── 9. Uses gymConfig for maxAforo ───────────────────────────────────────
  it('uses gymConfig.aforo_maximo for OccupancyCard maxAforo', () => {
    setupMocks({ gymConfig: { aforo_maximo: 300 } })
    renderPage()
    expect(screen.getByText('0/300')).toBeInTheDocument()
  })

  // ── 10. Defaults maxAforo to 200 when no gymConfig ────────────────────────
  it('defaults maxAforo to 200 when gymConfig is null', () => {
    setupMocks({ gymConfig: null })
    renderPage()
    expect(screen.getByText('0/200')).toBeInTheDocument()
  })
})
