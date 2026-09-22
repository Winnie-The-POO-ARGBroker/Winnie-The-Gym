/**
 * Tests for ComingSoonPage.
 *
 * Coverage uplift: 0% → ~90%.
 * Mocked: useLocation, AppLayout, TopBar.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ComingSoonPage from './ComingSoonPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useLocation: vi.fn(),
  }
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

import { useLocation } from 'react-router-dom'

describe('ComingSoonPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderPage(pathname = '/socios') {
    useLocation.mockReturnValue({ pathname })
    return render(
      <MemoryRouter initialEntries={[pathname]}>
        <ComingSoonPage />
      </MemoryRouter>
    )
  }

  // ── 1. Renders "Próximamente" heading ─────────────────────────────────────
  it('renders "Próximamente" heading', () => {
    renderPage()
    expect(screen.getByText('Próximamente')).toBeInTheDocument()
  })

  // ── 2. Renders description text ───────────────────────────────────────────
  it('renders "Esta sección está en desarrollo" description', () => {
    renderPage()
    expect(screen.getByText(/Esta sección está en desarrollo/i)).toBeInTheDocument()
  })

  // ── 3. Known route /socios shows "Socios" title ───────────────────────────
  it('shows "Socios" title for /socios pathname', () => {
    renderPage('/socios')
    expect(screen.getByText('Socios')).toBeInTheDocument()
  })

  // ── 4. Known route /reportes shows "Reportes" title ──────────────────────
  it('shows "Reportes" title for /reportes pathname', () => {
    renderPage('/reportes')
    expect(screen.getByText('Reportes')).toBeInTheDocument()
  })

  // ── 5. Known route /configuracion shows "Configuración" title ────────────
  it('shows "Configuración" title for /configuracion pathname', () => {
    renderPage('/configuracion')
    expect(screen.getByText('Configuración')).toBeInTheDocument()
  })

  // ── 6. Unknown route falls back to "Sección" ─────────────────────────────
  it('shows "Sección" fallback title for unknown pathname', () => {
    renderPage('/unknown-route')
    expect(screen.getByText('Sección')).toBeInTheDocument()
  })

  // ── 7. AppLayout is rendered ──────────────────────────────────────────────
  it('renders inside AppLayout', () => {
    renderPage()
    expect(screen.getByTestId('app-layout')).toBeInTheDocument()
  })
})
