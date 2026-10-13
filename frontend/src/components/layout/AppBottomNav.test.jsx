/**
 * Tests for AppBottomNav — fix #195 (BK-MOB-02)
 * Contract tests 1–6.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import AppBottomNav from './AppBottomNav'
import { renderWithProviders, resetAllStores } from '../../test/test-utils'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/useAuth', () => ({
  default: vi.fn(),
}))

vi.mock('../../stores/themeStore', () => {
  const toggleTheme = vi.fn()
  return {
    default: vi.fn(() => ({ theme: 'dark', toggleTheme })),
  }
})

import useAuth from '../../hooks/useAuth'

function setupSocio(overrides = {}) {
  useAuth.mockReturnValue({
    user: { rol: 'socio', id: 7 },
    clearAuth: vi.fn(),
    ...overrides,
  })
}

function setupAdmin(overrides = {}) {
  useAuth.mockReturnValue({
    user: { rol: 'administrador', id: 2 },
    clearAuth: vi.fn(),
    ...overrides,
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AppBottomNav', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
  })

  // Contract test 1 — socio nav on /dashboard at 375px
  it('renders socio nav on /dashboard at 375px', () => {
    setupSocio()
    renderWithProviders(<AppBottomNav />, { route: '/dashboard' })

    expect(screen.getByText('Inicio')).toBeInTheDocument()
    expect(screen.getByText('Credencial')).toBeInTheDocument()
    expect(screen.getByText('Clases')).toBeInTheDocument()
    expect(screen.getByText('Pagar')).toBeInTheDocument()
    expect(screen.getByText('Más')).toBeInTheDocument()
  })

  // Contract test 2 — socio nav on /perfil at 375px
  it('renders socio nav on /perfil at 375px', () => {
    setupSocio()
    renderWithProviders(<AppBottomNav />, { route: '/perfil' })

    expect(screen.getByText('Inicio')).toBeInTheDocument()
    expect(screen.getByText('Credencial')).toBeInTheDocument()
    expect(screen.getByText('Clases')).toBeInTheDocument()
    expect(screen.getByText('Pagar')).toBeInTheDocument()
    expect(screen.getByText('Más')).toBeInTheDocument()
  })

  // Contract test 3 — socio nav on /socio/pagos at 375px
  it('renders socio nav on /socio/pagos at 375px', () => {
    setupSocio()
    renderWithProviders(<AppBottomNav />, { route: '/socio/pagos' })

    expect(screen.getByText('Inicio')).toBeInTheDocument()
    expect(screen.getByText('Credencial')).toBeInTheDocument()
    expect(screen.getByText('Clases')).toBeInTheDocument()
    expect(screen.getByText('Pagar')).toBeInTheDocument()
    expect(screen.getByText('Más')).toBeInTheDocument()
  })

  // Contract test 4 — "Más" menu includes Mis Pagos, Perfil, Tema, Cerrar sesión
  it('"Más" menu includes Mis Pagos, Perfil, Tema y Cerrar sesión', () => {
    setupSocio()
    renderWithProviders(<AppBottomNav />, { route: '/dashboard' })

    // Open "Más" sheet
    fireEvent.click(screen.getByRole('button', { name: /más opciones/i }))

    expect(screen.getByText('Mis Pagos')).toBeInTheDocument()
    expect(screen.getByText('Perfil')).toBeInTheDocument()
    expect(screen.getByText(/Tema/i)).toBeInTheDocument()
    expect(screen.getByText('Cerrar sesión')).toBeInTheDocument()
  })

  // Contract test 5 — admin on /socio/credencial does NOT see "Pagar"
  it('admin on /socio/credencial does NOT see "Pagar"', () => {
    setupAdmin()
    renderWithProviders(<AppBottomNav />, { route: '/socio/credencial' })

    // Admin nav items: Dashboard, Socios, Clases, Más — no "Pagar"
    expect(screen.queryByText('Pagar')).not.toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Socios')).toBeInTheDocument()
    expect(screen.getByText('Clases')).toBeInTheDocument()
    expect(screen.getByText('Más')).toBeInTheDocument()
  })

  // Contract test 6 — no duplicate items for same destination
  it('no duplicate items for same destination', () => {
    setupSocio()
    renderWithProviders(<AppBottomNav />, { route: '/dashboard' })

    // "Inicio" appears exactly once in the nav bar (only one link to /dashboard)
    const inicioItems = screen.getAllByText('Inicio')
    expect(inicioItems).toHaveLength(1)

    // "Credencial" appears exactly once
    const credItems = screen.getAllByText('Credencial')
    expect(credItems).toHaveLength(1)
  })
})
