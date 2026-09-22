import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PlanFormModal from '../PlanFormModal'

function renderModal(props = {}) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    planToEdit: null,
    isDuplicate: false,
  }
  return render(<PlanFormModal {...defaults} {...props} />)
}

describe('PlanFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when isOpen is true', () => {
    renderModal()
    expect(screen.getByText('Crear Nuevo Plan')).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    renderModal({ isOpen: false })
    expect(screen.queryByText('Crear Nuevo Plan')).not.toBeInTheDocument()
  })

  it('shows es_popular toggle', () => {
    renderModal()
    expect(screen.getByText(/POPULAR/i)).toBeInTheDocument()
  })

  it('shows duracion_dias select with valid options', () => {
    renderModal()
    // Find the duration select by text content of its options
    const options = screen.getAllByRole('option')
    const durationOptions = options.filter((o) =>
      ['30 días (Mensual)', '90 días (Trimestral)', '180 días (Semestral)', '365 días (Anual)'].includes(
        o.textContent
      )
    )
    expect(durationOptions.length).toBe(4)
  })

  it('calls onSave with correct data when form is valid', () => {
    const onSave = vi.fn()
    renderModal({ onSave })

    // Fill nombre
    const nombreInput = screen.getByPlaceholderText(/Ej. Black, Funcional Plus/i)
    fireEvent.change(nombreInput, { target: { value: 'Plan Test' } })

    // Fill precio
    const precioInput = screen.getByPlaceholderText('12000')
    fireEvent.change(precioInput, { target: { value: '5000' } })

    // Submit
    fireEvent.click(screen.getByText('Crear Plan'))

    expect(onSave).toHaveBeenCalledOnce()
    const callArg = onSave.mock.calls[0][0]
    expect(callArg.nombre).toBe('Plan Test')
    expect(callArg.precio).toBe(5000)
    expect(callArg.duracion_dias).toBe(30)
  })

  it('shows inline error when nombre is empty on submit', () => {
    renderModal()

    // Leave nombre empty, fill precio
    const precioInput = screen.getByPlaceholderText('12000')
    fireEvent.change(precioInput, { target: { value: '5000' } })

    fireEvent.click(screen.getByText('Crear Plan'))

    expect(screen.getByText('El nombre es requerido')).toBeInTheDocument()
  })

  it('shows inline error when precio is negative on submit', () => {
    renderModal()

    const nombreInput = screen.getByPlaceholderText(/Ej. Black, Funcional Plus/i)
    fireEvent.change(nombreInput, { target: { value: 'Mi Plan' } })

    const precioInput = screen.getByPlaceholderText('12000')
    fireEvent.change(precioInput, { target: { value: '-500' } })

    fireEvent.click(screen.getByText('Crear Plan'))

    expect(screen.getByText('El precio no puede ser negativo')).toBeInTheDocument()
  })

  it('populates form when planToEdit is provided', () => {
    const plan = {
      id: 42,
      nombre: 'Plan Existente',
      precio: '8000',
      duracion_dias: 90,
      clases_asignadas: 8,
      es_popular: true,
      activo: true,
    }
    renderModal({ planToEdit: plan })

    expect(screen.getByText('Editar Plan de Membresía')).toBeInTheDocument()
    const nombreInput = screen.getByPlaceholderText(/Ej. Black, Funcional Plus/i)
    expect(nombreInput.value).toBe('Plan Existente')
  })
})
