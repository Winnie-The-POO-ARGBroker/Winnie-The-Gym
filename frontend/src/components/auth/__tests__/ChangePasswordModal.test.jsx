import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ChangePasswordModal from '../ChangePasswordModal'

vi.mock('../../../services/api', () => ({
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

import api from '../../../services/api'
import { toast } from 'sonner'

function renderModal(props = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const defaults = { isOpen: true, onClose: vi.fn() }
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChangePasswordModal {...defaults} {...props} />
        </MemoryRouter>
      </QueryClientProvider>
    ),
    onClose: defaults.onClose,
  }
}

describe('ChangePasswordModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the modal when isOpen=true', () => {
    renderModal()
    expect(screen.getAllByText('Cambiar contraseña').length).toBeGreaterThan(0)
    expect(screen.getByText(/Ingresá tu contraseña actual/i)).toBeInTheDocument()
  })

  it('does not render when isOpen=false', () => {
    renderModal({ isOpen: false })
    expect(screen.queryByText(/Ingresá tu contraseña actual/i)).not.toBeInTheDocument()
  })

  it('shows validation error when passwords do not match', async () => {
    renderModal()
    const pwdInputs = document.querySelectorAll('input[type="password"]')
    fireEvent.input(pwdInputs[0], { target: { value: 'OldPass123!' } })
    fireEvent.input(pwdInputs[1], { target: { value: 'NewPass123!' } })
    fireEvent.input(pwdInputs[2], { target: { value: 'Mismatch999!' } })
    fireEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/i }))
    await waitFor(() => {
      expect(screen.getByText(/no coinciden/i)).toBeInTheDocument()
    })
  })

  it('shows validation error when new password is too short', async () => {
    renderModal()
    const pwdInputs = document.querySelectorAll('input[type="password"]')
    fireEvent.input(pwdInputs[1], { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/i }))
    await waitFor(() => {
      expect(screen.getByText(/al menos 8 caracteres/i)).toBeInTheDocument()
    })
  })

  it('calls api.post and toast.success on success', async () => {
    api.post.mockResolvedValueOnce({ data: {} })
    const { onClose } = renderModal()

    const pwdInputs = document.querySelectorAll('input[type="password"]')
    fireEvent.input(pwdInputs[0], { target: { value: 'OldPass123!' } })
    fireEvent.input(pwdInputs[1], { target: { value: 'NewPass123!' } })
    fireEvent.input(pwdInputs[2], { target: { value: 'NewPass123!' } })
    fireEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/password/change/', expect.objectContaining({
        old_password: 'OldPass123!',
        new_password1: 'NewPass123!',
        new_password2: 'NewPass123!',
      }))
      expect(toast.success).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('shows error toast when api fails', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { detail: 'Contraseña incorrecta.' } } })
    renderModal()

    const pwdInputs = document.querySelectorAll('input[type="password"]')
    fireEvent.input(pwdInputs[0], { target: { value: 'WrongPass!' } })
    fireEvent.input(pwdInputs[1], { target: { value: 'NewPass123!' } })
    fireEvent.input(pwdInputs[2], { target: { value: 'NewPass123!' } })
    fireEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Contraseña incorrecta.')
    })
  })
})
