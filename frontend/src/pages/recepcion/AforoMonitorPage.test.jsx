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

vi.mock('../../hooks/useAuth', () => ({
  default: vi.fn(),
}))

vi.mock('../../services/accessService', () => ({
  getPresentes: vi.fn(),
  salidaManual: vi.fn(),
  cerrarDia: vi.fn(),
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

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { useAforoStats, useAccessLogs } from '../../hooks/queries/useDashboardData'
import { useGymConfig } from '../../hooks/queries/useGymConfig'
import useWebSocket from '../../hooks/useWebSocket'
import useAuth from '../../hooks/useAuth'
import { getPresentes } from '../../services/accessService'

function setupMocks({
  isConnected = true,
  isConnecting = false,
  isReconnecting = false,
  lastMessage = null,
  stats = null,
  logs = [],
  gymConfig = null,
  presentes = [],
  user = { rol: 'recepcionista' },
} = {}) {
  useAforoStats.mockReturnValue({ data: stats })
  useAccessLogs.mockReturnValue({ data: logs })
  useGymConfig.mockReturnValue({ data: gymConfig })
  useWebSocket.mockReturnValue({ isConnected, isConnecting, isReconnecting, lastMessage, sendMessage: vi.fn() })
  useAuth.mockReturnValue({ user })
  getPresentes.mockResolvedValue({ count: presentes.length, presentes })
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
  it('renders "Monitor de Aforo" title', async () => {
    renderPage()
    expect(screen.getByText('Monitor de Aforo')).toBeInTheDocument()
  })

  // ── 2. OccupancyCard renders ──────────────────────────────────────────────
  it('renders OccupancyCard', async () => {
    renderPage()
    expect(screen.getByTestId('occupancy-card')).toBeInTheDocument()
  })

  // ── 3. RecentEventsPanel renders ──────────────────────────────────────────
  it('renders RecentEventsPanel', async () => {
    renderPage()
    expect(screen.getByTestId('recent-events-panel')).toBeInTheDocument()
  })

  // ── 4. AforoStatBar renders ───────────────────────────────────────────────
  it('renders AforoStatBar', async () => {
    renderPage()
    expect(screen.getByTestId('aforo-stat-bar')).toBeInTheDocument()
  })

  // ── 5. Connected status badge renders ─────────────────────────────────────
  it('shows "Conectado" badge when WebSocket is connected', async () => {
    setupMocks({ isConnected: true, isConnecting: false, isReconnecting: false })
    renderPage()
    expect(screen.getByText('Conectado')).toBeInTheDocument()
  })

  // ── 6a. First-connect badge renders ──────────────────────────────────────
  it('shows "Conectando..." badge on initial connection attempt', async () => {
    setupMocks({ isConnected: false, isConnecting: true, isReconnecting: false })
    renderPage()
    expect(screen.getByText('Conectando...')).toBeInTheDocument()
  })

  // ── 6b. Reconnecting badge renders ────────────────────────────────────────
  it('shows "Reconectando..." badge when WebSocket is doing exponential backoff', async () => {
    setupMocks({ isConnected: false, isConnecting: true, isReconnecting: true })
    renderPage()
    expect(screen.getByText('Reconectando...')).toBeInTheDocument()
  })

  // ── 7. Disconnected status badge renders ──────────────────────────────────
  it('shows "Desconectado" badge when WebSocket is disconnected', async () => {
    setupMocks({ isConnected: false, isConnecting: false, isReconnecting: false })
    renderPage()
    expect(screen.getByText('Desconectado')).toBeInTheDocument()
  })

  // ── 8. Access logs are mapped to recent events ────────────────────────────
  it('maps access logs to recent events for RecentEventsPanel', async () => {
    const logs = [
      { id: 1, user_nombre: 'Juan', user_apellido: 'Pérez', access_type: 'ENTRY', timestamp: '2026-09-21T10:00:00Z' },
    ]
    setupMocks({ logs })
    renderPage()
    expect(screen.getByText('1 events')).toBeInTheDocument()
  })

  // ── 9. Uses gymConfig for maxAforo ───────────────────────────────────────
  it('uses gymConfig.aforo_maximo for OccupancyCard maxAforo', async () => {
    setupMocks({ gymConfig: { aforo_maximo: 300 } })
    renderPage()
    expect(screen.getByText('0/300')).toBeInTheDocument()
  })

  // ── 10. Defaults maxAforo to 200 when no gymConfig ────────────────────────
  it('defaults maxAforo to 200 when gymConfig is null', async () => {
    setupMocks({ gymConfig: null })
    renderPage()
    expect(screen.getByText('0/200')).toBeInTheDocument()
  })

  // ── fix #153: shows aforo.alert banner when WS message received ───────────
  it('shows aforo.alert banner when WS message received', async () => {
    const alertMessage = {
      type: 'aforo.alert',
      level: 'warning',
      aforo_actual: 180,
      aforo_maximo: 200,
      pct: 90.0,
      message: 'Aforo al 90% — cerca de la capacidad máxima',
    }
    setupMocks({ lastMessage: alertMessage })
    renderPage()
    expect(
      await screen.findByText('Aforo al 90% — cerca de la capacidad máxima')
    ).toBeInTheDocument()
  })

  // ── fix #154: renders Presentes panel with rows from /api/access/presentes/ ─
  it('renders Presentes panel with rows from /api/access/presentes/', async () => {
    const presentes = [
      {
        socio_id: 7,
        numero_socio: 'S-00007',
        nombre: 'Carlos',
        apellido: 'Activo',
        entrada_timestamp: '2026-10-13T08:30:00Z',
        estado_membresia: 'activo',
        minutos_adentro: 125,
      },
    ]
    setupMocks({ presentes })
    renderPage()
    expect(await screen.findByText('Carlos')).toBeInTheDocument()
    expect(await screen.findByText('S-00007')).toBeInTheDocument()
  })

  // ── fix #154: admin sees "Cerrar día" button, recepcionista does NOT ───────
  it('admin sees "Cerrar día" button', async () => {
    setupMocks({ user: { rol: 'administrador' } })
    renderPage()
    expect(await screen.findByRole('button', { name: /cerrar día/i })).toBeInTheDocument()
  })

  it('recepcionista does NOT see "Cerrar día" button', async () => {
    setupMocks({ user: { rol: 'recepcionista' } })
    renderPage()
    // Wait for panel to render
    await screen.findByText('Presentes ahora')
    expect(screen.queryByRole('button', { name: /cerrar día/i })).not.toBeInTheDocument()
  })
})
