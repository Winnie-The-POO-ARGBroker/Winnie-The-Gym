import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import EmptyState from '../EmptyState'

describe('EmptyState component', () => {
  it('renders default title when no props are provided', () => {
    render(<EmptyState />)
    expect(screen.getByText('No hay datos disponibles')).toBeInTheDocument()
  })

  it('renders custom title and message', () => {
    render(
      <EmptyState 
        title="Sin clases" 
        message="No se encontraron clases para este día." 
      />
    )
    
    expect(screen.getByText('Sin clases')).toBeInTheDocument()
    expect(screen.getByText('No se encontraron clases para este día.')).toBeInTheDocument()
  })
})
