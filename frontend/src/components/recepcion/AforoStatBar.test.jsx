/**
 * Tests for AforoStatBar.
 * Coverage uplift: 0% → ~100%.
 * Mocked: Card (ui).
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AforoStatBar from './AforoStatBar'

vi.mock('../ui/Card', () => ({
  default: ({ children }) => <div data-testid="card">{children}</div>,
}))

describe('AforoStatBar', () => {
  const defaultProps = {
    promedioHoy: 42,
    picoMaximo: 75,
    picoHora: '19:00',
    ingresoUltimaHora: 8,
    egresoUltimaHora: 3,
  }

  it('renders promedioHoy value', () => {
    render(<AforoStatBar {...defaultProps} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders picoMaximo value', () => {
    render(<AforoStatBar {...defaultProps} />)
    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('renders picoHora time', () => {
    render(<AforoStatBar {...defaultProps} />)
    expect(screen.getByText(/a las 19:00/i)).toBeInTheDocument()
  })

  it('renders ingresoUltimaHora with + prefix', () => {
    render(<AforoStatBar {...defaultProps} />)
    expect(screen.getByText('+8')).toBeInTheDocument()
  })

  it('renders egresoUltimaHora with - prefix', () => {
    render(<AforoStatBar {...defaultProps} />)
    expect(screen.getByText('-3')).toBeInTheDocument()
  })

  it('renders 4 Card components', () => {
    render(<AforoStatBar {...defaultProps} />)
    expect(screen.getAllByTestId('card')).toHaveLength(4)
  })
})
