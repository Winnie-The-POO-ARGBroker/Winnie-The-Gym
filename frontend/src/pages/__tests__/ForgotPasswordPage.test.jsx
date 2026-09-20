import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ForgotPasswordPage from '../ForgotPasswordPage'
import api from '../../services/api'

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>
  )
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email field and submit button', () => {
    renderPage()
    expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enviar enlace/i })).toBeInTheDocument()
    expect(screen.getByText(/volver a inicio de sesión/i)).toBeInTheDocument()
  })

  it('shows generic success message after submit regardless of email existence', async () => {
    api.post.mockResolvedValueOnce({ data: {} })

    renderPage()
    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'someone@example.com' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /enviar enlace/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/password/reset/', {
        email: 'someone@example.com',
      })
      expect(
        screen.getByText(/si el email existe, te enviamos un enlace/i)
      ).toBeInTheDocument()
    })
  })

  it('shows toast error when request fails', async () => {
    const { toast } = await import('sonner')
    api.post.mockRejectedValueOnce(new Error('Network error'))

    renderPage()
    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'someone@example.com' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /enviar enlace/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Ocurrió un error. Por favor, intentá de nuevo.'
      )
    })
  })
})
