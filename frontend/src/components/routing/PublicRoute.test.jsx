/**
 * Tests for PublicRoute.
 *
 * Coverage uplift: 0% → ~100%.
 * Mocked: useAuth.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PublicRoute from './PublicRoute'

vi.mock('../../hooks/useAuth', () => ({ default: vi.fn() }))

import useAuth from '../../hooks/useAuth'

function renderPublic(children, initialPath = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<PublicRoute>{children}</PublicRoute>} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route path="/socio/credencial" element={<div>SocioHome</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PublicRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── 1. No token → renders children ───────────────────────────────────────
  it('renders children when not authenticated', () => {
    useAuth.mockReturnValue({ accessToken: null, user: null })
    renderPublic(<div>Login Form</div>)
    expect(screen.getByText('Login Form')).toBeInTheDocument()
  })

  // ── 2. Authenticated non-socio → redirects to /dashboard ─────────────────
  it('redirects authenticated admin to /dashboard', () => {
    useAuth.mockReturnValue({
      accessToken: 'tok',
      user: { rol: 'administrador' },
    })
    renderPublic(<div>Login Form</div>)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  // ── 3. Authenticated socio → redirects to /socio/credencial ──────────────
  it('redirects authenticated socio to /socio/credencial', () => {
    useAuth.mockReturnValue({
      accessToken: 'tok',
      user: { rol: 'socio' },
    })
    renderPublic(<div>Login Form</div>)
    expect(screen.getByText('SocioHome')).toBeInTheDocument()
  })

  // ── 4. Token present but user null → renders children ────────────────────
  it('renders children when accessToken exists but user is null', () => {
    useAuth.mockReturnValue({ accessToken: 'tok', user: null })
    renderPublic(<div>Login Form</div>)
    expect(screen.getByText('Login Form')).toBeInTheDocument()
  })
})
