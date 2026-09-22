/**
 * Tests for CompleteProfileRoute.
 *
 * Coverage uplift: 0% → ~100%.
 * Mocked: useAuth, CompleteProfilePage.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import CompleteProfileRoute from './CompleteProfileRoute'

vi.mock('../../hooks/useAuth', () => ({ default: vi.fn() }))

vi.mock('../../pages/CompleteProfilePage', () => ({
  default: () => <div data-testid="complete-profile-page">CompleteProfilePage</div>,
}))

import useAuth from '../../hooks/useAuth'

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/completar-perfil']}>
      <Routes>
        <Route path="/completar-perfil" element={<CompleteProfileRoute />} />
        <Route path="/login" element={<div>LoginPage</div>} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('CompleteProfileRoute', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── 1. No token → redirects to /login ─────────────────────────────────────
  it('redirects to /login when not authenticated', () => {
    useAuth.mockReturnValue({ accessToken: null, user: null })
    renderRoute()
    expect(screen.getByText('LoginPage')).toBeInTheDocument()
  })

  // ── 2. Token but no user → redirects to /login ────────────────────────────
  it('redirects to /login when user is null', () => {
    useAuth.mockReturnValue({ accessToken: 'tok', user: null })
    renderRoute()
    expect(screen.getByText('LoginPage')).toBeInTheDocument()
  })

  // ── 3. Profile complete → redirects to /dashboard ─────────────────────────
  it('redirects to /dashboard when profile is already complete', () => {
    useAuth.mockReturnValue({ accessToken: 'tok', user: { rol: 'socio', is_profile_complete: true } })
    renderRoute()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  // ── 4. Profile incomplete → renders CompleteProfilePage ───────────────────
  it('renders CompleteProfilePage when profile is incomplete', () => {
    useAuth.mockReturnValue({ accessToken: 'tok', user: { rol: 'socio', is_profile_complete: false } })
    renderRoute()
    expect(screen.getByTestId('complete-profile-page')).toBeInTheDocument()
  })
})
