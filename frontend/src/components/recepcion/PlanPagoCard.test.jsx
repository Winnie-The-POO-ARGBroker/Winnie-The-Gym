/**
 * Tests for PlanPagoCard.
 * Coverage uplift: 0% → ~85%.
 * Mocked: Card, Input, Select.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PlanPagoCard from './PlanPagoCard'

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

describe('PlanPagoCard', () => {
  const mockOnChange = vi.fn()
  const formData = { plan: 'Premium', cuota: '$ 12.000', cobro: '01/06', renovacion: 'Automática' }

  beforeEach(() => vi.clearAllMocks())

  // ── 1. Title renders ──────────────────────────────────────────────────────
  it('renders "Plan y pago" heading', () => {
    render(<PlanPagoCard formData={formData} onChange={mockOnChange} />)
    expect(screen.getByText('Plan y pago')).toBeInTheDocument()
  })

  // ── 2. PLAN select renders ────────────────────────────────────────────────
  it('renders PLAN select with Premium and Básico options', () => {
    render(<PlanPagoCard formData={formData} onChange={mockOnChange} />)
    expect(screen.getByText(/Premium/)).toBeInTheDocument()
    expect(screen.getByText(/Básico/)).toBeInTheDocument()
  })

  // ── 3. CUOTA input renders ────────────────────────────────────────────────
  it('renders CUOTA input with value', () => {
    render(<PlanPagoCard formData={formData} onChange={mockOnChange} />)
    expect(screen.getByDisplayValue('$ 12.000')).toBeInTheDocument()
  })

  // ── 4. FECHA DE COBRO input renders ──────────────────────────────────────
  it('renders FECHA DE COBRO input', () => {
    render(<PlanPagoCard formData={formData} onChange={mockOnChange} />)
    expect(screen.getByDisplayValue('01/06')).toBeInTheDocument()
  })

  // ── 5. onChange called for cuota field ────────────────────────────────────
  it('calls onChange when cuota changes', () => {
    render(<PlanPagoCard formData={formData} onChange={mockOnChange} />)
    const input = screen.getByDisplayValue('$ 12.000')
    fireEvent.change(input, { target: { value: '$ 9.000' } })
    expect(mockOnChange).toHaveBeenCalledWith('cuota', '$ 9.000')
  })

  // ── 6. RENOVACIÓN select renders ──────────────────────────────────────────
  it('renders RENOVACIÓN select with Automática and Manual options', () => {
    render(<PlanPagoCard formData={formData} onChange={mockOnChange} />)
    expect(screen.getByText('Automática mensual')).toBeInTheDocument()
    expect(screen.getByText('Manual')).toBeInTheDocument()
  })
})
