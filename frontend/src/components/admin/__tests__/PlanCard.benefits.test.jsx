import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import PlanCard from '../PlanCard'

const basePlan = { id: 7, nombre: 'Plan Test 2', subtitulo: 'Plan test 2', precio: 2, socios_activos: 0 }

describe('PlanCard > benefits', () => {
  it('does not render a benefit that has no text (it showed as an empty ✗ circle)', () => {
    const plan = {
      ...basePlan,
      beneficios: [
        { texto: '', incluido: false },
        { texto: '   ', incluido: false },
        { texto: 'Acceso a todas las clases', incluido: true },
      ],
    }

    render(<PlanCard plan={plan} onEdit={() => {}} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Acceso a todas las clases')).toBeInTheDocument()
  })

  it('shows a message instead of an empty block when the plan has no benefits', () => {
    render(<PlanCard plan={{ ...basePlan, beneficios: [] }} onEdit={() => {}} />)

    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.getByText(/sin beneficios/i)).toBeInTheDocument()
  })

  it('still shows excluded benefits that do have text', () => {
    const plan = { ...basePlan, beneficios: [{ texto: 'Clases de yoga', incluido: false }] }

    render(<PlanCard plan={plan} onEdit={() => {}} />)

    expect(screen.getByText('Clases de yoga')).toBeInTheDocument()
  })
})
