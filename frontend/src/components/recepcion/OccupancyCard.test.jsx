/**
 * Tests for OccupancyCard.
 * Coverage uplift: 0% → ~100%.
 * Mocked: Card.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import OccupancyCard from './OccupancyCard'

vi.mock('../ui/Card', () => ({
  default: ({ children }) => <div data-testid="card">{children}</div>,
}))

describe('OccupancyCard', () => {
  it('renders aforo and maxAforo', () => {
    render(<OccupancyCard aforo={25} maxAforo={50} />)
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('/ 50')).toBeInTheDocument()
  })

  it('renders percentage of capacity', () => {
    render(<OccupancyCard aforo={25} maxAforo={50} />)
    expect(screen.getByText('50.0% de capacidad')).toBeInTheDocument()
  })

  it('renders "Ocupación Actual" label', () => {
    render(<OccupancyCard aforo={10} maxAforo={100} />)
    expect(screen.getByText('Ocupación Actual')).toBeInTheDocument()
  })

  it('shows high capacity indicator when aforo > 85%', () => {
    render(<OccupancyCard aforo={90} maxAforo={100} />)
    // The number should use text-primary class when > 85%
    const num = screen.getByText('90')
    expect(num.className).toContain('text-primary')
  })

  it('shows normal capacity color when aforo <= 85%', () => {
    render(<OccupancyCard aforo={50} maxAforo={100} />)
    const num = screen.getByText('50')
    expect(num.className).toContain('text-text-primary')
  })
})
