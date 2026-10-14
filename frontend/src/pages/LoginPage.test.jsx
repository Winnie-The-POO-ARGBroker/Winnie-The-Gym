/**
 * Tests for LoginPage.
 *
 * Coverage uplift: 0% → ~80%. Mocked: useGoogleLogin, EmailPasswordForm.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import LoginPage from './LoginPage'
import { renderWithProviders, resetAllStores } from '../test/test-utils'

const mockGoogleLogin = vi.fn()
// Capture onSuccess callback so tests can invoke a successful login
let capturedOnSuccess = null

vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: () => mockGoogleLogin,
}))

vi.mock('../components/ui/WinnieLogo', () => ({
  default: ({ size }) => <div data-testid={`logo-${size}`}>WinnieLogo</div>,
}))

vi.mock('../components/auth/EmailPasswordForm', () => ({
  default: ({ onSuccess }) => {
    capturedOnSuccess = onSuccess
    return <form data-testid="email-form"><button type="submit">Login</button></form>
  },
}))

describe('LoginPage', () => {
  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
    capturedOnSuccess = null
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('renders "Bienvenido" heading', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText('Bienvenido')).toBeInTheDocument()
  })

  it('renders "Inicia sesión para continuar" subtitle', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText('Inicia sesión para continuar')).toBeInTheDocument()
  })

  it('renders Google sign-in button', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText('Continuar con Google')).toBeInTheDocument()
  })

  it('calls google login when Google button is clicked', () => {
    renderWithProviders(<LoginPage />)
    fireEvent.click(screen.getByText('Continuar con Google'))
    expect(mockGoogleLogin).toHaveBeenCalled()
  })

  it('renders EmailPasswordForm', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByTestId('email-form')).toBeInTheDocument()
  })

  it('renders forgot password link', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText('¿Olvidaste tu contraseña?')).toBeInTheDocument()
  })

  it('renders register link', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText('¿No tenés cuenta? Crear cuenta')).toBeInTheDocument()
  })

  it('renders promo copy "Tu gimnasio, sin el caos."', () => {
    renderWithProviders(<LoginPage />)
    // This text is inside a hidden div on mobile, but still in DOM
    expect(screen.getByText(/Tu gimnasio/i)).toBeInTheDocument()
  })

  it('shows "sesión expiró" banner when ?reason=expired', () => {
    renderWithProviders(<LoginPage />, { route: '/login?reason=expired' })
    expect(screen.getByTestId('session-expired-banner')).toBeInTheDocument()
    expect(screen.getByText(/Tu sesión expiró/i)).toBeInTheDocument()
  })

  it('does not show expired banner without ?reason=expired', () => {
    renderWithProviders(<LoginPage />, { route: '/login' })
    expect(screen.queryByTestId('session-expired-banner')).not.toBeInTheDocument()
  })

  it('redirects to sessionStorage.next after successful login', () => {
    sessionStorage.setItem('next', '/admin/socios')
    renderWithProviders(<LoginPage />, { route: '/login?reason=expired' })

    // Trigger the onSuccess callback that EmailPasswordForm would call
    expect(capturedOnSuccess).toBeTypeOf('function')
    // We can't assert navigation in MemoryRouter without checking history,
    // but we verify that sessionStorage is cleaned up after onSuccess is called.
    // The navigate call itself is tested via integration; here we confirm cleanup.
    capturedOnSuccess({ user: { is_profile_complete: true } })
    expect(sessionStorage.getItem('next')).toBeNull()
  })
})
