/**
 * Tests for SocioResumenSidebar.
 * Coverage uplift: 0% → ~100%.
 * Mocked: Card, Button.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SocioResumenSidebar from './SocioResumenSidebar'

vi.mock('../ui/Card', () => ({
  default: ({ children }) => <div data-testid="card">{children}</div>,
}))

vi.mock('../ui/Button', () => ({
  default: ({ children, onClick }) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

const defaultProps = {
  nombre: 'Juan',
  apellido: 'Pérez',
  dni: '12345678',
  plan: 'Premium',
  cuota: '$ 9.000',
  cobro: '01/07',
  renovacion: 'Automática',
  onSubmit: vi.fn(),
}

describe('SocioResumenSidebar', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders "Resumen" heading', () => {
    render(<SocioResumenSidebar {...defaultProps} />)
    expect(screen.getByText('Resumen')).toBeInTheDocument()
  })

  it('renders full name from nombre and apellido', () => {
    render(<SocioResumenSidebar {...defaultProps} />)
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
  })

  it('renders "Nuevo Socio" when nombre and apellido are empty', () => {
    render(<SocioResumenSidebar {...defaultProps} nombre="" apellido="" />)
    expect(screen.getByText('Nuevo Socio')).toBeInTheDocument()
  })

  it('renders DNI with "---" fallback when dni is empty', () => {
    render(<SocioResumenSidebar {...defaultProps} dni="" />)
    expect(screen.getByText('DNI ---')).toBeInTheDocument()
  })

  it('renders plan name', () => {
    render(<SocioResumenSidebar {...defaultProps} />)
    expect(screen.getByText('Premium')).toBeInTheDocument()
  })

  it('renders cuota mensual', () => {
    render(<SocioResumenSidebar {...defaultProps} />)
    expect(screen.getByText('$ 9.000')).toBeInTheDocument()
  })

  it('renders "Crear y generar QR" button', () => {
    render(<SocioResumenSidebar {...defaultProps} />)
    expect(screen.getByText(/Crear y generar QR/)).toBeInTheDocument()
  })

  it('calls onSubmit when "Crear y generar QR" button is clicked', () => {
    const onSubmit = vi.fn()
    render(<SocioResumenSidebar {...defaultProps} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByText(/Crear y generar QR/))
    expect(onSubmit).toHaveBeenCalled()
  })
})
