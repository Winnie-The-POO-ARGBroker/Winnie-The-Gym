import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import EmailPasswordForm from '../EmailPasswordForm'
import api from '../../../services/api'

vi.mock('../../../services/api', () => ({
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

vi.mock('../../../hooks/useAuth', () => ({
  default: () => ({
    setAuth: vi.fn(),
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function renderForm(props = {}) {
  return render(
    <MemoryRouter>
      <EmailPasswordForm {...props} />
    </MemoryRouter>
  )
}

describe('EmailPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email and password fields', () => {
    renderForm()
    expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it('shows validation error for invalid email', async () => {
    renderForm()
    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'not-an-email' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }))
    await waitFor(() => {
      expect(screen.getByText(/ingresá un email válido/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for short password', async () => {
    renderForm()
    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: '123' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }))
    await waitFor(() => {
      expect(screen.getByText(/al menos 8 caracteres/i)).toBeInTheDocument()
    })
  })

  it('calls api.post and navigates on successful login with complete profile', async () => {
    const { toast } = await import('sonner')
    api.post.mockResolvedValueOnce({
      data: {
        access: 'fake-access',
        refresh: 'fake-refresh',
        user: { id: 1, email: 'user@example.com', is_profile_complete: true },
      },
    })

    renderForm()
    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login/', {
        email: 'user@example.com',
        password: 'password123',
      })
      expect(toast.success).toHaveBeenCalledWith('Sesión iniciada')
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows toast error on 401 credentials failure', async () => {
    const { toast } = await import('sonner')
    api.post.mockRejectedValueOnce({
      response: {
        data: { non_field_errors: ['Credenciales inválidas.'] },
      },
    })

    renderForm()
    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpass' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Credenciales inválidas.')
    })
  })
})
