/**
 * Tests for MemberLayout.
 *
 * Satisfies REQ-3.3 (≥ 8 tests).
 * MemberLayout is a presentational layout — no auth guard, no network.
 * Mocked: themeStore
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import MemberLayout from './MemberLayout'
import { renderWithProviders, resetAllStores } from '../../test/test-utils'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../stores/themeStore', () => {
  const toggleTheme = vi.fn()
  return {
    default: vi.fn(() => ({ theme: 'dark', toggleTheme })),
  }
})

vi.mock('./Sidebar', () => ({
  default: () => <aside data-testid="sidebar">Sidebar</aside>,
}))

describe('MemberLayout', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
  })

  // ── 1. Children are rendered ──────────────────────────────────────────────
  it('renders children in main content area', () => {
    renderWithProviders(
      <MemberLayout>
        <div data-testid="child-content">Hello World</div>
      </MemberLayout>,
    )

    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  // ── 2. Title renders in header ────────────────────────────────────────────
  it('renders the title prop in the header', () => {
    renderWithProviders(
      <MemberLayout title="Mi Área">
        <div>Content</div>
      </MemberLayout>,
    )

    expect(screen.getByText('Mi Área')).toBeInTheDocument()
  })

  // ── 3. Default title shows "Winnie The Gym" ───────────────────────────────
  it('shows "Winnie The Gym" when no title is provided', () => {
    renderWithProviders(
      <MemberLayout>
        <div>Content</div>
      </MemberLayout>,
    )

    expect(screen.getByText('Winnie The Gym')).toBeInTheDocument()
  })

  // ── 4. Subtitle renders when provided ────────────────────────────────────
  it('renders subtitle when provided', () => {
    renderWithProviders(
      <MemberLayout title="Dashboard" subtitle="Bienvenido al gym">
        <div>Content</div>
      </MemberLayout>,
    )

    expect(screen.getByText('Bienvenido al gym')).toBeInTheDocument()
  })

  // ── 5. No subtitle rendered when omitted ─────────────────────────────────
  it('renders the title without a subtitle when subtitle prop is not provided', () => {
    renderWithProviders(
      <MemberLayout title="Test">
        <div>Content</div>
      </MemberLayout>,
    )

    // Title must exist
    expect(screen.getByText('Test')).toBeInTheDocument()
    // No subtitle-specific text should be present (subtitle is conditional in JSX)
    expect(screen.queryByText('Bienvenido')).not.toBeInTheDocument()
  })

  // ── 6. Sidebar is rendered ────────────────────────────────────────────────
  it('renders the Sidebar component', () => {
    renderWithProviders(
      <MemberLayout>
        <div>Content</div>
      </MemberLayout>,
    )

    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  // ── 7. Bottom navigation renders ─────────────────────────────────────────
  it('renders bottom navigation nav element', () => {
    renderWithProviders(
      <MemberLayout>
        <div>Content</div>
      </MemberLayout>,
    )

    expect(document.querySelector('nav')).toBeInTheDocument()
  })

  // ── 8. Bottom nav has Inicio, Clases, QR, Pagar, Perfil links ────────────
  it('renders navigation labels: Inicio, Clases, QR, Pagar, Perfil', () => {
    renderWithProviders(
      <MemberLayout>
        <div>Content</div>
      </MemberLayout>,
    )

    expect(screen.getByText('Inicio')).toBeInTheDocument()
    expect(screen.getByText('Clases')).toBeInTheDocument()
    expect(screen.getByText('QR')).toBeInTheDocument()
    expect(screen.getByText('Pagar')).toBeInTheDocument()
    expect(screen.getByText('Perfil')).toBeInTheDocument()
  })

  // ── 9. rightAction slot is rendered ──────────────────────────────────────
  it('renders rightAction slot in the header', () => {
    renderWithProviders(
      <MemberLayout rightAction={<button data-testid="right-action">Action</button>}>
        <div>Content</div>
      </MemberLayout>,
    )

    expect(screen.getByTestId('right-action')).toBeInTheDocument()
  })
})
