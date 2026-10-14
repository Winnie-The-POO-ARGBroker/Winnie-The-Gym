/**
 * Tests obligatorios PR6 (contrato #16):
 *   EstadoBanner > renders when user.estado is suspendido
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EstadoBanner from '../EstadoBanner'

describe('EstadoBanner', () => {
  // ── Contract test #16 ─────────────────────────────────────────────────────
  it('renders when user.estado is suspendido', () => {
    render(<EstadoBanner estado="suspendido" />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Tu cuenta está suspendida/i)).toBeInTheDocument()
  })

  it('renders when user.estado is baja', () => {
    render(<EstadoBanner estado="baja" />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Tu cuenta está dada de baja/i)).toBeInTheDocument()
  })

  it('renders nothing when estado is activo', () => {
    const { container } = render(<EstadoBanner estado="activo" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when estado is undefined', () => {
    const { container } = render(<EstadoBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for an unknown estado', () => {
    const { container } = render(<EstadoBanner estado="desconocido" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders motivo when provided for suspendido', () => {
    render(<EstadoBanner estado="suspendido" motivo="Falta de pago" />)

    expect(screen.getByText(/Falta de pago/i)).toBeInTheDocument()
  })

  it('does not render motivo when not provided', () => {
    render(<EstadoBanner estado="suspendido" />)

    expect(screen.queryByText(/Motivo:/i)).not.toBeInTheDocument()
  })

  it('has data-testid for integration tests', () => {
    render(<EstadoBanner estado="suspendido" />)

    expect(screen.getByTestId('estado-banner')).toBeInTheDocument()
  })
})
