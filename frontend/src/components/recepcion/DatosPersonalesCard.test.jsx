/**
 * Tests for DatosPersonalesCard.
 * Coverage uplift: 0% → ~85%.
 * Mocked: Card, Input, Select.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DatosPersonalesCard from './DatosPersonalesCard'

vi.mock('../ui/Card', () => ({
  default: ({ children }) => <div data-testid="card">{children}</div>,
}))

vi.mock('../ui/Input', () => ({
  default: ({ label, value, onChange, placeholder }) => (
    <div>
      <label>{label}</label>
      <input
        aria-label={label}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={onChange}
        readOnly={!onChange}
      />
    </div>
  ),
}))

vi.mock('../ui/Select', () => ({
  default: ({ label, value, onChange, children }) => (
    <div>
      <label>{label}</label>
      <select aria-label={label} value={value ?? ''} onChange={onChange}>
        {children}
      </select>
    </div>
  ),
}))

describe('DatosPersonalesCard', () => {
  const mockOnChange = vi.fn()
  const formData = {
    nombre: 'Juan',
    apellido: 'Pérez',
    dni: '12345678',
    email: 'juan@mail.com',
    telefono: '01112345678',
    fechaNacimiento: '01/01/1990',
    genero: 'Masculino',
  }

  beforeEach(() => vi.clearAllMocks())

  // ── 1. Title renders ──────────────────────────────────────────────────────
  it('renders "Datos personales" heading', () => {
    render(<DatosPersonalesCard formData={formData} onChange={mockOnChange} />)
    expect(screen.getByText('Datos personales')).toBeInTheDocument()
  })

  // ── 2. Nombre field renders with value ────────────────────────────────────
  it('renders NOMBRE input with correct value', () => {
    render(<DatosPersonalesCard formData={formData} onChange={mockOnChange} />)
    const input = screen.getByDisplayValue('Juan')
    expect(input).toBeInTheDocument()
  })

  // ── 3. DNI field renders ──────────────────────────────────────────────────
  it('renders DNI input with value', () => {
    render(<DatosPersonalesCard formData={formData} onChange={mockOnChange} />)
    expect(screen.getByDisplayValue('12345678')).toBeInTheDocument()
  })

  // ── 4. Email field renders ────────────────────────────────────────────────
  it('renders EMAIL input with value', () => {
    render(<DatosPersonalesCard formData={formData} onChange={mockOnChange} />)
    expect(screen.getByDisplayValue('juan@mail.com')).toBeInTheDocument()
  })

  // ── 5. onChange called for nombre field ───────────────────────────────────
  it('calls onChange with "nombre" key when nombre input changes', () => {
    render(<DatosPersonalesCard formData={formData} onChange={mockOnChange} />)
    const input = screen.getByDisplayValue('Juan')
    fireEvent.change(input, { target: { value: 'Carlos' } })
    expect(mockOnChange).toHaveBeenCalledWith('nombre', 'Carlos')
  })

  // ── 6. Género select renders ──────────────────────────────────────────────
  it('renders GÉNERO select with options', () => {
    render(<DatosPersonalesCard formData={formData} onChange={mockOnChange} />)
    expect(screen.getByText('Femenino')).toBeInTheDocument()
    expect(screen.getByText('Masculino')).toBeInTheDocument()
    expect(screen.getByText('Otro')).toBeInTheDocument()
  })
})
