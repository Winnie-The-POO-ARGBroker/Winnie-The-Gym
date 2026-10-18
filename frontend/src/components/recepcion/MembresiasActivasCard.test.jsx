import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MembresiasActivasCard from './MembresiasActivasCard'

describe('MembresiasActivasCard', () => {
  it('shows new customers and renewals as separate figures', () => {
    render(<MembresiasActivasCard activas="55" porVencer={4} nuevasMes={7} renovacionesMes={12} />)

    expect(screen.getByText(/^nuevas\/mes$/i)).toBeInTheDocument()
    expect(screen.getByText('+7')).toBeInTheDocument()
    expect(screen.getByText(/^renovaciones\/mes$/i)).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('defaults renovaciones to 0 when the backend does not send it', () => {
    render(<MembresiasActivasCard activas="1" porVencer={0} nuevasMes={0} />)

    expect(screen.getByText(/^renovaciones\/mes$/i).nextElementSibling).toHaveTextContent('0')
  })
})
