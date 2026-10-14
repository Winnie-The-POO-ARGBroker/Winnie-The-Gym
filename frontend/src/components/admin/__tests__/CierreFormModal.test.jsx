import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CierreFormModal from '../CierreFormModal'

function renderModal(props = {}) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    cierreToEdit: null,
  }
  return render(<CierreFormModal {...defaults} {...props} />)
}

describe('CierreFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when isOpen is true', () => {
    renderModal()
    expect(screen.getByText('Nuevo cierre / feriado')).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    renderModal({ isOpen: false })
    expect(screen.queryByText('Nuevo cierre / feriado')).not.toBeInTheDocument()
  })

  it('rechaza fecha_hasta < fecha_desde', () => {
    const onSave = vi.fn()
    renderModal({ onSave })

    fireEvent.change(screen.getByTestId('cierre-form-fecha-desde'), {
      target: { value: '2026-12-25' },
    })
    fireEvent.change(screen.getByTestId('cierre-form-fecha-hasta'), {
      target: { value: '2026-12-20' },
    })
    fireEvent.change(screen.getByTestId('cierre-form-motivo'), {
      target: { value: 'Navidad' },
    })

    fireEvent.click(screen.getByTestId('cierre-form-submit'))

    expect(onSave).not.toHaveBeenCalled()
    expect(
      screen.getByText('La fecha de fin no puede ser anterior a la de inicio')
    ).toBeInTheDocument()
  })

  it('calls onSave with correct payload when form is valid', () => {
    const onSave = vi.fn()
    renderModal({ onSave })

    fireEvent.change(screen.getByTestId('cierre-form-fecha-desde'), {
      target: { value: '2026-12-25' },
    })
    fireEvent.change(screen.getByTestId('cierre-form-fecha-hasta'), {
      target: { value: '2026-12-25' },
    })
    fireEvent.change(screen.getByTestId('cierre-form-motivo'), {
      target: { value: 'Navidad' },
    })

    fireEvent.click(screen.getByTestId('cierre-form-submit'))

    expect(onSave).toHaveBeenCalledWith({
      fecha_desde: '2026-12-25',
      fecha_hasta: '2026-12-25',
      motivo: 'Navidad',
      afecta: 'todo',
    })
  })

  it('muestra error si motivo está vacío', () => {
    const onSave = vi.fn()
    renderModal({ onSave })

    fireEvent.change(screen.getByTestId('cierre-form-fecha-desde'), {
      target: { value: '2026-12-25' },
    })
    fireEvent.change(screen.getByTestId('cierre-form-fecha-hasta'), {
      target: { value: '2026-12-25' },
    })

    fireEvent.click(screen.getByTestId('cierre-form-submit'))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('El motivo es requerido')).toBeInTheDocument()
  })

  it('pre-populates fields when editing an existing cierre', () => {
    const cierreToEdit = {
      id: 1,
      fecha_desde: '2026-01-01',
      fecha_hasta: '2026-01-03',
      motivo: 'Año nuevo',
      afecta: 'todo',
    }
    renderModal({ cierreToEdit })

    expect(screen.getByTestId('cierre-form-fecha-desde').value).toBe('2026-01-01')
    expect(screen.getByTestId('cierre-form-fecha-hasta').value).toBe('2026-01-03')
    expect(screen.getByTestId('cierre-form-motivo').value).toBe('Año nuevo')
    expect(screen.getByText('Guardar cambios')).toBeInTheDocument()
  })
})
