import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ResetPasswordPage from '../ResetPasswordPage'
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

function renderPage(uid = 'test-uid', token = 'test-token') {
  return render(
    <MemoryRouter initialEntries={[`/reset-password/${uid}/${token}`]}>
      <Routes>
        <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders two password fields and submit button', () => {
    renderPage()
    const inputs = screen.getAllByPlaceholderText('••••••••')
    expect(inputs).toHaveLength(2)
    expect(screen.getByRole('button', { name: /restablecer contraseña/i })).toBeInTheDocument()
  })

  it('shows validation error when passwords do not match', async () => {
    renderPage()
    const [password, confirm] = screen.getAllByPlaceholderText('••••••••')
    fireEvent.change(password, { target: { value: 'password123' } })
    fireEvent.change(confirm, { target: { value: 'differentpass' } })
    fireEvent.submit(screen.getByRole('button', { name: /restablecer contraseña/i }))

    await waitFor(() => {
      expect(screen.getByText(/las contraseñas no coinciden/i)).toBeInTheDocument()
    })
  })

  it('posts to correct endpoint with uid and token from URL params, then navigates', async () => {
    const { toast } = await import('sonner')
    api.post.mockResolvedValueOnce({ data: {} })

    renderPage('abc123', 'xyz-token')
    const [password, confirm] = screen.getAllByPlaceholderText('••••••••')
    fireEvent.change(password, { target: { value: 'newpassword1' } })
    fireEvent.change(confirm, { target: { value: 'newpassword1' } })
    fireEvent.submit(screen.getByRole('button', { name: /restablecer contraseña/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/password/reset/confirm/', {
        uid: 'abc123',
        token: 'xyz-token',
        new_password1: 'newpassword1',
        new_password2: 'newpassword1',
      })
      expect(toast.success).toHaveBeenCalledWith('Contraseña restablecida exitosamente')
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })
})
