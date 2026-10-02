import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import RegisterPage from '../RegisterPage'
import api from '../../services/api'

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock useAuth — tests provide a real setAuth spy
const mockSetAuth = vi.fn()
vi.mock('../../hooks/useAuth', () => ({
  default: () => ({ setAuth: mockSetAuth }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fill the form with the given values (all fields by label text).
 * telefono is optional — omit it to leave blank.
 */
function fillForm({
  email = 'nuevo@test.com',
  password = 'Segura123!',
  passwordConfirm = 'Segura123!',
  nombre = 'Juan',
  apellido = 'García',
  dni = '12345678',
  telefono = '',
} = {}) {
  fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
    target: { value: email },
  })
  const [passInput, passConfirmInput] = screen.getAllByPlaceholderText('••••••••')
  fireEvent.change(passInput, { target: { value: password } })
  fireEvent.change(passConfirmInput, { target: { value: passwordConfirm } })
  fireEvent.change(screen.getByPlaceholderText('Juan'), { target: { value: nombre } })
  fireEvent.change(screen.getByPlaceholderText('García'), { target: { value: apellido } })
  fireEvent.change(screen.getByPlaceholderText('12345678'), { target: { value: dni } })
  if (telefono) {
    fireEvent.change(screen.getByPlaceholderText('+54 11 1234 5678'), {
      target: { value: telefono },
    })
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- T2.5 render: all 7 fields present -----------------------------------

  it('renders all 7 form fields', () => {
    renderPage()
    expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument()
    const passwords = screen.getAllByPlaceholderText('••••••••')
    expect(passwords).toHaveLength(2)
    expect(screen.getByPlaceholderText('Juan')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('García')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('12345678')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('+54 11 1234 5678')).toBeInTheDocument()
  })

  it('renders submit button and login link', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ya tenés cuenta/i })).toBeInTheDocument()
  })

  // --- T2.5 happy path: submits with valid data ----------------------------

  it('calls register then complete-profile and navigates to /dashboard on success', async () => {
    const { toast } = await import('sonner')

    api.post
      .mockResolvedValueOnce({
        data: { access: 'tok-access', refresh: 'tok-refresh', user: { id: 1, rol: 'socio' } },
      })
      .mockResolvedValueOnce({ data: {} })

    renderPage()
    fillForm()
    fireEvent.submit(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      // First call: registration
      expect(api.post).toHaveBeenNthCalledWith(1, '/auth/registration/register/', {
        email: 'nuevo@test.com',
        password1: 'Segura123!',
        password2: 'Segura123!',
      })
      // Second call: complete-profile
      expect(api.post).toHaveBeenNthCalledWith(2, '/auth/complete-profile/', {
        nombre: 'Juan',
        apellido: 'García',
        dni: '12345678',
        telefono: '',
      })
      expect(mockSetAuth).toHaveBeenCalledWith({
        access: 'tok-access',
        refresh: 'tok-refresh',
        user: { id: 1, rol: 'socio' },
      })
      expect(toast.success).toHaveBeenCalledWith('¡Cuenta creada exitosamente! Bienvenido/a.')
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  // --- T2.5 validation errors ----------------------------------------------

  it('shows validation error for invalid email', async () => {
    renderPage()
    fillForm({ email: 'not-an-email' })
    fireEvent.submit(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(screen.getByText('Email inválido')).toBeInTheDocument()
    })
  })

  it('shows validation error for short password', async () => {
    renderPage()
    fillForm({ password: '123', passwordConfirm: '123' })
    fireEvent.submit(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      // Both password fields fail min(8) — at least one error message must be present
      const errors = screen.getAllByText('La contraseña debe tener al menos 8 caracteres')
      expect(errors.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows validation error when passwords do not match', async () => {
    renderPage()
    fillForm({ password: 'Segura123!', passwordConfirm: 'OtraPass99!' })
    fireEvent.submit(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument()
    })
  })

  it('shows validation error for empty DNI', async () => {
    renderPage()
    fillForm({ dni: '' })
    fireEvent.submit(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(
        screen.getByText('DNI inválido (7 u 8 dígitos numéricos)')
      ).toBeInTheDocument()
    })
  })

  it('shows validation error for DNI with letters', async () => {
    renderPage()
    fillForm({ dni: 'abc1234' })
    fireEvent.submit(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(
        screen.getByText('DNI inválido (7 u 8 dígitos numéricos)')
      ).toBeInTheDocument()
    })
  })

  // --- T2.5 400 registration error: email duplicate -----------------------

  it('shows inline error on email field when registration returns 400 email dup', async () => {
    const { toast } = await import('sonner')

    api.post.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { email: ['Ya existe un usuario con este email.'] },
      },
    })

    renderPage()
    fillForm()
    fireEvent.submit(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Ya existe un usuario con este email.')
      ).toBeInTheDocument()
      // Should NOT navigate
      expect(mockNavigate).not.toHaveBeenCalled()
      // No success toast
      expect(toast.success).not.toHaveBeenCalled()
    })
  })

  // --- T2.5 400 complete-profile error: DNI duplicate ---------------------

  it('shows inline error on DNI field when complete-profile returns 400 dni dup', async () => {
    api.post
      .mockResolvedValueOnce({
        data: { access: 'tok-access', refresh: 'tok-refresh', user: { id: 1, rol: 'socio' } },
      })
      .mockRejectedValueOnce({
        response: {
          status: 400,
          data: { dni: ['Ya existe un socio con este DNI.'] },
        },
      })

    renderPage()
    fillForm()
    fireEvent.submit(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Ya existe un socio con este DNI.')
      ).toBeInTheDocument()
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  // --- Network error: toast shown, form stays populated -------------------

  it('shows network error toast on unexpected failure', async () => {
    const { toast } = await import('sonner')

    api.post.mockRejectedValueOnce(new Error('Network Error'))

    renderPage()
    fillForm()
    fireEvent.submit(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Error de red. Revisá tu conexión e intentá de nuevo.'
      )
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })
})
