import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import CancelarClaseModal from '../CancelarClaseModal'

const mockClase = {
  id: 1,
  nombre: 'Funcional Mañana',
  dia: 'lunes',
  hora: '08:00',
}

function renderModal(props = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onConfirm = vi.fn()
  const onClose = vi.fn()
  const defaults = { isOpen: true, onClose, clase: mockClase, onConfirm, loading: false }
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CancelarClaseModal {...defaults} {...props} />
        </MemoryRouter>
      </QueryClientProvider>
    ),
    onConfirm,
    onClose,
  }
}

describe('CancelarClaseModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal with clase info', () => {
    renderModal()
    expect(screen.getByText('Cancelar clase')).toBeInTheDocument()
    expect(screen.getByText(/Funcional Mañana/)).toBeInTheDocument()
  })

  it('does not render when isOpen=false', () => {
    renderModal({ isOpen: false })
    expect(screen.queryByText('Cancelar clase')).not.toBeInTheDocument()
  })

  it('shows validation error when motivo is too short', async () => {
    renderModal()
    const textarea = screen.getByPlaceholderText(/mínimo 10 caracteres/i)
    fireEvent.input(textarea, { target: { value: 'Corto' } })
    fireEvent.click(screen.getByRole('button', { name: /Confirmar cancelación/i }))
    await waitFor(() => {
      expect(screen.getByText(/al menos 10 caracteres/i)).toBeInTheDocument()
    })
  })

  it('calls onConfirm with motivo when valid', async () => {
    const { onConfirm } = renderModal()
    const textarea = screen.getByPlaceholderText(/mínimo 10 caracteres/i)
    fireEvent.input(textarea, { target: { value: 'El instructor está enfermo esta semana.' } })
    fireEvent.click(screen.getByRole('button', { name: /Confirmar cancelación/i }))
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('El instructor está enfermo esta semana.')
    })
  })

  it('calls onClose when Cancelar is clicked', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalled()
  })
})
