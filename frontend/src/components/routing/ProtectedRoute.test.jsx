/**
 * Tests for ProtectedRoute.
 *
 * Coverage uplift: 0% → ~100%.
 * Mocked: useAuth.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'

vi.mock('../../hooks/useAuth', () => ({ default: vi.fn() }))

import useAuth from '../../hooks/useAuth'

function renderProtected(children, initialPath = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/dashboard"
          element={<ProtectedRoute>{children}</ProtectedRoute>}
        />
        <Route path="/login" element={<div>LoginPage</div>} />
        <Route path="/completar-perfil" element={<div>CompletarPerfil</div>} />
        <Route path="/socio/credencial" element={<div>SocioHome</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── 1. No token → redirects to /login ─────────────────────────────────────
  it('redirects to /login when accessToken is null', () => {
    useAuth.mockReturnValue({ accessToken: null, user: null })
    renderProtected(<div>Protected Content</div>)
    expect(screen.getByText('LoginPage')).toBeInTheDocument()
  })

  // ── 2. Token + complete profile → renders children ────────────────────────
  it('renders children when authenticated and profile complete', () => {
    useAuth.mockReturnValue({
      accessToken: 'tok',
      user: { rol: 'administrador', is_profile_complete: true },
    })
    renderProtected(<div>Protected Content</div>)
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  // ── 3. Profile incomplete → redirects to /completar-perfil ───────────────
  it('redirects to /completar-perfil when profile is incomplete', () => {
    useAuth.mockReturnValue({
      accessToken: 'tok',
      user: { rol: 'administrador', is_profile_complete: false },
    })
    renderProtected(<div>Protected Content</div>)
    expect(screen.getByText('CompletarPerfil')).toBeInTheDocument()
  })

  // ── 4. Socio accessing admin-only route → redirects to /socio/credencial ──
  it('redirects socio to /socio/credencial when role not in allowed roles', () => {
    useAuth.mockReturnValue({
      accessToken: 'tok',
      user: { rol: 'socio', is_profile_complete: true },
    })
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['administrador', 'recepcionista']}>
                <div>Admin Only</div>
              </ProtectedRoute>
            }
          />
          <Route path="/socio/credencial" element={<div>SocioHome</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('SocioHome')).toBeInTheDocument()
  })

  // ── 5. No roles restriction → renders children for any role ───────────────
  it('renders children when no roles restriction is set', () => {
    useAuth.mockReturnValue({
      accessToken: 'tok',
      user: { rol: 'recepcionista', is_profile_complete: true },
    })
    renderProtected(<div>Recep Content</div>)
    expect(screen.getByText('Recep Content')).toBeInTheDocument()
  })

  // ── 6. Non-socio unauthorized → redirects to /dashboard ──────────────────
  it('redirects admin to /dashboard when role is not allowed', () => {
    useAuth.mockReturnValue({
      accessToken: 'tok',
      user: { rol: 'administrador', is_profile_complete: true },
    })
    render(
      <MemoryRouter initialEntries={['/socio-only']}>
        <Routes>
          <Route
            path="/socio-only"
            element={
              <ProtectedRoute roles={['socio']}>
                <div>Socio Only</div>
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
