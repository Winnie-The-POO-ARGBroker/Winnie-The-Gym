import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import StaffFormModal from '../StaffFormModal'

// Mock the useStaffCreate hook
vi.mock('../../../hooks/queries/useStaff', () => ({
  useStaffCreate: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 1, email: 'test@gym.test', rol: 'recepcionista' }),
    isPending: false,
  })),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function renderModal(props = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const defaults = { isOpen: true, onClose: vi.fn() }
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StaffFormModal {...defaults} {...props} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('StaffFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the modal title when open', () => {
    renderModal()
    expect(screen.getByText('Crear nuevo staff')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    renderModal({ isOpen: false })
    expect(screen.queryByText('Crear nuevo staff')).not.toBeInTheDocument()
  })

  it('renders all form fields', () => {
    renderModal()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
    expect(screen.getByLabelText('Apellido')).toBeInTheDocument()
    expect(screen.getByLabelText('Rol')).toBeInTheDocument()
  })

  it('shows validation error when email is empty', async () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /crear staff/i }))
    await waitFor(() => {
      expect(screen.getByText('El email es obligatorio')).toBeInTheDocument()
    })
  })

  it('shows validation error when email is invalid', async () => {
    renderModal()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'not-an-email' },
    })
    fireEvent.click(screen.getByRole('button', { name: /crear staff/i }))
    await waitFor(() => {
      expect(screen.getByText(/email válido/i)).toBeInTheDocument()
    })
  })

  it('shows validation error when nombre is empty', async () => {
    renderModal()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'valid@email.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /crear staff/i }))
    await waitFor(() => {
      expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()
    })
  })

  it('calls mutateAsync with correct payload on valid submit', async () => {
    const { useStaffCreate } = await import('../../../hooks/queries/useStaff')
    const mockMutateAsync = vi.fn().mockResolvedValue({})
    useStaffCreate.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false })

    const onClose = vi.fn()
    renderModal({ onClose })

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'staff@gym.test' },
    })
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Ana' },
    })
    fireEvent.change(screen.getByLabelText('Apellido'), {
      target: { value: 'García' },
    })

    fireEvent.click(screen.getByRole('button', { name: /crear staff/i }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        email: 'staff@gym.test',
        first_name: 'Ana',
        last_name: 'García',
        rol: 'recepcionista',
      })
    })
  })

  it('calls onClose after successful submit', async () => {
    const { useStaffCreate } = await import('../../../hooks/queries/useStaff')
    useStaffCreate.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    })

    const onClose = vi.fn()
    renderModal({ onClose })

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'staff@gym.test' },
    })
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Ana' },
    })
    fireEvent.change(screen.getByLabelText('Apellido'), {
      target: { value: 'García' },
    })

    fireEvent.click(screen.getByRole('button', { name: /crear staff/i }))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('renders Cancelar button that calls onClose', () => {
    const onClose = vi.fn()
    renderModal({ onClose })

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders rol select with two options', () => {
    renderModal()
    const select = screen.getByLabelText('Rol')
    const options = select.querySelectorAll('option')
    expect(options).toHaveLength(2)
    expect(options[0].value).toBe('recepcionista')
    expect(options[1].value).toBe('administrador')
  })
})
