/**
 * Tests for MemberPlanDetails.
 * Coverage uplift: 0% → ~100%.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MemberPlanDetails from './MemberPlanDetails'

describe('MemberPlanDetails', () => {
  it('returns null when membresia is falsy', () => {
    const { container } = render(<MemberPlanDetails membresia={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders planNombre from membresia', () => {
    render(<MemberPlanDetails membresia={{ planNombre: 'Premium', fechaVencimiento: '2026-12-31' }} />)
    expect(screen.getByText('Premium')).toBeInTheDocument()
  })

  it('renders fechaVencimiento from membresia', () => {
    render(<MemberPlanDetails membresia={{ planNombre: 'Básico', fechaVencimiento: '2026-06-30' }} />)
    expect(screen.getByText('2026-06-30')).toBeInTheDocument()
  })

  it('renders "Plan" and "Vencimiento" labels', () => {
    render(<MemberPlanDetails membresia={{ planNombre: 'Gold', fechaVencimiento: '2027-01-01' }} />)
    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(screen.getByText('Vencimiento')).toBeInTheDocument()
  })
})
