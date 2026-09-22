/**
 * Tests for AuthCallback.
 *
 * Coverage uplift: 0% → ~80%.
 * Mocked: useAuth, services/api, react-router-dom useNavigate, sonner, WinnieLogo.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AuthCallback from './AuthCallback'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../hooks/useAuth', () => ({
  default: vi.fn(),
}))

vi.mock('../services/api', () => ({
  default: { post: vi.fn() },
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('../components/ui/WinnieLogo', () => ({
  default: ({ size }) => <div data-testid={`logo-${size}`}>WinnieLogo</div>,
}))

import useAuth from '../hooks/useAuth'
import api from '../services/api'
import { toast } from 'sonner'

const mockSetAuth = vi.fn()

describe('AuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ setAuth: mockSetAuth })
    // Default: clean URL with a valid code
    delete window.location
    window.location = { search: '?code=google-auth-code-abc', origin: 'http://localhost:5173' }
  })

  function renderCallback() {
    return render(
      <MemoryRouter>
        <AuthCallback />
      </MemoryRouter>
    )
  }

  // ── 1. Loading UI renders ─────────────────────────────────────────────────
  it('renders "Completando inicio de sesión" message', () => {
    api.post.mockResolvedValue({ data: { user: { is_profile_complete: true }, access: 'a', refresh: 'r' } })
    renderCallback()
    expect(screen.getByText(/Completando inicio de sesión/i)).toBeInTheDocument()
  })

  // ── 2. WinnieLogo renders ─────────────────────────────────────────────────
  it('renders WinnieLogo', () => {
    api.post.mockResolvedValue({ data: { user: { is_profile_complete: true }, access: 'a', refresh: 'r' } })
    renderCallback()
    expect(screen.getByTestId('logo-md')).toBeInTheDocument()
  })

  // ── 3. Successful auth with complete profile → navigates to /dashboard ────
  it('navigates to /dashboard on successful auth with complete profile', async () => {
    api.post.mockResolvedValue({
      data: { user: { is_profile_complete: true }, access: 'access-tok', refresh: 'ref-tok' },
    })
    renderCallback()
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })

  // ── 4. Successful auth with incomplete profile → navigates to /completar-perfil
  it('navigates to /completar-perfil when profile is incomplete', async () => {
    api.post.mockResolvedValue({
      data: { user: { is_profile_complete: false }, access: 'access-tok', refresh: 'ref-tok' },
    })
    renderCallback()
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/completar-perfil', { replace: true })
    })
  })

  // ── 5. Calls setAuth with response data ───────────────────────────────────
  it('calls setAuth with the API response data', async () => {
    const data = { user: { is_profile_complete: true }, access: 'tok', refresh: 'ref' }
    api.post.mockResolvedValue({ data })
    renderCallback()
    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(data)
    })
  })

  // ── 6. API error → toast.error + navigates to /login ─────────────────────
  it('shows toast.error and navigates to /login when API call fails', async () => {
    api.post.mockRejectedValue(new Error('Network error'))
    renderCallback()
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('No se pudo iniciar sesión. Intentá de nuevo.')
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })
  })

  // ── 7. No code in URL → toast.error + navigate to /login ─────────────────
  it('shows error and navigates to /login when no code is in URL', async () => {
    window.location = { search: '', origin: 'http://localhost:5173' }
    renderCallback()
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Callback inválido. Intentá loguearte de nuevo.')
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })
  })

  // ── 8. Error param in URL → toast.error + navigate to /login ─────────────
  it('shows error and navigates to /login when error query param is present', async () => {
    window.location = { search: '?error=access_denied', origin: 'http://localhost:5173' }
    renderCallback()
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Google canceló el inicio de sesión. Intentá de nuevo.')
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })
  })
})
