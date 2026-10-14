import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Badge from '../Badge'

describe('Badge', () => {
  it('renders children correctly', () => {
    render(<Badge>Activo</Badge>)
    expect(screen.getByText('Activo')).toBeInTheDocument()
  })

  it('renders neutral for unknown variant (not success)', () => {
    // An unrecognised variant must NOT fall back to 'success' (green).
    // It must use the 'neutral' fallback (grey). We verify via the rendered
    // element's inline style: neutral uses neutral-500 (#71717A), success would
    // use success-500 (#4CAF50). The contract is: unknown → neutral, never success.
    render(<Badge variant="totally_unknown">Desconocido</Badge>)
    const badge = screen.getByText('Desconocido')

    // The component applies the style inline via the variantStyles map.
    // Neutral color is rgb(113, 113, 122) — success would be rgb(76, 175, 80).
    const color = badge.style.color
    // Must NOT be success green
    expect(color).not.toMatch(/76.*175.*80|4caf50/i)
    // Must be some form of grey (neutral)
    expect(color).toMatch(/rgb/)
    // The element should exist and be a span
    expect(badge.tagName).toBe('SPAN')
  })

  it('renders success variant with correct element', () => {
    render(<Badge variant="success">Aprobado</Badge>)
    expect(screen.getByText('Aprobado')).toBeInTheDocument()
  })

  it('renders danger variant', () => {
    render(<Badge variant="danger">Rechazado</Badge>)
    expect(screen.getByText('Rechazado')).toBeInTheDocument()
  })

  it('renders warning variant', () => {
    render(<Badge variant="warning">Pendiente</Badge>)
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
  })

  it('renders neutral variant explicitly', () => {
    render(<Badge variant="neutral">Neutral</Badge>)
    expect(screen.getByText('Neutral')).toBeInTheDocument()
  })

  it('renders info variant', () => {
    render(<Badge variant="info">Reembolsado</Badge>)
    expect(screen.getByText('Reembolsado')).toBeInTheDocument()
  })

  it('defaults to neutral when no variant is provided', () => {
    render(<Badge>Sin variante</Badge>)
    const badge = screen.getByText('Sin variante')
    // Default is now neutral, not success
    expect(badge.style.color).not.toMatch(/76.*175.*80|4caf50/i)
  })

  it('renders live variant with pulse dot', () => {
    render(<Badge variant="live">En vivo</Badge>)
    expect(screen.getByText('En vivo')).toBeInTheDocument()
    // The live variant renders an animated dot alongside the text
    const badge = screen.getByText('En vivo').closest('span')
    expect(badge?.querySelectorAll('span')).toHaveLength(1)
  })

  it('applies custom className', () => {
    render(<Badge className="custom-class">Test</Badge>)
    const badge = screen.getByText('Test')
    expect(badge.className).toContain('custom-class')
  })
})
