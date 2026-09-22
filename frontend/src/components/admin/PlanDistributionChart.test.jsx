/**
 * Tests for PlanDistributionChart.
 * Coverage uplift: 0% → ~80%.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlanDistributionChart from './PlanDistributionChart'

const PLANES = [
  { id: 1, nombre: 'Básico', socios_activos: 30, porcentaje: null },
  { id: 2, nombre: 'Premium', socios_activos: 50, porcentaje: null },
  { id: 3, nombre: 'Gold', socios_activos: 20, porcentaje: null },
]

describe('PlanDistributionChart', () => {
  it('renders "Distribución de socios por plan" heading', () => {
    render(<PlanDistributionChart planes={PLANES} />)
    expect(screen.getByText('Distribución de socios por plan')).toBeInTheDocument()
  })

  it('renders total socios count', () => {
    render(<PlanDistributionChart planes={PLANES} />)
    // Total is 30+50+20 = 100
    expect(screen.getByText(/100 socios/)).toBeInTheDocument()
  })

  it('renders plan names in legend', () => {
    render(<PlanDistributionChart planes={PLANES} />)
    // Plan names appear in the legend (queryAllByText because they appear in bar and legend)
    expect(screen.getAllByText('Básico').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Premium').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Gold').length).toBeGreaterThan(0)
  })

  it('renders with empty planes array without crashing', () => {
    expect(() => render(<PlanDistributionChart planes={[]} />)).not.toThrow()
    expect(screen.getByText('0 socios')).toBeInTheDocument()
  })

  it('calculates percentage from socios_activos when porcentaje is null', () => {
    render(<PlanDistributionChart planes={PLANES} />)
    // Premium is 50/100 = 50%; appears in bar segment and legend (multiple elements)
    expect(screen.getAllByText(/50%/).length).toBeGreaterThan(0)
  })

  it('renders zero-activos plan without crashing', () => {
    const planes = [{ id: 1, nombre: 'Básico', socios_activos: 0, porcentaje: 0 }]
    expect(() => render(<PlanDistributionChart planes={planes} />)).not.toThrow()
  })
})
