/**
 * Test #12 (contract): InstructorFormModal > admin only, hidden for recepcionista
 *
 * Verifies that:
 * 1. Admin sees the full create/edit form.
 * 2. Non-admin (recepcionista) sees a permission-denied message instead of the form.
 * 3. Form submits correct payload with nombre, apellido, email, tel, especialidades, bio, activo.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import InstructorFormModal from '../InstructorFormModal'

vi.mock('../../ui/Modal', () => ({
  default: ({ isOpen, onClose, title, children }) =>
    isOpen ? (
      <div data-testid="modal">
        <h2 data-testid="modal-title">{title}</h2>
        <button data-testid="modal-close" onClick={onClose}>X</button>
        {children}
      </div>
    ) : null,
}))

vi.mock('../../ui/Button', () => ({
  default: ({ children, onClick, type, 'data-testid': testId }) => (
    <button type={type} onClick={onClick} data-testid={testId}>
      {children}
    </button>
  ),
}))

function renderModal(props = {}) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    instructorToEdit: null,
    isAdmin: true,
  }
  return render(<InstructorFormModal {...defaults} {...props} />)
}

describe('InstructorFormModal > admin only, hidden for recepcionista', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Role access ──────────────────────────────────────────────────────────────

  it('renders the full form for an admin user', () => {
    renderModal({ isAdmin: true })

    expect(screen.getByTestId('instructor-form')).toBeInTheDocument()
    expect(screen.getByTestId('instructor-nombre')).toBeInTheDocument()
    expect(screen.getByTestId('instructor-apellido')).toBeInTheDocument()
    expect(screen.getByTestId('instructor-email')).toBeInTheDocument()
    expect(screen.getByTestId('instructor-telefono')).toBeInTheDocument()
    expect(screen.getByTestId('especialidades-chips')).toBeInTheDocument()
    expect(screen.getByTestId('instructor-bio')).toBeInTheDocument()
    expect(screen.getByTestId('instructor-activo')).toBeInTheDocument()
  })

  it('shows permission message instead of form for non-admin (recepcionista)', () => {
    renderModal({ isAdmin: false })

    expect(screen.queryByTestId('instructor-form')).not.toBeInTheDocument()
    expect(screen.getByText(/solo los administradores/i)).toBeInTheDocument()
  })

  it('shows "Cerrar" button for non-admin and calls onClose', () => {
    const onClose = vi.fn()
    renderModal({ isAdmin: false, onClose })

    fireEvent.click(screen.getByText('Cerrar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // ── Create flow ──────────────────────────────────────────────────────────────

  it('shows "Nuevo instructor" title when creating', () => {
    renderModal({ isAdmin: true, instructorToEdit: null })
    expect(screen.getByTestId('modal-title').textContent).toBe('Nuevo instructor')
  })

  it('shows "Editar instructor" title when editing', () => {
    renderModal({
      isAdmin: true,
      instructorToEdit: { id: 1, nombre: 'Juan', apellido: 'Perez', especialidades: [] },
    })
    expect(screen.getByTestId('modal-title').textContent).toBe('Editar instructor')
  })

  it('populates form fields when instructorToEdit is provided', () => {
    renderModal({
      isAdmin: true,
      instructorToEdit: {
        id: 5,
        nombre: 'Maria',
        apellido: 'Gomez',
        email: 'maria@gym.com',
        telefono: '+54 911',
        especialidades: ['yoga', 'pilates'],
        bio: 'Experta en yoga',
        activo: true,
      },
    })

    expect(screen.getByTestId('instructor-nombre').value).toBe('Maria')
    expect(screen.getByTestId('instructor-apellido').value).toBe('Gomez')
    expect(screen.getByTestId('instructor-email').value).toBe('maria@gym.com')
    expect(screen.getByTestId('instructor-telefono').value).toBe('+54 911')
    expect(screen.getByTestId('instructor-bio').value).toBe('Experta en yoga')
  })

  // ── Submit / validation ──────────────────────────────────────────────────────

  it('calls onSave with correct payload on valid submit', () => {
    const onSave = vi.fn()
    renderModal({ isAdmin: true, onSave })

    fireEvent.change(screen.getByTestId('instructor-nombre'), { target: { value: 'Carlos' } })
    fireEvent.change(screen.getByTestId('instructor-apellido'), { target: { value: 'Ruiz' } })
    fireEvent.change(screen.getByTestId('instructor-email'), { target: { value: 'carlos@gym.com' } })
    fireEvent.change(screen.getByTestId('instructor-telefono'), { target: { value: '1122334455' } })
    fireEvent.change(screen.getByTestId('instructor-bio'), { target: { value: 'Instructor senior' } })

    // Toggle an especialidad chip
    fireEvent.click(screen.getByTestId('chip-spinning'))

    // Use submit event directly — fireEvent.click on type="submit" doesn't trigger form onSubmit in jsdom
    fireEvent.submit(screen.getByTestId('instructor-form'))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Carlos',
        apellido: 'Ruiz',
        email: 'carlos@gym.com',
        telefono: '1122334455',
        bio: 'Instructor senior',
        especialidades: ['spinning'],
        activo: true,
      })
    )
  })

  it('shows error and does not call onSave when nombre is empty', () => {
    const onSave = vi.fn()
    renderModal({ isAdmin: true, onSave })

    // Only fill apellido, leave nombre empty
    fireEvent.change(screen.getByTestId('instructor-apellido'), { target: { value: 'Ruiz' } })
    // Submit the form directly so jsdom fires onSubmit
    fireEvent.submit(screen.getByTestId('instructor-form'))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('El nombre es requerido')).toBeInTheDocument()
  })

  it('shows error and does not call onSave when apellido is empty', () => {
    const onSave = vi.fn()
    renderModal({ isAdmin: true, onSave })

    fireEvent.change(screen.getByTestId('instructor-nombre'), { target: { value: 'Carlos' } })
    // Submit the form directly so jsdom fires onSubmit
    fireEvent.submit(screen.getByTestId('instructor-form'))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('El apellido es requerido')).toBeInTheDocument()
  })

  // ── Activo toggle ────────────────────────────────────────────────────────────

  it('toggles activo field on switch click', () => {
    renderModal({ isAdmin: true })

    const toggle = screen.getByTestId('instructor-activo')
    // Default: activo = true
    expect(toggle.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-checked')).toBe('false')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-checked')).toBe('true')
  })

  // ── Especialidades chips ─────────────────────────────────────────────────────

  it('adds and removes especialidades via chip clicks', () => {
    renderModal({ isAdmin: true })

    // Add funcional
    fireEvent.click(screen.getByTestId('chip-funcional'))
    // Add yoga
    fireEvent.click(screen.getByTestId('chip-yoga'))

    // Both chips now active (have X icon via aria or text)
    expect(screen.getByTestId('chip-funcional').className).toContain('orange')
    expect(screen.getByTestId('chip-yoga').className).toContain('orange')

    // Remove funcional
    fireEvent.click(screen.getByTestId('chip-funcional'))
    expect(screen.getByTestId('chip-funcional').className).not.toContain('orange-500')
  })

  // ── Modal lifecycle ──────────────────────────────────────────────────────────

  it('does not render when isOpen is false', () => {
    renderModal({ isAdmin: true, isOpen: false })
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })
})
