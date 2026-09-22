/**
 * Tests for MemberCardHeader.
 * Coverage uplift: 0% → ~100%.
 * Mocked: Badge.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MemberCardHeader from './MemberCardHeader'

vi.mock('../ui/Badge', () => ({
  default: ({ children, variant }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}))

describe('MemberCardHeader', () => {
  const defaultProps = {
    nombre: 'Juan',
    apellido: 'Pérez',
    dni: '12345678',
    numeroSocio: 'S-0042',
    isExpired: false,
  }

  it('renders member full name', () => {
    render(<MemberCardHeader {...defaultProps} />)
    expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument()
  })

  it('renders DNI', () => {
    render(<MemberCardHeader {...defaultProps} />)
    expect(screen.getByText(/DNI 12345678/)).toBeInTheDocument()
  })

  it('renders socio number', () => {
    render(<MemberCardHeader {...defaultProps} />)
    expect(screen.getByText('S-0042')).toBeInTheDocument()
  })

  it('shows "Activa" badge when not expired', () => {
    render(<MemberCardHeader {...defaultProps} isExpired={false} />)
    const badge = screen.getByTestId('badge')
    expect(badge).toHaveTextContent('Activa')
    expect(badge).toHaveAttribute('data-variant', 'live')
  })

  it('shows "Vencida" badge when isExpired is true', () => {
    render(<MemberCardHeader {...defaultProps} isExpired={true} />)
    const badge = screen.getByTestId('badge')
    expect(badge).toHaveTextContent('Vencida')
    expect(badge).toHaveAttribute('data-variant', 'danger')
  })
})
