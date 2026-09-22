/**
 * Tests for DashboardPage.
 *
 * Coverage uplift: 0% → ~80%.
 * Mocked: useAuth, useNavigate, AppLayout, TopBar, EmptyState, dashboard views.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from './DashboardPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../hooks/useAuth', () => ({ default: vi.fn() }))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => vi.fn() }
})

vi.mock('../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}))

vi.mock('../components/layout/TopBar', () => ({
  default: ({ title, subtitle }) => (
    <div data-testid="top-bar">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}))

vi.mock('../components/ui/EmptyState', () => ({
  default: ({ title }) => <div data-testid="empty-state">{title}</div>,
}))

vi.mock('../components/dashboard/views/AdminDashboardView', () => ({
  default: () => <div data-testid="admin-dashboard-view">AdminDashboardView</div>,
}))

vi.mock('../components/dashboard/views/RecepcionistaDashboardView', () => ({
  default: () => <div data-testid="recepcionista-dashboard-view">RecepcionistaDashboardView</div>,
}))

vi.mock('../components/dashboard/views/SocioDashboardView', () => ({
  default: () => <div data-testid="socio-dashboard-view">SocioDashboardView</div>,
}))

import useAuth from '../hooks/useAuth'

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderPage() {
    return render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )
  }

  // ── 1. Renders Dashboard title ────────────────────────────────────────────
  it('renders "Dashboard" title', () => {
    useAuth.mockReturnValue({ user: { rol: 'administrador', nombre: 'Admin', apellido: 'Test' } })
    renderPage()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  // ── 2. Admin role shows AdminDashboardView ────────────────────────────────
  it('renders AdminDashboardView for administrador role', () => {
    useAuth.mockReturnValue({ user: { rol: 'administrador', nombre: 'Admin', apellido: '' } })
    renderPage()
    expect(screen.getByTestId('admin-dashboard-view')).toBeInTheDocument()
  })

  // ── 3. Recepcionista role shows RecepcionistaDashboardView ────────────────
  it('renders RecepcionistaDashboardView for recepcionista role', () => {
    useAuth.mockReturnValue({ user: { rol: 'recepcionista', nombre: 'María', apellido: 'García' } })
    renderPage()
    expect(screen.getByTestId('recepcionista-dashboard-view')).toBeInTheDocument()
  })

  // ── 4. Socio role shows SocioDashboardView ────────────────────────────────
  it('renders SocioDashboardView for socio role', () => {
    useAuth.mockReturnValue({ user: { rol: 'socio', nombre: 'Juan', apellido: 'Pérez' } })
    renderPage()
    expect(screen.getByTestId('socio-dashboard-view')).toBeInTheDocument()
  })

  // ── 5. Subtitle shows user display name ───────────────────────────────────
  it('subtitle shows user name when nombre is set', () => {
    useAuth.mockReturnValue({ user: { rol: 'administrador', nombre: 'Carlos', apellido: 'López' } })
    renderPage()
    expect(screen.getByText(/Carlos López/)).toBeInTheDocument()
  })

  // ── 6. Subtitle shows email when no nombre ────────────────────────────────
  it('subtitle shows email when nombre is absent', () => {
    useAuth.mockReturnValue({ user: { rol: 'administrador', email: 'admin@winnie.local' } })
    renderPage()
    expect(screen.getByText(/admin@winnie.local/)).toBeInTheDocument()
  })

  // ── 7. No user falls back to administrador view ───────────────────────────
  it('falls back to AdminDashboardView when user is null', () => {
    useAuth.mockReturnValue({ user: null })
    renderPage()
    expect(screen.getByTestId('admin-dashboard-view')).toBeInTheDocument()
  })

  // ── 8. Admin does not show socio view ─────────────────────────────────────
  it('does not render SocioDashboardView for administrador role', () => {
    useAuth.mockReturnValue({ user: { rol: 'administrador', nombre: 'Admin' } })
    renderPage()
    expect(screen.queryByTestId('socio-dashboard-view')).not.toBeInTheDocument()
  })
})
