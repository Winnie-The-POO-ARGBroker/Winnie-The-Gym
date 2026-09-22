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

vi.mock('../../hooks/useAuth', () => ({
  default: vi.fn(),
}))

vi.mock('../../services/api', () => ({
  default: { get: vi.fn() },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../../components/layout/MemberLayout', () => ({
  default: ({ children, title, subtitle }) => (
    <div data-testid="member-layout">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {children}
    </div>
  ),
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
import api from '../../services/api'
import { toast } from 'sonner'

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

function renderPage(searchParamsString = '') {
  return render(
    <MemoryRouter initialEntries={[`/credencial${searchParamsString ? '?' + searchParamsString : ''}`]}>
      <CredencialDigitalPage />
    </MemoryRouter>
  )
}

function setupMocks({ profile = MOCK_PROFILE, isLoading = false, user = { rol: 'socio' } } = {}) {
  useSocioMembresiaMe.mockReturnValue({ data: profile, isLoading })
  useAuth.mockReturnValue({ user })
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

  // ── 4. No member data → admin sees different message ─────────────────────
  it('shows admin-specific empty state message for administrador role', async () => {
    setupMocks({ profile: null, user: { rol: 'administrador' } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Vista de Administrador')).toBeInTheDocument()
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

  // ── 12. QR refresh calls api.get ──────────────────────────────────────────
  it('calls api.get to generate QR when member loads', async () => {
    renderPage()
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/access/qr/generate/')
    })
  })

  // ── 13. Manual QR refresh button calls api.get again ─────────────────────
  it('calls api.get again when "Actualizar QR" is clicked', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Actualizar QR')).toBeInTheDocument()
    })
    const callCountBefore = api.get.mock.calls.length
    fireEvent.click(screen.getByText('Actualizar QR'))
    await waitFor(() => {
      expect(api.get.mock.calls.length).toBeGreaterThan(callCountBefore)
    })
  })

  // ── 14. QR API error shows toast ──────────────────────────────────────────
  it('shows toast.error when api.get for QR rejects', async () => {
    api.get.mockRejectedValue(new Error('Network error'))
    renderPage()
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al generar QR')
    })
  })

  // ── 15. Sede habitual renders ─────────────────────────────────────────────
  it('renders "Sede Central" as sede habitual', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Sede Central')).toBeInTheDocument()
    })
  })
})
