/**
 * Tests for QRDisplay.
 * Coverage uplift: 0% → ~80%.
 * Mocked: Button, QRCode.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import QRDisplay from './QRDisplay'

vi.mock('../ui/Button', () => ({
  default: ({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}))

vi.mock('./QRCode', () => ({
  default: ({ value }) => <div data-testid="qr-code" data-value={value}>QRCode</div>,
}))

describe('QRDisplay', () => {
  const defaultProps = {
    qrToken: 'tok-abc-123',
    timeLeft: 25,
    maxTime: 30,
    isRefreshing: false,
    isExpired: false,
    onRefresh: vi.fn(),
    onOpenFullscreen: vi.fn(),
  }

  it('renders QRCode component', () => {
    render(<QRDisplay {...defaultProps} />)
    expect(screen.getByTestId('qr-code')).toBeInTheDocument()
  })

  it('renders time left countdown', () => {
    render(<QRDisplay {...defaultProps} timeLeft={18} />)
    expect(screen.getByText('18')).toBeInTheDocument()
  })

  it('renders "Token dinámico seguro" label', () => {
    render(<QRDisplay {...defaultProps} />)
    expect(screen.getByText('Token dinámico seguro')).toBeInTheDocument()
  })

  it('renders "Ver QR en pantalla completa" button', () => {
    render(<QRDisplay {...defaultProps} />)
    expect(screen.getByText('Ver QR en pantalla completa')).toBeInTheDocument()
  })

  it('calls onOpenFullscreen when fullscreen button is clicked', () => {
    const onOpenFullscreen = vi.fn()
    render(<QRDisplay {...defaultProps} onOpenFullscreen={onOpenFullscreen} />)
    fireEvent.click(screen.getByText('Ver QR en pantalla completa'))
    expect(onOpenFullscreen).toHaveBeenCalled()
  })

  it('calls onRefresh when refresh button is clicked', () => {
    const onRefresh = vi.fn()
    render(<QRDisplay {...defaultProps} onRefresh={onRefresh} />)
    // The refresh button contains a svg, click the first button that isn't "fullscreen"
    const buttons = screen.getAllByRole('button')
    // First button is refresh (has disabled prop based on isRefreshing)
    fireEvent.click(buttons[0])
    expect(onRefresh).toHaveBeenCalled()
  })

  it('shows "Acceso Bloqueado" overlay when isExpired is true', () => {
    render(<QRDisplay {...defaultProps} isExpired={true} />)
    expect(screen.getByText('Acceso Bloqueado')).toBeInTheDocument()
  })

  it('does not show "Acceso Bloqueado" when not expired', () => {
    render(<QRDisplay {...defaultProps} isExpired={false} />)
    expect(screen.queryByText('Acceso Bloqueado')).not.toBeInTheDocument()
  })
})
