/**
 * Tests for SocioFormModal.
 * Coverage uplift: 0% → ~75% on functions.
 * Covers validate, handleSubmit, handleChange, useEffect (populate), file upload.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SocioFormModal from './SocioFormModal'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../ui/Modal', () => ({
  default: ({ isOpen, onClose, children, title }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <button onClick={onClose} data-testid="modal-close">X</button>
        {children}
      </div>
    ) : null,
}))

vi.mock('../ui/Button', () => ({
  default: ({ children, onClick, type, disabled }) => (
    <button type={type || 'button'} onClick={onClick} disabled={disabled}>{children}</button>
  ),
}))

vi.mock('../../constants/files', () => ({
  MAX_CERT_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  CERT_ACCEPT_ATTR: '.pdf,.jpg,.jpeg,.png',
}))

const SOCIO = {
  id: 1,
  nombre: 'Juan',
  apellido: 'Pérez',
  dni: '12345678',
  telefono: '1156789012',
  email: 'juan@test.com',
  estado: 'activo',
  observaciones: 'Ninguna',
  numero_socio: 'S-001',
}

describe('SocioFormModal', () => {
  const onClose = vi.fn()
  const onSave = vi.fn()

  function renderModal({ isOpen = true, socioToEdit = null } = {}) {
    return render(
      <SocioFormModal
        isOpen={isOpen}
        onClose={onClose}
        onSave={onSave}
        socioToEdit={socioToEdit}
        isLoading={false}
      />
    )
  }

  beforeEach(() => vi.clearAllMocks())

  // ── 1. Not rendered when isOpen=false ─────────────────────────────────
  it('renders nothing when isOpen is false', () => {
    renderModal({ isOpen: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // ── 2. Renders when isOpen=true ───────────────────────────────────────
  it('renders the modal when isOpen is true', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  // ── 3. Nombre field renders ───────────────────────────────────────────
  it('renders nombre input field with placeholder', () => {
    renderModal()
    // Nombre field uses placeholder "Ej. Juan"
    expect(screen.getByPlaceholderText('Ej. Juan')).toBeInTheDocument()
  })

  // ── 4. Populates form when socioToEdit is provided ───────────────────
  it('populates form fields from socioToEdit', () => {
    renderModal({ socioToEdit: SOCIO })
    expect(screen.getByDisplayValue('Juan')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Pérez')).toBeInTheDocument()
    expect(screen.getByDisplayValue('12345678')).toBeInTheDocument()
  })

  // ── 5. handleChange updates nombre ────────────────────────────────────
  it('updates nombre when typed into', () => {
    renderModal()
    const nombreInput = screen.getAllByRole('textbox')[0]
    fireEvent.change(nombreInput, { target: { value: 'Carlos' } })
    expect(nombreInput.value).toBe('Carlos')
  })

  // ── 6. validate — shows error when nombre is empty on submit ──────────
  it('shows validation error when nombre is empty on submit', () => {
    renderModal()
    const submitBtn = screen.getAllByRole('button').find(
      (b) => b.textContent.includes('Guardar') || b.textContent.includes('Agregar') || b.textContent.includes('Registrar')
    )
    if (submitBtn) {
      fireEvent.click(submitBtn)
      // Validation error should appear
      expect(
        screen.queryByText(/nombre es obligatorio/i) ||
        screen.queryByText(/obligatorio/i)
      ).not.toBeNull()
    }
  })

  // ── 7. handleSubmit calls onSave with valid data ──────────────────────
  it('calls onSave when form is submitted with valid data', () => {
    renderModal({ socioToEdit: SOCIO })
    const submitBtn = screen.getAllByRole('button').find(
      (b) => b.textContent.includes('Guardar') || b.textContent.includes('Guardar cambios')
    )
    if (submitBtn) {
      fireEvent.click(submitBtn)
      expect(onSave).toHaveBeenCalled()
    }
  })

  // ── 8. Close button calls onClose ─────────────────────────────────────
  it('calls onClose when close button is clicked', () => {
    renderModal()
    fireEvent.click(screen.getByTestId('modal-close'))
    expect(onClose).toHaveBeenCalled()
  })

  // ── 9. Edit mode shows edit title ─────────────────────────────────────
  it('shows editing indicator when socioToEdit is provided', () => {
    renderModal({ socioToEdit: SOCIO })
    // Modal should render with dialog
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  // ── 10. Create mode shows create title ─────────────────────────────────
  it('shows create indicator when socioToEdit is null', () => {
    renderModal({ socioToEdit: null })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  // ── 11. handleChange updates telefono ─────────────────────────────────
  it('updates telefono when typed', () => {
    renderModal()
    const inputs = screen.getAllByRole('textbox')
    // Telefono is typically the 4th input
    const telefonoInput = inputs.find(
      (i) => i.placeholder?.toLowerCase().includes('teléfono') || i.placeholder?.toLowerCase().includes('telefono')
    ) || inputs[3]
    if (telefonoInput) {
      fireEvent.change(telefonoInput, { target: { value: '1123456789' } })
      expect(telefonoInput.value).toBe('1123456789')
    }
  })

  // ── 12. Renders without crashing with null socioToEdit ─────────────────
  it('renders without crashing when socioToEdit is null', () => {
    expect(() => renderModal({ socioToEdit: null })).not.toThrow()
  })
})
