/**
 * Tests for SocioDashboardView.
 *
 * Satisfies REQ-3.4 (≥ 8 tests).
 * Mocked: useSocioMembership, useSocioUpcomingClasses
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import SocioDashboardView from './SocioDashboardView'
import { renderWithProviders, resetAllStores } from '../../../test/test-utils'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../hooks/queries/useDashboardData', () => ({
  useSocioMembership: vi.fn(),
  useSocioUpcomingClasses: vi.fn(),
}))

import { useSocioMembership, useSocioUpcomingClasses } from '../../../hooks/queries/useDashboardData'

const mockMembershipActive = {
  membresia_activa: {
    id: 1,
    plan: { nombre: 'Premium' },
    estado: 'activa',
    fecha_fin: '2026-12-31',
  },
  certificado_medico_url: 'https://cdn/cert.pdf',
  asistencias_mes: 8,
}

const mockUpcomingClasses = [
  { id: 1, nombre: 'Spinning', instructor_nombre: 'Sofia L.', hora: '08:00:00' },
  { id: 2, nombre: 'Funcional', instructor_nombre: 'Carlos R.', hora: '10:00:00' },
]

const mockNavigate = vi.fn()

function setupMocks(overrides = {}) {
  useSocioMembership.mockReturnValue({
    data: mockMembershipActive,
    isLoading: false,
    ...overrides.membership,
  })
  useSocioUpcomingClasses.mockReturnValue({
    data: mockUpcomingClasses,
    isLoading: false,
    ...overrides.classes,
  })
}

describe('SocioDashboardView', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
    setupMocks()
  })

  // ── 1. Plan name displayed ────────────────────────────────────────────────
  it('displays active plan name from membership data', async () => {
    renderWithProviders(<SocioDashboardView navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Premium')).toBeInTheDocument()
    })
  })

  // ── 2. Expiry date displayed ──────────────────────────────────────────────
  it('displays plan expiry date', async () => {
    renderWithProviders(<SocioDashboardView navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText(/Vence el 2026-12-31/i)).toBeInTheDocument()
    })
  })

  // ── 3. Loading state ──────────────────────────────────────────────────────
  it('shows loading skeleton when membership query is loading', async () => {
    setupMocks({ membership: { data: undefined, isLoading: true } })

    renderWithProviders(<SocioDashboardView navigate={mockNavigate} />)

    // Loading state renders two skeleton divs
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  // ── 4. Upcoming class name visible ────────────────────────────────────────
  it('displays first upcoming class name', async () => {
    renderWithProviders(<SocioDashboardView navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Spinning')).toBeInTheDocument()
    })
  })

  // ── 5. Empty state for upcoming classes ──────────────────────────────────
  it('shows empty state message when no upcoming classes', async () => {
    setupMocks({ classes: { data: [], isLoading: false } })

    renderWithProviders(<SocioDashboardView navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText(/No tienes clases próximas/i)).toBeInTheDocument()
    })
  })

  // ── 6. "Al día" badge for active membership ───────────────────────────────
  it('shows "Al día" badge for active membership', async () => {
    renderWithProviders(<SocioDashboardView navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Al día')).toBeInTheDocument()
    })
  })

  // ── 7. Vencida badge for expired membership ───────────────────────────────
  it('shows "Vencida" badge for expired membership', async () => {
    setupMocks({
      membership: {
        data: {
          membresia_activa: {
            id: 2,
            plan: { nombre: 'Básico' },
            estado: 'vencida',
            fecha_fin: '2026-01-01',
          },
          asistencias_mes: 0,
        },
        isLoading: false,
      },
    })

    renderWithProviders(<SocioDashboardView navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Vencida')).toBeInTheDocument()
    })
  })

  // ── 8. "Sin membresía" badge when no active membership ───────────────────
  it('shows "Sin membresía" badge when no active membership', async () => {
    setupMocks({
      membership: {
        data: { membresia_activa: null, asistencias_mes: 0 },
        isLoading: false,
      },
    })

    renderWithProviders(<SocioDashboardView navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Sin membresía')).toBeInTheDocument()
    })
  })

  // ── 9. QR credencial button calls navigate ────────────────────────────────
  it('calls navigate("/socio/credencial") when QR button is clicked', async () => {
    renderWithProviders(<SocioDashboardView navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Ver Mi Credencial QR')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Ver Mi Credencial QR'))
    expect(mockNavigate).toHaveBeenCalledWith('/socio/credencial')
  })

  // ── 10. Medical cert status displayed ────────────────────────────────────
  it('shows "Vigente" for apto médico when certificado_medico_url is present', async () => {
    renderWithProviders(<SocioDashboardView navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Vigente')).toBeInTheDocument()
    })
  })
})
