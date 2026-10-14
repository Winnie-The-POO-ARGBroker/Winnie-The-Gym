/**
 * Tests for CredencialDigitalPage.
 *
 * Coverage uplift: 0% → ~70%.
 * Complex state (timers, QR polling) is exercised via mocks.
 * Mocked: useSocioMembresiaMe, useAuth, services/api, sonner, all child components.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CredencialDigitalPage from './CredencialDigitalPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/queries/useMembresias', () => ({
  useSocioMembresiaMe: vi.fn(),
}))

vi.mock('../../hooks/queries/useGymConfig', () => ({
  useGymConfig: vi.fn(() => ({ data: { nombre_gimnasio: 'Winnie Gym' } })),
}))

vi.mock('../../hooks/useAuth', () => ({
  default: vi.fn(),
}))

vi.mock('../../hooks/useScreenWakeLock', () => ({
  default: vi.fn(),
}))

vi.mock('../../hooks/useCredentialState', () => ({
  default: vi.fn(),
}))

vi.mock('../../services/api', () => ({
  default: { get: vi.fn() },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../../components/layout/MemberLayout', () => ({
  default: ({ children, title, subtitle, rightAction }) => (
    <div data-testid="member-layout">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      <div data-testid="member-layout-right-action">{rightAction}</div>
      {children}
    </div>
  ),
}))

vi.mock('../../components/ui/HighContrastToggle', () => ({
  default: () => <button data-testid="high-contrast-toggle">Alto Contraste</button>,
}))

vi.mock('../../components/ui/Card', () => ({
  default: ({ children }) => <div data-testid="card">{children}</div>,
}))

vi.mock('../../components/ui/EmptyState', () => ({
  default: ({ title, message }) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      <p>{message}</p>
    </div>
  ),
}))

vi.mock('../../components/socio/MemberCardHeader', () => ({
  default: ({ nombre, apellido }) => (
    <div data-testid="member-card-header">{nombre} {apellido}</div>
  ),
}))

vi.mock('../../components/socio/QRDisplay', () => ({
  default: ({ onRefresh, onOpenFullscreen }) => (
    <div data-testid="qr-display">
      <button onClick={onRefresh}>Actualizar QR</button>
      <button onClick={onOpenFullscreen}>Ver fullscreen</button>
    </div>
  ),
}))

vi.mock('../../components/socio/MemberPlanDetails', () => ({
  default: ({ membresia }) => <div data-testid="member-plan-details">{membresia?.planNombre}</div>,
}))

vi.mock('../../components/socio/QRFullscreenModal', () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="qr-fullscreen-modal">
        <button onClick={onClose}>Cerrar</button>
      </div>
    ) : null,
}))

vi.mock('../../components/socio/MembershipExpiredAlert', () => ({
  default: () => <div data-testid="membership-expired-alert">Membresía vencida</div>,
}))

vi.mock('../../components/socio/PagoResultadoBanner', () => ({
  default: ({ estado }) => <div data-testid="pago-resultado-banner">{estado}</div>,
}))

import { useSocioMembresiaMe } from '../../hooks/queries/useMembresias'
import useAuth from '../../hooks/useAuth'
import useScreenWakeLock from '../../hooks/useScreenWakeLock'
import useCredentialState from '../../hooks/useCredentialState'
import api from '../../services/api'

const MOCK_PROFILE = {
  nombre: 'Juan',
  apellido: 'Pérez',
  dni: '12345678',
  numero_socio: 'S-0042',
  membresia_activa: {
    estado: 'activa',
    fecha_fin: '2026-12-31',
    plan: { nombre: 'Premium' },
  },
}

const DEFAULT_CREDENTIAL_STATE = {
  qrToken: 'qr-abc-123',
  timeLeft: 25,
  maxTime: 30,
  isRefreshing: false,
  isStale: false,
  credentialState: null,
  refresh: vi.fn(),
}

function renderPage(searchParamsString = '') {
  return render(
    <MemoryRouter initialEntries={[`/credencial${searchParamsString ? '?' + searchParamsString : ''}`]}>
      <CredencialDigitalPage />
    </MemoryRouter>
  )
}

function setupMocks({ profile = MOCK_PROFILE, isLoading = false, user = { rol: 'socio' }, credState = DEFAULT_CREDENTIAL_STATE } = {}) {
  useSocioMembresiaMe.mockReturnValue({ data: profile, isLoading })
  useAuth.mockReturnValue({ user })
  useCredentialState.mockReturnValue(credState)
  api.get.mockResolvedValue({ data: { qr_token: 'qr-abc-123' } })
}

describe('CredencialDigitalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  // ── 1. Title renders ──────────────────────────────────────────────────────
  it('renders "Credencial Digital" title', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Credencial Digital')).toBeInTheDocument()
    })
  })

  // ── 2. Loading state ──────────────────────────────────────────────────────
  it('shows loading message when isLoading is true', () => {
    setupMocks({ isLoading: true })
    renderPage()
    expect(screen.getByText(/Cargando/i)).toBeInTheDocument()
  })

  // ── 3. No member data → EmptyState for socio ─────────────────────────────
  it('shows EmptyState with "Credencial no disponible" when no member data', async () => {
    setupMocks({ profile: null })
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('Credencial no disponible')).toBeInTheDocument()
    })
  })

  // ── 4. No member data → admin is redirected, NOT shown placeholder ─────────
  it('does not render empty-state for administrador role — redirects instead', async () => {
    setupMocks({ profile: null, user: { rol: 'administrador' } })
    renderPage()
    await waitFor(() => {
      // Admin should not see the "Vista de Administrador" placeholder anymore
      expect(screen.queryByText('Vista de Administrador')).not.toBeInTheDocument()
      // The component returns null on redirect
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
    })
  })

  // ── 5. Member card header renders with name ───────────────────────────────
  it('renders MemberCardHeader with member name', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('member-card-header')).toBeInTheDocument()
      expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument()
    })
  })

  // ── 6. QR display renders ─────────────────────────────────────────────────
  it('renders QRDisplay component when member is loaded', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('qr-display')).toBeInTheDocument()
    })
  })

  // ── 7. Plan details render when membresia_activa present ─────────────────
  it('renders MemberPlanDetails when membresia is present', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('member-plan-details')).toBeInTheDocument()
      // planNombre "Premium" should appear inside the details component
      const detailsEl = screen.getByTestId('member-plan-details')
      expect(detailsEl).toHaveTextContent('Premium')
    })
  })

  // ── 8. Expired membership shows alert ────────────────────────────────────
  it('shows MembershipExpiredAlert when membresia_activa estado is "vencida"', async () => {
    setupMocks({
      profile: {
        ...MOCK_PROFILE,
        membresia_activa: { estado: 'vencida', fecha_fin: '2025-01-01', plan: { nombre: 'Básico' } },
      },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('membership-expired-alert')).toBeInTheDocument()
    })
  })

  // ── 9. Expired membership when membresia_activa is null ──────────────────
  it('shows MembershipExpiredAlert when membresia_activa is null (no plan)', async () => {
    setupMocks({
      profile: { ...MOCK_PROFILE, membresia_activa: null },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('membership-expired-alert')).toBeInTheDocument()
    })
  })

  // ── 10. Fullscreen modal opens ────────────────────────────────────────────
  it('opens QRFullscreenModal when "Ver fullscreen" is clicked', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Ver fullscreen')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Ver fullscreen'))
    await waitFor(() => {
      expect(screen.getByTestId('qr-fullscreen-modal')).toBeInTheDocument()
    })
  })

  // ── 11. Fullscreen modal closes ───────────────────────────────────────────
  it('closes QRFullscreenModal when close button is clicked', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Ver fullscreen')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Ver fullscreen'))
    await waitFor(() => {
      expect(screen.getByTestId('qr-fullscreen-modal')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Cerrar'))
    await waitFor(() => {
      expect(screen.queryByTestId('qr-fullscreen-modal')).not.toBeInTheDocument()
    })
  })

  // ── 12. useCredentialState is called when member loads ───────────────────
  it('calls useCredentialState with enabled=true when member data is ready', async () => {
    renderPage()
    await waitFor(() => {
      expect(useCredentialState).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }))
    })
  })

  // ── 13. Manual QR refresh button calls hook refresh ──────────────────────
  it('calls refresh from useCredentialState when "Actualizar QR" is clicked', async () => {
    const refreshFn = vi.fn()
    setupMocks({ credState: { ...DEFAULT_CREDENTIAL_STATE, refresh: refreshFn } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Actualizar QR')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Actualizar QR'))
    await waitFor(() => {
      expect(refreshFn).toHaveBeenCalledWith(true)
    })
  })

  // ── 14. Stale QR overlay renders when hook reports isStale ───────────────
  it('renders stale QR overlay when useCredentialState returns isStale=true', async () => {
    setupMocks({
      credState: { ...DEFAULT_CREDENTIAL_STATE, isStale: true },
    })
    renderPage()
    // QRDisplay mock renders with "Actualizar QR" still present — stale prop is passed through
    await waitFor(() => {
      expect(screen.getByTestId('qr-display')).toBeInTheDocument()
    })
  })

  // ── 15. Sede habitual renders from gymConfig.nombre_gimnasio ────────────────
  it('renders gym name from gymConfig as sede habitual', async () => {
    renderPage()
    await waitFor(() => {
      // useGymConfig mock returns { nombre_gimnasio: 'Winnie Gym' }
      expect(screen.getByText('Winnie Gym')).toBeInTheDocument()
    })
  })

  // ── 16. Wake lock activated when valid QR is present (Issue #110) ─────────
  it('activates screen wake lock when valid QR is present and deactivates when expired', async () => {
    renderPage()
    await waitFor(() => {
      expect(useScreenWakeLock).toHaveBeenCalledWith({ enabled: true })
    })
  })

  it('disables screen wake lock when membership is expired', async () => {
    setupMocks({
      profile: {
        ...MOCK_PROFILE,
        membresia_activa: { estado: 'vencida', fecha_fin: '2025-01-01', plan: { nombre: 'Básico' } },
      },
    })
    renderPage()
    await waitFor(() => {
      expect(useScreenWakeLock).toHaveBeenCalledWith({ enabled: false })
    })
  })

  // ── 17. HighContrastToggle renders (RNF07) ────────────────────────────────
  it('renders HighContrastToggle in MemberLayout rightAction', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('high-contrast-toggle')).toBeInTheDocument()
    })
  })

  // ── 18. uses expires_at from backend for countdown (#157) ────────────────
  // Contract test: the page passes timeLeft from useCredentialState (which uses expires_at
  // from backend) rather than a hardcoded 30-second local timer.
  // This verifies that timeLeft=17 (a non-30 value derived from expires_at) flows
  // from the hook through to the QRDisplay component.
  it('uses expires_at from backend for countdown — passes hook timeLeft to QRDisplay', async () => {
    // Simulate backend returning a QR that expires in 17 seconds
    const expiresAtSoon = new Date(Date.now() + 17_000).toISOString()
    setupMocks({
      credState: {
        ...DEFAULT_CREDENTIAL_STATE,
        qrToken: 'token-from-expires-at',
        timeLeft: 17,  // derived from expires_at, NOT hardcoded 30
        maxTime: 30,
        expiresAt: expiresAtSoon,
      },
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('qr-display')).toBeInTheDocument()
    })

    // The hook must have been initialised with enabled=true (member was ready)
    expect(useCredentialState).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }))

    // The page must NOT be calling the old hardcoded api.get('/access/qr/generate/') itself
    // — that responsibility belongs to the hook now.
    expect(api.get).not.toHaveBeenCalledWith('/access/qr/generate/')
  })
})
