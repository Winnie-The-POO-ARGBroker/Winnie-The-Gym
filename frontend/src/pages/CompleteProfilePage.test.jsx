/**
 * Tests for CompleteProfilePage.
 *
 * Coverage uplift: 0% → ~80%.
 * Mocked: useAuth, services/api, react-router-dom useNavigate, sonner, WinnieLogo, Button.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient } from '../test/test-utils'
import CompleteProfilePage from './CompleteProfilePage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../hooks/useAuth', () => ({ default: vi.fn() }))

vi.mock('../services/api', () => ({
  default: { post: vi.fn() },
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('../components/ui/WinnieLogo', () => ({
  default: ({ size }) => <div data-testid={`logo-${size}`}>WinnieLogo</div>,
}))

vi.mock('../components/ui/Button', () => ({
  default: ({ children, type, loading }) => (
    <button type={type} disabled={loading} data-loading={loading}>{children}</button>
  ),
}))

import useAuth from '../hooks/useAuth'
import api from '../services/api'
import { toast } from 'sonner'

const mockSetAuth = vi.fn()

function renderPage() {
  const qc = createTestQueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CompleteProfilePage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('CompleteProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({
      user: { id: 1, email: 'test@winnie.local', is_profile_complete: false },
      setAuth: mockSetAuth,
      accessToken: 'acc-tok',
      refreshToken: 'ref-tok',
    })
  })

  // ── 1. Title renders ──────────────────────────────────────────────────────
  it('renders "Completá tu perfil" heading', () => {
    renderPage()
    expect(screen.getByText('Completá tu perfil')).toBeInTheDocument()
  })

  // ── 2. WinnieLogo renders ─────────────────────────────────────────────────
  it('renders WinnieLogo', () => {
    renderPage()
    expect(screen.getByTestId('logo-sm')).toBeInTheDocument()
  })

  // ── 3. All form fields render ─────────────────────────────────────────────
  it('renders Nombre, Apellido, DNI, and Teléfono fields', () => {
    renderPage()
    expect(screen.getByPlaceholderText('Juan')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('García')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('12345678')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('+54 11 1234 5678')).toBeInTheDocument()
  })

  // ── 4. Submit button renders ──────────────────────────────────────────────
  it('renders "Continuar" submit button', () => {
    renderPage()
    expect(screen.getByText('Continuar')).toBeInTheDocument()
  })

  // ── 5. Validation: submitting empty form shows validation errors ──────────
  it('shows validation errors when form is submitted empty', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Continuar'))
    await waitFor(() => {
      // At least one validation error should appear (nombre, apellido, etc.)
      const errors = screen.getAllByText('Mínimo 2 caracteres')
      expect(errors.length).toBeGreaterThan(0)
    })
  })

  // ── 6. Valid form submission calls api.post ───────────────────────────────
  it('calls api.post with form values on valid submission', async () => {
    api.post.mockResolvedValue({
      data: { id: 1, nombre: 'Juan', apellido: 'García', dni: '12345678', telefono: '01112345678' },
    })
    renderPage()

    fireEvent.change(screen.getByPlaceholderText('Juan'), { target: { value: 'Juan' } })
    fireEvent.change(screen.getByPlaceholderText('García'), { target: { value: 'García' } })
    fireEvent.change(screen.getByPlaceholderText('12345678'), { target: { value: '12345678' } })
    fireEvent.change(screen.getByPlaceholderText('+54 11 1234 5678'), { target: { value: '01112345678' } })

    fireEvent.click(screen.getByText('Continuar'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/complete-profile/', expect.objectContaining({
        nombre: 'Juan',
        apellido: 'García',
        dni: '12345678',
        telefono: '01112345678',
      }))
    })
  })

  // ── 7. Successful submission calls setAuth and navigates to /dashboard ────
  it('calls setAuth and navigates to /dashboard on success', async () => {
    api.post.mockResolvedValue({ data: {} })
    renderPage()

    fireEvent.change(screen.getByPlaceholderText('Juan'), { target: { value: 'Juan' } })
    fireEvent.change(screen.getByPlaceholderText('García'), { target: { value: 'García' } })
    fireEvent.change(screen.getByPlaceholderText('12345678'), { target: { value: '12345678' } })
    fireEvent.change(screen.getByPlaceholderText('+54 11 1234 5678'), { target: { value: '01112345678' } })

    fireEvent.click(screen.getByText('Continuar'))

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  // ── 8. API error shows toast.error ────────────────────────────────────────
  it('shows toast.error when API call fails', async () => {
    api.post.mockRejectedValue({
      response: { data: { detail: 'DNI ya registrado' } },
    })
    renderPage()

    fireEvent.change(screen.getByPlaceholderText('Juan'), { target: { value: 'Juan' } })
    fireEvent.change(screen.getByPlaceholderText('García'), { target: { value: 'García' } })
    fireEvent.change(screen.getByPlaceholderText('12345678'), { target: { value: '12345678' } })
    fireEvent.change(screen.getByPlaceholderText('+54 11 1234 5678'), { target: { value: '01112345678' } })

    fireEvent.click(screen.getByText('Continuar'))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
  })

  // ── 9. DNI validation: invalid format shows error ─────────────────────────
  it('shows DNI validation error for non-numeric input', async () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('12345678'), { target: { value: 'abcdefg' } })
    fireEvent.click(screen.getByText('Continuar'))
    await waitFor(() => {
      expect(screen.getByText(/DNI inválido/i)).toBeInTheDocument()
    })
  })
})
