import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import PagoResultadoBanner from '../PagoResultadoBanner'

/**
 * Tests para PagoResultadoBanner — state machine chiquita con 3 estados
 * (success, failure, pending), dismiss manual y auto-hide a los 6 segundos.
 */

describe('PagoResultadoBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renderiza el banner de pago aprobado', () => {
    render(<PagoResultadoBanner estado="success" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/pago aprobado/i)).toBeInTheDocument()
  })

  it('renderiza el banner de pago rechazado', () => {
    render(<PagoResultadoBanner estado="failure" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/pago rechazado/i)).toBeInTheDocument()
  })

  it('renderiza el banner de pago en proceso', () => {
    render(<PagoResultadoBanner estado="pending" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/pago en proceso/i)).toBeInTheDocument()
  })

  it('no renderiza nada para un estado desconocido', () => {
    const { container } = render(<PagoResultadoBanner estado="desconocido" />)
    expect(container.firstChild).toBeNull()
  })

  it('se oculta al hacer click en el botón de cerrar', () => {
    render(<PagoResultadoBanner estado="success" />)
    const closeButton = screen.getByRole('button', { name: /cerrar notificación/i })
    fireEvent.click(closeButton)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('se auto-oculta después de 6 segundos', () => {
    render(<PagoResultadoBanner estado="success" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(6000)
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('sigue visible antes de los 6 segundos', () => {
    render(<PagoResultadoBanner estado="success" />)

    act(() => {
      vi.advanceTimersByTime(5999)
    })

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
